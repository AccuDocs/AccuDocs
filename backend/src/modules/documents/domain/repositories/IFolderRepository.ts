import { Folder } from "../entities/Folder";

export interface IFolderRepository {
  save(folder: Folder, options?: any): Promise<Folder>;
  findById(id: string, organizationId: string): Promise<Folder | null>;
  findByClientId(clientId: string, organizationId: string): Promise<Folder[]>;
  findByOrganizationId(organizationId: string): Promise<Folder[]>;
  findByParentId(parentId: string, organizationId: string): Promise<Folder[]>;
  delete(id: string, organizationId: string, options?: any): Promise<void>;
}
