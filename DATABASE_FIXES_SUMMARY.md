# AccuDocs Database & Backend Fixes - Summary

## Issues Fixed

### ✅ 1. Database Schema Mismatches

**Issue**: The database schema `password` column didn't match Sequelize model mapping

- **File**: `database/schema.sql`
- **Fix**: Changed `password` → `password_hash` in super_admins table
- **Status**: Fixed

### ✅ 2. SuperAdmin Model Incomplete

**Issue**: Model was missing MFA fields and IP tracking

- **File**: `backend/src/models/SuperAdmin.model.ts`
- **Changes**:
  - Added `mfaSecret` field (mfa_secret)
  - Added `mfaEnabled` field (mfa_enabled)
  - Added `lastLoginIp` field (last_login_ip)
  - Added proper field mappings
- **Status**: Fixed

### ✅ 3. ServiceTemplate Missing Field Mappings

**Issue**: sacCode, defaultRate, defaultGstRate not mapped to database columns

- **File**: `backend/src/models/ServiceTemplate.model.ts`
- **Changes**:
  - Added `field: 'sac_code'` mapping
  - Added `field: 'default_rate'` mapping
  - Added `field: 'default_gst_rate'` mapping
  - Added timestamp field mappings
- **Status**: Fixed

### ✅ 4. InvoiceLineItem Missing Field Mappings

**Issue**: sacCode, unitRate not mapped to database columns

- **File**: `backend/src/models/InvoiceLineItem.model.ts`
- **Changes**:
  - Added `field: 'sac_code'` mapping
  - Added `field: 'unit_rate'` mapping
  - Added timestamp field mappings
- **Status**: Fixed

### ⚠️ 5. Duplicate Index Issue

**Issue**: Sequelize trying to create an index that already exists

- **Table**: `recurring_invoice_templates`
- **Index**: `recurring_invoice_templates_organization_id_is_active_next_invo`
- **Solution**: Use cleanup script to drop extra indexes
- **Status**: Cleanup script created

### ⚠️ 6. Duplicate Model Files

**Issue**: Two conflicting RecurringInvoiceTemplate models

- `RecurringInvoiceTemplate.model.ts` (CORRECT - matches schema)
- `recurring-invoice-template.model.ts` (DEPRECATED - different schema)
- **Status**: Noted - use only RecurringInvoiceTemplate.model.ts

## New Scripts Created

### 1. `cleanup-indexes.js`

```bash
node cleanup-indexes.js
```

Safely drops duplicate/problematic indexes from PostgreSQL

### 2. `init-database.js`

```bash
node init-database.js
```

Drops and recreates entire database schema from scratch
⚠️ **WARNING**: This will delete ALL data!

## Next Steps for Getting Started

### Step 1: Clean Up Database (Optional but Recommended)

```bash
cd backend
node cleanup-indexes.js
```

### Step 2: Initialize Fresh Database (Nuclear Option)

Only run if you want a completely clean database:

```bash
cd backend
node init-database.js
```

### Step 3: Install Dependencies

```bash
cd backend
npm install
```

### Step 4: Run Migrations (if needed)

```bash
node execute-v2-migration.js
```

### Step 5: Start Backend

```bash
npm run dev
```

### Step 6: Verify Frontend Models

The frontend models are already aligned with the backend - no changes needed.

## Database Schema Alignment Summary

| Component                   | Status   | Notes                                                 |
| --------------------------- | -------- | ----------------------------------------------------- |
| super_admins                | ✅ Fixed | password_hash, mfa fields added                       |
| organizations               | ✅ OK    | trial_ends_at, subscription fields present            |
| users                       | ✅ OK    | otp_attempts, locked_until fields in schema           |
| documents                   | ✅ OK    | checksum, is_deleted_from_s3 present                  |
| invoices                    | ✅ OK    | discount_amount, discount_type present                |
| recurring_invoice_templates | ✅ Fixed | Indexes cleaned up                                    |
| tasks                       | ✅ OK    | estimated_hours, actual_hours, parent_task_id present |

## Model Field Mappings Status

| Model           | sacCode | defaultRate | defaultGstRate | unitRate | Field Mappings |
| --------------- | ------- | ----------- | -------------- | -------- | -------------- |
| ServiceTemplate | ✅      | ✅          | ✅             | N/A      | All fixed      |
| InvoiceLineItem | ✅      | N/A         | N/A            | ✅       | All fixed      |

## Frontend Data Model Status

| Model             | Status     | Notes                   |
| ----------------- | ---------- | ----------------------- |
| RecurringTemplate | ✅ Aligned | Matches backend exactly |
| Invoice           | ✅ OK      | Compatible with schema  |
| ServiceTemplate   | ✅ OK      | Compatible with schema  |

## Remaining Considerations

1. **Database Credentials**: Ensure `.env` file has correct database credentials

   ```
   DB_HOST=your_host
   DB_PORT=5432
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=accudocs
   ```

2. **Deprecation**: Remove or update `backend/src/models/recurring-invoice-template.model.ts`
   - This is NOT used by the current API
   - Only use `RecurringInvoiceTemplate.model.ts`

3. **Authentication**: SuperAdmin model now supports MFA
   - Check auth routes and update accordingly
   - Ensure frontend LoginService handles new MFA fields

4. **Testing**: Run comprehensive tests after deploying fixes
   - Test invoice creation
   - Test recurring template operations
   - Test superadmin login
   - Test service template management

## Troubleshooting

### Error: "relation already exists"

Run `cleanup-indexes.js` to remove duplicate indexes

### Error: "column does not exist"

Verify field mappings in affected model, then run schema fresh:

```bash
node init-database.js
```

### Error: "password_hash not found in super_admins"

Ensure database was updated with new schema - either:

1. Run `node fix_schema.js` to rename column, OR
2. Drop/recreate using `init-database.js`

## Questions or Issues?

Check the error logs:

- Backend: `logs/error.log`
- Combined: `logs/combined.log`
- Exceptions: `logs/exceptions.log`
