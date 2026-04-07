import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { HotToastService } from '@ngneat/hot-toast';
import { AuthService, User } from '@core/services/auth.service';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';
import { Payment, PaymentMode } from '../../models/payment.model';
import { InvoiceService } from '../../services/invoice.service';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';

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
  addressLine2: 'Satellite, Ahmedabad — 380015',
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
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTabsModule,
    MatTableModule,
    InrCurrencyPipe,
  ],
  templateUrl: './invoice-detail.component.html',
  styles: [
    `
      @media print {
        .billing-screen-only {
          display: none !important;
        }

        .billing-preview {
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private invoiceService = inject(InvoiceService);
  private authService = inject(AuthService);
  private toast = inject(HotToastService);

  readonly invoiceId = signal(this.route.snapshot.paramMap.get('id') ?? '');
  readonly selectedTabIndex = signal(this.initialTabIndex());
  readonly isSubmittingPayment = signal(false);

  readonly paymentColumns = ['date', 'mode', 'reference', 'amount', 'recordedBy'];
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

  readonly isOverpaid = computed(() => {
    const amount = this.paymentForm.controls.amount.value ?? 0;
    const balance = this.invoice()?.balanceDue ?? 0;
    return balance > 0 && amount > balance;
  });

  constructor() {
    effect(() => {
      const invoice = this.invoice();
      if (invoice) {
        this.paymentForm.controls.amount.setValidators([
          Validators.required,
          Validators.min(0.01),
          Validators.max(invoice.balanceDue),
        ]);
        this.paymentForm.controls.amount.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
  }

  canIssue(invoice: Invoice | null): boolean {
    return invoice?.status === 'draft';
  }

  canRecordPayment(invoice: Invoice | null): boolean {
    return invoice?.status === 'issued' || invoice?.status === 'partially_paid' || invoice?.status === 'overdue';
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

  statusLabel(status: InvoiceStatus | undefined): string {
    return status ? status.replace(/_/g, ' ') : 'draft';
  }

  statusClasses(status: InvoiceStatus | undefined): string {
    const fallback = 'bg-gray-100 text-gray-600 border border-gray-200';
    if (!status) {
      return fallback;
    }

    const classes: Record<InvoiceStatus, string> = {
      draft: 'bg-gray-100 text-gray-600 border border-gray-200',
      issued: 'bg-blue-100 text-blue-700 border border-blue-200',
      partially_paid: 'bg-amber-100 text-amber-700 border border-amber-200',
      paid: 'bg-green-100 text-green-700 border border-green-200',
      overdue: 'bg-red-100 text-red-700 border border-red-200',
      cancelled: 'bg-gray-100 text-gray-400 border border-gray-200 line-through',
    };

    return classes[status] ?? fallback;
  }

  displayDate(value: string | undefined): string {
    if (!value) {
      return '—';
    }

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

  displayDateTime(value: string | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
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
        description: `${this.paymentModeLabel(payment.paymentMode)} · ${payment.amount} · ${
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

    return [...events].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
  }
}
