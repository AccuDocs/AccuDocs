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

  public async initializeClientWorkspace(organizationId: string, clientId: string, clientCode: string, transaction?: any): Promise<void> {
    try {
      // Create High-Level Folders
      const systemFolders = ['Invoices', 'Tax Returns', 'Financial Statements', 'Uploads'];
      
      // Root Folder
      const rootFolderResult = Folder.create({
        organizationId,
        clientId,
        name: `${clientCode} Workspace`,
        path: `/${clientCode}`,
        isSystem: true
      }, uuidv4());

      if (rootFolderResult.isFailure) throw new Error(rootFolderResult.getError() as string);
      const rootFolder = rootFolderResult.getValue();
      await this.folderRepository.save(rootFolder, { transaction });

      // Sub Folders
      for (const name of systemFolders) {
        const subFolderResult = Folder.create({
          organizationId,
          clientId,
          parentId: rootFolder.id,
          name,
          path: `/${clientCode}/${name}`,
          isSystem: true
        }, uuidv4());

        if (subFolderResult.isFailure) throw new Error(subFolderResult.getError() as string);
        await this.folderRepository.save(subFolderResult.getValue(), { transaction });
      }

      logger.info(`Workspace initialized for client ${clientCode}`);
    } catch (error: any) {
      logger.error(`Failed to initialize workspace for client ${clientCode}: ${error.message}`);
      throw error;
    }
  }
}
