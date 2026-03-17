import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Year extends Model {
  declare public id: string;
  declare public clientId: string;
  declare public organizationId: string;
  declare public year: string;
  declare public label: string | null;
  declare public isActive: boolean;
  declare public notes: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

Year.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  year: { type: DataTypes.CHAR(4), allowNull: false },
  label: { type: DataTypes.STRING(20), allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize,
  modelName: 'Year',
  tableName: 'years',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    { unique: true, fields: ['client_id', 'year'] }
  ]
});
