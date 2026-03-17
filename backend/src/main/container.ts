import { container } from "tsyringe";

// Auth
import { SequelizeUserRepository } from "../modules/auth/infrastructure/repositories/SequelizeUserRepository";
import { SequelizeOtpRepository } from "../modules/auth/infrastructure/repositories/SequelizeOtpRepository";
import { SequelizeAuditLogRepository } from "../modules/auth/infrastructure/repositories/SequelizeAuditLogRepository";

// Client
import { SequelizeClientRepository } from "../modules/client/infrastructure/repositories/SequelizeClientRepository";

// Billing
import { SequelizeInvoiceRepository } from "../modules/billing/infrastructure/repositories/SequelizeInvoiceRepository";

// Documents
import { SequelizeFolderRepository } from "../modules/documents/infrastructure/repositories/SequelizeFolderRepository";
import { SequelizeDocumentRepository } from "../modules/documents/infrastructure/repositories/SequelizeDocumentRepository";

// Intelligence
import { SequelizeRevenueForecastRepository } from "../modules/intelligence/infrastructure/repositories/SequelizeRevenueForecastRepository";
import { SequelizeClientRiskScoreRepository } from "../modules/intelligence/infrastructure/repositories/SequelizeClientRiskScoreRepository";

// Tasks
import { SequelizeTaskRepository } from "../modules/tasks/infrastructure/repositories/SequelizeTaskRepository";

// Compliance
import { SequelizeComplianceRepository } from "../modules/compliance/infrastructure/repositories/SequelizeComplianceRepository";

// Checklists
import { SequelizeChecklistRepository } from "../modules/checklist/infrastructure/repositories/SequelizeChecklistRepository";

// Notifications
import { SequelizeNotificationRepository } from "../modules/notifications/infrastructure/repositories/SequelizeNotificationRepository";
import { WhatsAppServiceAdapter } from "../modules/notifications/infrastructure/WhatsAppServiceAdapter";

// Register Repositories
container.register("IUserRepository", { useClass: SequelizeUserRepository });
container.register("IOtpRepository", { useClass: SequelizeOtpRepository });
container.register("IAuditLogRepository", { useClass: SequelizeAuditLogRepository });
container.register("IClientRepository", { useClass: SequelizeClientRepository });
container.register("IInvoiceRepository", { useClass: SequelizeInvoiceRepository });
container.register("IFolderRepository", { useClass: SequelizeFolderRepository });
container.register("IDocumentRepository", { useClass: SequelizeDocumentRepository });
container.register("IRevenueForecastRepository", { useClass: SequelizeRevenueForecastRepository });
container.register("IClientRiskScoreRepository", { useClass: SequelizeClientRiskScoreRepository });
container.register("ITaskRepository", { useClass: SequelizeTaskRepository });
container.register("INotificationRepository", { useClass: SequelizeNotificationRepository });
container.register("IComplianceRepository", { useClass: SequelizeComplianceRepository });
container.register("IChecklistRepository", { useClass: SequelizeChecklistRepository });

// Register External Services
container.register("INotificationService", { useClass: WhatsAppServiceAdapter });
container.register("WhatsAppServiceAdapter", { useClass: WhatsAppServiceAdapter });
import { WhatsAppService } from "../modules/notifications/application/services/WhatsAppService";
container.register("WhatsAppService", { useClass: WhatsAppService });

// Core Services that are requested dynamically via container.resolve
// usually they resolve automatically if marked as @injectable, but we export container for safety
export { container };
