import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.config';

export class Task extends Model {
  declare public id: string;
  declare public organizationId: string;
  declare public clientId: string | null;
  declare public assignedTo: string | null;
  declare public createdBy: string;
  declare public title: string;
  declare public description: string | null;
  declare public priority: 'low' | 'medium' | 'high' | 'urgent';
  declare public status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled' | 'todo' | 'done';
  declare public startDate: Date | null;
  declare public dueDate: Date | null;
  declare public taskType: string | null;
  declare public moduleType: string | null;
  declare public moduleId: string | null;
  declare public estimatedHours: number | null;
  declare public actualHours: number | null;
  declare public tags: any;
  declare public checklist: any;
  declare public attachments: any;
  declare public completedAt: Date | null;
  declare public parentTaskId: string | null;
  declare public relatedInvoiceId: string | null;
  declare public relatedDocumentId: string | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public readonly deletedAt: Date | null;
}

Task.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
  clientId: { type: DataTypes.UUID, allowNull: true, field: 'client_id' },
  assignedTo: { type: DataTypes.UUID, allowNull: true, field: 'assigned_to' },
  createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  priority: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'medium' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
  startDate: { type: DataTypes.DATE, allowNull: true, field: 'start_date' },
  dueDate: { type: DataTypes.DATE, allowNull: true, field: 'due_date' },
  taskType: { type: DataTypes.STRING(50), allowNull: true, field: 'task_type' },
  moduleType: { type: DataTypes.STRING(50), allowNull: true, field: 'module_type' },
  moduleId: { type: DataTypes.STRING(100), allowNull: true, field: 'module_id' },
  estimatedHours: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'estimated_hours' },
  actualHours: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'actual_hours' },
  tags: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  checklist: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  attachments: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
  parentTaskId: { type: DataTypes.UUID, allowNull: true, field: 'parent_task_id' },
  relatedInvoiceId: { type: DataTypes.UUID, allowNull: true, field: 'related_invoice_id' },
  relatedDocumentId: { type: DataTypes.UUID, allowNull: true, field: 'related_document_id' },
  
  createdAt: { type: DataTypes.DATE, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'Task',
  tableName: 'tasks',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});
