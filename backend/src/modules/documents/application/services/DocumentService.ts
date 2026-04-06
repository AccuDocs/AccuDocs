import { injectable, inject } from "tsyringe";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository";
import { IFolderRepository } from "../../domain/repositories/IFolderRepository";
import { IClientRepository } from "../../../client/domain/repositories/IClientRepository";
import { Document } from "../../domain/entities/Document";
import { Folder } from "../../domain/entities/Folder";
import { s3Helpers } from "../../../../config/s3.config";
import { AppError, NotFoundError } from "../../../../utils/errors";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class DocumentService {
  constructor(
    @inject("IDocumentRepository") private documentRepository: IDocumentRepository,
    @inject("IFolderRepository") private folderRepository: IFolderRepository,
    @inject("IClientRepository") private clientRepository: IClientRepository
  ) {}

  async createFolder(organizationId: string, creatorId: string, props: { clientId?: string, parentId?: string, parentFolderId?: string, name: string }) {
    const parentId = props.parentId || props.parentFolderId;
    let clientId = props.clientId;

    if (!clientId && parentId) {
      const parent = await this.folderRepository.findById(parentId, organizationId);
      if (parent) {
        clientId = parent.clientId;
      }
    }

    if (!clientId) throw new AppError('ClientId is required for folder creation', 400);

    const folderResult = Folder.create({
      organizationId,
      clientId,
      parentId: parentId || null,
      name: props.name,
      slug: props.name.toLowerCase().replace(/ /g, '-'),
      path: '', // Fallback generates it
      isSystem: false,
      createdBy: creatorId
    }, uuidv4());

    if (folderResult.isFailure) throw new AppError(folderResult.getError() as string, 500);
    
    const folder = folderResult.getValue();
    await this.folderRepository.save(folder);
    return folder;
  }

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
      title: file.originalname,
      originalName: file.originalname,
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

  async getClientWorkspace(organizationId: string, clientId: string) {
    const client = await this.clientRepository.findById(clientId, organizationId);
    if (!client) throw new NotFoundError('Client not found');

    const folders = await this.folderRepository.findByClientId(clientId, organizationId);
    
    // Find the root folder (parentId is null/empty)
    const rootFolderEntity = folders.find(f => !f.parentId || f.parentId === '');
    if (!rootFolderEntity) throw new NotFoundError('Root workspace folder not found');

    // Build recursive tree
    const buildTree = (parent: Folder): any => {
      const parentIdString = String(parent.id);
      const children = folders
        .filter(f => f.parentId && String(f.parentId) === parentIdString)
        .map(child => buildTree(child));

      return {
        id: parent.id,
        name: parent.name,
        slug: parent.slug,
        type: parent.parentId ? 'documents' : 'root',
        s3Prefix: parent.path,
        fileCount: 0, // Stubbed for now
        folderCount: children.length,
        totalSize: 0, // Stubbed for now
        children: children,
        files: [] // Initially empty, files are loaded individually if needed
      };
    };

    const rootFolder = buildTree(rootFolderEntity);

    return {
      clientId: client.id,
      clientCode: client.code,
      clientName: client.name,
      rootFolder
    };
  }

  async getFolders(organizationId: string, clientId: string) {
    return this.getClientWorkspace(organizationId, clientId);
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

  async getFolderDetails(organizationId: string, folderId: string) {
    const folder = await this.folderRepository.findById(folderId, organizationId);
    if (!folder) throw new NotFoundError('Folder not found');

    // Build breadcrumbs
    const breadcrumbs: any[] = [];
    let current: Folder | null = folder;
    while (current) {
      breadcrumbs.unshift({
        id: current.id,
        name: current.name
      });
      if (current.parentId) {
        current = await this.folderRepository.findById(current.parentId, organizationId);
      } else {
        current = null;
      }
    }

    const docs = await this.documentRepository.findByFolderId(folderId, organizationId);

    const folderNode = {
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      type: folder.parentId ? 'documents' : 'root',
      s3Prefix: folder.path,
      fileCount: docs.length,
      folderCount: 0, // We could fetch subfolders if needed
      totalSize: docs.reduce((acc, d) => acc + Number(d.fileSize), 0),
      children: [],
      files: docs.map(d => ({
        id: d.id,
        fileName: d.fileName,
        originalName: d.title,
        s3Path: d.s3Key,
        mimeType: d.mimeType,
        size: d.fileSize,
        uploadedBy: { id: d.uploadedBy, name: 'User' }, // Simplified
        createdAt: (d.createdAt || new Date()).toISOString()
      }))
    };

    return {
      folder: folderNode,
      breadcrumbs
    };
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

  async deleteDocument(id: string, organizationId: string) {
    const doc = await this.documentRepository.findById(id, organizationId);
    if (!doc) throw new NotFoundError('Document not found');
    await this.documentRepository.delete(id, organizationId);
  }

  async deleteFolder(id: string, organizationId: string) {
    const folder = await this.folderRepository.findById(id, organizationId);
    if (!folder) throw new NotFoundError('Folder not found');
    await this.folderRepository.delete(id, organizationId);
  }
}
