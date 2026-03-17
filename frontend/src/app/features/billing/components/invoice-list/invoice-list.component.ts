import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { HotToastService } from '@ngneat/hot-toast';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';
import { Invoice, InvoiceStatus } from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';
import { InvoiceListFacade } from './invoice-list.facade';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    InrCurrencyPipe,
  ],
  providers: [InvoiceListFacade],
  templateUrl: './invoice-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceListComponent implements OnInit {
  facade = inject(InvoiceListFacade);
  private invoiceService = inject(InvoiceService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  router = inject(Router);
  toast = inject(HotToastService);
  dialog = inject(MatDialog);

  displayedColumns = ['index', 'invoiceNumber', 'client', 'services', 'invoiceDate', 'dueDate', 'amount', 'status', 'actions'];
  statusOptions: Array<{ label: string; value: InvoiceStatus | '' }> = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Issued', value: 'issued' },
    { label: 'Partially Paid', value: 'partially_paid' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  readonly filterForm = this.fb.group({
    search: this.fb.nonNullable.control(''),
    status: this.fb.nonNullable.control<InvoiceStatus | ''>(''),
    dateFrom: this.fb.control<Date | null>(null),
    dateTo: this.fb.control<Date | null>(null),
  });

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    if (this.isInvoiceStatus(status)) {
      this.filterForm.controls.status.setValue(status, { emitEvent: false });
      this.facade.setStatus(status);
    }

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.facade.setSearch(value.trim()));

    this.filterForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.facade.setStatus(value));

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

  newInvoice(): void {
    void this.router.navigate(['/billing/invoices/new']);
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

  onPageChange(event: PageEvent): void {
    if (event.pageSize !== this.facade.pageSize()) {
      this.facade.setPageSize(event.pageSize);
      return;
    }

    this.facade.setPage(event.pageIndex);
  }

  sortChanged(sort: Sort): void {
    const active = sort.active || 'invoiceDate';
    const direction = sort.direction === 'asc' ? 'asc' : 'desc';
    this.facade.setSort(active, direction);
  }

  statusLabel(status: InvoiceStatus): string {
    return status.replace(/_/g, ' ');
  }

  statusClasses(status: InvoiceStatus): string {
    const classes: Record<InvoiceStatus, string> = {
      draft: 'bg-gray-100 text-gray-600 border border-gray-200',
      issued: 'bg-blue-100 text-blue-700 border border-blue-200',
      partially_paid: 'bg-amber-100 text-amber-700 border border-amber-200',
      paid: 'bg-green-100 text-green-700 border border-green-200',
      overdue: 'bg-red-100 text-red-700 border border-red-200',
      cancelled: 'bg-gray-100 text-gray-400 border border-gray-200 line-through',
    };

    return classes[status];
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

  serviceSummary(invoice: Invoice): string {
    const lineItems = invoice.lineItems ?? [];

    if (lineItems.length === 0) {
      return '—';
    }

    if (lineItems.length === 1) {
      return lineItems[0]?.description ?? '—';
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

  private syncDateRange(): void {
    const dateFrom = this.toIsoDate(this.filterForm.controls.dateFrom.value);
    const dateTo = this.toIsoDate(this.filterForm.controls.dateTo.value);
    this.facade.setDateRange(dateFrom, dateTo);
  }

  private toIsoDate(value: Date | null): string {
    if (!value) {
      return '';
    }

    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
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
}
