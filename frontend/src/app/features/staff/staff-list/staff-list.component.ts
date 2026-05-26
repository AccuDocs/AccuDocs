import { ChangeDetectionStrategy, Component, TemplateRef, ViewChild, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { StaffFacade } from './staff-list.facade';
import { StaffFormComponent } from '../staff-form/staff-form.component';
import { DataTableComponent } from '../../../shared/data-table/data-table.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroBanknotesSolid,
  heroCalendarDaysSolid,
  heroChartBarSolid,
  heroClipboardDocumentCheckSolid,
  heroClipboardDocumentListSolid,
  heroClockSolid,
  heroFolderOpenSolid,
  heroIdentificationSolid,
  heroMagnifyingGlassSolid,
  heroPencilSquareSolid,
  heroPlusSolid,
  heroShieldCheckSolid,
  heroSquares2x2Solid,
  heroUserGroupSolid,
} from '@ng-icons/heroicons/solid';

type StaffSection =
  | 'dashboard'
  | 'directory'
  | 'add'
  | 'roles'
  | 'assignments'
  | 'tasks'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'performance'
  | 'documents'
  | 'logs';

type RolePermissionSection = 'list' | 'create' | 'matrix' | 'assignments' | 'approval' | 'logs';
type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';

interface RoleDefinition {
  name: string;
  code: string;
  department: string;
  description: string;
  dashboard: string;
  status: 'Active' | 'Inactive';
  permissions: string[];
}

interface RoleDraft {
  name: string;
  code: string;
  department: string;
  description: string;
  dashboard: string;
  status: 'Active' | 'Inactive';
}

interface PermissionModuleRow {
  module: string;
  description: string;
  permissions: Record<PermissionAction, boolean>;
}

const DEFAULT_STAFF_SECTION: StaffSection = 'dashboard';
const STAFF_SECTION_IDS = new Set<string>([
  'dashboard',
  'directory',
  'add',
  'roles',
  'assignments',
  'tasks',
  'attendance',
  'leave',
  'payroll',
  'performance',
  'documents',
  'logs',
]);

function normalizeStaffSection(value: string | null): StaffSection {
  return value && STAFF_SECTION_IDS.has(value) ? value as StaffSection : DEFAULT_STAFF_SECTION;
}

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataTableComponent,
    NgIconComponent,
    StaffFormComponent,
  ],
  providers: [
    StaffFacade,
    provideIcons({
      heroBanknotesSolid,
      heroCalendarDaysSolid,
      heroChartBarSolid,
      heroClipboardDocumentCheckSolid,
      heroClipboardDocumentListSolid,
      heroClockSolid,
      heroFolderOpenSolid,
      heroIdentificationSolid,
      heroMagnifyingGlassSolid,
      heroPencilSquareSolid,
      heroPlusSolid,
      heroShieldCheckSolid,
      heroSquares2x2Solid,
      heroUserGroupSolid,
    }),
  ],
  template: `
    <section class="staff-shell">
      <header class="staff-header">
        <div>
          <p class="staff-eyebrow">Staff Management</p>
          <h1>Staff Module</h1>
          <p>Employees, roles, assignments, attendance, payroll, performance, and documents for the firm team.</p>
        </div>
        <button type="button" class="staff-primary-button" (click)="openAddStaff()">
          <ng-icon name="heroPlusSolid" size="18"></ng-icon>
          Add Staff
        </button>
      </header>

      <main class="staff-content">
          @if (activeSection() === 'dashboard') {
            <div class="metric-grid">
              @for (card of kpiCards(); track card.label) {
                <article class="metric-card" [class]="card.tone">
                  <span>{{ card.label }}</span>
                  <strong>{{ card.value }}</strong>
                </article>
              }
            </div>

            <div class="staff-dashboard-grid">
              <article class="staff-panel">
                <div class="panel-head">
                  <h2>Department Workload</h2>
                  <span>{{ totalStaff() }} staff</span>
                </div>
                <div class="bar-list">
                  @for (row of departmentWorkload(); track row.label) {
                    <div class="bar-row">
                      <div>
                        <strong>{{ row.label }}</strong>
                        <span>{{ row.count }} assigned</span>
                      </div>
                      <div class="bar-track">
                        <div class="bar-fill" [style.width.%]="row.percent"></div>
                      </div>
                    </div>
                  }
                </div>
              </article>

              <article class="staff-panel">
                <div class="panel-head">
                  <h2>Attendance Trends</h2>
                  <span>This week</span>
                </div>
                <div class="trend-grid">
                  @for (day of attendanceTrend; track day.day) {
                    <div class="trend-col">
                      <div class="trend-bar" [style.height.%]="day.value"></div>
                      <span>{{ day.day }}</span>
                    </div>
                  }
                </div>
              </article>

              <article class="staff-panel">
                <div class="panel-head">
                  <h2>Productivity Score</h2>
                  <span>{{ productivityScore() }}%</span>
                </div>
                <div class="score-ring">
                  <div>
                    <strong>{{ productivityScore() }}%</strong>
                    <span>completion</span>
                  </div>
                </div>
              </article>

              <article class="staff-panel">
                <div class="panel-head">
                  <h2>Monthly Task Completion</h2>
                  <span>4 cycles</span>
                </div>
                <div class="completion-list">
                  @for (row of taskCompletion; track row.label) {
                    <div>
                      <div class="completion-meta">
                        <span>{{ row.label }}</span>
                        <strong>{{ row.value }}%</strong>
                      </div>
                      <div class="bar-track">
                        <div class="bar-fill green" [style.width.%]="row.value"></div>
                      </div>
                    </div>
                  }
                </div>
              </article>
            </div>
          } @else if (activeSection() === 'directory') {
            <article class="staff-panel table-panel">
              <app-data-table
                title="Staff Directory"
                [tableData]="staffRows()"
                [tableColumns]="tableColumns"
                [serverSide]="true"
                [totalCount]="facade.totalCount()"
                [loading]="facade.isLoading()"
                [actionsTemplate]="actionsTpl()"
                [rowClass]="getRowClass"
                [addFormComponent]="staffFormComponent"
                [updateFormComponent]="staffFormComponent"
                [canDelete]="false"
                (loadMore)="facade.updatePagination($event.offset, $event.limit)"
                (add)="onAdd()"
                (modalClosed)="facade.reload()"
              >
                <div class="staff-table-filters" filters>
                  <label class="search-box">
                    <ng-icon name="heroMagnifyingGlassSolid" size="16"></ng-icon>
                    <input
                      [ngModel]="facade.searchQuery()"
                      (ngModelChange)="onSearchChange($event)"
                      placeholder="Search staff"
                    />
                  </label>
                  <select [ngModel]="selectedRole()" (ngModelChange)="onRoleChange($event)">
                    <option value="all">All firm staff</option>
                    <option value="admin">Admin</option>
                    <option value="accountant">Accountant</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
              </app-data-table>
            </article>
          } @else if (activeSection() === 'add') {
            <app-staff-form [isModal]="true" [closeCallback]="closeInlineStaffForm"></app-staff-form>
          } @else if (activeSection() === 'roles') {
            <section class="role-permission-shell">
              <article class="staff-panel role-permission-hero">
                <div>
                  <p class="staff-eyebrow">Role & Permission Module</p>
                  <h2>Access control for firm teams</h2>
                  <span>Partners, managers, accountants, tax executives, auditors, admin staff, and interns.</span>
                </div>
                <div class="role-summary-grid">
                  <div>
                    <strong>{{ activeRoleCount() }}</strong>
                    <span>Active Roles</span>
                  </div>
                  <div>
                    <strong>{{ permissionMatrix().length }}</strong>
                    <span>Modules</span>
                  </div>
                  <div>
                    <strong>{{ staffRows().length }}</strong>
                    <span>Assigned Users</span>
                  </div>
                </div>
              </article>

              <nav class="role-switch" aria-label="Role permission switch">
                @for (item of rolePermissionSections; track item.id) {
                  <button
                    type="button"
                    [class.active]="activeRolePermissionSection() === item.id"
                    (click)="selectRolePermissionSection(item.id)"
                  >
                    <ng-icon [name]="item.icon" size="16"></ng-icon>
                    {{ item.label }}
                  </button>
                }
              </nav>

              @if (activeRolePermissionSection() === 'list') {
                <div class="role-grid">
                  @for (role of accessRoles(); track role.code) {
                    <article class="staff-panel role-card access-role-card">
                      <div class="role-card-top">
                        <div class="role-head">
                          <ng-icon name="heroShieldCheckSolid" size="20"></ng-icon>
                          <h2>{{ role.name }}</h2>
                        </div>
                        <span class="status-pill" [class.inactive]="role.status === 'Inactive'">{{ role.status }}</span>
                      </div>
                      <p>{{ role.description }}</p>
                      <dl class="role-meta">
                        <div>
                          <dt>Code</dt>
                          <dd>{{ role.code }}</dd>
                        </div>
                        <div>
                          <dt>Department</dt>
                          <dd>{{ role.department }}</dd>
                        </div>
                        <div>
                          <dt>Dashboard</dt>
                          <dd>{{ role.dashboard }}</dd>
                        </div>
                      </dl>
                      <div class="permission-list">
                        @for (permission of role.permissions; track permission) {
                          <span>{{ permission }}</span>
                        }
                      </div>
                    </article>
                  }
                </div>
              } @else if (activeRolePermissionSection() === 'create') {
                <article class="staff-panel role-form-panel">
                  <div class="panel-head">
                    <h2>Create Role</h2>
                    <span>Predefined access set</span>
                  </div>
                  <form class="role-create-form" (ngSubmit)="addRole()">
                    <label>
                      <span>Role Name</span>
                      <input
                        name="roleName"
                        [ngModel]="newRole().name"
                        (ngModelChange)="updateNewRole('name', $event)"
                        placeholder="Senior Accountant"
                      >
                    </label>
                    <label>
                      <span>Role Code</span>
                      <input
                        name="roleCode"
                        [ngModel]="newRole().code"
                        (ngModelChange)="updateNewRole('code', $event)"
                        placeholder="SEN-ACC"
                      >
                    </label>
                    <label>
                      <span>Department</span>
                      <select name="roleDepartment" [ngModel]="newRole().department" (ngModelChange)="updateNewRole('department', $event)">
                        <option>Accounts</option>
                        <option>Taxation</option>
                        <option>Audit</option>
                        <option>Compliance</option>
                        <option>Administration</option>
                      </select>
                    </label>
                    <label>
                      <span>Default Dashboard</span>
                      <select name="roleDashboard" [ngModel]="newRole().dashboard" (ngModelChange)="updateNewRole('dashboard', $event)">
                        <option>Firm Dashboard</option>
                        <option>Staff Dashboard</option>
                        <option>Accounting Dashboard</option>
                        <option>GST Filing Dashboard</option>
                        <option>Audit Dashboard</option>
                      </select>
                    </label>
                    <label>
                      <span>Status</span>
                      <select name="roleStatus" [ngModel]="newRole().status" (ngModelChange)="updateNewRole('status', $event)">
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </label>
                    <label class="span-2">
                      <span>Description</span>
                      <textarea
                        name="roleDescription"
                        [ngModel]="newRole().description"
                        (ngModelChange)="updateNewRole('description', $event)"
                        placeholder="What this role can manage"
                      ></textarea>
                    </label>
                    <div class="form-actions">
                      <button type="button" class="secondary-action" (click)="resetRoleDraft()">Reset</button>
                      <button type="submit" class="primary-action" [disabled]="!newRole().name || !newRole().code">Create Role</button>
                    </div>
                  </form>
                </article>
              } @else if (activeRolePermissionSection() === 'matrix') {
                <article class="staff-panel matrix-panel">
                  <div class="panel-head">
                    <h2>Permission Matrix</h2>
                    <span>View, create, edit, delete, export, approve</span>
                  </div>
                  <div class="table-wrap">
                    <table class="permission-table">
                      <thead>
                        <tr>
                          <th>Module</th>
                          @for (column of permissionColumns; track column.key) {
                            <th>{{ column.label }}</th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (module of permissionMatrix(); track module.module) {
                          <tr>
                            <td>
                              <strong>{{ module.module }}</strong>
                              <small>{{ module.description }}</small>
                            </td>
                            @for (column of permissionColumns; track column.key) {
                              <td>
                                <button
                                  type="button"
                                  class="matrix-toggle"
                                  [class.enabled]="module.permissions[column.key]"
                                  (click)="togglePermission(module.module, column.key)"
                                >
                                  <span class="sr-only">{{ module.module }} {{ column.label }}</span>
                                </button>
                              </td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  <div class="module-permission-grid">
                    @for (module of modulePermissionGroups; track module.title) {
                      <div class="module-permission-card">
                        <strong>{{ module.title }}</strong>
                        @for (item of module.items; track item) {
                          <span>{{ item }}</span>
                        }
                      </div>
                    }
                  </div>
                </article>
              } @else if (activeRolePermissionSection() === 'assignments') {
                <article class="staff-panel">
                  <div class="panel-head">
                    <h2>User Assignment</h2>
                    <span>{{ staffRows().length }} users</span>
                  </div>
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Staff</th>
                          <th>Current Role</th>
                          <th>Branch Restriction</th>
                          <th>Client Scope</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (member of staffRows(); track member.id) {
                          <tr>
                            <td>
                              <strong>{{ member.name }}</strong>
                              <small>{{ member.email || member.mobile }}</small>
                            </td>
                            <td>{{ assignmentRoleLabel(member) }}</td>
                            <td>{{ member.preferences?.staffProfile?.branchOffice || 'All branches' }}</td>
                            <td>{{ assignedClientScope(member) }}</td>
                            <td><span class="status-pill" [class.inactive]="!member.isActive">{{ member.isActive ? 'Active' : 'Inactive' }}</span></td>
                          </tr>
                        } @empty {
                          <tr><td colspan="5" class="empty-cell">No staff users available for assignment</td></tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </article>
              } @else if (activeRolePermissionSection() === 'approval') {
                <div class="approval-layout">
                  <article class="staff-panel approval-panel">
                    <div class="panel-head">
                      <h2>Approval Rules</h2>
                      <span>Maker checker workflow</span>
                    </div>
                    <div class="approval-flow">
                      @for (step of approvalFlow; track step.title) {
                        <div>
                          <strong>{{ step.title }}</strong>
                          <span>{{ step.description }}</span>
                        </div>
                      }
                    </div>
                  </article>
                  <article class="staff-panel approval-panel">
                    <div class="panel-head">
                      <h2>Data Restrictions</h2>
                      <span>Scope control</span>
                    </div>
                    <div class="restriction-list">
                      @for (restriction of dataRestrictions; track restriction.title) {
                        <div>
                          <strong>{{ restriction.title }}</strong>
                          <span>{{ restriction.example }}</span>
                        </div>
                      }
                    </div>
                  </article>
                </div>
                <article class="staff-panel security-panel">
                  <div class="panel-head">
                    <h2>Advanced Security</h2>
                    <span>Professional controls</span>
                  </div>
                  <div class="security-grid">
                    @for (feature of securityFeatures; track feature) {
                      <span>{{ feature }}</span>
                    }
                  </div>
                </article>
              } @else if (activeRolePermissionSection() === 'logs') {
                <article class="staff-panel">
                  <div class="panel-head">
                    <h2>Access Logs</h2>
                    <span>Login, edits, exports</span>
                  </div>
                  <div class="work-list">
                    @for (log of accessLogs(); track log.id) {
                      <div class="work-row access-log-row">
                        <strong>{{ log.actor }}</strong>
                        <span>{{ log.action }}</span>
                        <em>{{ log.status }}</em>
                      </div>
                    }
                  </div>
                </article>
              }
            </section>
          } @else if (activeSection() === 'assignments') {
            <article class="staff-panel">
              <div class="panel-head">
                <h2>Client Assignment</h2>
                <span>{{ staffRows().length }} staff</span>
              </div>
              <div class="assignment-grid">
                @for (member of staffRows(); track member.id) {
                  <div class="assignment-card">
                    <div>
                      <strong>{{ member.name }}</strong>
                      <span>{{ formatRole(member.role) }}</span>
                    </div>
                    <button type="button">Assign Client</button>
                  </div>
                } @empty {
                  <div class="empty-state">No staff available for assignment</div>
                }
              </div>
            </article>
          } @else if (activeSection() === 'tasks') {
            <div class="split-grid">
              <article class="staff-panel">
                <div class="panel-head">
                  <h2>Task Management</h2>
                  <span>CA workflow</span>
                </div>
                <div class="work-list">
                  @for (task of taskTypes; track task.name) {
                    <div class="work-row">
                      <strong>{{ task.name }}</strong>
                      <span>{{ task.priority }} priority</span>
                      <em>{{ task.status }}</em>
                    </div>
                  }
                </div>
              </article>
              <article class="staff-panel">
                <div class="panel-head">
                  <h2>Workload Balancing</h2>
                  <span>{{ staffRows().length }} staff</span>
                </div>
                <div class="work-list">
                  @for (member of staffRows(); track member.id) {
                    <div class="work-row">
                      <strong>{{ member.name }}</strong>
                      <span>0 open tasks</span>
                      <em>Available</em>
                    </div>
                  } @empty {
                    <div class="empty-state">No workload data</div>
                  }
                </div>
              </article>
            </div>
          } @else if (activeSection() === 'attendance') {
            <ng-container *ngTemplateOutlet="staffStatusTable; context: { title: 'Attendance', label: 'Work hours', status: 'Not checked in' }"></ng-container>
          } @else if (activeSection() === 'leave') {
            <ng-container *ngTemplateOutlet="staffStatusTable; context: { title: 'Leave Management', label: 'Leave balance', status: 'No leave request' }"></ng-container>
          } @else if (activeSection() === 'payroll') {
            <ng-container *ngTemplateOutlet="staffStatusTable; context: { title: 'Payroll', label: 'Salary structure', status: 'Not configured' }"></ng-container>
          } @else if (activeSection() === 'performance') {
            <article class="staff-panel">
              <div class="panel-head">
                <h2>Performance Tracking</h2>
                <span>Scorecard</span>
              </div>
              <div class="performance-grid">
                @for (member of staffRows(); track member.id) {
                  <div class="performance-card">
                    <div class="avatar">{{ initials(member.name) }}</div>
                    <strong>{{ member.name }}</strong>
                    <span>{{ formatRole(member.role) }}</span>
                    <div class="bar-track">
                      <div class="bar-fill green" style="width: 0%"></div>
                    </div>
                    <small>Awaiting task history</small>
                  </div>
                } @empty {
                  <div class="empty-state">No performance data</div>
                }
              </div>
            </article>
          } @else if (activeSection() === 'documents') {
            <article class="staff-panel">
              <div class="panel-head">
                <h2>Document Center</h2>
                <span>HR files</span>
              </div>
              <div class="document-grid">
                @for (doc of documentRows; track doc) {
                  <div class="document-card">
                    <ng-icon name="heroFolderOpenSolid" size="20"></ng-icon>
                    <strong>{{ doc }}</strong>
                    <span>0 files</span>
                  </div>
                }
              </div>
            </article>
          } @else if (activeSection() === 'logs') {
            <article class="staff-panel">
              <div class="panel-head">
                <h2>Activity Logs</h2>
                <span>{{ staffRows().length }} entries</span>
              </div>
              <div class="work-list">
                @for (member of staffRows(); track member.id) {
                  <div class="work-row">
                    <strong>{{ member.name }}</strong>
                    <span>Profile active: {{ member.isActive ? 'Yes' : 'No' }}</span>
                    <em>{{ member.lastLoginAt ? 'Logged in' : 'No login yet' }}</em>
                  </div>
                } @empty {
                  <div class="empty-state">No activity logs</div>
                }
              </div>
            </article>
          }
      </main>

      <ng-template #staffStatusTable let-title="title" let-label="label" let-status="status">
        <article class="staff-panel">
          <div class="panel-head">
            <h2>{{ title }}</h2>
            <span>{{ staffRows().length }} staff</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Role</th>
                  <th>{{ label }}</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (member of staffRows(); track member.id) {
                  <tr>
                    <td>
                      <strong>{{ member.name }}</strong>
                      <small>{{ member.mobile }}</small>
                    </td>
                    <td>{{ formatRole(member.role) }}</td>
                    <td>Pending setup</td>
                    <td><span class="status-pill">{{ status }}</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="empty-cell">No staff records</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      </ng-template>

      <ng-template #actionsTemplate let-row="row">
        <div class="flex items-center justify-end gap-1">
          <button
            type="button"
            (click)="onEdit(row)"
            class="w-8 h-8 flex items-center justify-center rounded-xl text-amber-500 hover:bg-amber-50 transition-colors"
            title="Edit"
          >
            <ng-icon name="heroPencilSquareSolid" size="18"></ng-icon>
          </button>
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .staff-shell {
      color: #0f172a;
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 20px;
    }

    .staff-header {
      align-items: flex-end;
      background: #fff;
      border: 1px solid #dbe4ef;
      border-radius: 16px;
      box-shadow: 0 14px 34px rgba(15, 23, 42, .07);
      display: flex;
      gap: 18px;
      justify-content: space-between;
      padding: 20px 22px;
    }

    .staff-eyebrow {
      color: #2563eb;
      font-size: 11px;
      font-weight: 950;
      margin: 0 0 8px;
      text-transform: uppercase;
    }

    .staff-header h1 {
      color: #020617;
      font-size: 30px;
      font-weight: 950;
      line-height: 1.05;
      margin: 0;
    }

    .staff-header p {
      color: #64748b;
      font-size: 14px;
      font-weight: 650;
      line-height: 1.45;
      margin: 8px 0 0;
      max-width: 760px;
    }

    .staff-primary-button {
      align-items: center;
      background: #2454dc;
      border: 0;
      border-radius: 12px;
      box-shadow: 0 10px 22px rgba(37, 99, 235, .22);
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      font-size: 13px;
      font-weight: 950;
      gap: 8px;
      min-height: 44px;
      padding: 0 18px;
      white-space: nowrap;
    }

    .staff-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }

    .metric-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .metric-card,
    .staff-panel {
      background: #fff;
      border: 1px solid #dbe4ef;
      border-radius: 14px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .055);
    }

    .metric-card {
      min-height: 118px;
      padding: 18px;
    }

    .metric-card span {
      color: #5d6f89;
      display: block;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .metric-card strong {
      color: #020617;
      display: block;
      font-size: 28px;
      font-weight: 950;
      margin-top: 16px;
    }

    .metric-card.green strong { color: #047857; }
    .metric-card.amber strong { color: #b45309; }
    .metric-card.blue strong { color: #1d4ed8; }

    .staff-dashboard-grid,
    .split-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .panel-head {
      align-items: center;
      background: #fbfdff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      min-height: 60px;
      padding: 15px 18px;
    }

    .panel-head h2 {
      color: #020617;
      font-size: 15px;
      font-weight: 950;
      margin: 0;
    }

    .panel-head span {
      color: #5d6f89;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .bar-list,
    .completion-list,
    .work-list {
      display: grid;
      gap: 12px;
      padding: 18px;
    }

    .bar-row {
      display: grid;
      gap: 8px;
    }

    .bar-row strong,
    .work-row strong {
      color: #0f172a;
      display: block;
      font-size: 13px;
      font-weight: 950;
    }

    .bar-row span,
    .work-row span {
      color: #64748b;
      font-size: 12px;
      font-weight: 750;
    }

    .bar-track {
      background: #edf2f7;
      border-radius: 999px;
      height: 8px;
      overflow: hidden;
    }

    .bar-fill {
      background: #2454dc;
      border-radius: inherit;
      height: 100%;
      min-width: 5%;
    }

    .bar-fill.green {
      background: #059669;
    }

    .trend-grid {
      align-items: end;
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      min-height: 220px;
      padding: 18px;
    }

    .trend-col {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 170px;
      justify-content: end;
    }

    .trend-bar {
      background: linear-gradient(180deg, #2563eb, #0f766e);
      border-radius: 6px 6px 2px 2px;
      min-height: 8px;
      width: 100%;
    }

    .trend-col span,
    .completion-meta span,
    .completion-meta strong {
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }

    .score-ring {
      align-items: center;
      display: flex;
      justify-content: center;
      min-height: 220px;
      padding: 20px;
    }

    .score-ring > div {
      align-items: center;
      border: 12px solid #dbeafe;
      border-top-color: #2563eb;
      border-right-color: #059669;
      border-radius: 999px;
      display: flex;
      flex-direction: column;
      height: 156px;
      justify-content: center;
      width: 156px;
    }

    .score-ring strong {
      font-size: 30px;
      font-weight: 950;
    }

    .score-ring span {
      color: #64748b;
      font-size: 12px;
      font-weight: 850;
    }

    .completion-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 7px;
    }

    .table-panel {
      overflow: hidden;
      padding: 0;
    }

    .staff-table-filters {
      align-items: center;
      display: flex;
      gap: 10px;
      min-width: 0;
    }

    .search-box {
      align-items: center;
      background: #f8fafc;
      border: 1px solid #dbe4ef;
      border-radius: 12px;
      color: #64748b;
      display: flex;
      gap: 8px;
      height: 40px;
      padding: 0 12px;
      width: 240px;
    }

    .search-box input,
    .staff-table-filters select {
      background: transparent;
      border: 0;
      color: #0f172a;
      font-size: 13px;
      font-weight: 750;
      outline: none;
      width: 100%;
    }

    .staff-table-filters select {
      background: #f8fafc;
      border: 1px solid #dbe4ef;
      border-radius: 12px;
      height: 40px;
      padding: 0 12px;
      width: 160px;
    }

    .role-permission-shell {
      display: grid;
      gap: 16px;
      min-width: 0;
    }

    .role-permission-hero {
      align-items: center;
      display: grid;
      gap: 20px;
      grid-template-columns: minmax(0, 1fr) auto;
      padding: 20px;
    }

    .role-permission-hero h2 {
      color: #020617;
      font-size: 24px;
      font-weight: 950;
      letter-spacing: 0;
      margin: 4px 0 6px;
    }

    .role-permission-hero span {
      color: #5d6f89;
      font-size: 13px;
      font-weight: 750;
    }

    .role-summary-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(3, minmax(112px, 1fr));
    }

    .role-summary-grid div {
      background: #f8fbff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
    }

    .role-summary-grid strong {
      color: #1d4ed8;
      display: block;
      font-size: 24px;
      font-weight: 950;
    }

    .role-summary-grid span {
      color: #64748b;
      display: block;
      font-size: 11px;
      font-weight: 900;
      margin-top: 2px;
      text-transform: uppercase;
    }

    .role-switch {
      align-items: center;
      background: rgba(255, 255, 255, .72);
      border: 1px solid #dbe4ef;
      border-radius: 16px;
      box-shadow: 0 10px 22px rgba(15, 23, 42, .045);
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 8px;
    }

    .role-switch button {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 12px;
      color: #52657f;
      cursor: pointer;
      display: inline-flex;
      flex: 0 0 auto;
      gap: 7px;
      font-size: 13px;
      font-weight: 950;
      min-height: 42px;
      padding: 0 14px;
      white-space: nowrap;
    }

    .role-switch button.active {
      background: #fff;
      box-shadow: 0 8px 18px rgba(15, 23, 42, .075);
      color: #0d4bf0;
    }

    .role-grid,
    .assignment-grid,
    .performance-grid,
    .document-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .role-card {
      padding: 18px;
    }

    .access-role-card {
      display: flex;
      flex-direction: column;
      min-height: 254px;
    }

    .role-card-top {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }

    .role-head {
      align-items: center;
      color: #1d4ed8;
      display: flex;
      gap: 10px;
    }

    .role-head h2 {
      color: #0f172a;
      font-size: 16px;
      font-weight: 950;
      margin: 0;
    }

    .role-card p {
      color: #64748b;
      font-size: 13px;
      font-weight: 650;
      margin: 10px 0 14px;
    }

    .role-meta {
      border-top: 1px solid #eef2f7;
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin: auto 0 14px;
      padding-top: 14px;
    }

    .role-meta div {
      min-width: 0;
    }

    .role-meta dt {
      color: #94a3b8;
      font-size: 10px;
      font-weight: 950;
      text-transform: uppercase;
    }

    .role-meta dd {
      color: #0f172a;
      font-size: 12px;
      font-weight: 900;
      margin: 3px 0 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .permission-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .permission-list span,
    .status-pill {
      background: #eef6ff;
      border-radius: 999px;
      color: #1d4ed8;
      display: inline-flex;
      font-size: 11px;
      font-weight: 900;
      padding: 6px 9px;
    }

    .status-pill.inactive {
      background: #f1f5f9;
      color: #64748b;
    }

    .role-form-panel,
    .matrix-panel,
    .approval-panel,
    .security-panel {
      overflow: hidden;
    }

    .role-create-form {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: 18px;
    }

    .role-create-form label {
      display: grid;
      gap: 7px;
    }

    .role-create-form label span {
      color: #52657f;
      font-size: 11px;
      font-weight: 950;
      text-transform: uppercase;
    }

    .role-create-form input,
    .role-create-form select,
    .role-create-form textarea {
      background: #f8fbff;
      border: 1px solid #dbe4ef;
      border-radius: 12px;
      color: #0f172a;
      font: inherit;
      font-size: 13px;
      font-weight: 750;
      min-height: 42px;
      outline: none;
      padding: 0 12px;
      width: 100%;
    }

    .role-create-form textarea {
      min-height: 104px;
      padding: 12px;
      resize: vertical;
    }

    .span-2 {
      grid-column: span 2;
    }

    .form-actions {
      align-items: center;
      display: flex;
      gap: 10px;
      grid-column: span 2;
      justify-content: flex-end;
    }

    .primary-action,
    .secondary-action {
      border-radius: 12px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 950;
      min-height: 40px;
      padding: 0 16px;
    }

    .primary-action {
      background: #2454dc;
      border: 1px solid #2454dc;
      color: #fff;
    }

    .primary-action:disabled {
      cursor: not-allowed;
      opacity: .52;
    }

    .secondary-action {
      background: #fff;
      border: 1px solid #dbe4ef;
      color: #52657f;
    }

    .permission-table {
      min-width: 860px;
    }

    .permission-table th:not(:first-child),
    .permission-table td:not(:first-child) {
      text-align: center;
    }

    .matrix-toggle {
      background: #e2e8f0;
      border: 0;
      border-radius: 999px;
      cursor: pointer;
      height: 26px;
      position: relative;
      width: 48px;
    }

    .matrix-toggle::after {
      background: #fff;
      border-radius: 999px;
      box-shadow: 0 2px 6px rgba(15, 23, 42, .18);
      content: '';
      height: 20px;
      left: 3px;
      position: absolute;
      top: 3px;
      transition: transform .18s ease;
      width: 20px;
    }

    .matrix-toggle.enabled {
      background: #2454dc;
    }

    .matrix-toggle.enabled::after {
      transform: translateX(22px);
    }

    .sr-only {
      border: 0;
      clip: rect(0, 0, 0, 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }

    .module-permission-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      padding: 18px;
    }

    .module-permission-card {
      background: #f8fbff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      display: grid;
      gap: 8px;
      padding: 14px;
    }

    .module-permission-card strong {
      color: #0f172a;
      font-size: 13px;
      font-weight: 950;
    }

    .module-permission-card span,
    .restriction-list span,
    .approval-flow span {
      color: #64748b;
      font-size: 12px;
      font-weight: 750;
    }

    .approval-layout {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .approval-flow,
    .restriction-list {
      display: grid;
      gap: 12px;
      padding: 18px;
    }

    .approval-flow div,
    .restriction-list div {
      background: #f8fbff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      display: grid;
      gap: 4px;
      padding: 14px;
    }

    .approval-flow strong,
    .restriction-list strong {
      color: #0f172a;
      font-size: 13px;
      font-weight: 950;
    }

    .security-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 18px;
    }

    .security-grid span {
      background: #eef6ff;
      border: 1px solid #dbeafe;
      border-radius: 999px;
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 900;
      padding: 8px 11px;
    }

    .access-log-row {
      grid-template-columns: minmax(0, 1fr) minmax(220px, 2fr) auto;
    }

    .assignment-grid,
    .performance-grid,
    .document-grid {
      padding: 18px;
    }

    .assignment-card,
    .performance-card,
    .document-card,
    .work-row {
      align-items: center;
      background: #f8fbff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      padding: 14px;
    }

    .assignment-card strong,
    .document-card strong,
    .performance-card strong {
      color: #0f172a;
      display: block;
      font-size: 13px;
      font-weight: 950;
    }

    .assignment-card span,
    .document-card span,
    .performance-card span,
    .performance-card small {
      color: #64748b;
      display: block;
      font-size: 12px;
      font-weight: 750;
    }

    .assignment-card button {
      background: #fff;
      border: 1px solid #dbeafe;
      border-radius: 10px;
      color: #1d4ed8;
      cursor: pointer;
      font-size: 12px;
      font-weight: 950;
      min-height: 34px;
      padding: 0 12px;
      white-space: nowrap;
    }

    .work-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
    }

    .work-row em {
      color: #059669;
      font-size: 12px;
      font-style: normal;
      font-weight: 900;
      white-space: nowrap;
    }

    .performance-card,
    .document-card {
      align-items: flex-start;
      flex-direction: column;
      justify-content: flex-start;
    }

    .avatar {
      align-items: center;
      background: #dbeafe;
      border-radius: 999px;
      color: #1d4ed8;
      display: flex;
      font-size: 12px;
      font-weight: 950;
      height: 36px;
      justify-content: center;
      width: 36px;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      border-collapse: collapse;
      min-width: 760px;
      width: 100%;
    }

    th {
      background: #f8fbff;
      color: #5d6f89;
      font-size: 11px;
      font-weight: 950;
      padding: 13px 16px;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    td {
      border-top: 1px solid #eef2f7;
      color: #253449;
      font-size: 13px;
      font-weight: 700;
      padding: 13px 16px;
      vertical-align: middle;
    }

    td strong {
      color: #020617;
      display: block;
      font-weight: 950;
    }

    td small {
      color: #94a3b8;
      display: block;
      font-size: 11px;
      font-weight: 800;
      margin-top: 2px;
    }

    .empty-state,
    .empty-cell {
      color: #8ea0b8;
      font-size: 13px;
      font-weight: 850;
      padding: 34px 16px;
      text-align: center;
    }

    :host-context(.dark) .staff-shell {
      color: #eaf2fc;
    }

    :host-context(.dark) .staff-header,
    :host-context(.dark) .metric-card,
    :host-context(.dark) .staff-panel {
      background: #10213a;
      border-color: #263b59;
      box-shadow: 0 12px 28px rgba(0, 0, 0, .28);
    }

    :host-context(.dark) .panel-head,
    :host-context(.dark) .role-switch,
    :host-context(.dark) .search-box,
    :host-context(.dark) .staff-table-filters select,
    :host-context(.dark) .role-summary-grid div,
    :host-context(.dark) .module-permission-card,
    :host-context(.dark) .approval-flow div,
    :host-context(.dark) .restriction-list div,
    :host-context(.dark) .assignment-card,
    :host-context(.dark) .performance-card,
    :host-context(.dark) .document-card,
    :host-context(.dark) .work-row,
    :host-context(.dark) .role-create-form input,
    :host-context(.dark) .role-create-form select,
    :host-context(.dark) .role-create-form textarea,
    :host-context(.dark) .secondary-action,
    :host-context(.dark) th {
      background: #14243c;
      border-color: #263b59;
      color: #eaf2fc;
    }

    :host-context(.dark) .staff-header h1,
    :host-context(.dark) .panel-head h2,
    :host-context(.dark) .metric-card strong,
    :host-context(.dark) .bar-row strong,
    :host-context(.dark) .work-row strong,
    :host-context(.dark) .score-ring strong,
    :host-context(.dark) .role-permission-hero h2,
    :host-context(.dark) .role-head h2,
    :host-context(.dark) .role-meta dd,
    :host-context(.dark) .module-permission-card strong,
    :host-context(.dark) .approval-flow strong,
    :host-context(.dark) .restriction-list strong,
    :host-context(.dark) .assignment-card strong,
    :host-context(.dark) .document-card strong,
    :host-context(.dark) .performance-card strong,
    :host-context(.dark) td,
    :host-context(.dark) td strong {
      color: #eaf2fc;
    }

    :host-context(.dark) .staff-header p,
    :host-context(.dark) .metric-card span,
    :host-context(.dark) .panel-head span,
    :host-context(.dark) .bar-row span,
    :host-context(.dark) .work-row span,
    :host-context(.dark) .trend-col span,
    :host-context(.dark) .completion-meta span,
    :host-context(.dark) .completion-meta strong,
    :host-context(.dark) .score-ring span,
    :host-context(.dark) .role-permission-hero span,
    :host-context(.dark) .role-card p,
    :host-context(.dark) .role-meta dt,
    :host-context(.dark) .role-summary-grid span,
    :host-context(.dark) .module-permission-card span,
    :host-context(.dark) .restriction-list span,
    :host-context(.dark) .approval-flow span,
    :host-context(.dark) .assignment-card span,
    :host-context(.dark) .document-card span,
    :host-context(.dark) .performance-card span,
    :host-context(.dark) .performance-card small,
    :host-context(.dark) td small,
    :host-context(.dark) th,
    :host-context(.dark) .empty-state,
    :host-context(.dark) .empty-cell {
      color: #8ea2ba;
    }

    :host-context(.dark) .staff-eyebrow,
    :host-context(.dark) .role-head,
    :host-context(.dark) .role-summary-grid strong,
    :host-context(.dark) .role-switch button.active,
    :host-context(.dark) .permission-list span,
    :host-context(.dark) .status-pill,
    :host-context(.dark) .security-grid span,
    :host-context(.dark) .assignment-card button {
      color: #93c5fd;
    }

    :host-context(.dark) .metric-card.green strong,
    :host-context(.dark) .work-row em {
      color: #86efac;
    }

    :host-context(.dark) .metric-card.amber strong {
      color: #fcd34d;
    }

    :host-context(.dark) .metric-card.blue strong {
      color: #93c5fd;
    }

    :host-context(.dark) .bar-track {
      background: #203451;
    }

    :host-context(.dark) .score-ring > div {
      border-color: #203451;
      border-top-color: #60a5fa;
      border-right-color: #34d399;
    }

    :host-context(.dark) .role-switch button {
      color: #b8c7d9;
    }

    :host-context(.dark) .role-switch button.active,
    :host-context(.dark) .permission-list span,
    :host-context(.dark) .security-grid span,
    :host-context(.dark) .assignment-card button {
      background: rgba(96, 165, 250, .16);
      border-color: rgba(147, 197, 253, .32);
    }

    :host-context(.dark) .status-pill {
      background: rgba(96, 165, 250, .16);
    }

    :host-context(.dark) .status-pill.inactive {
      background: rgba(148, 163, 184, .12);
      color: #94a3b8;
    }

    :host-context(.dark) .search-box input,
    :host-context(.dark) .staff-table-filters select,
    :host-context(.dark) .role-create-form input,
    :host-context(.dark) .role-create-form select,
    :host-context(.dark) .role-create-form textarea {
      color: #eaf2fc;
    }

    :host-context(.dark) .search-box input::placeholder,
    :host-context(.dark) .role-create-form input::placeholder,
    :host-context(.dark) .role-create-form textarea::placeholder {
      color: #637a96;
    }

    :host-context(.dark) .role-meta,
    :host-context(.dark) td {
      border-color: #263b59;
    }

    :host-context(.dark) .matrix-toggle {
      background: #263b59;
    }

    :host-context(.dark) .matrix-toggle::after {
      background: #dbeafe;
    }

    :host-context(.dark) .matrix-toggle.enabled {
      background: #2563eb;
    }

    @media (max-width: 1180px) {
      .metric-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .staff-dashboard-grid,
      .split-grid,
      .role-grid,
      .assignment-grid,
      .performance-grid,
      .document-grid,
      .module-permission-grid,
      .approval-layout {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .staff-shell {
        padding: 12px;
      }

      .staff-header {
        align-items: stretch;
        flex-direction: column;
      }

      .metric-grid,
      .staff-dashboard-grid,
      .split-grid,
      .role-grid,
      .assignment-grid,
      .performance-grid,
      .document-grid,
      .role-permission-hero,
      .role-summary-grid,
      .role-create-form,
      .module-permission-grid,
      .approval-layout {
        grid-template-columns: 1fr;
      }

      .span-2,
      .form-actions {
        grid-column: auto;
      }

      .form-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .staff-table-filters {
        align-items: stretch;
        flex-direction: column;
      }

      .search-box,
      .staff-table-filters select {
        width: 100%;
      }

      .work-row {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffListComponent {
  facade: StaffFacade = inject(StaffFacade);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  staffFormComponent = StaffFormComponent;

  actionsTpl = viewChild.required<TemplateRef<any>>('actionsTemplate');

  @ViewChild(DataTableComponent) dataTable!: DataTableComponent;

  private routeSection = toSignal(
    this.route.queryParamMap.pipe(map((params) => normalizeStaffSection(params.get('section')))),
    { initialValue: DEFAULT_STAFF_SECTION }
  );
  activeSection = computed(() => this.routeSection());

  readonly sections: ReadonlyArray<{ id: StaffSection; label: string; icon: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: 'heroSquares2x2Solid' },
    { id: 'directory', label: 'Staff Directory', icon: 'heroUserGroupSolid' },
    { id: 'add', label: 'Add Staff', icon: 'heroPlusSolid' },
    { id: 'roles', label: 'Roles & Permissions', icon: 'heroShieldCheckSolid' },
    { id: 'assignments', label: 'Client Assignment', icon: 'heroIdentificationSolid' },
    { id: 'tasks', label: 'Task Management', icon: 'heroClipboardDocumentCheckSolid' },
    { id: 'attendance', label: 'Attendance', icon: 'heroClockSolid' },
    { id: 'leave', label: 'Leave Management', icon: 'heroCalendarDaysSolid' },
    { id: 'payroll', label: 'Payroll', icon: 'heroBanknotesSolid' },
    { id: 'performance', label: 'Performance', icon: 'heroChartBarSolid' },
    { id: 'documents', label: 'Documents', icon: 'heroFolderOpenSolid' },
    { id: 'logs', label: 'Activity Logs', icon: 'heroClipboardDocumentListSolid' },
  ];

  readonly rolePermissionSections: ReadonlyArray<{ id: RolePermissionSection; label: string; icon: string }> = [
    { id: 'list', label: 'Roles List', icon: 'heroShieldCheckSolid' },
    { id: 'create', label: 'Create Role', icon: 'heroPlusSolid' },
    { id: 'matrix', label: 'Permission Matrix', icon: 'heroClipboardDocumentCheckSolid' },
    { id: 'assignments', label: 'User Assignment', icon: 'heroUserGroupSolid' },
    { id: 'approval', label: 'Approval Rules', icon: 'heroClipboardDocumentListSolid' },
    { id: 'logs', label: 'Access Logs', icon: 'heroClockSolid' },
  ];

  activeRolePermissionSection = signal<RolePermissionSection>('list');

  accessRoles = signal<RoleDefinition[]>([
    {
      name: 'Partner',
      code: 'PARTNER',
      department: 'Management',
      description: 'Full business control across clients, billing, staff, approvals, and reports.',
      dashboard: 'Firm Dashboard',
      status: 'Active',
      permissions: ['All modules', 'Final approval', 'Sensitive data', 'Exports'],
    },
    {
      name: 'Manager',
      code: 'MANAGER',
      department: 'Accounts',
      description: 'Team management, review workflow, client ownership, and branch-level reporting.',
      dashboard: 'Staff Dashboard',
      status: 'Active',
      permissions: ['Team review', 'Client assignment', 'Reports', 'Approvals'],
    },
    {
      name: 'Accountant',
      code: 'ACCOUNTANT',
      department: 'Accounts',
      description: 'Accounting entries, vouchers, ledger reports, client billing, and reconciliations.',
      dashboard: 'Accounting Dashboard',
      status: 'Active',
      permissions: ['Ledger', 'Vouchers', 'Client billing', 'No deletes'],
    },
    {
      name: 'Tax Executive',
      code: 'TAX-EXEC',
      department: 'Taxation',
      description: 'GST filing, TDS filing, return submission, and compliance reports.',
      dashboard: 'GST Filing Dashboard',
      status: 'Active',
      permissions: ['GST filing', 'TDS filing', 'Compliance reports', 'No payroll'],
    },
    {
      name: 'Auditor',
      code: 'AUDITOR',
      department: 'Audit',
      description: 'Audit files, audit reports, workpaper review, and financial reporting.',
      dashboard: 'Audit Dashboard',
      status: 'Active',
      permissions: ['Audit files', 'Financial reports', 'Partner review'],
    },
    {
      name: 'Admin',
      code: 'ADMIN',
      department: 'Administration',
      description: 'Staff management, office operations, document coordination, and attendance support.',
      dashboard: 'Staff Dashboard',
      status: 'Active',
      permissions: ['Staff', 'Documents', 'Attendance', 'Office ops'],
    },
    {
      name: 'Intern',
      code: 'INTERN',
      department: 'Accounts',
      description: 'Limited read and task execution access with manager approval required.',
      dashboard: 'Staff Dashboard',
      status: 'Active',
      permissions: ['Assigned clients', 'Task updates', 'No exports', 'No deletes'],
    },
  ]);

  newRole = signal<RoleDraft>({
    name: '',
    code: '',
    department: 'Accounts',
    description: '',
    dashboard: 'Staff Dashboard',
    status: 'Active',
  });

  readonly permissionColumns: ReadonlyArray<{ key: PermissionAction; label: string }> = [
    { key: 'view', label: 'View' },
    { key: 'create', label: 'Create' },
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete' },
    { key: 'export', label: 'Export' },
    { key: 'approve', label: 'Approve' },
  ];

  permissionMatrix = signal<PermissionModuleRow[]>([
    {
      module: 'Clients',
      description: 'View clients, add client, edit client, delete client.',
      permissions: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
    },
    {
      module: 'Ledger',
      description: 'Journal, payment, receipt, reports, trial balance.',
      permissions: { view: true, create: true, edit: true, delete: false, export: true, approve: false },
    },
    {
      module: 'Payroll',
      description: 'Salary records, payslips, payroll reports.',
      permissions: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
    },
    {
      module: 'GST Filing',
      description: 'GST filing, return submission, compliance reports.',
      permissions: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
    },
    {
      module: 'Staff',
      description: 'Staff directory, roles, assignments, performance.',
      permissions: { view: true, create: false, edit: false, delete: false, export: false, approve: false },
    },
    {
      module: 'Billing',
      description: 'Create, send, edit, and approve invoices.',
      permissions: { view: true, create: true, edit: true, delete: false, export: true, approve: true },
    },
  ]);

  readonly modulePermissionGroups = [
    { title: 'Client Module', items: ['View clients', 'Add client', 'Edit client', 'Delete client'] },
    { title: 'Accounting Module', items: ['Journal entry', 'Payment entry', 'Receipt entry', 'Ledger reports', 'Trial balance', 'Balance sheet'] },
    { title: 'Tax Module', items: ['GST filing', 'TDS filing', 'Return submission'] },
    { title: 'Billing Module', items: ['Create invoice', 'Send invoice', 'Edit invoice', 'Approve invoice'] },
  ];

  readonly approvalFlow = [
    { title: 'Junior Accountant creates entry', description: 'Draft entry is saved for manager review.' },
    { title: 'Manager reviews', description: 'Manager checks ledger, tax, and client scope.' },
    { title: 'Partner approves', description: 'Partner gives final approval for sensitive records.' },
    { title: 'Entry locked', description: 'Approved entry becomes locked for audit integrity.' },
  ];

  readonly dataRestrictions = [
    { title: 'Branch', example: 'Ahmedabad staff can only see Ahmedabad branch data.' },
    { title: 'Client Group', example: 'Restrict users to GST, audit, payroll, or assigned client groups.' },
    { title: 'Assigned Clients', example: 'Staff can only open clients assigned to them.' },
    { title: 'Department', example: 'Tax team sees GST and TDS work, not payroll.' },
    { title: 'Date Lock', example: 'Older approved periods need partner permission to edit.' },
  ];

  readonly securityFeatures = [
    'Two-factor login',
    'Login session control',
    'Screen lock',
    'Download restrictions',
    'Print restrictions',
    'Sensitive data masking',
    'Auto logout',
  ];

  readonly taskTypes = [
    { name: 'GST Return Filing', priority: 'High', status: 'Ready' },
    { name: 'TDS Filing', priority: 'High', status: 'Ready' },
    { name: 'Income Tax Return', priority: 'Medium', status: 'Ready' },
    { name: 'Audit Workpapers', priority: 'Medium', status: 'Ready' },
    { name: 'Ledger Finalization', priority: 'High', status: 'Ready' },
  ];

  readonly attendanceTrend = [
    { day: 'Mon', value: 78 },
    { day: 'Tue', value: 84 },
    { day: 'Wed', value: 72 },
    { day: 'Thu', value: 88 },
    { day: 'Fri', value: 80 },
    { day: 'Sat', value: 45 },
  ];

  readonly taskCompletion = [
    { label: 'Week 1', value: 0 },
    { label: 'Week 2', value: 0 },
    { label: 'Week 3', value: 0 },
    { label: 'Week 4', value: 0 },
  ];

  readonly documentRows = ['Appointment Letter', 'ID Proof', 'Resume', 'Certificates', 'Salary Slips'];

  staffRows = computed(() => this.facade.staff());
  totalStaff = computed(() => this.staffRows().length);
  activeStaff = computed(() => this.staffRows().filter((staff: any) => staff.isActive).length);
  selectedRole = computed(() => this.facade.roleFilter() ?? 'all');
  activeRoleCount = computed(() => this.accessRoles().filter((role) => role.status === 'Active').length);

  accessLogs = computed(() => {
    const rows = this.staffRows();
    if (!rows.length) {
      return [
        { id: 'log-system-1', actor: 'System', action: 'Role permission workspace ready', status: 'Ready' },
        { id: 'log-system-2', actor: 'System', action: 'Download and print restrictions configured', status: 'Security' },
      ];
    }

    return rows.slice(0, 8).map((member: any, index: number) => ({
      id: member.id || `log-${index}`,
      actor: member.name,
      action: member.lastLoginAt ? `Logged in at ${new Date(member.lastLoginAt).toLocaleString()}` : 'No login history yet',
      status: member.isActive ? 'Allowed' : 'Blocked',
    }));
  });

  kpiCards = computed(() => [
    { label: 'Total Staff', value: this.totalStaff(), tone: 'blue' },
    { label: 'Active Staff', value: this.activeStaff(), tone: 'green' },
    { label: 'Staff on Leave', value: 0, tone: 'amber' },
    { label: 'Tasks Due Today', value: 0, tone: '' },
    { label: 'Pending Client Work', value: 0, tone: 'blue' },
    { label: 'Salary Due', value: 'INR 0', tone: 'green' },
  ]);

  departmentWorkload = computed(() => {
    const rows = [
      { label: 'Admin', count: this.staffRows().filter((staff: any) => staff.role === 'admin').length },
      { label: 'Accounts', count: this.staffRows().filter((staff: any) => staff.role === 'accountant').length },
      { label: 'Operations', count: this.staffRows().filter((staff: any) => staff.role === 'staff').length },
    ];
    const max = Math.max(...rows.map((row) => row.count), 1);
    return rows.map((row) => ({ ...row, percent: Math.max((row.count / max) * 100, row.count ? 12 : 0) }));
  });

  productivityScore = computed(() => this.totalStaff() ? 0 : 0);

  get tableColumns(): any[] {
    return [
      { name: 'Name', prop: 'name', type: 'text', sortable: true },
      { name: 'Mobile', prop: 'mobile', type: 'text' },
      { name: 'Email', prop: 'email', type: 'text' },
      { name: 'Role', prop: 'role', type: 'text', sortable: true },
      { name: 'Status', prop: 'isActive', type: 'status' },
    ];
  }

  selectSection(section: StaffSection): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section },
      queryParamsHandling: 'merge',
    });
  }

  selectRolePermissionSection(section: RolePermissionSection): void {
    this.activeRolePermissionSection.set(section);
  }

  updateNewRole(field: keyof RoleDraft, value: string): void {
    this.newRole.update((role) => ({
      ...role,
      [field]: field === 'status' ? value as RoleDraft['status'] : value,
    }));
  }

  addRole(): void {
    const draft = this.newRole();
    if (!draft.name.trim() || !draft.code.trim()) return;

    const role: RoleDefinition = {
      name: draft.name.trim(),
      code: draft.code.trim().toUpperCase(),
      department: draft.department,
      description: draft.description.trim() || `${draft.name.trim()} access profile.`,
      dashboard: draft.dashboard,
      status: draft.status,
      permissions: ['View assigned work', 'Reports access', 'Approval as configured'],
    };

    this.accessRoles.update((roles) => [role, ...roles]);
    this.resetRoleDraft();
    this.activeRolePermissionSection.set('list');
  }

  resetRoleDraft(): void {
    this.newRole.set({
      name: '',
      code: '',
      department: 'Accounts',
      description: '',
      dashboard: 'Staff Dashboard',
      status: 'Active',
    });
  }

  togglePermission(moduleName: string, action: PermissionAction): void {
    this.permissionMatrix.update((rows) => rows.map((row) => {
      if (row.module !== moduleName) return row;
      return {
        ...row,
        permissions: {
          ...row.permissions,
          [action]: !row.permissions[action],
        },
      };
    }));
  }

  openAddStaff(): void {
    this.selectSection('add');
  }

  closeInlineStaffForm = (): void => {
    this.selectSection('directory');
    this.facade.reload();
  };

  onSearchChange(query: string): void {
    this.facade.searchQuery.set(query);
    this.facade.pageIndex.set(0);
    this.facade.reload();
  }

  onRoleChange(role: string): void {
    this.facade.roleFilter.set(role === 'all' ? undefined : role as 'admin' | 'staff' | 'accountant');
    this.facade.pageIndex.set(0);
    this.facade.reload();
  }

  onAdd(): void {
    this.dataTable?.openModalWithType('add');
  }

  onEdit(row: any): void {
    this.dataTable?.openModalWithType('edit', row);
  }

  formatRole(role: string): string {
    const labels: Record<string, string> = {
      admin: 'Admin',
      accountant: 'Accountant',
      staff: 'Staff',
      super_admin: 'Super Admin',
    };
    return labels[role] ?? role;
  }

  assignmentRoleLabel(member: any): string {
    const accessRole = member.preferences?.staffProfile?.accessRole;
    if (accessRole) {
      return String(accessRole)
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
    return this.formatRole(member.role);
  }

  assignedClientScope(member: any): string {
    const clients = member.preferences?.staffProfile?.assignedClients;
    if (Array.isArray(clients) && clients.length) return `${clients.length} assigned`;
    if (typeof clients === 'string' && clients.trim()) return clients;
    return member.role === 'admin' ? 'All clients' : 'Assigned clients only';
  }

  initials(name: string): string {
    return (name || 'ST')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'ST';
  }

  getRowClass = (row: any): string => {
    const classes = ['border-primary', 'border-success', 'border-warning', 'border-danger', 'border-info'];
    const idVal = row.id ? (typeof row.id === 'number' ? row.id : row.id.charCodeAt(row.id.length - 1)) : 0;
    return classes[idVal % classes.length];
  };
}
