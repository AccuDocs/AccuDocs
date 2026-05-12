import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { InvoicePartyRole, InvoiceStatus, InvoiceType } from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';

@Injectable()
export class InvoiceListFacade {
  private invoiceService = inject(InvoiceService);

  searchQuery = signal('');
  currentPage = signal(0);
  pageSize = signal(20);
  statusFilter = signal<InvoiceStatus | ''>('');
  invoiceTypeFilter = signal<InvoiceType | ''>('');
  partyRoleFilter = signal<InvoicePartyRole | ''>('');
  clientFilter = signal('');
  dateFromFilter = signal('');
  dateToFilter = signal('');
  sortBy = signal('invoiceDate');
  sortOrder = signal<'asc' | 'desc'>('desc');

  private queryParams = computed(() => ({
    search: this.searchQuery() || undefined,
    page: this.currentPage() + 1,
    limit: this.pageSize(),
    status: this.statusFilter() || undefined,
    invoiceType: this.invoiceTypeFilter() || undefined,
    partyRole: this.partyRoleFilter() || undefined,
    clientId: this.clientFilter() || undefined,
    dateFrom: this.dateFromFilter() || undefined,
    dateTo: this.dateToFilter() || undefined,
    sortBy: this.sortBy() || undefined,
    sortOrder: this.sortOrder(),
  }));

  invoicesResource = rxResource({
    request: this.queryParams,
    loader: ({ request }) => this.invoiceService.getInvoices(request, { silenceErrors: true }),
  });

  invoices = computed(() => this.invoicesResource.value()?.data ?? []);
  total = computed(() => this.invoicesResource.value()?.meta?.total ?? 0);
  isLoading = computed(() => this.invoicesResource.isLoading());
  hasError = computed(() => Boolean(this.invoicesResource.error()));

  setSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(0);
  }

  setPage(page: number): void {
    this.currentPage.set(page);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  setStatus(status: InvoiceStatus | ''): void {
    this.statusFilter.set(status);
    this.currentPage.set(0);
  }

  setInvoiceType(invoiceType: InvoiceType | ''): void {
    this.invoiceTypeFilter.set(invoiceType);
    this.currentPage.set(0);
  }

  setPartyRole(partyRole: InvoicePartyRole | ''): void {
    this.partyRoleFilter.set(partyRole);
    this.currentPage.set(0);
  }

  setDateRange(dateFrom: string, dateTo: string): void {
    this.dateFromFilter.set(dateFrom);
    this.dateToFilter.set(dateTo);
    this.currentPage.set(0);
  }

  setSort(sortBy: string, sortOrder: 'asc' | 'desc'): void {
    this.sortBy.set(sortBy);
    this.sortOrder.set(sortOrder);
    this.currentPage.set(0);
  }

  refresh(): void {
    this.invoicesResource.reload();
  }

  deleteInvoice(id: string) {
    return this.invoiceService.deleteInvoice(id).pipe(
      tap(() => this.refresh())
    );
  }
}
