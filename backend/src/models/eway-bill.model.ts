import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export type TransportMode = 'road' | 'rail' | 'air' | 'ship';
export type EWayBillStatus = 'generated' | 'cancelled' | 'expired';

export class EWayBill extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public invoiceId: string;
  declare public ewayBillNo: string | null;
  declare public generatedAt: Date | null;
  declare public validUpto: Date | null;
  declare public transporterId: string | null;
  declare public vehicleNo: string | null;
  declare public distanceKm: number;
  declare public transportMode: TransportMode;
  declare public status: EWayBillStatus;
  declare public rawResponse: any;
  declare public errorMessage: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

EWayBill.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  invoiceId: { type: DataTypes.UUID, allowNull: false, field: 'invoice_id' },
  ewayBillNo: { type: DataTypes.STRING(20), allowNull: true, field: 'eway_bill_no' },
  generatedAt: { type: DataTypes.DATE, allowNull: true, field: 'generated_at' },
  validUpto: { type: DataTypes.DATE, allowNull: true, field: 'valid_upto' },
  transporterId: { type: DataTypes.STRING(20), allowNull: true, field: 'transporter_id' },
  vehicleNo: { type: DataTypes.STRING(20), allowNull: true, field: 'vehicle_no' },
  distanceKm: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'distance_km' },
  transportMode: {
    type: DataTypes.ENUM('road', 'rail', 'air', 'ship'),
    allowNull: false,
    defaultValue: 'road',
    field: 'transport_mode',
  },
  status: {
    type: DataTypes.ENUM('generated', 'cancelled', 'expired'),
    allowNull: false,
    defaultValue: 'generated',
  },
  rawResponse: { type: DataTypes.JSONB, allowNull: true, field: 'raw_response' },
  errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'EWayBill',
  tableName: 'eway_bills',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['invoice_id'] },
    { fields: ['eway_bill_no'] },
    { fields: ['organization_id', 'status'] },
  ],
});
