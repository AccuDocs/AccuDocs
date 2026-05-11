import { injectable } from "tsyringe";
import { IFolderRepository } from "../../domain/repositories/IFolderRepository";
import { Folder } from "../../domain/entities/Folder";
import { Folder as FolderModel } from "../../../../models";
import { FolderMapper } from "../mappers/FolderMapper";

@injectable()
export class SequelizeFolderRepository implements IFolderRepository {
  async save(folder: Folder, options?: any): Promise<Folder> {
    const raw = FolderMapper.toPersistence(folder);
    const exists = await FolderModel.findByPk(folder.id, { transaction: options?.transaction });
    
    if (exists) {
      await exists.update(raw, options);
    } else {
      await FolderModel.create(raw, options);
    }
    
    const saved = await FolderModel.findByPk(folder.id, { transaction: options?.transaction });
    return FolderMapper.toDomain(saved);
  }

  async findById(id: string, organizationId: string): Promise<Folder | null> {
    const folder = await FolderModel.findOne({ where: { id, organizationId } });
    if (!folder) return null;
    return FolderMapper.toDomain(folder);
  }

  async findByClientId(clientId: string, organizationId: string): Promise<Folder[]> {
    const folders = await FolderModel.findAll({
      where: { clientId, organizationId },
      order: [['created_at', 'ASC'], ['id', 'ASC']]
    });
    return folders.map(FolderMapper.toDomain);
  }

  async findByOrganizationId(organizationId: string): Promise<Folder[]> {
    const folders = await FolderModel.findAll({ where: { organizationId } });
    return folders.map(FolderMapper.toDomain);
  }

  async findByParentId(parentFolderId: string, organizationId: string): Promise<Folder[]> {
    const folders = await FolderModel.findAll({
      where: { parentFolderId, organizationId },
      order: [['created_at', 'ASC'], ['id', 'ASC']]
    });
    return folders.map(FolderMapper.toDomain);
  }

  async findByPath(path: string, organizationId: string): Promise<Folder | null> {
    const folder = await FolderModel.findOne({ where: { path, organizationId } });
    if (!folder) return null;
    return FolderMapper.toDomain(folder);
  }

  async findByNameAndParent(name: string, parentId: string | null, organizationId: string): Promise<Folder | null> {
    const folder = await FolderModel.findOne({ 
      where: { 
        name, 
        parentFolderId: parentId, 
        organizationId 
      } 
    });
    if (!folder) return null;
    return FolderMapper.toDomain(folder);
  }

  async findRootByClient(clientId: string, organizationId: string): Promise<Folder | null> {
    const folder = await FolderModel.findOne({ 
      where: { 
        clientId, 
        parentFolderId: null, 
        organizationId 
      },
      order: [['created_at', 'ASC'], ['id', 'ASC']]
    });
    if (!folder) return null;
    return FolderMapper.toDomain(folder);
  }

  async delete(id: string, organizationId: string, options?: any): Promise<void> {
    await FolderModel.destroy({ where: { id, organizationId }, transaction: options?.transaction });
  }

  async bulkSave(folders: Folder[], options?: any): Promise<void> {
    const raw = folders.map(f => FolderMapper.toPersistence(f));
    await FolderModel.bulkCreate(raw, { 
      transaction: options?.transaction,
      updateOnDuplicate: ['name', 'slug', 'path', 'parent_folder_id', 'is_system']
    });
  }
}
