import { Organization } from './organization.model';
import { User } from './user.model';
import { Otp } from './otp.model';
import { Client } from './client.model';
import { Year } from './year.model';
import { Folder } from './folder.model';
import { Document } from './document.model';
import { ServiceTemplate } from './ServiceTemplate.model';
import { InvoiceNumberSequence } from './InvoiceNumberSequence.model';
import { RecurringInvoiceTemplate } from './RecurringInvoiceTemplate.model';
import { Invoice } from './invoice.model';
import { InvoiceLineItem } from './InvoiceLineItem.model';
import { Payment } from './payment.model';
import { RevenueForecast } from './RevenueForecast.model';
import { ClientRiskScore } from './ClientRiskScore.model';
import { Task } from './task.model';
import { Notification } from './Notification.model';
import { AuditLog } from './AuditLog.model';
import { SuperAdmin } from './SuperAdmin.model';
import { Subscription } from './Subscription.model';
import { StaffPermission } from './StaffPermission.model';
import { DocumentVersion } from './DocumentVersion.model';
import { ClientAccessToken } from './ClientAccessToken.model';
import { WhatsAppMessageLog } from './WhatsAppMessageLog.model';
import { Checklist } from './checklist.model';
import { ChecklistTemplate } from './checklist-template.model';
import { ComplianceDeadline } from './compliance-deadline.model';
import { ClientDeadline } from './client-deadline.model';
import { ClientSale } from './client-sale.model';
import { ClientPurchase } from './client-purchase.model';
import { ClientExpense } from './client-expense.model';
import { GstReturn } from './gst-return.model';
import { ValidationError } from './validation-error.model';
import { ActivityLog } from './activity-log.model';

// Set up associations
Organization.hasMany(User, { foreignKey: 'organizationId', as: 'users' });
Organization.hasMany(Client, { foreignKey: 'organizationId', as: 'clients' });
Organization.hasMany(Subscription, { foreignKey: 'organizationId', as: 'subscriptions' });
Organization.hasMany(StaffPermission, { foreignKey: 'organizationId', as: 'permissions' });
Organization.hasMany(WhatsAppMessageLog, { foreignKey: 'organizationId', as: 'whatsappLogs' });

User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
User.hasMany(StaffPermission, { foreignKey: 'userId', as: 'staffPermissions' });

Client.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Client.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Client.hasMany(Invoice, { foreignKey: 'clientId', as: 'invoices' });
Client.hasMany(Year, { foreignKey: 'clientId', as: 'years' });
Client.hasMany(ClientAccessToken, { foreignKey: 'clientId', as: 'accessTokens' });

Invoice.hasMany(InvoiceLineItem, { foreignKey: 'invoice_id', as: 'lineItems' });
Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });
Invoice.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

Year.hasMany(Document, { foreignKey: 'year_id', as: 'documents' });
Year.hasMany(Folder, { foreignKey: 'year_id', as: 'folders' });

Folder.hasMany(Document, { foreignKey: 'folder_id', as: 'documents' });

Document.belongsTo(Folder, { foreignKey: 'folder_id', as: 'folder' });
Document.hasMany(DocumentVersion, { foreignKey: 'document_id', as: 'versions' });

DocumentVersion.belongsTo(Document, { foreignKey: 'document_id' });

// Checklist associations
Client.hasMany(Checklist, { foreignKey: 'client_id', as: 'checklists' });
Checklist.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Checklist.belongsTo(ChecklistTemplate, { foreignKey: 'template_id', as: 'template' });
Checklist.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Compliance associations
Client.hasMany(ClientDeadline, { foreignKey: 'client_id', as: 'deadlines' });
ClientDeadline.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
ClientDeadline.belongsTo(ComplianceDeadline, { foreignKey: 'deadline_id', as: 'deadline' });
ComplianceDeadline.hasMany(ClientDeadline, { foreignKey: 'deadline_id', as: 'clientDeadlines' });

// Data module associations (Sales, Purchases, Expenses)
Client.hasMany(ClientSale, { foreignKey: 'client_id', as: 'sales' });
ClientSale.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Client.hasMany(ClientPurchase, { foreignKey: 'client_id', as: 'purchases' });
ClientPurchase.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Client.hasMany(ClientExpense, { foreignKey: 'client_id', as: 'expenses' });
ClientExpense.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// GST V2 associations
Client.hasMany(GstReturn, { foreignKey: 'client_id', as: 'gstReturns' });
GstReturn.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Client.hasMany(ValidationError, { foreignKey: 'client_id', as: 'validationErrors' });
ValidationError.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Client.hasMany(ActivityLog, { foreignKey: 'client_id', as: 'activityLogs' });
ActivityLog.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

export {
  Organization,
  User,
  Otp,
  Client,
  Year,
  Folder,
  Document,
  ServiceTemplate,
  InvoiceNumberSequence,
  RecurringInvoiceTemplate,
  Invoice,
  InvoiceLineItem,
  Payment,
  RevenueForecast,
  ClientRiskScore,
  Task,
  Notification,
  AuditLog,
  SuperAdmin,
  Subscription,
  StaffPermission,
  DocumentVersion,
  ClientAccessToken,
  WhatsAppMessageLog,
  Checklist,
  ChecklistTemplate,
  ComplianceDeadline,
  ClientDeadline,
  ClientSale,
  ClientPurchase,
  ClientExpense,
  GstReturn,
  ValidationError,
  ActivityLog
};
