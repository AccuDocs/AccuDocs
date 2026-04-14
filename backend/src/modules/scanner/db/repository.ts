import fs from 'fs/promises';
import path from 'path';
import { PoolClient } from 'pg';
import { scannerDbPool } from './pool';
import {
  SaveScannerDocumentInput,
  ScannerDocumentRecord,
  ScannerExportFilters,
  ScannerLineItem,
  ScannerListFilters,
  ScannerSummaryRow,
} from '../types';
import { AppError, NotFoundError } from '../../../utils/errors';

const DOCUMENT_TABLE = 'document_scanner.documents';
const LINE_ITEMS_TABLE = 'document_scanner.line_items';

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
};

const toNullableQuantity = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(3)) : null;
};

const mapLineItem = (row: Record<string, unknown>): ScannerLineItem => ({
  id: Number(row.id),
  description: String(row.description || ''),
  quantity: toNullableQuantity(row.quantity),
  unit_price: toNullableNumber(row.unit_price),
  amount: toNullableNumber(row.amount),
  hsn_sac_code: row.hsn_sac_code ? String(row.hsn_sac_code) : null,
  tax_rate_percent: toNullableNumber(row.tax_rate_percent),
});

const mapDocument = (row: Record<string, unknown>): ScannerDocumentRecord => ({
  id: Number(row.id),
  organization_id: String(row.organization_id),
  doc_type: row.doc_type as ScannerDocumentRecord['doc_type'],
  document_number: row.document_number ? String(row.document_number) : null,
  date:
    typeof row.doc_date === 'string'
      ? row.doc_date
      : row.doc_date instanceof Date
        ? row.doc_date.toISOString().slice(0, 10)
        : null,
  vendor_or_customer: row.vendor_or_customer ? String(row.vendor_or_customer) : null,
  gstin: row.gstin ? String(row.gstin) : null,
  subtotal: toNullableNumber(row.subtotal),
  tax_amount: toNullableNumber(row.tax_amount),
  discount: toNullableNumber(row.discount),
  total_amount: toNullableNumber(row.total_amount),
  currency: row.currency ? String(row.currency) : 'INR',
  payment_mode: row.payment_mode ? (String(row.payment_mode) as ScannerDocumentRecord['payment_mode']) : null,
  notes: row.notes ? String(row.notes) : null,
  email: row.email ? String(row.email) : null,
  phone: row.phone ? String(row.phone) : null,
  line_items: Array.isArray(row.line_items) ? (row.line_items as Record<string, unknown>[]).map(mapLineItem) : [],
  ocr_confidence: row.ocr_confidence === null || row.ocr_confidence === undefined ? null : Number(row.ocr_confidence),
  s3_url: row.s3_url ? String(row.s3_url) : null,
  s3_key: row.s3_key ? String(row.s3_key) : null,
  local_path: row.local_path ? String(row.local_path) : null,
  image_filename: row.image_filename ? String(row.image_filename) : null,
  raw_ocr_text: row.raw_ocr_text ? String(row.raw_ocr_text) : null,
  created_at:
    typeof row.created_at === 'string'
      ? row.created_at
      : (row.created_at as Date).toISOString(),
  updated_at:
    typeof row.updated_at === 'string'
      ? row.updated_at
      : (row.updated_at as Date).toISOString(),
  deleted_at:
    row.deleted_at === null || row.deleted_at === undefined
      ? null
      : typeof row.deleted_at === 'string'
        ? row.deleted_at
        : (row.deleted_at as Date).toISOString(),
});

const insertLineItems = async (
  client: PoolClient,
  documentId: number,
  lineItems: ScannerLineItem[],
): Promise<void> => {
  for (const lineItem of lineItems) {
    await client.query(
      `
        INSERT INTO ${LINE_ITEMS_TABLE}
          (document_id, description, quantity, unit_price, amount, hsn_sac_code, tax_rate_percent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        documentId,
        lineItem.description,
        lineItem.quantity,
        lineItem.unit_price,
        lineItem.amount,
        lineItem.hsn_sac_code || null,
        lineItem.tax_rate_percent || null,
      ],
    );
  }
};

const getDocumentByIdWithClient = async (
  client: PoolClient,
  id: number,
  organizationId: string,
): Promise<ScannerDocumentRecord> => {
  const result = await client.query(
    `
      SELECT
        d.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', li.id,
              'description', li.description,
              'quantity', li.quantity,
              'unit_price', li.unit_price,
              'amount', li.amount,
              'hsn_sac_code', li.hsn_sac_code,
              'tax_rate_percent', li.tax_rate_percent
            )
            ORDER BY li.id
          ) FILTER (WHERE li.id IS NOT NULL),
          '[]'::json
        ) AS line_items
      FROM ${DOCUMENT_TABLE} d
      LEFT JOIN ${LINE_ITEMS_TABLE} li ON li.document_id = d.id
      WHERE d.id = $1
        AND d.organization_id = $2
        AND d.deleted_at IS NULL
      GROUP BY d.id
    `,
    [id, organizationId],
  );

  if (result.rowCount === 0) {
    throw new NotFoundError('Document not found');
  }

  return mapDocument(result.rows[0]);
};

const buildListWhereClause = (
  filters: ScannerListFilters | ScannerExportFilters,
  values: unknown[],
): string[] => {
  const where: string[] = ['d.organization_id = $1', 'd.deleted_at IS NULL'];

  if (filters.type) {
    values.push(filters.type);
    where.push(`d.doc_type = $${values.length}`);
  }

  if (filters.from) {
    values.push(filters.from);
    where.push(`d.doc_date >= $${values.length}`);
  }

  if (filters.to) {
    values.push(filters.to);
    where.push(`d.doc_date <= $${values.length}`);
  }

  if ('vendor' in filters && filters.vendor) {
    values.push(`%${filters.vendor}%`);
    where.push(`d.vendor_or_customer ILIKE $${values.length}`);
  }

  return where;
};

export const createScannerDocument = async (input: SaveScannerDocumentInput): Promise<ScannerDocumentRecord> => {
  const client = await scannerDbPool.connect();

  try {
    await client.query('BEGIN');

    const documentResult = await client.query(
      `
        INSERT INTO ${DOCUMENT_TABLE}
          (
            organization_id, doc_type, document_number, doc_date, vendor_or_customer, gstin,
            subtotal, tax_amount, discount, total_amount, currency, payment_mode, notes,
            email, phone, ocr_confidence, s3_url, s3_key, local_path, image_filename, raw_ocr_text
          )
        VALUES
          (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21
          )
        RETURNING *
      `,
      [
        input.organization_id,
        input.doc_type,
        input.document_number,
        input.date,
        input.vendor_or_customer,
        input.gstin,
        input.subtotal,
        input.tax_amount,
        input.discount,
        input.total_amount,
        input.currency,
        input.payment_mode,
        input.notes,
        input.email,
        input.phone,
        input.ocr_confidence,
        input.s3_url,
        input.s3_key,
        input.local_path,
        input.image_filename,
        input.raw_ocr_text,
      ],
    );

    const documentId = Number(documentResult.rows[0].id);
    await insertLineItems(client, documentId, input.line_items);
    await client.query('COMMIT');

    return getDocumentByIdWithClient(client, documentId, input.organization_id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new AppError('Failed to save scanned document. Please try again.');
  } finally {
    client.release();
  }
};

export const listScannerDocuments = async (
  filters: ScannerListFilters,
): Promise<{ rows: ScannerDocumentRecord[]; total: number }> => {
  const values: unknown[] = [filters.organizationId];
  const where = buildListWhereClause(filters, values);
  const offset = (filters.page - 1) * filters.limit;
  values.push(filters.limit, offset);

  const result = await scannerDbPool.query(
    `
      SELECT
        d.*,
        '[]'::json AS line_items,
        COUNT(*) OVER() AS total_count
      FROM ${DOCUMENT_TABLE} d
      WHERE ${where.join(' AND ')}
      ORDER BY d.doc_date DESC NULLS LAST, d.created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values,
  );

  const total = (result.rowCount || 0) > 0 ? Number(result.rows[0].total_count) : 0;
  return {
    rows: result.rows.map(mapDocument),
    total,
  };
};

export const getScannerDocumentById = async (
  id: number,
  organizationId: string,
): Promise<ScannerDocumentRecord> => {
  const client = await scannerDbPool.connect();
  try {
    return await getDocumentByIdWithClient(client, id, organizationId);
  } finally {
    client.release();
  }
};

export const updateScannerDocument = async (
  id: number,
  organizationId: string,
  updates: Partial<SaveScannerDocumentInput>,
): Promise<ScannerDocumentRecord> => {
  const client = await scannerDbPool.connect();

  try {
    await client.query('BEGIN');
    await getDocumentByIdWithClient(client, id, organizationId);

    const assignments: string[] = [];
    const values: unknown[] = [];

    const writableFields: Array<[keyof SaveScannerDocumentInput, string]> = [
      ['doc_type', 'doc_type'],
      ['document_number', 'document_number'],
      ['date', 'doc_date'],
      ['vendor_or_customer', 'vendor_or_customer'],
      ['gstin', 'gstin'],
      ['subtotal', 'subtotal'],
      ['tax_amount', 'tax_amount'],
      ['discount', 'discount'],
      ['total_amount', 'total_amount'],
      ['currency', 'currency'],
      ['payment_mode', 'payment_mode'],
      ['notes', 'notes'],
      ['email', 'email'],
      ['phone', 'phone'],
      ['ocr_confidence', 'ocr_confidence'],
      ['raw_ocr_text', 'raw_ocr_text'],
    ];

    for (const [field, column] of writableFields) {
      if (field in updates) {
        values.push(updates[field] ?? null);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length > 0) {
      values.push(id, organizationId);
      await client.query(
        `
          UPDATE ${DOCUMENT_TABLE}
          SET ${assignments.join(', ')}
          WHERE id = $${values.length - 1}
            AND organization_id = $${values.length}
        `,
        values,
      );
    }

    if (updates.line_items) {
      await client.query(`DELETE FROM ${LINE_ITEMS_TABLE} WHERE document_id = $1`, [id]);
      await insertLineItems(client, id, updates.line_items);
    }

    await client.query('COMMIT');
    return await getDocumentByIdWithClient(client, id, organizationId);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError || error instanceof NotFoundError) {
      throw error;
    }

    throw new AppError('Failed to update scanned document. Please review the data and try again.');
  } finally {
    client.release();
  }
};

export const softDeleteScannerDocument = async (id: number, organizationId: string): Promise<void> => {
  const result = await scannerDbPool.query(
    `
      UPDATE ${DOCUMENT_TABLE}
      SET deleted_at = NOW()
      WHERE id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
      RETURNING id
    `,
    [id, organizationId],
  );

  if (result.rowCount === 0) {
    throw new NotFoundError('Document not found');
  }
};

export const getScannerDocumentsForExport = async (
  filters: ScannerExportFilters,
): Promise<ScannerDocumentRecord[]> => {
  const values: unknown[] = [filters.organizationId];
  const where = buildListWhereClause(filters, values);
  const result = await scannerDbPool.query(
    `
      SELECT
        d.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', li.id,
              'description', li.description,
              'quantity', li.quantity,
              'unit_price', li.unit_price,
              'amount', li.amount,
              'hsn_sac_code', li.hsn_sac_code,
              'tax_rate_percent', li.tax_rate_percent
            )
            ORDER BY li.id
          ) FILTER (WHERE li.id IS NOT NULL),
          '[]'::json
        ) AS line_items
      FROM ${DOCUMENT_TABLE} d
      LEFT JOIN ${LINE_ITEMS_TABLE} li ON li.document_id = d.id
      WHERE ${where.join(' AND ')}
      GROUP BY d.id
      ORDER BY d.doc_date DESC NULLS LAST, d.created_at DESC
    `,
    values,
  );

  return result.rows.map(mapDocument);
};

export const getScannerSummaryRows = async (
  filters: ScannerExportFilters,
): Promise<ScannerSummaryRow[]> => {
  const values: unknown[] = [filters.organizationId];
  const where = buildListWhereClause(filters, values);
  const result = await scannerDbPool.query(
    `
      SELECT
        to_char(date_trunc('month', d.doc_date), 'YYYY-MM') AS month,
        d.doc_type,
        COUNT(*)::int AS document_count,
        COALESCE(SUM(d.subtotal), 0)::numeric AS subtotal_total,
        COALESCE(SUM(d.tax_amount), 0)::numeric AS tax_total,
        COALESCE(SUM(d.discount), 0)::numeric AS discount_total,
        COALESCE(SUM(d.total_amount), 0)::numeric AS grand_total
      FROM ${DOCUMENT_TABLE} d
      WHERE ${where.join(' AND ')}
      GROUP BY 1, 2
      ORDER BY 1 DESC, 2 ASC
    `,
    values,
  );

  return result.rows.map((row) => ({
    month: row.month || 'Unknown',
    doc_type: row.doc_type,
    document_count: Number(row.document_count),
    subtotal_total: toNullableNumber(row.subtotal_total) || 0,
    tax_total: toNullableNumber(row.tax_total) || 0,
    discount_total: toNullableNumber(row.discount_total) || 0,
    grand_total: toNullableNumber(row.grand_total) || 0,
  }));
};

export const ensureScannerSchema = async (): Promise<void> => {
  const candidates = [
    path.resolve(process.cwd(), 'src/modules/scanner/db/schema.sql'),
    path.resolve(process.cwd(), 'backend/src/modules/scanner/db/schema.sql'),
  ];

  let schemaSql: string | null = null;

  for (const candidate of candidates) {
    try {
      schemaSql = await fs.readFile(candidate, 'utf8');
      break;
    } catch (error) {
      // Try the next candidate path.
    }
  }

  if (!schemaSql) {
    throw new AppError('Scanner schema.sql could not be found during startup.');
  }

  await scannerDbPool.query(schemaSql);
};
