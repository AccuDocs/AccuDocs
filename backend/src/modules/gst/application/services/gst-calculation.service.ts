import { injectable, inject } from 'tsyringe';
import { ClientSale } from '../../../../models/client-sale.model';
import { ClientPurchase } from '../../../../models/client-purchase.model';
import { GstReturn } from '../../../../models/gst-return.model';
import { Client } from '../../../../models/client.model';
import { Op } from 'sequelize';
import { DocumentService } from '../../../documents/application/services/DocumentService';
import { IFolderRepository } from '../../../documents/domain/repositories/IFolderRepository';

@injectable()
export class GstCalculationService {
  constructor(
    @inject('IFolderRepository') private folderRepository: IFolderRepository,
    @inject(DocumentService) private documentService: DocumentService
  ) {}

  /**
   * Constructs the full workspace path for a GST return and saves the JSON data as a document.
   */
  async saveReturnToWorkspace(gstReturnId: string, organizationId: string): Promise<any> {
    const gstReturn = await GstReturn.findByPk(gstReturnId);
    if (!gstReturn) throw new Error('GST Return not found');

    const client = await Client.findByPk(gstReturn.clientId);
    if (!client) throw new Error('Client not found');

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[gstReturn.periodMonth];
    
    // Find Root Folder: Use the relationship (parentId is null for the client)
    let currentFolder = await this.folderRepository.findRootByClient(gstReturn.clientId, organizationId);
    
    if (!currentFolder) {
      console.warn(`[GST-WS] Root folder NOT FOUND for client ${gstReturn.clientId}`);
      return null;
    }

    console.log(`[GST-WS] Found root folder: "${currentFolder.name}" (ID: ${currentFolder.id})`);

    // Path steps to traverse
    const fyString = `FY ${gstReturn.financialYear}`;
    const monthYear = `${monthName} ${gstReturn.periodYear}`;
    const pathSteps = ['2. GST Returns', fyString, monthYear, gstReturn.returnType];

    console.log(`[GST-WS] Traversing folders for client ${client.code}: ${pathSteps.join(' > ')}`);

    for (const step of pathSteps) {
      // Robust search: find by name AND parent AND organization AND clientId (if possible)
      // Actually, my repository findByNameAndParent uses parentId which is enough
      const nextFolder = await this.folderRepository.findByNameAndParent(step, currentFolder.id, organizationId);
      if (!nextFolder) {
        console.warn(`[GST-WS] FAILED: Could not find step "${step}" under "${currentFolder.name}"`);
        return null;
      }
      currentFolder = nextFolder;
    }

    console.log(`[GST-WS] TARGET VERIFIED: ${currentFolder.name} (ID: ${currentFolder.id})`);

    const jsonContent = JSON.stringify(gstReturn.jsonData, null, 2);
    // Cleaner naming: GSTR-1_April_2026.json
    const fileName = `${gstReturn.returnType}_${monthName}_${gstReturn.periodYear}.json`;
    
    const file = {
      originalname: fileName,
      buffer: Buffer.from(jsonContent),
      mimetype: 'application/json',
      size: jsonContent.length
    };

    return await this.documentService.uploadDocument(
      organizationId,
      'SYSTEM', // Uploader ID
      currentFolder.id,
      file
    );
  }
  /**
   * Generates or fetches GSTR-1 Draft data for a client.
   */
  async generateGstr1(clientId: string, organizationId: string, month: number, financialYear: string): Promise<any> {
    const sales = await ClientSale.findAll({
      where: {
        clientId,
        organizationId,
        month,
        financialYear,
        status: { [Op.ne]: 'cancelled' },
      },
    });

    const b2bMap = new Map<string, any>();

    sales.forEach((sale: any) => {
      if (sale.invoiceType === 'B2B' && sale.gstin) {
        const ctin = sale.gstin;
        if (!b2bMap.has(ctin)) {
          b2bMap.set(ctin, { ctin, inv: [] });
        }

        const b2bEntry = b2bMap.get(ctin);
        b2bEntry.inv.push({
          inum: sale.invoiceNo,
          idt: new Date(sale.invoiceDate).toLocaleDateString('en-GB').replace(/\//g, '-'), // DD-MM-YYYY
          val: Number(sale.totalAmount),
          pos: sale.placeOfSupply || '',
          itms: [
            {
              // Basic simplified structure for line items
              txval: Number(sale.baseAmount),
              rt: Number(sale.gstRate),
              iamt: Number(sale.igstAmount),
              camt: Number(sale.cgstAmount),
              samt: Number(sale.sgstAmount),
              csamt: Number(sale.cessAmount),
            },
          ],
        });
      }
    });

    const b2bArray = Array.from(b2bMap.values());

    const periodYearStr = financialYear.substring(0, 4); 
    const fpStr = `${month.toString().padStart(2, '0')}${periodYearStr}`; // e.g. 032025

    const payload = {
      b2b: b2bArray,
      fp: fpStr,
    };

    return payload;
  }

  /**
   * Generates or fetches GSTR-3B Draft data for a client.
   */
  async generateGstr3b(clientId: string, organizationId: string, month: number, financialYear: string): Promise<any> {
    const sales = await ClientSale.findAll({
      where: {
        clientId,
        organizationId,
        month,
        financialYear,
        status: { [Op.ne]: 'cancelled' },
      },
    });

    const purchases = await ClientPurchase.findAll({
      where: {
        clientId,
        organizationId,
        month,
        financialYear,
        itcEligible: true,
        status: { [Op.ne]: 'cancelled' },
      },
    });

    let totalOutputBase = 0;
    let totalOutputIamt = 0;
    let totalOutputCamt = 0;
    let totalOutputSamt = 0;

    sales.forEach((sale: any) => {
      totalOutputBase += Number(sale.baseAmount || 0);
      totalOutputIamt += Number(sale.igstAmount || 0);
      totalOutputCamt += Number(sale.cgstAmount || 0);
      totalOutputSamt += Number(sale.sgstAmount || 0);
    });

    let totalItcIamt = 0;
    let totalItcCamt = 0;
    let totalItcSamt = 0;

    purchases.forEach((pur: any) => {
      totalItcIamt += Number(pur.igstAmount || 0);
      totalItcCamt += Number(pur.cgstAmount || 0);
      totalItcSamt += Number(pur.sgstAmount || 0);
    });

    const periodYearStr = financialYear.substring(0, 4);
    const fpStr = `${month.toString().padStart(2, '0')}${periodYearStr}`;

    const payload = {
      fp: fpStr,
      sup_details: {
        osup_det: {
          txval: totalOutputBase,
          iamt: totalOutputIamt,
          camt: totalOutputCamt,
          samt: totalOutputSamt,
        },
      },
      itc_elg: {
        itc_avl: [
          {
            ty: 'All other ITC',
            iamt: totalItcIamt,
            camt: totalItcCamt,
            samt: totalItcSamt,
          },
        ],
      },
    };

    return payload;
  }

  /**
   * Calculate a specific return (GSTR-1 or GSTR-3B) and create a draft return in DB or update it if it exists.
   */
  async upsertDraftReturn(
    clientId: string,
    organizationId: string,
    returnType: string,
    periodMonth: number,
    periodYear: number,
    financialYear: string
  ): Promise<GstReturn> {
    let jsonData = {};

    if (returnType === 'GSTR-1') {
      jsonData = await this.generateGstr1(clientId, organizationId, periodMonth, financialYear);
    } else if (returnType === 'GSTR-3B') {
      jsonData = await this.generateGstr3b(clientId, organizationId, periodMonth, financialYear);
    }

    let gstReturn = await GstReturn.findOne({
      where: {
        clientId,
        organizationId,
        returnType,
        periodMonth,
        periodYear,
        financialYear,
      },
    });

    if (gstReturn) {
      if (gstReturn.status === 'filed') {
        throw new Error('Return is already filed. Cannot update draft.');
      }
      gstReturn.jsonData = jsonData;
      await gstReturn.save();
    } else {
      gstReturn = await GstReturn.create({
        clientId,
        organizationId,
        returnType,
        periodMonth,
        periodYear,
        financialYear,
        status: 'draft',
        jsonData,
      } as any); // Type cast due to sequelize init limits in this snippet
    }

    return gstReturn;
  }
}
