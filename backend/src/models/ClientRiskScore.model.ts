import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class ClientRiskScore extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string;
  declare public score: number;
  declare public ltvSegment: 'LOW' | 'MEDIUM' | 'HIGH';
  declare public paymentHistoryScore: number;
  declare public overdueFrequencyScore: number;
  declare public consistencyScore: number;
  declare public creditUtilizationScore: number;
  declare public avgDaysToPay: number | null;
  declare public overdueRatePct: number | null;
  declare public currentOutstanding: number | null;
  declare public creditLimitUsed: number | null;
  declare public twoYearRevenue: number | null;
  declare public projectedThreeYearRevenue: number | null;
  declare public calculatedAt: Date;
}

ClientRiskScore.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  clientId: { type: DataTypes.UUID, allowNull: false, field: 'client_id' },
  score: { type: DataTypes.SMALLINT, allowNull: false },
  ltvSegment: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'LOW', field: 'ltv_segment' },
  paymentHistoryScore: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, field: 'payment_history_score' },
  overdueFrequencyScore: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, field: 'overdue_frequency_score' },
  consistencyScore: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, field: 'consistency_score' },
  creditUtilizationScore: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0, field: 'credit_utilization_score' },
  avgDaysToPay: { type: DataTypes.DECIMAL(5, 1), allowNull: true, field: 'avg_days_to_pay' },
  overdueRatePct: { type: DataTypes.DECIMAL(5, 2), allowNull: true, field: 'overdue_rate_pct' },
  currentOutstanding: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'current_outstanding' },
  creditLimitUsed: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'credit_limit_used' },
  twoYearRevenue: { type: DataTypes.DECIMAL(14, 2), allowNull: true, field: 'two_year_revenue' },
  projectedThreeYearRevenue: { type: DataTypes.DECIMAL(14, 2), allowNull: true, field: 'projected_three_year_revenue' },
  calculatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'calculated_at' },
}, {
  sequelize,
  modelName: 'ClientRiskScore',
  tableName: 'client_risk_scores',
  paranoid: false, 
  timestamps: false, // Insert only snapshots
});
