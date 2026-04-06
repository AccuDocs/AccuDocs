import { injectable, inject } from "tsyringe";
import { IFolderRepository } from "../../domain/repositories/IFolderRepository";
import { Folder } from "../../domain/entities/Folder";
import { logger } from "../../../../utils/logger";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class FolderInitializerService {
  constructor(
    @inject("IFolderRepository") private folderRepository: IFolderRepository
  ) {}

  private getFiscalYearData() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    let startYear = currentYear;
    if (currentMonth < 3) {
      startYear = currentYear - 1;
    }
    
    const endYear = startYear + 1;
    const fyString = `FY ${startYear}-${endYear.toString().slice(-2)}`;
    
    const months = [
      `April ${startYear}`, `May ${startYear}`, `June ${startYear}`, `July ${startYear}`, 
      `August ${startYear}`, `September ${startYear}`, `October ${startYear}`, `November ${startYear}`, 
      `December ${startYear}`, `January ${endYear}`, `February ${endYear}`, `March ${endYear}`
    ];

    return { fyString, startYear, endYear, months };
  }

  private getPastFiscalYears(count: number) {
    const { startYear } = this.getFiscalYearData();
    const years: string[] = [];
    for (let i = 0; i < count; i++) {
        const s = startYear - i;
        const e = s + 1;
        years.push(`FY ${s}-${e.toString().slice(-2)}`);
    }
    return years.reverse();
  }

  public async initializeClientWorkspace(organizationId: string, clientId: string, clientCode: string, transaction?: any): Promise<void> {
    try {
      const { fyString, months } = this.getFiscalYearData();
      const recentThreeFYs = this.getPastFiscalYears(3);
      const recentTwoFYs = this.getPastFiscalYears(2);

      const rootFolderName = `${clientCode} Workspace`;
      const rootFolderSlug = `${clientCode.toLowerCase()}-workspace`;
      
      const rootFolderResult = Folder.create({
        organizationId,
        clientId,
        name: rootFolderName,
        slug: rootFolderSlug,
        path: `/${clientCode}`,
        isSystem: true
      }, uuidv4());

      if (rootFolderResult.isFailure) throw new Error(rootFolderResult.getError() as string);
      const rootFolder = rootFolderResult.getValue();

      const structure = [
        { name: '1. KYC & Registration' },
        { 
          name: '2. GST Returns', 
          children: [
            { 
              name: fyString, 
              children: months.map(m => ({ name: m })) 
            }
          ] 
        },
        { 
          name: '3. Bank Statements', 
          children: [
            { 
              name: fyString, 
              children: months.map(m => ({ name: m })) 
            }
          ] 
        },
        { 
          name: '4. Payroll & Salary', 
          children: [
            { 
              name: fyString, 
              children: months.map(m => ({ name: m })) 
            }
          ] 
        },
        { 
          name: '5. TDS / TCS', 
          children: [
            { 
              name: fyString, 
              children: [
                { name: 'Q1 (Apr–Jun)' },
                { name: 'Q2 (Jul–Sep)' },
                { name: 'Q3 (Oct–Dec)' },
                { name: 'Q4 (Jan–Mar)' }
              ] 
            }
          ] 
        },
        { 
          name: '6. Income Tax (ITR)', 
          children: recentThreeFYs.map(fy => ({ name: fy }))
        },
        { 
          name: '7. Financial Statements', 
          children: recentThreeFYs.map(fy => ({ name: fy }))
        },
        { 
          name: '8. Audit', 
          children: recentTwoFYs.map(fy => ({ name: fy }))
        },
        { 
          name: '9. ROC / Company Compliance', 
          children: recentTwoFYs.map(fy => ({ name: fy }))
        },
        { name: '10. Agreements & Contracts' },
        { name: '11. Correspondence' },
        { name: '12. Miscellaneous' }
      ];

      const allFolders: Folder[] = [rootFolder];
      this.collectFolders(organizationId, clientId, clientCode, rootFolder.id, `/${clientCode}`, structure, allFolders);

      await this.folderRepository.bulkSave(allFolders, { transaction });

      logger.info(`Workspace optimized initialization for ${clientCode} (${allFolders.length} folders created in 1 batch)`);
    } catch (error: any) {
      logger.error(`Failed to initialize workspace for client ${clientCode}: ${error.message}`);
      throw error;
    }
  }

  private collectFolders(
    organizationId: string, 
    clientId: string, 
    clientCode: string, 
    parentId: string, 
    basePath: string, 
    children: any[], 
    collector: Folder[]
  ): void {
    for (const spec of children) {
      const slugSuffix = spec.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const folderResult = Folder.create({
        organizationId,
        clientId,
        parentId,
        name: spec.name,
        slug: `${clientCode.toLowerCase()}-${slugSuffix}`,
        path: `${basePath}/${spec.name}`,
        isSystem: true
      }, uuidv4());

      if (folderResult.isFailure) throw new Error(folderResult.getError() as string);
      const folder = folderResult.getValue();
      collector.push(folder);

      if (spec.children && spec.children.length > 0) {
        this.collectFolders(organizationId, clientId, clientCode, folder.id, `${basePath}/${spec.name}`, spec.children, collector);
      }
    }
  }
}
