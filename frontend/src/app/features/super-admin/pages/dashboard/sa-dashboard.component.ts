import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SAAnalyticsService } from '../../services/sa-analytics.service';
import { PlatformAnalytics, ApiResponse } from '../../models/sa.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  heroBuildingOffice2Solid, 
  heroUsersSolid, 
  heroCurrencyRupeeSolid, 
  heroArrowTrendingUpSolid 
} from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-sa-dashboard',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ 
      heroBuildingOffice2Solid, 
      heroUsersSolid, 
      heroCurrencyRupeeSolid, 
      heroArrowTrendingUpSolid 
    })
  ],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">
      <!-- Header -->
      <div class="flex flex-col gap-1">
        <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">Platform Overview</h1>
        <p class="text-sm text-slate-500 font-medium">Real-time metrics and system health monitoring.</p>
        <div class="w-10 h-[3px] bg-indigo-600 rounded-full mt-2"></div>
      </div>

      <!-- Stat Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Organizations -->
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">Total Organizations</p>
              <h3 class="text-3xl font-bold text-slate-900">{{ stats()?.organizations?.total || 0 }}</h3>
              <p class="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
                <ng-icon name="heroArrowTrendingUpSolid" size="12"></ng-icon>
                +{{ stats()?.organizations?.new_this_month || 0 }} this month
              </p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroBuildingOffice2Solid" size="24"></ng-icon>
            </div>
          </div>
        </div>

        <!-- Users -->
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">Active Users</p>
              <h3 class="text-3xl font-bold text-slate-900">{{ stats()?.users?.active || 0 }}</h3>
              <p class="text-xs font-bold text-indigo-600 mt-2 flex items-center gap-1">
                <ng-icon name="heroUsersSolid" size="12"></ng-icon>
                {{ stats()?.users?.total || 0 }} total registered
              </p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroUsersSolid" size="24"></ng-icon>
            </div>
          </div>
        </div>

        <!-- MRR -->
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">Estimated MRR</p>
              <h3 class="text-3xl font-bold text-slate-900">₹{{ (stats()?.subscriptions?.mrr || 0) | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-amber-600 mt-2">
                Across {{ stats()?.subscriptions?.active_subs || 0 }} active subs
              </p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroCurrencyRupeeSolid" size="24"></ng-icon>
            </div>
          </div>
        </div>

        <!-- Revenue Collected -->
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">Revenue Collected</p>
              <h3 class="text-3xl font-bold text-slate-900">₹{{ (stats()?.invoices?.total_collected || 0) | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-rose-600 mt-2">
                ₹{{ (stats()?.invoices?.total_outstanding || 0) | number:'1.0-0' }} outstanding
              </p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroCurrencyRupeeSolid" size="24"></ng-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div class="lg:col-span-2 space-y-8">
            <div class="sa-card">
              <div class="flex items-center justify-between mb-6">
                <h4 class="text-base font-semibold text-slate-800">Plan Distribution</h4>
                <button class="text-xs font-bold text-indigo-600 hover:text-indigo-700">View Detailed Report</button>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Trial</p>
                    <p class="text-xl font-bold text-slate-700">{{ stats()?.plans?.trial || 0 }}</p>
                 </div>
                 <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Starter</p>
                    <p class="text-xl font-bold text-emerald-700">{{ stats()?.plans?.starter || 0 }}</p>
                 </div>
                 <div class="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Pro</p>
                    <p class="text-xl font-bold text-indigo-700">{{ stats()?.plans?.professional || 0 }}</p>
                 </div>
                 <div class="p-4 bg-violet-50 rounded-xl border border-violet-100">
                    <p class="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">Enterprise</p>
                    <p class="text-xl font-bold text-violet-700">{{ stats()?.plans?.enterprise || 0 }}</p>
                 </div>
              </div>
            </div>

            <div class="sa-card">
               <div class="flex items-center justify-between mb-6">
                 <h4 class="text-base font-semibold text-slate-800">System Monitoring</h4>
                 <span class="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
                   <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                   All Systems Operational
                 </span>
               </div>
               <div class="space-y-4">
                 <div class="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                   <div class="flex items-center gap-3">
                     <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                     <span class="text-sm font-medium text-slate-700">Database Cluster</span>
                   </div>
                   <span class="text-xs font-bold text-slate-400">99.9% Uptime</span>
                 </div>
                 <div class="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                   <div class="flex items-center gap-3">
                     <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                     <span class="text-sm font-medium text-slate-700">S3 Storage (Buckets)</span>
                   </div>
                   <span class="text-xs font-bold text-slate-400">Stable</span>
                 </div>
               </div>
            </div>
         </div>

         <div class="space-y-8">
            <div class="sa-card bg-indigo-900 border-none relative overflow-hidden">
               <!-- Decorative Gradient -->
               <div class="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
               <div class="relative z-10">
                 <h4 class="text-base font-bold text-white mb-2">Quick Broadcast</h4>
                 <p class="text-sm text-indigo-200 mb-6">Draft an announcement to all organization owners immediately.</p>
                 <button class="w-full py-2.5 bg-white text-indigo-900 rounded-lg font-bold text-sm shadow-xl shadow-indigo-900/50 hover:bg-indigo-50 transition-all">
                   Compose Message
                 </button>
               </div>
            </div>

            <div class="sa-card">
               <h4 class="text-base font-semibold text-slate-800 mb-6">Recent Activity</h4>
               <div class="space-y-6">
                  <div class="flex gap-4">
                     <div class="w-1 h-10 bg-slate-100 rounded-full mt-1"></div>
                     <div>
                        <p class="text-sm font-bold text-slate-800">New Organization</p>
                        <p class="text-xs text-slate-500">Kapur & Associates joined the platform.</p>
                        <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold">2 hours ago</p>
                     </div>
                  </div>
                  <div class="flex gap-4">
                     <div class="w-1 h-10 bg-slate-100 rounded-full mt-1"></div>
                     <div>
                        <p class="text-sm font-bold text-slate-800">Plan Upgrade</p>
                        <p class="text-xs text-slate-500">Verma CPAs upgraded to Professional.</p>
                        <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold">5 hours ago</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  `,
  styles: [`
    .sa-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      transition: all 0.2s ease;
    }
    .sa-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transform: translateY(-1px);
    }
  `]
})
export class SADashboardComponent implements OnInit {
  analyticsService = inject(SAAnalyticsService);
  stats = signal<PlatformAnalytics | null>(null);
  isLoading = signal(true);

  ngOnInit() {
    this.analyticsService.getPlatformAnalytics().subscribe({
      next: (res: ApiResponse<PlatformAnalytics>) => {
        if (res.success) {
          this.stats.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
