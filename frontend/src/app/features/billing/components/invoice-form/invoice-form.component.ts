import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, Input, Output, EventEmitter, OnInit } from '@angular/core';
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

import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  heroSquares2x2, 
  heroXMark, 
  heroPlus, 
  heroCheckCircle, 
  heroMagnifyingGlass, 
  heroUser, 
  heroDocumentText, 
  heroQueueList, 
  heroTrash, 
  heroArrowTrendingUp, 
  heroBolt, 
  heroBuildingOffice, 
  heroShieldCheck,
  heroClipboardDocumentCheck,
  heroPaperAirplane,
  heroBookmark
} from '@ng-icons/heroicons/outline';

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
  address?: string;
  city?: string;
  pincode?: string;
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
  invoiceType: FormControl<'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note'>;
  expiryDate: FormControl<string>;
  gstType: FormControl<GstType>;
  clientGstin: FormControl<string>;
  customerName: FormControl<string>;
  customerAddress: FormControl<string>;
  notes: FormControl<string>;
  lineItems: FormArray<FormGroup<LineItemFormModel>>;
  isRecurring: FormControl<boolean>;
  recurringFrequency: FormControl<'weekly' | 'monthly' | 'quarterly' | 'yearly'>;
  recurringAutoSend: FormControl<boolean>;
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
    NgIconComponent
  ],
  providers: [
    provideIcons({
      heroSquares2x2,
      heroXMark,
      heroPlus,
      heroCheckCircle,
      heroMagnifyingGlass,
      heroUser,
      heroDocumentText,
      heroQueueList,
      heroTrash,
      heroArrowTrendingUp,
      heroBolt,
      heroBuildingOffice,
      heroShieldCheck,
      heroClipboardDocumentCheck,
      heroPaperAirplane,
      heroBookmark
    })
  ],
  templateUrl: './invoice-form.component.html',
  styles: [`
    :host { 
      display: block; 
      --studio-primary: #6366f1; 
      --studio-primary-rgb: 99, 102, 241;
      --studio-primary-light: #eef2ff;
      --studio-primary-glow: rgba(99, 102, 241, 0.2);
    }

    .billing-studio-container.mode-client {
      --studio-primary: #10b981; 
      --studio-primary-rgb: 16, 185, 129;
      --studio-primary-light: #ecfdf5;
      --studio-primary-glow: rgba(16, 185, 129, 0.2);
    }
    
    .billing-studio-container { max-width: 1400px; margin: 0 auto; min-height: 100vh; }
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .studio-badge { @apply inline-flex items-center gap-2 px-3 py-1 bg-[var(--studio-primary-light)] text-[var(--studio-primary)] rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-[var(--studio-primary-light)]; }
    
    .glass-card { @apply bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm transition-all; }
    .glass-card-primary { 
      background: linear-gradient(135deg, var(--studio-primary), #1e1b4b);
      @apply rounded-3xl border transition-all; 
      border-color: rgba(var(--studio-primary-rgb), 0.3);
    }
    .glass-card-float { @apply bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl; }

    .section-icon { @apply w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700; opacity: 0.8; }
    
    .studio-label { @apply block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1; }
    .studio-input { @apply w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[var(--studio-primary)] focus:border-[var(--studio-primary)] transition-all text-slate-900 dark:text-white placeholder:text-slate-300; }
    .studio-select { @apply w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[var(--studio-primary)] focus:border-[var(--studio-primary)] transition-all appearance-none text-slate-900 dark:text-white; }
    .studio-input-minimal { @apply w-full bg-transparent border-none focus:ring-0 px-0 py-0 text-sm focus:outline-none; }

    .btn-studio-primary { 
      background-color: var(--studio-primary);
      @apply flex items-center gap-2 hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98];
      box-shadow: 0 10px 15px -3px var(--studio-primary-glow);
    }
    .btn-studio-secondary { @apply flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3 px-6 rounded-2xl transition-all; }
    .btn-studio-text { color: var(--studio-primary); @apply flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:opacity-70 transition-opacity; }

    .radio-tile { @apply relative p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer transition-all; }
    .radio-tile:hover { border-color: rgba(var(--studio-primary-rgb), 0.3); }
    .radio-tile.active { border-color: var(--studio-primary); background-color: var(--studio-primary-light); }

    .template-tile { @apply flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-[var(--studio-primary)] hover:bg-[var(--studio-primary-light)] transition-all text-left w-full h-auto; }
    
    .dropdown-item { @apply flex items-center px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors; }

    .loader-sm { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.1); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .loader-lg { width: 40px; height: 40px; border: 4px solid rgba(0,0,0,0.1); border-top-color: var(--studio-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .shadow-text { text-shadow: 0 4px 12px var(--studio-primary-glow); }
  `],
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

  @Input() embeddedClientId: string | null = null;
  @Input() embeddedInvoiceId: string | null = null;
  @Input() isEmbedded = false;
  @Output() saved = new EventEmitter<void>();
  @Output() canceled = new EventEmitter<void>();

  readonly isEditMode = signal(false);
  readonly invoiceId = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly readOnlyMode = signal(false);
  protected readonly invoicePatched = signal(false);

  // Studio Context: 'firm' (CA Firm billing Client) or 'client' (Client billing Guest/Customer)
  readonly viewMode = computed(() => this.isEmbedded ? 'client' : 'firm');

  readonly invoiceNumberControl = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  readonly clientSearchControl = new FormControl('', { nonNullable: true });

  readonly invoiceForm = this.fb.group<InvoiceFormModel>({
    clientId: this.fb.nonNullable.control('', Validators.required),
    invoiceDate: this.fb.nonNullable.control(formatDateInput(new Date()), Validators.required),
    dueDate: this.fb.nonNullable.control(formatDateInput(this.addDays(new Date(), 30)), Validators.required),
    expiryDate: this.fb.nonNullable.control(''),
    invoiceType: this.fb.nonNullable.control<'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note'>('tax_invoice'),
    gstType: this.fb.nonNullable.control<GstType>('CGST_SGST'),
    clientGstin: this.fb.nonNullable.control(''),
    customerName: this.fb.nonNullable.control(''),
    customerAddress: this.fb.nonNullable.control(''),
    notes: this.fb.nonNullable.control(''),
    lineItems: this.fb.array<FormGroup<LineItemFormModel>>([this.createLineItemGroup()]),
    isRecurring: this.fb.nonNullable.control(false),
    recurringFrequency: this.fb.nonNullable.control<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly'),
    recurringAutoSend: this.fb.nonNullable.control(false),
  });

  readonly clientsResource = rxResource({
    request: () => this.clientSearchControl.value.trim(),
    loader: ({ request }) =>
      this.http.get<PaginatedApiResponse<BillingClient>>(`${environment.apiUrl}/clients`, {
        params: new HttpParams().set('limit', '100').set('search', request),
      }),
  });

  readonly serviceTemplatesResource = rxResource({
    request: () => this.viewMode() === 'client' ? this.embeddedClientId : null,
    loader: ({ request }) => this.invoiceService.getServiceTemplates(request),
  });

  readonly invoiceResource = rxResource({
    request: () => (this.isEditMode() ? this.invoiceId() : null),
    loader: ({ request }) => (request ? this.invoiceService.getInvoice(request) : of(null)),
  });

  readonly clients = computed(() => this.clientsResource.value()?.data ?? []);
  readonly filteredClients = computed(() => this.clients());
  readonly serviceTemplates = computed(() => (this.serviceTemplatesResource.value()?.data ?? []).slice(0, 15));
  readonly organization = computed(() => {
    const user = this.authService.currentUser() as BillingUser | null;
    if (this.viewMode() === 'client' && this.selectedClient()) {
      const client = this.selectedClient()!;
      return {
        name: client.name || client.user?.name || 'Company Name',
        gstin: client.gstin || 'No GSTIN',
        pan: '', // Client PAN not always available but could be added
        addressLine1: client.address || 'Address Line 1',
        addressLine2: `${client.city || ''} ${client.pincode || ''}`,
        stateCode: client.stateCode || '24',
      };
    }
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
  readonly pageTitle = computed(() => this.viewMode() === 'client' ? 'Client Sales Studio' : 'CA Billing Studio');
  readonly primaryActionLabel = computed(() => (this.isEditMode() ? 'Update Document' : 'Generate Draft'));

  ngOnInit() {
    this.isEditMode.set(this.isEmbedded ? !!this.embeddedInvoiceId : Boolean(this.route.snapshot.data['editMode']));
    this.invoiceId.set(this.isEmbedded ? this.embeddedInvoiceId : this.route.snapshot.paramMap.get('id'));

    const initialClientId = this.isEmbedded ? this.embeddedClientId : this.route.snapshot.queryParamMap.get('clientId');
    if (initialClientId && !this.isEditMode()) {
      this.invoiceForm.controls.clientId.setValue(initialClientId);
    }
  }

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

  applyTemplate(template: ServiceTemplate): void {
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

  onSubmit(): void {
    this.persistInvoice('draft');
  }

  onSelectClient(clientId: string): void {
    this.invoiceForm.controls.clientId.setValue(clientId);
    this.clientSearchControl.setValue('', { emitEvent: false });
  }

  onCancel(): void {
    this.canceled.emit();
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
        invoiceType: (invoice as any).invoiceType || 'tax_invoice',
        expiryDate: (invoice as any).expiryDate ? isoDateFromValue((invoice as any).expiryDate) : '',
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
    const rawValue = this.invoiceForm.getRawValue();

    const finishSave = () => {
      if (this.isEmbedded) {
        this.isSubmitting.set(false);
        this.toast.success(wasUpdate ? 'Invoice updated' : 'Invoice saved successfully');
        this.saved.emit();
        return;
      }

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
    };

    if (rawValue.isRecurring && !wasUpdate) { // Only create recurring on initial creation
      let nextRun = new Date(rawValue.invoiceDate);
      if (rawValue.recurringFrequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
      else if (rawValue.recurringFrequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);
      else if (rawValue.recurringFrequency === 'quarterly') nextRun.setMonth(nextRun.getMonth() + 3);
      else if (rawValue.recurringFrequency === 'yearly') nextRun.setFullYear(nextRun.getFullYear() + 1);

      this.invoiceService.createRecurringInvoice({
        baseInvoiceId: id,
        frequency: rawValue.recurringFrequency,
        nextRunDate: nextRun.toISOString().split('T')[0],
        autoSend: rawValue.recurringAutoSend
      }).subscribe({
        next: () => {
          this.toast.success('Recurring schedule created');
          finishSave();
        },
        error: () => {
          this.toast.error('Invoice saved, but failed to setup recurring schedule');
          finishSave();
        }
      });
    } else {
      finishSave();
    }
  }

  private buildDto(): CreateInvoiceDto {
    const rawValue = this.invoiceForm.getRawValue();
    const isQuotation = rawValue.invoiceType === 'quotation';

    return {
      clientId: rawValue.clientId,
      invoiceDate: rawValue.invoiceDate,
      dueDate: rawValue.dueDate,
      expiryDate: isQuotation && rawValue.expiryDate ? rawValue.expiryDate : undefined,
      invoiceType: rawValue.invoiceType,
      notes: rawValue.notes || undefined,
      customerName: rawValue.customerName || undefined,
      customerAddress: rawValue.customerAddress || undefined,
      clientGstin: rawValue.clientGstin || undefined,
      gstType: rawValue.gstType,
      lineItems: rawValue.lineItems.map((item) => ({
        serviceTemplateId: item.serviceTemplateId ?? undefined,
        description: item.description.trim(),
        sacCode: item.sacCode.trim(),
        quantity: item.quantity ?? 0,
        unitRate: item.unitRate ?? 0,
      })),
    } as any;
  }

  private addDays(date: Date, days: number): Date {
    const updated = new Date(date);
    updated.setDate(updated.getDate() + days);
    return updated;
  }
}
