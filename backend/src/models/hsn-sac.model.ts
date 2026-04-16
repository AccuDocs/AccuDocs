import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class HsnSac extends Model {
  declare public id: string;
  declare public code: string;
  declare public description: string;
  declare public gstRate: number;
  declare public type: 'HSN' | 'SAC';
  declare public chapter: string | null;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

HsnSac.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING(8), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    gstRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, field: 'gst_rate' },
    type: { type: DataTypes.CHAR(3), allowNull: false },
    chapter: { type: DataTypes.STRING(10), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    createdAt: { type: DataTypes.DATE, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  },
  {
    sequelize,
    modelName: 'HsnSac',
    tableName: 'hsn_sac_codes',
    underscored: true,
    timestamps: true,
  }
);
