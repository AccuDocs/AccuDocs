import { ChangeDetectionStrategy, Component, TemplateRef, ViewChild, computed, inject, viewChild } from '@angular/core';
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
            <div class="role-grid">
              @for (role of roleCards; track role.title) {
                <article class="staff-panel role-card">
                  <div class="role-head">
                    <ng-icon name="heroShieldCheckSolid" size="20"></ng-icon>
                    <h2>{{ role.title }}</h2>
                  </div>
                  <p>{{ role.scope }}</p>
                  <div class="permission-list">
                    @for (permission of role.permissions; track permission) {
                      <span>{{ permission }}</span>
                    }
                  </div>
                </article>
              }
            </div>
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

    @media (max-width: 1180px) {
      .metric-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .staff-dashboard-grid,
      .split-grid,
      .role-grid,
      .assignment-grid,
      .performance-grid,
      .document-grid {
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
      .document-grid {
        grid-template-columns: 1fr;
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

  readonly roleCards = [
    { title: 'Admin', scope: 'Full access for partners and firm administrators.', permissions: ['All modules', 'User control', 'Billing', 'Reports'] },
    { title: 'Accountant', scope: 'Operational access for entries and ledger work.', permissions: ['Sales', 'Purchases', 'Ledger reports', 'Client work'] },
    { title: 'Tax Executive', scope: 'Compliance workflow for GST, TDS, and filing.', permissions: ['GST filing', 'TDS work', 'Compliance reports'] },
    { title: 'Audit Executive', scope: 'Audit files, review workflow, and reporting.', permissions: ['Audit files', 'Financial reports', 'Partner review'] },
    { title: 'Admin Staff', scope: 'Office operations and document coordination.', permissions: ['Documents', 'Follow ups', 'Attendance'] },
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
