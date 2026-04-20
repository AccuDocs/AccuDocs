import { Component, inject, signal, OnInit, CUSTOM_ELEMENTS_SCHEMA, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { ClientService, Client } from '@core/services/client.service';
import { NotificationService } from '@core/services/notification.service';
import { TaskFormComponent } from '@app/features/tasks/task-form/task-form.component';
import { InvoiceService } from '@app/features/billing/services/invoice.service';
import { Invoice } from '@app/features/billing/models/invoice.model';
import { InrCurrencyPipe } from '@app/features/billing/pipes/inr-currency.pipe';
import { ClientInventoryTabComponent } from './tabs/client-inventory-tab/client-inventory-tab.component';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTabsModule,
    InrCurrencyPipe,
  ],
  template: `
    <div class="fixed inset-0 flex flex-col bg-[#f4f7f9] text-[#0f2540] font-sans overflow-hidden z-[50]">
      <!-- HEADER: Ledger Title & Client Info -->
      <header class="bg-[#0f2540] text-white px-6 py-3 flex justify-between items-center shadow-md shrink-0 border-b border-[#1a3a5c]">
        <div class="flex items-center gap-4">
          <button (click)="router.navigate(['/clients'])" class="hover:bg-white/10 p-1 rounded transition-colors" title="Back to Masters">
            <mat-icon class="text-white">arrow_back</mat-icon>
          </button>
          <div class="flex flex-col">
            <div class="text-[10px] uppercase tracking-widest opacity-70 font-bold leading-none mb-1">Ledger Report</div>
            <h1 class="text-lg font-bold flex items-center gap-2 m-0 leading-none">
              {{ client()?.user?.name }}
              <span class="bg-[#1a3a5c] text-[10px] px-1.5 py-0.5 rounded border border-white/20 font-mono tracking-tighter self-center">
                {{ client()?.code }}
              </span>
            </h1>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button class="bg-[#2c5282] hover:bg-[#3182ce] text-[11px] font-bold px-3 py-1.5 rounded border border-white/10 transition-all flex items-center gap-1.5 shadow-sm" [routerLink]="['/billing/create']" [queryParams]="{ clientId: client()?.id }">
            <mat-icon class="text-[14px] w-[14px] h-[14px]">add</mat-icon>
            [F2] Sales
          </button>
          <button class="bg-[#276749] hover:bg-[#2f855a] text-[11px] font-bold px-3 py-1.5 rounded border border-white/10 transition-all flex items-center gap-1.5 shadow-sm">
            <mat-icon class="text-[14px] w-[14px] h-[14px]">receipt</mat-icon>
            [F6] Receipt
          </button>
        </div>
      </header>

      <!-- MAIN CONTENT AREA WITH TABS -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <mat-tab-group class="flex-1 client-tabs" animationDuration="0ms">
          
          <!-- TAB 1: LEDGER (ORIGINAL) -->
          <mat-tab label="Financial Ledger">
            <div class="flex-1 flex h-full overflow-hidden">
                            
                    <div class="flex-1 flex overflow-hidden">              
                                    
                      <!-- LEFT: LEDGER TABLE -->              
                      <main class="flex-1 overflow-hidden bg-white border-r border-[#dde8f2] relative flex flex-col">              
                        <div class="flex-1 overflow-auto">              
                          <table class="w-full text-sm border-collapse min-w-[800px]">              
                            <thead class="sticky top-0 bg-[#dde8f2] text-[#0f2540] font-bold uppercase text-[10px] tracking-wider z-10 border-b border-[#cbd5e0]">              
                              <tr>              
                                <th class="px-4 py-3 text-left border-r border-[#cbd5e0] w-28">Date</th>              
                                <th class="px-4 py-3 text-left border-r border-[#cbd5e0]">Particulars</th>              
                                <th class="px-4 py-3 text-left border-r border-[#cbd5e0] w-28">Vch Type</th>              
                                <th class="px-4 py-3 text-left border-r border-[#cbd5e0] w-32">Vch No.</th>              
                                <th class="px-4 py-3 text-right border-r border-[#cbd5e0] w-32">Debit (₹)</th>              
                                <th class="px-4 py-3 text-right border-r border-[#cbd5e0] w-32">Credit (₹)</th>              
                                <th class="px-4 py-3 text-right w-36">Balance (₹)</th>              
                              </tr>              
                            </thead>              
                            <tbody class="divide-y divide-[#f1f5f9]">              
                              @if (isLoading()) {              
                                <tr>              
                                  <td colspan="7" class="py-20 text-center">              
                                    <mat-spinner diameter="40" class="mx-auto"></mat-spinner>              
                                    <p class="text-[10px] uppercase tracking-widest mt-4 text-slate-400">Loading Ledger...</p>              
                                  </td>              
                                </tr>              
                              } @else if (invoices().length === 0) {              
                                <tr>              
                                  <td colspan="7" class="py-20 text-center">              
                                    <div class="text-slate-300 mb-2 font-mono text-4xl italic">NIL</div>              
                                    <div class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">No Transactions Recorded</div>              
                                  </td>              
                                </tr>              
                              } @else {              
                                @for (inv of invoices(); track inv.id) {              
                                  <tr class="hover:bg-[#f8fafc] border-b border-[#f1f5f9] cursor-pointer group transition-colors" [routerLink]="['/billing/invoices', inv.id]">              
                                    <td class="px-4 py-3 font-mono text-[12px] border-r border-[#f1f5f9] whitespace-nowrap">{{ displayDate(inv.invoiceDate) }}</td>              
                                    <td class="px-4 py-3 border-r border-[#f1f5f9]">              
                                      <div class="font-bold text-[#0f2540] truncate max-w-[300px]">{{ inv.lineItems?.[0]?.description || 'Professional Services' }}</div>              
                                      <div class="text-[10px] text-slate-500 flex gap-2 mt-0.5">              
                                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] border uppercase font-bold tracking-tighter" [ngClass]="statusClasses(inv.status)">              
                                          {{ statusLabel(inv.status) }}              
                                        </span>              
                                      </div>              
                                    </td>              
                                    <td class="px-4 py-3 text-[11px] font-bold uppercase border-r border-[#f1f5f9] text-slate-500">Sales</td>              
                                    <td class="px-4 py-3 font-mono text-[11px] border-r border-[#f1f5f9] text-[#2c5282] uppercase">{{ inv.invoiceNumber }}</td>              
                                    <td class="px-4 py-3 text-right font-mono text-[13px] font-bold text-[#0f2540] border-r border-[#f1f5f9]">              
                                      {{ inv.totalAmount | inrCurrency }}              
                                    </td>              
                                    <td class="px-4 py-3 text-right font-mono text-[13px] text-[#276749] border-r border-[#f1f5f9]">              
                                      {{ inv.amountPaid > 0 ? (inv.amountPaid | inrCurrency) : '-' }}              
                                    </td>              
                                    <td class="px-4 py-3 text-right font-mono text-[13px] font-bold" [class.text-red-600]="inv.balanceDue > 0">              
                                      {{ inv.balanceDue | inrCurrency }}              
                                      <span class="text-[9px] ml-0.5 opacity-50">{{ inv.balanceDue > 0 ? 'Dr' : 'Cr' }}</span>              
                                    </td>              
                                  </tr>              
                                }              
                              }              
                            </tbody>              
                          </table>              
                        </div>              
                            
                        <!-- STICKY FOOTER TOTALS -->              
                        <footer class="bg-[#0f2540] text-white shrink-0 border-t border-white/20 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.2)] font-mono">              
                          <div class="flex">              
                            <div class="flex-grow px-4 py-2.5 text-right font-bold uppercase tracking-widest text-[#90cdf4] text-[12px] border-r border-white/10">Summary Total</div>              
                            <div class="w-32 px-4 py-2.5 text-right font-bold text-white bg-[#1a3a5c]/50 border-r border-white/10 text-[13px]">              
                              {{ totalInvoiced() | inrCurrency }}              
                            </div>              
                            <div class="w-32 px-4 py-2.5 text-right font-bold text-[#68d391] bg-[#1a3a5c]/50 border-r border-white/10 text-[13px]">              
                              {{ totalPaid() | inrCurrency }}              
                            </div>              
                            <div class="w-36 px-4 py-2.5 text-right font-bold text-[#fc8181] bg-[#1a3a5c]/80 underline decoration-double text-[14px]">              
                              {{ outstandingBalance() | inrCurrency }}              
                            </div>              
                          </div>              
                        </footer>              
                      </main>              
                            
                      <!-- RIGHT: SUMMARY SIDE PANEL -->              
                      <aside class="w-80 bg-[#1a3a5c] text-white flex flex-col shadow-inner shrink-0">              
                        <div class="p-6 border-b border-white/10">              
                          <h2 class="text-[10px] uppercase font-bold tracking-[0.2em] text-[#90cdf4] mb-4">Financial Analysis</h2>              
                                        
                          <div class="space-y-4">              
                            <!-- Outstanding Card -->              
                            <div class="bg-[#0f2540] p-4 rounded border-l-4 border-red-500 shadow-lg group hover:border-red-400 transition-all">              
                              <div class="text-[10px] uppercase opacity-70 mb-1 font-bold tracking-wider">Total Outstanding</div>              
                              <div class="text-2xl font-mono font-bold text-red-400 leading-none tracking-tighter flex items-end gap-1">              
                                {{ outstandingBalance() | inrCurrency }}              
                                <span class="text-[12px] opacity-50 mb-1">Dr</span>              
                              </div>              
                              <div class="mt-2 text-[9px] bg-red-500/10 text-red-300 px-2 py-0.5 rounded border border-red-500/20 inline-block font-bold">              
                                Baki / Balance Due              
                              </div>              
                            </div>              
                            
                            <!-- Metrics -->              
                            <div class="bg-white/5 rounded-lg p-1">              
                              <div class="flex justify-between items-center px-3 py-2.5 border-b border-white/5">              
                                <span class="text-[11px] opacity-70 uppercase font-bold">Invoiced Sum</span>              
                                <span class="font-mono text-[13px] font-bold">{{ totalInvoiced() | inrCurrency }}</span>              
                              </div>              
                              <div class="flex justify-between items-center px-3 py-2.5 border-b border-white/5">              
                                <span class="text-[11px] opacity-70 uppercase font-bold">Total Receipts</span>              
                                <span class="font-mono text-[13px] font-bold text-[#68d391]">{{ totalPaid() | inrCurrency }}</span>              
                              </div>              
                              <div class="flex justify-between items-center px-3 py-2.5">              
                                <span class="text-[11px] opacity-70 uppercase font-bold">Total Vouchers</span>              
                                <span class="font-mono text-[13px] font-bold text-[#90cdf4]">{{ invoiceCount() }}</span>              
                              </div>              
                            </div>              
                          </div>              
                        </div>              
                            
                        <div class="p-6 flex-1 overflow-auto bg-[#1a3a5c]">              
                           <h2 class="text-[10px] uppercase font-bold tracking-[0.2em] text-[#90cdf4] mb-4">Master Info</h2>              
                           <div class="space-y-4">              
                             <div>              
                               <div class="text-[9px] uppercase tracking-widest opacity-50 mb-1 font-bold">Registration GSTIN</div>              
                               <div class="text-[12px] font-mono select-all bg-white/5 px-2 py-1.5 rounded border border-white/10 uppercase tracking-widest">              
                                 {{ client()?.gstin || 'UNREGISTERED' }}              
                               </div>              
                             </div>              
                             <div>              
                               <div class="text-[9px] uppercase tracking-widest opacity-50 mb-1 font-bold">Identity Code</div>              
                               <div class="text-[12px] font-mono bg-white/5 px-2 py-1.5 rounded border border-white/10 text-[#90cdf4]">              
                                 {{ client()?.code }}              
                               </div>              
                             </div>              
                             <div>              
                               <div class="text-[9px] uppercase tracking-widest opacity-50 mb-1 font-bold">Communication</div>              
                               <div class="text-[12px] font-mono bg-white/5 px-2 py-1.5 rounded border border-white/10 flex items-center gap-2">              
                                 <mat-icon class="text-[14px] w-[14px] h-[14px] text-emerald-400">phone</mat-icon>              
                                 +91 {{ client()?.user?.mobile }}              
                               </div>              
                             </div>              
                            
                             <div class="mt-8 pt-6 border-t border-white/10 space-y-2">              
                               <button class="w-full py-2.5 bg-[#0f2540] hover:bg-[#15345a] text-white rounded text-[10px] font-bold uppercase tracking-[0.15em] transition-all border border-white/10 flex items-center justify-center gap-2 shadow-md">              
                                 <mat-icon class="text-[16px] w-[16px] h-[16px]">edit_note</mat-icon>              
                                 Modify Master              
                               </button>              
                               <button class="w-full py-2.5 bg-transparent hover:bg-white/5 text-slate-300 rounded text-[10px] font-bold uppercase tracking-[0.15em] transition-all border border-white/10 flex items-center justify-center gap-2">              
                                 <mat-icon class="text-[16px] w-[16px] h-[16px]">picture_as_pdf</mat-icon>              
                                 Export Ledger              
                               </button>              
                             </div>              
                           </div>              
                        </div>              
                            
                        <!-- FOOTER SHORTCUTS -->              
                        <div class="mt-auto p-4 bg-[#071321] border-t border-white/10 grid grid-cols-2 gap-x-4 gap-y-1">              
                          <div class="text-[9px] text-[#90cdf4] font-bold uppercase tracking-tighter opacity-80">Alt+P: Print</div>              
                          <div class="text-[9px] text-[#90cdf4] font-bold uppercase tracking-tighter opacity-80">Alt+E: Export</div>              
                          <div class="text-[9px] text-slate-500 font-mono italic col-span-2 mt-1">AccuDocs v2.0.4 - Tally Mode</div>              
                        </div>              
                      </aside>              
                    </div>              
                            
                    
            </div>
          </mat-tab>
          
          <!-- TAB 2: INVENTORY -->
          <mat-tab label="Inventory & Stock">
            <div class="h-full overflow-y-auto bg-[#f8fafc]">
              @if (client()?.id) {
                <app-client-inventory-tab [clientId]="client()!.id"></app-client-inventory-tab>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>

      <!-- Quick Add Task Overlay Component -->
      <app-task-form
        [visible]="showQuickAddTask()"
        [clientId]="client()?.id || null"
        (visibleChange)="onTaskFormVisibilityChange($event)"
        (onSave)="handleTaskSave()"
      ></app-task-form>
    </div>
  `,
  styles: [`
    ::ng-deep .client-tabs { height: 100%; display: flex; flex-direction: column; }
    ::ng-deep .client-tabs .mat-mdc-tab-body-wrapper { flex: 1; overflow: hidden; }
    ::ng-deep .client-tabs .mat-mdc-tab-body { height: 100%; }
    ::ng-deep .client-tabs .mat-mdc-tab-header { background: white; border-bottom: 2px solid #e2e8f0; }
    ::ng-deep .client-tabs .mdc-tab__text-label { font-weight: bold !important; font-family: ui-sans-serif, system-ui, sans-serif !important; }
  `],
})
export class ClientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private clientService = inject(ClientService);
  private notificationService = inject(NotificationService);

  client = signal<Client | null>(null);
  invoices = signal<Invoice[]>([]);
  isLoading = signal(true);
  showQuickAddTask = signal(false);

  private invoiceService = inject(InvoiceService);

  readonly totalInvoiced = computed(() => 
    this.invoices().reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0)
  );

  readonly totalPaid = computed(() => 
    this.invoices().reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0)
  );

  readonly outstandingBalance = computed(() => 
    this.invoices().reduce((sum, inv) => sum + (Number(inv.totalAmount || 0) - Number(inv.amountPaid || 0)), 0)
  );

  readonly invoiceCount = computed(() => this.invoices().length);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadClient(id);
    }
  }

  private loadClient(id: string): void {
    this.isLoading.set(true);
    this.clientService.getClient(id).subscribe({
      next: (response) => {
        this.client.set(response.data);
        this.loadInvoices(id);
      },
      error: () => {
        this.notificationService.error('Client not found');
        this.router.navigate(['/clients']);
        this.isLoading.set(false);
      },
    });
  }

  private loadInvoices(clientId: string): void {
    this.invoiceService.getInvoices({ clientId, limit: 100 }).subscribe({
      next: (response) => {
        this.invoices.set(response.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.error('Failed to load ledger data');
        this.isLoading.set(false);
      }
    });
  }

  getTotalDocuments(): number {
    return this.client()?.years?.reduce((total, year) => total + (year.documentCount || 0), 0) || 0;
  }

  toggleStatus(): void {
    const c = this.client();
    if (!c) return;

    this.clientService.toggleClientActive(c.id).subscribe({
      next: () => {
        this.notificationService.success(`Client ${c.user?.isActive ? 'deactivated' : 'activated'}`);
        this.loadClient(c.id);
      },
    });
  }

  openQuickAddTask(): void {
    this.showQuickAddTask.set(true);
  }

  handleTaskSave(): void {
    this.showQuickAddTask.set(false);
  }

  onTaskFormVisibilityChange(visible: any): void {
    this.showQuickAddTask.set(visible === true || visible === 'true');
  }

  displayDate(value: string | undefined): string {
    if (!value) return '--';
    const date = new Date(value);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  statusLabel(status: string): string {
    return status.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  statusClasses(status: string): string {
    const map: any = {
      draft: 'bg-slate-100 text-slate-600 border-slate-200',
      issued: 'bg-blue-50 text-blue-700 border-blue-200',
      partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
      paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      overdue: 'bg-red-50 text-red-700 border-red-200',
      cancelled: 'bg-slate-100 text-slate-400 border-slate-200 line-through',
    };
    return map[status] || 'bg-slate-50 text-slate-600';
  }
}
