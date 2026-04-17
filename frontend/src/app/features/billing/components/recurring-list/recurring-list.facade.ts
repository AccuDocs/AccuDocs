import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { InvoiceService } from '../../services/invoice.service';

@Injectable()
export class RecurringListFacade {
  private invoiceService = inject(InvoiceService);

  searchQuery = signal('');
  activeFilter = signal<boolean | null>(null);
  clientId = signal<string | null>(null);

  private queryParams = computed(() => ({
    search: this.searchQuery() || undefined,
    isActive: this.activeFilter(),
    clientId: this.clientId() || undefined,
  }));

  templatesResource = rxResource({
    request: this.queryParams,
    loader: ({ request }) => this.invoiceService.getRecurringTemplates(request),
  });

  templates = computed(() => this.templatesResource.value()?.data ?? []);
  isLoading = computed(() => this.templatesResource.isLoading());

  setSearch(query: string): void {
    this.searchQuery.set(query);
  }

  setActiveFilter(value: boolean | null): void {
    this.activeFilter.set(value);
  }

  refresh(): void {
    this.templatesResource.reload();
  }

  toggle(id: string) {
    return this.invoiceService.toggleRecurring(id).pipe(
      tap(() => this.templatesResource.reload())
    );
  }

  delete(id: string) {
    return this.invoiceService.deleteRecurring(id).pipe(
      tap(() => this.templatesResource.reload())
    );
  }
}
