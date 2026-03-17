import { injectable } from "tsyringe";
import { IDocumentRepository } from "../../domain/repositories/IDocumentRepository";
import { Document } from "../../domain/entities/Document";
import { Document as DocumentModel } from "../../../../models";
import { DocumentMapper } from "../mappers/DocumentMapper";

@injectable()
export class SequelizeDocumentRepository implements IDocumentRepository {
  async save(document: Document, options?: any): Promise<Document> {
    const raw = DocumentMapper.toPersistence(document);
    const exists = await DocumentModel.findByPk(document.id, { transaction: options?.transaction });
    
    if (exists) {
      await exists.update(raw, options);
    } else {
      await DocumentModel.create(raw, options);
    }
    
    const saved = await DocumentModel.findByPk(document.id, { transaction: options?.transaction });
    return DocumentMapper.toDomain(saved);
  }

  async findById(id: string, organizationId: string): Promise<Document | null> {
    const doc = await DocumentModel.findOne({ where: { id, organizationId } });
    if (!doc) return null;
    return DocumentMapper.toDomain(doc);
  }

  async findByFolderId(folderId: string, organizationId: string): Promise<Document[]> {
    const docs = await DocumentModel.findAll({ where: { folderId, organizationId } });
    return docs.map(DocumentMapper.toDomain);
  }

  async findAll(organizationId: string, filters: any, pagination: any): Promise<{ documents: Document[], total: number }> {
    const where: any = { organizationId };
    if (filters.folderId) where.folderId = filters.folderId;
    if (filters.clientId) where.clientId = filters.clientId;

    const offset = (pagination.page - 1) * pagination.limit;
    const order: any = pagination.sortBy
      ? [[pagination.sortBy, pagination.sortOrder || 'desc']]
      : [['createdAt', 'desc']];

    const { rows, count } = await DocumentModel.findAndCountAll({
      where,
      offset,
      limit: pagination.limit,
      order,
    });

    return {
      documents: rows.map(r => DocumentMapper.toDomain(r)),
      total: count
    };
  }

  async delete(id: string, organizationId: string, options?: any): Promise<void> {
    await DocumentModel.destroy({ where: { id, organizationId }, transaction: options?.transaction });
  }
}
