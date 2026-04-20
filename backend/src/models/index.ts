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
import { Notification as NotificationModel } from './notification.model';
import { AuditLog } from './AuditLog.model';
import { SuperAdmin } from './SuperAdmin.model';
import { Subscription } from './subscription.model';
import { StaffPermission as StaffPermissionModel } from './StaffPermission.model';
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
import { InvoiceTemplate } from './invoice-template.model';
import { HsnSac } from './hsn-sac.model';
import { ItcLedger } from './itc-ledger.model';
import { Gstr2aReconciliation } from './gstr2a-reconciliation.model';

// Phase 3 — Inventory module
import { Warehouse } from './warehouse.model';
import { ItemCategory } from './item-category.model';
import { Item } from './item.model';
import { ItemVariant } from './item-variant.model';
import { ClientItemPricing } from './client-item-pricing.model';
import { StockLedger } from './stock-ledger.model';
import { StockSummary } from './stock-summary.model';
import { PurchaseOrder } from './purchase-order.model';
import { PurchaseOrderItem } from './purchase-order-item.model';
import { StockTransfer } from './stock-transfer.model';
import { StockTransferItem } from './stock-transfer-item.model';

// Phase 2 models
import { RecurringInvoice } from './recurring-invoice.model';
import { CurrencyRate } from './currency-rate.model';
import { EWayBill } from './eway-bill.model';
import { EInvoice } from './e-invoice.model';
import { TdsEntry } from './tds-entry.model';
import { TcsEntry } from './tcs-entry.model';
import { BulkInvoiceJob } from './bulk-invoice-job.model';

// Set up associations
Organization.hasMany(User, { foreignKey: 'organizationId', as: 'users' });
Organization.hasMany(Client, { foreignKey: 'organizationId', as: 'clients' });
Organization.hasMany(Subscription, { foreignKey: 'organizationId', as: 'subscriptions' });
Organization.hasMany(StaffPermissionModel, { foreignKey: 'organizationId', as: 'permissions' });
Organization.hasMany(WhatsAppMessageLog, { foreignKey: 'organizationId', as: 'whatsappLogs' });

User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
User.hasMany(StaffPermissionModel, { foreignKey: 'userId', as: 'staffPermissions' });

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

// ITC Ledger associations
Client.hasMany(ItcLedger, { foreignKey: 'client_id', as: 'itcLedgers' });
ItcLedger.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// GSTR-2A Reconciliation associations
Client.hasMany(Gstr2aReconciliation, { foreignKey: 'client_id', as: 'gstr2aReconciliations' });
Gstr2aReconciliation.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// ─── Phase 2 Associations ─────────────────────────────────────────────────────

// Recurring Invoice associations
RecurringInvoice.belongsTo(Invoice, { foreignKey: 'base_invoice_id', as: 'baseInvoice' });
RecurringInvoice.belongsTo(Invoice, { foreignKey: 'last_generated_invoice_id', as: 'lastGeneratedInvoice' });
RecurringInvoice.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Invoice.hasOne(RecurringInvoice, { foreignKey: 'base_invoice_id', as: 'recurringConfig' });

// E-Way Bill associations
EWayBill.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
EWayBill.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Invoice.hasMany(EWayBill, { foreignKey: 'invoice_id', as: 'ewayBills' });

// E-Invoice associations
EInvoice.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
EInvoice.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Invoice.hasOne(EInvoice, { foreignKey: 'invoice_id', as: 'eInvoice' });

// TDS/TCS associations
TdsEntry.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
TdsEntry.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Client.hasMany(TdsEntry, { foreignKey: 'client_id', as: 'tdsEntries' });

TcsEntry.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Bulk Invoice Job associations
BulkInvoiceJob.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// ─── Phase 3: Inventory Associations ─────────────────────────────────────────

// Warehouse
Organization.hasMany(Warehouse, { foreignKey: 'org_id', as: 'warehouses' });
Warehouse.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });

// ItemCategory (self-referencing)
ItemCategory.hasMany(ItemCategory, { foreignKey: 'parent_id', as: 'children' });
ItemCategory.belongsTo(ItemCategory, { foreignKey: 'parent_id', as: 'parent' });

// Item
Organization.hasMany(Item, { foreignKey: 'org_id', as: 'items' });
Item.belongsTo(Organization, { foreignKey: 'org_id', as: 'organization' });
Item.belongsTo(ItemCategory, { foreignKey: 'category_id', as: 'category' });
ItemCategory.hasMany(Item, { foreignKey: 'category_id', as: 'items' });

// ItemVariant
Item.hasMany(ItemVariant, { foreignKey: 'item_id', as: 'variants' });
ItemVariant.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// ClientItemPricing
Client.hasMany(ClientItemPricing, { foreignKey: 'client_id', as: 'itemPricings' });
ClientItemPricing.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Item.hasMany(ClientItemPricing, { foreignKey: 'item_id', as: 'clientPricings' });
ClientItemPricing.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });
ClientItemPricing.belongsTo(ItemVariant, { foreignKey: 'variant_id', as: 'variant' });

// StockLedger
StockLedger.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
StockLedger.belongsTo(Item,      { foreignKey: 'item_id',      as: 'item' });
StockLedger.belongsTo(ItemVariant, { foreignKey: 'variant_id', as: 'variant' });
StockLedger.belongsTo(Client,    { foreignKey: 'client_id',    as: 'client' });
Client.hasMany(StockLedger, { foreignKey: 'client_id', as: 'stockMovements' });
Warehouse.hasMany(StockLedger, { foreignKey: 'warehouse_id', as: 'ledgerEntries' });

// StockSummary
StockSummary.belongsTo(Warehouse,   { foreignKey: 'warehouse_id', as: 'warehouse' });
StockSummary.belongsTo(Item,        { foreignKey: 'item_id',      as: 'item' });
StockSummary.belongsTo(ItemVariant, { foreignKey: 'variant_id',   as: 'variant' });
Warehouse.hasMany(StockSummary, { foreignKey: 'warehouse_id', as: 'stockSummaries' });
Item.hasMany(StockSummary,      { foreignKey: 'item_id',      as: 'stockSummaries' });

// PurchaseOrder — supplier is a Client
Client.hasMany(PurchaseOrder, { foreignKey: 'supplier_client_id', as: 'supplierPurchaseOrders' });
PurchaseOrder.belongsTo(Client,    { foreignKey: 'supplier_client_id', as: 'supplier' });
PurchaseOrder.belongsTo(Warehouse, { foreignKey: 'warehouse_id',      as: 'warehouse' });
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'po_id', as: 'items' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });
PurchaseOrderItem.belongsTo(Item,          { foreignKey: 'item_id', as: 'item' });
PurchaseOrderItem.belongsTo(ItemVariant,   { foreignKey: 'variant_id', as: 'variant' });

// StockTransfer
StockTransfer.belongsTo(Warehouse, { foreignKey: 'from_warehouse_id', as: 'fromWarehouse' });
StockTransfer.belongsTo(Warehouse, { foreignKey: 'to_warehouse_id',   as: 'toWarehouse' });
StockTransfer.hasMany(StockTransferItem, { foreignKey: 'transfer_id', as: 'transferItems' });
StockTransferItem.belongsTo(StockTransfer, { foreignKey: 'transfer_id', as: 'transfer' });
StockTransferItem.belongsTo(Item,          { foreignKey: 'item_id',     as: 'item' });
StockTransferItem.belongsTo(ItemVariant,   { foreignKey: 'variant_id',  as: 'variant' });

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
  NotificationModel,
  AuditLog,
  SuperAdmin,
  Subscription,
  StaffPermissionModel,
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
  ActivityLog,
  InvoiceTemplate,
  HsnSac,
  ItcLedger,
  Gstr2aReconciliation,
  // Phase 2
  RecurringInvoice,
  CurrencyRate,
  EWayBill,
  EInvoice,
  TdsEntry,
  TcsEntry,
  BulkInvoiceJob,
  // Phase 3 — Inventory
  Warehouse,
  ItemCategory,
  Item,
  ItemVariant,
  ClientItemPricing,
  StockLedger,
  StockSummary,
  PurchaseOrder,
  PurchaseOrderItem,
  StockTransfer,
  StockTransferItem,
};
