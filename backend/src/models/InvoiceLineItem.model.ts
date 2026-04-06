import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class InvoiceLineItem extends Model {
  declare public id: string;
  declare public invoiceId: string;
  declare public serviceTemplateId: string | null;
  declare public description: string;
  declare public sacCode: string;
  declare public quantity: number;
  declare public unitRate: number;
  declare public amount: number;
  declare public sortOrder: number;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

InvoiceLineItem.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoiceId: { type: DataTypes.UUID, allowNull: false, field: 'invoice_id' },
  serviceTemplateId: { type: DataTypes.UUID, allowNull: true, field: 'service_template_id' },
  description: { type: DataTypes.STRING(255), allowNull: false },
  sacCode: { type: DataTypes.STRING(10), allowNull: false, field: 'sac_code' },
  quantity: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 1.00 },
  unitRate: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'unit_rate' },
  // Generated implicitly by Postgres, mapped to read only field here
  amount: { 
    type: DataTypes.DECIMAL(12, 2)
  },
  sortOrder: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, field: 'sort_order' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'InvoiceLineItem',
  tableName: 'invoice_line_items',
  paranoid: false, 
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
