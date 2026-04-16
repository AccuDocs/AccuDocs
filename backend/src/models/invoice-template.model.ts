import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class InvoiceTemplate extends Model {
  declare public id: string;
  declare public name: string;
  declare public htmlContent: string;
  declare public thumbnailUrl: string | null;
  declare public isDefault: boolean;
  declare public orgId: string | null;
  declare public isSystem: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

InvoiceTemplate.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    htmlContent: { type: DataTypes.TEXT, allowNull: false, field: 'html_content' },
    thumbnailUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'thumbnail_url' },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
    orgId: { type: DataTypes.UUID, allowNull: true, field: 'org_id' },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_system' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    modelName: 'InvoiceTemplate',
    tableName: 'invoice_templates',
    underscored: true,
    timestamps: true,
  }
);
