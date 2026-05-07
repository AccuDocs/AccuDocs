export type ModuleStatus = 'live' | 'beta' | 'soon';

export interface AppModule {
  id: string;
  hub: HubId;
  label: string;
  icon: string;           // legacy glyph fallback
  iconName?: string;      // design-system icon
  desc: string;           // one line description
  status: ModuleStatus;
  badge?: number | null;  // notification count
  route: string;          // Angular route path
  pinned?: boolean;       // default pinned
}

export type HubId =
  | 'core' | 'compliance' | 'work'
  | 'clients' | 'firm' | 'settings' | 'billing';

export interface Hub {
  id: HubId;
  label: string;
  icon: string;
  iconName: string;
  color: string;          // hex accent color for this hub
  desc: string;
}

// ==========================================
// HUB DEFINITIONS
// ==========================================

export const HUBS: Hub[] = [
  { id: 'core', label: 'Home', icon: 'CORE', iconName: 'heroSquares2x2Solid', color: '#C9943A', desc: 'Overview & navigation' },
  { id: 'compliance', label: 'Compliance', icon: 'COMP', iconName: 'heroScaleSolid', color: '#3A9E7A', desc: 'Deadlines & filings' },
  { id: 'work', label: 'Work', icon: 'WORK', iconName: 'heroClipboardDocumentCheckSolid', color: '#3A7FBF', desc: 'Tasks & productivity' },
  { id: 'clients', label: 'Clients', icon: 'CLNT', iconName: 'heroUserGroupSolid', color: '#8B5FBF', desc: 'CRM & relationships' },
  { id: 'billing', label: 'Billing & Rev', icon: 'BILL', iconName: 'heroBanknotesSolid', color: '#10B981', desc: 'Invoices & collections' },
  { id: 'firm', label: 'Firm Ops', icon: 'FIRM', iconName: 'heroBuildingOffice2Solid', color: '#7A8898', desc: 'Staff & operations' },
  { id: 'settings', label: 'Settings', icon: 'SET', iconName: 'heroCog6ToothSolid', color: '#7A8898', desc: 'Configuration' },
];

// ==========================================
// MODULE REGISTRY
// ==========================================

export const MODULE_REGISTRY: AppModule[] = ([
  // CORE
  { id: 'dashboard', hub: 'core', label: 'Dashboard', icon: 'CORE', iconName: 'heroSquares2x2Solid', desc: 'Today\'s office overview', status: 'live', badge: null, route: '/dashboard', pinned: true },
  { id: 'documents_all', hub: 'core', label: 'Documents', icon: 'DOCS', iconName: 'heroFolderSolid', desc: 'Global document vault', status: 'live', badge: null, route: '/documents', pinned: true },
  { id: 'documents_scanner', hub: 'core', label: 'Document Scanner', icon: 'SCAN', iconName: 'heroDocumentMagnifyingGlassSolid', desc: 'OCR capture for receipts and bills', status: 'live', badge: null, route: '/documents/scanner', pinned: true },

  // BILLING
  { id: 'billing_invoices', hub: 'billing', label: 'Revenue & Invoices', icon: 'BILL', iconName: 'heroDocumentTextSolid', desc: 'CA Invoicing & prediction', status: 'live', badge: 12, route: '/billing/invoices', pinned: true },

  // COMPLIANCE
  { id: 'calendar', hub: 'compliance', label: 'Compliance Calendar', icon: 'CAL', iconName: 'heroCalendarDaysSolid', desc: 'All filing deadlines', status: 'live', badge: 3, route: '/compliance/calendar', pinned: true },
  { id: 'checklists', hub: 'compliance', label: 'Doc Checklists', icon: 'LIST', iconName: 'heroClipboardDocumentCheckSolid', desc: 'Pending documents tracker', status: 'live', badge: 23, route: '/compliance/checklists', pinned: true },
  { id: 'gst_hsn_sac', hub: 'compliance', label: 'HSN/SAC Master', icon: 'HSN', iconName: 'heroBookOpenSolid', desc: 'Universal GST code directory', status: 'live', badge: null, route: '/compliance/hsn-sac', pinned: true },

  // WORK
  { id: 'tasks', hub: 'work', label: 'Task Board', icon: 'TASK', iconName: 'heroCheckCircleSolid', desc: 'Kanban & work tracker', status: 'live', badge: 8, route: '/work/tasks', pinned: true },

  // CLIENTS
  { id: 'clients_user_client', hub: 'clients', label: 'Client', icon: 'CLNT', iconName: 'heroUserSolid', desc: 'Client management & interactions', status: 'live', badge: null, route: '/clients/client', pinned: true },
  { id: 'clients_user_staff', hub: 'clients', label: 'Staff', icon: 'TEAM', iconName: 'heroUserGroupSolid', desc: 'Staff management & assignments', status: 'live', badge: null, route: '/clients/staff', pinned: true },

  // FIRM OPS
  { id: 'staff', hub: 'firm', label: 'Staff Management', icon: 'HR', iconName: 'heroIdentificationSolid', desc: 'HR, roles & staff profiles', status: 'live', badge: null, route: '/firm/staff', pinned: true },

  // SETTINGS
  { id: 'whatsapp_setup', hub: 'settings', label: 'WhatsApp Setup', icon: 'WA', iconName: 'heroChatBubbleLeftRightSolid', desc: 'Connect WhatsApp account', status: 'live', badge: null, route: '/settings/whatsapp', pinned: true },
] as AppModule[]).filter((module) => module.id !== 'documents_scanner');

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Get all modules for a specific hub
 */
export function getHubModules(hubId: HubId): AppModule[] {
  return MODULE_REGISTRY.filter(m => m.hub === hubId);
}

/**
 * Get the total badge count for a hub
 */
export function getHubBadgeCount(hubId: HubId): number {
  return getHubModules(hubId).reduce((sum, m) => sum + (m.badge || 0), 0);
}

/**
 * Get all default pinned modules
 */
export function getDefaultPins(): AppModule[] {
  return MODULE_REGISTRY.filter(m => m.pinned === true);
}

/**
 * Find a module by ID
 */
export function findModule(id: string): AppModule | undefined {
  return MODULE_REGISTRY.find(m => m.id === id);
}

/**
 * Search modules by query string
 * Searches: label, description, hub label, status
 */
export function searchModules(query: string): AppModule[] {
  const q = query.toLowerCase();
  return MODULE_REGISTRY.filter(m => {
    const hub = HUBS.find(h => h.id === m.hub);
    return (
      m.label.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q) ||
      hub?.label.toLowerCase().includes(q) ||
      m.status.includes(q)
    );
  });
}

/**
 * Get a hub by ID
 */
export function findHub(hubId: HubId): Hub | undefined {
  return HUBS.find(h => h.id === hubId);
}

/**
 * Get module count by status for a hub
 */
export function getHubStatusCounts(hubId: HubId): { live: number; beta: number; soon: number } {
  const modules = getHubModules(hubId);
  return {
    live: modules.filter(m => m.status === 'live').length,
    beta: modules.filter(m => m.status === 'beta').length,
    soon: modules.filter(m => m.status === 'soon').length,
  };
}

/**
 * Group modules by status
 */
export function groupModulesByStatus(modules: AppModule[]): {
  live: AppModule[];
  beta: AppModule[];
  soon: AppModule[];
} {
  return {
    live: modules.filter(m => m.status === 'live'),
    beta: modules.filter(m => m.status === 'beta'),
    soon: modules.filter(m => m.status === 'soon'),
  };
}
