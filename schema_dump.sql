-- AccuDocs AWS FULL Database Schema Dump
-- Generated on: 2026-04-08T05:22:26.386Z
-- DB Host: 16.16.137.174

-- --------------------------------------------------------
-- CUSTOM TYPES (ENUMS)
-- --------------------------------------------------------

CREATE TYPE public."enum_checklist_templates_service_type" AS ENUM ('itr', 'gst', 'audit', 'roc', 'tds', 'custom');
CREATE TYPE public."enum_checklists_status" AS ENUM ('active', 'completed', 'archived');
CREATE TYPE public."enum_client_deadlines_status" AS ENUM ('pending', 'filed', 'overdue');
CREATE TYPE public."enum_compliance_deadlines_type" AS ENUM ('ITR', 'GST', 'TDS', 'ROC', 'ADVANCE_TAX', 'OTHER');
CREATE TYPE public."enum_users_role" AS ENUM ('admin', 'client');

CREATE TABLE public."users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "mobile" VARCHAR(20) NOT NULL,
  "email" VARCHAR(150),
  "password" VARCHAR(255),
  "role" VARCHAR(20) NOT NULL DEFAULT 'client'::character varying,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "avatar_s3_key" VARCHAR(500),
  "last_login_at" TIMESTAMPTZ,
  "otp_attempts" SMALLINT NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMPTZ,
  "preferences" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "mfa_secret" VARCHAR(255),
  "last_login" TIMESTAMPTZ
);

ALTER TABLE public."users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."users" ADD PRIMARY KEY ("id");

-- --------------------------------------------------------

CREATE TABLE public."invoice_line_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "service_template_id" UUID,
  "description" VARCHAR(255) NOT NULL,
  "sac_code" VARCHAR(10) NOT NULL,
  "quantity" NUMERIC NOT NULL DEFAULT 1.00,
  "unit_rate" NUMERIC NOT NULL,
  "amount" NUMERIC,
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES public."invoices"("id");
ALTER TABLE public."invoice_line_items" ADD CONSTRAINT "invoice_line_items_service_template_id_fkey" FOREIGN KEY ("service_template_id") REFERENCES public."service_templates"("id");
ALTER TABLE public."invoice_line_items" ADD PRIMARY KEY ("id");

-- --------------------------------------------------------

CREATE TABLE public."invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "recurring_template_id" UUID,
  "invoice_number" VARCHAR(30) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft'::character varying,
  "invoice_date" DATE NOT NULL,
  "due_date" DATE NOT NULL,
  "issued_at" TIMESTAMPTZ,
  "paid_at" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ,
  "gst_type" VARCHAR(15) NOT NULL DEFAULT 'CGST_SGST'::character varying,
  "place_of_supply" CHARACTER NOT NULL DEFAULT '24'::bpchar,
  "client_gstin" VARCHAR(15),
  "firm_gstin" VARCHAR(15),
  "discount_type" VARCHAR(10),
  "discount_value" NUMERIC NOT NULL DEFAULT 0.00,
  "discount_amount" NUMERIC NOT NULL DEFAULT 0.00,
  "subtotal" NUMERIC NOT NULL DEFAULT 0.00,
  "cgst_amount" NUMERIC NOT NULL DEFAULT 0.00,
  "sgst_amount" NUMERIC NOT NULL DEFAULT 0.00,
  "igst_amount" NUMERIC NOT NULL DEFAULT 0.00,
  "round_off" NUMERIC NOT NULL DEFAULT 0.00,
  "total_amount" NUMERIC NOT NULL DEFAULT 0.00,
  "amount_paid" NUMERIC NOT NULL DEFAULT 0.00,
  "balance_due" NUMERIC,
  "notes" TEXT,
  "cancel_reason" TEXT,
  "internal_notes" TEXT,
  "pdf_s3_key" VARCHAR(500),
  "pdf_generated_at" TIMESTAMPTZ,
  "whatsapp_sent_at" TIMESTAMPTZ,
  "whatsapp_sent_by" UUID,
  "email_sent_at" TIMESTAMPTZ,
  "created_by" UUID NOT NULL,
  "issued_by" UUID,
  "cancelled_by" UUID,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."invoices" ADD CONSTRAINT "fk_invoices_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."invoices" ADD CONSTRAINT "fk_invoices_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."invoices" ADD CONSTRAINT "fk_invoices_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("id");
ALTER TABLE public."invoices" ADD CONSTRAINT "fk_invoices_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."invoices" ADD PRIMARY KEY ("id");
ALTER TABLE public."invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."invoices" ADD CONSTRAINT "invoices_recurring_template_id_fkey" FOREIGN KEY ("recurring_template_id") REFERENCES public."recurring_invoice_templates"("id");
ALTER TABLE public."invoices" ADD CONSTRAINT "invoices_whatsapp_sent_by_fkey" FOREIGN KEY ("whatsapp_sent_by") REFERENCES public."users"("id");
ALTER TABLE public."invoices" ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES public."users"("id");
ALTER TABLE public."invoices" ADD CONSTRAINT "invoices_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES public."users"("id");
ALTER TABLE public."invoices" ADD CONSTRAINT "invoices_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES public."users"("id");

-- --------------------------------------------------------

CREATE TABLE public."otps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "mobile" VARCHAR(20) NOT NULL,
  "otp_hash" VARCHAR(255) NOT NULL,
  "purpose" VARCHAR(30) NOT NULL DEFAULT 'login'::character varying,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "attempts" SMALLINT NOT NULL DEFAULT 0,
  "is_used" BOOLEAN NOT NULL DEFAULT false,
  "ip_address" VARCHAR(45),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."otps" ADD PRIMARY KEY ("id");

-- --------------------------------------------------------

CREATE TABLE public."super_admins" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "email" VARCHAR(150) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMPTZ,
  "last_login_ip" VARCHAR(45),
  "mfa_secret" VARCHAR(100),
  "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "role" VARCHAR(20) NOT NULL DEFAULT 'super_admin'::character varying
);

ALTER TABLE public."super_admins" ADD PRIMARY KEY ("id");

-- --------------------------------------------------------

CREATE TABLE public."client_deadlines" (
  "id" UUID NOT NULL,
  "client_id" UUID,
  "deadline_id" UUID,
  "status" public."enum_client_deadlines_status" NOT NULL DEFAULT 'pending'::enum_client_deadlines_status,
  "filed_date" DATE,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

ALTER TABLE public."client_deadlines" ADD PRIMARY KEY ("id");
ALTER TABLE public."client_deadlines" ADD CONSTRAINT "client_deadlines_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."client_deadlines" ADD CONSTRAINT "client_deadlines_deadline_id_fkey" FOREIGN KEY ("deadline_id") REFERENCES public."compliance_deadlines"("id");

-- --------------------------------------------------------

CREATE TABLE public."compliance_deadlines" (
  "id" UUID NOT NULL,
  "type" public."enum_compliance_deadlines_type" NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "due_date" DATE NOT NULL,
  "recurring" BOOLEAN NOT NULL DEFAULT false,
  "recurring_pattern" VARCHAR(50),
  "description" TEXT,
  "is_seeded" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

ALTER TABLE public."compliance_deadlines" ADD PRIMARY KEY ("id");

-- --------------------------------------------------------

CREATE TABLE public."checklist_templates" (
  "id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "service_type" public."enum_checklist_templates_service_type" NOT NULL,
  "description" TEXT,
  "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

ALTER TABLE public."checklist_templates" ADD PRIMARY KEY ("id");
ALTER TABLE public."checklist_templates" ADD CONSTRAINT "checklist_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES public."users"("id");

-- --------------------------------------------------------

CREATE TABLE public."checklists" (
  "id" UUID NOT NULL,
  "client_id" UUID,
  "template_id" UUID,
  "name" VARCHAR(200) NOT NULL,
  "financial_year" VARCHAR(20) NOT NULL,
  "service_type" VARCHAR(50) NOT NULL,
  "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "progress" DOUBLE PRECISION NOT NULL DEFAULT '0'::double precision,
  "total_items" INTEGER NOT NULL DEFAULT 0,
  "received_items" INTEGER NOT NULL DEFAULT 0,
  "status" public."enum_checklists_status" NOT NULL DEFAULT 'active'::enum_checklists_status,
  "due_date" DATE,
  "completed_at" TIMESTAMPTZ,
  "notes" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "deleted_at" TIMESTAMPTZ
);

ALTER TABLE public."checklists" ADD PRIMARY KEY ("id");
ALTER TABLE public."checklists" ADD CONSTRAINT "checklists_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."checklists" ADD CONSTRAINT "checklists_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES public."checklist_templates"("id");
ALTER TABLE public."checklists" ADD CONSTRAINT "checklists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES public."users"("id");

-- --------------------------------------------------------

CREATE TABLE public."audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "user_id" UUID,
  "action" VARCHAR(80) NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id" UUID,
  "description" TEXT NOT NULL,
  "old_values" JSONB,
  "new_values" JSONB,
  "ip_address" VARCHAR(45),
  "user_agent" VARCHAR(500),
  "request_id" VARCHAR(50),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "super_admin_id" UUID
);

ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES public."super_admins"("id");
ALTER TABLE public."audit_logs" ADD PRIMARY KEY ("id");
ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id");

-- --------------------------------------------------------

CREATE TABLE public."organizations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(150) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "gstin" VARCHAR(15),
  "pan" VARCHAR(10),
  "address" TEXT,
  "state_code" CHARACTER NOT NULL DEFAULT '24'::bpchar,
  "phone" VARCHAR(20),
  "email" VARCHAR(150),
  "logo_s3_key" VARCHAR(500),
  "bank_name" VARCHAR(150),
  "bank_account_number" VARCHAR(30),
  "bank_ifsc" VARCHAR(15),
  "bank_branch" VARCHAR(150),
  "udin" VARCHAR(30),
  "subscription_plan" VARCHAR(20) NOT NULL DEFAULT 'starter'::character varying,
  "trial_ends_at" TIMESTAMPTZ,
  "current_subscription_id" UUID,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "settings" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."organizations" ADD PRIMARY KEY ("id");
ALTER TABLE public."organizations" ADD CONSTRAINT "fk_orgs_current_subscription" FOREIGN KEY ("current_subscription_id") REFERENCES public."subscriptions"("id");

-- --------------------------------------------------------

CREATE TABLE public."tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "client_id" UUID,
  "assigned_to" UUID,
  "created_by" UUID NOT NULL,
  "parent_task_id" UUID,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "priority" VARCHAR(10) NOT NULL DEFAULT 'medium'::character varying,
  "status" VARCHAR(20) NOT NULL DEFAULT 'todo'::character varying,
  "due_date" TIMESTAMPTZ,
  "estimated_hours" NUMERIC,
  "actual_hours" NUMERIC,
  "tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "completed_at" TIMESTAMPTZ,
  "related_invoice_id" UUID,
  "related_document_id" UUID,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."tasks" ADD PRIMARY KEY ("id");
ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES public."users"("id");
ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES public."users"("id");
ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES public."tasks"("id");
ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_related_invoice_id_fkey" FOREIGN KEY ("related_invoice_id") REFERENCES public."invoices"("id");
ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_related_document_id_fkey" FOREIGN KEY ("related_document_id") REFERENCES public."documents"("id");

-- --------------------------------------------------------

CREATE TABLE public."service_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "sac_code" VARCHAR(10) NOT NULL,
  "default_rate" NUMERIC NOT NULL DEFAULT 0.00,
  "default_gst_rate" NUMERIC NOT NULL DEFAULT 18.00,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."service_templates" ADD PRIMARY KEY ("id");
ALTER TABLE public."service_templates" ADD CONSTRAINT "service_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");

-- --------------------------------------------------------

CREATE TABLE public."subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "plan" VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active'::character varying,
  "billing_cycle" VARCHAR(10) NOT NULL DEFAULT 'monthly'::character varying,
  "amount" NUMERIC NOT NULL DEFAULT 0.00,
  "currency" CHARACTER NOT NULL DEFAULT 'INR'::bpchar,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "current_period_start" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "current_period_end" TIMESTAMPTZ NOT NULL,
  "trial_end" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ,
  "cancel_reason" TEXT,
  "payment_gateway" VARCHAR(30),
  "gateway_subscription_id" VARCHAR(100),
  "gateway_customer_id" VARCHAR(100),
  "last_payment_at" TIMESTAMPTZ,
  "last_payment_amount" NUMERIC,
  "next_billing_date" DATE,
  "max_clients" INTEGER NOT NULL DEFAULT 50,
  "max_users" INTEGER NOT NULL DEFAULT 5,
  "max_storage_gb" INTEGER NOT NULL DEFAULT 5,
  "features" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."subscriptions" ADD PRIMARY KEY ("id");
ALTER TABLE public."subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."subscriptions" ADD CONSTRAINT "subscriptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES public."super_admins"("id");

-- --------------------------------------------------------

CREATE TABLE public."clients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "code" VARCHAR(10) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "gstin" VARCHAR(15),
  "pan" VARCHAR(25),
  "mobile" VARCHAR(20),
  "email" VARCHAR(150),
  "address" TEXT,
  "state_code" CHARACTER NOT NULL DEFAULT '24'::bpchar,
  "city" VARCHAR(100),
  "pincode" VARCHAR(20),
  "credit_limit" NUMERIC NOT NULL DEFAULT 0.00,
  "entity_type" VARCHAR(30) NOT NULL DEFAULT 'individual'::character varying,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "location" VARCHAR(255),
  "business_name" VARCHAR(200),
  "industry_sector" VARCHAR(100),
  "incorporation_date" DATE,
  "gst_status" VARCHAR(30),
  "financial_year_end" VARCHAR(50),
  "accounting_method" VARCHAR(30),
  "estimated_turnover" VARCHAR(100),
  "employee_count" VARCHAR(50),
  "identity_proof_url" VARCHAR(512),
  "business_registration_url" VARCHAR(512),
  "tax_card_copy_url" VARCHAR(512),
  "previous_year_return_url" VARCHAR(512),
  "terms_accepted" BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public."clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."clients" ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id");
ALTER TABLE public."clients" ADD PRIMARY KEY ("id");

-- --------------------------------------------------------

CREATE TABLE public."client_access_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "token_hash" VARCHAR(255) NOT NULL,
  "token_type" VARCHAR(20) NOT NULL DEFAULT 'bearer'::character varying,
  "device_name" VARCHAR(100),
  "device_type" VARCHAR(30),
  "ip_address" VARCHAR(45),
  "user_agent" VARCHAR(500),
  "last_used_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "is_revoked" BOOLEAN NOT NULL DEFAULT false,
  "revoked_at" TIMESTAMPTZ,
  "revoked_reason" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."client_access_tokens" ADD PRIMARY KEY ("id");
ALTER TABLE public."client_access_tokens" ADD CONSTRAINT "client_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id");
ALTER TABLE public."client_access_tokens" ADD CONSTRAINT "client_access_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");

-- --------------------------------------------------------

CREATE TABLE public."staff_permissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "permission" VARCHAR(80) NOT NULL,
  "is_granted" BOOLEAN NOT NULL DEFAULT true,
  "granted_by" UUID NOT NULL,
  "notes" TEXT,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."staff_permissions" ADD PRIMARY KEY ("id");
ALTER TABLE public."staff_permissions" ADD CONSTRAINT "staff_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id");
ALTER TABLE public."staff_permissions" ADD CONSTRAINT "staff_permissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."staff_permissions" ADD CONSTRAINT "staff_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES public."users"("id");

-- --------------------------------------------------------

CREATE TABLE public."years" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "year" CHARACTER NOT NULL,
  "label" VARCHAR(20),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."years" ADD CONSTRAINT "fk_years_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."years" ADD CONSTRAINT "fk_years_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."years" ADD CONSTRAINT "fk_years_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("id");
ALTER TABLE public."years" ADD CONSTRAINT "fk_years_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."years" ADD PRIMARY KEY ("id");
ALTER TABLE public."years" ADD CONSTRAINT "years_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."years" ADD CONSTRAINT "years_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");

-- --------------------------------------------------------

CREATE TABLE public."folders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "year_id" UUID,
  "parent_folder_id" UUID,
  "name" VARCHAR(150) NOT NULL,
  "slug" VARCHAR(150) NOT NULL,
  "category" VARCHAR(30),
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."folders" ADD CONSTRAINT "fk_folders_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."folders" ADD CONSTRAINT "fk_folders_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."folders" ADD CONSTRAINT "fk_folders_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("id");
ALTER TABLE public."folders" ADD CONSTRAINT "fk_folders_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."folders" ADD PRIMARY KEY ("id");
ALTER TABLE public."folders" ADD CONSTRAINT "folders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."folders" ADD CONSTRAINT "folders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."folders" ADD CONSTRAINT "folders_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES public."years"("id");
ALTER TABLE public."folders" ADD CONSTRAINT "folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES public."folders"("id");

-- --------------------------------------------------------

CREATE TABLE public."documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "year_id" UUID,
  "folder_id" UUID,
  "uploaded_by" UUID NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "s3_key" VARCHAR(500) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "checksum" VARCHAR(64),
  "is_deleted_from_s3" BOOLEAN NOT NULL DEFAULT false,
  "version" SMALLINT NOT NULL DEFAULT 1,
  "parent_document_id" UUID,
  "tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "description" TEXT,
  "is_shared_with_client" BOOLEAN NOT NULL DEFAULT false,
  "shared_at" TIMESTAMPTZ,
  "whatsapp_sent_at" TIMESTAMPTZ,
  "whatsapp_sent_by" UUID,
  "download_count" INTEGER NOT NULL DEFAULT 0,
  "last_accessed_at" TIMESTAMPTZ,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."documents" ADD CONSTRAINT "fk_documents_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."documents" ADD CONSTRAINT "fk_documents_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."documents" ADD CONSTRAINT "fk_documents_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("id");
ALTER TABLE public."documents" ADD CONSTRAINT "fk_documents_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."documents" ADD CONSTRAINT "fk_documents_folder_org" FOREIGN KEY ("folder_id") REFERENCES public."folders"("id");
ALTER TABLE public."documents" ADD CONSTRAINT "fk_documents_folder_org" FOREIGN KEY ("folder_id") REFERENCES public."folders"("organization_id");
ALTER TABLE public."documents" ADD CONSTRAINT "fk_documents_folder_org" FOREIGN KEY ("organization_id") REFERENCES public."folders"("id");
ALTER TABLE public."documents" ADD CONSTRAINT "fk_documents_folder_org" FOREIGN KEY ("organization_id") REFERENCES public."folders"("organization_id");
ALTER TABLE public."documents" ADD PRIMARY KEY ("id");
ALTER TABLE public."documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."documents" ADD CONSTRAINT "documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."documents" ADD CONSTRAINT "documents_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES public."years"("id");
ALTER TABLE public."documents" ADD CONSTRAINT "documents_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES public."folders"("id");
ALTER TABLE public."documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES public."users"("id");
ALTER TABLE public."documents" ADD CONSTRAINT "documents_parent_document_id_fkey" FOREIGN KEY ("parent_document_id") REFERENCES public."documents"("id");
ALTER TABLE public."documents" ADD CONSTRAINT "documents_whatsapp_sent_by_fkey" FOREIGN KEY ("whatsapp_sent_by") REFERENCES public."users"("id");

-- --------------------------------------------------------

CREATE TABLE public."document_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "version_number" SMALLINT NOT NULL,
  "s3_key" VARCHAR(500) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "checksum" VARCHAR(64),
  "change_summary" TEXT,
  "uploaded_by" UUID NOT NULL,
  "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."document_versions" ADD PRIMARY KEY ("id");
ALTER TABLE public."document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES public."documents"("id");
ALTER TABLE public."document_versions" ADD CONSTRAINT "document_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."document_versions" ADD CONSTRAINT "document_versions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."document_versions" ADD CONSTRAINT "document_versions_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES public."users"("id");

-- --------------------------------------------------------

CREATE TABLE public."whatsapp_message_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID,
  "client_id" UUID,
  "to_mobile" VARCHAR(20) NOT NULL,
  "template_name" VARCHAR(100),
  "message_type" VARCHAR(30) NOT NULL DEFAULT 'text'::character varying,
  "message_body" TEXT,
  "entity_type" VARCHAR(30),
  "entity_id" UUID,
  "provider" VARCHAR(30) NOT NULL DEFAULT 'meta'::character varying,
  "provider_message_id" VARCHAR(200),
  "provider_request_id" VARCHAR(200),
  "status" VARCHAR(20) NOT NULL DEFAULT 'queued'::character varying,
  "failed_reason" TEXT,
  "sent_at" TIMESTAMPTZ,
  "delivered_at" TIMESTAMPTZ,
  "read_at" TIMESTAMPTZ,
  "failed_at" TIMESTAMPTZ,
  "cost_units" NUMERIC,
  "cost_currency" CHARACTER,
  "request_payload" JSONB,
  "response_payload" JSONB,
  "webhook_payload" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."whatsapp_message_logs" ADD PRIMARY KEY ("id");
ALTER TABLE public."whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id");
ALTER TABLE public."whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");

-- --------------------------------------------------------

CREATE TABLE public."recurring_invoice_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "frequency" VARCHAR(20) NOT NULL,
  "next_run_date" DATE NOT NULL,
  "advance_notice_days" SMALLINT NOT NULL DEFAULT 5,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "auto_issue" BOOLEAN NOT NULL DEFAULT false,
  "line_items_snapshot" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "default_notes" TEXT,
  "default_due_days" SMALLINT NOT NULL DEFAULT 30,
  "total_generated" INTEGER NOT NULL DEFAULT 0,
  "last_generated_at" TIMESTAMPTZ,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."recurring_invoice_templates" ADD CONSTRAINT "fk_recurring_templates_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."recurring_invoice_templates" ADD CONSTRAINT "fk_recurring_templates_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."recurring_invoice_templates" ADD CONSTRAINT "fk_recurring_templates_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("id");
ALTER TABLE public."recurring_invoice_templates" ADD CONSTRAINT "fk_recurring_templates_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."recurring_invoice_templates" ADD PRIMARY KEY ("id");
ALTER TABLE public."recurring_invoice_templates" ADD CONSTRAINT "recurring_invoice_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."recurring_invoice_templates" ADD CONSTRAINT "recurring_invoice_templates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");

-- --------------------------------------------------------

CREATE TABLE public."payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "amount" NUMERIC NOT NULL,
  "payment_date" DATE NOT NULL,
  "payment_mode" VARCHAR(30) NOT NULL DEFAULT 'bank_transfer'::character varying,
  "reference_number" VARCHAR(100),
  "notes" TEXT,
  "recorded_by" UUID NOT NULL,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."payments" ADD CONSTRAINT "fk_payments_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."payments" ADD CONSTRAINT "fk_payments_client_org" FOREIGN KEY ("client_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."payments" ADD CONSTRAINT "fk_payments_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("id");
ALTER TABLE public."payments" ADD CONSTRAINT "fk_payments_client_org" FOREIGN KEY ("organization_id") REFERENCES public."clients"("organization_id");
ALTER TABLE public."payments" ADD PRIMARY KEY ("id");
ALTER TABLE public."payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES public."invoices"("id");
ALTER TABLE public."payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");
ALTER TABLE public."payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES public."users"("id");

-- --------------------------------------------------------

CREATE TABLE public."revenue_forecasts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "forecast_date" DATE NOT NULL,
  "period_days" SMALLINT NOT NULL,
  "forecasted_amount" NUMERIC NOT NULL,
  "confidence_score" NUMERIC NOT NULL,
  "historical_component" NUMERIC NOT NULL DEFAULT 0.00,
  "recurring_component" NUMERIC NOT NULL DEFAULT 0.00,
  "outstanding_component" NUMERIC NOT NULL DEFAULT 0.00,
  "calculation_inputs" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."revenue_forecasts" ADD PRIMARY KEY ("id");
ALTER TABLE public."revenue_forecasts" ADD CONSTRAINT "revenue_forecasts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");

-- --------------------------------------------------------

CREATE TABLE public."client_risk_scores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "score" SMALLINT NOT NULL,
  "ltv_segment" VARCHAR(10) NOT NULL DEFAULT 'LOW'::character varying,
  "payment_history_score" SMALLINT NOT NULL DEFAULT 0,
  "overdue_frequency_score" SMALLINT NOT NULL DEFAULT 0,
  "consistency_score" SMALLINT NOT NULL DEFAULT 0,
  "credit_utilization_score" SMALLINT NOT NULL DEFAULT 0,
  "avg_days_to_pay" NUMERIC,
  "overdue_rate_pct" NUMERIC,
  "current_outstanding" NUMERIC,
  "credit_limit_used" NUMERIC,
  "two_year_revenue" NUMERIC,
  "projected_three_year_revenue" NUMERIC,
  "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."client_risk_scores" ADD PRIMARY KEY ("id");
ALTER TABLE public."client_risk_scores" ADD CONSTRAINT "client_risk_scores_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."client_risk_scores" ADD CONSTRAINT "client_risk_scores_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES public."clients"("id");

-- --------------------------------------------------------

CREATE TABLE public."notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID,
  "type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "message" TEXT NOT NULL,
  "channel" VARCHAR(20) NOT NULL DEFAULT 'in_app'::character varying,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "sent_at" TIMESTAMPTZ,
  "delivery_status" VARCHAR(20) NOT NULL DEFAULT 'pending'::character varying,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."notifications" ADD PRIMARY KEY ("id");
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."users"("id");

-- --------------------------------------------------------

CREATE TABLE public."invoice_number_sequences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "financial_year" VARCHAR(10) NOT NULL,
  "last_sequence" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."invoice_number_sequences" ADD PRIMARY KEY ("id");
ALTER TABLE public."invoice_number_sequences" ADD CONSTRAINT "invoice_number_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES public."organizations"("id");

-- --------------------------------------------------------

-- VIEWS
CREATE VIEW public."v_billing_metrics" AS
 SELECT organization_id,
    count(*) AS total_invoices,
    count(*) FILTER (WHERE ((status)::text = 'draft'::text)) AS draft_count,
    COALESCE(sum(total_amount) FILTER (WHERE ((status)::text = 'draft'::text)), (0)::numeric) AS draft_value,
    count(*) FILTER (WHERE ((status)::text = 'issued'::text)) AS issued_count,
    count(*) FILTER (WHERE ((status)::text = 'partially_paid'::text)) AS partially_paid_count,
    count(*) FILTER (WHERE ((status)::text = 'overdue'::text)) AS overdue_count,
    count(*) FILTER (WHERE ((status)::text = 'paid'::text)) AS paid_count,
    COALESCE(sum(balance_due) FILTER (WHERE ((status)::text = ANY ((ARRAY['issued'::character varying, 'partially_paid'::character varying, 'overdue'::character varying])::text[]))), (0)::numeric) AS total_outstanding,
    COALESCE(sum(balance_due) FILTER (WHERE ((status)::text = 'overdue'::text)), (0)::numeric) AS total_overdue,
    COALESCE(sum(total_amount) FILTER (WHERE (((status)::text = 'paid'::text) AND (date_trunc('month'::text, paid_at) = date_trunc('month'::text, now())))), (0)::numeric) AS collected_this_month,
    COALESCE(sum(total_amount) FILTER (WHERE (date_trunc('month'::text, (invoice_date)::timestamp with time zone) = date_trunc('month'::text, now()))), (0)::numeric) AS billed_this_month
   FROM invoices
  WHERE (deleted_at IS NULL)
  GROUP BY organization_id;;

CREATE VIEW public."v_client_summary" AS
 SELECT c.id AS client_id,
    c.organization_id,
    c.code AS client_code,
    c.name AS client_name,
    c.gstin,
    c.pan,
    c.entity_type,
    u.mobile AS client_mobile,
    c.is_active,
    c.credit_limit,
    count(DISTINCT y.id) AS year_count,
    count(DISTINCT d.id) AS document_count,
    count(DISTINCT inv.id) AS invoice_count,
    COALESCE(sum(inv.total_amount) FILTER (WHERE ((inv.status)::text = 'paid'::text)), (0)::numeric) AS total_billed_paid,
    COALESCE(sum(inv.balance_due) FILTER (WHERE ((inv.status)::text = ANY (ARRAY[('issued'::character varying)::text, ('partially_paid'::character varying)::text, ('overdue'::character varying)::text]))), (0)::numeric) AS total_outstanding,
    crs.score AS latest_risk_score,
    crs.ltv_segment,
    crs.calculated_at AS risk_calculated_at,
    c.created_at
   FROM (((((clients c
     JOIN users u ON ((c.user_id = u.id)))
     LEFT JOIN years y ON (((y.client_id = c.id) AND (y.deleted_at IS NULL))))
     LEFT JOIN documents d ON (((d.client_id = c.id) AND (d.deleted_at IS NULL))))
     LEFT JOIN invoices inv ON (((inv.client_id = c.id) AND (inv.deleted_at IS NULL))))
     LEFT JOIN LATERAL ( SELECT client_risk_scores.score,
            client_risk_scores.ltv_segment,
            client_risk_scores.calculated_at
           FROM client_risk_scores
          WHERE (client_risk_scores.client_id = c.id)
          ORDER BY client_risk_scores.calculated_at DESC
         LIMIT 1) crs ON (true))
  WHERE (c.deleted_at IS NULL)
  GROUP BY c.id, c.organization_id, c.code, c.name, c.gstin, c.pan, c.entity_type, u.mobile, c.is_active, c.credit_limit, crs.score, crs.ltv_segment, crs.calculated_at, c.created_at;;

CREATE VIEW public."v_overdue_invoices" AS
 SELECT inv.id AS invoice_id,
    inv.organization_id,
    inv.invoice_number,
    inv.due_date,
    inv.balance_due,
    inv.total_amount,
    inv.whatsapp_sent_at,
    (CURRENT_DATE - inv.due_date) AS days_overdue,
    c.id AS client_id,
    c.name AS client_name,
    c.gstin AS client_gstin,
    u.mobile AS client_mobile,
    crs.ltv_segment
   FROM (((invoices inv
     JOIN clients c ON ((inv.client_id = c.id)))
     JOIN users u ON ((c.user_id = u.id)))
     LEFT JOIN LATERAL ( SELECT client_risk_scores.ltv_segment
           FROM client_risk_scores
          WHERE (client_risk_scores.client_id = c.id)
          ORDER BY client_risk_scores.calculated_at DESC
         LIMIT 1) crs ON (true))
  WHERE (((inv.status)::text = 'overdue'::text) AND (inv.deleted_at IS NULL) AND (c.deleted_at IS NULL))
  ORDER BY (CURRENT_DATE - inv.due_date) DESC;;

CREATE VIEW public."v_recurring_due_today" AS
 SELECT rt.id AS template_id,
    rt.organization_id,
    rt.client_id,
    rt.name AS template_name,
    rt.frequency,
    rt.next_run_date,
    rt.advance_notice_days,
    rt.auto_issue,
    rt.line_items_snapshot,
    rt.default_notes,
    rt.default_due_days,
    c.name AS client_name,
    u.mobile AS client_mobile,
    c.gstin AS client_gstin,
    c.state_code AS client_state_code
   FROM ((recurring_invoice_templates rt
     JOIN clients c ON ((rt.client_id = c.id)))
     JOIN users u ON ((c.user_id = u.id)))
  WHERE ((rt.next_run_date <= CURRENT_DATE) AND (rt.is_active = true) AND (rt.deleted_at IS NULL) AND (c.deleted_at IS NULL));;

CREATE VIEW public."v_dashboard_summary" AS
 SELECT o.id AS organization_id,
    o.name AS organization_name,
    count(DISTINCT c.id) AS total_clients,
    count(DISTINCT c.id) FILTER (WHERE (c.is_active = true)) AS active_clients,
    count(DISTINCT d.id) AS total_documents,
    count(DISTINCT inv.id) AS total_invoices,
    COALESCE(sum(inv.balance_due) FILTER (WHERE ((inv.status)::text = ANY ((ARRAY['issued'::character varying, 'partially_paid'::character varying, 'overdue'::character varying])::text[]))), (0)::numeric) AS outstanding_amount,
    COALESCE(sum(inv.balance_due) FILTER (WHERE ((inv.status)::text = 'overdue'::text)), (0)::numeric) AS overdue_amount,
    COALESCE(sum(inv.total_amount) FILTER (WHERE (((inv.status)::text = 'paid'::text) AND (date_trunc('month'::text, inv.paid_at) = date_trunc('month'::text, now())))), (0)::numeric) AS collected_this_month,
    count(inv.id) FILTER (WHERE ((inv.status)::text = 'draft'::text)) AS draft_invoices,
    count(DISTINCT t.id) FILTER (WHERE ((t.status)::text <> 'done'::text)) AS open_tasks,
    count(DISTINCT t.id) FILTER (WHERE (((t.status)::text <> 'done'::text) AND (t.due_date IS NOT NULL) AND (t.due_date < now()))) AS overdue_tasks
   FROM ((((organizations o
     LEFT JOIN clients c ON (((c.organization_id = o.id) AND (c.deleted_at IS NULL))))
     LEFT JOIN documents d ON (((d.organization_id = o.id) AND (d.deleted_at IS NULL))))
     LEFT JOIN invoices inv ON (((inv.organization_id = o.id) AND (inv.deleted_at IS NULL))))
     LEFT JOIN tasks t ON (((t.organization_id = o.id) AND (t.deleted_at IS NULL))))
  WHERE (o.deleted_at IS NULL)
  GROUP BY o.id, o.name;;

CREATE VIEW public."v_whatsapp_delivery_stats" AS
 SELECT organization_id,
    date_trunc('day'::text, created_at) AS day,
    count(*) AS total_sent,
    count(*) FILTER (WHERE ((status)::text = 'delivered'::text)) AS delivered,
    count(*) FILTER (WHERE ((status)::text = 'read'::text)) AS read,
    count(*) FILTER (WHERE ((status)::text = 'failed'::text)) AS failed,
    round((((count(*) FILTER (WHERE ((status)::text = ANY ((ARRAY['delivered'::character varying, 'read'::character varying])::text[]))))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 1) AS delivery_rate_pct
   FROM whatsapp_message_logs
  GROUP BY organization_id, (date_trunc('day'::text, created_at));;

CREATE VIEW public."v_subscription_status" AS
 SELECT o.id AS organization_id,
    o.name AS organization_name,
    o.subscription_plan,
    s.id AS subscription_id,
    s.plan,
    s.status AS subscription_status,
    s.current_period_end,
    s.trial_end,
    (s.current_period_end - now()) AS time_until_expiry,
        CASE
            WHEN (s.current_period_end < now()) THEN 'expired'::text
            WHEN (s.current_period_end < (now() + '7 days'::interval)) THEN 'expiring_soon'::text
            WHEN ((s.status)::text = 'trialing'::text) THEN 'trial'::text
            ELSE 'healthy'::text
        END AS health_status,
    s.max_clients,
    s.max_users,
    s.max_storage_gb,
    count(DISTINCT c.id) AS current_client_count,
    count(DISTINCT u.id) FILTER (WHERE ((u.role)::text = ANY ((ARRAY['admin'::character varying, 'staff'::character varying])::text[]))) AS current_user_count
   FROM (((organizations o
     LEFT JOIN subscriptions s ON ((s.id = o.current_subscription_id)))
     LEFT JOIN clients c ON (((c.organization_id = o.id) AND (c.deleted_at IS NULL))))
     LEFT JOIN users u ON (((u.organization_id = o.id) AND (u.deleted_at IS NULL))))
  WHERE (o.deleted_at IS NULL)
  GROUP BY o.id, o.name, o.subscription_plan, s.id, s.plan, s.status, s.current_period_end, s.trial_end, s.max_clients, s.max_users, s.max_storage_gb;;

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.digest(text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

CREATE OR REPLACE FUNCTION public.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

CREATE OR REPLACE FUNCTION public.hmac(text, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

CREATE OR REPLACE FUNCTION public.hmac(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

CREATE OR REPLACE FUNCTION public.crypt(text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_crypt$function$
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

CREATE OR REPLACE FUNCTION public.encrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt$function$
;

CREATE OR REPLACE FUNCTION public.decrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$
;

CREATE OR REPLACE FUNCTION public.decrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$
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

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text)
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

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text)
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

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea)
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

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea)
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

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

CREATE OR REPLACE FUNCTION public.pgp_key_id(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_key_id_w$function$
;

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

CREATE OR REPLACE FUNCTION public.dearmor(text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_dearmor$function$
;

CREATE OR REPLACE FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text)
 RETURNS SETOF record
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_armor_headers$function$
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

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
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

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
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

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
;

CREATE OR REPLACE FUNCTION public.gin_btree_consistent(internal, smallint, anyelement, integer, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_btree_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_int2(smallint, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_int2$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_int2(smallint, smallint, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_int2$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_int2(smallint, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_int2$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_int4(integer, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_int4$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_int4(integer, integer, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_int4$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_int4(integer, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_int4$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_int8(bigint, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_int8$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_int8(bigint, bigint, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_int8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_int8(bigint, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_int8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_float4(real, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_float4$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_float4(real, real, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_float4$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_float4(real, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_float4$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_float8(double precision, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_float8$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_float8(double precision, double precision, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_float8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_float8(double precision, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_float8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_money(money, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_money$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_money(money, money, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_money$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_money(money, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_money$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_oid(oid, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_oid$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_oid(oid, oid, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_oid$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_oid(oid, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_oid$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_timestamp(timestamp without time zone, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_timestamp$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_timestamp(timestamp without time zone, timestamp without time zone, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_timestamp$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_timestamp(timestamp without time zone, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_timestamp$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_timestamptz(timestamp with time zone, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_timestamptz$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_timestamptz(timestamp with time zone, timestamp with time zone, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_timestamptz$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_timestamptz(timestamp with time zone, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_timestamptz$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_time(time without time zone, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_time$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_time(time without time zone, time without time zone, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_time$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_time(time without time zone, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_time$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_timetz(time with time zone, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_timetz$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_timetz(time with time zone, time with time zone, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_timetz$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_timetz(time with time zone, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_timetz$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_date(date, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_date$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_date(date, date, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_date$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_date(date, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_date$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_interval(interval, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_interval$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_interval(interval, interval, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_interval$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_interval(interval, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_interval$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_macaddr(macaddr, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_macaddr$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_macaddr(macaddr, macaddr, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_macaddr$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_macaddr(macaddr, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_macaddr$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_inet(inet, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_inet$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_inet(inet, inet, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_inet$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_inet(inet, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_inet$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_cidr(cidr, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_cidr$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_cidr(cidr, cidr, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_cidr$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_cidr(cidr, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_cidr$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_text(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_text$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_text(text, text, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_text$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_text(text, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_text$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_char("char", internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_char$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_char("char", "char", smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_char$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_char("char", internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_char$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_bytea(bytea, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_bytea$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_bytea(bytea, bytea, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_bytea$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_bytea(bytea, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_bytea$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_bit(bit, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_bit$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_bit(bit, bit, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_bit$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_bit(bit, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_bit$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_varbit(bit varying, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_varbit$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_varbit(bit varying, bit varying, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_varbit$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_varbit(bit varying, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_varbit$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_numeric(numeric, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_numeric$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_numeric(numeric, numeric, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_numeric$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_numeric(numeric, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_numeric$function$
;

CREATE OR REPLACE FUNCTION public.gin_numeric_cmp(numeric, numeric)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_numeric_cmp$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_macaddr8(macaddr8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_macaddr8$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_macaddr8(macaddr8, macaddr8, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_macaddr8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_macaddr8(macaddr8, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_macaddr8$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_anyenum(anyenum, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_anyenum$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_anyenum(anyenum, anyenum, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_anyenum$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_anyenum(anyenum, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_anyenum$function$
;

CREATE OR REPLACE FUNCTION public.gin_enum_cmp(anyenum, anyenum)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_enum_cmp$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_uuid(uuid, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_uuid$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_uuid(uuid, uuid, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_uuid$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_uuid(uuid, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_uuid$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_name(name, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_name$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_name(name, name, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_name$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_name(name, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_name$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_bool(boolean, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_bool$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_bool(boolean, boolean, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_bool$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_bool(boolean, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_bool$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_bpchar(character, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_value_bpchar$function$
;

CREATE OR REPLACE FUNCTION public.gin_compare_prefix_bpchar(character, character, smallint, internal)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_compare_prefix_bpchar$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_bpchar(character, internal, smallint, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gin', $function$gin_extract_query_bpchar$function$
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

-- TRIGGERS
CREATE TRIGGER set_updated_at_super_admins BEFORE UPDATE ON public.super_admins FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_organizations BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_subscriptions BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_staff_permissions BEFORE UPDATE ON public.staff_permissions FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_years BEFORE UPDATE ON public.years FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_folders BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_documents BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_whatsapp_message_logs BEFORE UPDATE ON public.whatsapp_message_logs FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_service_templates BEFORE UPDATE ON public.service_templates FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_invoice_number_sequences BEFORE UPDATE ON public.invoice_number_sequences FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_recurring_invoice_templates BEFORE UPDATE ON public.recurring_invoice_templates FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_invoice_line_items BEFORE UPDATE ON public.invoice_line_items FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER tasks_completed_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION trigger_tasks_completed_at();

CREATE TRIGGER update_invoice_payment_status AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION trigger_update_invoice_payment_status();

CREATE TRIGGER audit_log_invoices AFTER INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION trigger_audit_log_invoices();

CREATE TRIGGER document_version_on_update AFTER UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION trigger_document_version_on_update();

CREATE TRIGGER document_version_on_insert AFTER INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION trigger_document_version_on_insert();

CREATE TRIGGER subscription_sync_to_org AFTER INSERT OR UPDATE OF status ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION trigger_subscription_sync_to_org();

