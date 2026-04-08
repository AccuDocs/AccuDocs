/**
 * GST Validator — CA validation rules engine
 * Checks: Missing GSTIN, Invalid HSN/SAC, Tax mismatch, Duplicates, Place of Supply consistency
 */

export interface ValidationIssue {
  errorCategory: 'data' | 'compliance' | 'system';
  errorType: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  entityType: 'sale' | 'purchase' | 'expense';
  entityId: string;
  fieldName?: string;
}

const VALID_GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];
const HSN_REGEX = /^\d{4}(\d{2})?(\d{2})?$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/**
 * Validate sales transactions
 */
export function validateSales(sales: any[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const invoiceSet = new Set<string>();

  for (const s of sales) {
    const id = s.id;
    const type = (s.invoice_type || s.invoiceType || 'B2B').toUpperCase();

    // Missing GSTIN for B2B
    if (type === 'B2B') {
      const gstin = s.gstin || '';
      if (!gstin) {
        issues.push({
          errorCategory: 'data', errorType: 'MISSING_GSTIN', severity: 'error',
          message: `B2B invoice ${s.invoice_no || s.invoiceNo} missing customer GSTIN`,
          entityType: 'sale', entityId: id, fieldName: 'gstin'
        });
      } else if (!GSTIN_REGEX.test(gstin)) {
        issues.push({
          errorCategory: 'data', errorType: 'INVALID_GSTIN', severity: 'error',
          message: `Invalid GSTIN format: ${gstin}`,
          entityType: 'sale', entityId: id, fieldName: 'gstin'
        });
      }
    }

    // Invalid HSN/SAC
    const hsn = s.hsn_sac_code || s.hsnSacCode || '';
    if (hsn && !HSN_REGEX.test(hsn)) {
      issues.push({
        errorCategory: 'data', errorType: 'INVALID_HSN', severity: 'warning',
        message: `Invalid HSN/SAC code: ${hsn} (must be 4, 6, or 8 digits)`,
        entityType: 'sale', entityId: id, fieldName: 'hsn_sac_code'
      });
    }

    // Tax rate validation
    const gstRate = parseFloat(s.gst_rate || s.gstRate || 0);
    if (!VALID_GST_RATES.includes(gstRate) && gstRate !== 0) {
      issues.push({
        errorCategory: 'data', errorType: 'INVALID_TAX_RATE', severity: 'warning',
        message: `Non-standard GST rate: ${gstRate}% on invoice ${s.invoice_no || s.invoiceNo}`,
        entityType: 'sale', entityId: id, fieldName: 'gst_rate'
      });
    }

    // Place of supply vs tax type consistency
    const pos = s.place_of_supply || s.placeOfSupply;
    const cgst = parseFloat(s.cgst_amount || s.cgstAmount || 0);
    const igst = parseFloat(s.igst_amount || s.igstAmount || 0);
    if (pos && cgst > 0 && igst > 0) {
      issues.push({
        errorCategory: 'data', errorType: 'TAX_SPLIT_MISMATCH', severity: 'error',
        message: `Both CGST and IGST present on invoice ${s.invoice_no || s.invoiceNo}`,
        entityType: 'sale', entityId: id, fieldName: 'cgst_amount'
      });
    }

    // Duplicate invoice check
    const invoiceKey = `${s.invoice_no || s.invoiceNo}-${s.invoice_date || s.invoiceDate}`;
    if (invoiceSet.has(invoiceKey)) {
      issues.push({
        errorCategory: 'compliance', errorType: 'DUPLICATE_INVOICE', severity: 'error',
        message: `Duplicate invoice: ${s.invoice_no || s.invoiceNo} on ${s.invoice_date || s.invoiceDate}`,
        entityType: 'sale', entityId: id, fieldName: 'invoice_no'
      });
    }
    invoiceSet.add(invoiceKey);

    // Missing Place of Supply
    if (!pos && type !== 'B2C') {
      issues.push({
        errorCategory: 'data', errorType: 'MISSING_POS', severity: 'warning',
        message: `Missing Place of Supply on invoice ${s.invoice_no || s.invoiceNo}`,
        entityType: 'sale', entityId: id, fieldName: 'place_of_supply'
      });
    }
  }

  return issues;
}

/**
 * Validate purchase transactions
 */
export function validatePurchases(purchases: any[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const billSet = new Set<string>();

  for (const p of purchases) {
    const id = p.id;
    const gstin = p.gstin || '';

    // Missing vendor GSTIN (only if not RCM from unregistered)
    if (!gstin && !(p.rcm_applicable || p.rcmApplicable)) {
      issues.push({
        errorCategory: 'data', errorType: 'MISSING_GSTIN', severity: 'warning',
        message: `Missing vendor GSTIN on bill ${p.bill_no || p.billNo}`,
        entityType: 'purchase', entityId: id, fieldName: 'gstin'
      });
    } else if (gstin && !GSTIN_REGEX.test(gstin)) {
      issues.push({
        errorCategory: 'data', errorType: 'INVALID_GSTIN', severity: 'error',
        message: `Invalid vendor GSTIN: ${gstin}`,
        entityType: 'purchase', entityId: id, fieldName: 'gstin'
      });
    }

    // HSN validation
    const hsn = p.hsn_sac_code || p.hsnSacCode || '';
    if (hsn && !HSN_REGEX.test(hsn)) {
      issues.push({
        errorCategory: 'data', errorType: 'INVALID_HSN', severity: 'warning',
        message: `Invalid HSN/SAC: ${hsn}`,
        entityType: 'purchase', entityId: id, fieldName: 'hsn_sac_code'
      });
    }

    // RCM without marking ITC as blocked
    if ((p.rcm_applicable || p.rcmApplicable) && (p.itc_eligible || p.itcEligible) === false) {
      issues.push({
        errorCategory: 'data', errorType: 'RCM_ITC_CONFLICT', severity: 'warning',
        message: `RCM purchase with blocked ITC on bill ${p.bill_no || p.billNo}`,
        entityType: 'purchase', entityId: id, fieldName: 'itc_eligible'
      });
    }

    // Duplicate bill
    const billKey = `${p.vendor_name || p.vendorName}-${p.bill_no || p.billNo}-${p.bill_date || p.billDate}`;
    if (billSet.has(billKey)) {
      issues.push({
        errorCategory: 'compliance', errorType: 'DUPLICATE_BILL', severity: 'error',
        message: `Duplicate bill: ${p.bill_no || p.billNo} from ${p.vendor_name || p.vendorName}`,
        entityType: 'purchase', entityId: id, fieldName: 'bill_no'
      });
    }
    billSet.add(billKey);
  }

  return issues;
}

/**
 * Validate expense entries
 */
export function validateExpenses(expenses: any[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const e of expenses) {
    const id = e.id;

    // GST applicable but no rate
    if ((e.gst_applicable || e.gstApplicable) && parseFloat(e.gst_rate || e.gstRate || 0) === 0) {
      issues.push({
        errorCategory: 'data', errorType: 'MISSING_GST_RATE', severity: 'warning',
        message: `GST applicable expense "${e.description}" has 0% GST rate`,
        entityType: 'expense', entityId: id, fieldName: 'gst_rate'
      });
    }

    // ITC claimed on blocked category
    const BLOCKED_CATEGORIES = ['food', 'personal', 'motor_vehicle', 'club_membership', 'gift', 'entertainment'];
    const cat = (e.category || '').toLowerCase();
    if (BLOCKED_CATEGORIES.includes(cat) && (e.itc_allowed || e.itcAllowed)) {
      issues.push({
        errorCategory: 'compliance', errorType: 'BLOCKED_ITC_CLAIMED', severity: 'error',
        message: `ITC claimed on blocked category: ${e.category}`,
        entityType: 'expense', entityId: id, fieldName: 'itc_allowed'
      });
    }
  }

  return issues;
}

/**
 * Run all validations and return combined results
 */
export function runFullValidation(
  sales: any[],
  purchases: any[],
  expenses: any[]
): { total: number; errors: number; warnings: number; issues: ValidationIssue[] } {
  const issues = [
    ...validateSales(sales),
    ...validatePurchases(purchases),
    ...validateExpenses(expenses)
  ];

  return {
    total: issues.length,
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    issues
  };
}
