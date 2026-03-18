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

// Set up associations
Organization.hasMany(User, { foreignKey: 'organization_id' });
Organization.hasMany(Client, { foreignKey: 'organization_id' });
Organization.hasMany(Subscription, { foreignKey: 'organization_id' });
Organization.hasMany(StaffPermission, { foreignKey: 'organization_id' });
Organization.hasMany(WhatsAppMessageLog, { foreignKey: 'organization_id' });

User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
User.hasMany(StaffPermission, { foreignKey: 'user_id' });

Client.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Client.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Client.hasMany(Invoice, { foreignKey: 'client_id', as: 'invoices' });
Client.hasMany(Year, { foreignKey: 'client_id', as: 'years' });
Client.hasMany(ClientAccessToken, { foreignKey: 'client_id' });

Invoice.hasMany(InvoiceLineItem, { foreignKey: 'invoice_id', as: 'lineItems' });
Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });
Invoice.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

Year.hasMany(Document, { foreignKey: 'year_id', as: 'documents' });
Year.hasMany(Folder, { foreignKey: 'year_id', as: 'folders' });

Folder.hasMany(Document, { foreignKey: 'folder_id', as: 'documents' });

Document.belongsTo(Folder, { foreignKey: 'folder_id', as: 'folder' });
Document.hasMany(DocumentVersion, { foreignKey: 'document_id', as: 'versions' });

DocumentVersion.belongsTo(Document, { foreignKey: 'document_id' });

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
  WhatsAppMessageLog
};
