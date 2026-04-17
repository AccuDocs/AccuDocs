import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, computed, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { HotToastService } from '@ngneat/hot-toast';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { PaginatedApiResponse } from '@core/services/workspace.service';
import { environment } from '@environments/environment';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CreateLineItemDto } from '../../models/invoice.model';
import {
  CreateRecurringDto,
  RecurringFrequency,
  RecurringTemplate,
} from '../../models/recurring-template.model';
import { InvoiceService } from '../../services/invoice.service';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';
import { RecurringListFacade } from './recurring-list.facade';

interface BillingClient {
  id: string;
  code?: string;
  name?: string;
  gstin?: string;
  stateCode: string;
  user?: {
    name?: string;
  };
}

type LineItemFormModel = {
  serviceTemplateId: FormControl<string | null>;
  description: FormControl<string>;
  sacCode: FormControl<string>;
  quantity: FormControl<number | null>;
  unitRate: FormControl<number | null>;
};

@Component({
  selector: 'app-recurring-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
  ],
  providers: [RecurringListFacade],
  templateUrl: './recurring-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringListComponent {
  facade = inject(RecurringListFacade);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(MatDialog);
  private toast = inject(HotToastService);

  @Input() isEmbedded = false;
  @Input() clientIdOverride?: string;

  readonly displayedColumns = ['templateName', 'client', 'frequency', 'nextRun', 'generated', 'status', 'actions'];
  readonly columnsToDisplay = computed(() => 
    this.isEmbedded ? this.displayedColumns.filter(c => c !== 'client') : this.displayedColumns
  );

  readonly filtersForm = this.fb.group({
    search: this.fb.nonNullable.control(''),
    active: this.fb.nonNullable.control<'all' | 'active' | 'inactive'>('all'),
  });

  ngOnInit() {
    if (this.clientIdOverride) {
      this.facade.clientId.set(this.clientIdOverride);
    }
  }

  constructor() {
    this.filtersForm.controls.search.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.facade.setSearch(value.trim()));

    this.filtersForm.controls.active.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.facade.setActiveFilter(value === 'all' ? null : value === 'active');
      });
  }

  frequencyLabel(frequency: RecurringFrequency): string {
    const labels: Record<RecurringFrequency, string> = {
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      HALF_YEARLY: 'Every 6 months',
      YEARLY: 'Yearly',
    };

    return labels[frequency];
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  nextRunTone(nextRunDate: string): string {
    const daysRemaining = this.daysUntil(nextRunDate);

    if (daysRemaining < 0) {
      return 'text-red-700';
    }

    if (daysRemaining === 0) {
      return 'text-red-700';
    }

    if (daysRemaining <= 3) {
      return 'text-amber-700';
    }

    return 'text-gray-700';
  }

  nextRunHint(nextRunDate: string): string {
    const daysRemaining = this.daysUntil(nextRunDate);

    if (daysRemaining < 0) {
      return 'Overdue';
    }

    if (daysRemaining === 0) {
      return 'Due today';
    }

    if (daysRemaining <= 3) {
      return `Due in ${daysRemaining} days`;
    }

    return '';
  }

  toggleTemplate(template: RecurringTemplate, checked: boolean): void {
    if (template.isActive === checked) {
      return;
    }

    this.facade.toggle(template.id).subscribe({
      next: () => this.toast.success(checked ? 'Template activated' : 'Template paused'),
      error: () => this.toast.error('Failed to update template'),
    });
  }

  deleteTemplate(template: RecurringTemplate): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete recurring template?',
          message: `This will soft-delete ${template.name}.`,
          confirmText: 'Delete',
          cancelText: 'Keep',
          color: 'warn' as const,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean | undefined) => {
        if (!confirmed) {
          return;
        }

        this.facade.delete(template.id).subscribe({
          next: () => this.toast.success('Template deleted'),
          error: () => this.toast.error('Failed to delete template'),
        });
      });
  }

  openNewTemplateDialog(): void {
    this.dialog
      .open(RecurringTemplateDialogComponent, {
        width: '720px',
        maxWidth: '95vw',
        position: { right: '0' },
        data: { clientId: this.clientIdOverride },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((created: boolean | undefined) => {
        if (created) {
          this.facade.refresh();
          this.toast.success('Recurring template created');
        }
      });
  }

  private daysUntil(value: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(value);
    target.setHours(0, 0, 0, 0);
    const difference = target.getTime() - now.getTime();
    return Math.round(difference / 86400000);
  }
}

@Component({
  selector: 'app-recurring-template-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    InrCurrencyPipe,
  ],
  template: `
    <div class="max-h-[90vh] overflow-y-auto bg-white p-6">
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">New Recurring Template</h2>
          <p class="text-sm text-gray-500">Create repeatable invoice rules for retainers and planned work.</p>
        </div>
        <button mat-stroked-button type="button" class="!border-gray-300 !text-gray-700" (click)="close(false)">
          Close
        </button>
      </div>

      <form [formGroup]="templateForm" class="space-y-5">
        <div class="grid gap-4 md:grid-cols-2">
          <mat-form-field appearance="outline" *ngIf="!data?.clientId">
            <mat-label>Search client</mat-label>
            <input matInput [formControl]="clientSearchControl" placeholder="Name, code, GSTIN" />
          </mat-form-field>

          <mat-form-field appearance="outline" *ngIf="!data?.clientId">
            <mat-label>Client *</mat-label>
            <mat-select formControlName="clientId">
              @for (client of clients(); track client.id) {
                <mat-option [value]="client.id">
                  {{ displayClientName(client) }} · {{ client.code || 'No code' }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Template Name *</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Frequency *</mat-label>
            <mat-select formControlName="frequency">
              @for (option of frequencies; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Advance Notice Days</mat-label>
            <input matInput type="number" min="0" formControlName="advanceNoticeDays" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Default Due Days</mat-label>
            <input matInput type="number" min="1" formControlName="defaultDueDays" />
          </mat-form-field>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-xl border border-gray-200 p-4">
            <mat-slide-toggle formControlName="autoIssue">Auto Issue</mat-slide-toggle>
          </div>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Notes</mat-label>
            <textarea matInput rows="3" formControlName="defaultNotes"></textarea>
          </mat-form-field>
        </div>

        <div class="space-y-3 rounded-2xl border border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-medium text-gray-700">Line Items</h3>
            <button mat-stroked-button type="button" class="!border-gray-300 !text-gray-700" (click)="addLineItem()">
              + Add Line Item
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead>
                <tr class="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th class="px-2 py-3">Description</th>
                  <th class="px-2 py-3">SAC Code</th>
                  <th class="px-2 py-3">Qty</th>
                  <th class="px-2 py-3">Rate</th>
                  <th class="px-2 py-3">Amount</th>
                  <th class="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody formArrayName="lineItems" class="divide-y divide-gray-100">
                @for (group of lineItemsArray.controls; track $index) {
                  <tr [formGroupName]="$index">
                    <td class="px-2 py-3 align-top">
                      <mat-form-field appearance="outline" class="w-full">
                        <input matInput formControlName="description" />
                      </mat-form-field>
                    </td>
                    <td class="px-2 py-3 align-top">
                      <mat-form-field appearance="outline" class="w-full">
                        <input matInput formControlName="sacCode" />
                      </mat-form-field>
                    </td>
                    <td class="px-2 py-3 align-top">
                      <mat-form-field appearance="outline" class="w-full">
                        <input matInput type="number" min="0.01" step="0.01" formControlName="quantity" />
                      </mat-form-field>
                    </td>
                    <td class="px-2 py-3 align-top">
                      <mat-form-field appearance="outline" class="w-full">
                        <input matInput type="number" min="0" step="0.01" formControlName="unitRate" />
                      </mat-form-field>
                    </td>
                    <td class="px-2 py-3 align-top">
                      <div class="rounded-lg bg-gray-50 px-3 py-3 font-mono text-sm text-gray-900">
                        {{ lineAmount($index) | inrCurrency }}
                      </div>
                    </td>
                    <td class="px-2 py-3 align-top">
                      <button
                        mat-stroked-button
                        type="button"
                        class="!border-red-300 !text-red-700"
                        (click)="removeLineItem($index)"
                        [disabled]="lineItemsArray.length === 1"
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button mat-stroked-button type="button" class="!border-gray-300 !text-gray-700" (click)="close(false)">
            Cancel
          </button>
          <button mat-flat-button type="button" class="!bg-amber-600 !text-white" (click)="save()">
            Save Template
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringTemplateDialogComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private invoiceService = inject(InvoiceService);
  private dialogRef = inject(MatDialogRef<RecurringTemplateDialogComponent, boolean>);
  readonly data = inject(MAT_DIALOG_DATA, { optional: true });

  readonly frequencies: Array<{ value: RecurringFrequency; label: string }> = [
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'HALF_YEARLY', label: 'Half-Yearly' },
    { value: 'YEARLY', label: 'Yearly' },
  ];

  readonly clientSearchControl = new FormControl('', { nonNullable: true });
  readonly clientsResource = rxResource({
    request: () => this.clientSearchControl.value.trim(),
    loader: ({ request }) =>
      this.http.get<PaginatedApiResponse<BillingClient>>(`${environment.apiUrl}/clients`, {
        params: new HttpParams().set('limit', '100').set('search', request),
      }),
  });
  readonly clients = computed(() => this.clientsResource.value()?.data ?? []);

  readonly templateForm = this.fb.group({
    name: this.fb.nonNullable.control('', Validators.required),
    clientId: this.fb.nonNullable.control('', Validators.required),
    frequency: this.fb.nonNullable.control<RecurringFrequency>('MONTHLY', Validators.required),
    advanceNoticeDays: this.fb.control<number | null>(5, [Validators.required, Validators.min(0)]),
    autoIssue: this.fb.nonNullable.control(false),
    defaultDueDays: this.fb.control<number | null>(30, [Validators.required, Validators.min(1)]),
    defaultNotes: this.fb.nonNullable.control(''),
    lineItems: this.fb.array<FormGroup<LineItemFormModel>>([this.createLineItemGroup()]),
  });

  ngOnInit() {
    if (this.data?.clientId) {
      this.templateForm.patchValue({ clientId: this.data.clientId });
      this.templateForm.controls.clientId.disable();
      this.clientSearchControl.disable();
    }
  }

  get lineItemsArray(): FormArray<FormGroup<LineItemFormModel>> {
    return this.templateForm.controls.lineItems;
  }

  createLineItemGroup(item?: Partial<CreateLineItemDto>): FormGroup<LineItemFormModel> {
    return this.fb.group<LineItemFormModel>({
      serviceTemplateId: this.fb.control(item?.serviceTemplateId ?? null),
      description: this.fb.nonNullable.control(item?.description ?? '', Validators.required),
      sacCode: this.fb.nonNullable.control(item?.sacCode ?? '998231', Validators.required),
      quantity: this.fb.control<number | null>(item?.quantity ?? 1, [Validators.required, Validators.min(0.01)]),
      unitRate: this.fb.control<number | null>(item?.unitRate ?? 0, [Validators.required, Validators.min(0)]),
    });
  }

  addLineItem(): void {
    this.lineItemsArray.push(this.createLineItemGroup());
  }

  removeLineItem(index: number): void {
    if (this.lineItemsArray.length === 1) {
      return;
    }

    this.lineItemsArray.removeAt(index);
  }

  lineAmount(index: number): number {
    const value = this.lineItemsArray.at(index).getRawValue();
    return (value.quantity ?? 0) * (value.unitRate ?? 0);
  }

  displayClientName(client: BillingClient): string {
    return client.name ?? client.user?.name ?? 'Unnamed client';
  }

  save(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    const rawValue = this.templateForm.getRawValue();
    const payload: CreateRecurringDto = {
      name: rawValue.name.trim(),
      clientId: rawValue.clientId,
      frequency: rawValue.frequency,
      advanceNoticeDays: rawValue.advanceNoticeDays ?? 5,
      autoIssue: rawValue.autoIssue,
      defaultDueDays: rawValue.defaultDueDays ?? 30,
      defaultNotes: rawValue.defaultNotes || undefined,
      lineItemsSnapshot: rawValue.lineItems.map((item) => ({
        serviceTemplateId: item.serviceTemplateId ?? undefined,
        description: item.description.trim(),
        sacCode: item.sacCode.trim(),
        quantity: item.quantity ?? 0,
        unitRate: item.unitRate ?? 0,
      })),
    };

    this.invoiceService.createRecurringTemplate(payload).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => this.dialogRef.close(false),
    });
  }

  close(created: boolean): void {
    this.dialogRef.close(created);
  }
}
