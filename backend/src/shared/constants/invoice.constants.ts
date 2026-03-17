export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export const COMMON_SAC_CODES = {
  ACCOUNTING_SERVICES: '998221',
  TAX_CONSULTANCY: '998231',
  AUDIT_SERVICES: '998222',
  COMPANY_LAW: '998212',
  OTHER_PROFESSIONAL_SERVICES: '998399'
};
