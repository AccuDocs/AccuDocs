import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { SAAnalyticsService } from '../../services/sa-analytics.service';
import { PlatformAnalytics, ApiResponse } from '../../models/sa.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPresentationChartBarSolid, heroArrowTrendingUpSolid, heroUsersSolid, heroCurrencyRupeeSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-sa-analytics',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ heroPresentationChartBarSolid, heroArrowTrendingUpSolid, heroUsersSolid, heroCurrencyRupeeSolid })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">Platform Analytics</h1>
          <p class="text-sm text-slate-500 font-medium">Real-time snapshots of growth and system health.</p>
        </div>
        <select class="h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer">
           <option>Last 30 Days</option>
           <option>Last 90 Days</option>
           <option>This Year</option>
        </select>
      </div>

      <div *ngIf="analytics()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div class="sa-card relative group overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
               <ng-icon name="heroPresentationChartBarSolid" size="120"></ng-icon>
            </div>
            <div class="flex items-center gap-3 mb-4">
               <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ng-icon name="heroPresentationChartBarSolid" size="20"></ng-icon>
               </div>
               <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Growth</span>
            </div>
            <p class="text-3xl font-bold text-slate-900">{{ analytics()?.organizations?.total }}</p>
            <p class="text-sm font-medium text-slate-500 mt-1">Total Organizations</p>
            <div class="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
               <ng-icon name="heroArrowTrendingUpSolid" size="14"></ng-icon>
               <span>+{{ analytics()?.organizations?.new_this_month }} this month</span>
            </div>
         </div>

         <div class="sa-card relative group overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
               <ng-icon name="heroUsersSolid" size="120"></ng-icon>
            </div>
            <div class="flex items-center gap-3 mb-4">
               <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ng-icon name="heroUsersSolid" size="20"></ng-icon>
               </div>
               <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Users</span>
            </div>
            <p class="text-3xl font-bold text-slate-900">{{ analytics()?.users?.total | number }}</p>
            <p class="text-sm font-medium text-slate-500 mt-1">Platform-wide Users</p>
            <div class="mt-4 flex gap-3">
               <div class="flex flex-col">
                  <span class="text-[10px] text-slate-400 font-bold uppercase">Staff</span>
                  <span class="text-xs font-bold text-slate-700">{{ analytics()?.users?.staff }}</span>
               </div>
               <div class="flex flex-col border-l border-slate-100 pl-3">
                  <span class="text-[10px] text-slate-400 font-bold uppercase">Clients</span>
                  <span class="text-xs font-bold text-slate-700">{{ analytics()?.users?.clients }}</span>
               </div>
            </div>
         </div>

         <div class="sa-card relative group overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
               <ng-icon name="heroCurrencyRupeeSolid" size="120"></ng-icon>
            </div>
            <div class="flex items-center gap-3 mb-4">
               <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ng-icon name="heroCurrencyRupeeSolid" size="20"></ng-icon>
               </div>
               <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue</span>
            </div>
            <p class="text-3xl font-bold text-slate-900">{{ analytics()?.subscriptions?.mrr | currency:'INR':'symbol':'1.0-0' }}</p>
            <p class="text-sm font-medium text-slate-500 mt-1">Monthly Recurring</p>
            <div class="mt-4 flex items-center gap-2 text-indigo-600 text-xs font-bold cursor-pointer hover:underline">
               <span>View breakdown</span>
            </div>
         </div>

         <div class="sa-card">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Plan Mix</h3>
            <div class="space-y-3" *ngIf="analytics()?.plans">
               <div *ngFor="let plan of (analytics()?.plans | keyvalue)" class="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors rounded-lg px-2 -mx-2">
               <span class="text-sm font-bold text-slate-700 capitalize italic">{{ plan.key }}</span>
               <span class="text-sm font-black text-slate-900">{{ plan.value }}</span>
            </div>
            </div>
         </div>
      </div>
      
      <div class="sa-card h-80 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/50">
         <ng-icon name="heroPresentationChartBarSolid" size="48" class="text-slate-300 mb-4"></ng-icon>
         <p class="text-slate-400 text-sm font-bold italic">Detailed Revenue & Usage Trend visualization under construction.</p>
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
export class SAAnalyticsComponent implements OnInit {
  analyticsService = inject(SAAnalyticsService);
  analytics = signal<PlatformAnalytics | null>(null);

  ngOnInit() {
    this.analyticsService.getPlatformAnalytics().subscribe({
      next: (res: ApiResponse<PlatformAnalytics>) => {
        if (res.success) this.analytics.set(res.data);
      }
    });
  }
}
