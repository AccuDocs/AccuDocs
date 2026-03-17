import { Document } from "../entities/Document";

export interface IDocumentRepository {
  save(document: Document, options?: any): Promise<Document>;
  findById(id: string, organizationId: string): Promise<Document | null>;
  findByFolderId(folderId: string, organizationId: string): Promise<Document[]>;
  findAll(organizationId: string, filters: any, pagination: any): Promise<{ documents: Document[], total: number }>;
  delete(id: string, organizationId: string, options?: any): Promise<void>;
}
