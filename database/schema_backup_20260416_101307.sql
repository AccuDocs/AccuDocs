--
-- PostgreSQL database dump
--

\restrict zbclURhodJlwvhwBBzpV74qclnLbAp2DINJgibjhSider36XSnS2STSfLLFqUWb

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: document_scanner; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA document_scanner;


ALTER SCHEMA document_scanner OWNER TO postgres;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: enum_checklist_templates_service_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_checklist_templates_service_type AS ENUM (
    'itr',
    'gst',
    'audit',
    'roc',
    'tds',
    'custom'
);


ALTER TYPE public.enum_checklist_templates_service_type OWNER TO postgres;

--
-- Name: enum_checklists_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_checklists_status AS ENUM (
    'active',
    'completed',
    'archived'
);


ALTER TYPE public.enum_checklists_status OWNER TO postgres;

--
-- Name: enum_client_deadlines_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_client_deadlines_status AS ENUM (
    'pending',
    'filed',
    'overdue'
);


ALTER TYPE public.enum_client_deadlines_status OWNER TO postgres;

--
-- Name: enum_compliance_deadlines_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_compliance_deadlines_type AS ENUM (
    'ITR',
    'GST',
    'TDS',
    'ROC',
    'ADVANCE_TAX',
    'OTHER'
);


ALTER TYPE public.enum_compliance_deadlines_type OWNER TO postgres;

--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_users_role AS ENUM (
    'admin',
    'client'
);


ALTER TYPE public.enum_users_role OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: document_scanner; Owner: postgres
--

CREATE FUNCTION document_scanner.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION document_scanner.set_updated_at() OWNER TO postgres;

--
-- Name: calculate_financial_year(date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_financial_year(check_date date) RETURNS character
    LANGUAGE plpgsql IMMUTABLE
    AS $$
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
$$;


ALTER FUNCTION public.calculate_financial_year(check_date date) OWNER TO postgres;

--
-- Name: FUNCTION calculate_financial_year(check_date date); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.calculate_financial_year(check_date date) IS 'Returns 4-char FY code (e.g. 2526). Indian FY starts April 1.';


--
-- Name: current_org_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_org_id() RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN current_setting('app.current_org_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$;


ALTER FUNCTION public.current_org_id() OWNER TO postgres;

--
-- Name: get_next_client_code(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_next_client_code(p_org_id uuid) RETURNS character varying
    LANGUAGE plpgsql
    AS $_$
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
$_$;


ALTER FUNCTION public.get_next_client_code(p_org_id uuid) OWNER TO postgres;

--
-- Name: get_next_invoice_number(uuid, character); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_next_invoice_number(p_org_id uuid, p_fy character) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.get_next_invoice_number(p_org_id uuid, p_fy character) OWNER TO postgres;

--
-- Name: FUNCTION get_next_invoice_number(p_org_id uuid, p_fy character); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_next_invoice_number(p_org_id uuid, p_fy character) IS 'Thread-safe invoice number generator. Call inside BEGIN...COMMIT transaction.';


--
-- Name: has_permission(uuid, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_permission(p_user_id uuid, p_permission character varying) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
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
$$;


ALTER FUNCTION public.has_permission(p_user_id uuid, p_permission character varying) OWNER TO postgres;

--
-- Name: FUNCTION has_permission(p_user_id uuid, p_permission character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.has_permission(p_user_id uuid, p_permission character varying) IS 'Returns TRUE if user has permission. Checks staff_permissions overrides first, then role defaults.';


--
-- Name: revoke_expired_tokens(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.revoke_expired_tokens() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.revoke_expired_tokens() OWNER TO postgres;

--
-- Name: FUNCTION revoke_expired_tokens(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.revoke_expired_tokens() IS 'Marks expired tokens as revoked. Run hourly via cron. Returns count of tokens revoked.';


--
-- Name: rls_bypass(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_bypass() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN COALESCE(current_setting('app.bypass_rls', TRUE), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$;


ALTER FUNCTION public.rls_bypass() OWNER TO postgres;

--
-- Name: trigger_audit_log_invoices(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_audit_log_invoices() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_audit_log_invoices() OWNER TO postgres;

--
-- Name: trigger_document_version_on_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_document_version_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_document_version_on_insert() OWNER TO postgres;

--
-- Name: trigger_document_version_on_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_document_version_on_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_document_version_on_update() OWNER TO postgres;

--
-- Name: trigger_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_updated_at() OWNER TO postgres;

--
-- Name: trigger_subscription_sync_to_org(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_subscription_sync_to_org() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_subscription_sync_to_org() OWNER TO postgres;

--
-- Name: trigger_tasks_completed_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_tasks_completed_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_tasks_completed_at() OWNER TO postgres;

--
-- Name: trigger_update_invoice_payment_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_update_invoice_payment_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_update_invoice_payment_status() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: documents; Type: TABLE; Schema: document_scanner; Owner: postgres
--

CREATE TABLE document_scanner.documents (
    id integer NOT NULL,
    organization_id uuid NOT NULL,
    doc_type character varying(20) NOT NULL,
    document_number character varying(100),
    doc_date date,
    vendor_or_customer character varying(255),
    gstin character varying(20),
    subtotal numeric(14,2),
    tax_amount numeric(14,2),
    discount numeric(14,2),
    total_amount numeric(14,2),
    currency character varying(10) DEFAULT 'INR'::character varying,
    payment_mode character varying(50),
    notes text,
    email character varying(255),
    phone character varying(30),
    ocr_confidence smallint,
    s3_url text,
    s3_key text,
    local_path text,
    image_filename character varying(255),
    raw_ocr_text text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT documents_doc_type_check CHECK (((doc_type)::text = ANY ((ARRAY['sale'::character varying, 'purchase'::character varying, 'expense'::character varying])::text[])))
);


ALTER TABLE document_scanner.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: document_scanner; Owner: postgres
--

CREATE SEQUENCE document_scanner.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE document_scanner.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: document_scanner; Owner: postgres
--

ALTER SEQUENCE document_scanner.documents_id_seq OWNED BY document_scanner.documents.id;


--
-- Name: line_items; Type: TABLE; Schema: document_scanner; Owner: postgres
--

CREATE TABLE document_scanner.line_items (
    id integer NOT NULL,
    document_id integer,
    description text NOT NULL,
    quantity numeric(12,3),
    unit_price numeric(14,2),
    amount numeric(14,2),
    hsn_sac_code character varying(20),
    tax_rate_percent numeric(5,2),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE document_scanner.line_items OWNER TO postgres;

--
-- Name: line_items_id_seq; Type: SEQUENCE; Schema: document_scanner; Owner: postgres
--

CREATE SEQUENCE document_scanner.line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE document_scanner.line_items_id_seq OWNER TO postgres;

--
-- Name: line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: document_scanner; Owner: postgres
--

ALTER SEQUENCE document_scanner.line_items_id_seq OWNED BY document_scanner.line_items.id;


--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    action character varying(50) NOT NULL,
    entity_type character varying(30),
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_log OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    user_id uuid,
    action character varying(80) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    description text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent character varying(500),
    request_id character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    super_admin_id uuid
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail. Append-only — never UPDATE or DELETE rows.';


--
-- Name: checklist_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checklist_templates (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    service_type public.enum_checklist_templates_service_type NOT NULL,
    description text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.checklist_templates OWNER TO postgres;

--
-- Name: checklists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checklists (
    id uuid NOT NULL,
    client_id uuid,
    template_id uuid,
    name character varying(200) NOT NULL,
    financial_year character varying(20) NOT NULL,
    service_type character varying(50) NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    progress double precision DEFAULT '0'::double precision NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    received_items integer DEFAULT 0 NOT NULL,
    status public.enum_checklists_status DEFAULT 'active'::public.enum_checklists_status NOT NULL,
    due_date date,
    completed_at timestamp with time zone,
    notes text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.checklists OWNER TO postgres;

--
-- Name: client_access_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_access_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    token_type character varying(20) DEFAULT 'bearer'::character varying NOT NULL,
    device_name character varying(100),
    device_type character varying(30),
    ip_address character varying(45),
    user_agent character varying(500),
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    is_revoked boolean DEFAULT false NOT NULL,
    revoked_at timestamp with time zone,
    revoked_reason character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT client_access_tokens_device_type_check CHECK (((device_type)::text = ANY ((ARRAY['web'::character varying, 'android'::character varying, 'ios'::character varying, 'desktop'::character varying, NULL::character varying])::text[]))),
    CONSTRAINT client_access_tokens_token_type_check CHECK (((token_type)::text = ANY ((ARRAY['bearer'::character varying, 'refresh'::character varying])::text[])))
);


ALTER TABLE public.client_access_tokens OWNER TO postgres;

--
-- Name: TABLE client_access_tokens; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.client_access_tokens IS 'Stateless JWT backing store. token_hash = SHA-256 of the raw token. Supports multi-device and remote revoke.';


--
-- Name: COLUMN client_access_tokens.token_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client_access_tokens.token_hash IS 'Never store raw token. Store SHA-256(token). Verify by hashing the incoming token and comparing.';


--
-- Name: client_deadlines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_deadlines (
    id uuid NOT NULL,
    client_id uuid,
    deadline_id uuid,
    status public.enum_client_deadlines_status DEFAULT 'pending'::public.enum_client_deadlines_status NOT NULL,
    filed_date date,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.client_deadlines OWNER TO postgres;

--
-- Name: client_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    expense_date date NOT NULL,
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    description text NOT NULL,
    vendor_name character varying(200),
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    payment_mode character varying(30) DEFAULT 'cash'::character varying,
    reference_no character varying(50),
    month integer NOT NULL,
    financial_year character varying(9) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gst_applicable boolean DEFAULT false,
    gst_rate numeric(5,2) DEFAULT 0,
    gst_amount numeric(14,2) DEFAULT 0,
    itc_allowed boolean DEFAULT false,
    itc_blocked_reason character varying(100),
    status character varying(20) DEFAULT 'draft'::character varying,
    notes text,
    CONSTRAINT client_expenses_month_check CHECK (((month >= 1) AND (month <= 12)))
);


ALTER TABLE public.client_expenses OWNER TO postgres;

--
-- Name: client_purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    bill_no character varying(50) NOT NULL,
    bill_date date NOT NULL,
    vendor_name character varying(200) NOT NULL,
    description text,
    hsn_sac_code character varying(20),
    quantity numeric(12,3) DEFAULT 1,
    rate numeric(14,2),
    base_amount numeric(14,2) DEFAULT 0 NOT NULL,
    gst_rate numeric(5,2) DEFAULT 18.00 NOT NULL,
    gst_amount numeric(14,2) GENERATED ALWAYS AS (((base_amount * gst_rate) / (100)::numeric)) STORED,
    total_amount numeric(14,2) GENERATED ALWAYS AS ((base_amount + ((base_amount * gst_rate) / (100)::numeric))) STORED,
    month integer NOT NULL,
    financial_year character varying(9) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gstin character varying(15),
    purchase_type character varying(30) DEFAULT 'local'::character varying,
    cgst_amount numeric(14,2) DEFAULT 0,
    sgst_amount numeric(14,2) DEFAULT 0,
    igst_amount numeric(14,2) DEFAULT 0,
    itc_eligible boolean DEFAULT true,
    rcm_applicable boolean DEFAULT false,
    is_capital_goods boolean DEFAULT false,
    status character varying(20) DEFAULT 'draft'::character varying,
    notes text,
    CONSTRAINT client_purchases_month_check CHECK (((month >= 1) AND (month <= 12)))
);


ALTER TABLE public.client_purchases OWNER TO postgres;

--
-- Name: client_sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    invoice_no character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    customer_name character varying(200) NOT NULL,
    description text,
    hsn_sac_code character varying(20),
    quantity numeric(12,3) DEFAULT 1,
    rate numeric(14,2),
    base_amount numeric(14,2) DEFAULT 0 NOT NULL,
    gst_rate numeric(5,2) DEFAULT 18.00 NOT NULL,
    gst_amount numeric(14,2) GENERATED ALWAYS AS (((base_amount * gst_rate) / (100)::numeric)) STORED,
    total_amount numeric(14,2) GENERATED ALWAYS AS ((base_amount + ((base_amount * gst_rate) / (100)::numeric))) STORED,
    month integer NOT NULL,
    financial_year character varying(9) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gstin character varying(15),
    invoice_type character varying(20) DEFAULT 'B2B'::character varying,
    place_of_supply character(2),
    cgst_amount numeric(14,2) DEFAULT 0,
    sgst_amount numeric(14,2) DEFAULT 0,
    igst_amount numeric(14,2) DEFAULT 0,
    cess_amount numeric(14,2) DEFAULT 0,
    is_nil_rated boolean DEFAULT false,
    is_advance boolean DEFAULT false,
    status character varying(20) DEFAULT 'draft'::character varying,
    notes text,
    CONSTRAINT client_sales_month_check CHECK (((month >= 1) AND (month <= 12)))
);


ALTER TABLE public.client_sales OWNER TO postgres;

--
-- Name: client_gst_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.client_gst_summary AS
 SELECT COALESCE(s.client_id, p.client_id) AS client_id,
    COALESCE(s.organization_id, p.organization_id) AS organization_id,
    COALESCE(s.month, p.month) AS month,
    COALESCE(s.financial_year, p.financial_year) AS financial_year,
    COALESCE(s.total_sales, (0)::numeric) AS total_sales,
    COALESCE(s.output_gst, (0)::numeric) AS output_gst,
    COALESCE(s.output_cgst, (0)::numeric) AS output_cgst,
    COALESCE(s.output_sgst, (0)::numeric) AS output_sgst,
    COALESCE(s.output_igst, (0)::numeric) AS output_igst,
    COALESCE(s.b2b_count, (0)::bigint) AS b2b_count,
    COALESCE(s.b2b_value, (0)::numeric) AS b2b_value,
    COALESCE(s.b2c_count, (0)::bigint) AS b2c_count,
    COALESCE(s.b2c_value, (0)::numeric) AS b2c_value,
    COALESCE(s.export_count, (0)::bigint) AS export_count,
    COALESCE(s.export_value, (0)::numeric) AS export_value,
    COALESCE(p.total_purchases, (0)::numeric) AS total_purchases,
    COALESCE(p.input_gst, (0)::numeric) AS input_gst,
    COALESCE(p.input_cgst, (0)::numeric) AS input_cgst,
    COALESCE(p.input_sgst, (0)::numeric) AS input_sgst,
    COALESCE(p.input_igst, (0)::numeric) AS input_igst,
    COALESCE(p.itc_eligible_count, (0)::bigint) AS itc_eligible_count,
    COALESCE(p.itc_eligible_value, (0)::numeric) AS itc_eligible_value,
    COALESCE(p.itc_blocked_count, (0)::bigint) AS itc_blocked_count,
    COALESCE(p.itc_blocked_value, (0)::numeric) AS itc_blocked_value,
    COALESCE(p.rcm_count, (0)::bigint) AS rcm_count,
    COALESCE(p.rcm_value, (0)::numeric) AS rcm_value,
    (COALESCE(s.output_gst, (0)::numeric) - COALESCE(p.input_gst_eligible, (0)::numeric)) AS gst_payable
   FROM (( SELECT client_sales.client_id,
            client_sales.organization_id,
            client_sales.month,
            client_sales.financial_year,
            sum(client_sales.base_amount) AS total_sales,
            sum(client_sales.gst_amount) AS output_gst,
            sum(client_sales.cgst_amount) AS output_cgst,
            sum(client_sales.sgst_amount) AS output_sgst,
            sum(client_sales.igst_amount) AS output_igst,
            count(*) FILTER (WHERE ((client_sales.invoice_type)::text = 'B2B'::text)) AS b2b_count,
            sum(client_sales.base_amount) FILTER (WHERE ((client_sales.invoice_type)::text = 'B2B'::text)) AS b2b_value,
            count(*) FILTER (WHERE ((client_sales.invoice_type)::text = 'B2C'::text)) AS b2c_count,
            sum(client_sales.base_amount) FILTER (WHERE ((client_sales.invoice_type)::text = 'B2C'::text)) AS b2c_value,
            count(*) FILTER (WHERE ((client_sales.invoice_type)::text = 'EXPORT'::text)) AS export_count,
            sum(client_sales.base_amount) FILTER (WHERE ((client_sales.invoice_type)::text = 'EXPORT'::text)) AS export_value
           FROM public.client_sales
          GROUP BY client_sales.client_id, client_sales.organization_id, client_sales.month, client_sales.financial_year) s
     FULL JOIN ( SELECT client_purchases.client_id,
            client_purchases.organization_id,
            client_purchases.month,
            client_purchases.financial_year,
            sum(client_purchases.base_amount) AS total_purchases,
            sum(client_purchases.gst_amount) AS input_gst,
            sum(client_purchases.cgst_amount) AS input_cgst,
            sum(client_purchases.sgst_amount) AS input_sgst,
            sum(client_purchases.igst_amount) AS input_igst,
            sum(client_purchases.gst_amount) FILTER (WHERE ((client_purchases.itc_eligible = true) AND (client_purchases.rcm_applicable = false))) AS input_gst_eligible,
            count(*) FILTER (WHERE (client_purchases.itc_eligible = true)) AS itc_eligible_count,
            sum(client_purchases.base_amount) FILTER (WHERE (client_purchases.itc_eligible = true)) AS itc_eligible_value,
            count(*) FILTER (WHERE (client_purchases.itc_eligible = false)) AS itc_blocked_count,
            sum(client_purchases.base_amount) FILTER (WHERE (client_purchases.itc_eligible = false)) AS itc_blocked_value,
            count(*) FILTER (WHERE (client_purchases.rcm_applicable = true)) AS rcm_count,
            sum(client_purchases.gst_amount) FILTER (WHERE (client_purchases.rcm_applicable = true)) AS rcm_value
           FROM public.client_purchases
          GROUP BY client_purchases.client_id, client_purchases.organization_id, client_purchases.month, client_purchases.financial_year) p ON (((s.client_id = p.client_id) AND (s.organization_id = p.organization_id) AND (s.month = p.month) AND ((s.financial_year)::text = (p.financial_year)::text))));


ALTER VIEW public.client_gst_summary OWNER TO postgres;

--
-- Name: client_risk_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_risk_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    score smallint NOT NULL,
    ltv_segment character varying(10) DEFAULT 'LOW'::character varying NOT NULL,
    payment_history_score smallint DEFAULT 0 NOT NULL,
    overdue_frequency_score smallint DEFAULT 0 NOT NULL,
    consistency_score smallint DEFAULT 0 NOT NULL,
    credit_utilization_score smallint DEFAULT 0 NOT NULL,
    avg_days_to_pay numeric(5,1),
    overdue_rate_pct numeric(5,2),
    current_outstanding numeric(12,2),
    credit_limit_used numeric(12,2),
    two_year_revenue numeric(14,2),
    projected_three_year_revenue numeric(14,2),
    calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT client_risk_scores_ltv_segment_check CHECK (((ltv_segment)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::text[]))),
    CONSTRAINT client_risk_scores_score_check CHECK (((score >= 0) AND (score <= 100)))
);


ALTER TABLE public.client_risk_scores OWNER TO postgres;

--
-- Name: TABLE client_risk_scores; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.client_risk_scores IS 'Immutable risk score snapshots. Insert-only. Score 0=risky, 100=reliable.';


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(150) NOT NULL,
    gstin character varying(15),
    pan character varying(25),
    mobile character varying(20),
    email character varying(150),
    address text,
    state_code character(2) DEFAULT '24'::bpchar NOT NULL,
    city character varying(100),
    pincode character varying(20),
    credit_limit numeric(12,2) DEFAULT 0.00 NOT NULL,
    entity_type character varying(30) DEFAULT 'individual'::character varying NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    location character varying(255),
    business_name character varying(200),
    industry_sector character varying(100),
    incorporation_date date,
    gst_status character varying(30),
    financial_year_end character varying(50),
    accounting_method character varying(30),
    estimated_turnover character varying(100),
    employee_count character varying(50),
    identity_proof_url character varying(512),
    business_registration_url character varying(512),
    tax_card_copy_url character varying(512),
    previous_year_return_url character varying(512),
    terms_accepted boolean DEFAULT false NOT NULL,
    CONSTRAINT clients_credit_limit_check CHECK ((credit_limit >= (0)::numeric)),
    CONSTRAINT clients_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['individual'::character varying, 'proprietorship'::character varying, 'partnership'::character varying, 'pvt_ltd'::character varying, 'llp'::character varying, 'trust'::character varying, 'huf'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: TABLE clients; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.clients IS 'CA firm clients. Root FK for invoices, documents, tasks.';


--
-- Name: COLUMN clients.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.code IS 'Sequential code per org: 001, 002, 003...';


--
-- Name: COLUMN clients.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.metadata IS 'GIN indexed. Store extensible fields without schema change.';


--
-- Name: compliance_deadlines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compliance_deadlines (
    id uuid NOT NULL,
    type public.enum_compliance_deadlines_type NOT NULL,
    title character varying(255) NOT NULL,
    due_date date NOT NULL,
    recurring boolean DEFAULT false NOT NULL,
    recurring_pattern character varying(50),
    description text,
    is_seeded boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.compliance_deadlines OWNER TO postgres;

--
-- Name: data_uploads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    uploaded_by uuid,
    upload_type character varying(20) NOT NULL,
    file_name character varying(255) NOT NULL,
    rows_imported integer DEFAULT 0 NOT NULL,
    rows_failed integer DEFAULT 0 NOT NULL,
    error_log jsonb DEFAULT '[]'::jsonb,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT data_uploads_upload_type_check CHECK (((upload_type)::text = ANY ((ARRAY['sales'::character varying, 'purchases'::character varying, 'expenses'::character varying])::text[])))
);


ALTER TABLE public.data_uploads OWNER TO postgres;

--
-- Name: document_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    version_number smallint NOT NULL,
    s3_key character varying(500) NOT NULL,
    file_name character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    size_bytes bigint NOT NULL,
    checksum character varying(64),
    change_summary text,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_versions OWNER TO postgres;

--
-- Name: TABLE document_versions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.document_versions IS 'Immutable version history. Append-only — never UPDATE or DELETE. version_number mirrors documents.version.';


--
-- Name: COLUMN document_versions.change_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.document_versions.change_summary IS 'Optional note from the uploader: "Updated with signed copy", "Revised FY figures", etc.';


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    year_id uuid,
    folder_id uuid,
    uploaded_by uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    s3_key character varying(500) NOT NULL,
    mime_type character varying(100) NOT NULL,
    size_bytes bigint NOT NULL,
    checksum character varying(64),
    is_deleted_from_s3 boolean DEFAULT false NOT NULL,
    version smallint DEFAULT 1 NOT NULL,
    parent_document_id uuid,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    description text,
    is_shared_with_client boolean DEFAULT false NOT NULL,
    shared_at timestamp with time zone,
    whatsapp_sent_at timestamp with time zone,
    whatsapp_sent_by uuid,
    download_count integer DEFAULT 0 NOT NULL,
    last_accessed_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: TABLE documents; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.documents IS 'File metadata. Binary stored on AWS S3, referenced by s3_key.';


--
-- Name: COLUMN documents.checksum; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documents.checksum IS 'SHA-256 hex of file content. Verify integrity on download.';


--
-- Name: COLUMN documents.is_deleted_from_s3; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.documents.is_deleted_from_s3 IS 'Set TRUE after confirmed S3 deletion. Prevents double-delete attempts on soft-deleted rows.';


--
-- Name: folders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    year_id uuid,
    parent_folder_id uuid,
    name character varying(150) NOT NULL,
    slug character varying(150) NOT NULL,
    category character varying(30),
    is_system boolean DEFAULT false NOT NULL,
    sort_order smallint DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT folders_category_check CHECK (((category)::text = ANY ((ARRAY['gst'::character varying, 'income_tax'::character varying, 'audit'::character varying, 'tds'::character varying, 'roc'::character varying, 'personal'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.folders OWNER TO postgres;

--
-- Name: TABLE folders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.folders IS 'Document folders. is_system=TRUE folders cannot be renamed/deleted by clients.';


--
-- Name: gst_returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gst_returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    return_type character varying(20) NOT NULL,
    period_month integer NOT NULL,
    period_year integer NOT NULL,
    financial_year character varying(9) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    due_date date,
    filed_date date,
    filed_by uuid,
    arn character varying(50),
    json_data jsonb DEFAULT '{}'::jsonb,
    pdf_url character varying(512),
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gst_returns_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT gst_returns_return_type_check CHECK (((return_type)::text = ANY ((ARRAY['GSTR-1'::character varying, 'GSTR-3B'::character varying, 'GSTR-2B'::character varying, 'GSTR-9'::character varying])::text[]))),
    CONSTRAINT gst_returns_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'draft'::character varying, 'validated'::character varying, 'filed'::character varying, 'revised'::character varying])::text[])))
);


ALTER TABLE public.gst_returns OWNER TO postgres;

--
-- Name: invoice_line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    service_template_id uuid,
    description character varying(255) NOT NULL,
    sac_code character varying(10) NOT NULL,
    quantity numeric(8,2) DEFAULT 1.00 NOT NULL,
    unit_rate numeric(10,2) NOT NULL,
    amount numeric(12,2) GENERATED ALWAYS AS ((quantity * unit_rate)) STORED,
    sort_order smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.invoice_line_items OWNER TO postgres;

--
-- Name: TABLE invoice_line_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.invoice_line_items IS 'One row per service on an invoice. amount = qty × rate (generated).';


--
-- Name: invoice_number_sequences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_number_sequences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    financial_year character varying(10) NOT NULL,
    last_sequence integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.invoice_number_sequences OWNER TO postgres;

--
-- Name: TABLE invoice_number_sequences; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.invoice_number_sequences IS 'One row per org per FY. Use SELECT FOR UPDATE to prevent duplicate invoice numbers.';


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    recurring_template_id uuid,
    invoice_number character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    issued_at timestamp with time zone,
    paid_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    gst_type character varying(15) DEFAULT 'CGST_SGST'::character varying NOT NULL,
    place_of_supply character(2) DEFAULT '24'::bpchar NOT NULL,
    client_gstin character varying(15),
    firm_gstin character varying(15),
    discount_type character varying(10),
    discount_value numeric(10,2) DEFAULT 0.00 NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    subtotal numeric(12,2) DEFAULT 0.00 NOT NULL,
    cgst_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    sgst_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    igst_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    round_off numeric(5,2) DEFAULT 0.00 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    amount_paid numeric(12,2) DEFAULT 0.00 NOT NULL,
    balance_due numeric(12,2) GENERATED ALWAYS AS ((total_amount - amount_paid)) STORED,
    notes text,
    cancel_reason text,
    internal_notes text,
    pdf_s3_key character varying(500),
    pdf_generated_at timestamp with time zone,
    whatsapp_sent_at timestamp with time zone,
    whatsapp_sent_by uuid,
    email_sent_at timestamp with time zone,
    created_by uuid NOT NULL,
    issued_by uuid,
    cancelled_by uuid,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoices_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['percent'::character varying, 'flat'::character varying, NULL::character varying])::text[]))),
    CONSTRAINT invoices_gst_type_check CHECK (((gst_type)::text = ANY ((ARRAY['CGST_SGST'::character varying, 'IGST'::character varying])::text[]))),
    CONSTRAINT invoices_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'issued'::character varying, 'partially_paid'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: TABLE invoices; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.invoices IS 'Master invoice record. Central billing entity.';


--
-- Name: COLUMN invoices.discount_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.discount_type IS 'percent = discount_value is %, flat = discount_value is absolute INR amount.';


--
-- Name: COLUMN invoices.balance_due; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.balance_due IS 'Generated column: total_amount - amount_paid. Never update directly.';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    type character varying(50) NOT NULL,
    title character varying(150) NOT NULL,
    message text NOT NULL,
    channel character varying(20) DEFAULT 'in_app'::character varying NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    sent_at timestamp with time zone,
    delivery_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_channel_check CHECK (((channel)::text = ANY ((ARRAY['in_app'::character varying, 'whatsapp'::character varying, 'email'::character varying, 'sms'::character varying])::text[]))),
    CONSTRAINT notifications_delivery_status_check CHECK (((delivery_status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'delivered'::character varying, 'failed'::character varying, 'read'::character varying])::text[]))),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['invoice_issued'::character varying, 'invoice_overdue'::character varying, 'payment_received'::character varying, 'document_shared'::character varying, 'task_assigned'::character varying, 'task_due'::character varying, 'credit_limit_warning'::character varying, 'risk_score_alert'::character varying, 'subscription_expiring'::character varying, 'subscription_expired'::character varying, 'system'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.notifications IS 'Notification log for in-app and WhatsApp delivery.';


--
-- Name: COLUMN notifications.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.type IS 'v2: added subscription_expiring, subscription_expired types.';


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    slug character varying(100) NOT NULL,
    gstin character varying(15),
    pan character varying(10),
    address text,
    state_code character(2) DEFAULT '24'::bpchar NOT NULL,
    phone character varying(20),
    email character varying(150),
    logo_s3_key character varying(500),
    bank_name character varying(150),
    bank_account_number character varying(30),
    bank_ifsc character varying(15),
    bank_branch character varying(150),
    udin character varying(30),
    subscription_plan character varying(20) DEFAULT 'starter'::character varying NOT NULL,
    trial_ends_at timestamp with time zone,
    current_subscription_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organizations_subscription_plan_check CHECK (((subscription_plan)::text = ANY ((ARRAY['trial'::character varying, 'starter'::character varying, 'professional'::character varying, 'enterprise'::character varying])::text[])))
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: TABLE organizations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.organizations IS 'Root multi-tenant entity. One row per CA firm.';


--
-- Name: COLUMN organizations.udin; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.organizations.udin IS 'Unique Document Identification Number for CAs (ICAI requirement)';


--
-- Name: COLUMN organizations.current_subscription_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.organizations.current_subscription_id IS 'Points to active row in subscriptions. Updated by subscription trigger.';


--
-- Name: COLUMN organizations.settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.organizations.settings IS 'Firm config: invoice_prefix, default_due_days, gst_rate, whatsapp_enabled, etc.';


--
-- Name: otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mobile character varying(20) NOT NULL,
    otp_hash character varying(255) NOT NULL,
    purpose character varying(30) DEFAULT 'login'::character varying NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempts smallint DEFAULT 0 NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT otps_purpose_check CHECK (((purpose)::text = ANY ((ARRAY['login'::character varying, 'verify'::character varying, 'reset'::character varying])::text[])))
);


ALTER TABLE public.otps OWNER TO postgres;

--
-- Name: TABLE otps; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.otps IS 'WhatsApp OTP codes. Cleaned hourly. Never store plain OTP.';


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    client_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date date NOT NULL,
    payment_mode character varying(30) DEFAULT 'bank_transfer'::character varying NOT NULL,
    reference_number character varying(100),
    notes text,
    recorded_by uuid NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payments_payment_mode_check CHECK (((payment_mode)::text = ANY ((ARRAY['cash'::character varying, 'cheque'::character varying, 'bank_transfer'::character varying, 'upi'::character varying, 'neft'::character varying, 'rtgs'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: TABLE payments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.payments IS 'Payment records. Each row updates invoice.amount_paid via trigger.';


--
-- Name: COLUMN payments.reference_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.payments.reference_number IS 'UTR number, cheque number, UPI transaction ID, etc.';


--
-- Name: recurring_invoice_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recurring_invoice_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    frequency character varying(20) NOT NULL,
    next_run_date date NOT NULL,
    advance_notice_days smallint DEFAULT 5 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    auto_issue boolean DEFAULT false NOT NULL,
    line_items_snapshot jsonb DEFAULT '[]'::jsonb NOT NULL,
    default_notes text,
    default_due_days smallint DEFAULT 30 NOT NULL,
    total_generated integer DEFAULT 0 NOT NULL,
    last_generated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recurring_invoice_templates_frequency_check CHECK (((frequency)::text = ANY ((ARRAY['MONTHLY'::character varying, 'QUARTERLY'::character varying, 'HALF_YEARLY'::character varying, 'YEARLY'::character varying])::text[])))
);


ALTER TABLE public.recurring_invoice_templates OWNER TO postgres;

--
-- Name: TABLE recurring_invoice_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.recurring_invoice_templates IS 'Auto-generate invoices on schedule. Cron checks next_run_date daily.';


--
-- Name: revenue_forecasts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.revenue_forecasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    forecast_date date NOT NULL,
    period_days smallint NOT NULL,
    forecasted_amount numeric(14,2) NOT NULL,
    confidence_score numeric(4,2) NOT NULL,
    historical_component numeric(14,2) DEFAULT 0.00 NOT NULL,
    recurring_component numeric(14,2) DEFAULT 0.00 NOT NULL,
    outstanding_component numeric(14,2) DEFAULT 0.00 NOT NULL,
    calculation_inputs jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT revenue_forecasts_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))),
    CONSTRAINT revenue_forecasts_period_days_check CHECK ((period_days = ANY (ARRAY[30, 60, 90])))
);


ALTER TABLE public.revenue_forecasts OWNER TO postgres;

--
-- Name: TABLE revenue_forecasts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.revenue_forecasts IS 'Immutable forecast snapshots. Insert-only — never update rows.';


--
-- Name: service_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name character varying(150) NOT NULL,
    description text,
    sac_code character varying(10) NOT NULL,
    default_rate numeric(10,2) DEFAULT 0.00 NOT NULL,
    default_gst_rate numeric(5,2) DEFAULT 18.00 NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order smallint DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.service_templates OWNER TO postgres;

--
-- Name: TABLE service_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.service_templates IS 'Reusable CA service catalogue. is_system=TRUE = global templates.';


--
-- Name: COLUMN service_templates.organization_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.service_templates.organization_id IS 'NULL for system-level global templates.';


--
-- Name: COLUMN service_templates.sac_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.service_templates.sac_code IS 'Service Accounting Code required on GST invoices.';


--
-- Name: staff_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    permission character varying(80) NOT NULL,
    is_granted boolean DEFAULT true NOT NULL,
    granted_by uuid NOT NULL,
    notes text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_permissions OWNER TO postgres;

--
-- Name: TABLE staff_permissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.staff_permissions IS 'Additive/subtractive permission overrides per staff user. Role = default; this table = exceptions.';


--
-- Name: COLUMN staff_permissions.permission; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_permissions.permission IS 'Dot-notated capability string: resource.action. e.g. invoice.delete, report.export, client.view_all';


--
-- Name: COLUMN staff_permissions.is_granted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_permissions.is_granted IS 'TRUE = grant above role default. FALSE = deny even if role allows.';


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    plan character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    billing_cycle character varying(10) DEFAULT 'monthly'::character varying NOT NULL,
    amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    currency character(3) DEFAULT 'INR'::bpchar NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    current_period_start timestamp with time zone DEFAULT now() NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    trial_end timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancel_reason text,
    payment_gateway character varying(30),
    gateway_subscription_id character varying(100),
    gateway_customer_id character varying(100),
    last_payment_at timestamp with time zone,
    last_payment_amount numeric(10,2),
    next_billing_date date,
    max_clients integer DEFAULT 50 NOT NULL,
    max_users integer DEFAULT 5 NOT NULL,
    max_storage_gb integer DEFAULT 5 NOT NULL,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_billing_cycle_check CHECK (((billing_cycle)::text = ANY ((ARRAY['monthly'::character varying, 'annual'::character varying])::text[]))),
    CONSTRAINT subscriptions_payment_gateway_check CHECK (((payment_gateway)::text = ANY ((ARRAY['razorpay'::character varying, 'stripe'::character varying, 'manual'::character varying, NULL::character varying])::text[]))),
    CONSTRAINT subscriptions_plan_check CHECK (((plan)::text = ANY ((ARRAY['trial'::character varying, 'starter'::character varying, 'professional'::character varying, 'enterprise'::character varying])::text[]))),
    CONSTRAINT subscriptions_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'past_due'::character varying, 'cancelled'::character varying, 'expired'::character varying, 'trialing'::character varying])::text[])))
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: TABLE subscriptions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.subscriptions IS 'One active subscription per org. Multiple historical rows allowed. features JSONB stores plan capabilities.';


--
-- Name: COLUMN subscriptions.features; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.subscriptions.features IS 'e.g. {"whatsapp":true,"recurring_invoices":true,"ai_risk_score":false}';


--
-- Name: super_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    last_login_ip character varying(45),
    mfa_secret character varying(100),
    mfa_enabled boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role character varying(20) DEFAULT 'super_admin'::character varying NOT NULL,
    CONSTRAINT super_admins_role_check CHECK (((role)::text = ANY ((ARRAY['super_admin'::character varying, 'read_only_admin'::character varying])::text[])))
);


ALTER TABLE public.super_admins OWNER TO postgres;

--
-- Name: TABLE super_admins; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.super_admins IS 'Platform-level admins. Completely isolated from org-scoped users table. No org FK by design.';


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    client_id uuid,
    assigned_to uuid,
    created_by uuid NOT NULL,
    parent_task_id uuid,
    title character varying(255) NOT NULL,
    description text,
    priority character varying(10) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(20) DEFAULT 'todo'::character varying NOT NULL,
    due_date timestamp with time zone,
    estimated_hours numeric(6,2),
    actual_hours numeric(6,2),
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    completed_at timestamp with time zone,
    related_invoice_id uuid,
    related_document_id uuid,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::text[]))),
    CONSTRAINT tasks_status_check CHECK (((status)::text = ANY ((ARRAY['todo'::character varying, 'in_progress'::character varying, 'review'::character varying, 'done'::character varying])::text[])))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: TABLE tasks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.tasks IS 'Work tracker for CA staff. completed_at auto-set by trigger on status=done.';


--
-- Name: COLUMN tasks.parent_task_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.tasks.parent_task_id IS 'Self-referential for subtasks. Max 1 level of nesting recommended.';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    mobile character varying(20) NOT NULL,
    email character varying(150),
    password character varying(255),
    role character varying(20) DEFAULT 'client'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    avatar_s3_key character varying(500),
    last_login_at timestamp with time zone,
    otp_attempts smallint DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mfa_secret character varying(255),
    last_login timestamp with time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['super_admin'::character varying, 'admin'::character varying, 'staff'::character varying, 'client'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'All authenticated users: admins, staff, and clients.';


--
-- Name: COLUMN users.password; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.password IS 'Nullable — WhatsApp OTP is primary auth method.';


--
-- Name: COLUMN users.otp_attempts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.otp_attempts IS 'Incremented on failed OTP. Reset on success. Lock after 5.';


--
-- Name: COLUMN users.locked_until; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.locked_until IS 'Account locked until this timestamp after too many OTP failures.';


--
-- Name: v_billing_metrics; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_billing_metrics AS
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
   FROM public.invoices
  WHERE (deleted_at IS NULL)
  GROUP BY organization_id;


ALTER VIEW public.v_billing_metrics OWNER TO postgres;

--
-- Name: years; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.years (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    year character(4) NOT NULL,
    label character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.years OWNER TO postgres;

--
-- Name: TABLE years; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.years IS 'Financial year containers per client. e.g. year=2025 = FY 2024-25.';


--
-- Name: v_client_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_client_summary AS
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
   FROM (((((public.clients c
     JOIN public.users u ON ((c.user_id = u.id)))
     LEFT JOIN public.years y ON (((y.client_id = c.id) AND (y.deleted_at IS NULL))))
     LEFT JOIN public.documents d ON (((d.client_id = c.id) AND (d.deleted_at IS NULL))))
     LEFT JOIN public.invoices inv ON (((inv.client_id = c.id) AND (inv.deleted_at IS NULL))))
     LEFT JOIN LATERAL ( SELECT client_risk_scores.score,
            client_risk_scores.ltv_segment,
            client_risk_scores.calculated_at
           FROM public.client_risk_scores
          WHERE (client_risk_scores.client_id = c.id)
          ORDER BY client_risk_scores.calculated_at DESC
         LIMIT 1) crs ON (true))
  WHERE (c.deleted_at IS NULL)
  GROUP BY c.id, c.organization_id, c.code, c.name, c.gstin, c.pan, c.entity_type, u.mobile, c.is_active, c.credit_limit, crs.score, crs.ltv_segment, crs.calculated_at, c.created_at;


ALTER VIEW public.v_client_summary OWNER TO postgres;

--
-- Name: v_dashboard_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_dashboard_summary AS
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
   FROM ((((public.organizations o
     LEFT JOIN public.clients c ON (((c.organization_id = o.id) AND (c.deleted_at IS NULL))))
     LEFT JOIN public.documents d ON (((d.organization_id = o.id) AND (d.deleted_at IS NULL))))
     LEFT JOIN public.invoices inv ON (((inv.organization_id = o.id) AND (inv.deleted_at IS NULL))))
     LEFT JOIN public.tasks t ON (((t.organization_id = o.id) AND (t.deleted_at IS NULL))))
  WHERE (o.deleted_at IS NULL)
  GROUP BY o.id, o.name;


ALTER VIEW public.v_dashboard_summary OWNER TO postgres;

--
-- Name: v_overdue_invoices; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_overdue_invoices AS
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
   FROM (((public.invoices inv
     JOIN public.clients c ON ((inv.client_id = c.id)))
     JOIN public.users u ON ((c.user_id = u.id)))
     LEFT JOIN LATERAL ( SELECT client_risk_scores.ltv_segment
           FROM public.client_risk_scores
          WHERE (client_risk_scores.client_id = c.id)
          ORDER BY client_risk_scores.calculated_at DESC
         LIMIT 1) crs ON (true))
  WHERE (((inv.status)::text = 'overdue'::text) AND (inv.deleted_at IS NULL) AND (c.deleted_at IS NULL))
  ORDER BY (CURRENT_DATE - inv.due_date) DESC;


ALTER VIEW public.v_overdue_invoices OWNER TO postgres;

--
-- Name: v_recurring_due_today; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_recurring_due_today AS
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
   FROM ((public.recurring_invoice_templates rt
     JOIN public.clients c ON ((rt.client_id = c.id)))
     JOIN public.users u ON ((c.user_id = u.id)))
  WHERE ((rt.next_run_date <= CURRENT_DATE) AND (rt.is_active = true) AND (rt.deleted_at IS NULL) AND (c.deleted_at IS NULL));


ALTER VIEW public.v_recurring_due_today OWNER TO postgres;

--
-- Name: v_subscription_status; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_subscription_status AS
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
   FROM (((public.organizations o
     LEFT JOIN public.subscriptions s ON ((s.id = o.current_subscription_id)))
     LEFT JOIN public.clients c ON (((c.organization_id = o.id) AND (c.deleted_at IS NULL))))
     LEFT JOIN public.users u ON (((u.organization_id = o.id) AND (u.deleted_at IS NULL))))
  WHERE (o.deleted_at IS NULL)
  GROUP BY o.id, o.name, o.subscription_plan, s.id, s.plan, s.status, s.current_period_end, s.trial_end, s.max_clients, s.max_users, s.max_storage_gb;


ALTER VIEW public.v_subscription_status OWNER TO postgres;

--
-- Name: whatsapp_message_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_message_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    client_id uuid,
    to_mobile character varying(20) NOT NULL,
    template_name character varying(100),
    message_type character varying(30) DEFAULT 'text'::character varying NOT NULL,
    message_body text,
    entity_type character varying(30),
    entity_id uuid,
    provider character varying(30) DEFAULT 'meta'::character varying NOT NULL,
    provider_message_id character varying(200),
    provider_request_id character varying(200),
    status character varying(20) DEFAULT 'queued'::character varying NOT NULL,
    failed_reason text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    failed_at timestamp with time zone,
    cost_units numeric(8,4),
    cost_currency character(3),
    request_payload jsonb,
    response_payload jsonb,
    webhook_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_message_logs_message_type_check CHECK (((message_type)::text = ANY ((ARRAY['text'::character varying, 'template'::character varying, 'document'::character varying, 'image'::character varying, 'invoice'::character varying, 'otp'::character varying, 'reminder'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT whatsapp_message_logs_provider_check CHECK (((provider)::text = ANY ((ARRAY['meta'::character varying, 'twilio'::character varying, 'gupshup'::character varying, 'wati'::character varying, 'interakt'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT whatsapp_message_logs_status_check CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'sent'::character varying, 'delivered'::character varying, 'read'::character varying, 'failed'::character varying, 'rejected'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.whatsapp_message_logs OWNER TO postgres;

--
-- Name: TABLE whatsapp_message_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.whatsapp_message_logs IS 'Full WhatsApp delivery audit. Append on send, update on webhook. Never delete.';


--
-- Name: COLUMN whatsapp_message_logs.provider_message_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.whatsapp_message_logs.provider_message_id IS 'Unique ID returned by WhatsApp provider. Used to match incoming delivery webhooks.';


--
-- Name: v_whatsapp_delivery_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_whatsapp_delivery_stats AS
 SELECT organization_id,
    date_trunc('day'::text, created_at) AS day,
    count(*) AS total_sent,
    count(*) FILTER (WHERE ((status)::text = 'delivered'::text)) AS delivered,
    count(*) FILTER (WHERE ((status)::text = 'read'::text)) AS read,
    count(*) FILTER (WHERE ((status)::text = 'failed'::text)) AS failed,
    round((((count(*) FILTER (WHERE ((status)::text = ANY ((ARRAY['delivered'::character varying, 'read'::character varying])::text[]))))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 1) AS delivery_rate_pct
   FROM public.whatsapp_message_logs
  GROUP BY organization_id, (date_trunc('day'::text, created_at));


ALTER VIEW public.v_whatsapp_delivery_stats OWNER TO postgres;

--
-- Name: validation_errors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.validation_errors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    error_category character varying(30) DEFAULT 'data'::character varying NOT NULL,
    error_type character varying(50) NOT NULL,
    severity character varying(10) DEFAULT 'warning'::character varying NOT NULL,
    message text NOT NULL,
    entity_type character varying(20) NOT NULL,
    entity_id uuid NOT NULL,
    field_name character varying(50),
    is_resolved boolean DEFAULT false NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_note text,
    financial_year character varying(9) NOT NULL,
    month integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT validation_errors_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['sale'::character varying, 'purchase'::character varying, 'expense'::character varying])::text[]))),
    CONSTRAINT validation_errors_error_category_check CHECK (((error_category)::text = ANY ((ARRAY['data'::character varying, 'compliance'::character varying, 'system'::character varying])::text[]))),
    CONSTRAINT validation_errors_severity_check CHECK (((severity)::text = ANY ((ARRAY['error'::character varying, 'warning'::character varying, 'info'::character varying])::text[])))
);


ALTER TABLE public.validation_errors OWNER TO postgres;

--
-- Name: documents id; Type: DEFAULT; Schema: document_scanner; Owner: postgres
--

ALTER TABLE ONLY document_scanner.documents ALTER COLUMN id SET DEFAULT nextval('document_scanner.documents_id_seq'::regclass);


--
-- Name: line_items id; Type: DEFAULT; Schema: document_scanner; Owner: postgres
--

ALTER TABLE ONLY document_scanner.line_items ALTER COLUMN id SET DEFAULT nextval('document_scanner.line_items_id_seq'::regclass);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: document_scanner; Owner: postgres
--

ALTER TABLE ONLY document_scanner.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: line_items line_items_pkey; Type: CONSTRAINT; Schema: document_scanner; Owner: postgres
--

ALTER TABLE ONLY document_scanner.line_items
    ADD CONSTRAINT line_items_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: checklist_templates checklist_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT checklist_templates_pkey PRIMARY KEY (id);


--
-- Name: checklists checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_pkey PRIMARY KEY (id);


--
-- Name: client_access_tokens client_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_access_tokens
    ADD CONSTRAINT client_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: client_access_tokens client_access_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_access_tokens
    ADD CONSTRAINT client_access_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: client_deadlines client_deadlines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_deadlines
    ADD CONSTRAINT client_deadlines_pkey PRIMARY KEY (id);


--
-- Name: client_expenses client_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_expenses
    ADD CONSTRAINT client_expenses_pkey PRIMARY KEY (id);


--
-- Name: client_purchases client_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_purchases
    ADD CONSTRAINT client_purchases_pkey PRIMARY KEY (id);


--
-- Name: client_risk_scores client_risk_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_risk_scores
    ADD CONSTRAINT client_risk_scores_pkey PRIMARY KEY (id);


--
-- Name: client_sales client_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_sales
    ADD CONSTRAINT client_sales_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: compliance_deadlines compliance_deadlines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compliance_deadlines
    ADD CONSTRAINT compliance_deadlines_pkey PRIMARY KEY (id);


--
-- Name: data_uploads data_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_uploads
    ADD CONSTRAINT data_uploads_pkey PRIMARY KEY (id);


--
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents documents_s3_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_s3_key_key UNIQUE (s3_key);


--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- Name: gst_returns gst_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gst_returns
    ADD CONSTRAINT gst_returns_pkey PRIMARY KEY (id);


--
-- Name: invoice_line_items invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);


--
-- Name: invoice_number_sequences invoice_number_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_number_sequences
    ADD CONSTRAINT invoice_number_sequences_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: otps otps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otps
    ADD CONSTRAINT otps_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: recurring_invoice_templates recurring_invoice_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_invoice_templates
    ADD CONSTRAINT recurring_invoice_templates_pkey PRIMARY KEY (id);


--
-- Name: revenue_forecasts revenue_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revenue_forecasts
    ADD CONSTRAINT revenue_forecasts_pkey PRIMARY KEY (id);


--
-- Name: service_templates service_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_templates
    ADD CONSTRAINT service_templates_pkey PRIMARY KEY (id);


--
-- Name: staff_permissions staff_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: super_admins super_admins_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_email_key UNIQUE (email);


--
-- Name: super_admins super_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: clients uq_clients_id_org; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT uq_clients_id_org UNIQUE (id, organization_id);


--
-- Name: clients uq_clients_org_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT uq_clients_org_code UNIQUE (organization_id, code);


--
-- Name: document_versions uq_doc_version; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT uq_doc_version UNIQUE (document_id, version_number);


--
-- Name: folders uq_folders_id_org; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT uq_folders_id_org UNIQUE (id, organization_id);


--
-- Name: revenue_forecasts uq_forecast_org_date_period; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revenue_forecasts
    ADD CONSTRAINT uq_forecast_org_date_period UNIQUE (organization_id, forecast_date, period_days);


--
-- Name: invoice_number_sequences uq_inv_seq_org_fy; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_number_sequences
    ADD CONSTRAINT uq_inv_seq_org_fy UNIQUE (organization_id, financial_year);


--
-- Name: invoices uq_invoices_org_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT uq_invoices_org_number UNIQUE (organization_id, invoice_number);


--
-- Name: staff_permissions uq_staff_perm_user_permission; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT uq_staff_perm_user_permission UNIQUE (user_id, permission);


--
-- Name: users uq_users_id_org; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_id_org UNIQUE (id, organization_id);


--
-- Name: users uq_users_org_mobile; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_org_mobile UNIQUE (organization_id, mobile);


--
-- Name: years uq_years_client_year; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.years
    ADD CONSTRAINT uq_years_client_year UNIQUE (client_id, year);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: validation_errors validation_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.validation_errors
    ADD CONSTRAINT validation_errors_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_message_logs whatsapp_message_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_message_logs
    ADD CONSTRAINT whatsapp_message_logs_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_message_logs whatsapp_message_logs_provider_message_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_message_logs
    ADD CONSTRAINT whatsapp_message_logs_provider_message_id_key UNIQUE (provider_message_id);


--
-- Name: years years_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.years
    ADD CONSTRAINT years_pkey PRIMARY KEY (id);


--
-- Name: idx_scanner_documents_deleted_at; Type: INDEX; Schema: document_scanner; Owner: postgres
--

CREATE INDEX idx_scanner_documents_deleted_at ON document_scanner.documents USING btree (deleted_at);


--
-- Name: idx_scanner_documents_doc_date; Type: INDEX; Schema: document_scanner; Owner: postgres
--

CREATE INDEX idx_scanner_documents_doc_date ON document_scanner.documents USING btree (doc_date);


--
-- Name: idx_scanner_documents_doc_type; Type: INDEX; Schema: document_scanner; Owner: postgres
--

CREATE INDEX idx_scanner_documents_doc_type ON document_scanner.documents USING btree (doc_type);


--
-- Name: idx_scanner_documents_organization; Type: INDEX; Schema: document_scanner; Owner: postgres
--

CREATE INDEX idx_scanner_documents_organization ON document_scanner.documents USING btree (organization_id);


--
-- Name: idx_scanner_documents_vendor; Type: INDEX; Schema: document_scanner; Owner: postgres
--

CREATE INDEX idx_scanner_documents_vendor ON document_scanner.documents USING btree (vendor_or_customer);


--
-- Name: idx_scanner_line_items_document_id; Type: INDEX; Schema: document_scanner; Owner: postgres
--

CREATE INDEX idx_scanner_line_items_document_id ON document_scanner.line_items USING btree (document_id);


--
-- Name: checklist_templates_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklist_templates_created_by ON public.checklist_templates USING btree (created_by);


--
-- Name: checklist_templates_is_default; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklist_templates_is_default ON public.checklist_templates USING btree (is_default);


--
-- Name: checklist_templates_service_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklist_templates_service_type ON public.checklist_templates USING btree (service_type);


--
-- Name: checklists_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklists_client_id ON public.checklists USING btree (client_id);


--
-- Name: checklists_client_id_financial_year_service_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklists_client_id_financial_year_service_type ON public.checklists USING btree (client_id, financial_year, service_type);


--
-- Name: checklists_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklists_created_by ON public.checklists USING btree (created_by);


--
-- Name: checklists_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklists_due_date ON public.checklists USING btree (due_date);


--
-- Name: checklists_financial_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklists_financial_year ON public.checklists USING btree (financial_year);


--
-- Name: checklists_service_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklists_service_type ON public.checklists USING btree (service_type);


--
-- Name: checklists_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklists_status ON public.checklists USING btree (status);


--
-- Name: checklists_template_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX checklists_template_id ON public.checklists USING btree (template_id);


--
-- Name: client_deadlines_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX client_deadlines_client_id ON public.client_deadlines USING btree (client_id);


--
-- Name: client_deadlines_client_id_deadline_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX client_deadlines_client_id_deadline_id ON public.client_deadlines USING btree (client_id, deadline_id);


--
-- Name: client_deadlines_deadline_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX client_deadlines_deadline_id ON public.client_deadlines USING btree (deadline_id);


--
-- Name: client_deadlines_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX client_deadlines_status ON public.client_deadlines USING btree (status);


--
-- Name: compliance_deadlines_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX compliance_deadlines_due_date ON public.compliance_deadlines USING btree (due_date);


--
-- Name: compliance_deadlines_is_seeded; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX compliance_deadlines_is_seeded ON public.compliance_deadlines USING btree (is_seeded);


--
-- Name: compliance_deadlines_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX compliance_deadlines_type ON public.compliance_deadlines USING btree (type);


--
-- Name: idx_activity_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_client ON public.activity_log USING btree (client_id);


--
-- Name: idx_activity_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_created ON public.activity_log USING btree (client_id, created_at DESC);


--
-- Name: idx_audit_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_entity_id ON public.audit_logs USING btree (entity_id) WHERE (entity_id IS NOT NULL);


--
-- Name: idx_audit_org_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_org_entity ON public.audit_logs USING btree (organization_id, entity_type, entity_id);


--
-- Name: idx_audit_super_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_super_admin_id ON public.audit_logs USING btree (super_admin_id);


--
-- Name: idx_audit_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_cat_expires_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cat_expires_active ON public.client_access_tokens USING btree (expires_at) WHERE (is_revoked = false);


--
-- Name: idx_cat_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cat_org_id ON public.client_access_tokens USING btree (organization_id);


--
-- Name: idx_cat_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cat_token_hash ON public.client_access_tokens USING btree (token_hash);


--
-- Name: idx_cat_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cat_user_id ON public.client_access_tokens USING btree (user_id);


--
-- Name: idx_clients_gstin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_gstin ON public.clients USING btree (gstin) WHERE (gstin IS NOT NULL);


--
-- Name: idx_clients_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_is_active ON public.clients USING btree (is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_clients_metadata; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_metadata ON public.clients USING gin (metadata);


--
-- Name: idx_clients_mobile_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_mobile_trgm ON public.clients USING gin (mobile public.gin_trgm_ops) WHERE (mobile IS NOT NULL);


--
-- Name: idx_clients_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_name_trgm ON public.clients USING gin (name public.gin_trgm_ops);


--
-- Name: idx_clients_org_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_org_active ON public.clients USING btree (organization_id, is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_clients_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_org_id ON public.clients USING btree (organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_clients_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_user_id ON public.clients USING btree (user_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_crs_client_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crs_client_date ON public.client_risk_scores USING btree (client_id, calculated_at DESC);


--
-- Name: idx_crs_ltv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crs_ltv ON public.client_risk_scores USING btree (ltv_segment);


--
-- Name: idx_crs_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crs_org_id ON public.client_risk_scores USING btree (organization_id);


--
-- Name: idx_crs_score; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_crs_score ON public.client_risk_scores USING btree (score);


--
-- Name: idx_docs_checksum; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docs_checksum ON public.documents USING btree (checksum) WHERE (checksum IS NOT NULL);


--
-- Name: idx_docs_client_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docs_client_year ON public.documents USING btree (client_id, year_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_docs_folder_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docs_folder_id ON public.documents USING btree (folder_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_docs_org_uploader; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docs_org_uploader ON public.documents USING btree (organization_id, uploaded_by) WHERE (deleted_at IS NULL);


--
-- Name: idx_docs_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docs_parent ON public.documents USING btree (parent_document_id) WHERE (parent_document_id IS NOT NULL);


--
-- Name: idx_docs_s3_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docs_s3_key ON public.documents USING btree (s3_key);


--
-- Name: idx_docs_shared; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docs_shared ON public.documents USING btree (is_shared_with_client) WHERE ((deleted_at IS NULL) AND (is_shared_with_client = true));


--
-- Name: idx_docs_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docs_tags ON public.documents USING gin (tags);


--
-- Name: idx_dv_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dv_client_id ON public.document_versions USING btree (client_id);


--
-- Name: idx_dv_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dv_document_id ON public.document_versions USING btree (document_id);


--
-- Name: idx_dv_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dv_org_id ON public.document_versions USING btree (organization_id);


--
-- Name: idx_dv_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dv_uploaded_by ON public.document_versions USING btree (uploaded_by);


--
-- Name: idx_expenses_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_client ON public.client_expenses USING btree (client_id);


--
-- Name: idx_expenses_client_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_client_month ON public.client_expenses USING btree (client_id, month, financial_year);


--
-- Name: idx_folders_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_folders_client_id ON public.folders USING btree (client_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_folders_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_folders_org_id ON public.folders USING btree (organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_folders_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_folders_parent ON public.folders USING btree (parent_folder_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_folders_year_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_folders_year_id ON public.folders USING btree (year_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_gst_returns_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gst_returns_client ON public.gst_returns USING btree (client_id);


--
-- Name: idx_gst_returns_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gst_returns_period ON public.gst_returns USING btree (client_id, return_type, period_month, period_year);


--
-- Name: idx_inv_client_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_client_status ON public.invoices USING btree (client_id, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_inv_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_due_date ON public.invoices USING btree (due_date) WHERE (deleted_at IS NULL);


--
-- Name: idx_inv_invoice_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_invoice_date ON public.invoices USING btree (invoice_date) WHERE (deleted_at IS NULL);


--
-- Name: idx_inv_org_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_org_client ON public.invoices USING btree (organization_id, client_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_inv_overdue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_overdue ON public.invoices USING btree (due_date, status) WHERE (((status)::text = ANY ((ARRAY['issued'::character varying, 'partially_paid'::character varying])::text[])) AND (deleted_at IS NULL));


--
-- Name: idx_inv_recurring; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_recurring ON public.invoices USING btree (recurring_template_id) WHERE (recurring_template_id IS NOT NULL);


--
-- Name: idx_inv_seq_org_fy; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_seq_org_fy ON public.invoice_number_sequences USING btree (organization_id, financial_year);


--
-- Name: idx_inv_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inv_status ON public.invoices USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_line_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_line_invoice_id ON public.invoice_line_items USING btree (invoice_id);


--
-- Name: idx_line_template_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_line_template_id ON public.invoice_line_items USING btree (service_template_id) WHERE (service_template_id IS NOT NULL);


--
-- Name: idx_notif_org_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_org_type ON public.notifications USING btree (organization_id, type);


--
-- Name: idx_notif_sent_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_sent_at ON public.notifications USING btree (sent_at);


--
-- Name: idx_notif_user_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_user_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_orgs_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orgs_is_active ON public.organizations USING btree (is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_orgs_pan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orgs_pan ON public.organizations USING btree (pan) WHERE (pan IS NOT NULL);


--
-- Name: idx_orgs_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orgs_slug ON public.organizations USING btree (slug) WHERE (deleted_at IS NULL);


--
-- Name: idx_orgs_subscription; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orgs_subscription ON public.organizations USING btree (current_subscription_id) WHERE (current_subscription_id IS NOT NULL);


--
-- Name: idx_orgs_trial_ends; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orgs_trial_ends ON public.organizations USING btree (trial_ends_at) WHERE ((trial_ends_at IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: idx_otps_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_otps_expires_at ON public.otps USING btree (expires_at);


--
-- Name: idx_otps_mobile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_otps_mobile ON public.otps USING btree (mobile);


--
-- Name: idx_otps_mobile_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_otps_mobile_active ON public.otps USING btree (mobile, is_used, expires_at) WHERE (is_used = false);


--
-- Name: idx_pay_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pay_client_id ON public.payments USING btree (client_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_pay_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pay_date ON public.payments USING btree (payment_date) WHERE (deleted_at IS NULL);


--
-- Name: idx_pay_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pay_invoice_id ON public.payments USING btree (invoice_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_pay_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pay_org_id ON public.payments USING btree (organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchases_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchases_client ON public.client_purchases USING btree (client_id);


--
-- Name: idx_purchases_client_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchases_client_month ON public.client_purchases USING btree (client_id, month, financial_year);


--
-- Name: idx_rec_active_due; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rec_active_due ON public.recurring_invoice_templates USING btree (next_run_date) WHERE ((is_active = true) AND (deleted_at IS NULL));


--
-- Name: idx_rec_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rec_client_id ON public.recurring_invoice_templates USING btree (client_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_rec_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rec_org_id ON public.recurring_invoice_templates USING btree (organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_rf_org_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rf_org_date ON public.revenue_forecasts USING btree (organization_id, forecast_date DESC);


--
-- Name: idx_rf_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rf_org_id ON public.revenue_forecasts USING btree (organization_id);


--
-- Name: idx_sales_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_client ON public.client_sales USING btree (client_id);


--
-- Name: idx_sales_client_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sales_client_month ON public.client_sales USING btree (client_id, month, financial_year);


--
-- Name: idx_sp_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sp_org_id ON public.staff_permissions USING btree (organization_id);


--
-- Name: idx_sp_permission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sp_permission ON public.staff_permissions USING btree (permission);


--
-- Name: idx_sp_user_granted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sp_user_granted ON public.staff_permissions USING btree (user_id, is_granted);


--
-- Name: idx_sp_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sp_user_id ON public.staff_permissions USING btree (user_id);


--
-- Name: idx_subs_gateway_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subs_gateway_id ON public.subscriptions USING btree (gateway_subscription_id) WHERE (gateway_subscription_id IS NOT NULL);


--
-- Name: idx_subs_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subs_org_id ON public.subscriptions USING btree (organization_id);


--
-- Name: idx_subs_period_end; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subs_period_end ON public.subscriptions USING btree (current_period_end) WHERE ((status)::text = ANY ((ARRAY['active'::character varying, 'trialing'::character varying])::text[]));


--
-- Name: idx_subs_plan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subs_plan ON public.subscriptions USING btree (plan);


--
-- Name: idx_subs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subs_status ON public.subscriptions USING btree (status);


--
-- Name: idx_super_admins_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admins_active ON public.super_admins USING btree (is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_super_admins_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admins_email ON public.super_admins USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_svc_tmpl_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_svc_tmpl_active ON public.service_templates USING btree (is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_svc_tmpl_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_svc_tmpl_org_id ON public.service_templates USING btree (organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_svc_tmpl_sac; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_svc_tmpl_sac ON public.service_templates USING btree (sac_code);


--
-- Name: idx_tasks_assigned_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_assigned_status ON public.tasks USING btree (assigned_to, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_client_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_client_status ON public.tasks USING btree (client_id, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date) WHERE ((deleted_at IS NULL) AND ((status)::text <> 'done'::text));


--
-- Name: idx_tasks_org_assigned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_org_assigned ON public.tasks USING btree (organization_id, assigned_to) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_org_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_org_client ON public.tasks USING btree (organization_id, client_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_parent ON public.tasks USING btree (parent_task_id) WHERE (parent_task_id IS NOT NULL);


--
-- Name: idx_tasks_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_priority_due; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_priority_due ON public.tasks USING btree (priority, due_date) WHERE ((deleted_at IS NULL) AND ((status)::text <> 'done'::text));


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_tags ON public.tasks USING gin (tags);


--
-- Name: idx_uploads_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_uploads_client ON public.data_uploads USING btree (client_id);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_locked; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_locked ON public.users USING btree (locked_until) WHERE (locked_until IS NOT NULL);


--
-- Name: idx_users_mobile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_mobile ON public.users USING btree (mobile) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_org_id ON public.users USING btree (organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role) WHERE (deleted_at IS NULL);


--
-- Name: idx_val_errors_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_val_errors_client ON public.validation_errors USING btree (client_id);


--
-- Name: idx_val_errors_unresolved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_val_errors_unresolved ON public.validation_errors USING btree (client_id, is_resolved) WHERE (NOT is_resolved);


--
-- Name: idx_wml_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wml_client_id ON public.whatsapp_message_logs USING btree (client_id) WHERE (client_id IS NOT NULL);


--
-- Name: idx_wml_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wml_created_at ON public.whatsapp_message_logs USING btree (created_at DESC);


--
-- Name: idx_wml_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wml_entity ON public.whatsapp_message_logs USING btree (entity_type, entity_id) WHERE (entity_id IS NOT NULL);


--
-- Name: idx_wml_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wml_org_id ON public.whatsapp_message_logs USING btree (organization_id);


--
-- Name: idx_wml_provider_msg_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wml_provider_msg_id ON public.whatsapp_message_logs USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL);


--
-- Name: idx_wml_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wml_status ON public.whatsapp_message_logs USING btree (status);


--
-- Name: idx_wml_to_mobile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wml_to_mobile ON public.whatsapp_message_logs USING btree (to_mobile);


--
-- Name: idx_years_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_years_client_id ON public.years USING btree (client_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_years_org_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_years_org_id ON public.years USING btree (organization_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_years_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_years_year ON public.years USING btree (year) WHERE (deleted_at IS NULL);


--
-- Name: documents set_updated_at_documents; Type: TRIGGER; Schema: document_scanner; Owner: postgres
--

CREATE TRIGGER set_updated_at_documents BEFORE UPDATE ON document_scanner.documents FOR EACH ROW EXECUTE FUNCTION document_scanner.set_updated_at();


--
-- Name: invoices audit_log_invoices; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_log_invoices AFTER INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log_invoices();


--
-- Name: documents document_version_on_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER document_version_on_insert AFTER INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.trigger_document_version_on_insert();


--
-- Name: documents document_version_on_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER document_version_on_update AFTER UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.trigger_document_version_on_update();


--
-- Name: clients set_updated_at_clients; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: documents set_updated_at_documents; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_documents BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: folders set_updated_at_folders; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_folders BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: invoice_line_items set_updated_at_invoice_line_items; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_invoice_line_items BEFORE UPDATE ON public.invoice_line_items FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: invoice_number_sequences set_updated_at_invoice_number_sequences; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_invoice_number_sequences BEFORE UPDATE ON public.invoice_number_sequences FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: invoices set_updated_at_invoices; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: organizations set_updated_at_organizations; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_organizations BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: payments set_updated_at_payments; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: recurring_invoice_templates set_updated_at_recurring_invoice_templates; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_recurring_invoice_templates BEFORE UPDATE ON public.recurring_invoice_templates FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: service_templates set_updated_at_service_templates; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_service_templates BEFORE UPDATE ON public.service_templates FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: staff_permissions set_updated_at_staff_permissions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_staff_permissions BEFORE UPDATE ON public.staff_permissions FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: subscriptions set_updated_at_subscriptions; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_subscriptions BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: super_admins set_updated_at_super_admins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_super_admins BEFORE UPDATE ON public.super_admins FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: tasks set_updated_at_tasks; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: users set_updated_at_users; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: whatsapp_message_logs set_updated_at_whatsapp_message_logs; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_whatsapp_message_logs BEFORE UPDATE ON public.whatsapp_message_logs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: years set_updated_at_years; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_updated_at_years BEFORE UPDATE ON public.years FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: subscriptions subscription_sync_to_org; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER subscription_sync_to_org AFTER INSERT OR UPDATE OF status ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.trigger_subscription_sync_to_org();


--
-- Name: tasks tasks_completed_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tasks_completed_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.trigger_tasks_completed_at();


--
-- Name: payments update_invoice_payment_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_invoice_payment_status AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.trigger_update_invoice_payment_status();


--
-- Name: line_items line_items_document_id_fkey; Type: FK CONSTRAINT; Schema: document_scanner; Owner: postgres
--

ALTER TABLE ONLY document_scanner.line_items
    ADD CONSTRAINT line_items_document_id_fkey FOREIGN KEY (document_id) REFERENCES document_scanner.documents(id) ON DELETE CASCADE;


--
-- Name: activity_log activity_log_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: activity_log activity_log_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: activity_log activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audit_logs audit_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_super_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_super_admin_id_fkey FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: checklist_templates checklist_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT checklist_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: checklists checklists_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: checklists checklists_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: checklists checklists_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.checklist_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: client_access_tokens client_access_tokens_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_access_tokens
    ADD CONSTRAINT client_access_tokens_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: client_access_tokens client_access_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_access_tokens
    ADD CONSTRAINT client_access_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_deadlines client_deadlines_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_deadlines
    ADD CONSTRAINT client_deadlines_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: client_deadlines client_deadlines_deadline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_deadlines
    ADD CONSTRAINT client_deadlines_deadline_id_fkey FOREIGN KEY (deadline_id) REFERENCES public.compliance_deadlines(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: client_expenses client_expenses_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_expenses
    ADD CONSTRAINT client_expenses_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_expenses client_expenses_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_expenses
    ADD CONSTRAINT client_expenses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: client_purchases client_purchases_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_purchases
    ADD CONSTRAINT client_purchases_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_purchases client_purchases_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_purchases
    ADD CONSTRAINT client_purchases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: client_risk_scores client_risk_scores_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_risk_scores
    ADD CONSTRAINT client_risk_scores_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_risk_scores client_risk_scores_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_risk_scores
    ADD CONSTRAINT client_risk_scores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: client_sales client_sales_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_sales
    ADD CONSTRAINT client_sales_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_sales client_sales_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_sales
    ADD CONSTRAINT client_sales_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: clients clients_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: clients clients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE;


--
-- Name: data_uploads data_uploads_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_uploads
    ADD CONSTRAINT data_uploads_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: data_uploads data_uploads_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_uploads
    ADD CONSTRAINT data_uploads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: data_uploads data_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_uploads
    ADD CONSTRAINT data_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: document_versions document_versions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_versions document_versions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: document_versions document_versions_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: documents documents_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: documents documents_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE SET NULL;


--
-- Name: documents documents_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: documents documents_parent_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_parent_document_id_fkey FOREIGN KEY (parent_document_id) REFERENCES public.documents(id);


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: documents documents_whatsapp_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_whatsapp_sent_by_fkey FOREIGN KEY (whatsapp_sent_by) REFERENCES public.users(id);


--
-- Name: documents documents_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_year_id_fkey FOREIGN KEY (year_id) REFERENCES public.years(id) ON DELETE SET NULL;


--
-- Name: documents fk_documents_client_org; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT fk_documents_client_org FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id) ON DELETE CASCADE;


--
-- Name: documents fk_documents_folder_org; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT fk_documents_folder_org FOREIGN KEY (folder_id, organization_id) REFERENCES public.folders(id, organization_id) ON DELETE SET NULL;


--
-- Name: folders fk_folders_client_org; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT fk_folders_client_org FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id) ON DELETE CASCADE;


--
-- Name: invoices fk_invoices_client_org; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_invoices_client_org FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id);


--
-- Name: organizations fk_orgs_current_subscription; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT fk_orgs_current_subscription FOREIGN KEY (current_subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;


--
-- Name: payments fk_payments_client_org; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_client_org FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id) ON DELETE CASCADE;


--
-- Name: recurring_invoice_templates fk_recurring_templates_client_org; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_invoice_templates
    ADD CONSTRAINT fk_recurring_templates_client_org FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id) ON DELETE CASCADE;


--
-- Name: years fk_years_client_org; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.years
    ADD CONSTRAINT fk_years_client_org FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id) ON DELETE CASCADE;


--
-- Name: folders folders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: folders folders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: folders folders_parent_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.folders(id) ON DELETE CASCADE;


--
-- Name: folders folders_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_year_id_fkey FOREIGN KEY (year_id) REFERENCES public.years(id) ON DELETE CASCADE;


--
-- Name: gst_returns gst_returns_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gst_returns
    ADD CONSTRAINT gst_returns_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: gst_returns gst_returns_filed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gst_returns
    ADD CONSTRAINT gst_returns_filed_by_fkey FOREIGN KEY (filed_by) REFERENCES public.users(id);


--
-- Name: gst_returns gst_returns_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gst_returns
    ADD CONSTRAINT gst_returns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: invoice_line_items invoice_line_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoice_line_items invoice_line_items_service_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_service_template_id_fkey FOREIGN KEY (service_template_id) REFERENCES public.service_templates(id) ON DELETE SET NULL;


--
-- Name: invoice_number_sequences invoice_number_sequences_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_number_sequences
    ADD CONSTRAINT invoice_number_sequences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_recurring_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_recurring_template_id_fkey FOREIGN KEY (recurring_template_id) REFERENCES public.recurring_invoice_templates(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_whatsapp_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_whatsapp_sent_by_fkey FOREIGN KEY (whatsapp_sent_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE RESTRICT;


--
-- Name: payments payments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: payments payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: recurring_invoice_templates recurring_invoice_templates_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_invoice_templates
    ADD CONSTRAINT recurring_invoice_templates_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: recurring_invoice_templates recurring_invoice_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_invoice_templates
    ADD CONSTRAINT recurring_invoice_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: revenue_forecasts revenue_forecasts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revenue_forecasts
    ADD CONSTRAINT revenue_forecasts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: service_templates service_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_templates
    ADD CONSTRAINT service_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: staff_permissions staff_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: staff_permissions staff_permissions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: staff_permissions staff_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.super_admins(id) ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: tasks tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_related_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_related_document_id_fkey FOREIGN KEY (related_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_related_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_related_invoice_id_fkey FOREIGN KEY (related_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: validation_errors validation_errors_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.validation_errors
    ADD CONSTRAINT validation_errors_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: validation_errors validation_errors_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.validation_errors
    ADD CONSTRAINT validation_errors_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: validation_errors validation_errors_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.validation_errors
    ADD CONSTRAINT validation_errors_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: whatsapp_message_logs whatsapp_message_logs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_message_logs
    ADD CONSTRAINT whatsapp_message_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: whatsapp_message_logs whatsapp_message_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_message_logs
    ADD CONSTRAINT whatsapp_message_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_message_logs whatsapp_message_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_message_logs
    ADD CONSTRAINT whatsapp_message_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: years years_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.years
    ADD CONSTRAINT years_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: years years_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.years
    ADD CONSTRAINT years_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: client_access_tokens; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_access_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: client_risk_scores; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_risk_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: document_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: folders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_line_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_number_sequences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invoice_number_sequences ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: otps; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_invoice_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.recurring_invoice_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: revenue_forecasts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.revenue_forecasts ENABLE ROW LEVEL SECURITY;

--
-- Name: client_access_tokens rls_cat_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_cat_org ON public.client_access_tokens USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: clients rls_clients_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_clients_org ON public.clients USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: client_risk_scores rls_crs_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_crs_org ON public.client_risk_scores USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: document_versions rls_document_versions_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_document_versions_org ON public.document_versions USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: documents rls_documents_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_documents_org ON public.documents USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: folders rls_folders_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_folders_org ON public.folders USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: invoice_number_sequences rls_inv_seq_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_inv_seq_org ON public.invoice_number_sequences USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: invoices rls_invoices_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_invoices_org ON public.invoices USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: invoice_line_items rls_line_items_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_line_items_org ON public.invoice_line_items USING ((public.rls_bypass() OR (EXISTS ( SELECT 1
   FROM public.invoices i
  WHERE ((i.id = invoice_line_items.invoice_id) AND (i.organization_id = public.current_org_id()))))));


--
-- Name: notifications rls_notifications_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_notifications_org ON public.notifications USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: organizations rls_organizations_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_organizations_org ON public.organizations USING ((public.rls_bypass() OR (id = public.current_org_id())));


--
-- Name: otps rls_otps_bypass; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_otps_bypass ON public.otps USING (public.rls_bypass());


--
-- Name: payments rls_payments_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_payments_org ON public.payments USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: recurring_invoice_templates rls_rec_tmpl_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_rec_tmpl_org ON public.recurring_invoice_templates USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: revenue_forecasts rls_rf_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_rf_org ON public.revenue_forecasts USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: staff_permissions rls_sp_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_sp_org ON public.staff_permissions USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: subscriptions rls_subscriptions_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_subscriptions_org ON public.subscriptions USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: service_templates rls_svc_tmpl_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_svc_tmpl_org ON public.service_templates USING ((public.rls_bypass() OR (organization_id IS NULL) OR (organization_id = public.current_org_id())));


--
-- Name: tasks rls_tasks_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_tasks_org ON public.tasks USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: users rls_users_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_users_org ON public.users USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: whatsapp_message_logs rls_wml_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_wml_org ON public.whatsapp_message_logs USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: years rls_years_org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rls_years_org ON public.years USING ((public.rls_bypass() OR (organization_id = public.current_org_id())));


--
-- Name: service_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_message_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: years; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict zbclURhodJlwvhwBBzpV74qclnLbAp2DINJgibjhSider36XSnS2STSfLLFqUWb

