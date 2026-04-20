const fs = require('fs');
const file = 'd:/AccuDocs-1/frontend/src/app/features/workspace/client-workspace/client-workspace.component.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "export type WorkspaceTab = 'files' | 'checklists' | 'deadlines' | 'data' | 'gst' | 'billing' | 'dashboard';",
  "export type WorkspaceTab = 'files' | 'checklists' | 'deadlines' | 'data' | 'gst' | 'billing' | 'dashboard' | 'inventory';"
);

content = content.replace(
  "import { ClientBillingComponent } from '../components/client-billing/client-billing.component';",
  "import { ClientBillingComponent } from '../components/client-billing/client-billing.component';\nimport { InventoryDashboardComponent } from '../../inventory/inventory-dashboard/inventory-dashboard.component';"
);

content = content.replace(
  "ClientBillingComponent,\n    ClientBillingComponent",
  "ClientBillingComponent,\n    InventoryDashboardComponent"
);

content = content.replace(
  "ClientBillingComponent\n  ]",
  "ClientBillingComponent,\n    InventoryDashboardComponent\n  ]"
);

const buttonHtml = `        <button 
          (click)="setActiveTab('inventory')"
          class="pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors"
          [class]="activeTab() === 'inventory' ? 'text-primary-600 border-primary-600' : 'text-gray-500 border-transparent hover:text-gray-700'"
        >
          <ng-icon name="heroArchiveBoxSolid" size="18"></ng-icon>
          Inventory & Stock
        </button>
        <button 
          (click)="setActiveTab('dashboard')"`;

content = content.replace(
  /        <button \n          \(click\)="setActiveTab\('dashboard'\)"/,
  buttonHtml
);

const componentHtml = `      } @else if (activeTab() === 'inventory') {
        <app-inventory-dashboard></app-inventory-dashboard>
      } @else if (activeTab() === 'dashboard') {`;

content = content.replace(
  /      } @else if \(activeTab\(\) === 'dashboard'\) \{/,
  componentHtml
);

fs.writeFileSync(file, content);
console.log('workspace updated');
