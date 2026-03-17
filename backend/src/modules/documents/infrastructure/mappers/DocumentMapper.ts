import { Document } from "../../domain/entities/Document";
import { Document as DocumentModel } from "../../../../models";

export class DocumentMapper {
  public static toDomain(raw: any): Document {
    const props = {
      organizationId: raw.organizationId,
      clientId: raw.clientId,
      folderId: raw.folderId,
      title: raw.title,
      fileName: raw.fileName,
      fileSize: typeof raw.sizeBytes === 'string' ? parseInt(raw.sizeBytes, 10) : raw.sizeBytes,
      mimeType: raw.mimeType,
      s3Key: raw.s3Key,
      version: raw.version,
      metadata: raw.metadata,
      tags: raw.tags || [],
      isVerified: raw.isVerified,
      uploadedBy: raw.uploadedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    };
    return Document.create(props, raw.id).getValue();
  }

  public static toPersistence(document: Document): any {
    return {
      id: document.id,
      organizationId: document.organizationId,
      clientId: document.clientId,
      folderId: document.folderId,
      title: document.title,
      fileName: document.fileName,
      sizeBytes: document.fileSize,
      mimeType: document.mimeType,
      s3Key: document.s3Key,
      version: document.version,
      metadata: document.metadata,
      tags: document.tags,
      isVerified: document.isVerified,
      uploadedBy: document.uploadedBy
    };
  }
}
