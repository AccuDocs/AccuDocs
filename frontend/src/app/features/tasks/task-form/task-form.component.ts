import { Component, OnInit, inject, signal, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule } from '@angular/material/dialog';
import { TaskService } from '@core/services/task.service';
import { ClientService } from '@core/services/client.service';
import { NotificationService } from '@core/services/notification.service';
import { UserService } from '@core/services/user.service';
import {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  TaskStatus,
  TaskChecklistItem,
  TaskAttachment,
} from '@app/models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatSelectModule,
    MatRadioModule,
    MatDialogModule,
  ],
  template: `
    @if (visible()) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" (click)="closeForm()"></div>

        <div class="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800" (click)="$event.stopPropagation()">
          <header class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Accounting task</p>
              <h2 class="text-lg font-bold text-slate-950 dark:text-white">
                {{ selectedTask() ? 'Edit task' : 'Create task' }}
              </h2>
            </div>
            <button type="button" class="btn-icon-sm" (click)="closeForm()" aria-label="Close task form">
              <mat-icon>close</mat-icon>
            </button>
          </header>

          <form [formGroup]="form" (ngSubmit)="saveTask()" class="space-y-6 p-6">
            <section class="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Title *</label>
                  <input
                    formControlName="title"
                    placeholder="GST filing for April"
                    class="task-input"
                  />
                  @if (form.get('title')?.hasError('required') && form.get('title')?.touched) {
                    <span class="mt-1 block text-xs text-red-500">Title is required</span>
                  }
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Description</label>
                  <textarea
                    formControlName="description"
                    rows="4"
                    placeholder="Work details, expected documents, review notes"
                    class="task-input resize-none"
                  ></textarea>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Task type</label>
                  <select formControlName="taskType" class="task-input">
                    @for (type of taskTypes; track type.value) {
                      <option [value]="type.value">{{ type.label }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Priority *</label>
                  <select formControlName="priority" class="task-input">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </section>

            <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Status *</label>
                <select formControlName="status" class="task-input">
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Assigned to</label>
                <select formControlName="assignedTo" class="task-input">
                  <option value="">Unassigned</option>
                  @for (user of users(); track user.id) {
                    <option [value]="user.id">{{ user.name }} - {{ user.role | titlecase }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Start date</label>
                <input type="date" formControlName="startDate" class="task-input" />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Due date</label>
                <input type="date" formControlName="dueDate" class="task-input" />
              </div>
            </section>

            <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Client</label>
                <select formControlName="clientId" class="task-input">
                  <option value="">Firm-level task</option>
                  @for (client of clients(); track client.id) {
                    <option [value]="client.id">{{ client.name || client.code }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Related module</label>
                <select formControlName="moduleType" class="task-input">
                  @for (module of moduleTypes; track module.value) {
                    <option [value]="module.value">{{ module.label }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Related record</label>
                <input formControlName="moduleId" placeholder="Invoice, GST, payroll ID" class="task-input" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Estimated hrs</label>
                  <input type="number" min="0" step="0.25" formControlName="estimatedHours" class="task-input" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Actual hrs</label>
                  <input type="number" min="0" step="0.25" formControlName="actualHours" class="task-input" />
                </div>
              </div>
            </section>

            <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div class="task-panel">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Checklist</h3>
                  <span class="text-xs text-slate-500">{{ completedChecklistCount() }}/{{ checklistItems().length }}</span>
                </div>
                <div class="mt-3 flex gap-2">
                  <input #checklistInput placeholder="Add subtask" class="task-input" (keydown.enter)="addChecklistItem(checklistInput); $event.preventDefault()" />
                  <button type="button" class="btn-secondary shrink-0" (click)="addChecklistItem(checklistInput)">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
                <div class="mt-3 space-y-2">
                  @for (item of checklistItems(); track item.id || item.title; let i = $index) {
                    <label class="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                      <input type="checkbox" [checked]="item.completed" (change)="toggleChecklistItem(i, $any($event.target).checked)" />
                      <span class="flex-1 text-slate-700 dark:text-slate-200" [class.line-through]="item.completed">{{ item.title }}</span>
                      <button type="button" class="text-slate-400 hover:text-red-500" (click)="removeChecklistItem(i)" aria-label="Remove checklist item">
                        <mat-icon class="text-base">close</mat-icon>
                      </button>
                    </label>
                  }
                  @if (checklistItems().length === 0) {
                    <p class="rounded border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-800">No subtasks</p>
                  }
                </div>
              </div>

              <div class="task-panel">
                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Attachments</h3>
                <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[0.8fr_1fr_auto]">
                  <input #attachmentName placeholder="File name" class="task-input" />
                  <input #attachmentUrl placeholder="Link or storage URL" class="task-input" (keydown.enter)="addAttachment(attachmentName, attachmentUrl); $event.preventDefault()" />
                  <button type="button" class="btn-secondary" (click)="addAttachment(attachmentName, attachmentUrl)">
                    <mat-icon>attach_file</mat-icon>
                  </button>
                </div>
                <div class="mt-3 space-y-2">
                  @for (attachment of attachmentItems(); track attachment.id || attachment.name; let i = $index) {
                    <div class="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                      <mat-icon class="text-base text-slate-500">description</mat-icon>
                      <span class="flex-1 truncate text-slate-700 dark:text-slate-200">{{ attachment.name }}</span>
                      <button type="button" class="text-slate-400 hover:text-red-500" (click)="removeAttachment(i)" aria-label="Remove attachment">
                        <mat-icon class="text-base">close</mat-icon>
                      </button>
                    </div>
                  }
                  @if (attachmentItems().length === 0) {
                    <p class="rounded border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-800">No attachments</p>
                  }
                </div>
              </div>
            </section>

            <section>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Tags</label>
              <div class="flex flex-col gap-2">
                <input
                  #tagInput
                  (keydown.enter)="addTag(tagInput); $event.preventDefault()"
                  placeholder="GST, audit, sales"
                  class="task-input"
                />
                <div class="flex flex-wrap gap-2">
                  @for (tag of formTags(); track tag) {
                    <span class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {{ tag }}
                      <button type="button" (click)="removeTag(tag)" class="text-slate-400 hover:text-red-500" aria-label="Remove tag">
                        <mat-icon class="text-sm">close</mat-icon>
                      </button>
                    </span>
                  }
                </div>
              </div>
            </section>

            <footer class="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <button type="button" (click)="closeForm()" class="btn-secondary">Cancel</button>
              <button type="submit" [disabled]="!form.valid" class="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                {{ selectedTask() ? 'Update task' : 'Create task' }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .task-input {
      width: 100%;
      border-radius: 0.5rem;
      border: 1px solid rgb(226 232 240);
      background: rgb(248 250 252);
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      color: rgb(15 23 42);
      outline: none;
      transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
    }

    .task-input:focus {
      border-color: rgb(37 99 235);
      box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
      background: white;
    }

    :host-context(.dark) .task-input {
      border-color: rgb(30 41 59);
      background: rgb(15 23 42 / 0.55);
      color: white;
    }

    .task-panel {
      border-radius: 0.5rem;
      border: 1px solid rgb(226 232 240);
      padding: 1rem;
    }

    :host-context(.dark) .task-panel {
      border-color: rgb(30 41 59);
    }
  `],
})
export class TaskFormComponent implements OnInit {
  private taskService = inject(TaskService);
  private clientService = inject(ClientService);
  private notificationService = inject(NotificationService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);

  visible = input<boolean>(false);
  initialTask = input<Task | null>(null);
  clientId = input<string | null>(null);
  initialStatus = input<TaskStatus>('pending');

  onSave = output<void>();
  visibleChange = output<boolean>();

  selectedTask = signal<Task | null>(null);
  clients = signal<any[]>([]);
  users = signal<any[]>([]);
  formTags = signal<string[]>([]);
  checklistItems = signal<TaskChecklistItem[]>([]);
  attachmentItems = signal<TaskAttachment[]>([]);

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
    { value: '', label: 'No related module' },
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

  form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    clientId: [''],
    assignedTo: [''],
    priority: ['medium', Validators.required],
    status: ['pending', Validators.required],
    startDate: [''],
    dueDate: [''],
    taskType: ['general'],
    moduleType: [''],
    moduleId: [''],
    estimatedHours: [''],
    actualHours: [''],
  });

  completedChecklistCount = () => this.checklistItems().filter((item) => item.completed).length;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.selectedTask.set(this.initialTask() || null);
        this.updateFormValues();
      }
    });
  }

  ngOnInit(): void {
    this.loadClients();
    this.loadUsers();
  }

  updateFormValues(): void {
    const task = this.selectedTask();

    this.form.patchValue({
      title: task?.title || '',
      description: task?.description || '',
      clientId: this.clientId() || task?.clientId || '',
      assignedTo: task?.assignedTo || task?.assignee?.id || '',
      priority: task?.priority || 'medium',
      status: task?.status || this.initialStatus() || 'pending',
      startDate: this.formatForDateInput(task?.startDate),
      dueDate: this.formatForDateInput(task?.dueDate),
      taskType: task?.taskType || 'general',
      moduleType: task?.moduleType || '',
      moduleId: task?.moduleId || '',
      estimatedHours: task?.estimatedHours ?? '',
      actualHours: task?.actualHours ?? '',
    });

    this.formTags.set(task?.tags || []);
    this.checklistItems.set((task?.checklist || []).map((item) => ({ ...item, completed: !!item.completed })));
    this.attachmentItems.set(task?.attachments || []);
  }

  loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (response) => this.clients.set(response.data || []),
      error: (error) => console.error('Failed to load clients', error),
    });
  }

  loadUsers(): void {
    this.userService.getUsers(1, 200, undefined, undefined, true, 'client').subscribe({
      next: (response) => this.users.set(response.data || []),
      error: (error) => console.error('Failed to load users', error),
    });
  }

  addTag(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && !this.formTags().includes(value)) {
      this.formTags.set([...this.formTags(), value]);
    }
    input.value = '';
  }

  removeTag(tag: string): void {
    this.formTags.set(this.formTags().filter((item) => item !== tag));
  }

  addChecklistItem(input: HTMLInputElement): void {
    const title = input.value.trim();
    if (!title) return;
    this.checklistItems.set([
      ...this.checklistItems(),
      { id: this.createLocalId(), title, completed: false },
    ]);
    input.value = '';
  }

  toggleChecklistItem(index: number, completed: boolean): void {
    this.checklistItems.set(this.checklistItems().map((item, itemIndex) => (
      itemIndex === index ? { ...item, completed } : item
    )));
  }

  removeChecklistItem(index: number): void {
    this.checklistItems.set(this.checklistItems().filter((_, itemIndex) => itemIndex !== index));
  }

  addAttachment(nameInput: HTMLInputElement, urlInput: HTMLInputElement): void {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name && !url) return;
    this.attachmentItems.set([
      ...this.attachmentItems(),
      { id: this.createLocalId(), name: name || url, url: url || null },
    ]);
    nameInput.value = '';
    urlInput.value = '';
  }

  removeAttachment(index: number): void {
    this.attachmentItems.set(this.attachmentItems().filter((_, itemIndex) => itemIndex !== index));
  }

  saveTask(): void {
    if (!this.form.valid) return;

    const formValue = this.form.value;
    const payload: UpdateTaskDto = {
      title: formValue.title,
      description: formValue.description,
      clientId: formValue.clientId || null,
      assignedTo: formValue.assignedTo || null,
      priority: formValue.priority,
      status: formValue.status,
      startDate: formValue.startDate || null,
      dueDate: formValue.dueDate || null,
      taskType: formValue.taskType || 'general',
      moduleType: formValue.moduleType || null,
      moduleId: formValue.moduleId || null,
      estimatedHours: formValue.estimatedHours === '' ? null : Number(formValue.estimatedHours),
      actualHours: formValue.actualHours === '' ? null : Number(formValue.actualHours),
      tags: this.formTags(),
      checklist: this.checklistItems(),
      attachments: this.attachmentItems(),
    };

    const task = this.selectedTask();
    if (task) {
      this.taskService.updateTask(task.id, payload).subscribe({
        next: () => {
          this.notificationService.success('Task updated successfully');
          this.closeForm();
          this.onSave.emit();
        },
        error: (error) => {
          console.error('Failed to update task', error);
          this.notificationService.error('Failed to update task');
        },
      });
      return;
    }

    this.taskService.createTask(payload as CreateTaskDto).subscribe({
      next: () => {
        this.notificationService.success('Task created successfully');
        this.closeForm();
        this.onSave.emit();
      },
      error: (error) => {
        console.error('Failed to create task', error);
        this.notificationService.error('Failed to create task');
      },
    });
  }

  closeForm(): void {
    this.visibleChange.emit(false);
    this.form.reset({
      title: '',
      description: '',
      clientId: '',
      assignedTo: '',
      priority: 'medium',
      status: 'pending',
      startDate: '',
      dueDate: '',
      taskType: 'general',
      moduleType: '',
      moduleId: '',
      estimatedHours: '',
      actualHours: '',
    });
    this.formTags.set([]);
    this.checklistItems.set([]);
    this.attachmentItems.set([]);
  }

  private formatForDateInput(value?: string | Date | null): string {
    if (!value) return '';
    try {
      return new Date(value).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  private createLocalId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
