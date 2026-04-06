import { Folder } from "../../domain/entities/Folder";
import { Folder as FolderModel } from "../../../../models";

export class FolderMapper {
  public static toDomain(raw: any): Folder {
    const props = {
      organizationId: raw.organizationId,
      clientId: raw.clientId,
      parentId: raw.parentFolderId,
      name: raw.name,
      slug: raw.slug,
      path: raw.path || `/${raw.slug || ''}`,
      isSystem: raw.isSystem,
      metadata: raw.metadata,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    };
    return Folder.create(props, raw.id).getValue();
  }

  public static toPersistence(folder: Folder): any {
    return {
      id: folder.id,
      organizationId: folder.organizationId,
      clientId: folder.clientId,
      parentFolderId: folder.parentId,
      name: folder.name,
      slug: folder.slug,
      path: folder.path,
      isSystem: folder.isSystem,
      metadata: folder.metadata,
      createdBy: folder.createdBy
    };
  }
}
