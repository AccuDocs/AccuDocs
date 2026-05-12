import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HotToastService } from '@ngneat/hot-toast';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { Invoice, InvoicePartyRole, InvoiceStatus, InvoiceType } from '../../models/invoice.model';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';
import { InvoiceService } from '../../services/invoice.service';
import { InvoiceListFacade } from './invoice-list.facade';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    InrCurrencyPipe,
  ],
  providers: [
    InvoiceListFacade,
  ],
  templateUrl: './invoice-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceListComponent implements OnInit {
  readonly facade = inject(InvoiceListFacade);
  private readonly invoiceService = inject(InvoiceService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly router = inject(Router);
  readonly toast = inject(HotToastService);
  readonly dialog = inject(MatDialog);

  readonly statusOptions: Array<{ label: string; value: InvoiceStatus | '' }> = [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Issued', value: 'issued' },
    { label: 'Partially Paid', value: 'partially_paid' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  readonly invoiceTypeOptions: Array<{ label: string; value: InvoiceType | '' }> = [
    { label: 'All document types', value: '' },
    { label: 'Tax Invoice', value: 'tax_invoice' },
    { label: 'Proforma Invoice', value: 'proforma' },
    { label: 'Quotation', value: 'quotation' },
    { label: 'Credit Note', value: 'credit_note' },
    { label: 'Debit Note', value: 'debit_note' },
  ];

  readonly partyRoleOptions: Array<{ label: string; value: InvoicePartyRole | '' }> = [
    { label: 'All parties', value: '' },
    { label: 'Customers', value: 'customer' },
    { label: 'Vendors', value: 'vendor' },
  ];

  readonly filterForm = this.fb.group({
    search: this.fb.nonNullable.control(''),
    status: this.fb.nonNullable.control<InvoiceStatus | ''>(''),
    invoiceType: this.fb.nonNullable.control<InvoiceType | ''>(''),
    partyRole: this.fb.nonNullable.control<InvoicePartyRole | ''>(''),
    dateFrom: this.fb.nonNullable.control(''),
    dateTo: this.fb.nonNullable.control(''),
  });

  readonly totalResults = computed(() => this.facade.total());
  readonly hasLoadError = computed(() => this.facade.hasError());
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.filterForm.controls.search.value.trim()) count += 1;
    if (this.filterForm.controls.status.value) count += 1;
    if (this.filterForm.controls.invoiceType.value) count += 1;
    if (this.filterForm.controls.partyRole.value) count += 1;
    if (this.filterForm.controls.dateFrom.value) count += 1;
    if (this.filterForm.controls.dateTo.value) count += 1;
    return count;
  });
  readonly draftInView = computed(() =>
    this.facade.invoices().filter((invoice) => invoice.status === 'draft').length
  );
  readonly issuedInView = computed(() =>
    this.facade.invoices().filter((invoice) => invoice.status === 'issued').length
  );
  readonly paidInView = computed(() =>
    this.facade.invoices().filter((invoice) => invoice.status === 'paid').length
  );
  readonly overdueInView = computed(() =>
    this.facade.invoices().filter((invoice) => invoice.status === 'overdue').length
  );

  readonly totalAmountInView = computed(() =>
    this.facade.invoices().reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0)
  );

  readonly totalPaidInView = computed(() =>
    this.facade.invoices().reduce((sum, invoice) => sum + Number(invoice.amountPaid || 0), 0)
  );

  readonly totalOutstandingInView = computed(() =>
    this.facade.invoices().reduce((sum, invoice) => sum + this.balanceDueAmount(invoice), 0)
  );

  readonly outstandingCount = computed(() =>
    this.facade.invoices().filter((invoice) => this.balanceDueAmount(invoice) > 0).length
  );
  readonly pageStart = computed(() => {
    if (this.facade.total() === 0) {
      return 0;
    }

    return this.facade.currentPage() * this.facade.pageSize() + 1;
  });
  readonly pageEnd = computed(() =>
    Math.min((this.facade.currentPage() + 1) * this.facade.pageSize(), this.facade.total())
  );
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.facade.total() / this.facade.pageSize()))
  );
  readonly selectedInvoicePreview = computed(() => this.facade.invoices()[0] ?? null);
  readonly currentStatusLabel = computed(() => {
    const status = this.filterForm.controls.status.value;
    return status ? this.statusLabel(status) : 'All statuses';
  });
  readonly rangeLabel = computed(() => {
    const from = this.filterForm.controls.dateFrom.value;
    const to = this.filterForm.controls.dateTo.value;
    if (from && to) {
      return `${this.displayDate(from)} - ${this.displayDate(to)}`;
    }
    if (from) {
      return `From ${this.displayDate(from)}`;
    }
    if (to) {
      return `Until ${this.displayDate(to)}`;
    }
    return 'Current register';
  });

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    if (this.isInvoiceStatus(status)) {
      this.filterForm.controls.status.setValue(status, { emitEvent: false });
      this.facade.setStatus(status);
    }

    const invoiceType = this.route.snapshot.queryParamMap.get('invoiceType');
    if (this.isInvoiceType(invoiceType)) {
      this.filterForm.controls.invoiceType.setValue(invoiceType, { emitEvent: false });
      this.facade.setInvoiceType(invoiceType);
    }

    const partyRole = this.route.snapshot.queryParamMap.get('partyRole');
    if (this.isInvoicePartyRole(partyRole)) {
      this.filterForm.controls.partyRole.setValue(partyRole, { emitEvent: false });
      this.facade.setPartyRole(partyRole);
    }

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.facade.setSearch(value.trim()));

    this.filterForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.facade.setStatus(value));

    this.filterForm.controls.invoiceType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.facade.setInvoiceType(value));

    this.filterForm.controls.partyRole.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.facade.setPartyRole(value));

    this.filterForm.controls.dateFrom.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncDateRange());

    this.filterForm.controls.dateTo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncDateRange());
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

  editInvoice(id: string, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/billing/invoices', id, 'edit']);
  }

  recordPayment(id: string, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/billing/invoices', id], { queryParams: { tab: 'payments' } });
  }

  confirmDelete(invoice: Invoice, event?: Event): void {
    event?.stopPropagation();

    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete invoice?',
          message: `This will soft-delete ${invoice.invoiceNumber} from the active list.`,
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

        this.facade.deleteInvoice(invoice.id).subscribe({
          next: () => this.toast.success('Invoice deleted'),
          error: () => this.toast.error('Failed to delete invoice'),
        });
      });
  }

  issueInvoice(id: string, event?: Event): void {
    event?.stopPropagation();
    this.invoiceService.issueInvoice(id).subscribe({
      next: () => {
        this.toast.success('Invoice issued');
        this.facade.refresh();
      },
      error: () => this.toast.error('Failed to issue invoice'),
    });
  }

  cancelInvoice(id: string, event?: Event): void {
    event?.stopPropagation();
    const reason = window.prompt('Enter a cancellation reason', 'Cancelled by billing team');

    if (!reason) {
      return;
    }

    this.invoiceService.cancelInvoice(id, reason).subscribe({
      next: () => {
        this.toast.success('Invoice cancelled');
        this.facade.refresh();
      },
      error: () => this.toast.error('Failed to cancel invoice'),
    });
  }

  sendWhatsApp(id: string, event?: Event): void {
    event?.stopPropagation();
    this.invoiceService.sendWhatsApp(id).subscribe({
      next: () => this.toast.success('Sent via WhatsApp'),
      error: () => this.toast.error('WhatsApp delivery failed'),
    });
  }

  downloadPdf(id: string, event?: Event): void {
    event?.stopPropagation();
    this.invoiceService.getPdfUrl(id).subscribe({
      next: (response) => window.open(response.data?.url, '_blank', 'noopener'),
      error: () => this.toast.error('Unable to open PDF'),
    });
  }

  previousPage(): void {
    if (this.facade.currentPage() === 0) {
      return;
    }

    this.facade.setPage(this.facade.currentPage() - 1);
  }

  nextPage(): void {
    if (this.pageEnd() >= this.facade.total()) {
      return;
    }

    this.facade.setPage(this.facade.currentPage() + 1);
  }

  updatePageSize(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (!Number.isFinite(size) || size <= 0) {
      return;
    }

    this.facade.setPageSize(size);
  }

  toggleSort(column: string): void {
    const nextDirection: 'asc' | 'desc' =
      this.facade.sortBy() === column && this.facade.sortOrder() === 'asc' ? 'desc' : 'asc';

    this.facade.setSort(column, nextDirection);
  }

  sortIndicator(column: string): string {
    if (this.facade.sortBy() !== column) {
      return '';
    }

    return this.facade.sortOrder() === 'asc' ? 'ASC' : 'DESC';
  }

  sortChipLabel(column: string): string {
    const labels: Record<string, string> = {
      invoiceNumber: 'Invoice no',
      invoiceDate: 'Invoice date',
      dueDate: 'Due date',
      totalAmount: 'Amount',
      status: 'Status',
    };

    const indicator = this.sortIndicator(column);
    return indicator ? `${labels[column] ?? column} ${indicator}` : labels[column] ?? column;
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
      invoiceType: '',
      partyRole: '',
      dateFrom: '',
      dateTo: '',
    });
  }

  invoiceTypeLabel(type?: InvoiceType): string {
    const option = this.invoiceTypeOptions.find((item) => item.value === type);
    return option?.label ?? 'Invoice';
  }

  invoiceTypeClasses(type?: InvoiceType): string {
    const classes: Record<InvoiceType, string> = {
      tax_invoice: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/60',
      proforma: 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800/60',
      quotation: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/60',
      credit_note: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/60',
      debit_note: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/60',
    };

    return classes[type ?? 'tax_invoice'];
  }

  partyRoleLabel(role?: InvoicePartyRole): string {
    const option = this.partyRoleOptions.find((item) => item.value === role);
    return option?.label.replace(/s$/, '') ?? 'Customer';
  }

  partyRoleClasses(role?: InvoicePartyRole): string {
    return role === 'vendor'
      ? 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/60'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/60';
  }

  statusLabel(status: InvoiceStatus): string {
    return status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  statusClasses(status: InvoiceStatus): string {
    const classes: Record<InvoiceStatus, string> = {
      draft: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-600',
      issued: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/60',
      partially_paid:
        'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/60',
      paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/60',
      overdue: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/60',
      cancelled:
        'bg-slate-100 text-slate-400 border border-slate-200 line-through dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700',
    };

    return classes[status];
  }

  dueStatus(invoice: Invoice): string {
    if (invoice.status === 'paid') {
      return 'Settled';
    }
    if (invoice.status === 'cancelled') {
      return 'Cancelled';
    }

    if (!invoice.dueDate) {
      return 'Due date pending';
    }

    const dueDate = new Date(invoice.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return 'Due date pending';
    }

    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) {
      return `${Math.abs(diffDays)}d overdue`;
    }
    if (diffDays === 0) {
      return 'Due today';
    }
    if (diffDays <= 7) {
      return `Due in ${diffDays}d`;
    }

    return `Due in ${diffDays}d`;
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

  serviceSummary(invoice: Invoice): string {
    const lineItems = invoice.lineItems ?? [];

    if (lineItems.length === 0) {
      return 'No line items';
    }

    if (lineItems.length === 1) {
      return lineItems[0]?.description ?? 'No line items';
    }

    const firstDescription = lineItems[0]?.description ?? 'Line item';
    return `${firstDescription} +${lineItems.length - 1}`;
  }

  rowNumber(index: number): number {
    return this.facade.currentPage() * this.facade.pageSize() + index + 1;
  }

  canRecordPayment(status: InvoiceStatus): boolean {
    return status === 'issued' || status === 'partially_paid' || status === 'overdue';
  }

  canSend(status: InvoiceStatus): boolean {
    return status === 'issued' || status === 'partially_paid' || status === 'overdue';
  }

  canDownload(status: InvoiceStatus): boolean {
    return status === 'issued' || status === 'partially_paid' || status === 'overdue' || status === 'paid';
  }

  canCancel(status: InvoiceStatus): boolean {
    return status === 'issued' || status === 'partially_paid' || status === 'overdue';
  }

  isDueSoon(invoice: Invoice): boolean {
    if (!invoice.dueDate || invoice.status === 'paid' || invoice.status === 'cancelled') {
      return false;
    }

    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return dueDate.getTime() <= today.getTime();
  }

  balanceDueAmount(invoice: Invoice): number {
    const fallbackBalance = invoice.totalAmount - invoice.amountPaid;
    return Number(invoice.balanceDue ?? fallbackBalance ?? 0);
  }

  private syncDateRange(): void {
    this.facade.setDateRange(
      this.filterForm.controls.dateFrom.value,
      this.filterForm.controls.dateTo.value
    );
  }

  private isInvoiceStatus(status: string | null): status is InvoiceStatus {
    return (
      status === 'draft' ||
      status === 'issued' ||
      status === 'partially_paid' ||
      status === 'paid' ||
      status === 'overdue' ||
      status === 'cancelled'
    );
  }

  private isInvoiceType(value: string | null): value is InvoiceType {
    return (
      value === 'tax_invoice' ||
      value === 'proforma' ||
      value === 'quotation' ||
      value === 'credit_note' ||
      value === 'debit_note'
    );
  }

  private isInvoicePartyRole(value: string | null): value is InvoicePartyRole {
    return value === 'customer' || value === 'vendor';
  }
}
