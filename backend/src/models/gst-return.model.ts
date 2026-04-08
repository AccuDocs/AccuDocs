import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class GstReturn extends Model {
  declare public id: string;
  declare public clientId: string;
  declare public organizationId: string;
  declare public returnType: string;
  declare public periodMonth: number;
  declare public periodYear: number;
  declare public financialYear: string;
  declare public status: string;
  declare public dueDate: Date | null;
  declare public filedDate: Date | null;
  declare public filedBy: string | null;
  declare public arn: string | null;
  declare public jsonData: any;
  declare public pdfUrl: string | null;
  declare public remarks: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

GstReturn.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  returnType: { type: DataTypes.STRING(20), allowNull: false, field: 'return_type' },
  periodMonth: { type: DataTypes.INTEGER, allowNull: false, field: 'period_month' },
  periodYear: { type: DataTypes.INTEGER, allowNull: false, field: 'period_year' },
  financialYear: { type: DataTypes.STRING(9), allowNull: false, field: 'financial_year' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'due_date' },
  filedDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'filed_date' },
  filedBy: { type: DataTypes.UUID, allowNull: true, field: 'filed_by' },
  arn: { type: DataTypes.STRING(50), allowNull: true },
  jsonData: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'json_data' },
  pdfUrl: { type: DataTypes.STRING(512), allowNull: true, field: 'pdf_url' },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'GstReturn',
  tableName: 'gst_returns',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
