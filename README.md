# 📄 AccuDocs — GST Accounting & Document Management Platform

[![GitHub](https://img.shields.io/badge/GitHub-siddharth971-blue)](https://github.com/siddharth971/AccuDocs)
[![Backend API](https://img.shields.io/badge/Backend%20API-Live-brightgreen)](https://accudocs.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Angular](https://img.shields.io/badge/Angular-18+-DD0031?logo=angular)](https://angular.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org)

---

## 🎯 Executive Summary

**AccuDocs** is a production-ready, cloud-based **GST Accounting & Document Management SaaS** designed specifically for **Chartered Accountants (CA)** and tax consultant firms in India. It streamlines GST-compliant invoicing, recurring billing, compliance tracking, risk-predictive collections, secure document management, and **WhatsApp automation** — all under a multi-tenant architecture supporting 10,000+ firms.

> **Architecture:** Modular Clean Architecture — Domain-Driven backend modules + Feature-based Angular frontend  
> **Scale:** Enterprise-level, multi-tenant (`Organization → Branch → User`)

### Core Value Proposition

| Capability | Impact |
|---|---|
| **Automated GST Engine** | State-aware IGST/CGST/SGST computation with GSTR-1 & GSTR-3B JSON export |
| **Intelligent Billing** | Recurring invoices, advance payments, credit notes, FIFO allocation |
| **Predictive Collections** | Risk scoring (0–100) identifies bad payers before they default |
| **WhatsApp Automation** | One-click invoice delivery, overdue reminders, payment receipts |
| **Compliance Hub** | Calendar deadlines, compliance checklists, auto-reminders |
| **Document Intelligence** | OCR scanning, version control, S3 storage with signed URLs |
| **Enterprise Security** | JWT + OTP auth, RBAC, AES-256 encryption, immutable audit logs |

---

## 🚀 Key Features

### 1. Revenue Management & GST Calculation

- ✅ State-aware automated GST (IGST/CGST/SGST) splits via `gstCalculator.ts`
- ✅ GSTR-1 JSON generation (B2B, B2CS, CDNR sections) via `gstGenerator.ts`
- ✅ GSTR-3B auto-computation from sales & purchase data
- ✅ GSTIN format validation with checksum via `gstValidator.ts`
- ✅ Pro-rata credit note generation and adjustments
- ✅ FIFO-based advance payment auto-allocations
- ✅ Professional PDF invoice generation via PDFKit

### 2. WhatsApp Automation & Notifications

- ✅ Automated invoice PDF delivery via WhatsApp Web.js
- ✅ Scheduled overdue payment reminders (1-day, 7-day, critical)
- ✅ Automated "Payment Received" acknowledgement receipts
- ✅ In-app notification system with real-time WebSocket updates
- ✅ Notification templates and job scheduling via node-cron

### 3. Intelligence & Predictive Analytics

- 📊 **Risk Scoring (0–100)**: Grades clients based on historical payment delays
- 📉 Revenue pipeline forecasting via recurring billing patterns
- ⚠️ Predictive alerts for advance expiry and missed deadlines
- 📈 Anomaly detection on organizational finance metrics

### 4. Compliance Hub

- 📅 **Compliance Calendar**: Visual deadline tracking with color-coded status
- ✅ **Checklists**: Template-based compliance checklists with item-level tracking
- 📋 **GST Filing**: GSTR-1 & GSTR-3B filing workflow with JSON export
- ⏰ Auto-reminders for upcoming statutory deadlines

### 5. Document Management

- 🔐 AWS S3 integration with AES-256 encryption at rest
- 📂 Virtual folder tree (Client → Year → Category structure)
- 📦 Multi-file upload with drag & drop, batch download (ZIP)
- 🔒 Pre-signed URLs with configurable expiry (default 300s)
- 🔄 Document version history with rollback
- 📷 Document scanning with OCR (Tesseract.js) and data extraction
- 🔗 Token-based public upload links for client self-service

### 6. Billing & Invoicing

- 🧾 Full invoice lifecycle: Draft → Issued → Overdue → Paid
- 🔄 Automated recurring invoice creation (Monthly/Quarterly/Yearly)
- 💳 Payment tracking with multiple allocation methods
- 📑 Credit notes with pro-rata adjustments
- 💰 Advance payment management with FIFO allocation
- 📄 Service templates for quick invoice creation

### 7. User Management & RBAC

- 👑 **Super Admin**: Platform-wide org management, user impersonation
- 👨‍💼 **Admin (CA)**: Full system access, staff management, compliance oversight
- 👤 **Staff**: Limited access based on assigned clients and permissions
- 📋 **Client**: Self-service portal — view invoices, upload documents
- 🔐 Granular staff permission matrix per module

### 8. Audit & Compliance

- 📝 Immutable audit logs via `audit.middleware.ts` on all mutations
- 🔍 Complete timeline tracking (user, IP, timestamp, before/after diff)
- ✅ Indian tax compliance: GST, PAN, GSTIN validation
- 🔐 Row-level data isolation per organization (`organization_id` scoping)

### 9. Modern User Interface

- 🎨 Hub-based navigation with command palette (`Ctrl+K`)
- 🌙 Dark mode / Light mode theming
- ⚡ Real-time updates with Socket.io WebSockets
- 🖱️ Drag-and-drop file upload interface
- 📱 Responsive mobile-friendly design
- ⭐ Favorites bar for pinned quick-access modules
- 🔍 Generic data table component with sort, filter, paginate, bulk actions

---

## 🛠️ Technology Stack

### Backend Architecture

| Component | Technology | Details |
|---|---|---|
| **Runtime** | Node.js 20+ | Async, event-driven architecture |
| **Framework** | Express.js | Lightweight web framework with TypeScript |
| **Language** | TypeScript 5.3+ | Strict type-safe development |
| **Database** | PostgreSQL 15 | ACID-compliant, JSON support, full-text search |
| **ORM** | Sequelize 6 | SQL query builder with TypeScript models |
| **Cache** | Redis 7 (ioredis) | Session storage, rate limiting, data caching |
| **Storage** | AWS S3 | Document storage with presigned URLs |
| **Validation** | Zod | Runtime schema validation on all endpoints |
| **Auth** | JWT + bcryptjs | Access (15m) + Refresh (7d) token strategy |
| **PDF Engine** | PDFKit | Dynamic invoice PDF generation |
| **WhatsApp** | whatsapp-web.js | Automated message & document delivery |
| **OCR** | Tesseract.js 7 | Document scanning & text extraction |
| **Logging** | Winston | Daily-rotate-file transport, structured JSON |
| **CRON** | node-cron | Scheduled jobs (billing, reminders, alerts) |
| **Real-time** | Socket.io | WebSocket for live notifications |
| **Security** | Helmet + express-rate-limit | HTTP headers + DDoS protection |
| **API Docs** | Swagger/OpenAPI | Interactive docs at `/api-docs` |
| **DI Container** | tsyringe | Dependency injection for clean architecture |
| **Excel** | ExcelJS + xlsx | Import/export Excel/CSV files |

### Frontend Stack

| Component | Technology | Details |
|---|---|---|
| **Framework** | Angular 18+ (Standalone) | Modern component-based architecture |
| **Language** | TypeScript 5.3+ | Strict type-safe client-side code |
| **Styling** | TailwindCSS | Utility-first CSS framework |
| **State** | Angular Signals + RxJS | Reactive state management |
| **HTTP** | Angular HttpClient | API communication with interceptors |
| **Notifications** | @ngneat/hot-toast | Toast notification system |
| **Routing** | Angular Router | Lazy-loaded feature modules |
| **Tables** | Custom DataTable | Sort, filter, paginate, bulk actions |

### DevOps & Infrastructure

| Component | Technology | Details |
|---|---|---|
| **Containerization** | Docker + Docker Compose | Multi-service orchestration |
| **Reverse Proxy** | Nginx | SSL termination, SPA routing, API proxy |
| **Hosting** | Render | Cloud hosting with auto-deploy |
| **CI/CD** | GitHub Actions | Lint, test, deploy pipelines |
| **Process Manager** | PM2 | Production process management with clustering |

---

## 📋 Project Structure

```
AccuDocs/
│
├── .github/                              # CI/CD & GitHub configuration
│   └── workflows/                        # GitHub Actions pipelines
│
├── backend/                              # ── Node.js + Express API ──
│   ├── src/
│   │   ├── app.ts                        # Express app setup (middleware chain)
│   │   ├── server.ts                     # HTTP server bootstrap + graceful shutdown
│   │   │
│   │   ├── config/                       # Centralized configuration
│   │   │   ├── env.config.ts             # Zod-validated environment variables
│   │   │   ├── database.config.ts        # Sequelize connection pool
│   │   │   ├── redis.config.ts           # ioredis connection + cache helpers
│   │   │   ├── s3.config.ts              # AWS S3 client + presigned URLs
│   │   │   ├── swagger.config.ts         # OpenAPI auto-docs
│   │   │   └── scheduler.ts             # node-cron job registration
│   │   │
│   │   ├── middlewares/                  # Express middleware pipeline
│   │   │   ├── auth.middleware.ts        # JWT verification + user injection
│   │   │   ├── role.middleware.ts        # Role-based access control
│   │   │   ├── adminOnly.middleware.ts   # Admin-only route enforcement
│   │   │   ├── validate.middleware.ts    # Zod schema request validation
│   │   │   ├── upload.middleware.ts      # Multer file upload config
│   │   │   ├── rateLimit.middleware.ts   # Rate limiting (100 req/15min)
│   │   │   ├── audit.middleware.ts       # Immutable audit trail logging
│   │   │   └── error.middleware.ts       # Global error handler
│   │   │
│   │   ├── models/                       # Sequelize ORM models (50 models)
│   │   │   ├── index.ts                  # Association registry + model init
│   │   │   ├── user.model.ts
│   │   │   ├── organization.model.ts
│   │   │   ├── client.model.ts
│   │   │   ├── invoice.model.ts
│   │   │   ├── gst-return.model.ts
│   │   │   ├── document.model.ts
│   │   │   └── ... (50 models total)
│   │   │
│   │   ├── modules/                      # Domain modules (Clean Architecture)
│   │   │   ├── auth/                     # Authentication & Authorization
│   │   │   │   ├── domain/              # Entities + Repository interfaces
│   │   │   │   ├── application/         # Use case services
│   │   │   │   ├── infrastructure/      # Sequelize repos + mappers
│   │   │   │   └── presentation/        # Controllers + routes + validators
│   │   │   │
│   │   │   ├── billing/                  # Invoicing, Payments, Credit Notes
│   │   │   │   ├── domain/
│   │   │   │   ├── application/
│   │   │   │   ├── infrastructure/
│   │   │   │   └── presentation/
│   │   │   │
│   │   │   ├── client/                   # Client management + risk scoring
│   │   │   ├── client-portal/            # Public client self-service
│   │   │   ├── compliance/               # Compliance calendar & deadlines
│   │   │   ├── checklist/                # Compliance checklists & templates
│   │   │   ├── gst/                      # GSTR-1, GSTR-3B filing
│   │   │   ├── documents/                # Document & file management
│   │   │   ├── scanner/                  # OCR scanning & data extraction
│   │   │   ├── firm/                     # Organization settings & branches
│   │   │   ├── tasks/                    # Task management & assignment
│   │   │   ├── data/                     # Excel/JSON import & export
│   │   │   ├── notifications/            # WhatsApp, Email, In-App
│   │   │   ├── intelligence/             # Predictive alerts & analytics
│   │   │   └── super-admin/              # Platform super admin
│   │   │
│   │   ├── shared/                       # Cross-cutting concerns
│   │   │   ├── constants/                # Enums, status codes, GST rates
│   │   │   ├── core/                     # Base classes (BaseRepository)
│   │   │   ├── types/                    # Global TypeScript interfaces
│   │   │   ├── utils/                    # Shared formatters & helpers
│   │   │   └── validators/               # Common Zod schemas
│   │   │
│   │   ├── utils/                        # Standalone utilities
│   │   │   ├── jwt.ts                    # JWT sign/verify/decode
│   │   │   ├── logger.ts                # Winston logger factory
│   │   │   ├── response.ts             # Standardized API responses
│   │   │   ├── errors.ts                # Custom error hierarchy
│   │   │   ├── encryption.ts            # AES-256-CBC encrypt/decrypt
│   │   │   ├── gstCalculator.ts         # Tax computation engine
│   │   │   ├── gstValidator.ts          # GSTIN format validation
│   │   │   ├── gstGenerator.ts          # GSTR-1/3B JSON generation
│   │   │   ├── excelParser.ts           # Excel/CSV parsing
│   │   │   └── validators.ts            # Email, mobile, PAN schemas
│   │   │
│   │   └── routes/                       # Route registry (/api/v1/*)
│   │       └── index.ts
│   │
│   ├── storage/                          # Local file storage (dev mode)
│   ├── logs/                             # Winston log output (daily rotation)
│   ├── docs/                             # API docs / Postman collections
│   ├── scripts/                          # Migration & utility scripts
│   ├── .env.example                      # Environment template
│   ├── ecosystem.config.js               # PM2 production config
│   ├── jest.config.js                    # Test configuration
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                             # ── Angular 18+ SPA ──
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.ts          # Root component
│   │   │   ├── app.config.ts             # provideRouter, provideHttpClient
│   │   │   ├── app.routes.ts             # Top-level lazy routes
│   │   │   │
│   │   │   ├── core/                     # Singleton services & infrastructure
│   │   │   │   ├── api/
│   │   │   │   │   └── api.service.ts    # Base HTTP client
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts     # JWT auth check
│   │   │   │   │   └── role.guard.ts     # Role-based route access
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── auth.interceptor.ts         # Attach JWT to requests
│   │   │   │   │   ├── error.interceptor.ts        # HTTP error handling
│   │   │   │   │   └── super-admin.interceptor.ts  # SA header injection
│   │   │   │   ├── services/             # 18 injectable API services
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── client.service.ts
│   │   │   │   │   ├── gst.service.ts
│   │   │   │   │   ├── workspace.service.ts
│   │   │   │   │   ├── document.service.ts
│   │   │   │   │   ├── compliance.service.ts
│   │   │   │   │   ├── task.service.ts
│   │   │   │   │   └── ... (18 services total)
│   │   │   │   ├── navigation.service.ts
│   │   │   │   ├── keyboard-shortcuts.service.ts
│   │   │   │   └── module-registry.ts    # Dynamic hub/module registry
│   │   │   │
│   │   │   ├── shared/                   # Reusable UI components
│   │   │   │   ├── components/           # not-found, confirm-dialog, etc.
│   │   │   │   ├── data-table/           # Generic data table component
│   │   │   │   ├── ui/                   # Design system (button, input, etc.)
│   │   │   │   ├── types/                # Shared interfaces
│   │   │   │   └── utils/                # Pipes, directives, helpers
│   │   │   │
│   │   │   ├── layout/                   # App shell & navigation chrome
│   │   │   │   ├── app-shell/            # Main layout (sidebar + content)
│   │   │   │   ├── top-bar/              # Navigation bar
│   │   │   │   ├── hub-rail/             # Left icon rail (hub selector)
│   │   │   │   ├── module-sidebar/       # Context sidebar per hub
│   │   │   │   ├── command-palette/      # Ctrl+K command palette
│   │   │   │   ├── favorites-bar/        # Pinned module quick access
│   │   │   │   ├── hub-overview/         # Hub landing (module grid)
│   │   │   │   └── all-modules/          # Module registry browser
│   │   │   │
│   │   │   ├── features/                 # Feature modules (19 lazy-loaded)
│   │   │   │   ├── auth/                 # Login, Register, OTP
│   │   │   │   ├── dashboard/            # Stats widgets, charts, alerts
│   │   │   │   ├── clients/              # Client CRUD + risk scores
│   │   │   │   ├── staff/                # Staff management + permissions
│   │   │   │   ├── billing/              # Invoices, payments, credit notes
│   │   │   │   ├── gst-filing/           # GSTR-1 & GSTR-3B workflow
│   │   │   │   ├── compliance-calendar/  # Deadline calendar view
│   │   │   │   ├── checklists/           # Compliance checklists
│   │   │   │   ├── documents/            # Document upload & viewer
│   │   │   │   ├── document-scanner/     # Scan → OCR → extract
│   │   │   │   ├── file-explorer/        # Folder/file tree browser
│   │   │   │   ├── tasks/                # Task board + list view
│   │   │   │   ├── workspace/            # Org/branch settings
│   │   │   │   ├── admin/                # WhatsApp console
│   │   │   │   ├── super-admin/          # Platform admin panel
│   │   │   │   ├── logs/                 # Activity log viewer
│   │   │   │   ├── public-upload/        # Token-based public upload
│   │   │   │   └── scanner/              # Scanner integration
│   │   │   │
│   │   │   └── models/                   # Global data models
│   │   │
│   │   ├── assets/                       # Static assets (images, icons)
│   │   ├── environments/                 # Dev & prod environment configs
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.scss
│   │
│   ├── angular.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── package.json
│
├── database/                             # Database artifacts
│   ├── schema.sql                        # Complete DDL (source of truth)
│   ├── seed_v2.sql                       # Reference data seeding
│   ├── v1_to_v2_migration.sql            # Major version migration
│   └── migrations/                       # Incremental ordered migrations
│
├── nginx/                                # Reverse proxy configuration
│   └── nginx.conf
│
├── docker-compose.yml                    # Full-stack orchestration
├── start-local.bat                       # One-click local startup (Windows)
├── SECURITY.md                           # Security policies
└── README.md
```

---

## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (SSL)                          │
│               Reverse Proxy + SPA Serving                   │
└──────────┬──────────────────────────────┬───────────────────┘
           │ Port 80/443                  │ /api/v1/*
┌──────────▼──────────┐       ┌───────────▼───────────────────┐
│   Angular 18+ SPA   │       │     Express.js API Server     │
│  ┌────────────────┐  │       │  ┌─────────────────────────┐  │
│  │ Layout (Shell) │  │ HTTP  │  │  Middleware Pipeline     │  │
│  │ Features (19)  │──┼──────►│  │  helmet → cors → rate   │  │
│  │ Core Services  │  │       │  │  limit → auth → role →  │  │
│  │ Shared UI      │  │       │  │  validate → audit       │  │
│  └────────────────┘  │       │  └──────────┬──────────────┘  │
└──────────────────────┘       │  ┌──────────▼──────────────┐  │
                               │  │ Modules (Clean Arch)    │  │
                               │  │ domain → application →  │  │
                               │  │ infrastructure →        │  │
                               │  │ presentation            │  │
                               │  └──────────┬──────────────┘  │
                               └─────────────┼─────────────────┘
                     ┌───────────────────────┼──────────────────┐
                     │                       │                  │
             ┌───────▼──────┐       ┌────────▼─────┐   ┌───────▼──────┐
             │ PostgreSQL   │       │    Redis     │   │   AWS S3     │
             │ 15-alpine    │       │  7-alpine    │   │  Documents   │
             │ 50 tables    │       │  Sessions    │   │  Presigned   │
             │ Multi-tenant │       │  Cache       │   │  URLs        │
             └──────────────┘       └──────────────┘   └──────────────┘
```

### Clean Architecture (Per Backend Module)

Each of the **16 backend modules** follows a 4-layer clean architecture:

```
module/
├── domain/              # Business rules (no framework dependencies)
│   ├── entities/        # Domain entities with business methods
│   └── repositories/    # Repository INTERFACES (contracts)
│
├── application/         # Use cases & orchestration
│   └── services/        # Business logic services
│
├── infrastructure/      # External concerns (DB, APIs)
│   ├── repositories/    # Repository IMPLEMENTATIONS (Sequelize)
│   └── mappers/         # Entity ↔ Model mapping
│
└── presentation/        # HTTP interface
    ├── controllers/     # Express request handlers
    ├── routes/          # Route definitions
    └── validators/      # Zod request validation schemas
```

### Backend Module Catalog

| Module | Purpose | Key Services |
|---|---|---|
| **auth** | JWT login, OTP, token refresh, password reset | `LoginService`, `OTPService`, `TokenService` |
| **billing** | Invoices, payments, credit notes, recurring billing | `InvoiceService`, `PaymentService`, `CreditNoteService` |
| **client** | Client master data, GSTIN validation, risk scoring | `ClientService`, `RiskScoringService` |
| **client-portal** | Public self-service portal for clients | `PortalAuthService`, `PortalDocumentService` |
| **compliance** | Compliance calendar, deadlines, auto-reminders | `DeadlineService`, `ReminderService` |
| **checklist** | Templates, instance creation, item tracking | `ChecklistService`, `TemplateService` |
| **gst** | GSTR-1 (B2B/B2CS/CDNR), GSTR-3B computation, JSON export | `GSTR1Service`, `GSTR3BService` |
| **documents** | Upload, download, versioning, folder management | `DocumentService`, `FolderService` |
| **scanner** | Document OCR (Tesseract.js), data extraction | `ScannerService`, `OCRService` |
| **firm** | Org settings, branch management, staff CRUD | `OrgService`, `BranchService` |
| **tasks** | Task creation, assignment, status tracking | `TaskService`, `AssignmentService` |
| **data** | Excel/JSON import, bulk processing, export | `ImportService`, `ExportService` |
| **notifications** | WhatsApp, Telegram, in-app notifications | `WhatsAppService`, `NotificationJobService` |
| **intelligence** | Predictive alerts, revenue forecasting | `PredictiveAlertService`, `ForecastService` |
| **super-admin** | Platform-wide org management, impersonation | `SuperAdminService` |
| **common** | Cross-module shared services | Dashboard aggregation |

### Frontend Architecture

| Layer | Purpose | Contents |
|---|---|---|
| **core/** | Singleton services (instantiated once at root) | `ApiService`, 18 domain services, guards, interceptors |
| **shared/** | Reusable, stateless UI components | `DataTable`, UI primitives, pipes, directives |
| **layout/** | Persistent navigation chrome | App shell, hub rail, sidebar, command palette, top bar |
| **features/** | Lazy-loaded feature modules (19 total) | Auth, dashboard, billing, GST filing, documents, tasks, etc. |

---

## 🔐 Security Architecture

### Authentication Flow

```
Client (SPA)                    API Server                  PostgreSQL / Redis
     │                              │                              │
     │── POST /auth/login ─────────►│                              │
     │   {mobile, otp}              │── Verify OTP ──────────────►│
     │                              │◄── OTP Valid ───────────────│
     │                              │── Generate JWT (15m)         │
     │                              │── Generate Refresh (7d)      │
     │                              │── Store session ────────────►│ Redis
     │◄── {accessToken, refresh} ───│                              │
     │                              │                              │
     │── GET /clients ─────────────►│                              │
     │   Authorization: Bearer JWT  │── auth.middleware            │
     │                              │── role.middleware            │
     │                              │── Controller → Service       │
     │◄── {data: [...]} ───────────│                              │
     │                              │                              │
     │── POST /auth/refresh ───────►│                              │
     │   {refreshToken}             │── Verify + Rotate            │
     │◄── {accessToken (new)} ─────│                              │
```

### Security Layers

| Layer | Implementation |
|---|---|
| **Transport** | HTTPS via Nginx reverse proxy with SSL termination |
| **Headers** | Helmet.js — CSP, X-Frame-Options, HSTS, X-Content-Type-Options |
| **Rate Limiting** | 100 req/15min per IP (auth routes: 10 req/15min) |
| **Authentication** | JWT access (15m) + refresh (7d), OTP-based passwordless login |
| **Authorization** | RBAC: `super_admin → admin → staff → client` |
| **Data Encryption** | AES-256-CBC for PAN, Aadhaar, bank details at rest |
| **Input Validation** | Zod schemas on every endpoint; sanitized queries |
| **Audit Trail** | Immutable logs: user, IP, timestamp, action, before/after |
| **CORS** | Whitelist: dev (`localhost:4200`), production domain |
| **Multi-Tenancy** | Row-level isolation via `organization_id` on all queries |

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidelines.

---

## 🌍 Live Environment

| Service | URL | Status |
|---|---|---|
| **Backend API** | [accudocs.onrender.com](https://accudocs.onrender.com) | ✅ Live |
| **API Documentation** | [accudocs.onrender.com/api-docs](https://accudocs.onrender.com/api-docs) | ✅ Live |
| **Frontend** | [siddharth971.github.io/AccuDocs/](https://siddharth971.github.io/AccuDocs/) | ✅ Live |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | v20+ | Required |
| **PostgreSQL** | 15+ | Production DB (SQLite for local dev fallback) |
| **Redis** | 7+ | Session cache, rate limiting |
| **Docker** | Latest | Optional — for containerized deployment |
| **AWS Account** | — | Optional — for S3 storage (local fallback available) |

### 1️⃣ Clone Repository

```bash
git clone https://github.com/siddharth971/AccuDocs.git
cd AccuDocs
```

### 2️⃣ Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file from template
cp .env.example .env

# Edit .env with your configuration (see Environment Variables below)

# Run in development mode
npm run dev

# Backend starts at http://localhost:3000
# API docs at http://localhost:3000/api-docs
```

### 3️⃣ Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
ng serve
# or
npm start

# Frontend available at http://localhost:4200
```

### 4️⃣ Run with Docker Compose (Full Stack)

```bash
# From project root
docker-compose up -d --build

# Services:
# ├── Frontend:   http://localhost:80
# ├── Backend:    http://localhost:3000
# ├── PostgreSQL: localhost:5432
# └── Redis:      localhost:6379
```

### 5️⃣ Quick Start (Windows)

```bash
# One-click startup script
start-local.bat
```

### Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# ── Server ──
NODE_ENV=development
PORT=3000
API_VERSION=v1

# ── Database (PostgreSQL) ──
DB_HOST=localhost
DB_PORT=5432
DB_NAME=accudocs
DB_USER=postgres
DB_PASSWORD=postgres
DB_DIALECT=postgres
DB_SSL=false
DB_POOL_MAX=10

# ── Redis ──
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ── JWT Authentication ──
JWT_SECRET=your-super-secret-jwt-key-min-10-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key-min-10-chars
JWT_REFRESH_EXPIRES_IN=7d

# ── AWS S3 Storage ──
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=accudocs-documents
AWS_S3_SIGNED_URL_EXPIRY=300

# ── Security ──
AES_ENCRYPTION_KEY=default-32-char-encryption-key!!
CORS_ORIGIN=http://localhost:4200

# ── Rate Limiting ──
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ── WhatsApp ──
WHATSAPP_ENABLED=true

# ── Logging ──
LOG_LEVEL=debug
LOG_DIR=logs
```

---

## 📚 API Reference

### API Versioning

All routes are prefixed with `/api/v1/`:

### Core Endpoints

```
# ── Authentication ──
POST   /api/v1/auth/login              # OTP-based login
POST   /api/v1/auth/verify-otp         # Verify OTP
POST   /api/v1/auth/refresh            # Refresh access token
POST   /api/v1/auth/register           # Register new organization

# ── Clients ──
GET    /api/v1/clients                 # List clients (paginated)
POST   /api/v1/clients                 # Create client
GET    /api/v1/clients/:id             # Get client details
PUT    /api/v1/clients/:id             # Update client
DELETE /api/v1/clients/:id             # Delete client

# ── Billing & Invoicing ──
GET    /api/v1/billing/invoices        # List invoices
POST   /api/v1/billing/invoices        # Create invoice
GET    /api/v1/billing/invoices/:id    # Get invoice with line items
POST   /api/v1/billing/payments        # Record payment
GET    /api/v1/billing/credit-notes    # List credit notes

# ── GST Filing ──
GET    /api/v1/gst/gstr1/:clientId     # Generate GSTR-1 JSON
GET    /api/v1/gst/gstr3b/:clientId    # Generate GSTR-3B summary
POST   /api/v1/gst/compute             # Compute GST for transaction

# ── Documents ──
POST   /api/v1/documents/upload        # Upload document(s)
GET    /api/v1/documents/:id           # Get document metadata
GET    /api/v1/documents/:id/download  # Get presigned download URL
POST   /api/v1/documents/:id/send-whatsapp  # Send via WhatsApp

# ── Tasks ──
GET    /api/v1/tasks                   # List tasks
POST   /api/v1/tasks                   # Create task
PUT    /api/v1/tasks/:id/status        # Update task status

# ── Compliance ──
GET    /api/v1/compliance/deadlines    # List upcoming deadlines
GET    /api/v1/compliance/calendar     # Calendar view data
GET    /api/v1/checklists              # List checklists
```

Full interactive documentation: [Swagger UI](https://accudocs.onrender.com/api-docs)

---

## 💼 Business Benefits

### For CA/Tax Firms

| Pain Point | Before AccuDocs | After AccuDocs | Impact |
|---|---|---|---|
| **Document Retrieval** | 5–10 min searching folders | 5 seconds via search | **2 hours/day saved per staff** |
| **Invoice Delivery** | Manual email/WhatsApp (7 steps) | One-click send | **3x more clients served/day** |
| **GST Filing** | Manual Excel calculations | Auto-generated GSTR-1/3B JSON | **90% filing time reduction** |
| **Payment Collection** | Reactive follow-ups | Predictive risk scoring alerts | **40% DSO reduction** |
| **Data Security** | Files on personal phones | Server-side only with audit logs | **100% data control** |
| **Compliance** | Panic during audits | Immutable audit trails ready | **Zero audit preparation time** |

---

## 📦 Deployment

### Option 1: Render (Recommended)

- Connected to GitHub with automatic deployments on push
- Environment variables configured in Render dashboard
- Live: [accudocs.onrender.com](https://accudocs.onrender.com)

### Option 2: Docker Compose

```bash
# Build and run all services
docker-compose up -d --build

# Services: Nginx (80/443) → Backend (3000) → PostgreSQL (5432) + Redis (6379)
```

### Option 3: PM2 (Traditional Server)

```bash
cd backend
npm run build
npm run start:prod    # Uses ecosystem.config.js with clustering
```

---

## 🧪 Testing

```bash
# Backend unit + integration tests
cd backend
npm test                    # Run all tests
npm test -- --coverage      # With coverage report

# Frontend tests
cd frontend
ng test                     # Unit tests (Karma + Jasmine)
```

| Layer | Tool | Pattern |
|---|---|---|
| Backend Unit | Jest + ts-jest | `modules/*/application/__tests__/` |
| Backend Integration | Supertest | `modules/*/presentation/__tests__/` |
| Frontend Unit | Karma + Jasmine | `*.spec.ts` co-located with components |

---

## 📊 Performance

| Metric | Target |
|---|---|
| **API Response Time** | < 200ms average |
| **Concurrent Users** | 1,000+ simultaneous connections |
| **File Upload** | Up to 10MB per file (configurable) |
| **Database Connections** | Pool: 10 (dev) → 50 (production) |
| **Caching** | Redis TTL: sessions (7d), dashboard stats (5m) |
| **Frontend Bundle** | Lazy-loaded — initial load < 200KB gzipped |

---

## 🎯 Roadmap

### v1.1 (Q2 2026)

- [ ] Advanced document OCR with AI categorization
- [ ] Bulk GST filing for multiple clients
- [ ] Custom workflow automation engine
- [ ] Email automation alongside WhatsApp

### v1.2 (Q3 2026)

- [ ] Mobile app (React Native / Flutter)
- [ ] Advanced analytics dashboard with charts
- [ ] Integration with Tally and other accounting software
- [ ] Multi-language support (Hindi, Gujarati, Marathi)

### v2.0 (Q4 2026)

- [ ] AI-powered insights and recommendations
- [ ] GraphQL API layer alongside REST
- [ ] Background job queue (Bull/BullMQ)
- [ ] White-label solution for resellers
- [ ] API marketplace for third-party integrations

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards

- TypeScript strict mode enabled
- Follow existing clean architecture patterns per module
- Zod validation on all new API endpoints
- Co-located `*.spec.ts` tests for new components
- Conventional commit messages (`feat:`, `fix:`, `docs:`, `refactor:`)

### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `client-risk-score.model.ts` |
| Classes | `PascalCase` | `ClientRiskScore` |
| Interfaces | `I` prefix (backend) | `IAuthRepository` |
| Services | `*Service` suffix | `InvoiceService` |
| Routes | `kebab-case` URLs | `/api/v1/gst-returns` |
| DB Tables | `snake_case` plural | `client_risk_scores` |
| Env Vars | `UPPER_SNAKE_CASE` | `JWT_REFRESH_SECRET` |

---

## 📝 License

This project is licensed under the **MIT License** — see LICENSE file for details.

---

## 🆘 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/siddharth971/AccuDocs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/siddharth971/AccuDocs/discussions)
- **Documentation**: Check [docs/](docs/) folder and [API docs](https://accudocs.onrender.com/api-docs)

---

**Last Updated**: April 16, 2026

Made with ❤️ by Siddharth
