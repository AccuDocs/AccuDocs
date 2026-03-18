import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SASubscriptionsService } from '../../services/sa-subscriptions.service';
import { Subscription } from '../../models/sa.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCreditCardSolid, heroChevronLeftSolid, heroChevronRightSolid, heroMagnifyingGlassSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-sa-subscriptions',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ heroCreditCardSolid, heroChevronLeftSolid, heroChevronRightSolid, heroMagnifyingGlassSolid })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">Subscriptions</h1>
          <p class="text-sm text-slate-500 font-medium">Manage billing, plans, and revenue cycles for all tenants.</p>
        </div>
        <div class="flex items-center gap-3">
           <button class="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
              Generate Report
           </button>
           <button class="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
              Create Custom Plan
           </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div class="sa-card !p-4 border-l-4 border-indigo-600">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total MRR</p>
            <p class="text-xl font-bold text-slate-900">₹4,82,500</p>
         </div>
         <div class="sa-card !p-4 border-l-4 border-emerald-500">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Subs</p>
            <p class="text-xl font-bold text-slate-900">124</p>
         </div>
         <div class="sa-card !p-4 border-l-4 border-amber-500">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expiring (30d)</p>
            <p class="text-xl font-bold text-slate-900">18</p>
         </div>
         <div class="sa-card !p-4 border-l-4 border-rose-500">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Churn Rate</p>
            <p class="text-xl font-bold text-slate-900">2.4%</p>
         </div>
      </div>

      <!-- Table Section -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
           <div class="relative w-72">
              <ng-icon name="heroMagnifyingGlassSolid" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></ng-icon>
              <input type="text" placeholder="Search subscriptions..." class="w-full h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 transition-all" />
           </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-bottom border-slate-200">
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organization</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plan & Amount</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Period End</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let sub of subscriptions()" class="hover:bg-slate-50/50 transition-colors group">
                <td class="py-4 px-6 text-sm font-bold text-slate-900">{{ sub.org_name || 'Organization ' + sub.organization_id.substring(0, 5) }}</td>
                <td class="py-4 px-6">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 uppercase">{{ sub.plan }}</span>
                    <span class="text-sm font-bold text-slate-700">{{ sub.amount | currency:'INR':'symbol':'1.0-0' }}</span>
                  </div>
                  <p class="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{{ sub.billing_cycle }}ly billing</p>
                </td>
                <td class="py-4 px-6">
                   <span [class.text-emerald-600]="sub.status === 'active'" [class.bg-emerald-50]="sub.status === 'active'" class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-current opacity-80">
                      {{ sub.status }}
                   </span>
                </td>
                <td class="py-4 px-6 text-sm text-slate-600 font-medium">
                   {{ sub.current_period_end | date:'mediumDate' }}
                </td>
                <td class="py-4 px-6 text-right">
                   <button class="text-xs font-bold text-indigo-600 hover:text-indigo-800">Invoices</button>
                </td>
              </tr>
              <tr *ngIf="subscriptions().length === 0">
                <td colspan="5" class="py-12 text-center text-slate-400 italic text-sm">No subscription data found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sa-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
  `]
})
export class SASubscriptionsComponent implements OnInit {
  subService = inject(SASubscriptionsService);
  subscriptions = signal<Subscription[]>([]);

  ngOnInit() {
    this.subService.getSubscriptions({ page: 1, limit: 10 }).subscribe({
      next: (res) => {
        if (res.success) this.subscriptions.set(res.data);
      }
    });
  }
}
