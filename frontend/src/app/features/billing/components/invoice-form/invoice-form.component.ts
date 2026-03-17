import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormBuilder,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HotToastService } from '@ngneat/hot-toast';
import { PaginatedApiResponse } from '@core/services/workspace.service';
import { AuthService, User } from '@core/services/auth.service';
import { environment } from '@environments/environment';
import { of, startWith } from 'rxjs';
import {
  CreateInvoiceDto,
  CreateLineItemDto,
  GstType,
  Invoice,
  UpdateInvoiceDto,
} from '../../models/invoice.model';
import { ServiceTemplate } from '../../models/service-template.model';
import { InvoiceService } from '../../services/invoice.service';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';
import { GstCalculation, calculateGST, lineItemAmount } from './gst-calculator.util';

interface BillingOrganization {
  name: string;
  gstin: string;
  pan: string;
  addressLine1: string;
  addressLine2: string;
  stateCode: string;
}

interface BillingUser extends User {
  organization?: Partial<BillingOrganization>;
}

interface BillingClient {
  id: string;
  code?: string;
  name?: string;
  gstin?: string;
  mobile?: string;
  stateCode: string;
  user?: {
    name?: string;
    mobile?: string;
  };
}

type LineItemFormModel = {
  serviceTemplateId: FormControl<string | null>;
  description: FormControl<string>;
  sacCode: FormControl<string>;
  quantity: FormControl<number | null>;
  unitRate: FormControl<number | null>;
};

type InvoiceFormModel = {
  clientId: FormControl<string>;
  invoiceDate: FormControl<string>;
  dueDate: FormControl<string>;
  gstType: FormControl<GstType>;
  clientGstin: FormControl<string>;
  notes: FormControl<string>;
  lineItems: FormArray<FormGroup<LineItemFormModel>>;
};

const DEFAULT_ORGANIZATION: BillingOrganization = {
  name: 'Shah & Associates',
  gstin: '24AABCS9999A1Z3',
  pan: 'AABCS9999A',
  addressLine1: 'A-201, Shyamal Cross Roads',
  addressLine2: 'Satellite, Ahmedabad — 380015',
  stateCode: '24',
};

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoDateFromValue(value: string | Date | undefined): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return formatDateInput(value);
}

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatProgressBarModule,
    InrCurrencyPipe,
  ],
  templateUrl: './invoice-form.component.html',
  styles: [
    `
      :host {
        display: block;
      }

      .panel-card {
        @apply rounded-2xl border border-slate-200/80 bg-white shadow-card dark:border-slate-700/50 dark:bg-slate-800;
      }

      .panel-header {
        @apply flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-700/50;
      }

      .panel-body {
        @apply p-6;
      }

      .field-label {
        @apply mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400;
      }

      .form-input-premium,
      .form-select-premium,
      .form-textarea-premium {
        @apply w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-500/10 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-400 dark:focus:bg-slate-900;
      }

      .form-select-premium {
        @apply cursor-pointer appearance-none;
        background-image:
          linear-gradient(45deg, transparent 50%, #64748b 50%),
          linear-gradient(135deg, #64748b 50%, transparent 50%);
        background-position:
          calc(100% - 18px) calc(50% - 2px),
          calc(100% - 12px) calc(50% - 2px);
        background-size: 6px 6px, 6px 6px;
        background-repeat: no-repeat;
      }

      .form-textarea-premium {
        @apply min-h-[120px] resize-y;
      }

      .form-input-premium.readonly-display {
        @apply bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300;
      }

      .form-input-premium.error,
      .form-select-premium.error,
      .form-textarea-premium.error {
        @apply border-danger-300 bg-danger-50 text-danger-900 focus:border-danger-400 focus:ring-danger-500/10 dark:border-danger-800 dark:bg-danger-950/20 dark:text-danger-100;
      }

      .hint-text {
        @apply mt-2 text-xs text-slate-400 dark:text-slate-500;
      }

      .error-text {
        @apply mt-2 text-xs font-semibold text-danger-600 dark:text-danger-400;
      }

      .radio-tile {
        @apply flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-all duration-200 hover:border-primary-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-primary-500 dark:hover:bg-slate-900;
      }

      .radio-tile.active {
        @apply border-primary-300 bg-primary-50 shadow-sm dark:border-primary-500/60 dark:bg-primary-950/20;
      }

      .radio-dot {
        @apply mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white transition-all dark:border-slate-600 dark:bg-slate-900;
      }

      .radio-tile.active .radio-dot {
        @apply border-primary-500;
      }

      .radio-dot::after {
        content: '';
        @apply h-3 w-3 rounded-full bg-primary-500 opacity-0 transition-opacity;
      }

      .radio-tile.active .radio-dot::after {
        @apply opacity-100;
      }

      .line-item-table {
        @apply min-w-full border-separate border-spacing-y-3;
      }

      .line-item-head {
        @apply px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400;
      }

      .line-item-cell {
        @apply px-2 align-top;
      }

      .line-item-output {
        @apply rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white;
      }

      .template-card {
        @apply w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-card dark:border-slate-700/60 dark:bg-slate-900/50 dark:hover:border-primary-500/50;
      }

      .sticky-action-bar {
        @apply sticky bottom-4 z-10 rounded-[9px] border border-slate-200/80 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/90;
      }

      .btn-primary-premium {
        @apply inline-flex items-center justify-center rounded-2xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50;
      }

      .btn-secondary-premium {
        @apply inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700;
      }

      .btn-danger-ghost {
        @apply inline-flex items-center justify-center rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-bold text-danger-700 transition-all duration-200 hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-danger-800/60 dark:bg-danger-950/20 dark:text-danger-300;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceFormComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private invoiceService = inject(InvoiceService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(HotToastService);

  readonly isEditMode = signal(Boolean(this.route.snapshot.data['editMode']));
  readonly invoiceId = signal(this.route.snapshot.paramMap.get('id'));
  readonly isSubmitting = signal(false);
  readonly readOnlyMode = signal(false);
  private readonly invoicePatched = signal(false);

  readonly invoiceNumberControl = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  readonly clientSearchControl = new FormControl('', { nonNullable: true });

  readonly invoiceForm = this.fb.group<InvoiceFormModel>({
    clientId: this.fb.nonNullable.control('', Validators.required),
    invoiceDate: this.fb.nonNullable.control(formatDateInput(new Date()), Validators.required),
    dueDate: this.fb.nonNullable.control(formatDateInput(this.addDays(new Date(), 30)), Validators.required),
    gstType: this.fb.nonNullable.control<GstType>('CGST_SGST'),
    clientGstin: this.fb.nonNullable.control(''),
    notes: this.fb.nonNullable.control(''),
    lineItems: this.fb.array<FormGroup<LineItemFormModel>>([this.createLineItemGroup()]),
  });

  readonly clientsResource = rxResource({
    request: () => this.clientSearchControl.value.trim(),
    loader: ({ request }) =>
      this.http.get<PaginatedApiResponse<BillingClient>>(`${environment.apiUrl}/clients`, {
        params: new HttpParams().set('limit', '100').set('search', request),
      }),
  });

  readonly serviceTemplatesResource = rxResource({
    loader: () => this.invoiceService.getServiceTemplates(),
  });

  readonly invoiceResource = rxResource({
    request: () => (this.isEditMode() ? this.invoiceId() : null),
    loader: ({ request }) => (request ? this.invoiceService.getInvoice(request) : of(null)),
  });

  readonly clients = computed(() => this.clientsResource.value()?.data ?? []);
  readonly filteredClients = computed(() => this.clients());
  readonly serviceTemplates = computed(() => (this.serviceTemplatesResource.value()?.data ?? []).slice(0, 12));
  readonly organization = computed(() => {
    const user = this.authService.currentUser() as BillingUser | null;
    return {
      ...DEFAULT_ORGANIZATION,
      ...user?.organization,
    };
  });
  readonly orgStateCode = computed(() => this.organization().stateCode || DEFAULT_ORGANIZATION.stateCode);
  readonly selectedClientId = toSignal(
    this.invoiceForm.controls.clientId.valueChanges.pipe(
      startWith(this.invoiceForm.controls.clientId.getRawValue())
    ),
    { initialValue: this.invoiceForm.controls.clientId.getRawValue() }
  );
  readonly selectedGstType = toSignal(
    this.invoiceForm.controls.gstType.valueChanges.pipe(
      startWith(this.invoiceForm.controls.gstType.getRawValue())
    ),
    { initialValue: this.invoiceForm.controls.gstType.getRawValue() }
  );
  readonly lineItemsValue = toSignal(
    this.invoiceForm.controls.lineItems.valueChanges.pipe(
      startWith(this.invoiceForm.controls.lineItems.getRawValue())
    ),
    { initialValue: this.invoiceForm.controls.lineItems.getRawValue() }
  );
  readonly selectedClient = computed(
    () => this.clients().find((client) => client.id === this.selectedClientId()) ?? null
  );
  readonly gstCalc = signal<GstCalculation>(
    calculateGST([], DEFAULT_ORGANIZATION.stateCode, DEFAULT_ORGANIZATION.stateCode)
  );
  readonly isLoading = computed(
    () =>
      this.clientsResource.isLoading() ||
      this.serviceTemplatesResource.isLoading() ||
      this.invoiceResource.isLoading()
  );
  readonly pageTitle = computed(() => (this.isEditMode() ? 'Edit Invoice' : 'Create Invoice'));
  readonly primaryActionLabel = computed(() => (this.isEditMode() ? 'Update Invoice' : 'Save as Draft'));

  constructor() {
    this.invoiceForm.controls.clientId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((clientId) => this.handleClientSelection(clientId));

    effect(() => {
      this.lineItemsValue();
      this.selectedClient();
      this.selectedGstType();
      this.recalculateGST();
    });

    effect(() => {
      const response = this.invoiceResource.value();
      if (!this.isEditMode() || this.invoicePatched() || !response?.data) {
        return;
      }

      this.patchInvoice(response.data);
      this.invoicePatched.set(true);
    });
  }

  get lineItemsArray(): FormArray<FormGroup<LineItemFormModel>> {
    return this.invoiceForm.controls.lineItems;
  }

  createLineItemGroup(item?: Partial<CreateLineItemDto>): FormGroup<LineItemFormModel> {
    return this.fb.group<LineItemFormModel>({
      serviceTemplateId: this.fb.control(item?.serviceTemplateId ?? null),
      description: this.fb.nonNullable.control(item?.description ?? '', [
        Validators.required,
        Validators.maxLength(255),
      ]),
      sacCode: this.fb.nonNullable.control(item?.sacCode ?? '998231', Validators.required),
      quantity: this.fb.control<number | null>(item?.quantity ?? 1, [
        Validators.required,
        Validators.min(0.01),
      ]),
      unitRate: this.fb.control<number | null>(item?.unitRate ?? 0, [
        Validators.required,
        Validators.min(0),
      ]),
    });
  }

  addLineItem(item?: Partial<CreateLineItemDto>): void {
    this.lineItemsArray.push(this.createLineItemGroup(item));
  }

  removeLineItem(index: number): void {
    if (this.lineItemsArray.length === 1) {
      return;
    }

    this.lineItemsArray.removeAt(index);
  }

  addTemplate(template: ServiceTemplate): void {
    this.addLineItem({
      description: template.name,
      sacCode: template.sacCode,
      quantity: 1,
      unitRate: template.defaultRate,
      serviceTemplateId: template.id,
    });
  }

  lineAmount(index: number): number {
    const group = this.lineItemsArray.at(index);
    const rawValue = group.getRawValue();
    return lineItemAmount(rawValue.quantity ?? 0, rawValue.unitRate ?? 0);
  }

  displayClientName(client: BillingClient): string {
    return client.name ?? client.user?.name ?? 'Unnamed client';
  }

  saveDraft(): void {
    this.persistInvoice('draft');
  }

  saveAndIssue(): void {
    this.persistInvoice('issue');
  }

  previewInvoice(): void {
    this.persistInvoice('preview');
  }

  recalculateGST(): void {
    const rawLineItems = this.lineItemsArray.getRawValue().map((item) => ({
      quantity: item.quantity ?? 0,
      unitRate: item.unitRate ?? 0,
    }));
    const clientStateCode = this.selectedClient()?.stateCode ?? this.orgStateCode();
    const orgStateCode = this.orgStateCode();
    const calculated = calculateGST(rawLineItems, clientStateCode, orgStateCode);
    const selectedType = this.invoiceForm.controls.gstType.getRawValue();

    if (selectedType === calculated.gstType) {
      this.gstCalc.set(calculated);
      return;
    }

    const subtotal = calculated.subtotal;
    const cgstAmount = selectedType === 'CGST_SGST' ? Math.round(subtotal * 9) / 100 : 0;
    const sgstAmount = selectedType === 'CGST_SGST' ? Math.round(subtotal * 9) / 100 : 0;
    const igstAmount = selectedType === 'IGST' ? Math.round(subtotal * 18) / 100 : 0;
    const totalBeforeRounding = subtotal + cgstAmount + sgstAmount + igstAmount;
    const totalAmount = Math.round(totalBeforeRounding);
    const roundOff = Math.round((totalAmount - totalBeforeRounding) * 100) / 100;

    this.gstCalc.set({
      subtotal,
      gstType: selectedType,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalBeforeRounding: Math.round(totalBeforeRounding * 100) / 100,
      roundOff,
      totalAmount,
    });
  }

  controlHasError(control: AbstractControl | null, error: string): boolean {
    return Boolean(control?.touched && control.hasError(error));
  }

  private handleClientSelection(clientId: string): void {
    if (!clientId || this.isEditMode()) {
      return;
    }

    const client = this.clients().find((entry) => entry.id === clientId);
    if (!client) {
      return;
    }

    this.invoiceForm.patchValue({
      clientGstin: client.gstin ?? '',
      gstType: this.detectGstType(client.stateCode),
    });
  }

  private detectGstType(clientStateCode: string): GstType {
    return clientStateCode === this.orgStateCode() ? 'CGST_SGST' : 'IGST';
  }

  private patchInvoice(invoice: Invoice): void {
    this.invoiceNumberControl.setValue(invoice.invoiceNumber);

    this.invoiceForm.patchValue(
      {
        clientId: invoice.clientId,
        invoiceDate: isoDateFromValue(invoice.invoiceDate),
        dueDate: isoDateFromValue(invoice.dueDate),
        gstType: invoice.gstType,
        clientGstin: invoice.clientGstin ?? '',
        notes: invoice.notes ?? '',
      },
      { emitEvent: false }
    );

    this.lineItemsArray.clear();
    (invoice.lineItems ?? []).forEach((item) =>
      this.lineItemsArray.push(
        this.createLineItemGroup({
          serviceTemplateId: item.serviceTemplateId,
          description: item.description,
          sacCode: item.sacCode,
          quantity: item.quantity,
          unitRate: item.unitRate,
        })
      )
    );

    if (this.lineItemsArray.length === 0) {
      this.lineItemsArray.push(this.createLineItemGroup());
    }

    if (invoice.status !== 'draft') {
      this.readOnlyMode.set(true);
      this.invoiceForm.disable({ emitEvent: false });
      this.toast.info('Only draft invoices can be edited');
    } else {
      this.invoiceForm.controls.clientId.disable({ emitEvent: false });
    }

    this.recalculateGST();
  }

  private persistInvoice(action: 'draft' | 'issue' | 'preview'): void {
    if (this.readOnlyMode()) {
      return;
    }

    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      this.toast.error('Please complete the required invoice details');
      return;
    }

    this.isSubmitting.set(true);
    const dto = this.buildDto();

    if (this.isEditMode() && this.invoiceId()) {
      this.updateExistingInvoice(this.invoiceId()!, dto, action);
      return;
    }

    this.invoiceService.createInvoice(dto).subscribe({
      next: (response) => {
        const savedInvoiceId = response.data?.id;
        if (!savedInvoiceId) {
          this.isSubmitting.set(false);
          this.toast.error('Invoice saved but response was incomplete');
          return;
        }

        if (response.data.invoiceNumber) {
          this.invoiceNumberControl.setValue(response.data.invoiceNumber);
        }

        this.handlePostSave(savedInvoiceId, action, false);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to save invoice');
      },
    });
  }

  private updateExistingInvoice(id: string, dto: UpdateInvoiceDto, action: 'draft' | 'issue' | 'preview'): void {
    this.invoiceService.updateInvoice(id, dto).subscribe({
      next: () => this.handlePostSave(id, action, true),
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to update invoice');
      },
    });
  }

  private handlePostSave(id: string, action: 'draft' | 'issue' | 'preview', wasUpdate: boolean): void {
    if (action === 'draft') {
      this.isSubmitting.set(false);
      this.toast.success(wasUpdate ? 'Invoice updated' : 'Draft saved');

      if (!wasUpdate) {
        void this.router.navigate(['/billing/invoices', id, 'edit']);
      }

      return;
    }

    if (action === 'preview') {
      this.isSubmitting.set(false);
      this.toast.success(wasUpdate ? 'Invoice updated' : 'Invoice saved');
      void this.router.navigate(['/billing/invoices', id]);
      return;
    }

    this.invoiceService.issueInvoice(id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Invoice saved and issued');
        void this.router.navigate(['/billing/invoices', id]);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Invoice saved, but issuing failed');
      },
    });
  }

  private buildDto(): CreateInvoiceDto {
    const rawValue = this.invoiceForm.getRawValue();

    return {
      clientId: rawValue.clientId,
      invoiceDate: rawValue.invoiceDate,
      dueDate: rawValue.dueDate,
      notes: rawValue.notes || undefined,
      clientGstin: rawValue.clientGstin || undefined,
      gstType: rawValue.gstType,
      lineItems: rawValue.lineItems.map((item) => ({
        serviceTemplateId: item.serviceTemplateId ?? undefined,
        description: item.description.trim(),
        sacCode: item.sacCode.trim(),
        quantity: item.quantity ?? 0,
        unitRate: item.unitRate ?? 0,
      })),
    };
  }

  private addDays(date: Date, days: number): Date {
    const updated = new Date(date);
    updated.setDate(updated.getDate() + days);
    return updated;
  }
}
