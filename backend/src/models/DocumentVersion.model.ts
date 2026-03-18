import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class DocumentVersion extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public documentId: string;
  declare public version: number;
  declare public s3Key: string;
  declare public sizeBytes: number;
  declare public checksum: string | null;
  declare public createdBy: string;
  declare public readonly createdAt: Date;
}

DocumentVersion.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  documentId: { type: DataTypes.UUID, allowNull: false, field: 'document_id' },
  version: { type: DataTypes.SMALLINT, allowNull: false },
  s3Key: { type: DataTypes.STRING(500), allowNull: false, field: 's3_key' },
  sizeBytes: { type: DataTypes.BIGINT, allowNull: false, field: 'size_bytes' },
  checksum: { type: DataTypes.STRING(64), allowNull: true },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
}, {
  sequelize,
  modelName: 'DocumentVersion',
  tableName: 'document_versions',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});
