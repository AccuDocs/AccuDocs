import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class InvoiceNumberSequence extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public financialYear: string;
  declare public lastSequence: number;
  declare public readonly updatedAt: Date;
}

InvoiceNumberSequence.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  financialYear: { type: DataTypes.CHAR(4), allowNull: false, field: 'financial_year' },
  lastSequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'last_sequence' },
}, {
  sequelize,
  modelName: 'InvoiceNumberSequence',
  tableName: 'invoice_number_sequences',
  paranoid: false,
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['organization_id', 'financial_year'] }
  ]
});
