-- AccuDocs schema-only backup
-- Generated at: 2026-05-20T06:55:08.172Z
-- Database: postgres

-- Extensions
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sequences
-- audit_logs_accounting_sequence_seq: type=bigint, start=1, min=1, max=9223372036854775807, increment=1, cycle=NO

-- Tables and columns
-- Table: public."account_groups"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. parent_id uuid
--   4. code character varying NOT NULL
--   5. name character varying NOT NULL
--   6. group_type character varying NOT NULL
--   7. normal_balance character varying NOT NULL
--   8. report_section character varying
--   9. sort_order integer NOT NULL DEFAULT 0
--   10. system_defined boolean NOT NULL DEFAULT false
--   11. status character varying NOT NULL DEFAULT 'active'::character varying
--   12. deleted_at timestamp with time zone
--   13. created_at timestamp with time zone NOT NULL DEFAULT now()
--   14. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."accounting_event_outbox"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. source_module character varying NOT NULL
--   4. source_type character varying NOT NULL
--   5. source_id uuid NOT NULL
--   6. event_type character varying NOT NULL
--   7. idempotency_key character varying NOT NULL
--   8. payload jsonb NOT NULL DEFAULT '{}'::jsonb
--   9. status character varying NOT NULL DEFAULT 'pending'::character varying
--   10. attempts integer NOT NULL DEFAULT 0
--   11. last_error text
--   12. available_at timestamp with time zone NOT NULL DEFAULT now()
--   13. processed_at timestamp with time zone
--   14. created_at timestamp with time zone NOT NULL DEFAULT now()
--   15. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."accounting_posting_batches"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. batch_type character varying NOT NULL
--   4. status character varying NOT NULL DEFAULT 'queued'::character varying
--   5. source_count integer NOT NULL DEFAULT 0
--   6. posted_count integer NOT NULL DEFAULT 0
--   7. failed_count integer NOT NULL DEFAULT 0
--   8. requested_by uuid
--   9. started_at timestamp with time zone
--   10. completed_at timestamp with time zone
--   11. error_summary text
--   12. metadata jsonb NOT NULL DEFAULT '{}'::jsonb
--   13. created_at timestamp with time zone NOT NULL DEFAULT now()
--   14. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."accounting_settings"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. default_branch_id uuid
--   4. receivable_control_account_id uuid
--   5. payable_control_account_id uuid
--   6. sales_revenue_account_id uuid
--   7. purchase_account_id uuid
--   8. inventory_account_id uuid
--   9. cogs_account_id uuid
--   10. cash_account_id uuid
--   11. bank_charges_account_id uuid
--   12. rounding_account_id uuid
--   13. retained_earnings_account_id uuid
--   14. auto_post_sales_invoices boolean NOT NULL DEFAULT true
--   15. auto_post_purchase_invoices boolean NOT NULL DEFAULT true
--   16. auto_post_payments boolean NOT NULL DEFAULT true
--   17. require_approval_over_amount numeric
--   18. base_currency_code character NOT NULL DEFAULT 'INR'::bpchar
--   19. settings jsonb NOT NULL DEFAULT '{}'::jsonb
--   20. created_at timestamp with time zone NOT NULL DEFAULT now()
--   21. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."accounts"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. account_group_id uuid NOT NULL
--   4. parent_account_id uuid
--   5. branch_id uuid
--   6. cost_center_id uuid
--   7. account_code character varying NOT NULL
--   8. name character varying NOT NULL
--   9. account_type character varying NOT NULL
--   10. sub_type character varying
--   11. normal_balance character varying NOT NULL
--   12. control_type character varying
--   13. currency_code character NOT NULL DEFAULT 'INR'::bpchar
--   14. is_control_account boolean NOT NULL DEFAULT false
--   15. allow_manual_posting boolean NOT NULL DEFAULT true
--   16. opening_balance numeric NOT NULL DEFAULT 0
--   17. opening_balance_type character varying NOT NULL DEFAULT 'debit'::character varying
--   18. opening_balance_date date
--   19. current_balance numeric NOT NULL DEFAULT 0
--   20. gst_applicable boolean NOT NULL DEFAULT false
--   21. hsn_sac_code character varying
--   22. status character varying NOT NULL DEFAULT 'active'::character varying
--   23. system_defined boolean NOT NULL DEFAULT false
--   24. metadata jsonb NOT NULL DEFAULT '{}'::jsonb
--   25. deleted_at timestamp with time zone
--   26. created_by uuid
--   27. updated_by uuid
--   28. created_at timestamp with time zone NOT NULL DEFAULT now()
--   29. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."activity_log"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. client_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. user_id uuid
--   5. action character varying NOT NULL
--   6. entity_type character varying
--   7. entity_id uuid
--   8. details jsonb DEFAULT '{}'::jsonb
--   9. ip_address character varying
--   10. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."approval_requests"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. entity_type character varying NOT NULL
--   4. entity_id uuid NOT NULL
--   5. approval_level integer NOT NULL DEFAULT 1
--   6. status character varying NOT NULL DEFAULT 'pending'::character varying
--   7. requested_by uuid
--   8. requested_at timestamp with time zone NOT NULL DEFAULT now()
--   9. approver_user_id uuid
--   10. approved_at timestamp with time zone
--   11. rejected_at timestamp with time zone
--   12. comments text
--   13. metadata jsonb NOT NULL DEFAULT '{}'::jsonb
--   14. created_at timestamp with time zone NOT NULL DEFAULT now()
--   15. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."audit_logs"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid
--   3. user_id uuid
--   4. action character varying NOT NULL
--   5. entity_type character varying NOT NULL
--   6. entity_id uuid
--   7. description text NOT NULL
--   8. old_values jsonb
--   9. new_values jsonb
--   10. ip_address character varying
--   11. user_agent character varying
--   12. request_id character varying
--   13. created_at timestamp with time zone NOT NULL DEFAULT now()
--   14. super_admin_id uuid
--   15. accounting_sequence bigint DEFAULT nextval('audit_logs_accounting_sequence_seq'::regclass)
--   16. source_module character varying
--   17. fiscal_year_id uuid
--   18. branch_id uuid
--   19. voucher_id uuid
--   20. journal_entry_id uuid
--   21. previous_hash character varying
--   22. record_hash character varying

-- Table: public."bank_accounts"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. branch_id uuid
--   4. account_id uuid NOT NULL
--   5. bank_name character varying NOT NULL
--   6. account_holder_name character varying
--   7. account_number_masked character varying NOT NULL
--   8. account_number_encrypted text
--   9. ifsc_code character varying
--   10. swift_code character varying
--   11. upi_id character varying
--   12. currency_code character NOT NULL DEFAULT 'INR'::bpchar
--   13. opening_balance numeric NOT NULL DEFAULT 0
--   14. opening_balance_date date
--   15. current_statement_balance numeric NOT NULL DEFAULT 0
--   16. is_default boolean NOT NULL DEFAULT false
--   17. status character varying NOT NULL DEFAULT 'active'::character varying
--   18. deleted_at timestamp with time zone
--   19. created_at timestamp with time zone NOT NULL DEFAULT now()
--   20. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."branches"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. branch_code character varying NOT NULL
--   4. name character varying NOT NULL
--   5. gstin character varying
--   6. state_code character NOT NULL
--   7. address text
--   8. is_head_office boolean NOT NULL DEFAULT false
--   9. status character varying NOT NULL DEFAULT 'active'::character varying
--   10. created_by uuid
--   11. updated_by uuid
--   12. deleted_at timestamp with time zone
--   13. created_at timestamp with time zone NOT NULL DEFAULT now()
--   14. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."checklist_templates"
--   1. id uuid NOT NULL
--   2. name character varying NOT NULL
--   3. service_type USER-DEFINED NOT NULL
--   4. description text
--   5. items jsonb NOT NULL DEFAULT '[]'::jsonb
--   6. is_default boolean NOT NULL DEFAULT false
--   7. created_by uuid
--   8. created_at timestamp with time zone NOT NULL
--   9. updated_at timestamp with time zone NOT NULL

-- Table: public."checklists"
--   1. id uuid NOT NULL
--   2. client_id uuid
--   3. template_id uuid
--   4. name character varying NOT NULL
--   5. financial_year character varying NOT NULL
--   6. service_type character varying NOT NULL
--   7. items jsonb NOT NULL DEFAULT '[]'::jsonb
--   8. progress double precision NOT NULL DEFAULT '0'::double precision
--   9. total_items integer NOT NULL DEFAULT 0
--   10. received_items integer NOT NULL DEFAULT 0
--   11. status USER-DEFINED NOT NULL DEFAULT 'active'::enum_checklists_status
--   12. due_date date
--   13. completed_at timestamp with time zone
--   14. notes text
--   15. created_by uuid
--   16. created_at timestamp with time zone NOT NULL
--   17. updated_at timestamp with time zone NOT NULL
--   18. deleted_at timestamp with time zone

-- Table: public."client_access_tokens"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. user_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. token_hash character varying NOT NULL
--   5. token_type character varying NOT NULL DEFAULT 'bearer'::character varying
--   6. device_name character varying
--   7. device_type character varying
--   8. ip_address character varying
--   9. user_agent character varying
--   10. last_used_at timestamp with time zone
--   11. expires_at timestamp with time zone NOT NULL
--   12. is_revoked boolean NOT NULL DEFAULT false
--   13. revoked_at timestamp with time zone
--   14. revoked_reason character varying
--   15. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."client_deadlines"
--   1. id uuid NOT NULL
--   2. client_id uuid
--   3. deadline_id uuid
--   4. status USER-DEFINED NOT NULL DEFAULT 'pending'::enum_client_deadlines_status
--   5. filed_date date
--   6. notes text
--   7. created_at timestamp with time zone NOT NULL
--   8. updated_at timestamp with time zone NOT NULL

-- Table: public."client_expenses"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. client_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. expense_date date NOT NULL
--   5. category character varying NOT NULL DEFAULT 'general'::character varying
--   6. description text NOT NULL
--   7. vendor_name character varying
--   8. amount numeric NOT NULL DEFAULT 0
--   9. payment_mode character varying DEFAULT 'cash'::character varying
--   10. reference_no character varying
--   11. month integer NOT NULL
--   12. financial_year character varying NOT NULL
--   13. created_at timestamp with time zone NOT NULL DEFAULT now()
--   14. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   15. gst_applicable boolean DEFAULT false
--   16. gst_rate numeric DEFAULT 0
--   17. gst_amount numeric DEFAULT 0
--   18. itc_allowed boolean DEFAULT false
--   19. itc_blocked_reason character varying
--   20. status character varying DEFAULT 'draft'::character varying
--   21. notes text

-- Table: public."client_gst_summary"
--   1. client_id uuid
--   2. organization_id uuid
--   3. month integer
--   4. financial_year character varying
--   5. total_sales numeric
--   6. output_gst numeric
--   7. output_cgst numeric
--   8. output_sgst numeric
--   9. output_igst numeric
--   10. b2b_count bigint
--   11. b2b_value numeric
--   12. b2c_count bigint
--   13. b2c_value numeric
--   14. export_count bigint
--   15. export_value numeric
--   16. total_purchases numeric
--   17. input_gst numeric
--   18. input_cgst numeric
--   19. input_sgst numeric
--   20. input_igst numeric
--   21. itc_eligible_count bigint
--   22. itc_eligible_value numeric
--   23. itc_blocked_count bigint
--   24. itc_blocked_value numeric
--   25. rcm_count bigint
--   26. rcm_value numeric
--   27. gst_payable numeric

-- Table: public."client_item_pricing"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. client_id uuid NOT NULL
--   3. item_id uuid NOT NULL
--   4. variant_id uuid
--   5. custom_selling_price numeric NOT NULL
--   6. discount_pct numeric NOT NULL DEFAULT 0
--   7. valid_from date
--   8. valid_to date
--   9. created_at timestamp with time zone NOT NULL DEFAULT now()
--   10. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."client_purchases"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. client_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. bill_no character varying NOT NULL
--   5. bill_date date NOT NULL
--   6. vendor_name character varying NOT NULL
--   7. description text
--   8. hsn_sac_code character varying
--   9. quantity numeric DEFAULT 1
--   10. rate numeric
--   11. base_amount numeric NOT NULL DEFAULT 0
--   12. gst_rate numeric NOT NULL DEFAULT 18.00
--   13. gst_amount numeric
--   14. total_amount numeric
--   15. month integer NOT NULL
--   16. financial_year character varying NOT NULL
--   17. created_at timestamp with time zone NOT NULL DEFAULT now()
--   18. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   19. gstin character varying
--   20. purchase_type character varying DEFAULT 'local'::character varying
--   21. cgst_amount numeric DEFAULT 0
--   22. sgst_amount numeric DEFAULT 0
--   23. igst_amount numeric DEFAULT 0
--   24. itc_eligible boolean DEFAULT true
--   25. rcm_applicable boolean DEFAULT false
--   26. is_capital_goods boolean DEFAULT false
--   27. status character varying DEFAULT 'draft'::character varying
--   28. notes text

-- Table: public."client_risk_scores"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid NOT NULL
--   4. score smallint NOT NULL
--   5. ltv_segment character varying NOT NULL DEFAULT 'LOW'::character varying
--   6. payment_history_score smallint NOT NULL DEFAULT 0
--   7. overdue_frequency_score smallint NOT NULL DEFAULT 0
--   8. consistency_score smallint NOT NULL DEFAULT 0
--   9. credit_utilization_score smallint NOT NULL DEFAULT 0
--   10. avg_days_to_pay numeric
--   11. overdue_rate_pct numeric
--   12. current_outstanding numeric
--   13. credit_limit_used numeric
--   14. two_year_revenue numeric
--   15. projected_three_year_revenue numeric
--   16. calculated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."client_sales"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. client_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. invoice_no character varying NOT NULL
--   5. invoice_date date NOT NULL
--   6. customer_name character varying NOT NULL
--   7. description text
--   8. hsn_sac_code character varying
--   9. quantity numeric DEFAULT 1
--   10. rate numeric
--   11. base_amount numeric NOT NULL DEFAULT 0
--   12. gst_rate numeric NOT NULL DEFAULT 18.00
--   13. gst_amount numeric
--   14. total_amount numeric
--   15. month integer NOT NULL
--   16. financial_year character varying NOT NULL
--   17. created_at timestamp with time zone NOT NULL DEFAULT now()
--   18. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   19. gstin character varying
--   20. invoice_type character varying DEFAULT 'B2B'::character varying
--   21. place_of_supply character
--   22. cgst_amount numeric DEFAULT 0
--   23. sgst_amount numeric DEFAULT 0
--   24. igst_amount numeric DEFAULT 0
--   25. cess_amount numeric DEFAULT 0
--   26. is_nil_rated boolean DEFAULT false
--   27. is_advance boolean DEFAULT false
--   28. status character varying DEFAULT 'draft'::character varying
--   29. notes text

-- Table: public."clients"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. user_id uuid NOT NULL
--   4. code character varying NOT NULL
--   5. name character varying NOT NULL
--   6. gstin character varying
--   7. pan character varying
--   8. mobile character varying
--   9. email character varying
--   10. address text
--   11. state_code character NOT NULL DEFAULT '24'::bpchar
--   12. city character varying
--   13. pincode character varying
--   14. credit_limit numeric NOT NULL DEFAULT 0.00
--   15. entity_type character varying NOT NULL DEFAULT 'individual'::character varying
--   16. notes text
--   17. metadata jsonb NOT NULL DEFAULT '{}'::jsonb
--   18. is_active boolean NOT NULL DEFAULT true
--   19. deleted_at timestamp with time zone
--   20. created_at timestamp with time zone NOT NULL DEFAULT now()
--   21. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   22. location character varying
--   23. business_name character varying
--   24. industry_sector character varying
--   25. incorporation_date date
--   26. gst_status character varying
--   27. financial_year_end character varying
--   28. accounting_method character varying
--   29. estimated_turnover character varying
--   30. employee_count character varying
--   31. identity_proof_url character varying
--   32. business_registration_url character varying
--   33. tax_card_copy_url character varying
--   34. previous_year_return_url character varying
--   35. terms_accepted boolean NOT NULL DEFAULT false
--   36. billing_type character varying NOT NULL DEFAULT 'fixed'::character varying
--   37. credit_days integer NOT NULL DEFAULT 30
--   38. tds_applicable boolean NOT NULL DEFAULT true

-- Table: public."compliance_deadlines"
--   1. id uuid NOT NULL
--   2. type USER-DEFINED NOT NULL
--   3. title character varying NOT NULL
--   4. due_date date NOT NULL
--   5. recurring boolean NOT NULL DEFAULT false
--   6. recurring_pattern character varying
--   7. description text
--   8. is_seeded boolean NOT NULL DEFAULT false
--   9. created_at timestamp with time zone NOT NULL
--   10. updated_at timestamp with time zone NOT NULL

-- Table: public."cost_centers"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. parent_id uuid
--   4. code character varying NOT NULL
--   5. name character varying NOT NULL
--   6. center_type character varying NOT NULL DEFAULT 'department'::character varying
--   7. manager_user_id uuid
--   8. status character varying NOT NULL DEFAULT 'active'::character varying
--   9. metadata jsonb NOT NULL DEFAULT '{}'::jsonb
--   10. deleted_at timestamp with time zone
--   11. created_at timestamp with time zone NOT NULL DEFAULT now()
--   12. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."customers"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid NOT NULL
--   4. account_id uuid NOT NULL
--   5. customer_code character varying NOT NULL
--   6. display_name character varying NOT NULL
--   7. gstin character varying
--   8. pan character varying
--   9. credit_limit numeric NOT NULL DEFAULT 0
--   10. credit_days integer NOT NULL DEFAULT 0
--   11. opening_balance numeric NOT NULL DEFAULT 0
--   12. opening_balance_type character varying NOT NULL DEFAULT 'debit'::character varying
--   13. status character varying NOT NULL DEFAULT 'active'::character varying
--   14. metadata jsonb NOT NULL DEFAULT '{}'::jsonb
--   15. deleted_at timestamp with time zone
--   16. created_at timestamp with time zone NOT NULL DEFAULT now()
--   17. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."data_uploads"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. client_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. uploaded_by uuid
--   5. upload_type character varying NOT NULL
--   6. file_name character varying NOT NULL
--   7. rows_imported integer NOT NULL DEFAULT 0
--   8. rows_failed integer NOT NULL DEFAULT 0
--   9. error_log jsonb DEFAULT '[]'::jsonb
--   10. status character varying NOT NULL DEFAULT 'completed'::character varying
--   11. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."document_versions"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. document_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. client_id uuid NOT NULL
--   5. version_number smallint NOT NULL
--   6. s3_key character varying NOT NULL
--   7. file_name character varying NOT NULL
--   8. original_name character varying NOT NULL
--   9. mime_type character varying NOT NULL
--   10. size_bytes bigint NOT NULL
--   11. checksum character varying
--   12. change_summary text
--   13. uploaded_by uuid NOT NULL
--   14. uploaded_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."documents"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid NOT NULL
--   4. year_id uuid
--   5. folder_id uuid
--   6. uploaded_by uuid NOT NULL
--   7. file_name character varying NOT NULL
--   8. original_name character varying NOT NULL
--   9. s3_key character varying NOT NULL
--   10. mime_type character varying NOT NULL
--   11. size_bytes bigint NOT NULL
--   12. checksum character varying
--   13. is_deleted_from_s3 boolean NOT NULL DEFAULT false
--   14. version smallint NOT NULL DEFAULT 1
--   15. parent_document_id uuid
--   16. tags jsonb NOT NULL DEFAULT '[]'::jsonb
--   17. description text
--   18. is_shared_with_client boolean NOT NULL DEFAULT false
--   19. shared_at timestamp with time zone
--   20. whatsapp_sent_at timestamp with time zone
--   21. whatsapp_sent_by uuid
--   22. download_count integer NOT NULL DEFAULT 0
--   23. last_accessed_at timestamp with time zone
--   24. deleted_at timestamp with time zone
--   25. created_at timestamp with time zone NOT NULL DEFAULT now()
--   26. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."financial_close_runs"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. fiscal_year_id uuid NOT NULL
--   4. branch_id uuid
--   5. status character varying NOT NULL DEFAULT 'draft'::character varying
--   6. checklist jsonb NOT NULL DEFAULT '{}'::jsonb
--   7. trial_balance_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
--   8. pnl_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
--   9. balance_sheet_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
--   10. retained_earnings_entry_id uuid
--   11. started_by uuid
--   12. started_at timestamp with time zone
--   13. closed_by uuid
--   14. closed_at timestamp with time zone
--   15. created_at timestamp with time zone NOT NULL DEFAULT now()
--   16. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."firm_billing_expenses"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. matter_id uuid NOT NULL
--   4. expense_head character varying NOT NULL
--   5. amount numeric NOT NULL
--   6. receipt_upload text
--   7. is_billable boolean NOT NULL DEFAULT true
--   8. expense_date date NOT NULL DEFAULT CURRENT_DATE
--   9. status character varying NOT NULL DEFAULT 'pending'::character varying
--   10. approved_by uuid
--   11. approved_at timestamp without time zone
--   12. billed_invoice_id uuid
--   13. created_by uuid
--   14. created_at timestamp without time zone NOT NULL DEFAULT now()
--   15. updated_at timestamp without time zone NOT NULL DEFAULT now()

-- Table: public."firm_billing_matters"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid NOT NULL
--   4. matter_name character varying NOT NULL
--   5. service_type character varying NOT NULL
--   6. assigned_partner uuid
--   7. assigned_staff ARRAY NOT NULL DEFAULT '{}'::uuid[]
--   8. start_date date
--   9. end_date date
--   10. fixed_fee numeric NOT NULL DEFAULT 0
--   11. status character varying NOT NULL DEFAULT 'active'::character varying
--   12. created_by uuid
--   13. created_at timestamp without time zone NOT NULL DEFAULT now()
--   14. updated_at timestamp without time zone NOT NULL DEFAULT now()
--   15. deleted_at timestamp without time zone

-- Table: public."firm_billing_rate_cards"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. designation character varying NOT NULL
--   4. hourly_rate numeric NOT NULL
--   5. effective_from date NOT NULL DEFAULT CURRENT_DATE
--   6. is_active boolean NOT NULL DEFAULT true
--   7. created_at timestamp without time zone NOT NULL DEFAULT now()
--   8. updated_at timestamp without time zone NOT NULL DEFAULT now()

-- Table: public."firm_billing_reminder_templates"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid
--   4. reminder_stage character varying NOT NULL
--   5. channel character varying NOT NULL DEFAULT 'email'::character varying
--   6. subject character varying NOT NULL
--   7. body text NOT NULL
--   8. escalation_role character varying NOT NULL DEFAULT 'staff'::character varying
--   9. is_active boolean NOT NULL DEFAULT true
--   10. created_at timestamp without time zone NOT NULL DEFAULT now()
--   11. updated_at timestamp without time zone NOT NULL DEFAULT now()

-- Table: public."firm_billing_retainers"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid NOT NULL
--   4. matter_id uuid
--   5. amount numeric NOT NULL
--   6. billing_day integer NOT NULL DEFAULT 1
--   7. billing_date date
--   8. services_included ARRAY NOT NULL DEFAULT '{}'::text[]
--   9. retainer_used numeric NOT NULL DEFAULT 0
--   10. retainer_balance numeric NOT NULL DEFAULT 0
--   11. carry_forward boolean NOT NULL DEFAULT true
--   12. renewal_date date
--   13. is_active boolean NOT NULL DEFAULT true
--   14. last_invoice_id uuid
--   15. created_at timestamp without time zone NOT NULL DEFAULT now()
--   16. updated_at timestamp without time zone NOT NULL DEFAULT now()

-- Table: public."firm_billing_tds_records"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. invoice_id uuid
--   4. client_id uuid NOT NULL
--   5. tds_amount numeric NOT NULL
--   6. deduction_quarter character varying NOT NULL
--   7. pan_of_deductor character varying
--   8. deduction_date date
--   9. status character varying NOT NULL DEFAULT 'declared'::character varying
--   10. matched_26as boolean NOT NULL DEFAULT false
--   11. matched_at timestamp without time zone
--   12. created_at timestamp without time zone NOT NULL DEFAULT now()
--   13. updated_at timestamp without time zone NOT NULL DEFAULT now()

-- Table: public."firm_billing_timesheets"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. matter_id uuid NOT NULL
--   4. staff_id uuid NOT NULL
--   5. work_date date NOT NULL
--   6. task_description text NOT NULL
--   7. hours numeric NOT NULL
--   8. is_billable boolean NOT NULL DEFAULT true
--   9. hourly_rate numeric NOT NULL DEFAULT 0
--   10. status character varying NOT NULL DEFAULT 'pending'::character varying
--   11. approved_by uuid
--   12. approved_at timestamp without time zone
--   13. billed_invoice_id uuid
--   14. created_at timestamp without time zone NOT NULL DEFAULT now()
--   15. updated_at timestamp without time zone NOT NULL DEFAULT now()

-- Table: public."fiscal_years"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. name character varying NOT NULL
--   4. start_date date NOT NULL
--   5. end_date date NOT NULL
--   6. status character varying NOT NULL DEFAULT 'open'::character varying
--   7. allow_backdated_until date
--   8. closed_at timestamp with time zone
--   9. closed_by uuid
--   10. retained_earnings_entry_id uuid
--   11. closing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
--   12. deleted_at timestamp with time zone
--   13. created_by uuid
--   14. created_at timestamp with time zone NOT NULL DEFAULT now()
--   15. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."folders"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid NOT NULL
--   4. year_id uuid
--   5. parent_folder_id uuid
--   6. name character varying NOT NULL
--   7. slug character varying NOT NULL
--   8. category character varying
--   9. is_system boolean NOT NULL DEFAULT false
--   10. sort_order smallint NOT NULL DEFAULT 0
--   11. deleted_at timestamp with time zone
--   12. created_at timestamp with time zone NOT NULL DEFAULT now()
--   13. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."gst_returns"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. client_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. return_type character varying NOT NULL
--   5. period_month integer NOT NULL
--   6. period_year integer NOT NULL
--   7. financial_year character varying NOT NULL
--   8. status character varying NOT NULL DEFAULT 'pending'::character varying
--   9. due_date date
--   10. filed_date date
--   11. filed_by uuid
--   12. arn character varying
--   13. json_data jsonb DEFAULT '{}'::jsonb
--   14. pdf_url character varying
--   15. remarks text
--   16. created_at timestamp with time zone NOT NULL DEFAULT now()
--   17. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."gstr2a_reconciliations"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid NOT NULL
--   4. period character varying NOT NULL
--   5. matched jsonb NOT NULL DEFAULT '[]'::jsonb
--   6. mismatched jsonb NOT NULL DEFAULT '[]'::jsonb
--   7. missing_in_books jsonb NOT NULL DEFAULT '[]'::jsonb
--   8. missing_in_2a jsonb NOT NULL DEFAULT '[]'::jsonb
--   9. total_matched integer NOT NULL DEFAULT 0
--   10. total_mismatched integer NOT NULL DEFAULT 0
--   11. total_missing_books integer NOT NULL DEFAULT 0
--   12. total_missing_2a integer NOT NULL DEFAULT 0
--   13. reconciled_at timestamp with time zone NOT NULL DEFAULT now()
--   14. created_by uuid
--   15. created_at timestamp with time zone NOT NULL DEFAULT now()
--   16. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."hsn_sac_codes"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. code character varying NOT NULL
--   3. description text NOT NULL
--   4. gst_rate numeric NOT NULL DEFAULT 0
--   5. type character NOT NULL
--   6. chapter character varying
--   7. is_active boolean NOT NULL DEFAULT true
--   8. created_at timestamp with time zone NOT NULL DEFAULT now()
--   9. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."inventory_number_sequences"
--   1. org_id uuid NOT NULL
--   2. sequence_type character varying NOT NULL
--   3. current_value integer NOT NULL DEFAULT 0
--   4. created_at timestamp with time zone DEFAULT now()
--   5. updated_at timestamp with time zone DEFAULT now()

-- Table: public."inventory_transactions"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. branch_id uuid
--   4. fiscal_year_id uuid
--   5. warehouse_id uuid NOT NULL
--   6. item_id uuid NOT NULL
--   7. variant_id uuid
--   8. stock_ledger_id uuid
--   9. transaction_type character varying NOT NULL
--   10. transaction_date date NOT NULL
--   11. quantity numeric NOT NULL
--   12. unit_cost numeric NOT NULL DEFAULT 0
--   13. total_value numeric NOT NULL DEFAULT 0
--   14. valuation_method character varying NOT NULL DEFAULT 'weighted_avg'::character varying
--   15. source_module character varying NOT NULL
--   16. source_type character varying NOT NULL
--   17. source_id uuid
--   18. voucher_id uuid
--   19. journal_entry_id uuid
--   20. status character varying NOT NULL DEFAULT 'posted'::character varying
--   21. deleted_at timestamp with time zone
--   22. created_by uuid
--   23. created_at timestamp with time zone NOT NULL DEFAULT now()
--   24. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."invoice_line_items"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. invoice_id uuid NOT NULL
--   3. service_template_id uuid
--   4. description character varying NOT NULL
--   5. sac_code character varying NOT NULL
--   6. quantity numeric NOT NULL DEFAULT 1.00
--   7. unit_rate numeric NOT NULL
--   8. amount numeric
--   9. sort_order smallint NOT NULL DEFAULT 0
--   10. created_at timestamp with time zone NOT NULL DEFAULT now()
--   11. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   12. item_id uuid
--   13. variant_id uuid
--   14. warehouse_id uuid
--   15. batch_no character varying
--   16. track_inventory boolean NOT NULL DEFAULT false

-- Table: public."invoice_number_sequences"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. financial_year character varying NOT NULL
--   4. last_sequence integer NOT NULL DEFAULT 0
--   5. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."invoice_templates"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. name character varying NOT NULL
--   3. html_content text NOT NULL
--   4. thumbnail_url character varying
--   5. is_default boolean NOT NULL DEFAULT false
--   6. org_id uuid
--   7. is_system boolean NOT NULL DEFAULT false
--   8. created_at timestamp with time zone NOT NULL DEFAULT now()
--   9. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."invoices"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid NOT NULL
--   4. recurring_template_id uuid
--   5. invoice_number character varying NOT NULL
--   6. status character varying NOT NULL DEFAULT 'draft'::character varying
--   7. invoice_date date NOT NULL
--   8. due_date date NOT NULL
--   9. issued_at timestamp with time zone
--   10. paid_at timestamp with time zone
--   11. cancelled_at timestamp with time zone
--   12. gst_type character varying NOT NULL DEFAULT 'CGST_SGST'::character varying
--   13. place_of_supply character NOT NULL DEFAULT '24'::bpchar
--   14. client_gstin character varying
--   15. firm_gstin character varying
--   16. discount_type character varying
--   17. discount_value numeric NOT NULL DEFAULT 0.00
--   18. discount_amount numeric NOT NULL DEFAULT 0.00
--   19. subtotal numeric NOT NULL DEFAULT 0.00
--   20. cgst_amount numeric NOT NULL DEFAULT 0.00
--   21. sgst_amount numeric NOT NULL DEFAULT 0.00
--   22. igst_amount numeric NOT NULL DEFAULT 0.00
--   23. round_off numeric NOT NULL DEFAULT 0.00
--   24. total_amount numeric NOT NULL DEFAULT 0.00
--   25. amount_paid numeric NOT NULL DEFAULT 0.00
--   26. balance_due numeric
--   27. notes text
--   28. cancel_reason text
--   29. internal_notes text
--   30. pdf_s3_key character varying
--   31. pdf_generated_at timestamp with time zone
--   32. whatsapp_sent_at timestamp with time zone
--   33. whatsapp_sent_by uuid
--   34. email_sent_at timestamp with time zone
--   35. created_by uuid NOT NULL
--   36. issued_by uuid
--   37. cancelled_by uuid
--   38. deleted_at timestamp with time zone
--   39. created_at timestamp with time zone NOT NULL DEFAULT now()
--   40. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   41. invoice_type character varying NOT NULL DEFAULT 'tax_invoice'::character varying
--   42. payment_link_token uuid
--   43. payment_link_expires_at timestamp with time zone
--   44. expiry_date date
--   45. currency character varying NOT NULL DEFAULT 'INR'::character varying
--   46. exchange_rate numeric NOT NULL DEFAULT 1.000000
--   47. receiver_name character varying
--   48. receiver_address text
--   49. matter_id uuid
--   50. billing_type character varying NOT NULL DEFAULT 'fixed'::character varying
--   51. taxable_amount numeric NOT NULL DEFAULT 0
--   52. tds_amount numeric NOT NULL DEFAULT 0
--   53. net_receivable numeric NOT NULL DEFAULT 0
--   54. amount_in_words text
--   55. irn character varying
--   56. qr_payload text
--   57. party_role character varying NOT NULL DEFAULT 'customer'::character varying
--   58. branch_id uuid
--   59. cost_center_id uuid
--   60. fiscal_year_id uuid
--   61. voucher_id uuid
--   62. journal_entry_id uuid
--   63. posting_status character varying NOT NULL DEFAULT 'not_posted'::character varying
--   64. revenue_recognition_status character varying NOT NULL DEFAULT 'recognized'::character varying
--   65. inventory_posting_status character varying NOT NULL DEFAULT 'not_applicable'::character varying
--   66. approval_status character varying NOT NULL DEFAULT 'not_required'::character varying
--   67. approved_by uuid
--   68. approved_at timestamp with time zone

-- Table: public."itc_ledger"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid NOT NULL
--   4. period character varying NOT NULL
--   5. igst_claimed numeric NOT NULL DEFAULT 0
--   6. cgst_claimed numeric NOT NULL DEFAULT 0
--   7. sgst_claimed numeric NOT NULL DEFAULT 0
--   8. eligible_itc numeric NOT NULL DEFAULT 0
--   9. ineligible_itc numeric NOT NULL DEFAULT 0
--   10. reversed_itc numeric NOT NULL DEFAULT 0
--   11. source character varying NOT NULL DEFAULT 'manual'::character varying
--   12. status character varying NOT NULL DEFAULT 'calculated'::character varying
--   13. notes text
--   14. created_at timestamp with time zone NOT NULL DEFAULT now()
--   15. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."item_categories"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. org_id uuid NOT NULL
--   3. name character varying NOT NULL
--   4. parent_id uuid
--   5. description text
--   6. is_active boolean NOT NULL DEFAULT true
--   7. code character varying
--   8. level smallint NOT NULL DEFAULT 1
--   9. path character varying
--   10. sort_order smallint DEFAULT 0
--   11. default_hsn character varying
--   12. default_gst_rate numeric
--   13. default_uom character varying
--   14. allow_items boolean DEFAULT true
--   15. created_at timestamp with time zone DEFAULT now()
--   16. updated_at timestamp with time zone DEFAULT now()

-- Table: public."item_variants"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. item_id uuid NOT NULL
--   3. variant_name character varying NOT NULL
--   4. sku_suffix character varying
--   5. barcode character varying
--   6. additional_price numeric NOT NULL DEFAULT 0
--   7. attributes jsonb NOT NULL DEFAULT '{}'::jsonb
--   8. is_active boolean NOT NULL DEFAULT true

-- Table: public."items"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. org_id uuid NOT NULL
--   3. name character varying NOT NULL
--   4. sku character varying
--   5. barcode character varying
--   6. hsn_sac_code character varying
--   7. item_type character varying NOT NULL DEFAULT 'goods'::character varying
--   8. unit_of_measure character varying NOT NULL DEFAULT 'PCS'::character varying
--   9. purchase_price numeric NOT NULL DEFAULT 0
--   10. selling_price numeric NOT NULL DEFAULT 0
--   11. mrp numeric
--   12. gst_rate numeric NOT NULL DEFAULT 18
--   13. cess_rate numeric NOT NULL DEFAULT 0
--   14. track_inventory boolean NOT NULL DEFAULT true
--   15. allow_negative_stock boolean NOT NULL DEFAULT false
--   16. reorder_point integer
--   17. reorder_qty integer
--   18. category_id uuid
--   19. is_active boolean NOT NULL DEFAULT true
--   20. description text
--   21. created_at timestamp with time zone NOT NULL DEFAULT now()
--   22. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."journal_entries"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. fiscal_year_id uuid NOT NULL
--   4. branch_id uuid
--   5. voucher_id uuid
--   6. entry_no character varying NOT NULL
--   7. entry_date date NOT NULL
--   8. posting_date date NOT NULL
--   9. source_module character varying NOT NULL
--   10. source_type character varying NOT NULL
--   11. source_id uuid
--   12. narration text
--   13. currency_code character NOT NULL DEFAULT 'INR'::bpchar
--   14. exchange_rate numeric NOT NULL DEFAULT 1
--   15. total_debit numeric NOT NULL DEFAULT 0
--   16. total_credit numeric NOT NULL DEFAULT 0
--   17. status character varying NOT NULL DEFAULT 'draft'::character varying
--   18. is_system_generated boolean NOT NULL DEFAULT true
--   19. idempotency_key character varying
--   20. auto_posting_batch_id uuid
--   21. lock_version integer NOT NULL DEFAULT 0
--   22. approved_by uuid
--   23. approved_at timestamp with time zone
--   24. posted_by uuid
--   25. posted_at timestamp with time zone
--   26. reversal_entry_id uuid
--   27. deleted_at timestamp with time zone
--   28. created_by uuid
--   29. created_at timestamp with time zone NOT NULL DEFAULT now()
--   30. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."journal_entry_lines"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. journal_entry_id uuid NOT NULL
--   4. line_no integer NOT NULL
--   5. account_id uuid NOT NULL
--   6. branch_id uuid
--   7. cost_center_id uuid
--   8. party_type character varying
--   9. party_id uuid
--   10. item_id uuid
--   11. tax_id uuid
--   12. debit_amount numeric NOT NULL DEFAULT 0
--   13. credit_amount numeric NOT NULL DEFAULT 0
--   14. currency_code character NOT NULL DEFAULT 'INR'::bpchar
--   15. exchange_rate numeric NOT NULL DEFAULT 1
--   16. base_debit_amount numeric NOT NULL DEFAULT 0
--   17. base_credit_amount numeric NOT NULL DEFAULT 0
--   18. description text
--   19. reference_type character varying
--   20. reference_id uuid
--   21. tax_rate numeric
--   22. gst_component character varying
--   23. hsn_sac_code character varying
--   24. quantity numeric
--   25. unit_rate numeric
--   26. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."ledger_balances"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. fiscal_year_id uuid NOT NULL
--   4. account_id uuid NOT NULL
--   5. branch_id uuid
--   6. cost_center_id uuid
--   7. period_month date NOT NULL
--   8. opening_debit numeric NOT NULL DEFAULT 0
--   9. opening_credit numeric NOT NULL DEFAULT 0
--   10. period_debit numeric NOT NULL DEFAULT 0
--   11. period_credit numeric NOT NULL DEFAULT 0
--   12. closing_debit numeric NOT NULL DEFAULT 0
--   13. closing_credit numeric NOT NULL DEFAULT 0
--   14. last_journal_entry_id uuid
--   15. is_closed boolean NOT NULL DEFAULT false
--   16. created_at timestamp with time zone NOT NULL DEFAULT now()
--   17. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."notifications"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. user_id uuid
--   4. type character varying NOT NULL
--   5. title character varying NOT NULL
--   6. message text NOT NULL
--   7. channel character varying NOT NULL DEFAULT 'in_app'::character varying
--   8. is_read boolean NOT NULL DEFAULT false
--   9. read_at timestamp with time zone
--   10. metadata jsonb NOT NULL DEFAULT '{}'::jsonb
--   11. sent_at timestamp with time zone
--   12. delivery_status character varying NOT NULL DEFAULT 'pending'::character varying
--   13. error_message text
--   14. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."organizations"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. name character varying NOT NULL
--   3. slug character varying NOT NULL
--   4. gstin character varying
--   5. pan character varying
--   6. address text
--   7. state_code character NOT NULL DEFAULT '24'::bpchar
--   8. phone character varying
--   9. email character varying
--   10. logo_s3_key character varying
--   11. bank_name character varying
--   12. bank_account_number character varying
--   13. bank_ifsc character varying
--   14. bank_branch character varying
--   15. udin character varying
--   16. subscription_plan character varying NOT NULL DEFAULT 'starter'::character varying
--   17. trial_ends_at timestamp with time zone
--   18. current_subscription_id uuid
--   19. is_active boolean NOT NULL DEFAULT true
--   20. settings jsonb NOT NULL DEFAULT '{}'::jsonb
--   21. deleted_at timestamp with time zone
--   22. created_at timestamp with time zone NOT NULL DEFAULT now()
--   23. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   24. turnover_above_5cr boolean NOT NULL DEFAULT false
--   25. eway_bill_username_enc text
--   26. eway_bill_password_enc text

-- Table: public."otps"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. mobile character varying NOT NULL
--   3. otp_hash character varying NOT NULL
--   4. purpose character varying NOT NULL DEFAULT 'login'::character varying
--   5. expires_at timestamp with time zone NOT NULL
--   6. attempts smallint NOT NULL DEFAULT 0
--   7. is_used boolean NOT NULL DEFAULT false
--   8. ip_address character varying
--   9. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."payment_allocations"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. payment_source character varying NOT NULL
--   4. payment_id uuid
--   5. party_type character varying NOT NULL
--   6. party_id uuid NOT NULL
--   7. source_document_type character varying NOT NULL
--   8. source_document_id uuid NOT NULL
--   9. allocated_amount numeric NOT NULL
--   10. allocation_date date NOT NULL DEFAULT CURRENT_DATE
--   11. journal_entry_id uuid
--   12. reversed_at timestamp with time zone
--   13. deleted_at timestamp with time zone
--   14. created_by uuid
--   15. created_at timestamp with time zone NOT NULL DEFAULT now()
--   16. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."payments"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. invoice_id uuid
--   4. client_id uuid NOT NULL
--   5. amount numeric NOT NULL
--   6. payment_date date NOT NULL
--   7. payment_mode character varying NOT NULL DEFAULT 'bank_transfer'::character varying
--   8. reference_number character varying
--   9. notes text
--   10. recorded_by uuid NOT NULL
--   11. deleted_at timestamp with time zone
--   12. created_at timestamp with time zone NOT NULL DEFAULT now()
--   13. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   14. receipt_no character varying
--   15. bank character varying
--   16. cheque_no character varying
--   17. presentment_date date
--   18. is_bounced boolean NOT NULL DEFAULT false
--   19. bounce_reason text
--   20. tds_deducted numeric NOT NULL DEFAULT 0
--   21. is_advance boolean NOT NULL DEFAULT false
--   22. branch_id uuid
--   23. bank_account_id uuid
--   24. voucher_id uuid
--   25. journal_entry_id uuid
--   26. reconciliation_status character varying NOT NULL DEFAULT 'unreconciled'::character varying
--   27. posting_status character varying NOT NULL DEFAULT 'not_posted'::character varying

-- Table: public."period_locks"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. fiscal_year_id uuid NOT NULL
--   4. branch_id uuid
--   5. lock_type character varying NOT NULL
--   6. period_start date NOT NULL
--   7. period_end date NOT NULL
--   8. reason text
--   9. locked_by uuid
--   10. locked_at timestamp with time zone NOT NULL DEFAULT now()
--   11. unlocked_by uuid
--   12. unlocked_at timestamp with time zone
--   13. status character varying NOT NULL DEFAULT 'active'::character varying
--   14. created_at timestamp with time zone NOT NULL DEFAULT now()
--   15. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."purchase_order_items"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. po_id uuid NOT NULL
--   3. item_id uuid NOT NULL
--   4. variant_id uuid
--   5. hsn_sac_code character varying
--   6. qty_ordered numeric NOT NULL DEFAULT 0
--   7. qty_received numeric NOT NULL DEFAULT 0
--   8. unit_price numeric NOT NULL DEFAULT 0
--   9. gst_rate numeric NOT NULL DEFAULT 18
--   10. gst_amount numeric NOT NULL DEFAULT 0
--   11. total numeric NOT NULL DEFAULT 0
--   12. batch_no character varying
--   13. expected_date date

-- Table: public."purchase_orders"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. org_id uuid NOT NULL
--   3. branch_id uuid
--   4. supplier_client_id uuid NOT NULL
--   5. po_number character varying NOT NULL
--   6. po_date date NOT NULL DEFAULT CURRENT_DATE
--   7. expected_delivery_date date
--   8. warehouse_id uuid NOT NULL
--   9. status character varying NOT NULL DEFAULT 'draft'::character varying
--   10. subtotal numeric NOT NULL DEFAULT 0
--   11. gst_amount numeric NOT NULL DEFAULT 0
--   12. total numeric NOT NULL DEFAULT 0
--   13. notes text
--   14. created_by uuid NOT NULL
--   15. created_at timestamp with time zone NOT NULL DEFAULT now()
--   16. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."purchases"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. branch_id uuid
--   4. cost_center_id uuid
--   5. fiscal_year_id uuid
--   6. vendor_id uuid NOT NULL
--   7. vendor_bill_id uuid
--   8. purchase_no character varying NOT NULL
--   9. supplier_invoice_no character varying
--   10. purchase_date date NOT NULL
--   11. due_date date
--   12. warehouse_id uuid
--   13. place_of_supply_state character
--   14. reverse_charge boolean NOT NULL DEFAULT false
--   15. subtotal numeric NOT NULL DEFAULT 0
--   16. discount_amount numeric NOT NULL DEFAULT 0
--   17. taxable_amount numeric NOT NULL DEFAULT 0
--   18. cgst_amount numeric NOT NULL DEFAULT 0
--   19. sgst_amount numeric NOT NULL DEFAULT 0
--   20. igst_amount numeric NOT NULL DEFAULT 0
--   21. cess_amount numeric NOT NULL DEFAULT 0
--   22. total_amount numeric NOT NULL DEFAULT 0
--   23. amount_paid numeric NOT NULL DEFAULT 0
--   24. balance_due numeric NOT NULL DEFAULT 0
--   25. status character varying NOT NULL DEFAULT 'draft'::character varying
--   26. approval_status character varying NOT NULL DEFAULT 'not_required'::character varying
--   27. posting_status character varying NOT NULL DEFAULT 'not_posted'::character varying
--   28. voucher_id uuid
--   29. journal_entry_id uuid
--   30. metadata jsonb NOT NULL DEFAULT '{}'::jsonb
--   31. deleted_at timestamp with time zone
--   32. created_by uuid
--   33. created_at timestamp with time zone NOT NULL DEFAULT now()
--   34. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."reconciliation"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. fiscal_year_id uuid
--   4. bank_account_id uuid NOT NULL
--   5. statement_period_start date NOT NULL
--   6. statement_period_end date NOT NULL
--   7. opening_statement_balance numeric NOT NULL DEFAULT 0
--   8. closing_statement_balance numeric NOT NULL DEFAULT 0
--   9. book_balance numeric NOT NULL DEFAULT 0
--   10. unreconciled_amount numeric NOT NULL DEFAULT 0
--   11. status character varying NOT NULL DEFAULT 'imported'::character varying
--   12. reconciled_by uuid
--   13. reconciled_at timestamp with time zone
--   14. locked_by uuid
--   15. locked_at timestamp with time zone
--   16. notes text
--   17. deleted_at timestamp with time zone
--   18. created_by uuid
--   19. created_at timestamp with time zone NOT NULL DEFAULT now()
--   20. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."reconciliation_lines"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. reconciliation_id uuid NOT NULL
--   4. statement_date date NOT NULL
--   5. value_date date
--   6. description text NOT NULL
--   7. reference_number character varying
--   8. debit_amount numeric NOT NULL DEFAULT 0
--   9. credit_amount numeric NOT NULL DEFAULT 0
--   10. balance_after numeric
--   11. match_status character varying NOT NULL DEFAULT 'unmatched'::character varying
--   12. matched_journal_entry_line_id uuid
--   13. matched_payment_id uuid
--   14. confidence_score numeric
--   15. matched_by uuid
--   16. matched_at timestamp with time zone
--   17. created_at timestamp with time zone NOT NULL DEFAULT now()
--   18. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."recurring_entries"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. branch_id uuid
--   4. cost_center_id uuid
--   5. template_name character varying NOT NULL
--   6. source_type character varying NOT NULL
--   7. schedule_type character varying NOT NULL
--   8. cron_expression character varying
--   9. start_date date NOT NULL
--   10. end_date date
--   11. next_run_date date NOT NULL
--   12. last_run_at timestamp with time zone
--   13. auto_post boolean NOT NULL DEFAULT false
--   14. approval_required boolean NOT NULL DEFAULT true
--   15. journal_template jsonb NOT NULL DEFAULT '{}'::jsonb
--   16. source_template jsonb NOT NULL DEFAULT '{}'::jsonb
--   17. status character varying NOT NULL DEFAULT 'active'::character varying
--   18. deleted_at timestamp with time zone
--   19. created_by uuid
--   20. created_at timestamp with time zone NOT NULL DEFAULT now()
--   21. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."recurring_invoice_templates"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid NOT NULL
--   4. name character varying NOT NULL
--   5. frequency character varying NOT NULL
--   6. next_run_date date NOT NULL
--   7. advance_notice_days smallint NOT NULL DEFAULT 5
--   8. is_active boolean NOT NULL DEFAULT true
--   9. auto_issue boolean NOT NULL DEFAULT false
--   10. line_items_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb
--   11. default_notes text
--   12. default_due_days smallint NOT NULL DEFAULT 30
--   13. total_generated integer NOT NULL DEFAULT 0
--   14. last_generated_at timestamp with time zone
--   15. deleted_at timestamp with time zone
--   16. created_at timestamp with time zone NOT NULL DEFAULT now()
--   17. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."revenue_forecasts"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. forecast_date date NOT NULL
--   4. period_days smallint NOT NULL
--   5. forecasted_amount numeric NOT NULL
--   6. confidence_score numeric NOT NULL
--   7. historical_component numeric NOT NULL DEFAULT 0.00
--   8. recurring_component numeric NOT NULL DEFAULT 0.00
--   9. outstanding_component numeric NOT NULL DEFAULT 0.00
--   10. calculation_inputs jsonb NOT NULL DEFAULT '{}'::jsonb
--   11. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."service_templates"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid
--   3. name character varying NOT NULL
--   4. description text
--   5. sac_code character varying NOT NULL
--   6. default_rate numeric NOT NULL DEFAULT 0.00
--   7. default_gst_rate numeric NOT NULL DEFAULT 18.00
--   8. is_system boolean NOT NULL DEFAULT false
--   9. is_active boolean NOT NULL DEFAULT true
--   10. sort_order smallint NOT NULL DEFAULT 0
--   11. deleted_at timestamp with time zone
--   12. created_at timestamp with time zone NOT NULL DEFAULT now()
--   13. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."staff_permissions"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. user_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. permission character varying NOT NULL
--   5. is_granted boolean NOT NULL DEFAULT true
--   6. granted_by uuid NOT NULL
--   7. notes text
--   8. expires_at timestamp with time zone
--   9. created_at timestamp with time zone NOT NULL DEFAULT now()
--   10. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."stock_ledger"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. org_id uuid NOT NULL
--   3. warehouse_id uuid NOT NULL
--   4. item_id uuid NOT NULL
--   5. variant_id uuid
--   6. transaction_type character varying NOT NULL
--   7. reference_type character varying
--   8. reference_id uuid
--   9. client_id uuid
--   10. batch_no character varying
--   11. serial_no character varying
--   12. qty_in numeric NOT NULL DEFAULT 0
--   13. qty_out numeric NOT NULL DEFAULT 0
--   14. rate numeric NOT NULL DEFAULT 0
--   15. valuation_method character varying NOT NULL DEFAULT 'weighted_avg'::character varying
--   16. running_balance numeric NOT NULL DEFAULT 0
--   17. transaction_date date NOT NULL DEFAULT CURRENT_DATE
--   18. notes text
--   19. created_by uuid NOT NULL
--   20. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."stock_summary"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. warehouse_id uuid NOT NULL
--   3. item_id uuid NOT NULL
--   4. variant_id uuid
--   5. batch_no character varying
--   6. qty_on_hand numeric NOT NULL DEFAULT 0
--   7. qty_reserved numeric NOT NULL DEFAULT 0
--   8. qty_available numeric
--   9. avg_cost numeric NOT NULL DEFAULT 0
--   10. last_purchase_rate numeric NOT NULL DEFAULT 0
--   11. last_updated timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."stock_transfer_items"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. transfer_id uuid NOT NULL
--   3. item_id uuid NOT NULL
--   4. variant_id uuid
--   5. batch_no character varying
--   6. serial_no character varying
--   7. qty_transferred numeric NOT NULL DEFAULT 0
--   8. qty_received numeric NOT NULL DEFAULT 0
--   9. unit_cost numeric NOT NULL DEFAULT 0

-- Table: public."stock_transfers"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. org_id uuid NOT NULL
--   3. transfer_no character varying NOT NULL
--   4. transfer_date date NOT NULL DEFAULT CURRENT_DATE
--   5. from_warehouse_id uuid NOT NULL
--   6. to_warehouse_id uuid NOT NULL
--   7. status character varying NOT NULL DEFAULT 'draft'::character varying
--   8. notes text
--   9. created_by uuid NOT NULL
--   10. created_at timestamp with time zone NOT NULL DEFAULT now()
--   11. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   12. client_id uuid

-- Table: public."stock_valuation"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. branch_id uuid
--   4. fiscal_year_id uuid
--   5. warehouse_id uuid NOT NULL
--   6. item_id uuid NOT NULL
--   7. variant_id uuid
--   8. batch_no character varying
--   9. valuation_date date NOT NULL
--   10. qty_on_hand numeric NOT NULL DEFAULT 0
--   11. avg_cost numeric NOT NULL DEFAULT 0
--   12. fifo_layers jsonb NOT NULL DEFAULT '[]'::jsonb
--   13. total_value numeric NOT NULL DEFAULT 0
--   14. source_inventory_transaction_id uuid
--   15. is_period_close_snapshot boolean NOT NULL DEFAULT false
--   16. created_at timestamp with time zone NOT NULL DEFAULT now()
--   17. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."subscriptions"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. plan character varying NOT NULL
--   4. status character varying NOT NULL DEFAULT 'active'::character varying
--   5. billing_cycle character varying NOT NULL DEFAULT 'monthly'::character varying
--   6. amount numeric NOT NULL DEFAULT 0.00
--   7. currency character NOT NULL DEFAULT 'INR'::bpchar
--   8. started_at timestamp with time zone NOT NULL DEFAULT now()
--   9. current_period_start timestamp with time zone NOT NULL DEFAULT now()
--   10. current_period_end timestamp with time zone NOT NULL
--   11. trial_end timestamp with time zone
--   12. cancelled_at timestamp with time zone
--   13. cancel_reason text
--   14. payment_gateway character varying
--   15. gateway_subscription_id character varying
--   16. gateway_customer_id character varying
--   17. last_payment_at timestamp with time zone
--   18. last_payment_amount numeric
--   19. next_billing_date date
--   20. max_clients integer NOT NULL DEFAULT 50
--   21. max_users integer NOT NULL DEFAULT 5
--   22. max_storage_gb integer NOT NULL DEFAULT 5
--   23. features jsonb NOT NULL DEFAULT '{}'::jsonb
--   24. metadata jsonb NOT NULL DEFAULT '{}'::jsonb
--   25. created_by uuid
--   26. created_at timestamp with time zone NOT NULL DEFAULT now()
--   27. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."super_admins"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. name character varying NOT NULL
--   3. email character varying NOT NULL
--   4. password_hash character varying NOT NULL
--   5. is_active boolean NOT NULL DEFAULT true
--   6. last_login_at timestamp with time zone
--   7. last_login_ip character varying
--   8. mfa_secret character varying
--   9. mfa_enabled boolean NOT NULL DEFAULT false
--   10. deleted_at timestamp with time zone
--   11. created_at timestamp with time zone NOT NULL DEFAULT now()
--   12. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   13. role character varying NOT NULL DEFAULT 'super_admin'::character varying

-- Table: public."task_activity_logs"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. task_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. action character varying NOT NULL
--   5. old_value jsonb
--   6. new_value jsonb
--   7. user_id uuid
--   8. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."task_attachments"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. task_id uuid NOT NULL
--   3. file_url text NOT NULL
--   4. file_name character varying
--   5. uploaded_by uuid NOT NULL
--   6. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."task_comments"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. task_id uuid NOT NULL
--   3. comment text NOT NULL
--   4. user_id uuid NOT NULL
--   5. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."tasks"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. client_id uuid
--   4. assigned_to uuid
--   5. created_by uuid NOT NULL
--   6. parent_task_id uuid
--   7. title character varying NOT NULL
--   8. description text
--   9. priority character varying NOT NULL DEFAULT 'medium'::character varying
--   10. status character varying NOT NULL DEFAULT 'todo'::character varying
--   11. due_date timestamp with time zone
--   12. estimated_hours numeric
--   13. actual_hours numeric
--   14. tags jsonb NOT NULL DEFAULT '[]'::jsonb
--   15. completed_at timestamp with time zone
--   16. related_invoice_id uuid
--   17. related_document_id uuid
--   18. deleted_at timestamp with time zone
--   19. created_at timestamp with time zone NOT NULL DEFAULT now()
--   20. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   21. start_date timestamp with time zone
--   22. task_type character varying
--   23. module_type character varying
--   24. module_id character varying
--   25. checklist jsonb NOT NULL DEFAULT '[]'::jsonb
--   26. attachments jsonb NOT NULL DEFAULT '[]'::jsonb

-- Table: public."taxes"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. name character varying NOT NULL
--   4. tax_type character varying NOT NULL
--   5. tax_component character varying NOT NULL
--   6. rate numeric NOT NULL DEFAULT 0
--   7. payable_account_id uuid
--   8. receivable_account_id uuid
--   9. effective_from date NOT NULL DEFAULT CURRENT_DATE
--   10. effective_to date
--   11. is_reverse_charge boolean NOT NULL DEFAULT false
--   12. is_active boolean NOT NULL DEFAULT true
--   13. deleted_at timestamp with time zone
--   14. created_at timestamp with time zone NOT NULL DEFAULT now()
--   15. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."users"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. name character varying NOT NULL
--   4. mobile character varying NOT NULL
--   5. email character varying
--   6. password character varying
--   7. role character varying NOT NULL DEFAULT 'client'::character varying
--   8. is_active boolean NOT NULL DEFAULT true
--   9. avatar_s3_key character varying
--   10. last_login_at timestamp with time zone
--   11. otp_attempts smallint NOT NULL DEFAULT 0
--   12. locked_until timestamp with time zone
--   13. preferences jsonb NOT NULL DEFAULT '{}'::jsonb
--   14. deleted_at timestamp with time zone
--   15. created_at timestamp with time zone NOT NULL DEFAULT now()
--   16. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   17. mfa_secret character varying
--   18. last_login timestamp with time zone

-- Table: public."v_billing_metrics"
--   1. organization_id uuid
--   2. total_invoices bigint
--   3. draft_count bigint
--   4. draft_value numeric
--   5. issued_count bigint
--   6. partially_paid_count bigint
--   7. overdue_count bigint
--   8. paid_count bigint
--   9. total_outstanding numeric
--   10. total_overdue numeric
--   11. collected_this_month numeric
--   12. billed_this_month numeric

-- Table: public."v_client_summary"
--   1. client_id uuid
--   2. organization_id uuid
--   3. client_code character varying
--   4. client_name character varying
--   5. gstin character varying
--   6. pan character varying
--   7. entity_type character varying
--   8. client_mobile character varying
--   9. is_active boolean
--   10. credit_limit numeric
--   11. year_count bigint
--   12. document_count bigint
--   13. invoice_count bigint
--   14. total_billed_paid numeric
--   15. total_outstanding numeric
--   16. latest_risk_score smallint
--   17. ltv_segment character varying
--   18. risk_calculated_at timestamp with time zone
--   19. created_at timestamp with time zone

-- Table: public."v_dashboard_summary"
--   1. organization_id uuid
--   2. organization_name character varying
--   3. total_clients bigint
--   4. active_clients bigint
--   5. total_documents bigint
--   6. total_invoices bigint
--   7. outstanding_amount numeric
--   8. overdue_amount numeric
--   9. collected_this_month numeric
--   10. draft_invoices bigint
--   11. open_tasks bigint
--   12. overdue_tasks bigint

-- Table: public."v_overdue_invoices"
--   1. invoice_id uuid
--   2. organization_id uuid
--   3. invoice_number character varying
--   4. due_date date
--   5. balance_due numeric
--   6. total_amount numeric
--   7. whatsapp_sent_at timestamp with time zone
--   8. days_overdue integer
--   9. client_id uuid
--   10. client_name character varying
--   11. client_gstin character varying
--   12. client_mobile character varying
--   13. ltv_segment character varying

-- Table: public."v_recurring_due_today"
--   1. template_id uuid
--   2. organization_id uuid
--   3. client_id uuid
--   4. template_name character varying
--   5. frequency character varying
--   6. next_run_date date
--   7. advance_notice_days smallint
--   8. auto_issue boolean
--   9. line_items_snapshot jsonb
--   10. default_notes text
--   11. default_due_days smallint
--   12. client_name character varying
--   13. client_mobile character varying
--   14. client_gstin character varying
--   15. client_state_code character

-- Table: public."v_subscription_status"
--   1. organization_id uuid
--   2. organization_name character varying
--   3. subscription_plan character varying
--   4. subscription_id uuid
--   5. plan character varying
--   6. subscription_status character varying
--   7. current_period_end timestamp with time zone
--   8. trial_end timestamp with time zone
--   9. time_until_expiry interval
--   10. health_status text
--   11. max_clients integer
--   12. max_users integer
--   13. max_storage_gb integer
--   14. current_client_count bigint
--   15. current_user_count bigint

-- Table: public."v_whatsapp_delivery_stats"
--   1. organization_id uuid
--   2. day timestamp with time zone
--   3. total_sent bigint
--   4. delivered bigint
--   5. read bigint
--   6. failed bigint
--   7. delivery_rate_pct numeric

-- Table: public."validation_errors"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. client_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. error_category character varying NOT NULL DEFAULT 'data'::character varying
--   5. error_type character varying NOT NULL
--   6. severity character varying NOT NULL DEFAULT 'warning'::character varying
--   7. message text NOT NULL
--   8. entity_type character varying NOT NULL
--   9. entity_id uuid NOT NULL
--   10. field_name character varying
--   11. is_resolved boolean NOT NULL DEFAULT false
--   12. resolved_by uuid
--   13. resolved_at timestamp with time zone
--   14. resolution_note text
--   15. financial_year character varying NOT NULL
--   16. month integer
--   17. created_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."vendor_bills"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. vendor_id uuid NOT NULL
--   4. purchase_order_id uuid
--   5. bill_number character varying NOT NULL
--   6. invoice_date date NOT NULL
--   7. due_date date NOT NULL
--   8. category character varying
--   9. subtotal numeric NOT NULL DEFAULT 0
--   10. tax_amount numeric NOT NULL DEFAULT 0
--   11. total_amount numeric NOT NULL DEFAULT 0
--   12. amount_paid numeric NOT NULL DEFAULT 0
--   13. balance_due numeric NOT NULL DEFAULT 0
--   14. status character varying NOT NULL DEFAULT 'pending'::character varying
--   15. attachment_url character varying
--   16. duplicate_key character varying
--   17. notes text
--   18. created_by uuid NOT NULL
--   19. created_at timestamp with time zone NOT NULL DEFAULT now()
--   20. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   21. deleted_at timestamp with time zone

-- Table: public."vendor_documents"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. vendor_id uuid NOT NULL
--   4. document_type character varying NOT NULL DEFAULT 'other'::character varying
--   5. name character varying NOT NULL
--   6. file_url character varying
--   7. notes text
--   8. uploaded_by uuid NOT NULL
--   9. created_at timestamp with time zone NOT NULL DEFAULT now()
--   10. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."vendor_payments"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. vendor_id uuid NOT NULL
--   4. bill_id uuid
--   5. amount numeric NOT NULL
--   6. payment_date date NOT NULL
--   7. payment_method character varying NOT NULL DEFAULT 'bank_transfer'::character varying
--   8. reference_number character varying
--   9. status character varying NOT NULL DEFAULT 'paid'::character varying
--   10. notes text
--   11. recorded_by uuid NOT NULL
--   12. created_at timestamp with time zone NOT NULL DEFAULT now()
--   13. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   14. branch_id uuid
--   15. bank_account_id uuid
--   16. voucher_id uuid
--   17. journal_entry_id uuid
--   18. reconciliation_status character varying NOT NULL DEFAULT 'unreconciled'::character varying
--   19. posting_status character varying NOT NULL DEFAULT 'not_posted'::character varying

-- Table: public."vendor_purchase_order_items"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. purchase_order_id uuid NOT NULL
--   3. description text NOT NULL
--   4. hsn_sac_code character varying
--   5. quantity numeric NOT NULL DEFAULT 1
--   6. rate numeric NOT NULL DEFAULT 0
--   7. gst_rate numeric NOT NULL DEFAULT 18
--   8. tax_amount numeric NOT NULL DEFAULT 0
--   9. total_amount numeric NOT NULL DEFAULT 0
--   10. sort_order integer NOT NULL DEFAULT 0

-- Table: public."vendor_purchase_orders"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. vendor_id uuid NOT NULL
--   4. po_number character varying NOT NULL
--   5. po_date date NOT NULL DEFAULT CURRENT_DATE
--   6. delivery_date date
--   7. status character varying NOT NULL DEFAULT 'draft'::character varying
--   8. subtotal numeric NOT NULL DEFAULT 0
--   9. tax_amount numeric NOT NULL DEFAULT 0
--   10. total_amount numeric NOT NULL DEFAULT 0
--   11. approval_note text
--   12. notes text
--   13. created_by uuid NOT NULL
--   14. created_at timestamp with time zone NOT NULL DEFAULT now()
--   15. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."vendors"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. vendor_code character varying NOT NULL
--   4. vendor_name character varying NOT NULL
--   5. business_name character varying
--   6. vendor_type character varying NOT NULL DEFAULT 'goods_supplier'::character varying
--   7. gst_number character varying
--   8. pan_number character varying
--   9. contact_person character varying
--   10. mobile character varying
--   11. email character varying
--   12. billing_address text
--   13. shipping_address text
--   14. payment_terms character varying
--   15. credit_days integer NOT NULL DEFAULT 0
--   16. credit_limit numeric NOT NULL DEFAULT 0
--   17. status character varying NOT NULL DEFAULT 'active'::character varying
--   18. notes text
--   19. metadata jsonb NOT NULL DEFAULT '{}'::jsonb
--   20. created_at timestamp with time zone NOT NULL DEFAULT now()
--   21. updated_at timestamp with time zone NOT NULL DEFAULT now()
--   22. deleted_at timestamp with time zone
--   23. client_id uuid
--   24. account_id uuid
--   25. branch_id uuid
--   26. opening_balance numeric NOT NULL DEFAULT 0
--   27. opening_balance_type character varying NOT NULL DEFAULT 'credit'::character varying

-- Table: public."vouchers"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. fiscal_year_id uuid NOT NULL
--   4. branch_id uuid
--   5. cost_center_id uuid
--   6. voucher_type character varying NOT NULL
--   7. voucher_no character varying NOT NULL
--   8. voucher_date date NOT NULL
--   9. source_module character varying NOT NULL
--   10. source_type character varying NOT NULL
--   11. source_id uuid
--   12. party_type character varying NOT NULL DEFAULT 'none'::character varying
--   13. party_id uuid
--   14. total_debit numeric NOT NULL DEFAULT 0
--   15. total_credit numeric NOT NULL DEFAULT 0
--   16. narration text
--   17. status character varying NOT NULL DEFAULT 'draft'::character varying
--   18. approval_status character varying NOT NULL DEFAULT 'not_required'::character varying
--   19. submitted_by uuid
--   20. approved_by uuid
--   21. approved_at timestamp with time zone
--   22. posted_by uuid
--   23. posted_at timestamp with time zone
--   24. reversed_by uuid
--   25. reversed_at timestamp with time zone
--   26. reversal_voucher_id uuid
--   27. locked_at timestamp with time zone
--   28. deleted_at timestamp with time zone
--   29. created_by uuid
--   30. created_at timestamp with time zone NOT NULL DEFAULT now()
--   31. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."warehouses"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. org_id uuid NOT NULL
--   3. branch_id uuid
--   4. name character varying NOT NULL
--   5. code character varying NOT NULL
--   6. address text
--   7. gstin character varying
--   8. is_active boolean NOT NULL DEFAULT true
--   9. is_default boolean NOT NULL DEFAULT false
--   10. created_at timestamp with time zone NOT NULL DEFAULT now()
--   11. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."whatsapp_message_logs"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. organization_id uuid NOT NULL
--   3. user_id uuid
--   4. client_id uuid
--   5. to_mobile character varying NOT NULL
--   6. template_name character varying
--   7. message_type character varying NOT NULL DEFAULT 'text'::character varying
--   8. message_body text
--   9. entity_type character varying
--   10. entity_id uuid
--   11. provider character varying NOT NULL DEFAULT 'meta'::character varying
--   12. provider_message_id character varying
--   13. provider_request_id character varying
--   14. status character varying NOT NULL DEFAULT 'queued'::character varying
--   15. failed_reason text
--   16. sent_at timestamp with time zone
--   17. delivered_at timestamp with time zone
--   18. read_at timestamp with time zone
--   19. failed_at timestamp with time zone
--   20. cost_units numeric
--   21. cost_currency character
--   22. request_payload jsonb
--   23. response_payload jsonb
--   24. webhook_payload jsonb
--   25. created_at timestamp with time zone NOT NULL DEFAULT now()
--   26. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Table: public."years"
--   1. id uuid NOT NULL DEFAULT gen_random_uuid()
--   2. client_id uuid NOT NULL
--   3. organization_id uuid NOT NULL
--   4. year character NOT NULL
--   5. label character varying
--   6. is_active boolean NOT NULL DEFAULT true
--   7. notes text
--   8. deleted_at timestamp with time zone
--   9. created_at timestamp with time zone NOT NULL DEFAULT now()
--   10. updated_at timestamp with time zone NOT NULL DEFAULT now()

-- Index definitions
CREATE UNIQUE INDEX account_groups_org_code_unique ON public.account_groups USING btree (organization_id, code);
CREATE UNIQUE INDEX account_groups_pkey ON public.account_groups USING btree (id);
CREATE INDEX idx_account_groups_org_type ON public.account_groups USING btree (organization_id, group_type) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX accounting_event_outbox_idempotent ON public.accounting_event_outbox USING btree (organization_id, idempotency_key);
CREATE UNIQUE INDEX accounting_event_outbox_pkey ON public.accounting_event_outbox USING btree (id);
CREATE INDEX idx_accounting_outbox_pending ON public.accounting_event_outbox USING btree (status, available_at, created_at) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::text[]));
CREATE UNIQUE INDEX accounting_posting_batches_pkey ON public.accounting_posting_batches USING btree (id);
CREATE UNIQUE INDEX accounting_settings_org_unique ON public.accounting_settings USING btree (organization_id);
CREATE UNIQUE INDEX accounting_settings_pkey ON public.accounting_settings USING btree (id);
CREATE UNIQUE INDEX accounts_org_code_unique ON public.accounts USING btree (organization_id, account_code);
CREATE UNIQUE INDEX accounts_pkey ON public.accounts USING btree (id);
CREATE INDEX idx_accounts_org_group ON public.accounts USING btree (organization_id, account_group_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_accounts_org_type ON public.accounts USING btree (organization_id, account_type, control_type) WHERE (deleted_at IS NULL);
CREATE INDEX idx_accounts_search ON public.accounts USING gin (((((account_code)::text || ' '::text) || (name)::text)) gin_trgm_ops);
CREATE UNIQUE INDEX activity_log_pkey ON public.activity_log USING btree (id);
CREATE INDEX idx_activity_client ON public.activity_log USING btree (client_id);
CREATE INDEX idx_activity_created ON public.activity_log USING btree (client_id, created_at DESC);
CREATE UNIQUE INDEX approval_requests_pkey ON public.approval_requests USING btree (id);
CREATE INDEX idx_approval_requests_entity ON public.approval_requests USING btree (organization_id, entity_type, entity_id, status);
CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);
CREATE INDEX idx_audit_action ON public.audit_logs USING btree (action);
CREATE INDEX idx_audit_created_at ON public.audit_logs USING btree (created_at);
CREATE INDEX idx_audit_entity_id ON public.audit_logs USING btree (entity_id) WHERE (entity_id IS NOT NULL);
CREATE INDEX idx_audit_logs_accounting ON public.audit_logs USING btree (organization_id, source_module, fiscal_year_id, created_at DESC);
CREATE INDEX idx_audit_org_entity ON public.audit_logs USING btree (organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_super_admin_id ON public.audit_logs USING btree (super_admin_id);
CREATE INDEX idx_audit_user_id ON public.audit_logs USING btree (user_id);
CREATE UNIQUE INDEX bank_accounts_org_account_unique ON public.bank_accounts USING btree (organization_id, account_id);
CREATE UNIQUE INDEX bank_accounts_pkey ON public.bank_accounts USING btree (id);
CREATE INDEX idx_bank_accounts_org_status ON public.bank_accounts USING btree (organization_id, status) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX branches_org_code_unique ON public.branches USING btree (organization_id, branch_code);
CREATE UNIQUE INDEX branches_pkey ON public.branches USING btree (id);
CREATE UNIQUE INDEX idx_branches_one_head_office ON public.branches USING btree (organization_id) WHERE ((is_head_office = true) AND (deleted_at IS NULL));
CREATE INDEX idx_branches_org_status ON public.branches USING btree (organization_id, status) WHERE (deleted_at IS NULL);
CREATE INDEX checklist_templates_created_by ON public.checklist_templates USING btree (created_by);
CREATE INDEX checklist_templates_is_default ON public.checklist_templates USING btree (is_default);
CREATE UNIQUE INDEX checklist_templates_pkey ON public.checklist_templates USING btree (id);
CREATE INDEX checklist_templates_service_type ON public.checklist_templates USING btree (service_type);
CREATE INDEX checklists_client_id ON public.checklists USING btree (client_id);
CREATE INDEX checklists_client_id_financial_year_service_type ON public.checklists USING btree (client_id, financial_year, service_type);
CREATE INDEX checklists_created_by ON public.checklists USING btree (created_by);
CREATE INDEX checklists_due_date ON public.checklists USING btree (due_date);
CREATE INDEX checklists_financial_year ON public.checklists USING btree (financial_year);
CREATE UNIQUE INDEX checklists_pkey ON public.checklists USING btree (id);
CREATE INDEX checklists_service_type ON public.checklists USING btree (service_type);
CREATE INDEX checklists_status ON public.checklists USING btree (status);
CREATE INDEX checklists_template_id ON public.checklists USING btree (template_id);
CREATE UNIQUE INDEX client_access_tokens_pkey ON public.client_access_tokens USING btree (id);
CREATE UNIQUE INDEX client_access_tokens_token_hash_key ON public.client_access_tokens USING btree (token_hash);
CREATE INDEX idx_cat_expires_active ON public.client_access_tokens USING btree (expires_at) WHERE (is_revoked = false);
CREATE INDEX idx_cat_org_id ON public.client_access_tokens USING btree (organization_id);
CREATE INDEX idx_cat_token_hash ON public.client_access_tokens USING btree (token_hash);
CREATE INDEX idx_cat_user_id ON public.client_access_tokens USING btree (user_id);
CREATE INDEX client_deadlines_client_id ON public.client_deadlines USING btree (client_id);
CREATE UNIQUE INDEX client_deadlines_client_id_deadline_id ON public.client_deadlines USING btree (client_id, deadline_id);
CREATE INDEX client_deadlines_deadline_id ON public.client_deadlines USING btree (deadline_id);
CREATE UNIQUE INDEX client_deadlines_pkey ON public.client_deadlines USING btree (id);
CREATE INDEX client_deadlines_status ON public.client_deadlines USING btree (status);
CREATE UNIQUE INDEX client_expenses_pkey ON public.client_expenses USING btree (id);
CREATE INDEX idx_expenses_client ON public.client_expenses USING btree (client_id);
CREATE INDEX idx_expenses_client_month ON public.client_expenses USING btree (client_id, month, financial_year);
CREATE UNIQUE INDEX client_item_pricing_client_id_item_id_variant_id_key ON public.client_item_pricing USING btree (client_id, item_id, variant_id);
CREATE UNIQUE INDEX client_item_pricing_pkey ON public.client_item_pricing USING btree (id);
CREATE INDEX idx_client_item_pricing_client_id ON public.client_item_pricing USING btree (client_id);
CREATE INDEX idx_client_item_pricing_item_id ON public.client_item_pricing USING btree (item_id);
CREATE UNIQUE INDEX client_purchases_pkey ON public.client_purchases USING btree (id);
CREATE INDEX idx_purchases_client ON public.client_purchases USING btree (client_id);
CREATE INDEX idx_purchases_client_month ON public.client_purchases USING btree (client_id, month, financial_year);
CREATE UNIQUE INDEX client_risk_scores_pkey ON public.client_risk_scores USING btree (id);
CREATE INDEX idx_crs_client_date ON public.client_risk_scores USING btree (client_id, calculated_at DESC);
CREATE INDEX idx_crs_ltv ON public.client_risk_scores USING btree (ltv_segment);
CREATE INDEX idx_crs_org_id ON public.client_risk_scores USING btree (organization_id);
CREATE INDEX idx_crs_score ON public.client_risk_scores USING btree (score);
CREATE UNIQUE INDEX client_sales_pkey ON public.client_sales USING btree (id);
CREATE INDEX idx_sales_client ON public.client_sales USING btree (client_id);
CREATE INDEX idx_sales_client_month ON public.client_sales USING btree (client_id, month, financial_year);
CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id);
CREATE INDEX idx_clients_gstin ON public.clients USING btree (gstin) WHERE (gstin IS NOT NULL);
CREATE INDEX idx_clients_is_active ON public.clients USING btree (is_active) WHERE (deleted_at IS NULL);
CREATE INDEX idx_clients_metadata ON public.clients USING gin (metadata);
CREATE INDEX idx_clients_mobile_trgm ON public.clients USING gin (mobile gin_trgm_ops) WHERE (mobile IS NOT NULL);
CREATE INDEX idx_clients_name_trgm ON public.clients USING gin (name gin_trgm_ops);
CREATE INDEX idx_clients_org_active ON public.clients USING btree (organization_id, is_active) WHERE (deleted_at IS NULL);
CREATE INDEX idx_clients_org_id ON public.clients USING btree (organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_clients_user_id ON public.clients USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_clients_id_org ON public.clients USING btree (id, organization_id);
CREATE UNIQUE INDEX uq_clients_org_code ON public.clients USING btree (organization_id, code);
CREATE INDEX compliance_deadlines_due_date ON public.compliance_deadlines USING btree (due_date);
CREATE INDEX compliance_deadlines_is_seeded ON public.compliance_deadlines USING btree (is_seeded);
CREATE UNIQUE INDEX compliance_deadlines_pkey ON public.compliance_deadlines USING btree (id);
CREATE INDEX compliance_deadlines_type ON public.compliance_deadlines USING btree (type);
CREATE UNIQUE INDEX cost_centers_org_code_unique ON public.cost_centers USING btree (organization_id, code);
CREATE UNIQUE INDEX cost_centers_pkey ON public.cost_centers USING btree (id);
CREATE INDEX idx_cost_centers_org_parent ON public.cost_centers USING btree (organization_id, parent_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX customers_client_unique ON public.customers USING btree (organization_id, client_id);
CREATE UNIQUE INDEX customers_org_code_unique ON public.customers USING btree (organization_id, customer_code);
CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);
CREATE INDEX idx_customers_org_account ON public.customers USING btree (organization_id, account_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX data_uploads_pkey ON public.data_uploads USING btree (id);
CREATE INDEX idx_uploads_client ON public.data_uploads USING btree (client_id);
CREATE UNIQUE INDEX document_versions_pkey ON public.document_versions USING btree (id);
CREATE INDEX idx_dv_client_id ON public.document_versions USING btree (client_id);
CREATE INDEX idx_dv_document_id ON public.document_versions USING btree (document_id);
CREATE INDEX idx_dv_org_id ON public.document_versions USING btree (organization_id);
CREATE INDEX idx_dv_uploaded_by ON public.document_versions USING btree (uploaded_by);
CREATE UNIQUE INDEX uq_doc_version ON public.document_versions USING btree (document_id, version_number);
CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);
CREATE UNIQUE INDEX documents_s3_key_key ON public.documents USING btree (s3_key);
CREATE INDEX idx_docs_checksum ON public.documents USING btree (checksum) WHERE (checksum IS NOT NULL);
CREATE INDEX idx_docs_client_year ON public.documents USING btree (client_id, year_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_docs_folder_id ON public.documents USING btree (folder_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_docs_org_uploader ON public.documents USING btree (organization_id, uploaded_by) WHERE (deleted_at IS NULL);
CREATE INDEX idx_docs_parent ON public.documents USING btree (parent_document_id) WHERE (parent_document_id IS NOT NULL);
CREATE INDEX idx_docs_s3_key ON public.documents USING btree (s3_key);
CREATE INDEX idx_docs_shared ON public.documents USING btree (is_shared_with_client) WHERE ((deleted_at IS NULL) AND (is_shared_with_client = true));
CREATE INDEX idx_docs_tags ON public.documents USING gin (tags);
CREATE UNIQUE INDEX financial_close_runs_pkey ON public.financial_close_runs USING btree (id);
CREATE INDEX idx_financial_close_runs_org_year ON public.financial_close_runs USING btree (organization_id, fiscal_year_id, status);
CREATE UNIQUE INDEX firm_billing_expenses_pkey ON public.firm_billing_expenses USING btree (id);
CREATE INDEX idx_firm_expenses_matter_status ON public.firm_billing_expenses USING btree (organization_id, matter_id, status);
CREATE UNIQUE INDEX firm_billing_matters_pkey ON public.firm_billing_matters USING btree (id);
CREATE INDEX idx_firm_matters_org_client ON public.firm_billing_matters USING btree (organization_id, client_id, status);
CREATE UNIQUE INDEX firm_billing_rate_cards_organization_id_designation_effecti_key ON public.firm_billing_rate_cards USING btree (organization_id, designation, effective_from);
CREATE UNIQUE INDEX firm_billing_rate_cards_pkey ON public.firm_billing_rate_cards USING btree (id);
CREATE UNIQUE INDEX firm_billing_reminder_templates_pkey ON public.firm_billing_reminder_templates USING btree (id);
CREATE UNIQUE INDEX firm_billing_retainers_pkey ON public.firm_billing_retainers USING btree (id);
CREATE INDEX idx_firm_retainers_next ON public.firm_billing_retainers USING btree (organization_id, is_active, billing_date);
CREATE UNIQUE INDEX firm_billing_tds_records_pkey ON public.firm_billing_tds_records USING btree (id);
CREATE INDEX idx_firm_tds_invoice ON public.firm_billing_tds_records USING btree (organization_id, invoice_id, status);
CREATE UNIQUE INDEX firm_billing_timesheets_pkey ON public.firm_billing_timesheets USING btree (id);
CREATE INDEX idx_firm_timesheets_matter_status ON public.firm_billing_timesheets USING btree (organization_id, matter_id, status);
CREATE UNIQUE INDEX fiscal_years_org_dates_unique ON public.fiscal_years USING btree (organization_id, start_date, end_date);
CREATE UNIQUE INDEX fiscal_years_org_name_unique ON public.fiscal_years USING btree (organization_id, name);
CREATE UNIQUE INDEX fiscal_years_pkey ON public.fiscal_years USING btree (id);
CREATE INDEX idx_fiscal_years_org_status ON public.fiscal_years USING btree (organization_id, status);
CREATE UNIQUE INDEX folders_pkey ON public.folders USING btree (id);
CREATE INDEX idx_folders_client_id ON public.folders USING btree (client_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_folders_org_id ON public.folders USING btree (organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_folders_parent ON public.folders USING btree (parent_folder_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_folders_year_id ON public.folders USING btree (year_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_folders_id_org ON public.folders USING btree (id, organization_id);
CREATE UNIQUE INDEX gst_returns_pkey ON public.gst_returns USING btree (id);
CREATE INDEX idx_gst_returns_client ON public.gst_returns USING btree (client_id);
CREATE INDEX idx_gst_returns_period ON public.gst_returns USING btree (client_id, return_type, period_month, period_year);
CREATE INDEX gstr2a_recon_client_period_idx ON public.gstr2a_reconciliations USING btree (client_id, period);
CREATE UNIQUE INDEX gstr2a_reconciliations_pkey ON public.gstr2a_reconciliations USING btree (id);
CREATE UNIQUE INDEX hsn_sac_codes_code_type_idx ON public.hsn_sac_codes USING btree (code, type);
CREATE UNIQUE INDEX hsn_sac_codes_pkey ON public.hsn_sac_codes USING btree (id);
CREATE INDEX hsn_sac_codes_search_idx ON public.hsn_sac_codes USING gin (to_tsvector('english'::regconfig, (((code)::text || ' '::text) || description)));
CREATE UNIQUE INDEX inventory_number_sequences_pkey ON public.inventory_number_sequences USING btree (org_id, sequence_type);
CREATE INDEX idx_inventory_transactions_org_item_date ON public.inventory_transactions USING btree (organization_id, item_id, transaction_date DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_inventory_transactions_source ON public.inventory_transactions USING btree (organization_id, source_module, source_type, source_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX inventory_transactions_pkey ON public.inventory_transactions USING btree (id);
CREATE INDEX idx_invoice_line_items_item_id ON public.invoice_line_items USING btree (item_id);
CREATE INDEX idx_invoice_line_items_variant_id ON public.invoice_line_items USING btree (variant_id);
CREATE INDEX idx_invoice_line_items_warehouse_id ON public.invoice_line_items USING btree (warehouse_id);
CREATE INDEX idx_line_invoice_id ON public.invoice_line_items USING btree (invoice_id);
CREATE INDEX idx_line_template_id ON public.invoice_line_items USING btree (service_template_id) WHERE (service_template_id IS NOT NULL);
CREATE UNIQUE INDEX invoice_line_items_pkey ON public.invoice_line_items USING btree (id);
CREATE INDEX idx_inv_seq_org_fy ON public.invoice_number_sequences USING btree (organization_id, financial_year);
CREATE UNIQUE INDEX invoice_number_sequences_pkey ON public.invoice_number_sequences USING btree (id);
CREATE UNIQUE INDEX uq_inv_seq_org_fy ON public.invoice_number_sequences USING btree (organization_id, financial_year);
CREATE UNIQUE INDEX invoice_templates_org_default_idx ON public.invoice_templates USING btree (org_id) WHERE ((is_default = true) AND (org_id IS NOT NULL));
CREATE UNIQUE INDEX invoice_templates_pkey ON public.invoice_templates USING btree (id);
CREATE INDEX idx_inv_client_status ON public.invoices USING btree (client_id, status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_inv_due_date ON public.invoices USING btree (due_date) WHERE (deleted_at IS NULL);
CREATE INDEX idx_inv_invoice_date ON public.invoices USING btree (invoice_date) WHERE (deleted_at IS NULL);
CREATE INDEX idx_inv_org_client ON public.invoices USING btree (organization_id, client_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_inv_overdue ON public.invoices USING btree (due_date, status) WHERE (((status)::text = ANY ((ARRAY['issued'::character varying, 'partially_paid'::character varying])::text[])) AND (deleted_at IS NULL));
CREATE INDEX idx_inv_recurring ON public.invoices USING btree (recurring_template_id) WHERE (recurring_template_id IS NOT NULL);
CREATE INDEX idx_inv_status ON public.invoices USING btree (status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_invoices_accounting_status ON public.invoices USING btree (organization_id, posting_status, approval_status, invoice_date) WHERE (deleted_at IS NULL);
CREATE INDEX idx_invoices_party_role ON public.invoices USING btree (party_role);
CREATE UNIQUE INDEX invoices_payment_link_token_idx ON public.invoices USING btree (payment_link_token) WHERE (payment_link_token IS NOT NULL);
CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id);
CREATE UNIQUE INDEX uq_invoices_org_number ON public.invoices USING btree (organization_id, invoice_number);
CREATE UNIQUE INDEX itc_ledger_client_period_idx ON public.itc_ledger USING btree (client_id, period);
CREATE UNIQUE INDEX itc_ledger_pkey ON public.itc_ledger USING btree (id);
CREATE UNIQUE INDEX idx_item_categories_org_code_unique ON public.item_categories USING btree (org_id, code) WHERE (code IS NOT NULL);
CREATE UNIQUE INDEX item_categories_org_id_name_parent_id_key ON public.item_categories USING btree (org_id, name, parent_id);
CREATE UNIQUE INDEX item_categories_pkey ON public.item_categories USING btree (id);
CREATE INDEX idx_item_variants_item_id ON public.item_variants USING btree (item_id);
CREATE UNIQUE INDEX item_variants_pkey ON public.item_variants USING btree (id);
CREATE INDEX idx_items_barcode ON public.items USING btree (barcode);
CREATE INDEX idx_items_category_id ON public.items USING btree (category_id);
CREATE INDEX idx_items_org_id ON public.items USING btree (org_id);
CREATE UNIQUE INDEX idx_items_org_sku_unique ON public.items USING btree (org_id, sku) WHERE (sku IS NOT NULL);
CREATE INDEX idx_items_sku ON public.items USING btree (sku);
CREATE UNIQUE INDEX items_pkey ON public.items USING btree (id);
CREATE INDEX idx_journal_entries_org_posting ON public.journal_entries USING btree (organization_id, posting_date DESC, status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_journal_entries_source ON public.journal_entries USING btree (organization_id, source_module, source_type, source_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_journal_entries_voucher ON public.journal_entries USING btree (voucher_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX journal_entries_idempotency_unique ON public.journal_entries USING btree (organization_id, idempotency_key);
CREATE UNIQUE INDEX journal_entries_org_no_unique ON public.journal_entries USING btree (organization_id, entry_no);
CREATE UNIQUE INDEX journal_entries_pkey ON public.journal_entries USING btree (id);
CREATE INDEX idx_journal_lines_cost_center ON public.journal_entry_lines USING btree (organization_id, cost_center_id) WHERE (cost_center_id IS NOT NULL);
CREATE INDEX idx_journal_lines_org_account_date ON public.journal_entry_lines USING btree (organization_id, account_id, journal_entry_id);
CREATE INDEX idx_journal_lines_party ON public.journal_entry_lines USING btree (organization_id, party_type, party_id) WHERE (party_id IS NOT NULL);
CREATE INDEX idx_journal_lines_ref ON public.journal_entry_lines USING btree (organization_id, reference_type, reference_id) WHERE (reference_id IS NOT NULL);
CREATE UNIQUE INDEX journal_entry_lines_line_unique ON public.journal_entry_lines USING btree (journal_entry_id, line_no);
CREATE UNIQUE INDEX journal_entry_lines_pkey ON public.journal_entry_lines USING btree (id);
CREATE INDEX idx_ledger_balances_report ON public.ledger_balances USING btree (organization_id, fiscal_year_id, period_month, account_id);
CREATE UNIQUE INDEX ledger_balances_pkey ON public.ledger_balances USING btree (id);
CREATE UNIQUE INDEX ledger_balances_unique ON public.ledger_balances USING btree (organization_id, fiscal_year_id, account_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid), period_month);
CREATE INDEX idx_notif_org_type ON public.notifications USING btree (organization_id, type);
CREATE INDEX idx_notif_sent_at ON public.notifications USING btree (sent_at);
CREATE INDEX idx_notif_user_read ON public.notifications USING btree (user_id, is_read);
CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);
CREATE INDEX idx_orgs_is_active ON public.organizations USING btree (is_active) WHERE (deleted_at IS NULL);
CREATE INDEX idx_orgs_pan ON public.organizations USING btree (pan) WHERE (pan IS NOT NULL);
CREATE INDEX idx_orgs_slug ON public.organizations USING btree (slug) WHERE (deleted_at IS NULL);
CREATE INDEX idx_orgs_subscription ON public.organizations USING btree (current_subscription_id) WHERE (current_subscription_id IS NOT NULL);
CREATE INDEX idx_orgs_trial_ends ON public.organizations USING btree (trial_ends_at) WHERE ((trial_ends_at IS NOT NULL) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);
CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);
CREATE INDEX idx_otps_expires_at ON public.otps USING btree (expires_at);
CREATE INDEX idx_otps_mobile ON public.otps USING btree (mobile);
CREATE INDEX idx_otps_mobile_active ON public.otps USING btree (mobile, is_used, expires_at) WHERE (is_used = false);
CREATE UNIQUE INDEX otps_pkey ON public.otps USING btree (id);
CREATE INDEX idx_payment_allocations_party ON public.payment_allocations USING btree (organization_id, party_type, party_id, allocation_date) WHERE (deleted_at IS NULL);
CREATE INDEX idx_payment_allocations_source_doc ON public.payment_allocations USING btree (organization_id, source_document_type, source_document_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX payment_allocations_pkey ON public.payment_allocations USING btree (id);
CREATE INDEX idx_pay_client_id ON public.payments USING btree (client_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pay_date ON public.payments USING btree (payment_date) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pay_invoice_id ON public.payments USING btree (invoice_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_pay_org_id ON public.payments USING btree (organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_payments_accounting_status ON public.payments USING btree (organization_id, posting_status, reconciliation_status, payment_date) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_payments_receipt_org ON public.payments USING btree (organization_id, receipt_no) WHERE (receipt_no IS NOT NULL);
CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);
CREATE INDEX idx_period_locks_active ON public.period_locks USING btree (organization_id, fiscal_year_id, period_start, period_end, lock_type) WHERE ((status)::text = 'active'::text);
CREATE UNIQUE INDEX period_locks_pkey ON public.period_locks USING btree (id);
CREATE INDEX idx_po_items_item_id ON public.purchase_order_items USING btree (item_id);
CREATE INDEX idx_po_items_po_id ON public.purchase_order_items USING btree (po_id);
CREATE UNIQUE INDEX purchase_order_items_pkey ON public.purchase_order_items USING btree (id);
CREATE INDEX idx_purchase_orders_org_id ON public.purchase_orders USING btree (org_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders USING btree (status);
CREATE INDEX idx_purchase_orders_supplier_client ON public.purchase_orders USING btree (supplier_client_id);
CREATE INDEX idx_purchase_orders_warehouse ON public.purchase_orders USING btree (warehouse_id);
CREATE UNIQUE INDEX purchase_orders_pkey ON public.purchase_orders USING btree (id);
CREATE UNIQUE INDEX purchase_orders_po_number_key ON public.purchase_orders USING btree (po_number);
CREATE INDEX idx_purchases_accounting_status ON public.purchases USING btree (organization_id, posting_status, approval_status, purchase_date) WHERE (deleted_at IS NULL);
CREATE INDEX idx_purchases_org_vendor_date ON public.purchases USING btree (organization_id, vendor_id, purchase_date DESC) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX purchases_org_no_unique ON public.purchases USING btree (organization_id, purchase_no);
CREATE UNIQUE INDEX purchases_pkey ON public.purchases USING btree (id);
CREATE INDEX idx_reconciliation_org_bank_period ON public.reconciliation USING btree (organization_id, bank_account_id, statement_period_start, statement_period_end) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX reconciliation_pkey ON public.reconciliation USING btree (id);
CREATE INDEX idx_reconciliation_lines_match ON public.reconciliation_lines USING btree (organization_id, reconciliation_id, match_status);
CREATE INDEX idx_reconciliation_lines_reference ON public.reconciliation_lines USING btree (organization_id, statement_date, reference_number);
CREATE UNIQUE INDEX reconciliation_lines_pkey ON public.reconciliation_lines USING btree (id);
CREATE INDEX idx_recurring_entries_due ON public.recurring_entries USING btree (organization_id, next_run_date, status) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX recurring_entries_pkey ON public.recurring_entries USING btree (id);
CREATE INDEX idx_rec_active_due ON public.recurring_invoice_templates USING btree (next_run_date) WHERE ((is_active = true) AND (deleted_at IS NULL));
CREATE INDEX idx_rec_client_id ON public.recurring_invoice_templates USING btree (client_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_rec_org_id ON public.recurring_invoice_templates USING btree (organization_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX recurring_invoice_templates_pkey ON public.recurring_invoice_templates USING btree (id);
CREATE INDEX idx_rf_org_date ON public.revenue_forecasts USING btree (organization_id, forecast_date DESC);
CREATE INDEX idx_rf_org_id ON public.revenue_forecasts USING btree (organization_id);
CREATE UNIQUE INDEX revenue_forecasts_pkey ON public.revenue_forecasts USING btree (id);
CREATE UNIQUE INDEX uq_forecast_org_date_period ON public.revenue_forecasts USING btree (organization_id, forecast_date, period_days);
CREATE INDEX idx_svc_tmpl_active ON public.service_templates USING btree (is_active) WHERE (deleted_at IS NULL);
CREATE INDEX idx_svc_tmpl_org_id ON public.service_templates USING btree (organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_svc_tmpl_sac ON public.service_templates USING btree (sac_code);
CREATE UNIQUE INDEX service_templates_pkey ON public.service_templates USING btree (id);
CREATE INDEX idx_sp_org_id ON public.staff_permissions USING btree (organization_id);
CREATE INDEX idx_sp_permission ON public.staff_permissions USING btree (permission);
CREATE INDEX idx_sp_user_granted ON public.staff_permissions USING btree (user_id, is_granted);
CREATE INDEX idx_sp_user_id ON public.staff_permissions USING btree (user_id);
CREATE UNIQUE INDEX staff_permissions_pkey ON public.staff_permissions USING btree (id);
CREATE UNIQUE INDEX uq_staff_perm_user_permission ON public.staff_permissions USING btree (user_id, permission);
CREATE INDEX idx_stock_ledger_client_id ON public.stock_ledger USING btree (client_id);
CREATE INDEX idx_stock_ledger_item_id ON public.stock_ledger USING btree (item_id);
CREATE INDEX idx_stock_ledger_org_id ON public.stock_ledger USING btree (org_id);
CREATE INDEX idx_stock_ledger_ref ON public.stock_ledger USING btree (reference_id);
CREATE INDEX idx_stock_ledger_txn_date ON public.stock_ledger USING btree (transaction_date);
CREATE INDEX idx_stock_ledger_warehouse_id ON public.stock_ledger USING btree (warehouse_id);
CREATE UNIQUE INDEX stock_ledger_pkey ON public.stock_ledger USING btree (id);
CREATE INDEX idx_stock_summary_item_id ON public.stock_summary USING btree (item_id);
CREATE INDEX idx_stock_summary_warehouse_id ON public.stock_summary USING btree (warehouse_id);
CREATE UNIQUE INDEX stock_summary_pkey ON public.stock_summary USING btree (id);
CREATE UNIQUE INDEX stock_summary_warehouse_id_item_id_variant_id_batch_no_key ON public.stock_summary USING btree (warehouse_id, item_id, variant_id, batch_no);
CREATE INDEX idx_transfer_items_transfer_id ON public.stock_transfer_items USING btree (transfer_id);
CREATE UNIQUE INDEX stock_transfer_items_pkey ON public.stock_transfer_items USING btree (id);
CREATE INDEX idx_stock_transfers_client_id ON public.stock_transfers USING btree (client_id);
CREATE INDEX idx_stock_transfers_org_id ON public.stock_transfers USING btree (org_id);
CREATE UNIQUE INDEX stock_transfers_pkey ON public.stock_transfers USING btree (id);
CREATE UNIQUE INDEX stock_transfers_transfer_no_key ON public.stock_transfers USING btree (transfer_no);
CREATE INDEX idx_stock_valuation_org_date ON public.stock_valuation USING btree (organization_id, valuation_date DESC);
CREATE UNIQUE INDEX stock_valuation_pkey ON public.stock_valuation USING btree (id);
CREATE UNIQUE INDEX stock_valuation_unique ON public.stock_valuation USING btree (organization_id, warehouse_id, item_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(batch_no, ''::character varying), valuation_date);
CREATE INDEX idx_subs_gateway_id ON public.subscriptions USING btree (gateway_subscription_id) WHERE (gateway_subscription_id IS NOT NULL);
CREATE INDEX idx_subs_org_id ON public.subscriptions USING btree (organization_id);
CREATE INDEX idx_subs_period_end ON public.subscriptions USING btree (current_period_end) WHERE ((status)::text = ANY ((ARRAY['active'::character varying, 'trialing'::character varying])::text[]));
CREATE INDEX idx_subs_plan ON public.subscriptions USING btree (plan);
CREATE INDEX idx_subs_status ON public.subscriptions USING btree (status);
CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);
CREATE INDEX idx_super_admins_active ON public.super_admins USING btree (is_active) WHERE (deleted_at IS NULL);
CREATE INDEX idx_super_admins_email ON public.super_admins USING btree (email) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX super_admins_email_key ON public.super_admins USING btree (email);
CREATE UNIQUE INDEX super_admins_pkey ON public.super_admins USING btree (id);
CREATE INDEX idx_task_activity_logs_task ON public.task_activity_logs USING btree (task_id, created_at DESC);
CREATE UNIQUE INDEX task_activity_logs_pkey ON public.task_activity_logs USING btree (id);
CREATE UNIQUE INDEX task_attachments_pkey ON public.task_attachments USING btree (id);
CREATE UNIQUE INDEX task_comments_pkey ON public.task_comments USING btree (id);
CREATE INDEX idx_tasks_assigned_status ON public.tasks USING btree (assigned_to, status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);
CREATE INDEX idx_tasks_client_status ON public.tasks USING btree (client_id, status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date) WHERE ((deleted_at IS NULL) AND ((status)::text <> 'done'::text));
CREATE INDEX idx_tasks_org_assigned ON public.tasks USING btree (organization_id, assigned_to) WHERE (deleted_at IS NULL);
CREATE INDEX idx_tasks_org_client ON public.tasks USING btree (organization_id, client_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_tasks_org_status_due ON public.tasks USING btree (organization_id, status, due_date);
CREATE INDEX idx_tasks_parent ON public.tasks USING btree (parent_task_id) WHERE (parent_task_id IS NOT NULL);
CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority) WHERE (deleted_at IS NULL);
CREATE INDEX idx_tasks_priority_due ON public.tasks USING btree (priority, due_date) WHERE ((deleted_at IS NULL) AND ((status)::text <> 'done'::text));
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_tasks_tags ON public.tasks USING gin (tags);
CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);
CREATE INDEX idx_taxes_org_component_rate ON public.taxes USING btree (organization_id, tax_component, rate) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX taxes_pkey ON public.taxes USING btree (id);
CREATE INDEX idx_users_is_active ON public.users USING btree (is_active) WHERE (deleted_at IS NULL);
CREATE INDEX idx_users_locked ON public.users USING btree (locked_until) WHERE (locked_until IS NOT NULL);
CREATE INDEX idx_users_mobile ON public.users USING btree (mobile) WHERE (deleted_at IS NULL);
CREATE INDEX idx_users_org_id ON public.users USING btree (organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_users_role ON public.users USING btree (role) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_users_id_org ON public.users USING btree (id, organization_id);
CREATE UNIQUE INDEX uq_users_org_mobile ON public.users USING btree (organization_id, mobile);
CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);
CREATE INDEX idx_val_errors_client ON public.validation_errors USING btree (client_id);
CREATE INDEX idx_val_errors_unresolved ON public.validation_errors USING btree (client_id, is_resolved) WHERE (NOT is_resolved);
CREATE UNIQUE INDEX validation_errors_pkey ON public.validation_errors USING btree (id);
CREATE INDEX idx_vendor_bills_duplicate ON public.vendor_bills USING btree (duplicate_key);
CREATE INDEX idx_vendor_bills_org_due ON public.vendor_bills USING btree (organization_id, due_date);
CREATE INDEX idx_vendor_bills_org_status ON public.vendor_bills USING btree (organization_id, status);
CREATE UNIQUE INDEX vendor_bill_unique ON public.vendor_bills USING btree (organization_id, vendor_id, bill_number);
CREATE UNIQUE INDEX vendor_bills_pkey ON public.vendor_bills USING btree (id);
CREATE INDEX idx_vendor_documents_org_vendor ON public.vendor_documents USING btree (organization_id, vendor_id);
CREATE INDEX idx_vendor_documents_type ON public.vendor_documents USING btree (document_type);
CREATE UNIQUE INDEX vendor_documents_pkey ON public.vendor_documents USING btree (id);
CREATE INDEX idx_vendor_payments_accounting_status ON public.vendor_payments USING btree (organization_id, posting_status, reconciliation_status, payment_date);
CREATE INDEX idx_vendor_payments_bill ON public.vendor_payments USING btree (bill_id);
CREATE INDEX idx_vendor_payments_date ON public.vendor_payments USING btree (payment_date);
CREATE INDEX idx_vendor_payments_org_vendor ON public.vendor_payments USING btree (organization_id, vendor_id);
CREATE UNIQUE INDEX vendor_payments_pkey ON public.vendor_payments USING btree (id);
CREATE INDEX idx_vendor_po_items_po ON public.vendor_purchase_order_items USING btree (purchase_order_id);
CREATE UNIQUE INDEX vendor_purchase_order_items_pkey ON public.vendor_purchase_order_items USING btree (id);
CREATE INDEX idx_vendor_po_org_status ON public.vendor_purchase_orders USING btree (organization_id, status);
CREATE INDEX idx_vendor_po_org_vendor ON public.vendor_purchase_orders USING btree (organization_id, vendor_id);
CREATE UNIQUE INDEX vendor_po_org_number_unique ON public.vendor_purchase_orders USING btree (organization_id, po_number);
CREATE UNIQUE INDEX vendor_purchase_orders_pkey ON public.vendor_purchase_orders USING btree (id);
CREATE INDEX idx_vendors_org_account ON public.vendors USING btree (organization_id, account_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_vendors_org_client ON public.vendors USING btree (organization_id, client_id);
CREATE INDEX idx_vendors_org_status ON public.vendors USING btree (organization_id, status);
CREATE INDEX idx_vendors_org_type ON public.vendors USING btree (organization_id, vendor_type);
CREATE UNIQUE INDEX vendors_org_code_unique ON public.vendors USING btree (organization_id, vendor_code);
CREATE UNIQUE INDEX vendors_pkey ON public.vendors USING btree (id);
CREATE INDEX idx_vouchers_org_date ON public.vouchers USING btree (organization_id, voucher_date DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_vouchers_source ON public.vouchers USING btree (organization_id, source_module, source_type, source_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_vouchers_status ON public.vouchers USING btree (organization_id, status, approval_status) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX vouchers_org_type_no_unique ON public.vouchers USING btree (organization_id, voucher_type, voucher_no);
CREATE UNIQUE INDEX vouchers_pkey ON public.vouchers USING btree (id);
CREATE UNIQUE INDEX warehouses_org_id_code_key ON public.warehouses USING btree (org_id, code);
CREATE UNIQUE INDEX warehouses_pkey ON public.warehouses USING btree (id);
CREATE INDEX idx_wml_client_id ON public.whatsapp_message_logs USING btree (client_id) WHERE (client_id IS NOT NULL);
CREATE INDEX idx_wml_created_at ON public.whatsapp_message_logs USING btree (created_at DESC);
CREATE INDEX idx_wml_entity ON public.whatsapp_message_logs USING btree (entity_type, entity_id) WHERE (entity_id IS NOT NULL);
CREATE INDEX idx_wml_org_id ON public.whatsapp_message_logs USING btree (organization_id);
CREATE INDEX idx_wml_provider_msg_id ON public.whatsapp_message_logs USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL);
CREATE INDEX idx_wml_status ON public.whatsapp_message_logs USING btree (status);
CREATE INDEX idx_wml_to_mobile ON public.whatsapp_message_logs USING btree (to_mobile);
CREATE UNIQUE INDEX whatsapp_message_logs_pkey ON public.whatsapp_message_logs USING btree (id);
CREATE UNIQUE INDEX whatsapp_message_logs_provider_message_id_key ON public.whatsapp_message_logs USING btree (provider_message_id);
CREATE INDEX idx_years_client_id ON public.years USING btree (client_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_years_org_id ON public.years USING btree (organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_years_year ON public.years USING btree (year) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_years_client_year ON public.years USING btree (client_id, year);
CREATE UNIQUE INDEX years_pkey ON public.years USING btree (id);

-- Function definitions
CREATE OR REPLACE FUNCTION public.armor(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

CREATE OR REPLACE FUNCTION public.armor(bytea, text[], text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

CREATE OR REPLACE FUNCTION public.assert_journal_entry_balanced_from_entry()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM check_journal_entry_balanced(NEW.id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assert_journal_entry_balanced_from_line()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM check_journal_entry_balanced(NEW.journal_entry_id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_financial_year(check_date date)
 RETURNS character
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  y  INT;
  m  INT;
  fy CHAR(4);
BEGIN
  y := EXTRACT(YEAR FROM check_date)::INT;
  m := EXTRACT(MONTH FROM check_date)::INT;
  IF m >= 4 THEN
    fy := LPAD((y % 100)::TEXT, 2, '0') || LPAD(((y + 1) % 100)::TEXT, 2, '0');
  ELSE
    fy := LPAD(((y - 1) % 100)::TEXT, 2, '0') || LPAD((y % 100)::TEXT, 2, '0');
  END IF;
  RETURN fy;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_journal_entry_balanced(p_entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_status TEXT;
  v_debit NUMERIC(18,2);
  v_credit NUMERIC(18,2);
  v_lines INTEGER;
BEGIN
  SELECT status INTO v_status
  FROM journal_entries
  WHERE id = p_entry_id;

  IF v_status IN ('approved','posted') THEN
    SELECT
      COALESCE(SUM(debit_amount), 0),
      COALESCE(SUM(credit_amount), 0),
      COUNT(*)
    INTO v_debit, v_credit, v_lines
    FROM journal_entry_lines
    WHERE journal_entry_id = p_entry_id;

    IF v_lines < 2 OR ROUND(v_debit, 2) <> ROUND(v_credit, 2) THEN
      RAISE EXCEPTION 'Journal entry % is not balanced: debit %, credit %, lines %', p_entry_id, v_debit, v_credit, v_lines;
    END IF;

    UPDATE journal_entries
       SET total_debit = v_debit,
           total_credit = v_credit,
           updated_at = NOW()
     WHERE id = p_entry_id
       AND (total_debit <> v_debit OR total_credit <> v_credit);
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.crypt(text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_crypt$function$
;

CREATE OR REPLACE FUNCTION public.current_org_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN current_setting('app.current_org_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.dearmor(text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_dearmor$function$
;

CREATE OR REPLACE FUNCTION public.decrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt$function$
;

CREATE OR REPLACE FUNCTION public.decrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$
;

CREATE OR REPLACE FUNCTION public.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

CREATE OR REPLACE FUNCTION public.digest(text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

CREATE OR REPLACE FUNCTION public.encrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$
;

CREATE OR REPLACE FUNCTION public.gen_random_bytes(integer)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_random_bytes$function$
;

CREATE OR REPLACE FUNCTION public.gen_random_uuid()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/pgcrypto', $function$pg_random_uuid$function$
;

CREATE OR REPLACE FUNCTION public.gen_salt(text)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt$function$
;

CREATE OR REPLACE FUNCTION public.gen_salt(text, integer)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$
;

CREATE OR REPLACE FUNCTION public.get_next_client_code(p_org_id uuid)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_max_code INT;
BEGIN
  SELECT COALESCE(MAX(code::INT), 0)
  INTO v_max_code
  FROM clients
  WHERE organization_id = p_org_id
    AND deleted_at IS NULL
    AND code ~ '^\d+$'
  FOR UPDATE;

  RETURN LPAD((v_max_code + 1)::TEXT, 3, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_org_id uuid, p_fy character)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_seq    INTEGER;
  v_prefix VARCHAR(10);
  v_result VARCHAR(30);
BEGIN
  INSERT INTO invoice_number_sequences (organization_id, financial_year, last_sequence)
  VALUES (p_org_id, p_fy, 0)
  ON CONFLICT (organization_id, financial_year) DO NOTHING;

  SELECT last_sequence + 1
  INTO v_seq
  FROM invoice_number_sequences
  WHERE organization_id = p_org_id
    AND financial_year  = p_fy
  FOR UPDATE;

  UPDATE invoice_number_sequences
  SET last_sequence = v_seq,
      updated_at    = NOW()
  WHERE organization_id = p_org_id
    AND financial_year  = p_fy;

  SELECT COALESCE(settings->>'invoice_prefix', 'INV')
  INTO v_prefix
  FROM organizations
  WHERE id = p_org_id;

  v_result := v_prefix || '-' || p_fy || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gin_btree_consistent(internal, smallint, anyelement, integer, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_btree_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_anyenum(anyenum, anyenum, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_anyenum$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_bit(bit, bit, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_bit$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_bool(boolean, boolean, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_bool$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_bpchar(character, character, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_bpchar$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_bytea(bytea, bytea, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_bytea$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_char("char", "char", smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_char$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_cidr(cidr, cidr, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_cidr$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_date(date, date, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_date$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_float4(real, real, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_float4$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_float8(double precision, double precision, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_float8$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_inet(inet, inet, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_inet$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_int2(smallint, smallint, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_int2$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_int4(integer, integer, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_int4$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_int8(bigint, bigint, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_int8$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_interval(interval, interval, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_interval$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_macaddr(macaddr, macaddr, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_macaddr$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_macaddr8(macaddr8, macaddr8, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_macaddr8$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_money(money, money, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_money$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_name(name, name, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_name$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_numeric(numeric, numeric, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_numeric$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_oid(oid, oid, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_oid$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_text(text, text, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_text$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_time(time without time zone, time without time zone, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_time$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_timestamp(timestamp without time zone, timestamp without time zone, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_timestamp$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_timestamptz(timestamp with time zone, timestamp with time zone, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_timestamptz$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_timetz(time with time zone, time with time zone, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_timetz$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_uuid(uuid, uuid, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_uuid$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_varbit(bit varying, bit varying, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_varbit$function$
;

CREATE OR REPLACE FUNCTION public.gin_enum_cmp(anyenum, anyenum)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_enum_cmp$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_anyenum(anyenum, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_anyenum$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_bit(bit, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_bit$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_bool(boolean, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_bool$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_bpchar(character, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_bpchar$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_bytea(bytea, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_bytea$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_char("char", internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_char$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_cidr(cidr, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_cidr$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_date(date, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_date$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_float4(real, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_float4$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_float8(double precision, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_float8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_inet(inet, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_inet$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_int2(smallint, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_int2$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_int4(integer, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_int4$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_int8(bigint, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_int8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_interval(interval, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_interval$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_macaddr(macaddr, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_macaddr$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_macaddr8(macaddr8, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_macaddr8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_money(money, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_money$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_name(name, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_name$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_numeric(numeric, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_numeric$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_oid(oid, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_oid$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_text(text, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_text$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_time(time without time zone, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_time$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_timestamp(timestamp without time zone, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_timestamp$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_timestamptz(timestamp with time zone, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_timestamptz$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_timetz(time with time zone, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_timetz$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_uuid(uuid, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_uuid$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_varbit(bit varying, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_varbit$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_anyenum(anyenum, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_anyenum$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_bit(bit, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_bit$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_bool(boolean, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_bool$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_bpchar(character, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_bpchar$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_bytea(bytea, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_bytea$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_char("char", internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_char$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_cidr(cidr, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_cidr$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_date(date, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_date$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_float4(real, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_float4$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_float8(double precision, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_float8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_inet(inet, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_inet$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_int2(smallint, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_int2$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_int4(integer, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_int4$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_int8(bigint, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_int8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_interval(interval, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_interval$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_macaddr(macaddr, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_macaddr$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_macaddr8(macaddr8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_macaddr8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_money(money, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_money$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_name(name, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_name$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_numeric(numeric, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_numeric$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_oid(oid, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_oid$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_text(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_text$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_time(time without time zone, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_time$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_timestamp(timestamp without time zone, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_timestamp$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_timestamptz(timestamp with time zone, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_timestamptz$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_timetz(time with time zone, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_timetz$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_uuid(uuid, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_uuid$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_varbit(bit varying, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_varbit$function$
;

CREATE OR REPLACE FUNCTION public.gin_numeric_cmp(numeric, numeric)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_numeric_cmp$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
;

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_permission character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_role        VARCHAR(20);
  v_override    BOOLEAN;
  v_expires_at  TIMESTAMPTZ;
BEGIN
  -- Get user role
  SELECT role INTO v_role FROM users WHERE id = p_user_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- admin always has all permissions
  IF v_role IN ('admin', 'super_admin') THEN RETURN TRUE; END IF;

  -- Check explicit override in staff_permissions
  SELECT is_granted, expires_at
  INTO v_override, v_expires_at
  FROM staff_permissions
  WHERE user_id    = p_user_id
    AND permission = p_permission
  LIMIT 1;

  IF FOUND THEN
    -- Respect expiry
    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
      -- Override expired — fall through to role default
    ELSE
      RETURN v_override;
    END IF;
  END IF;

  -- Role-based defaults for staff
  IF v_role = 'staff' THEN
    RETURN p_permission IN (
      'invoice.create', 'invoice.view', 'invoice.edit',
      'client.view', 'document.upload', 'document.view',
      'document.share', 'payment.record', 'payment.view',
      'task.create', 'task.view', 'task.edit'
    );
  END IF;

  -- client role: very restricted
  IF v_role = 'client' THEN
    RETURN p_permission IN (
      'invoice.view_own', 'document.view_shared', 'payment.view_own'
    );
  END IF;

  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.hmac(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

CREATE OR REPLACE FUNCTION public.hmac(text, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

CREATE OR REPLACE FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text)
 RETURNS SETOF record
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_armor_headers$function$
;

CREATE OR REPLACE FUNCTION public.pgp_key_id(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_key_id_w$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.prevent_accounting_hard_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'Hard delete is not allowed for accounting table %. Use reversal, cancellation, or deleted_at.', TG_TABLE_NAME;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_expired_tokens()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE client_access_tokens
  SET is_revoked   = TRUE,
      revoked_at   = NOW(),
      revoked_reason = 'expired'
  WHERE expires_at < NOW()
    AND is_revoked  = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_bypass()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN COALESCE(current_setting('app.bypass_rls', TRUE), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$
;

CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$
;

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$
;

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$
;

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
;

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.trigger_audit_log_invoices()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      organization_id, entity_type, entity_id,
      action, description, new_values
    ) VALUES (
      NEW.organization_id, 'invoice', NEW.id,
      'invoice.created',
      'Invoice ' || NEW.invoice_number || ' created with status ' || NEW.status,
      row_to_json(NEW)::JSONB
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO audit_logs (
        organization_id, entity_type, entity_id,
        action, description, old_values, new_values
      ) VALUES (
        NEW.organization_id, 'invoice', NEW.id,
        'invoice.' || NEW.status,
        -- BUG FIX: was "|| to '" which is invalid SQL syntax
        'Invoice ' || NEW.invoice_number || ' status changed from ' || OLD.status || ' to ' || NEW.status,
        jsonb_build_object('status', OLD.status, 'amount_paid', OLD.amount_paid),
        jsonb_build_object('status', NEW.status, 'amount_paid', NEW.amount_paid)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_document_version_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO document_versions (
    document_id, organization_id, client_id,
    version_number, s3_key, file_name, original_name,
    mime_type, size_bytes, checksum, uploaded_by
  ) VALUES (
    NEW.id, NEW.organization_id, NEW.client_id,
    1, NEW.s3_key, NEW.file_name, NEW.original_name,
    NEW.mime_type, NEW.size_bytes, NEW.checksum, NEW.uploaded_by
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_document_version_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.s3_key IS DISTINCT FROM OLD.s3_key THEN
    INSERT INTO document_versions (
      document_id, organization_id, client_id,
      version_number, s3_key, file_name, original_name,
      mime_type, size_bytes, checksum, uploaded_by
    ) VALUES (
      NEW.id, NEW.organization_id, NEW.client_id,
      NEW.version, NEW.s3_key, NEW.file_name, NEW.original_name,
      NEW.mime_type, NEW.size_bytes, NEW.checksum, NEW.uploaded_by
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_subscription_sync_to_org()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'active' OR NEW.status = 'trialing' THEN
    UPDATE organizations SET
      current_subscription_id = NEW.id,
      subscription_plan       = CASE NEW.plan
                                  WHEN 'trial' THEN 'starter'
                                  ELSE NEW.plan
                                END,
      updated_at              = NOW()
    WHERE id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_tasks_completed_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_update_invoice_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_invoice_id     UUID;
  v_total_amount   NUMERIC(12,2);
  v_total_paid     NUMERIC(12,2);
  v_new_status     VARCHAR(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT
    i.total_amount,
    COALESCE(SUM(p.amount), 0)
  INTO v_total_amount, v_total_paid
  FROM invoices i
  LEFT JOIN payments p
    ON p.invoice_id = i.id
    AND p.deleted_at IS NULL
  WHERE i.id = v_invoice_id
  GROUP BY i.total_amount;

  IF v_total_paid >= v_total_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    SELECT CASE
      WHEN due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'issued'
    END INTO v_new_status
    FROM invoices WHERE id = v_invoice_id;
  END IF;

  UPDATE invoices SET
    amount_paid = v_total_paid,
    status      = v_new_status,
    paid_at     = CASE
                    WHEN v_new_status = 'paid' AND paid_at IS NULL THEN NOW()
                    ELSE paid_at
                  END,
    updated_at  = NOW()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
;

-- Trigger summary
-- account_groups.prevent_delete_account_groups: BEFORE DELETE EXECUTE FUNCTION prevent_accounting_hard_delete()
-- account_groups.set_updated_at_account_groups: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- accounting_event_outbox.set_updated_at_accounting_event_outbox: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- accounting_posting_batches.set_updated_at_accounting_posting_batches: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- accounting_settings.set_updated_at_accounting_settings: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- accounts.prevent_delete_accounts: BEFORE DELETE EXECUTE FUNCTION prevent_accounting_hard_delete()
-- accounts.set_updated_at_accounts: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- approval_requests.set_updated_at_approval_requests: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- bank_accounts.set_updated_at_bank_accounts: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- branches.set_updated_at_branches: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- clients.set_updated_at_clients: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- cost_centers.set_updated_at_cost_centers: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- customers.set_updated_at_customers: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- documents.document_version_on_insert: AFTER INSERT EXECUTE FUNCTION trigger_document_version_on_insert()
-- documents.document_version_on_update: AFTER UPDATE EXECUTE FUNCTION trigger_document_version_on_update()
-- documents.set_updated_at_documents: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- financial_close_runs.set_updated_at_financial_close_runs: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- fiscal_years.set_updated_at_fiscal_years: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- folders.set_updated_at_folders: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- inventory_transactions.prevent_delete_inventory_transactions: BEFORE DELETE EXECUTE FUNCTION prevent_accounting_hard_delete()
-- inventory_transactions.set_updated_at_inventory_transactions: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- invoice_line_items.set_updated_at_invoice_line_items: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- invoice_number_sequences.set_updated_at_invoice_number_sequences: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- invoices.audit_log_invoices: AFTER INSERT EXECUTE FUNCTION trigger_audit_log_invoices()
-- invoices.audit_log_invoices: AFTER UPDATE EXECUTE FUNCTION trigger_audit_log_invoices()
-- invoices.set_updated_at_invoices: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- journal_entries.assert_journal_balanced_on_status: AFTER INSERT EXECUTE FUNCTION assert_journal_entry_balanced_from_entry()
-- journal_entries.assert_journal_balanced_on_status: AFTER UPDATE EXECUTE FUNCTION assert_journal_entry_balanced_from_entry()
-- journal_entries.prevent_delete_journal_entries: BEFORE DELETE EXECUTE FUNCTION prevent_accounting_hard_delete()
-- journal_entries.set_updated_at_journal_entries: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- journal_entry_lines.assert_journal_balanced_on_lines: AFTER INSERT EXECUTE FUNCTION assert_journal_entry_balanced_from_line()
-- journal_entry_lines.assert_journal_balanced_on_lines: AFTER UPDATE EXECUTE FUNCTION assert_journal_entry_balanced_from_line()
-- journal_entry_lines.prevent_delete_journal_entry_lines: BEFORE DELETE EXECUTE FUNCTION prevent_accounting_hard_delete()
-- ledger_balances.prevent_delete_ledger_balances: BEFORE DELETE EXECUTE FUNCTION prevent_accounting_hard_delete()
-- ledger_balances.set_updated_at_ledger_balances: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- organizations.set_updated_at_organizations: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- payment_allocations.set_updated_at_payment_allocations: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- payments.set_updated_at_payments: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- payments.update_invoice_payment_status: AFTER DELETE EXECUTE FUNCTION trigger_update_invoice_payment_status()
-- payments.update_invoice_payment_status: AFTER INSERT EXECUTE FUNCTION trigger_update_invoice_payment_status()
-- payments.update_invoice_payment_status: AFTER UPDATE EXECUTE FUNCTION trigger_update_invoice_payment_status()
-- period_locks.set_updated_at_period_locks: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- purchases.set_updated_at_purchases: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- reconciliation.prevent_delete_reconciliation: BEFORE DELETE EXECUTE FUNCTION prevent_accounting_hard_delete()
-- reconciliation.set_updated_at_reconciliation: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- reconciliation_lines.set_updated_at_reconciliation_lines: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- recurring_entries.set_updated_at_recurring_entries: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- recurring_invoice_templates.set_updated_at_recurring_invoice_templates: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- service_templates.set_updated_at_service_templates: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- staff_permissions.set_updated_at_staff_permissions: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- stock_valuation.prevent_delete_stock_valuation: BEFORE DELETE EXECUTE FUNCTION prevent_accounting_hard_delete()
-- stock_valuation.set_updated_at_stock_valuation: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- subscriptions.set_updated_at_subscriptions: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- subscriptions.subscription_sync_to_org: AFTER INSERT EXECUTE FUNCTION trigger_subscription_sync_to_org()
-- subscriptions.subscription_sync_to_org: AFTER UPDATE EXECUTE FUNCTION trigger_subscription_sync_to_org()
-- super_admins.set_updated_at_super_admins: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- tasks.set_updated_at_tasks: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- tasks.tasks_completed_at: BEFORE UPDATE EXECUTE FUNCTION trigger_tasks_completed_at()
-- taxes.set_updated_at_taxes: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- users.set_updated_at_users: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- vouchers.prevent_delete_vouchers: BEFORE DELETE EXECUTE FUNCTION prevent_accounting_hard_delete()
-- vouchers.set_updated_at_vouchers: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- whatsapp_message_logs.set_updated_at_whatsapp_message_logs: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()
-- years.set_updated_at_years: BEFORE UPDATE EXECUTE FUNCTION trigger_set_updated_at()