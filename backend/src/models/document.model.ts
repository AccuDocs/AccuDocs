import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Document extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string;
  declare public yearId: string | null;
  declare public folderId: string | null;
  declare public uploadedBy: string;
  declare public fileName: string;
  declare public originalName: string;
  declare public s3Key: string;
  declare public mimeType: string;
  declare public sizeBytes: number;
  declare public version: number;
  declare public checksum: string | null;
  declare public isDeletedFromS3: boolean;
  declare public parentDocumentId: string | null;
  declare public tags: any;
  declare public description: string | null;
  declare public isSharedWithClient: boolean;
  declare public sharedAt: Date | null;
  declare public whatsappSentAt: Date | null;
  declare public whatsappSentBy: string | null;
  declare public downloadCount: number;
  declare public lastAccessedAt: Date | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

Document.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  yearId: { type: DataTypes.UUID, allowNull: true, field: 'year_id' },
  folderId: { type: DataTypes.UUID, allowNull: true, field: 'folder_id' },
  uploadedBy: { type: DataTypes.UUID, allowNull: false, field: 'uploaded_by' },
  fileName: { type: DataTypes.STRING(255), allowNull: false },
  originalName: { type: DataTypes.STRING(255), allowNull: false },
  s3Key: { type: DataTypes.STRING(500), allowNull: false, unique: true },
  mimeType: { type: DataTypes.STRING(100), allowNull: false },
  sizeBytes: { type: DataTypes.BIGINT, allowNull: false },
  version: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 1 },
  checksum: { type: DataTypes.STRING(64), allowNull: true },
  isDeletedFromS3: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_deleted_from_s3' },
  parentDocumentId: { type: DataTypes.UUID, allowNull: true, field: 'parent_document_id' },
  tags: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  description: { type: DataTypes.TEXT, allowNull: true },
  isSharedWithClient: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_shared_with_client' },
  sharedAt: { type: DataTypes.DATE, allowNull: true, field: 'shared_at' },
  whatsappSentAt: { type: DataTypes.DATE, allowNull: true, field: 'whatsapp_sent_at' },
  whatsappSentBy: { type: DataTypes.UUID, allowNull: true, field: 'whatsapp_sent_by' },
  downloadCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'download_count' },
  lastAccessedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_accessed_at' },
  
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'Document',
  tableName: 'documents',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});
