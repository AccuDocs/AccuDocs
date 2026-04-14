import { injectable, inject } from 'tsyringe';
import { ClientSale } from '../../../../models/client-sale.model';
import { ClientPurchase } from '../../../../models/client-purchase.model';
import { GstReturn } from '../../../../models/gst-return.model';
import { Client } from '../../../../models/client.model';
import { Op } from 'sequelize';
import { DocumentService } from '../../../documents/application/services/DocumentService';
import { IFolderRepository } from '../../../documents/domain/repositories/IFolderRepository';
import { generateGSTR1, generateGSTR3B } from '../../../../utils/gstGenerator';

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
      const nextFolder = await this.folderRepository.findByNameAndParent(step, currentFolder.id, organizationId);
      if (!nextFolder) {
        console.warn(`[GST-WS] FAILED: Could not find step "${step}" under "${currentFolder.name}"`);
        return null;
      }
      currentFolder = nextFolder;
    }

    console.log(`[GST-WS] TARGET VERIFIED: ${currentFolder.name} (ID: ${currentFolder.id})`);

    const jsonContent = JSON.stringify(gstReturn.jsonData, null, 2);
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
   * Generates production-ready GSTR-1 data for a client.
   */
  async generateGstr1(clientId: string, organizationId: string, month: number, financialYear: string): Promise<any> {
    const client = await Client.findByPk(clientId);
    if (!client) throw new Error('Client not found');

    const sales = await ClientSale.findAll({
      where: {
        clientId,
        organizationId,
        month,
        financialYear,
        status: { [Op.ne]: 'cancelled' },
      },
    });

    const periodYearStr = financialYear.substring(0, 4); 
    const fpStr = `${month.toString().padStart(2, '0')}${periodYearStr}`;

    console.log(`[DIAGNOSTIC] Client: ${client.gstin}, FP: ${fpStr}, Sales Found: ${sales.length}`);
    if (sales.length > 0) {
      console.log("[DIAGNOSTIC] Sample Sales Data (First 3):");
      console.table(sales.slice(0, 3).map(s => {
        const raw = s.toJSON();
        return {
          invoiceNo: raw.invoiceNo,
          gstin: raw.gstin,
          baseAmount: raw.baseAmount,
          base_amount: raw.base_amount,
          taxableValue: raw.taxableValue,
          taxable_value: raw.taxable_value,
          cgst: raw.cgstAmount
        };
      }));
    }

    return generateGSTR1({
      client_gstin: client.gstin || '',
      return_period: fpStr,
      invoices: sales.map(s => s.toJSON()),
      purchases: [],
      expenses: []
    });
  }

  /**
   * Generates production-ready GSTR-3B data for a client.
   */
  async generateGstr3b(clientId: string, organizationId: string, month: number, financialYear: string): Promise<any> {
    const client = await Client.findByPk(clientId);
    if (!client) throw new Error('Client not found');

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
        status: { [Op.ne]: 'cancelled' },
      },
    });

    const periodYearStr = financialYear.substring(0, 4);
    const fpStr = `${month.toString().padStart(2, '0')}${periodYearStr}`;

    console.log(`[DIAGNOSTIC] GSTR-3B for ${client.gstin}. Sales: ${sales.length}, Purchases: ${purchases.length}`);

    return generateGSTR3B({
      client_gstin: client.gstin || '',
      return_period: fpStr,
      invoices: sales.map(s => s.toJSON()),
      purchases: purchases.map(p => p.toJSON()),
      expenses: []
    });
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
      } as any);
    }

    return gstReturn;
  }
}
