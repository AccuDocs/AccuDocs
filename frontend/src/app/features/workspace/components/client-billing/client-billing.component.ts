import { Component, Input, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlusSolid, heroDocumentTextSolid, heroCurrencyRupeeSolid, heroLinkSolid, heroArrowLeftSolid } from '@ng-icons/heroicons/solid';
import { InvoiceService } from '../../../billing/services/invoice.service';
import { Invoice } from '../../../billing/models/invoice.model';
import { PaymentLinkComponent } from '../../../billing/components/payment-link/payment-link.component';
import { InvoiceFormComponent } from '../../../billing/components/invoice-form/invoice-form.component';

@Component({
  selector: 'app-client-billing',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent, DecimalPipe, DatePipe, PaymentLinkComponent, InvoiceFormComponent],
  providers: [provideIcons({ heroPlusSolid, heroDocumentTextSolid, heroCurrencyRupeeSolid, heroLinkSolid, heroArrowLeftSolid })],
  template: `
    <div class="animate-in fade-in duration-500 max-w-6xl relative">
      @if (mode() === 'list') {
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Client Billing & Invoices</h2>
            <p class="text-sm text-slate-500 mt-1">Manage and track all billing documents for this specific client.</p>
          </div>
          <button 
            (click)="setMode('create')"
            class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 transition-colors shadow-sm"
          >
            <ng-icon name="heroPlusSolid" size="18"></ng-icon> Create New Invoice
          </button>
        </div>

      <!-- Stats / Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-sm font-semibold text-slate-500 uppercase tracking-widest">Total Invoices</p>
          <p class="text-3xl font-black text-slate-900 mt-2">{{ totalInvoices() }}</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-sm font-semibold text-slate-500 uppercase tracking-widest">Total Billed</p>
          <p class="text-3xl font-black text-emerald-600 mt-2">₹{{ totalBilled() | number:'1.2-2' }}</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-sm font-semibold text-slate-500 uppercase tracking-widest">Unpaid Balance</p>
          <p class="text-3xl font-black text-rose-600 mt-2">₹{{ totalUnpaid() | number:'1.2-2' }}</p>
        </div>
      </div>

      <!-- Invoices List -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50">
          <h3 class="font-semibold text-slate-800">Recent Documents</h3>
        </div>
        
        @if (isLoading()) {
          <div class="p-12 text-center text-slate-500">
            <div class="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mx-auto mb-3"></div>
            Loading billing records...
          </div>
        } @else if (invoices().length === 0) {
          <div class="p-12 text-center">
            <div class="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <ng-icon name="heroDocumentTextSolid" size="32"></ng-icon>
            </div>
            <h3 class="text-lg font-bold text-slate-700">No invoices yet</h3>
            <p class="text-slate-500 max-w-sm mx-auto mt-2">Click the button above to draft your first invoice or quotation for this client.</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-white border-b border-slate-100">
                  <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Number</th>
                  <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th class="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (inv of invoices(); track inv.id) {
                  <tr class="hover:bg-slate-50/70 transition-colors group">
                    <td class="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{{ inv.invoiceDate | date:'mediumDate' }}</td>
                    <td class="py-3 px-4">
                      <button (click)="viewInvoice(inv.id!)" class="text-sm font-bold text-primary-600 hover:underline">
                        {{ inv.invoiceNumber || 'Draft' }}
                      </button>
                    </td>
                    <td class="py-3 px-4">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                        {{ formatType(inv.invoiceType!) }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <span class="text-sm font-bold text-slate-900">₹{{ inv.totalAmount | number:'1.2-2' }}</span>
                    </td>
                    <td class="py-3 px-4 text-center">
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold capitalize"
                            [ngClass]="{
                              'bg-amber-100 text-amber-700': inv.status === 'draft',
                              'bg-blue-100 text-blue-700': inv.status === 'issued',
                              'bg-emerald-100 text-emerald-700': inv.status === 'paid' || inv.status === 'partially_paid',
                              'bg-rose-100 text-rose-700': inv.status === 'overdue' || inv.status === 'cancelled'
                            }">
                        {{ inv.status }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <!-- Contextual Actions -->
                      <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        @if ((inv.status === 'issued' || inv.status === 'partially_paid' || inv.status === 'overdue') && inv.totalAmount > 0) {
                          <app-payment-link [invoiceId]="inv.id!" class="inline-block"></app-payment-link>
                        }
                        
                        <button (click)="viewInvoice(inv.id!)" class="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <ng-icon name="heroDocumentTextSolid"></ng-icon>
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
      } @else {
        <!-- Embed Context -->
        <div class="mb-4">
          <button (click)="setMode('list')" class="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            <ng-icon name="heroArrowLeftSolid" size="16"></ng-icon> Back to Invoices
          </button>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 relative">
          <app-invoice-form 
            [isEmbedded]="true" 
            [embeddedClientId]="clientId" 
            [embeddedInvoiceId]="selectedId()"
            (saved)="onSaved()"
          ></app-invoice-form>
        </div>
      }
    </div>
  `
})
export class ClientBillingComponent implements OnInit {
  @Input() clientId!: string;

  private invoiceService = inject(InvoiceService);

  readonly mode = signal<'list' | 'create' | 'edit'>('list');
  readonly selectedId = signal<string | null>(null);

  readonly invoices = signal<Invoice[]>([]);
  readonly isLoading = signal(true);
  
  readonly totalInvoices = signal(0);
  readonly totalBilled = signal(0);
  readonly totalUnpaid = signal(0);

  ngOnInit() {
    this.fetchInvoices();
  }

  fetchInvoices() {
    this.isLoading.set(true);
    this.invoiceService.getInvoices({ clientId: this.clientId, limit: 50 }).subscribe({
      next: (res: any) => {
        const data = res.data || [];
        this.invoices.set(data);
        
        this.totalInvoices.set(data.length);
        this.totalBilled.set(data.filter((i: Invoice) => i.status !== 'draft' && i.status !== 'cancelled').reduce((acc: number, curr: Invoice) => acc + curr.totalAmount, 0));
        
        const unpaid = data
          .filter((i: Invoice) => i.status === 'issued' || i.status === 'partially_paid' || i.status === 'overdue')
          .reduce((acc: number, curr: Invoice) => acc + (curr.totalAmount - (curr.amountPaid || 0)), 0);
        this.totalUnpaid.set(unpaid);

        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  setMode(mode: 'list' | 'create') {
    this.selectedId.set(null);
    this.mode.set(mode);
  }

  viewInvoice(id: string) {
    this.selectedId.set(id);
    this.mode.set('edit');
  }

  onSaved() {
    this.setMode('list');
    this.fetchInvoices();
  }

  formatType(type: string): string {
    if (!type) return 'Invoice';
    return type.replace('_', ' ');
  }
}
