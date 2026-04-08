import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ValidationError extends Model {
  declare public id: string;
  declare public clientId: string;
  declare public organizationId: string;
  declare public errorCategory: string;
  declare public errorType: string;
  declare public severity: string;
  declare public message: string;
  declare public entityType: string;
  declare public entityId: string;
  declare public fieldName: string | null;
  declare public isResolved: boolean;
  declare public resolvedBy: string | null;
  declare public resolvedAt: Date | null;
  declare public resolutionNote: string | null;
  declare public financialYear: string;
  declare public month: number | null;
  declare public readonly createdAt: Date;
}

ValidationError.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  errorCategory: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'data', field: 'error_category' },
  errorType: { type: DataTypes.STRING(50), allowNull: false, field: 'error_type' },
  severity: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'warning' },
  message: { type: DataTypes.TEXT, allowNull: false },
  entityType: { type: DataTypes.STRING(20), allowNull: false, field: 'entity_type' },
  entityId: { type: DataTypes.UUID, allowNull: false, field: 'entity_id' },
  fieldName: { type: DataTypes.STRING(50), allowNull: true, field: 'field_name' },
  isResolved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_resolved' },
  resolvedBy: { type: DataTypes.UUID, allowNull: true, field: 'resolved_by' },
  resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
  resolutionNote: { type: DataTypes.TEXT, allowNull: true, field: 'resolution_note' },
  financialYear: { type: DataTypes.STRING(9), allowNull: false, field: 'financial_year' },
  month: { type: DataTypes.INTEGER, allowNull: true },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
}, {
  sequelize,
  modelName: 'ValidationError',
  tableName: 'validation_errors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});
