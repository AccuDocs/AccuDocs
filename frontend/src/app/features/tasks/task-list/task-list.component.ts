import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TaskService } from '@core/services/task.service';
import { NotificationService } from '@core/services/notification.service';
import { Task, TaskStatus, PaginatedResponse } from '@app/models/task.model';
import { TaskFormComponent } from '../task-form/task-form.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    TaskFormComponent,
  ],
  template: `
    <section class="task-page">
      <header class="task-header">
        <div>
          <p class="task-eyebrow">Work queue</p>
          <h1>Task Management</h1>
          <p>Track accounting work, approvals, follow-ups, and staff ownership.</p>
        </div>

        <div class="task-header-actions">
          <a routerLink="/work/tasks" class="task-secondary-link">
            <mat-icon>view_kanban</mat-icon>
            Board
          </a>
          <button class="btn-primary" type="button" (click)="openCreateForm()">
            <mat-icon>add</mat-icon>
            Add Task
          </button>
        </div>
      </header>

      <section class="task-summary-grid">
        @for (card of summaryCards(); track card.label) {
          <article class="task-summary-card">
            <div>
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
            </div>
            <mat-icon [class]="card.tone">{{ card.icon }}</mat-icon>
          </article>
        }
      </section>

      <section class="task-toolbar">
        <label class="task-search">
          <mat-icon>search</mat-icon>
          <input
            [(ngModel)]="searchTerm"
            (ngModelChange)="resetPagination()"
            placeholder="Search title, client, module, or notes"
          />
        </label>

        <select [(ngModel)]="statusFilter" (ngModelChange)="resetPagination()">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="review">Review</option>
          <option value="completed">Completed</option>
        </select>

        <select [(ngModel)]="priorityFilter" (ngModelChange)="resetPagination()">
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select [(ngModel)]="taskTypeFilter" (ngModelChange)="resetPagination()">
          <option value="">All task types</option>
          @for (type of taskTypes; track type.value) {
            <option [value]="type.value">{{ type.label }}</option>
          }
        </select>

        <select [(ngModel)]="moduleTypeFilter" (ngModelChange)="resetPagination()">
          <option value="">All modules</option>
          @for (module of moduleTypes; track module.value) {
            <option [value]="module.value">{{ module.label }}</option>
          }
        </select>

        <select [(ngModel)]="sortBy" (ngModelChange)="resetPagination()">
          <option value="createdAt">Created date</option>
          <option value="dueDate">Due date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
          <option value="taskType">Task type</option>
        </select>

        <button class="task-icon-button" type="button" (click)="toggleSortOrder()" [attr.aria-label]="sortOrder === 'desc' ? 'Sort descending' : 'Sort ascending'">
          <mat-icon>{{ sortOrder === 'desc' ? 'south' : 'north' }}</mat-icon>
        </button>
      </section>

      <section class="task-table-shell">
        @if (isLoading()) {
          <div class="task-loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
        } @else {
          <div class="task-table-meta">
            <div>
              <strong>{{ totalTasks() }}</strong>
              <span>tasks found</span>
            </div>
            <button class="task-clear-button" type="button" (click)="clearFilters()">
              <mat-icon>filter_alt_off</mat-icon>
              Clear
            </button>
          </div>

          <div class="task-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Client / Module</th>
                  <th>Owner</th>
                  <th>Dates</th>
                  <th>Work</th>
                  <th>State</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (task of tasks(); track task.id) {
                  <tr>
                    <td class="task-main-cell">
                      <div class="task-title-line">
                        <span [class]="getPriorityDotClass(task.priority)"></span>
                        <strong>{{ task.title }}</strong>
                      </div>
                      @if (task.description) {
                        <p>{{ task.description }}</p>
                      }
                      <div class="task-chip-row">
                        <span>{{ getTaskTypeLabel(task.taskType) }}</span>
                        @for (tag of (task.tags || []).slice(0, 3); track tag) {
                          <span>{{ tag }}</span>
                        }
                      </div>
                    </td>

                    <td>
                      <div class="task-stack">
                        <strong>{{ task.client?.name || 'Firm-level' }}</strong>
                        <span>{{ getModuleTypeLabel(task.moduleType) }}</span>
                        @if (task.moduleId) {
                          <small>{{ task.moduleId }}</small>
                        }
                      </div>
                    </td>

                    <td>
                      <div class="task-owner">
                        <span>{{ getInitials(task.assignee?.name || 'Unassigned') }}</span>
                        <div>
                          <strong>{{ task.assignee?.name || 'Unassigned' }}</strong>
                          <small>{{ task.assignee?.role || 'No owner' }}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="task-stack">
                        <span>Start {{ task.startDate ? (task.startDate | date: 'MMM d') : '-' }}</span>
                        <strong [class.task-overdue]="isDueDateOverdue(task.dueDate) && normalizeStatus(task.status) !== 'completed'">
                          Due {{ task.dueDate ? (task.dueDate | date: 'MMM d') : '-' }}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <div class="task-work-cell">
                        <div class="task-progress-line">
                          <span>Checklist</span>
                          <strong>{{ getChecklistProgress(task) }}</strong>
                        </div>
                        <div class="task-progress-track">
                          <span [style.width.%]="getChecklistPercent(task)"></span>
                        </div>
                        <small>{{ getHoursLabel(task) }}</small>
                      </div>
                    </td>

                    <td>
                      <div class="task-state-cell">
                        <span [class]="getStatusBadgeClass(task.status)">{{ getStatusLabel(task.status) }}</span>
                        <span [class]="getPriorityBadgeClass(task.priority)">{{ task.priority | titlecase }}</span>
                      </div>
                    </td>

                    <td class="task-action-cell">
                      <button [matMenuTriggerFor]="menu" class="task-icon-button" type="button" aria-label="Task actions">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #menu="matMenu">
                        <button mat-menu-item (click)="editTask(task)">
                          <mat-icon>edit</mat-icon>
                          <span>Edit</span>
                        </button>
                        <button mat-menu-item (click)="deleteTask(task.id)">
                          <mat-icon>delete</mat-icon>
                          <span>Delete</span>
                        </button>
                      </mat-menu>
                    </td>
                  </tr>
                }

                @if (tasks().length === 0) {
                  <tr>
                    <td colspan="7">
                      <div class="task-empty">
                        <mat-icon>assignment</mat-icon>
                        <strong>No tasks found</strong>
                        <span>Adjust filters or create a task.</span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <mat-paginator
            [length]="totalTasks()"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50, 100]"
            (page)="onPageChange($event)"
          ></mat-paginator>
        }
      </section>
    </section>

    <app-task-form
      [visible]="showTaskForm()"
      (visibleChange)="showTaskForm.set($event)"
      [initialTask]="selectedTask()"
      (onSave)="handleTaskSave()"
    ></app-task-form>
  `,
  styles: [`
    :host {
      display: block;
    }

    .task-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 24px;
      color: var(--text-primary);
    }

    .task-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .task-eyebrow {
      margin: 0 0 4px;
      color: var(--text-secondary);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .task-header h1 {
      margin: 0;
      color: var(--text-primary);
      font-size: 30px;
      font-weight: 800;
      line-height: 1.1;
    }

    .task-header p {
      margin: 6px 0 0;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .task-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .task-secondary-link,
    .task-clear-button,
    .task-icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1px solid var(--border-color);
      background: var(--surface-card);
      color: var(--text-primary);
      text-decoration: none;
      transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
    }

    .task-secondary-link,
    .task-clear-button {
      min-height: 40px;
      border-radius: 8px;
      padding: 0 12px;
      font-size: 13px;
      font-weight: 700;
    }

    .task-icon-button {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      padding: 0;
    }

    .task-secondary-link:hover,
    .task-clear-button:hover,
    .task-icon-button:hover {
      border-color: rgb(59 130 246 / 0.45);
      background: rgb(239 246 255);
      color: rgb(29 78 216);
    }

    .task-summary-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
    }

    .task-summary-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 86px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--surface-card);
      padding: 16px;
    }

    .task-summary-card span {
      display: block;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 700;
    }

    .task-summary-card strong {
      display: block;
      margin-top: 6px;
      color: var(--text-primary);
      font-size: 24px;
      font-weight: 800;
      line-height: 1;
    }

    .task-summary-card mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .task-toolbar {
      display: grid;
      grid-template-columns: minmax(240px, 1.4fr) repeat(5, minmax(150px, 1fr)) 42px;
      gap: 10px;
      align-items: center;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--surface-card);
      padding: 12px;
    }

    .task-search {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0 12px;
      background: color-mix(in srgb, var(--surface-card) 92%, #f8fafc);
    }

    .task-search mat-icon {
      color: var(--text-secondary);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .task-search input,
    .task-toolbar select {
      width: 100%;
      min-height: 42px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: color-mix(in srgb, var(--surface-card) 92%, #f8fafc);
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
    }

    .task-search input {
      min-height: auto;
      border: 0;
      background: transparent;
    }

    .task-toolbar select {
      padding: 0 10px;
    }

    .task-table-shell {
      overflow: hidden;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--surface-card);
    }

    .task-loading {
      display: flex;
      justify-content: center;
      padding: 80px 0;
    }

    .task-table-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--border-color);
      padding: 12px 16px;
    }

    .task-table-meta div {
      display: flex;
      align-items: baseline;
      gap: 6px;
      color: var(--text-secondary);
      font-size: 13px;
    }

    .task-table-meta strong {
      color: var(--text-primary);
      font-size: 18px;
      font-weight: 800;
    }

    .task-table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      min-width: 1080px;
      border-collapse: collapse;
    }

    th {
      border-bottom: 1px solid var(--border-color);
      background: color-mix(in srgb, var(--surface-card) 88%, #f1f5f9);
      color: var(--text-secondary);
      font-size: 11px;
      font-weight: 800;
      padding: 12px 16px;
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    td {
      border-bottom: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 13px;
      padding: 16px;
      vertical-align: top;
    }

    tr:hover td {
      background: color-mix(in srgb, var(--surface-card) 92%, #eff6ff);
    }

    .task-main-cell {
      min-width: 300px;
      max-width: 380px;
    }

    .task-title-line {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .task-title-line strong,
    .task-stack strong,
    .task-owner strong {
      color: var(--text-primary);
      font-weight: 750;
    }

    .task-main-cell p {
      display: -webkit-box;
      overflow: hidden;
      margin: 6px 0 0;
      color: var(--text-secondary);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-height: 1.45;
    }

    .task-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .task-chip-row span {
      border: 1px solid var(--border-color);
      border-radius: 999px;
      background: color-mix(in srgb, var(--surface-card) 86%, #f8fafc);
      color: var(--text-secondary);
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
    }

    .task-stack {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 130px;
    }

    .task-stack small,
    .task-owner small,
    .task-work-cell small {
      color: var(--text-secondary);
      font-size: 12px;
    }

    .task-owner {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 160px;
    }

    .task-owner > span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      flex: 0 0 34px;
      border-radius: 8px;
      background: rgb(219 234 254);
      color: rgb(29 78 216);
      font-size: 12px;
      font-weight: 800;
    }

    .task-overdue {
      color: rgb(220 38 38) !important;
    }

    .task-work-cell {
      min-width: 150px;
    }

    .task-progress-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 7px;
    }

    .task-progress-line strong {
      color: var(--text-primary);
      font-size: 12px;
    }

    .task-progress-track {
      overflow: hidden;
      height: 7px;
      border-radius: 999px;
      background: rgb(226 232 240);
      margin-bottom: 7px;
    }

    .task-progress-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: rgb(37 99 235);
    }

    .task-state-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      min-width: 130px;
    }

    .task-state-cell span {
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      padding: 5px 9px;
    }

    .task-action-cell {
      width: 60px;
      text-align: right;
    }

    .priority-dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      flex: 0 0 9px;
      border-radius: 999px;
    }

    .task-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 56px 0;
      text-align: center;
    }

    .task-empty mat-icon {
      color: var(--text-secondary);
      opacity: 0.6;
      font-size: 42px;
      width: 42px;
      height: 42px;
    }

    .task-empty strong {
      color: var(--text-primary);
    }

    @media (max-width: 1280px) {
      .task-summary-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .task-toolbar {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .task-search {
        grid-column: 1 / -1;
      }
    }

    @media (max-width: 768px) {
      .task-page {
        padding: 16px;
      }

      .task-header {
        flex-direction: column;
      }

      .task-header-actions {
        width: 100%;
        justify-content: stretch;
      }

      .task-header-actions > * {
        flex: 1;
      }

      .task-summary-grid,
      .task-toolbar {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class TaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private notificationService = inject(NotificationService);

  isLoading = signal(false);
  showTaskForm = signal(false);
  selectedTask = signal<Task | null>(null);

  tasks = signal<Task[]>([]);
  totalTasks = signal(0);

  summaryCards = computed(() => {
    const tasks = this.tasks();
    const openTasks = tasks.filter((task) => this.normalizeStatus(task.status) !== 'completed');

    return [
      { label: 'Total Tasks', value: this.totalTasks(), icon: 'assignment', tone: 'text-blue-700 dark:text-blue-300' },
      { label: 'Due Today', value: tasks.filter((task) => this.isDueToday(task.dueDate) && this.normalizeStatus(task.status) !== 'completed').length, icon: 'today', tone: 'text-sky-700 dark:text-sky-300' },
      { label: 'Overdue', value: openTasks.filter((task) => this.isDueDateOverdue(task.dueDate)).length, icon: 'warning', tone: 'text-red-700 dark:text-red-300' },
      { label: 'Review', value: tasks.filter((task) => this.normalizeStatus(task.status) === 'review').length, icon: 'rate_review', tone: 'text-amber-700 dark:text-amber-300' },
      { label: 'Hours Logged', value: this.getTotalHours(tasks), icon: 'timer', tone: 'text-emerald-700 dark:text-emerald-300' },
    ];
  });

  searchTerm = '';
  statusFilter = '';
  priorityFilter = '';
  taskTypeFilter = '';
  moduleTypeFilter = '';
  sortBy = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  taskTypes = [
    { value: 'general', label: 'General' },
    { value: 'gst-filing', label: 'GST Filing' },
    { value: 'invoice-follow-up', label: 'Invoice Follow-up' },
    { value: 'bank-reconciliation', label: 'Bank Reconciliation' },
    { value: 'tds-submission', label: 'TDS Submission' },
    { value: 'payroll-processing', label: 'Payroll Processing' },
    { value: 'expense-verification', label: 'Expense Verification' },
    { value: 'audit-preparation', label: 'Audit Preparation' },
    { value: 'client-call', label: 'Client Call' },
    { value: 'document-collection', label: 'Document Collection' },
    { value: 'vendor-payment', label: 'Vendor Payment' },
    { value: 'employee-approval', label: 'Employee Approval' },
  ];

  moduleTypes = [
    { value: 'invoice', label: 'Invoice' },
    { value: 'client', label: 'Client' },
    { value: 'expense', label: 'Expense' },
    { value: 'gst', label: 'GST' },
    { value: 'payroll', label: 'Payroll' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'document', label: 'Document' },
    { value: 'audit', label: 'Audit' },
    { value: 'other', label: 'Other' },
  ];

  pageSize = 10;
  currentPage = 0;

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading.set(true);

    const filters: any = {};
    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.statusFilter) filters.status = this.statusFilter;
    if (this.priorityFilter) filters.priority = this.priorityFilter;
    if (this.taskTypeFilter) filters.taskType = this.taskTypeFilter;
    if (this.moduleTypeFilter) filters.moduleType = this.moduleTypeFilter;

    this.taskService.getTasks(
      this.currentPage + 1,
      this.pageSize,
      filters,
      this.sortBy,
      this.sortOrder
    ).subscribe({
      next: (response: PaginatedResponse<Task>) => {
        this.tasks.set(response.data);
        this.totalTasks.set(response.meta.total);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load tasks', error);
        this.notificationService.error('Failed to load tasks');
        this.isLoading.set(false);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTasks();
  }

  resetPagination(): void {
    this.currentPage = 0;
    this.loadTasks();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.resetPagination();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.taskTypeFilter = '';
    this.moduleTypeFilter = '';
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
    this.resetPagination();
  }

  openCreateForm(): void {
    this.selectedTask.set(null);
    this.showTaskForm.set(true);
  }

  editTask(task: Task): void {
    this.selectedTask.set(task);
    this.showTaskForm.set(true);
  }

  deleteTask(taskId: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(taskId).subscribe({
        next: () => {
          this.notificationService.success('Task deleted successfully');
          this.loadTasks();
        },
        error: (error) => {
          console.error('Failed to delete task', error);
          this.notificationService.error('Failed to delete task');
        },
      });
    }
  }

  handleTaskSave(): void {
    this.loadTasks();
  }

  getStatusLabel(status: string): string {
    const labels: Record<TaskStatus, string> = {
      'pending': 'Pending',
      'in-progress': 'In Progress',
      'review': 'Review',
      'completed': 'Completed',
    };
    return labels[this.normalizeStatus(status)];
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<TaskStatus, string> = {
      'pending': 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
      'in-progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'review': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      'completed': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    };
    return classes[this.normalizeStatus(status)];
  }

  getPriorityBadgeClass(priority: string): string {
    const classes: Record<string, string> = {
      'urgent': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
      'high': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      'medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      'low': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    };
    return classes[priority] || 'bg-slate-100 dark:bg-slate-700 text-text-secondary';
  }

  getPriorityDotClass(priority: string): string {
    const classes: Record<string, string> = {
      urgent: 'priority-dot bg-orange-500',
      high: 'priority-dot bg-red-500',
      medium: 'priority-dot bg-yellow-500',
      low: 'priority-dot bg-green-500',
    };
    return classes[priority] || 'priority-dot bg-slate-400';
  }

  isDueDateOverdue(dueDate: string | Date | undefined | null): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  isDueToday(dueDate: string | Date | undefined | null): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  }

  normalizeStatus(status: string): TaskStatus {
    if (status === 'todo' || status === 'pending') return 'pending';
    if (status === 'done' || status === 'completed') return 'completed';
    if (status === 'in_progress' || status === 'in-progress') return 'in-progress';
    return status === 'review' ? 'review' : 'pending';
  }

  getTaskTypeLabel(value?: string | null): string {
    if (!value) return '-';
    const match = this.taskTypes.find((type) => type.value === value);
    return match?.label || value;
  }

  getModuleTypeLabel(value?: string | null): string {
    if (!value) return '-';
    const match = this.moduleTypes.find((module) => module.value === value);
    return match?.label || value;
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NA';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  getChecklistProgress(task: Task): string {
    const items = task.checklist || [];
    if (items.length === 0) return '0/0';
    const completed = items.filter((item) => item.completed).length;
    return `${completed}/${items.length}`;
  }

  getChecklistPercent(task: Task): number {
    const items = task.checklist || [];
    if (items.length === 0) return 0;
    const completed = items.filter((item) => item.completed).length;
    return Math.round((completed / items.length) * 100);
  }

  getHoursLabel(task: Task): string {
    const actual = Number(task.actualHours || 0);
    const estimated = Number(task.estimatedHours || 0);
    if (!actual && !estimated) return 'No time tracked';
    if (actual && estimated) return `${actual}h / ${estimated}h`;
    if (actual) return `${actual}h logged`;
    return `${estimated}h estimated`;
  }

  getTotalHours(tasks: Task[]): number {
    return tasks.reduce((total, task) => total + Number(task.actualHours || 0), 0);
  }
}
