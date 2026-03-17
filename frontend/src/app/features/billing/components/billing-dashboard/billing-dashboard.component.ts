import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BillingMetrics } from '../../models/billing-metrics.model';
import { InvoiceStatus } from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';

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

@Component({
  selector: 'app-billing-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    InrCurrencyPipe,
  ],
  templateUrl: './billing-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingDashboardComponent {
  private invoiceService = inject(InvoiceService);
  private router = inject(Router);

  metricsResource = rxResource({
    loader: () => this.invoiceService.getMetrics(),
  });

  recentInvoicesResource = rxResource({
    loader: () => this.invoiceService.getInvoices({ limit: 10, page: 1 }),
  });

  recurringTemplatesResource = rxResource({
    loader: () => this.invoiceService.getRecurringTemplates(),
  });

  metrics = computed(() => this.metricsResource.value()?.data ?? EMPTY_METRICS);
  recentInvoices = computed(() => this.recentInvoicesResource.value()?.data ?? []);
  recurringTemplates = computed(() => this.recurringTemplatesResource.value()?.data ?? []);
  isLoading = computed(
    () =>
      this.metricsResource.isLoading() ||
      this.recentInvoicesResource.isLoading() ||
      this.recurringTemplatesResource.isLoading()
  );

  hasInvoices = computed(() => this.metrics().totalInvoices > 0);
  pendingCollectionCount = computed(
    () => this.metrics().issuedCount + this.metrics().partiallyPaidCount + this.metrics().overdueCount
  );
  activeRecurringCount = computed(() => this.recurringTemplates().filter((template) => template.isActive).length);

  navigateToList(status?: InvoiceStatus | ''): void {
    void this.router.navigate(['/billing/invoices'], {
      queryParams: status ? { status } : {},
    });
  }

  openInvoice(id: string): void {
    void this.router.navigate(['/billing/invoices', id]);
  }

  newInvoice(): void {
    void this.router.navigate(['/billing/invoices/new']);
  }

  formatDate(value: string | undefined): string {
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

  statusLabel(status: InvoiceStatus): string {
    return status.replace('_', ' ');
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
}
