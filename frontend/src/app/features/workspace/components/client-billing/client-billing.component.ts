import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowLeftSolid,
  heroArrowPathSolid,
  heroBanknotesSolid,
  heroCheckCircleSolid,
  heroClockSolid,
  heroCurrencyRupeeSolid,
  heroDocumentTextSolid,
  heroExclamationTriangleSolid,
  heroFunnelSolid,
  heroMagnifyingGlassSolid,
  heroPlusSolid,
  heroXMarkSolid,
} from '@ng-icons/heroicons/solid';
import { InvoiceFormComponent } from '../../../billing/components/invoice-form/invoice-form.component';
import { PaymentLinkComponent } from '../../../billing/components/payment-link/payment-link.component';
import { TemplateSelectorComponent } from '../../../billing/components/template-selector/template-selector.component';
import { Invoice, InvoiceStatus } from '../../../billing/models/invoice.model';
import { InvoiceService } from '../../../billing/services/invoice.service';

type BillingTab = 'createInvoice' | 'invoices' | 'templates';

@Component({
  selector: 'app-client-billing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgIconComponent,
    PaymentLinkComponent,
    InvoiceFormComponent,
    TemplateSelectorComponent,
  ],
  providers: [
    provideIcons({
      heroArrowLeftSolid,
      heroArrowPathSolid,
      heroBanknotesSolid,
      heroCheckCircleSolid,
      heroClockSolid,
      heroCurrencyRupeeSolid,
      heroDocumentTextSolid,
      heroExclamationTriangleSolid,
      heroFunnelSolid,
      heroMagnifyingGlassSolid,
      heroPlusSolid,
      heroXMarkSolid,
    }),
  ],
  template: `
    <div class="w-full min-w-0 max-w-none animate-in fade-in duration-500">
      @if (mode() === 'list') {
        <div class="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm w-fit">
          @for (tab of tabs; track tab.key) {
            <button
              type="button"
              (click)="setTab(tab.key)"
              class="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all"
              [ngClass]="billingTab() === tab.key
                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'"
            >
              <ng-icon [name]="tab.icon" size="16"></ng-icon>
              {{ tab.label }}
            </button>
          }
        </div>

        @if (billingTab() === 'createInvoice') {
          <section class="space-y-5">
            <div class="rounded-3xl border border-primary-200 bg-gradient-to-br from-white via-primary-50/40 to-white p-5 shadow-sm">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div class="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary-700">
                    <ng-icon name="heroDocumentTextSolid" size="14"></ng-icon>
                    Customer invoice module
                  </div>
                  <h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950">Create customer invoice</h2>
                  <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Create tax invoices, proforma invoices, quotations, credit notes, and debit notes for this client business's customers.
                  </p>
                </div>

                <button
                  type="button"
                  (click)="setTab('invoices')"
                  class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <ng-icon name="heroClockSolid" size="17"></ng-icon>
                  View invoices
                </button>
              </div>
            </div>

            <div class="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-sm">
              <app-invoice-form
                [isEmbedded]="true"
                [embeddedClientId]="clientId"
                (saved)="onSaved()"
                (canceled)="setTab('invoices')"
              ></app-invoice-form>
            </div>
          </section>
        } @else if (billingTab() === 'invoices') {
          <section class="space-y-6">
            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div class="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary-600">
                    <ng-icon name="heroDocumentTextSolid" size="14"></ng-icon>
                    Customer billing
                  </div>
                  <h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950">Customer invoices and receivables</h2>
                  <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Track invoices raised by this client business for its customers, including outstanding balances and payment links.
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    (click)="fetchInvoices()"
                    class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    [disabled]="isLoading()"
                  >
                    <ng-icon name="heroArrowPathSolid" size="17" [class]="isLoading() ? 'animate-spin' : ''"></ng-icon>
                    Refresh
                  </button>
                  <button
                    type="button"
                    (click)="setTab('createInvoice')"
                    class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-primary-700"
                  >
                    <ng-icon name="heroPlusSolid" size="18"></ng-icon>
                    New invoice
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Invoices</p>
                  <span class="rounded-xl bg-slate-100 p-2 text-slate-500">
                    <ng-icon name="heroDocumentTextSolid" size="20"></ng-icon>
                  </span>
                </div>
                <p class="mt-4 text-3xl font-black text-slate-950">{{ totalInvoices() }}</p>
                <p class="mt-1 text-xs font-semibold text-slate-500">{{ filteredInvoices().length }} visible after filters</p>
              </article>

              <article class="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Total billed</p>
                  <span class="rounded-xl bg-white p-2 text-emerald-600 shadow-sm">
                    <ng-icon name="heroCurrencyRupeeSolid" size="20"></ng-icon>
                  </span>
                </div>
                <p class="mt-4 text-3xl font-black text-emerald-700">{{ totalBilled() | currency:'INR':'symbol-narrow':'1.0-0' }}</p>
                <p class="mt-1 text-xs font-semibold text-emerald-700/70">Excludes drafts and cancelled invoices</p>
              </article>

              <article class="rounded-2xl border border-rose-100 bg-rose-50/60 p-5 shadow-sm">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-black uppercase tracking-[0.18em] text-rose-600">Unpaid</p>
                  <span class="rounded-xl bg-white p-2 text-rose-600 shadow-sm">
                    <ng-icon name="heroBanknotesSolid" size="20"></ng-icon>
                  </span>
                </div>
                <p class="mt-4 text-3xl font-black text-rose-700">{{ totalUnpaid() | currency:'INR':'symbol-narrow':'1.0-0' }}</p>
                <p class="mt-1 text-xs font-semibold text-rose-700/70">{{ overdueCount() }} overdue document(s)</p>
              </article>

              <article class="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Drafts</p>
                  <span class="rounded-xl bg-white p-2 text-amber-600 shadow-sm">
                    <ng-icon name="heroClockSolid" size="20"></ng-icon>
                  </span>
                </div>
                <p class="mt-4 text-3xl font-black text-amber-700">{{ statusCounts().draft }}</p>
                <p class="mt-1 text-xs font-semibold text-amber-700/70">{{ statusCounts().issued }} issued and awaiting action</p>
              </article>
            </div>

            <div class="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div class="border-b border-slate-200 p-4">
                <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 class="text-base font-black text-slate-900">Customer invoices</h3>
                    <p class="mt-1 text-sm text-slate-500">Search, filter, open invoices, or generate payment links.</p>
                  </div>

                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label class="relative block sm:w-72">
                      <ng-icon name="heroMagnifyingGlassSolid" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></ng-icon>
                      <input
                        type="search"
                        [ngModel]="searchTerm()"
                        (ngModelChange)="searchTerm.set($event)"
                        placeholder="Search invoice number, customer, type, status..."
                        class="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100"
                      />
                    </label>

                    <label class="relative block sm:w-48">
                      <ng-icon name="heroFunnelSolid" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></ng-icon>
                      <select
                        [ngModel]="statusFilter()"
                        (ngModelChange)="statusFilter.set($event)"
                        class="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100"
                      >
                        @for (option of statusOptions; track option.value) {
                          <option [value]="option.value">{{ option.label }}</option>
                        }
                      </select>
                    </label>

                    @if (hasActiveFilters()) {
                      <button
                        type="button"
                        (click)="clearFilters()"
                        class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                      >
                        <ng-icon name="heroXMarkSolid" size="16"></ng-icon>
                        Clear
                      </button>
                    }
                  </div>
                </div>
              </div>

              @if (errorMessage()) {
                <div class="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                      <span class="rounded-xl bg-white p-2 text-rose-600 shadow-sm">
                        <ng-icon name="heroExclamationTriangleSolid" size="20"></ng-icon>
                      </span>
                      <div>
                        <p class="font-black text-rose-800">Could not load billing documents</p>
                        <p class="mt-1 text-sm font-semibold text-rose-700/80">{{ errorMessage() }}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="fetchInvoices()"
                      class="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-700"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              }

              @if (isLoading()) {
                <div class="space-y-3 p-4">
                  @for (row of skeletonRows; track row) {
                    <div class="h-16 animate-pulse rounded-2xl bg-slate-100"></div>
                  }
                </div>
              } @else if (!errorMessage() && filteredInvoices().length === 0) {
                <div class="p-12 text-center">
                  <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <ng-icon name="heroDocumentTextSolid" size="34"></ng-icon>
                  </div>
                  <h3 class="mt-4 text-lg font-black text-slate-800">{{ hasActiveFilters() ? 'No matching invoices' : 'No invoices yet' }}</h3>
                  <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    @if (hasActiveFilters()) {
                      Adjust your search or status filter to see more billing documents.
                    } @else {
                      Create the first customer invoice or quotation for this client business and it will appear here.
                    }
                  </p>
                  <div class="mt-6 flex justify-center gap-3">
                    @if (hasActiveFilters()) {
                      <button type="button" (click)="clearFilters()" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                        Clear filters
                      </button>
                    }
                    <button type="button" (click)="setTab('createInvoice')" class="rounded-xl bg-primary-600 px-4 py-2 text-sm font-black text-white hover:bg-primary-700">
                      Create invoice
                    </button>
                  </div>
                </div>
              } @else if (!errorMessage()) {
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[900px] text-left">
                    <thead class="bg-slate-50 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      <tr>
                        <th class="px-5 py-3">Document</th>
                        <th class="px-5 py-3">Type</th>
                        <th class="px-5 py-3">Invoice date</th>
                        <th class="px-5 py-3">Due date</th>
                        <th class="px-5 py-3 text-right">Amount</th>
                        <th class="px-5 py-3 text-center">Status</th>
                        <th class="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (invoice of filteredInvoices(); track invoice.id) {
                        <tr class="group transition hover:bg-slate-50/80">
                          <td class="px-5 py-4">
                            <button
                              type="button"
                              (click)="viewInvoice(invoice.id)"
                              class="font-black text-primary-700 transition hover:text-primary-800 hover:underline"
                            >
                              {{ invoice.invoiceNumber || 'Draft invoice' }}
                            </button>
                            <p class="mt-1 text-xs font-semibold text-slate-500">Updated {{ invoice.updatedAt | date:'mediumDate' }}</p>
                            <p class="mt-1 text-xs font-semibold text-slate-400">Bill to {{ invoice.receiverName || 'Customer not set' }}</p>
                          </td>
                          <td class="px-5 py-4">
                            <span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
                              {{ typeLabel(invoice.invoiceType) }}
                            </span>
                          </td>
                          <td class="px-5 py-4 text-sm font-semibold text-slate-600">{{ invoice.invoiceDate | date:'mediumDate' }}</td>
                          <td class="px-5 py-4">
                            <div class="text-sm font-semibold text-slate-700">{{ invoice.dueDate | date:'mediumDate' }}</div>
                            <div class="mt-1 text-xs font-bold" [ngClass]="dueTone(invoice)">
                              {{ dueLabel(invoice) }}
                            </div>
                          </td>
                          <td class="px-5 py-4 text-right">
                            <div class="text-sm font-black text-slate-900">{{ amount(invoice.totalAmount) | currency:'INR':'symbol-narrow':'1.0-0' }}</div>
                            @if (amount(invoice.balanceDue) > 0) {
                              <div class="mt-1 text-xs font-bold text-rose-600">{{ amount(invoice.balanceDue) | currency:'INR':'symbol-narrow':'1.0-0' }} due</div>
                            }
                          </td>
                          <td class="px-5 py-4 text-center">
                            <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black capitalize" [ngClass]="statusClass(invoice.status)">
                              <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                              {{ statusLabel(invoice.status) }}
                            </span>
                          </td>
                          <td class="px-5 py-4">
                            <div class="flex items-center justify-end gap-2">
                              @if (canGeneratePaymentLink(invoice)) {
                                <app-payment-link [invoiceId]="invoice.id" class="inline-block"></app-payment-link>
                              }
                              <button
                                type="button"
                                (click)="viewInvoice(invoice.id)"
                                class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                              >
                                <ng-icon name="heroDocumentTextSolid" size="15"></ng-icon>
                                Open
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </section>
        } @else if (billingTab() === 'templates') {
          <section class="space-y-6">
            <div class="rounded-3xl border border-cyan-200 bg-gradient-to-br from-white via-cyan-50/60 to-white p-5 shadow-sm">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div class="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                    <ng-icon name="heroDocumentTextSolid" size="14"></ng-icon>
                    Invoice template module
                  </div>
                  <h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950">Invoice PDF templates</h2>
                  <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                    Pick the default design used when this workspace prints or downloads customer invoices.
                    System templates are shared; setting one as default creates a workspace-safe copy.
                  </p>
                </div>

                <button
                  type="button"
                  (click)="setTab('createInvoice')"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-primary-700"
                >
                  <ng-icon name="heroPlusSolid" size="18"></ng-icon>
                  Create invoice
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Applies To</p>
                <p class="mt-3 text-sm font-bold text-slate-900">Print and Download PDF</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">Both buttons use the selected default template for the generated PDF.</p>
              </article>
              <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Document Types</p>
                <p class="mt-3 text-sm font-bold text-slate-900">Tax invoice, proforma, quotation</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">The same design works across the customer billing documents.</p>
              </article>
              <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Next Step</p>
                <p class="mt-3 text-sm font-bold text-slate-900">Custom editor ready</p>
                <p class="mt-2 text-sm leading-6 text-slate-500">The backend supports custom HTML templates; this module now manages selection/defaults.</p>
              </article>
            </div>

            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <app-template-selector></app-template-selector>
            </div>
          </section>
        }
      } @else {
        <div class="mb-4">
          <button
            type="button"
            (click)="setMode('list')"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ng-icon name="heroArrowLeftSolid" size="16"></ng-icon>
            Back to invoices
          </button>
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <app-invoice-form
            [isEmbedded]="true"
            [embeddedClientId]="clientId"
            [embeddedInvoiceId]="selectedId()"
            (saved)="onSaved()"
            (canceled)="setMode('list')"
          ></app-invoice-form>
        </div>
      }
    </div>
  `,
})
export class ClientBillingComponent implements OnInit, OnChanges {
  @Input() clientId!: string;

  private readonly invoiceService = inject(InvoiceService);

  readonly tabs: Array<{ key: BillingTab; label: string; icon: string }> = [
    { key: 'createInvoice', label: 'Create Invoice', icon: 'heroDocumentTextSolid' },
    { key: 'invoices', label: 'Customer Invoices', icon: 'heroClockSolid' },
    { key: 'templates', label: 'Invoice Templates', icon: 'heroDocumentTextSolid' },
  ];

  readonly statusOptions: Array<{ value: InvoiceStatus | ''; label: string }> = [
    { value: '', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'issued', label: 'Issued' },
    { value: 'partially_paid', label: 'Partially paid' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  readonly skeletonRows = [1, 2, 3, 4];

  readonly mode = signal<'list' | 'create' | 'edit'>('list');
  readonly billingTab = signal<BillingTab>('createInvoice');
  readonly selectedId = signal<string | null>(null);
  readonly invoices = signal<Invoice[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<InvoiceStatus | ''>('');
  readonly totalRecords = signal(0);

  readonly filteredInvoices = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.invoices().filter((invoice) => {
      const matchesStatus = !status || invoice.status === status;
      const searchable = [
        invoice.invoiceNumber,
        invoice.receiverName,
        invoice.receiverAddress,
        invoice.invoiceType,
        invoice.status,
        invoice.invoiceDate,
        invoice.dueDate,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!term || searchable.includes(term));
    });
  });

  readonly totalInvoices = computed(() => this.totalRecords() || this.invoices().length);

  readonly totalBilled = computed(() =>
    this.invoices()
      .filter((invoice) => invoice.status !== 'draft' && invoice.status !== 'cancelled')
      .reduce((sum, invoice) => sum + this.amount(invoice.totalAmount), 0)
  );

  readonly totalUnpaid = computed(() =>
    this.invoices()
      .filter((invoice) => invoice.status === 'issued' || invoice.status === 'partially_paid' || invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + (this.amount(invoice.balanceDue) || Math.max(this.amount(invoice.totalAmount) - this.amount(invoice.amountPaid), 0)), 0)
  );

  readonly overdueCount = computed(() =>
    this.invoices().filter((invoice) => invoice.status === 'overdue' || this.isPastDue(invoice)).length
  );

  readonly statusCounts = computed(() => {
    const counts = {
      draft: 0,
      issued: 0,
      partially_paid: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    };

    for (const invoice of this.invoices()) {
      counts[invoice.status] += 1;
    }

    return counts;
  });

  readonly hasActiveFilters = computed(() => Boolean(this.searchTerm().trim() || this.statusFilter()));

  ngOnInit(): void {
    this.fetchInvoices();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'] && !changes['clientId'].firstChange) {
      this.setMode('list');
      this.setTab('createInvoice');
      this.clearFilters();
      this.fetchInvoices();
    }
  }

  fetchInvoices(): void {
    if (!this.clientId) {
      this.invoices.set([]);
      this.totalRecords.set(0);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.invoiceService
      .getInvoices({
        clientId: this.clientId,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      .subscribe({
        next: (res) => {
          const data = res.data ?? [];
          this.invoices.set(data);
          this.totalRecords.set(res.meta?.total ?? data.length);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.invoices.set([]);
          this.totalRecords.set(0);
          this.errorMessage.set(error?.error?.message || 'The billing API returned an error. Please retry after the backend is running.');
          this.isLoading.set(false);
        },
      });
  }

  setTab(tab: BillingTab): void {
    this.billingTab.set(tab);
  }

  setMode(mode: 'list' | 'create' | 'edit'): void {
    if (mode !== 'edit') {
      this.selectedId.set(null);
    }
    this.mode.set(mode);
  }

  viewInvoice(id: string): void {
    this.selectedId.set(id);
    this.mode.set('edit');
  }

  onSaved(): void {
    this.setMode('list');
    this.setTab('invoices');
    this.fetchInvoices();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('');
  }

  amount(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  typeLabel(type?: Invoice['invoiceType']): string {
    if (!type) return 'Invoice';
    return type.replace(/_/g, ' ');
  }

  statusLabel(status: InvoiceStatus): string {
    return status.replace(/_/g, ' ');
  }

  statusClass(status: InvoiceStatus): string {
    const classes: Record<InvoiceStatus, string> = {
      draft: 'bg-amber-100 text-amber-700',
      issued: 'bg-blue-100 text-blue-700',
      partially_paid: 'bg-cyan-100 text-cyan-700',
      paid: 'bg-emerald-100 text-emerald-700',
      overdue: 'bg-rose-100 text-rose-700',
      cancelled: 'bg-slate-100 text-slate-500',
    };

    return classes[status];
  }

  dueLabel(invoice: Invoice): string {
    if (invoice.status === 'paid') return 'Paid';
    if (invoice.status === 'cancelled') return 'Cancelled';
    if (!invoice.dueDate) return 'No due date';

    const today = this.startOfDay(new Date());
    const dueDate = this.startOfDay(new Date(invoice.dueDate));
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) return `${Math.abs(diffDays)} day(s) overdue`;
    if (diffDays === 0) return 'Due today';
    return `Due in ${diffDays} day(s)`;
  }

  dueTone(invoice: Invoice): string {
    if (invoice.status === 'paid') return 'text-emerald-600';
    if (invoice.status === 'cancelled') return 'text-slate-400';
    if (this.isPastDue(invoice)) return 'text-rose-600';
    return 'text-slate-400';
  }

  canGeneratePaymentLink(invoice: Invoice): boolean {
    return ['issued', 'partially_paid', 'overdue'].includes(invoice.status) && this.amount(invoice.balanceDue || invoice.totalAmount) > 0;
  }

  private isPastDue(invoice: Invoice): boolean {
    if (!invoice.dueDate || invoice.status === 'paid' || invoice.status === 'cancelled') return false;
    return this.startOfDay(new Date(invoice.dueDate)).getTime() < this.startOfDay(new Date()).getTime() && this.amount(invoice.balanceDue) > 0;
  }

  private startOfDay(value: Date): Date {
    value.setHours(0, 0, 0, 0);
    return value;
  }
}
