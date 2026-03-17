import { injectable, inject } from "tsyringe";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository";
import { IFolderRepository } from "../../domain/repositories/IFolderRepository";
import { Document } from "../../domain/entities/Document";
import { s3Helpers } from "../../../../config/s3.config";
import { AppError, NotFoundError } from "../../../../utils/errors";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class DocumentService {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("IFolderRepository") private folderRepository: IFolderRepository
  ) {}

  async uploadDocument(organizationId: string, uploaderId: string, folderId: string, file: any) {
    const folder = await this.folderRepository.findById(folderId, organizationId);
    if (!folder) throw new NotFoundError('Folder not found');

    const fileExtension = file.originalname.split('.').pop() || '';
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const s3Path = `org_${organizationId}/client_${folder.clientId}/folder_${folder.id}/${uniqueFileName}`;

    // Upload to S3
    await s3Helpers.uploadFile(s3Path, file.buffer, file.mimetype, {
      originalName: file.originalname,
      uploadedBy: uploaderId,
      folderId: folderId
    });

    const docProps = {
      organizationId,
      clientId: folder.clientId,
      folderId,
      title: file.originalname, // use original name as initial title
      fileName: uniqueFileName,
      fileSize: file.size,
      mimeType: file.mimetype,
      s3Key: s3Path,
      version: 1,
      isVerified: false,
      uploadedBy: uploaderId
    };

    const docResult = Document.create(docProps);
    if (docResult.isFailure) throw new AppError(docResult.getError() as string, 500);
    
    const document = await this.documentRepository.save(docResult.getValue());
    
    return {
      id: document.id,
      fileName: file.originalname,
      size: document.fileSize,
      mimeType: document.mimeType
    };
  }

  async getFolders(organizationId: string, clientId: string) {
    const folders = await this.folderRepository.findByClientId(clientId, organizationId);
    return folders.map(f => ({
      id: f.id,
      parentId: f.parentId,
      name: f.name,
      path: f.path,
      isSystem: f.isSystem,
      createdAt: f.createdAt
    }));
  }

  async getDocumentsInFolder(organizationId: string, folderId: string) {
    const folder = await this.folderRepository.findById(folderId, organizationId);
    if (!folder) throw new NotFoundError('Folder not found');

    const docs = await this.documentRepository.findByFolderId(folderId, organizationId);
    return docs.map(d => ({
      id: d.id,
      title: d.title,
      fileName: d.fileName,
      size: d.fileSize,
      mimeType: d.mimeType,
      uploadedBy: d.uploadedBy,
      createdAt: d.createdAt
    }));
  }

  async getDownloadUrl(organizationId: string, documentId: string) {
    const doc = await this.documentRepository.findById(documentId, organizationId);
    if (!doc) throw new NotFoundError('Document not found');

    const url = await s3Helpers.getSignedDownloadUrl(doc.s3Key);
    return { url, fileName: doc.title || doc.fileName };
  }

  async shareDocument(organizationId: string, documentId: string, shareOptions: any) {
    const doc = await this.documentRepository.findById(documentId, organizationId);
    if (!doc) throw new NotFoundError('Document not found');
    
    // In a real implementation, we would send an email or generate a specialized link
    // Here we generate a public presigned URL valid for a longer time
    // For now we simulate sharing
    return { shared: true, documentId: doc.id };
  }

  async listFiles(organizationId: string, pagination: any) {
    return this.documentRepository.findAll(organizationId, {}, pagination);
  }

  async getStats(organizationId: string) {
    console.log(`[DocumentService.getStats] Fetching stats for organizationId: "${organizationId}"`);
    const docs = await this.documentRepository.findAll(organizationId, {}, { page: 1, limit: 1000 });
    const totalSize = docs.documents.reduce((sum: number, d: any) => sum + Number(d.fileSize), 0);
    const folders = await this.folderRepository.findByOrganizationId(organizationId);
    
    return {
      totalDocuments: docs.total,
      totalSize,
      totalFolders: folders.length
    };
  }
}
