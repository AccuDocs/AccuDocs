import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCog6ToothSolid, heroLockClosedSolid, heroServerStackSolid, heroBellAlertSolid, heroArrowRightSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-sa-settings',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ heroCog6ToothSolid, heroLockClosedSolid, heroServerStackSolid, heroBellAlertSolid, heroArrowRightSolid })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500 pb-12">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">Platform Settings</h1>
          <p class="text-sm text-slate-500 font-medium">Configure global system parameters and security policies.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Security Settings -->
        <div class="sa-card">
           <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                 <ng-icon name="heroLockClosedSolid" size="20"></ng-icon>
              </div>
              <h2 class="text-lg font-bold text-slate-900">Security & Authentication</h2>
           </div>
           
           <div class="space-y-4">
              <div class="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors cursor-pointer group">
                 <div>
                    <p class="text-sm font-bold text-slate-900">Enforce Multi-Factor (MFA)</p>
                    <p class="text-[10px] text-slate-500 font-medium tracking-tight">Require MFA for all Super Admin accounts</p>
                 </div>
                 <div class="w-10 h-5 bg-emerald-500 rounded-full relative shadow-inner">
                    <div class="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-md"></div>
                 </div>
              </div>
              <div class="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors cursor-pointer group">
                 <div>
                    <p class="text-sm font-bold text-slate-900">Session Timeout</p>
                    <p class="text-[10px] text-slate-500 font-medium tracking-tight">Currently set to 2 hours of inactivity</p>
                 </div>
                 <ng-icon name="heroArrowRightSolid" size="14" class="text-slate-300 group-hover:text-slate-600 transition-colors"></ng-icon>
              </div>
           </div>
        </div>

        <!-- Infrastructure Settings -->
        <div class="sa-card shadow-lg shadow-indigo-600/5 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20">
           <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                 <ng-icon name="heroServerStackSolid" size="20"></ng-icon>
              </div>
              <h2 class="text-lg font-bold text-slate-900">System Resources</h2>
           </div>
           
           <div class="space-y-4">
              <div class="p-4 bg-white border border-indigo-100 rounded-xl">
                 <div class="flex justify-between items-center mb-2">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">S3 Storage Usage</span>
                    <span class="text-xs font-bold text-indigo-600">842 GB / 1 TB</span>
                 </div>
                 <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="bg-indigo-600 h-full rounded-full w-[84%]"></div>
                 </div>
              </div>
              <div class="p-4 bg-white border border-indigo-100 rounded-xl">
                 <div class="flex justify-between items-center mb-2">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">API Request Health</span>
                    <span class="text-xs font-bold text-emerald-600">99.98% Success</span>
                 </div>
                 <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div class="bg-emerald-500 h-full rounded-full w-[99%]"></div>
                 </div>
              </div>
           </div>
        </div>

        <!-- Alert Preferences -->
        <div class="sa-card lg:col-span-2">
           <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                 <ng-icon name="heroBellAlertSolid" size="20"></ng-icon>
              </div>
              <h2 class="text-lg font-bold text-slate-900">Platform Notifications</h2>
           </div>
           
           <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              <div *ngFor="let item of ['Subscription Expiring', 'System Error Peaks', 'New Org Signups', 'Policy Violations']" class="flex items-center justify-between py-3 border-b border-slate-50">
                 <span class="text-sm font-bold text-slate-700">{{ item }}</span>
                 <div class="flex items-center gap-6">
                    <div class="flex items-center gap-2">
                       <input type="checkbox" checked class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                       <span class="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                    </div>
                    <div class="flex items-center gap-2">
                       <input type="checkbox" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                       <span class="text-[10px] font-bold text-slate-400 uppercase">Push</span>
                    </div>
                 </div>
              </div>
           </div>
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
export class SASettingsComponent {}
