import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class RevenueForecast extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public forecastDate: Date;
  declare public periodDays: number;
  declare public forecastedAmount: number;
  declare public confidenceScore: number;
  declare public historicalComponent: number;
  declare public recurringComponent: number;
  declare public outstandingComponent: number;
  declare public calculationInputs: any;
  declare public readonly createdAt: Date;
}

RevenueForecast.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  forecastDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'forecast_date' },
  periodDays: { type: DataTypes.SMALLINT, allowNull: false, field: 'period_days' },
  forecastedAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, field: 'forecasted_amount' },
  confidenceScore: { type: DataTypes.DECIMAL(4, 2), allowNull: false, field: 'confidence_score' },
  historicalComponent: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0.00, field: 'historical_component' },
  recurringComponent: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0.00, field: 'recurring_component' },
  outstandingComponent: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0.00, field: 'outstanding_component' },
  calculationInputs: { type: DataTypes.JSONB, allowNull: false, defaultValue: {}, field: 'calculation_inputs' },
}, {
  sequelize,
  modelName: 'RevenueForecast',
  tableName: 'revenue_forecasts',
  paranoid: false, 
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['organization_id', 'forecast_date', 'period_days'] }
  ]
});
