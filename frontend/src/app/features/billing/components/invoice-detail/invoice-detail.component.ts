import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { AuthService, User } from '@core/services/auth.service';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';
import { Payment, PaymentMode } from '../../models/payment.model';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';
import { InvoiceService } from '../../services/invoice.service';

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

interface TimelineEvent {
  title: string;
  timestamp: string;
  description?: string;
}

const DEFAULT_ORGANIZATION: BillingOrganization = {
  name: 'Shah & Associates',
  gstin: '24AABCS9999A1Z3',
  pan: 'AABCS9999A',
  addressLine1: 'A-201, Shyamal Cross Roads',
  addressLine2: 'Satellite, Ahmedabad - 380015',
  stateCode: '24',
};

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InrCurrencyPipe],
  templateUrl: './invoice-detail.component.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }

      .invoice-tab-active {
        box-shadow: 0 18px 40px rgba(37, 99, 235, 0.16);
      }

      .ledger-surface {
        background:
          linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 1)),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 31px,
            rgba(226, 232, 240, 0.72) 31px,
            rgba(226, 232, 240, 0.72) 32px
          );
      }

      @media print {
        .billing-screen-only {
          display: none !important;
        }

        .billing-print-shell {
          padding: 0 !important;
        }

        .billing-preview,
        .billing-print-card {
          box-shadow: none !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly invoiceService = inject(InvoiceService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(HotToastService);

  readonly invoiceId = signal(this.route.snapshot.paramMap.get('id') ?? '');
  readonly selectedTabIndex = signal(this.initialTabIndex());
  readonly isSubmittingPayment = signal(false);
  readonly tabItems = [
    { label: 'Invoice Preview', blurb: 'Voucher print view' },
    { label: 'Payments', blurb: 'Receipt ledger' },
    { label: 'Timeline', blurb: 'Audit trail' },
  ] as const;

  readonly paymentModes: Array<{ value: PaymentMode; label: string }> = [
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'upi', label: 'UPI' },
    { value: 'neft', label: 'NEFT' },
    { value: 'rtgs', label: 'RTGS' },
    { value: 'other', label: 'Other' },
  ];

  readonly paymentForm = this.fb.group({
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    paymentDate: this.fb.nonNullable.control(formatDateInput(new Date()), Validators.required),
    paymentMode: this.fb.nonNullable.control<PaymentMode>('upi', Validators.required),
    referenceNumber: this.fb.nonNullable.control(''),
    notes: this.fb.nonNullable.control(''),
  });

  readonly invoiceResource = rxResource({
    request: this.invoiceId,
    loader: ({ request }) => this.invoiceService.getInvoice(request),
  });

  readonly invoice = computed(() => this.invoiceResource.value()?.data ?? null);
  readonly organization = computed(() => {
    const user = this.authService.currentUser() as BillingUser | null;
    return {
      ...DEFAULT_ORGANIZATION,
      ...user?.organization,
    };
  });
  readonly payments = computed(() => this.invoice()?.payments ?? []);
  readonly timelineEvents = computed(() => this.buildTimeline(this.invoice()));
  readonly totalReceived = computed(() => {
    const invoice = this.invoice();
    if (!invoice) {
      return 0;
    }

    return invoice.amountPaid ?? Math.max(invoice.totalAmount - invoice.balanceDue, 0);
  });
  readonly paymentProgress = computed(() => {
    const invoice = this.invoice();
    if (!invoice?.totalAmount) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round((this.totalReceived() / invoice.totalAmount) * 100)));
  });
  readonly totalTax = computed(() => {
    const invoice = this.invoice();
    return (invoice?.cgstAmount ?? 0) + (invoice?.sgstAmount ?? 0) + (invoice?.igstAmount ?? 0);
  });
  readonly lineItemCount = computed(() => this.invoice()?.lineItems?.length ?? 0);
  readonly dueLabel = computed(() => this.getDueLabel(this.invoice()));
  readonly ageLabel = computed(() => this.getAgeLabel(this.invoice()));
  readonly latestPayment = computed(() =>
    [...this.payments()].sort(
      (left, right) =>
        this.getTimestamp(right.paymentDate || right.createdAt) -
        this.getTimestamp(left.paymentDate || left.createdAt)
    )[0] ?? null
  );
  readonly receiptCount = computed(() => this.payments().length);
  readonly paymentStatusNote = computed(() => {
    const invoice = this.invoice();
    if (!invoice) {
      return 'No billing data loaded.';
    }

    if (invoice.status === 'paid') {
      return 'Voucher settled in full.';
    }
    if (invoice.status === 'partially_paid') {
      return 'Part collection posted, balance still open.';
    }
    if (invoice.status === 'issued' || invoice.status === 'overdue') {
      return 'Collection entry can be posted against this voucher.';
    }

    return 'Issue the voucher before posting collections.';
  });
  readonly isOverpaid = computed(() => {
    const amount = this.paymentForm.controls.amount.value ?? 0;
    const balance = this.invoice()?.balanceDue ?? 0;
    return balance > 0 && amount > balance;
  });

  constructor() {
    effect(() => {
      const invoice = this.invoice();
      if (!invoice) {
        return;
      }

      this.paymentForm.controls.amount.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(invoice.balanceDue),
      ]);
      this.paymentForm.controls.amount.updateValueAndValidity({ emitEvent: false });
    });
  }

  setTab(index: number): void {
    this.selectedTabIndex.set(index);
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
  }

  canIssue(invoice: Invoice | null): boolean {
    return invoice?.status === 'draft';
  }

  canRecordPayment(invoice: Invoice | null): boolean {
    return (
      invoice?.status === 'issued' ||
      invoice?.status === 'partially_paid' ||
      invoice?.status === 'overdue'
    );
  }

  canSend(invoice: Invoice | null): boolean {
    return this.canRecordPayment(invoice);
  }

  canDownloadPdf(invoice: Invoice | null): boolean {
    return Boolean(invoice?.pdfS3Key || invoice?.pdfGeneratedAt);
  }

  canEdit(invoice: Invoice | null): boolean {
    return invoice?.status === 'draft';
  }

  canCancel(invoice: Invoice | null): boolean {
    return Boolean(invoice && invoice.status !== 'paid' && invoice.status !== 'cancelled');
  }

  issueInvoice(): void {
    const invoice = this.invoice();
    if (!invoice) {
      return;
    }

    this.invoiceService.issueInvoice(invoice.id).subscribe({
      next: () => {
        this.toast.success('Invoice issued');
        this.invoiceResource.reload();
      },
      error: () => this.toast.error('Failed to issue invoice'),
    });
  }

  sendWhatsApp(): void {
    const invoice = this.invoice();
    if (!invoice) {
      return;
    }

    this.invoiceService.sendWhatsApp(invoice.id).subscribe({
      next: () => {
        this.toast.success('Sent via WhatsApp');
        this.invoiceResource.reload();
      },
      error: () => this.toast.error('WhatsApp delivery failed'),
    });
  }

  downloadPdf(): void {
    const invoice = this.invoice();
    if (!invoice) {
      return;
    }

    this.invoiceService.getPdfUrl(invoice.id).subscribe({
      next: (response) => window.open(response.data?.url, '_blank', 'noopener'),
      error: () => this.toast.error('Unable to open PDF'),
    });
  }

  editInvoice(): void {
    const invoice = this.invoice();
    if (!invoice) {
      return;
    }

    void this.router.navigate(['/billing/invoices', invoice.id, 'edit']);
  }

  fillRemainingBalance(): void {
    const invoice = this.invoice();
    if (invoice && invoice.balanceDue > 0) {
      this.paymentForm.patchValue({
        amount: invoice.balanceDue,
      });
    }
  }

  cancelInvoice(): void {
    const invoice = this.invoice();
    if (!invoice) {
      return;
    }

    const reason = window.prompt('Enter a cancellation reason', 'Cancelled by billing team');
    if (!reason) {
      return;
    }

    this.invoiceService.cancelInvoice(invoice.id, reason).subscribe({
      next: () => {
        this.toast.success('Invoice cancelled');
        this.invoiceResource.reload();
      },
      error: () => this.toast.error('Failed to cancel invoice'),
    });
  }

  recordPayment(): void {
    const invoice = this.invoice();
    if (!invoice) {
      return;
    }

    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.toast.error('Please complete the payment details');
      return;
    }

    const amount = this.paymentForm.controls.amount.value ?? 0;
    if (invoice.balanceDue > 0 && amount > invoice.balanceDue) {
      this.toast.error('Payment amount cannot exceed the balance due');
      return;
    }

    this.isSubmittingPayment.set(true);
    this.invoiceService
      .recordPayment(invoice.id, {
        amount,
        paymentDate: this.paymentForm.controls.paymentDate.getRawValue(),
        paymentMode: this.paymentForm.controls.paymentMode.getRawValue(),
        referenceNumber: this.paymentForm.controls.referenceNumber.getRawValue() || undefined,
        notes: this.paymentForm.controls.notes.getRawValue() || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmittingPayment.set(false);
          this.toast.success('Payment recorded');
          this.paymentForm.reset({
            amount: null,
            paymentDate: formatDateInput(new Date()),
            paymentMode: 'upi',
            referenceNumber: '',
            notes: '',
          });
          this.invoiceResource.reload();
        },
        error: () => {
          this.isSubmittingPayment.set(false);
          this.toast.error('Failed to record payment');
        },
      });
  }

  printInvoice(): void {
    window.print();
  }

  goToRegister(): void {
    void this.router.navigate(['/billing/invoices']);
  }

  openBillingSuite(): void {
    void this.router.navigate(['/billing/firm']);
  }

  statusLabel(status: InvoiceStatus | undefined): string {
    return status
      ? status
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      : 'Draft';
  }

  statusClasses(status: InvoiceStatus | undefined): string {
    const fallback = 'border border-slate-200 bg-slate-100 text-slate-600';
    if (!status) {
      return fallback;
    }

    const classes: Record<InvoiceStatus, string> = {
      draft: 'border border-slate-200 bg-slate-100 text-slate-600',
      issued: 'border border-blue-200 bg-blue-50 text-blue-700',
      partially_paid: 'border border-amber-200 bg-amber-50 text-amber-700',
      paid: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
      overdue: 'border border-rose-200 bg-rose-50 text-rose-700',
      cancelled: 'border border-slate-200 bg-slate-100 text-slate-400 line-through',
    };

    return classes[status] ?? fallback;
  }

  dueClasses(invoice: Invoice | null): string {
    if (!invoice) {
      return 'border border-slate-200 bg-slate-100 text-slate-500';
    }

    if (invoice.status === 'paid') {
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    if (invoice.status === 'cancelled') {
      return 'border border-slate-200 bg-slate-100 text-slate-500';
    }

    const dueDate = this.parseDate(invoice.dueDate);
    if (!dueDate) {
      return 'border border-slate-200 bg-slate-100 text-slate-500';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const days = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
    if (days < 0) {
      return 'border border-rose-200 bg-rose-50 text-rose-700';
    }
    if (days <= 7) {
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    }

    return 'border border-blue-200 bg-blue-50 text-blue-700';
  }

  timelineDotClasses(event: TimelineEvent): string {
    const title = event.title.toLowerCase();
    if (title.includes('paid') || title.includes('payment')) {
      return 'bg-emerald-500 ring-emerald-100';
    }
    if (title.includes('cancel')) {
      return 'bg-rose-500 ring-rose-100';
    }
    if (title.includes('issue') || title.includes('whatsapp')) {
      return 'bg-blue-500 ring-blue-100';
    }

    return 'bg-amber-500 ring-amber-100';
  }

  displayDate(value: string | undefined): string {
    if (!value) {
      return '--';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  displayDateTime(value: string | undefined): string {
    if (!value) {
      return '--';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '--';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  paymentModeLabel(mode: string): string {
    return this.paymentModes.find((entry) => entry.value === mode)?.label ?? mode;
  }

  receiptNumberPreview(): number {
    return this.receiptCount() + 1;
  }

  private initialTabIndex(): number {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'payments') {
      return 1;
    }

    if (tab === 'timeline') {
      return 2;
    }

    return 0;
  }

  private buildTimeline(invoice: Invoice | null): TimelineEvent[] {
    if (!invoice) {
      return [];
    }

    const events: TimelineEvent[] = [
      {
        title: 'Invoice Created',
        timestamp: invoice.createdAt,
      },
    ];

    if (invoice.issuedAt) {
      events.push({
        title: 'Invoice Issued',
        timestamp: invoice.issuedAt,
      });
    }

    if (invoice.whatsappSentAt) {
      events.push({
        title: 'WhatsApp Sent',
        timestamp: invoice.whatsappSentAt,
      });
    }

    for (const payment of invoice.payments ?? []) {
      events.push({
        title: 'Payment Received',
        timestamp: payment.paymentDate || payment.createdAt,
        description: `${this.paymentModeLabel(payment.paymentMode)} - ${this.formatCurrency(payment.amount)} - ${
          payment.referenceNumber || 'No reference'
        }`,
      });
    }

    if (invoice.paidAt) {
      events.push({
        title: 'Invoice Paid',
        timestamp: invoice.paidAt,
      });
    }

    if (invoice.cancelledAt) {
      events.push({
        title: 'Invoice Cancelled',
        timestamp: invoice.cancelledAt,
        description: invoice.cancelReason,
      });
    }

    return [...events].sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    );
  }

  private getDueLabel(invoice: Invoice | null): string {
    if (!invoice) {
      return 'Due status unavailable';
    }

    if (invoice.status === 'paid') {
      return 'Settled';
    }
    if (invoice.status === 'cancelled') {
      return 'Voucher cancelled';
    }

    const dueDate = this.parseDate(invoice.dueDate);
    if (!dueDate) {
      return 'Due date pending';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} day overdue`;
    }
    if (diffDays === 0) {
      return 'Due today';
    }

    return `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }

  private getAgeLabel(invoice: Invoice | null): string {
    if (!invoice) {
      return '--';
    }

    const createdAt = this.parseDate(invoice.createdAt);
    if (!createdAt) {
      return '--';
    }

    const ageDays = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86400000));
    return `${ageDays} day${ageDays === 1 ? '' : 's'} live`;
  }

  private parseDate(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getTimestamp(value?: string): number {
    const date = this.parseDate(value);
    return date ? date.getTime() : 0;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  }
}
