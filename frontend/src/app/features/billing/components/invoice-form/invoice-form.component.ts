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
import { PaginatedApiResponse } from '@core/services/workspace.service';
import { AuthService, User } from '@core/services/auth.service';
import { ClientService } from '@core/services/client.service';
import { ToastService } from '@core/services/toast.service';
import { environment } from '@environments/environment';
import { of, startWith } from 'rxjs';
import { InventoryService } from '@app/features/inventory/data-access/inventory.service';
import type { Item, StockSummary, Warehouse } from '@app/features/inventory/models/inventory.models';
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
  itemId: FormControl<string>;
  variantId: FormControl<string>;
  sku: FormControl<string>;
  serialNo: FormControl<string>;
  batchNo: FormControl<string>;
  warehouseId: FormControl<string>;
  trackInventory: FormControl<boolean>;
  availableStock: FormControl<number | null>;
  description: FormControl<string>;
  sacCode: FormControl<string>;
  quantity: FormControl<number | null>;
  unitRate: FormControl<number | null>;
  gstRate: FormControl<number | null>;
  discountPct: FormControl<number | null>;
};

type InvoiceFormModel = {
  clientId: FormControl<string>;
  warehouseId: FormControl<string>;
  salesPerson: FormControl<string>;
  invoiceDate: FormControl<string>;
  dueDate: FormControl<string>;
  invoiceType: FormControl<'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note'>;
  expiryDate: FormControl<string>;
  gstType: FormControl<GstType>;
  clientGstin: FormControl<string>;
  customerName: FormControl<string>;
  customerMobile: FormControl<string>;
  customerEmail: FormControl<string>;
  customerAddress: FormControl<string>;
  shippingAddress: FormControl<string>;
  paymentStatus: FormControl<'draft' | 'pending' | 'paid'>;
  paymentMethod: FormControl<'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'credit'>;
  transactionId: FormControl<string>;
  amountPaid: FormControl<number | null>;
  notes: FormControl<string>;
  internalNotes: FormControl<string>;
  terms: FormControl<string>;
  lineItems: FormArray<FormGroup<LineItemFormModel>>;
  isRecurring: FormControl<boolean>;
  recurringFrequency: FormControl<'weekly' | 'monthly' | 'quarterly' | 'yearly'>;
  recurringAutoSend: FormControl<boolean>;
};

interface SalesTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  roundOff: number;
  amountPaid: number;
  balanceDue: number;
}

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
    
    .billing-studio-container { width: 100%; max-width: none; margin: 0; min-height: 100vh; }
    .billing-studio-container.embedded { min-height: auto; }
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
  private clientService = inject(ClientService);
  private inventoryService = inject(InventoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  @Input() embeddedClientId: string | null = null;
  @Input() embeddedInvoiceId: string | null = null;
  @Input() isEmbedded = false;
  @Output() saved = new EventEmitter<void>();
  @Output() canceled = new EventEmitter<void>();

  readonly isEditMode = signal(false);
  readonly invoiceId = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly readOnlyMode = signal(false);
  readonly embeddedClient = signal<BillingClient | null>(null);
  readonly warehouseStock = signal<StockSummary[]>([]);
  readonly isStockLoading = signal(false);
  protected readonly invoicePatched = signal(false);

  // Embedded workspace billing is for the client business invoicing its own customers.
  readonly viewMode = computed(() => this.isEmbedded ? 'client' : 'firm');

  readonly invoiceNumberControl = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  readonly clientSearchControl = new FormControl('', { nonNullable: true });
  readonly barcodeScanControl = new FormControl('', { nonNullable: true });

  readonly invoiceForm = this.fb.group<InvoiceFormModel>({
    clientId: this.fb.nonNullable.control('', Validators.required),
    warehouseId: this.fb.nonNullable.control(''),
    salesPerson: this.fb.nonNullable.control(''),
    invoiceDate: this.fb.nonNullable.control(formatDateInput(new Date()), Validators.required),
    dueDate: this.fb.nonNullable.control(formatDateInput(this.addDays(new Date(), 30)), Validators.required),
    expiryDate: this.fb.nonNullable.control(''),
    invoiceType: this.fb.nonNullable.control<'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note'>('tax_invoice'),
    gstType: this.fb.nonNullable.control<GstType>('CGST_SGST'),
    clientGstin: this.fb.nonNullable.control(''),
    customerName: this.fb.nonNullable.control(''),
    customerMobile: this.fb.nonNullable.control(''),
    customerEmail: this.fb.nonNullable.control('', Validators.email),
    customerAddress: this.fb.nonNullable.control(''),
    shippingAddress: this.fb.nonNullable.control(''),
    paymentStatus: this.fb.nonNullable.control<'draft' | 'pending' | 'paid'>('pending'),
    paymentMethod: this.fb.nonNullable.control<'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'credit'>('upi'),
    transactionId: this.fb.nonNullable.control(''),
    amountPaid: this.fb.control<number | null>(0, Validators.min(0)),
    notes: this.fb.nonNullable.control(''),
    internalNotes: this.fb.nonNullable.control(''),
    terms: this.fb.nonNullable.control('Goods once sold will not be returned.'),
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

  readonly inventoryItemsResource = rxResource({
    request: () => this.viewMode(),
    loader: ({ request }) =>
      request === 'client'
        ? this.inventoryService.getItems({ limit: 100, isActive: true })
        : of({ data: [] }),
  });

  readonly warehousesResource = rxResource({
    request: () => this.viewMode(),
    loader: ({ request }) =>
      request === 'client'
        ? this.inventoryService.getWarehouses()
        : of({ data: [] }),
  });

  readonly invoiceResource = rxResource({
    request: () => (this.isEditMode() ? this.invoiceId() : null),
    loader: ({ request }) => (request ? this.invoiceService.getInvoice(request) : of(null)),
  });

  readonly clients = computed(() => this.clientsResource.value()?.data ?? []);
  readonly filteredClients = computed(() => this.clients());
  readonly inventoryItems = computed<Item[]>(() => {
    const response: any = this.inventoryItemsResource.value();
    return response?.data ?? response?.items ?? [];
  });
  readonly warehouses = computed<Warehouse[]>(() => {
    const response: any = this.warehousesResource.value();
    return response?.data ?? response ?? [];
  });
  readonly serviceTemplates = computed(() =>
    this.viewMode() === 'client' ? [] : (this.serviceTemplatesResource.value()?.data ?? []).slice(0, 15)
  );
  readonly organization = computed(() => {
    const user = this.authService.currentUser() as BillingUser | null;
    if (this.viewMode() === 'client' && this.selectedClient()) {
      const client = this.selectedClient()!;
      return {
        name: client.name || client.user?.name || 'Client Business',
        gstin: client.gstin || 'No GSTIN',
        pan: '',
        addressLine1: client.address || 'Address not set',
        addressLine2: `${client.city || ''} ${client.pincode || ''}`.trim(),
        stateCode: client.stateCode || DEFAULT_ORGANIZATION.stateCode,
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
  readonly selectedWarehouseId = toSignal(
    this.invoiceForm.controls.warehouseId.valueChanges.pipe(
      startWith(this.invoiceForm.controls.warehouseId.getRawValue())
    ),
    { initialValue: this.invoiceForm.controls.warehouseId.getRawValue() }
  );
  readonly amountPaidValue = toSignal(
    this.invoiceForm.controls.amountPaid.valueChanges.pipe(
      startWith(this.invoiceForm.controls.amountPaid.getRawValue())
    ),
    { initialValue: this.invoiceForm.controls.amountPaid.getRawValue() }
  );
  readonly paymentStatusValue = toSignal(
    this.invoiceForm.controls.paymentStatus.valueChanges.pipe(
      startWith(this.invoiceForm.controls.paymentStatus.getRawValue())
    ),
    { initialValue: this.invoiceForm.controls.paymentStatus.getRawValue() }
  );
  readonly lineItemsValue = toSignal(
    this.invoiceForm.controls.lineItems.valueChanges.pipe(
      startWith(this.invoiceForm.controls.lineItems.getRawValue())
    ),
    { initialValue: this.invoiceForm.controls.lineItems.getRawValue() }
  );
  readonly selectedClient = computed(
    () => this.clients().find((client) => client.id === this.selectedClientId()) ?? this.embeddedClient()
  );
  readonly salesTotals = computed<SalesTotals>(() => this.calculateSalesTotals());
  readonly gstCalc = signal<GstCalculation>(
    calculateGST([], DEFAULT_ORGANIZATION.stateCode, DEFAULT_ORGANIZATION.stateCode)
  );
  readonly isLoading = computed(
    () =>
      this.clientsResource.isLoading() ||
      this.serviceTemplatesResource.isLoading() ||
      this.inventoryItemsResource.isLoading() ||
      this.warehousesResource.isLoading() ||
      this.invoiceResource.isLoading()
  );
  readonly pageTitle = computed(() => this.viewMode() === 'client' ? 'Create Customer Invoice' : 'CA Billing Studio');
  readonly primaryActionLabel = computed(() => {
    if (this.isEditMode()) return 'Update Invoice';
    return this.viewMode() === 'client' ? 'Save Customer Invoice' : 'Save Invoice';
  });

  ngOnInit() {
    this.isEditMode.set(this.isEmbedded ? !!this.embeddedInvoiceId : Boolean(this.route.snapshot.data['editMode']));
    this.invoiceId.set(this.isEmbedded ? this.embeddedInvoiceId : this.route.snapshot.paramMap.get('id'));

    const initialClientId = this.isEmbedded ? this.embeddedClientId : this.route.snapshot.queryParamMap.get('clientId');
    if (initialClientId && !this.isEditMode()) {
      this.invoiceForm.controls.clientId.setValue(initialClientId);
    }

    if (this.isEmbedded && initialClientId) {
      this.loadEmbeddedClient(initialClientId);
      this.invoiceForm.controls.customerName.addValidators(Validators.required);
      this.invoiceForm.controls.customerName.updateValueAndValidity();
    }
  }

  constructor() {
    this.invoiceForm.controls.clientId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((clientId) => this.handleClientSelection(clientId));

    this.invoiceForm.controls.warehouseId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((warehouseId) => this.handleWarehouseSelection(warehouseId));

    this.invoiceForm.controls.paymentStatus.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((status) => this.handlePaymentStatusChange(status));

    effect(() => {
      this.lineItemsValue();
      this.selectedClient();
      this.selectedGstType();
      this.selectedWarehouseId();
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

    effect(() => {
      const warehouses = this.warehouses();
      if (this.viewMode() !== 'client' || this.invoiceForm.controls.warehouseId.getRawValue() || warehouses.length === 0) {
        return;
      }

      const defaultWarehouse = warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0];
      this.invoiceForm.controls.warehouseId.setValue(defaultWarehouse.id);
    });

    effect(() => {
      this.lineItemsValue();
      if (this.paymentStatusValue() !== 'paid') return;

      const grandTotal = this.salesTotals().grandTotal;
      if (this.invoiceForm.controls.amountPaid.getRawValue() !== grandTotal) {
        this.invoiceForm.controls.amountPaid.setValue(grandTotal);
      }
    });
  }

  get lineItemsArray(): FormArray<FormGroup<LineItemFormModel>> {
    return this.invoiceForm.controls.lineItems;
  }

  createLineItemGroup(item?: Partial<CreateLineItemDto>): FormGroup<LineItemFormModel> {
    return this.fb.group<LineItemFormModel>({
      serviceTemplateId: this.fb.control(item?.serviceTemplateId ?? null),
      itemId: this.fb.nonNullable.control(item?.itemId ?? ''),
      variantId: this.fb.nonNullable.control(item?.variantId ?? ''),
      sku: this.fb.nonNullable.control(item?.sku ?? ''),
      serialNo: this.fb.nonNullable.control(item?.serialNo ?? ''),
      batchNo: this.fb.nonNullable.control(item?.batchNo ?? ''),
      warehouseId: this.fb.nonNullable.control(item?.warehouseId ?? ''),
      trackInventory: this.fb.nonNullable.control(item?.trackInventory === true),
      availableStock: this.fb.control<number | null>(item?.availableStock ?? null),
      description: this.fb.nonNullable.control(item?.description ?? '', [
        Validators.required,
        Validators.maxLength(255),
      ]),
      sacCode: this.fb.nonNullable.control(item?.sacCode ?? '8517', Validators.required),
      quantity: this.fb.control<number | null>(item?.quantity ?? 1, [
        Validators.required,
        Validators.min(0.01),
      ]),
      unitRate: this.fb.control<number | null>(item?.unitRate ?? 0, [
        Validators.required,
        Validators.min(0),
      ]),
      gstRate: this.fb.control<number | null>(item?.gstRate ?? 18, [
        Validators.min(0),
        Validators.max(100),
      ]),
      discountPct: this.fb.control<number | null>(item?.discountPct ?? 0, [
        Validators.min(0),
        Validators.max(100),
      ]),
    });
  }

  addLineItem(item?: Partial<CreateLineItemDto>): void {
    this.lineItemsArray.push(
      this.createLineItemGroup({
        ...item,
        warehouseId: item?.warehouseId ?? this.invoiceForm.controls.warehouseId.getRawValue(),
      })
    );
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
      gstRate: template.defaultGstRate,
      serviceTemplateId: template.id,
    });
  }

  lineAmount(index: number): number {
    return this.lineTotal(index);
  }

  lineBase(index: number): number {
    const rawValue = this.lineItemsArray.at(index).getRawValue();
    return this.roundMoney((rawValue.quantity ?? 0) * (rawValue.unitRate ?? 0));
  }

  lineDiscount(index: number): number {
    const rawValue = this.lineItemsArray.at(index).getRawValue();
    return this.roundMoney(this.lineBase(index) * ((rawValue.discountPct ?? 0) / 100));
  }

  lineTaxable(index: number): number {
    return this.roundMoney(Math.max(this.lineBase(index) - this.lineDiscount(index), 0));
  }

  lineTax(index: number): number {
    const rawValue = this.lineItemsArray.at(index).getRawValue();
    return this.roundMoney(this.lineTaxable(index) * ((rawValue.gstRate ?? 0) / 100));
  }

  lineTotal(index: number): number {
    return this.roundMoney(this.lineTaxable(index) + this.lineTax(index));
  }

  stockTone(index: number): string {
    const rawValue = this.lineItemsArray.at(index).getRawValue();
    if (!rawValue.trackInventory) return 'text-slate-400';
    const available = rawValue.availableStock;
    if (available === null || available === undefined) return 'text-amber-600';
    if ((rawValue.quantity ?? 0) > available) return 'text-rose-600';
    return 'text-emerald-600';
  }

  onSelectInventoryItem(index: number, itemId: string): void {
    const item = this.inventoryItems().find((entry) => entry.id === itemId);
    if (!item) return;
    this.patchInventoryItem(index, item);
  }

  private patchInventoryItem(index: number, item: Partial<Item> & { id: string }): void {
    const row = this.lineItemsArray.at(index);
    const stock = this.getAvailableStock(item.id, row.controls.batchNo.getRawValue());

    row.patchValue({
      itemId: item.id,
      sku: item.sku ?? item.barcode ?? '',
      description: item.name,
      sacCode: item.hsnSacCode ?? row.controls.sacCode.getRawValue(),
      unitRate: Number(item.sellingPrice ?? 0),
      gstRate: Number(item.gstRate ?? 18),
      trackInventory: item.trackInventory === true,
      warehouseId: this.invoiceForm.controls.warehouseId.getRawValue(),
      availableStock: stock,
    });
  }

  onBarcodeScan(): void {
    const barcode = this.barcodeScanControl.getRawValue().trim();
    if (!barcode) {
      this.toast.info('Enter or scan a barcode first');
      return;
    }

    this.inventoryService.getItemByBarcode(barcode).subscribe({
      next: (response: any) => {
        const item = response?.data?.item ?? response?.data ?? response?.item ?? response;
        if (!item?.id) {
          this.toast.error('Barcode did not match an item');
          return;
        }

        let index = this.lineItemsArray.controls.findIndex((row) => !row.controls.itemId.getRawValue() && !row.controls.description.getRawValue());
        if (index === -1) {
          this.addLineItem();
          index = this.lineItemsArray.length - 1;
        }

        this.patchInventoryItem(index, item);
        this.barcodeScanControl.setValue('');
        this.toast.success('Barcode item added');
      },
      error: () => this.toast.error('Item not found for barcode'),
    });
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

  printInvoice(): void {
    window.print();
  }

  downloadPdf(): void {
    if (!this.invoiceId()) {
      this.toast.info('Save the invoice before downloading PDF');
      return;
    }

    this.invoiceService.generatePdfWithTemplate(this.invoiceId()!).subscribe({
      next: () => this.toast.success('PDF generation started'),
      error: () => this.toast.error('PDF could not be generated'),
    });
  }

  sendMail(): void {
    this.toast.info('Email sending will use the finalized invoice PDF once mail settings are connected');
  }

  sendWhatsApp(): void {
    this.toast.info('WhatsApp sharing will be connected to the finalized invoice PDF flow');
  }

  recalculateGST(): void {
    const totals = this.salesTotals();

    this.gstCalc.set({
      subtotal: totals.taxableAmount,
      gstType: this.invoiceForm.controls.gstType.getRawValue(),
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: totals.igstAmount,
      totalBeforeRounding: totals.taxableAmount + totals.taxAmount,
      roundOff: totals.roundOff,
      totalAmount: totals.grandTotal,
    });
  }

  calculateSalesTotals(): SalesTotals {
    this.lineItemsValue();
    this.selectedGstType();
    this.amountPaidValue();

    const rawValue = this.invoiceForm.getRawValue();
    const gstType = rawValue.gstType;
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    for (const item of rawValue.lineItems) {
      const qty = Number(item.quantity ?? 0);
      const rate = Number(item.unitRate ?? 0);
      const gstRate = Number(item.gstRate ?? 0);
      const discountPct = Number(item.discountPct ?? 0);
      const base = qty * rate;
      const discount = base * (discountPct / 100);
      const taxable = Math.max(base - discount, 0);

      subtotal += base;
      discountAmount += discount;
      taxAmount += taxable * (gstRate / 100);
    }

    subtotal = this.roundMoney(subtotal);
    discountAmount = this.roundMoney(discountAmount);
    const taxableAmount = this.roundMoney(Math.max(subtotal - discountAmount, 0));
    taxAmount = this.roundMoney(taxAmount);
    const cgstAmount = gstType === 'CGST_SGST' ? this.roundMoney(taxAmount / 2) : 0;
    const sgstAmount = gstType === 'CGST_SGST' ? this.roundMoney(taxAmount / 2) : 0;
    const igstAmount = gstType === 'IGST' ? taxAmount : 0;
    const totalBeforeRounding = taxableAmount + taxAmount;
    const grandTotal = Math.round(totalBeforeRounding);
    const amountPaid = Math.min(this.roundMoney(Number(rawValue.amountPaid ?? 0)), grandTotal);

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal,
      roundOff: this.roundMoney(grandTotal - totalBeforeRounding),
      amountPaid,
      balanceDue: this.roundMoney(Math.max(grandTotal - amountPaid, 0)),
    };
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

  private handleWarehouseSelection(warehouseId: string): void {
    for (const row of this.lineItemsArray.controls) {
      row.controls.warehouseId.setValue(warehouseId, { emitEvent: false });
    }

    if (!warehouseId) {
      this.warehouseStock.set([]);
      this.refreshLineStock();
      return;
    }

    this.loadWarehouseStock(warehouseId);
  }

  private handlePaymentStatusChange(status: 'draft' | 'pending' | 'paid'): void {
    if (status === 'paid') {
      this.invoiceForm.controls.amountPaid.setValue(this.salesTotals().grandTotal);
    }
  }

  private loadWarehouseStock(warehouseId: string): void {
    this.isStockLoading.set(true);
    this.inventoryService.getWarehouseStock(warehouseId).subscribe({
      next: (response: any) => {
        this.warehouseStock.set(response?.data ?? response ?? []);
        this.isStockLoading.set(false);
        this.refreshLineStock();
      },
      error: () => {
        this.warehouseStock.set([]);
        this.isStockLoading.set(false);
        this.toast.error('Could not load warehouse stock');
      },
    });
  }

  private refreshLineStock(): void {
    for (const row of this.lineItemsArray.controls) {
      const itemId = row.controls.itemId.getRawValue();
      if (!itemId) {
        row.controls.availableStock.setValue(null, { emitEvent: false });
        continue;
      }

      row.controls.availableStock.setValue(
        this.getAvailableStock(itemId, row.controls.batchNo.getRawValue()),
        { emitEvent: false },
      );
    }
  }

  private getAvailableStock(itemId: string, batchNo?: string | null): number | null {
    const stockRows = this.warehouseStock().filter((entry: any) => {
      const matchesItem = entry.itemId === itemId || entry.item_id === itemId;
      const entryBatch = entry.batchNo ?? entry.batch_no ?? null;
      return matchesItem && (!batchNo || entryBatch === batchNo);
    });

    if (stockRows.length === 0) return null;

    return stockRows.reduce((sum, entry: any) => {
      const available = entry.qtyAvailable ?? entry.qty_available ?? entry.qtyOnHand ?? entry.qty_on_hand ?? 0;
      return sum + Number(available);
    }, 0);
  }

  private detectGstType(clientStateCode: string): GstType {
    return clientStateCode === this.orgStateCode() ? 'CGST_SGST' : 'IGST';
  }

  private patchInvoice(invoice: Invoice): void {
    this.invoiceNumberControl.setValue(invoice.invoiceNumber);

    this.invoiceForm.patchValue(
      {
        clientId: invoice.clientId,
        amountPaid: invoice.amountPaid ?? 0,
        invoiceDate: isoDateFromValue(invoice.invoiceDate),
        dueDate: isoDateFromValue(invoice.dueDate),
        invoiceType: (invoice as any).invoiceType || 'tax_invoice',
        expiryDate: (invoice as any).expiryDate ? isoDateFromValue((invoice as any).expiryDate) : '',
        gstType: invoice.gstType,
        clientGstin: invoice.clientGstin ?? '',
        customerName: invoice.receiverName ?? '',
        customerAddress: invoice.receiverAddress ?? '',
        notes: invoice.notes ?? '',
      },
      { emitEvent: false }
    );

    this.lineItemsArray.clear();
    (invoice.lineItems ?? []).forEach((item) =>
      this.lineItemsArray.push(
        this.createLineItemGroup({
          serviceTemplateId: item.serviceTemplateId,
          itemId: item.itemId,
          variantId: item.variantId,
          warehouseId: item.warehouseId,
          batchNo: item.batchNo,
          trackInventory: item.trackInventory,
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

    if (!this.validateStockBeforeSave()) {
      return;
    }

    this.isSubmitting.set(true);
    const dto = this.buildDto(action);

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
        if (action === 'issue' && rawValue.paymentStatus !== 'paid') {
          this.invoiceService.issueInvoice(id).subscribe({
            next: () => {
              this.isSubmitting.set(false);
              this.toast.success(wasUpdate ? 'Invoice updated and generated' : 'Invoice generated');
              this.saved.emit();
            },
            error: () => {
              this.isSubmitting.set(false);
              this.toast.error('Invoice saved, but generation failed');
            },
          });
          return;
        }

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

  private buildDto(action: 'draft' | 'issue' | 'preview'): CreateInvoiceDto {
    const rawValue = this.invoiceForm.getRawValue();
    const isQuotation = rawValue.invoiceType === 'quotation';
    const totals = this.salesTotals();
    const status =
      rawValue.paymentStatus === 'paid'
        ? 'paid'
        : action === 'issue'
          ? 'issued'
          : 'draft';

    return {
      clientId: rawValue.clientId,
      invoiceDate: rawValue.invoiceDate,
      dueDate: rawValue.dueDate,
      expiryDate: isQuotation && rawValue.expiryDate ? rawValue.expiryDate : undefined,
      invoiceType: rawValue.invoiceType,
      status,
      amountPaid: totals.amountPaid,
      discountAmount: totals.discountAmount,
      notes: this.buildCustomerNotes(rawValue),
      internalNotes: this.buildInternalNotes(rawValue),
      customerName: rawValue.customerName || undefined,
      customerAddress: rawValue.customerAddress || undefined,
      clientGstin: rawValue.clientGstin || undefined,
      gstType: rawValue.gstType,
      lineItems: rawValue.lineItems.map((item) => ({
        serviceTemplateId: item.serviceTemplateId ?? undefined,
        itemId: item.itemId || undefined,
        variantId: item.variantId || undefined,
        warehouseId: item.warehouseId || rawValue.warehouseId || undefined,
        batchNo: item.batchNo || item.serialNo || undefined,
        trackInventory: item.trackInventory === true,
        gstRate: item.gstRate ?? 18,
        discountPct: item.discountPct ?? 0,
        description: item.description.trim(),
        sacCode: item.sacCode.trim(),
        quantity: item.quantity ?? 0,
        unitRate: item.unitRate ?? 0,
      })),
    };
  }

  private buildCustomerNotes(rawValue: any): string | undefined {
    const parts = [
      rawValue.notes?.trim(),
      rawValue.shippingAddress?.trim() ? `Shipping Address:\n${rawValue.shippingAddress.trim()}` : '',
      rawValue.terms?.trim() ? `Terms & Conditions:\n${rawValue.terms.trim()}` : '',
    ].filter(Boolean);

    return parts.length ? parts.join('\n\n') : undefined;
  }

  private buildInternalNotes(rawValue: any): string | undefined {
    const warehouse = this.warehouses().find((entry) => entry.id === rawValue.warehouseId);
    const parts = [
      rawValue.internalNotes?.trim(),
      rawValue.customerMobile ? `Customer mobile: ${rawValue.customerMobile}` : '',
      rawValue.customerEmail ? `Customer email: ${rawValue.customerEmail}` : '',
      warehouse ? `Warehouse: ${warehouse.name} (${warehouse.code})` : '',
      rawValue.salesPerson ? `Sales person: ${rawValue.salesPerson}` : '',
      rawValue.paymentMethod ? `Payment method: ${rawValue.paymentMethod}` : '',
      rawValue.transactionId ? `Transaction ID: ${rawValue.transactionId}` : '',
    ].filter(Boolean);

    return parts.length ? parts.join('\n') : undefined;
  }

  private validateStockBeforeSave(): boolean {
    for (const row of this.lineItemsArray.controls) {
      const value = row.getRawValue();
      if (!value.trackInventory) continue;
      if (!value.itemId || !value.warehouseId) continue;
      if (value.availableStock == null) continue;
      if ((value.quantity ?? 0) > value.availableStock) {
        this.toast.error(`${value.description || 'Item'} has only ${value.availableStock} available in stock`);
        return false;
      }
    }

    return true;
  }

  private addDays(date: Date, days: number): Date {
    const updated = new Date(date);
    updated.setDate(updated.getDate() + days);
    return updated;
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  private loadEmbeddedClient(clientId: string): void {
    this.clientService.getClient(clientId).subscribe({
      next: (response: any) => {
        const client = response?.data ?? response;
        if (!client) return;

        this.embeddedClient.set({
          id: client.id,
          code: client.code,
          name: client.name ?? client.businessName ?? client.user?.name,
          gstin: client.gstin,
          mobile: client.mobile ?? client.user?.mobile,
          stateCode: client.stateCode || '24',
          address: client.address,
          city: client.city,
          pincode: client.pincode,
          user: client.user,
        });

        if (!this.isEditMode()) {
          this.invoiceForm.controls.gstType.setValue('CGST_SGST');
        }
      },
      error: () => undefined,
    });
  }
}
