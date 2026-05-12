import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Client, ClientService } from '@core/services/client.service';
import { BillingMetrics } from '../../models/billing-metrics.model';
import { Invoice, InvoicePartyRole, InvoiceStatus, InvoiceType } from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';

Chart.register(...registerables);

type BillingTab = 'overview' | 'invoices' | 'clients' | 'create' | 'tds' | 'reports';
type InvoiceFilter = 'all' | InvoiceStatus;
type Tone = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';

interface BillingTabItem {
  id: BillingTab;
  label: string;
  blurb: string;
}

interface StatusChip {
  id: InvoiceFilter;
  label: string;
  count: number;
}

interface TrendPoint {
  label: string;
  billed: number;
  collected: number;
}

interface AgingRow {
  clientName: string;
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90Plus: number;
  total: number;
}

interface AgingSummaryItem {
  label: string;
  amount: number;
  share: number;
  tone: Tone;
}

interface ClientSummary {
  id: string;
  name: string;
  gstin: string;
  stateLabel: string;
  invoiceCount: number;
  totalBilled: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
  lastInvoiceDate?: string;
}

interface RecurringAlert {
  id: string;
  name: string;
  clientName: string;
  nextRunDate: string;
  daysUntil: number;
}

interface TdsWatchItem {
  id: string;
  invoiceNumber: string;
  clientName: string;
  taxableAmount: number;
  estimatedTds: number;
  netReceivable: number;
  dueAge: number;
  quarter: string;
  tone: Tone;
  statusLabel: string;
}

interface ServiceMixItem {
  label: string;
  amount: number;
  share: number;
  tone: Tone;
}

const EMPTY_METRICS: BillingMetrics = {
  totalInvoices: 0,
  draftCount: 0,
  draftValue: 0,
  issuedCount: 0,
  partiallyPaidCount: 0,
  overdueCount: 0,
  paidCount: 0,
  totalOutstanding: 0,
  totalOverdue: 0,
  collectedThisMonth: 0,
  billedThisMonth: 0,
};

const BILLING_TABS: BillingTabItem[] = [
  { id: 'overview', label: 'Overview', blurb: 'Firm snapshot' },
  { id: 'invoices', label: 'Invoices', blurb: 'Billing register' },
  { id: 'clients', label: 'Clients', blurb: 'Billing accounts' },
  { id: 'create', label: 'Create', blurb: 'Quick actions' },
  { id: 'tds', label: 'TDS', blurb: 'Section 194J watch' },
  { id: 'reports', label: 'Reports', blurb: 'GST and aging' },
];

@Component({
  selector: 'app-billing-dashboard',
  standalone: true,
  imports: [CommonModule, InrCurrencyPipe],
  templateUrl: './billing-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      @keyframes billing-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .billing-spinner {
        animation: billing-spin 0.9s linear infinite;
      }

      .billing-panel {
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      }

      .billing-tab-active {
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
      }

      .billing-tab-strip {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      .billing-tab-strip::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }

      .billing-tab-button {
        min-height: 40px;
      }
    `,
  ],
})
export class BillingDashboardComponent implements OnDestroy {
  private readonly invoiceService = inject(InvoiceService);
  private readonly clientService = inject(ClientService);
  private readonly router = inject(Router);
  private readonly today = new Date();
  private revenueTrendChart: Chart | null = null;
  private pendingChartRender: number | null = null;
  private readonly statusLabels: Record<InvoiceStatus, string> = {
    draft: 'Draft',
    issued: 'Issued',
    partially_paid: 'Partial',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
  };

  readonly tabs = BILLING_TABS;
  readonly activeTab = signal<BillingTab>('overview');
  readonly invoiceFilter = signal<InvoiceFilter>('all');

  readonly metricsResource = rxResource({
    loader: () => this.invoiceService.getMetrics({ silenceErrors: true }),
  });

  readonly invoicesResource = rxResource({
    loader: () =>
      this.invoiceService.getInvoices({
        limit: 60,
        page: 1,
        sortBy: 'invoiceDate',
        sortOrder: 'desc',
      }, { silenceErrors: true }),
  });

  readonly clientsResource = rxResource({
    loader: () =>
      this.clientService.getClients(1, 12, undefined, 'updatedAt', 'desc', { silenceErrors: true }),
  });

  readonly recurringTemplatesResource = rxResource({
    loader: () => this.invoiceService.getRecurringTemplates({ isActive: true }, { silenceErrors: true }),
  });

  readonly metrics = computed(() => this.metricsResource.value()?.data ?? EMPTY_METRICS);
  readonly invoices = computed(() =>
    [...(this.invoicesResource.value()?.data ?? [])].sort(
      (left, right) => this.getTime(right.invoiceDate) - this.getTime(left.invoiceDate)
    )
  );
  readonly clients = computed(() => this.clientsResource.value()?.data ?? []);
  readonly recurringTemplates = computed(() => this.recurringTemplatesResource.value()?.data ?? []);

  readonly isLoading = computed(
    () =>
      this.metricsResource.isLoading() ||
      this.invoicesResource.isLoading() ||
      this.clientsResource.isLoading()
  );
  readonly hasLoadError = computed(
    () =>
      Boolean(
        this.metricsResource.error() ||
        this.invoicesResource.error() ||
        this.clientsResource.error() ||
        this.recurringTemplatesResource.error()
      )
  );

  readonly hasInvoices = computed(() => this.invoices().length > 0 || this.metrics().totalInvoices > 0);
  readonly hasClients = computed(() => this.clients().length > 0);
  readonly fyLabel = computed(() => this.getFinancialYearLabel(this.today));
  readonly headerPeriod = computed(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        month: 'long',
        year: 'numeric',
      }).format(this.today)
  );

  readonly invoiceStatusChips = computed<StatusChip[]>(() => [
    { id: 'all', label: 'All invoices', count: this.invoices().length },
    { id: 'draft', label: 'Draft', count: this.metrics().draftCount },
    { id: 'issued', label: 'Issued', count: this.metrics().issuedCount },
    { id: 'partially_paid', label: 'Partial', count: this.metrics().partiallyPaidCount },
    { id: 'overdue', label: 'Overdue', count: this.metrics().overdueCount },
    { id: 'paid', label: 'Paid', count: this.metrics().paidCount },
  ]);

  readonly filteredInvoices = computed(() => {
    const filter = this.invoiceFilter();
    if (filter === 'all') {
      return this.invoices();
    }

    return this.invoices().filter((invoice) => invoice.status === filter);
  });

  readonly recentInvoices = computed(() => this.invoices().slice(0, 6));
  readonly pendingCollectionCount = computed(
    () => this.metrics().issuedCount + this.metrics().partiallyPaidCount + this.metrics().overdueCount
  );
  readonly activeRecurringCount = computed(
    () => this.recurringTemplates().filter((template) => template.isActive).length
  );

  readonly monthlyTrend = computed<TrendPoint[]>(() => {
    const months: TrendPoint[] = [];
    const monthKeys: string[] = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const monthDate = new Date(this.today.getFullYear(), this.today.getMonth() - offset, 1);
      monthKeys.push(this.getMonthKey(monthDate));
      months.push({
        label: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(monthDate),
        billed: 0,
        collected: 0,
      });
    }

    this.invoices().forEach((invoice) => {
      const invoiceKey = this.getMonthKey(invoice.invoiceDate);
      const invoiceIndex = monthKeys.indexOf(invoiceKey);
      if (invoiceIndex >= 0) {
        months[invoiceIndex].billed += invoice.totalAmount ?? 0;
      }

      const collectionSource = invoice.paidAt ?? (invoice.amountPaid > 0 ? invoice.updatedAt : undefined);
      const collectionKey = this.getMonthKey(collectionSource);
      const collectionIndex = monthKeys.indexOf(collectionKey);
      if (collectionIndex >= 0) {
        months[collectionIndex].collected += invoice.amountPaid ?? 0;
      }
    });

    return months;
  });

  readonly trendMax = computed(() => {
    const values = this.monthlyTrend().flatMap((point) => [point.billed, point.collected]);
    return Math.max(1, ...values);
  });

  readonly billedGrowthLabel = computed(() => {
    const trend = this.monthlyTrend();
    if (trend.length < 2) {
      return 'Start tracking this period';
    }

    const current = trend[trend.length - 1].billed;
    const previous = trend[trend.length - 2].billed;

    if (previous === 0) {
      return current > 0 ? 'Fresh billing activity this month' : 'No billing booked this month';
    }

    const change = ((current - previous) / previous) * 100;
    const direction = change >= 0 ? 'Up' : 'Down';
    return `${direction} ${Math.abs(change).toFixed(1)}% vs last month`;
  });

  readonly agingRows = computed<AgingRow[]>(() => {
    const rows = new Map<string, AgingRow>();

    this.invoices().forEach((invoice) => {
      if (invoice.balanceDue <= 0 || invoice.status === 'cancelled') {
        return;
      }

      const clientName = this.getInvoiceClientName(invoice);
      const row =
        rows.get(clientName) ??
        {
          clientName,
          bucket0to30: 0,
          bucket31to60: 0,
          bucket61to90: 0,
          bucket90Plus: 0,
          total: 0,
        };

      const age = this.getDaysFromDate(invoice.dueDate);
      if (age <= 30) {
        row.bucket0to30 += invoice.balanceDue;
      } else if (age <= 60) {
        row.bucket31to60 += invoice.balanceDue;
      } else if (age <= 90) {
        row.bucket61to90 += invoice.balanceDue;
      } else {
        row.bucket90Plus += invoice.balanceDue;
      }

      row.total += invoice.balanceDue;
      rows.set(clientName, row);
    });

    return Array.from(rows.values()).sort((left, right) => right.total - left.total);
  });

  readonly agingSummary = computed<AgingSummaryItem[]>(() => {
    const totals = this.agingRows().reduce(
      (summary, row) => {
        summary.bucket0to30 += row.bucket0to30;
        summary.bucket31to60 += row.bucket31to60;
        summary.bucket61to90 += row.bucket61to90;
        summary.bucket90Plus += row.bucket90Plus;
        summary.total += row.total;
        return summary;
      },
      {
        bucket0to30: 0,
        bucket31to60: 0,
        bucket61to90: 0,
        bucket90Plus: 0,
        total: 0,
      }
    );

    return [
      {
        label: '0-30 days',
        amount: totals.bucket0to30,
        share: totals.total ? (totals.bucket0to30 / totals.total) * 100 : 0,
        tone: 'emerald',
      },
      {
        label: '31-60 days',
        amount: totals.bucket31to60,
        share: totals.total ? (totals.bucket31to60 / totals.total) * 100 : 0,
        tone: 'amber',
      },
      {
        label: '61-90 days',
        amount: totals.bucket61to90,
        share: totals.total ? (totals.bucket61to90 / totals.total) * 100 : 0,
        tone: 'violet',
      },
      {
        label: '90+ days',
        amount: totals.bucket90Plus,
        share: totals.total ? (totals.bucket90Plus / totals.total) * 100 : 0,
        tone: 'rose',
      },
    ];
  });

  readonly clientSummaries = computed<ClientSummary[]>(() => {
    const clientMap = new Map<string, ClientSummary>();

    this.clients().forEach((client) => {
      clientMap.set(client.id, {
        id: client.id,
        name: this.getClientDisplayName(client),
        gstin: client.gstin ?? 'GSTIN not added',
        stateLabel: this.getStateLabel(client.stateCode),
        invoiceCount: 0,
        totalBilled: 0,
        collected: 0,
        outstanding: 0,
        collectionRate: 0,
      });
    });

    this.invoices().forEach((invoice) => {
      const clientId = invoice.clientId || invoice.client?.id || invoice.id;
      const existing = clientMap.get(clientId) ?? {
        id: clientId,
        name: this.getInvoiceClientName(invoice),
        gstin: invoice.clientGstin || invoice.client?.gstin || 'GSTIN not added',
        stateLabel: this.getStateLabel(invoice.client?.stateCode),
        invoiceCount: 0,
        totalBilled: 0,
        collected: 0,
        outstanding: 0,
        collectionRate: 0,
      };

      existing.invoiceCount += 1;
      existing.totalBilled += invoice.totalAmount ?? 0;
      existing.collected += invoice.amountPaid ?? 0;
      existing.outstanding += invoice.balanceDue ?? 0;

      if (
        !existing.lastInvoiceDate ||
        this.getTime(invoice.invoiceDate) > this.getTime(existing.lastInvoiceDate)
      ) {
        existing.lastInvoiceDate = invoice.invoiceDate;
      }

      clientMap.set(clientId, existing);
    });

    return Array.from(clientMap.values())
      .map((client) => ({
        ...client,
        collectionRate: client.totalBilled
          ? Math.min(100, Math.round((client.collected / client.totalBilled) * 100))
          : 0,
      }))
      .sort((left, right) => right.outstanding - left.outstanding || right.totalBilled - left.totalBilled)
      .slice(0, 8);
  });

  readonly recurringAlerts = computed<RecurringAlert[]>(() =>
    this.recurringTemplates()
      .map((template) => ({
        id: template.id,
        name: template.name,
        clientName: template.client?.name ?? 'Client unavailable',
        nextRunDate: template.nextRunDate,
        daysUntil: this.getDayDelta(template.nextRunDate),
      }))
      .sort((left, right) => left.daysUntil - right.daysUntil)
      .slice(0, 4)
  );

  readonly tdsWatchlist = computed<TdsWatchItem[]>(() =>
    this.invoices()
      .filter((invoice) => invoice.status !== 'cancelled' && invoice.subtotal >= 30000)
      .map((invoice) => {
        const dueAge = this.getDaysFromDate(invoice.dueDate);
        const estimatedTds = Math.round(invoice.subtotal * 0.1);
        let tone: Tone = 'blue';
        let statusLabel = 'Monitor';

        if (invoice.status === 'paid') {
          tone = 'emerald';
          statusLabel = 'Closed';
        } else if (dueAge > 90) {
          tone = 'rose';
          statusLabel = 'Escalate';
        } else if (dueAge > 30) {
          tone = 'amber';
          statusLabel = 'Follow up';
        }

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: this.getInvoiceClientName(invoice),
          taxableAmount: invoice.subtotal,
          estimatedTds,
          netReceivable: Math.max(invoice.totalAmount - estimatedTds, 0),
          dueAge,
          quarter: this.getFinancialQuarter(invoice.invoiceDate),
          tone,
          statusLabel,
        };
      })
      .sort((left, right) => right.estimatedTds - left.estimatedTds)
      .slice(0, 10)
  );

  readonly estimatedTdsTotal = computed(() =>
    this.tdsWatchlist().reduce((sum, item) => sum + item.estimatedTds, 0)
  );
  readonly estimatedOpenTds = computed(() =>
    this.tdsWatchlist()
      .filter((item) => item.statusLabel !== 'Closed')
      .reduce((sum, item) => sum + item.estimatedTds, 0)
  );
  readonly highlightedClient = computed(() => this.clientSummaries()[0] ?? null);
  readonly highlightedInvoice = computed(() => this.filteredInvoices()[0] ?? this.invoices()[0] ?? null);
  readonly highlightedTdsItem = computed(() => this.tdsWatchlist()[0] ?? null);
  readonly primaryServiceMix = computed(() => this.serviceMix()[0] ?? null);
  readonly workspaceHeading = computed(() => {
    switch (this.activeTab()) {
      case 'invoices':
        return 'Filter the invoice register fast';
      case 'clients':
        return 'Track billing health by client';
      case 'create':
        return 'Launch the right billing workflow';
      case 'tds':
        return 'Monitor TDS deductions and follow-up';
      case 'reports':
        return 'Read GST and ageing signals clearly';
      default:
        return 'Review the right billing signal fast';
    }
  });
  readonly workspaceDescription = computed(() => {
    switch (this.activeTab()) {
      case 'invoices':
        return 'Use status filters and the current register to review draft, issued, partial, paid, and overdue professional invoices.';
      case 'clients':
        return 'Compare clients by collection rate, outstanding balance, invoice volume, and latest billing movement.';
      case 'create':
        return 'Start a new invoice, manage recurring retainers, or launch periodic billing batches from the same workspace.';
      case 'tds':
        return 'Keep Section 194J follow-up visible, especially where taxable values and open balances need acknowledgement from the client.';
      case 'reports':
        return 'Review GST liability, service revenue mix, and ageing buckets in a clean accounting-friendly summary view.';
      default:
        return 'Use this workbench to monitor collections, recurring schedules, overdue exposure, and client billing movement across the firm.';
    }
  });
  readonly workspaceNote = computed(() => {
    switch (this.activeTab()) {
      case 'invoices':
        return 'Open any row to move into the full invoice detail screen.';
      case 'clients':
        return 'This view is firm-to-client billing only, separate from the client’s own customer books.';
      case 'create':
        return 'Choose the right creation path before moving into detailed forms.';
      case 'tds':
        return 'This page currently estimates TDS watch items from live invoice data.';
      case 'reports':
        return 'Use these summaries for partner review, collection meetings, and compliance follow-up.';
      default:
        return 'Keep the overall firm position visible before drilling into invoice or client-level detail.';
    }
  });
  readonly recordsHeading = computed(() => {
    switch (this.activeTab()) {
      case 'invoices':
        return 'Invoice register';
      case 'clients':
        return 'Client billing records';
      case 'create':
        return 'Billing launchpad';
      case 'tds':
        return 'TDS follow-up records';
      case 'reports':
        return 'Firm billing reports';
      default:
        return 'Firm records';
    }
  });
  readonly recordsDescription = computed(() => {
    switch (this.activeTab()) {
      case 'invoices':
        return `${this.filteredInvoices().length} visible invoice(s) from the live register.`;
      case 'clients':
        return `${this.clientSummaries().length} client billing account(s) ranked by exposure and collections.`;
      case 'create':
        return 'Choose the exact billing action your team needs next.';
      case 'tds':
        return `${this.tdsWatchlist().length} invoice(s) currently in the estimated TDS watchlist.`;
      case 'reports':
        return `GST turnover, revenue mix, and debtor ageing from ${this.invoices().length} invoice(s).`;
      default:
        return `${this.recentInvoices().length} recent invoice(s) and current collection signals.`;
    }
  });

  readonly gstSummary = computed(() => {
    const activeInvoices = this.invoices().filter((invoice) => invoice.status !== 'cancelled');
    return {
      taxable: activeInvoices.reduce((sum, invoice) => sum + invoice.subtotal, 0),
      cgst: activeInvoices.reduce((sum, invoice) => sum + invoice.cgstAmount, 0),
      sgst: activeInvoices.reduce((sum, invoice) => sum + invoice.sgstAmount, 0),
      igst: activeInvoices.reduce((sum, invoice) => sum + invoice.igstAmount, 0),
      total: activeInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
    };
  });

  readonly serviceMix = computed<ServiceMixItem[]>(() => {
    const totals = new Map<string, number>();
    const toneOrder: Tone[] = ['blue', 'emerald', 'amber', 'violet', 'rose'];

    this.invoices()
      .filter((invoice) => invoice.status !== 'cancelled')
      .forEach((invoice) => {
        const label = this.getServiceLabel(invoice);
        totals.set(label, (totals.get(label) ?? 0) + invoice.subtotal);
      });

    const grandTotal = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);

    return Array.from(totals.entries())
      .map(([label, amount], index) => ({
        label,
        amount,
        share: grandTotal ? (amount / grandTotal) * 100 : 0,
        tone: toneOrder[index % toneOrder.length],
      }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 5);
  });

  constructor() {
    effect(() => {
      const activeTab = this.activeTab();
      const trendSignature = this.monthlyTrend()
        .map((point) => `${point.label}:${point.billed}:${point.collected}`)
        .join('|');

      if (activeTab !== 'overview') {
        this.destroyRevenueTrendChart();
        return;
      }

      void trendSignature;
      this.scheduleRevenueTrendChartRender();
    });
  }

  ngOnDestroy(): void {
    this.destroyRevenueTrendChart();
    if (this.pendingChartRender !== null) {
      window.clearTimeout(this.pendingChartRender);
      this.pendingChartRender = null;
    }
  }

  setTab(tab: BillingTab): void {
    this.activeTab.set(tab);
  }

  setInvoiceFilter(filter: InvoiceFilter): void {
    this.invoiceFilter.set(filter);
  }

  navigateToList(status?: InvoiceStatus | ''): void {
    void this.router.navigate(['/billing/invoices'], {
      queryParams: status ? { status } : {},
    });
  }

  openInvoice(id: string): void {
    void this.router.navigate(['/billing/invoices', id]);
  }

  newInvoice(invoiceType: InvoiceType = 'tax_invoice', partyRole: InvoicePartyRole = 'customer'): void {
    const queryParams: Record<string, string> = {};
    if (invoiceType !== 'tax_invoice') {
      queryParams['invoiceType'] = invoiceType;
    }
    if (partyRole === 'vendor') {
      queryParams['partyRole'] = partyRole;
    }

    void this.router.navigate(['/billing/invoices/new'], {
      queryParams,
    });
  }

  openRecurring(): void {
    void this.router.navigate(['/billing/recurring']);
  }

  openBulkGenerate(): void {
    void this.router.navigate(['/billing/bulk-generate']);
  }

  openClientDirectory(): void {
    void this.router.navigate(['/clients/client']);
  }

  formatDate(value?: string): string {
    const date = this.parseDate(value);
    if (!date) {
      return '--';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  formatCompactInr(value: number): string {
    if (value >= 10000000) {
      return `Rs ${this.formatFixed(value / 10000000)}Cr`;
    }

    if (value >= 100000) {
      return `Rs ${this.formatFixed(value / 100000)}L`;
    }

    return `Rs ${new Intl.NumberFormat('en-IN').format(Math.round(value))}`;
  }

  formatPercent(value: number): string {
    return `${Math.round(value)}%`;
  }

  getTrendHeight(value: number): number {
    return Math.max(10, Math.round((value / this.trendMax()) * 100));
  }

  getStatusLabel(status: InvoiceStatus): string {
    return this.statusLabels[status];
  }

  getStatusClasses(status: InvoiceStatus): string {
    const classes: Record<InvoiceStatus, string> = {
      draft: 'border border-slate-200 bg-slate-100 text-slate-600',
      issued: 'border border-blue-200 bg-blue-50 text-blue-700',
      partially_paid: 'border border-amber-200 bg-amber-50 text-amber-700',
      paid: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
      overdue: 'border border-rose-200 bg-rose-50 text-rose-700',
      cancelled: 'border border-slate-200 bg-slate-100 text-slate-400',
    };

    return classes[status];
  }

  getToneTrackClass(tone: Tone): string {
    const classes: Record<Tone, string> = {
      slate: 'bg-slate-200',
      blue: 'bg-blue-100',
      emerald: 'bg-emerald-100',
      amber: 'bg-amber-100',
      rose: 'bg-rose-100',
      violet: 'bg-violet-100',
    };

    return classes[tone];
  }

  getToneFillClass(tone: Tone): string {
    const classes: Record<Tone, string> = {
      slate: 'bg-slate-500',
      blue: 'bg-blue-500',
      emerald: 'bg-emerald-500',
      amber: 'bg-amber-500',
      rose: 'bg-rose-500',
      violet: 'bg-violet-500',
    };

    return classes[tone];
  }

  getToneBadgeClass(tone: Tone): string {
    const classes: Record<Tone, string> = {
      slate: 'border border-slate-200 bg-slate-50 text-slate-600',
      blue: 'border border-blue-200 bg-blue-50 text-blue-700',
      emerald: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
      amber: 'border border-amber-200 bg-amber-50 text-amber-700',
      rose: 'border border-rose-200 bg-rose-50 text-rose-700',
      violet: 'border border-violet-200 bg-violet-50 text-violet-700',
    };

    return classes[tone];
  }

  getAlertLabel(daysUntil: number): string {
    if (daysUntil < 0) {
      return `${Math.abs(daysUntil)}d overdue`;
    }

    if (daysUntil === 0) {
      return 'Due today';
    }

    return `Runs in ${daysUntil}d`;
  }

  private getClientDisplayName(client: Client): string {
    return client.businessName || client.user?.name || client.code || 'Client';
  }

  private getInvoiceClientName(invoice: Invoice): string {
    return invoice.client?.name || invoice.receiverName || 'Client unavailable';
  }

  private getStateLabel(code?: string): string {
    const states: Record<string, string> = {
      AP: 'Andhra Pradesh',
      DL: 'Delhi',
      GJ: 'Gujarat',
      KA: 'Karnataka',
      MH: 'Maharashtra',
      RJ: 'Rajasthan',
      TN: 'Tamil Nadu',
      TS: 'Telangana',
      UP: 'Uttar Pradesh',
      WB: 'West Bengal',
    };

    if (!code) {
      return 'State not tagged';
    }

    return states[code] ?? code;
  }

  private getTime(value?: string): number {
    const date = this.parseDate(value);
    return date ? date.getTime() : 0;
  }

  private parseDate(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getDaysFromDate(value?: string): number {
    const date = this.parseDate(value);
    if (!date) {
      return 0;
    }

    const difference = this.today.getTime() - date.getTime();
    return Math.max(0, Math.floor(difference / 86400000));
  }

  private getDayDelta(value?: string): number {
    const date = this.parseDate(value);
    if (!date) {
      return 0;
    }

    return Math.ceil((date.getTime() - this.today.getTime()) / 86400000);
  }

  private getMonthKey(value?: string | Date): string {
    const date = value instanceof Date ? value : this.parseDate(value);
    if (!date) {
      return '';
    }

    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  }

  private getFinancialYearLabel(date: Date): string {
    const year = date.getFullYear();
    const start = date.getMonth() >= 3 ? year : year - 1;
    const end = (start + 1).toString().slice(-2);
    return `FY ${start}-${end}`;
  }

  private getFinancialQuarter(value?: string): string {
    const date = this.parseDate(value);
    if (!date) {
      return 'Q1 (Apr-Jun)';
    }

    const month = date.getMonth();
    if (month >= 3 && month <= 5) {
      return 'Q1 (Apr-Jun)';
    }
    if (month >= 6 && month <= 8) {
      return 'Q2 (Jul-Sep)';
    }
    if (month >= 9 && month <= 11) {
      return 'Q3 (Oct-Dec)';
    }

    return 'Q4 (Jan-Mar)';
  }

  private getServiceLabel(invoice: Invoice): string {
    const lineItem = invoice.lineItems?.[0];
    const sacCode = lineItem?.sacCode;
    const description = lineItem?.description?.trim();

    if (sacCode === '998211' || description?.toLowerCase().includes('audit')) {
      return 'Statutory audit';
    }
    if (sacCode === '998231' || description?.toLowerCase().includes('tax')) {
      return 'Tax and advisory';
    }
    if (sacCode === '998313' || description?.toLowerCase().includes('book')) {
      return 'Accounting and bookkeeping';
    }
    if (description) {
      return description.length > 28 ? `${description.slice(0, 28)}...` : description;
    }

    return 'Professional services';
  }

  private formatFixed(value: number): string {
    return value.toFixed(value >= 10 ? 0 : 1);
  }

  private scheduleRevenueTrendChartRender(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.pendingChartRender !== null) {
      window.clearTimeout(this.pendingChartRender);
    }

    this.pendingChartRender = window.setTimeout(() => {
      this.pendingChartRender = null;
      this.renderRevenueTrendChart();
    }, 0);
  }

  private renderRevenueTrendChart(): void {
    const canvas = document.getElementById('billingRevenueTrendChart') as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }

    this.destroyRevenueTrendChart();

    const trend = this.monthlyTrend();
    const labels = trend.map((point) => point.label);

    this.revenueTrendChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Billed',
            data: trend.map((point) => point.billed),
            backgroundColor: 'rgba(59, 130, 246, 0.72)',
            borderColor: 'rgb(37, 99, 235)',
            borderRadius: 10,
            borderSkipped: false,
            borderWidth: 1,
            barPercentage: 0.68,
            categoryPercentage: 0.64,
          },
          {
            label: 'Collected',
            data: trend.map((point) => point.collected),
            backgroundColor: 'rgba(16, 185, 129, 0.72)',
            borderColor: 'rgb(5, 150, 105)',
            borderRadius: 10,
            borderSkipped: false,
            borderWidth: 1,
            barPercentage: 0.68,
            categoryPercentage: 0.64,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 420,
        },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'start',
            labels: {
              usePointStyle: true,
              pointStyle: 'rectRounded',
              boxWidth: 10,
              boxHeight: 10,
              color: '#64748b',
              font: {
                size: 11,
                weight: 'bold',
              },
            },
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            padding: 12,
            displayColors: true,
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${this.formatChartCurrency(Number(context.parsed.y ?? 0))}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            border: {
              display: false,
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.14)',
            },
            ticks: {
              color: '#94a3b8',
              font: {
                size: 10,
                weight: 'bold',
              },
              callback: (value) => this.formatChartAxis(Number(value)),
            },
          },
          x: {
            border: {
              display: false,
            },
            grid: {
              display: false,
            },
            ticks: {
              color: '#475569',
              font: {
                size: 11,
                weight: 'bold',
              },
            },
          },
        },
      },
    });
  }

  private destroyRevenueTrendChart(): void {
    this.revenueTrendChart?.destroy();
    this.revenueTrendChart = null;
  }

  private formatChartCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatChartAxis(value: number): string {
    if (value >= 10000000) {
      return `₹${this.formatFixed(value / 10000000)}Cr`;
    }

    if (value >= 100000) {
      return `₹${this.formatFixed(value / 100000)}L`;
    }

    if (value >= 1000) {
      return `₹${this.formatFixed(value / 1000)}K`;
    }

    return `₹${Math.round(value)}`;
  }
}
