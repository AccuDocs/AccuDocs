import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SAAuditLogsService } from '../../services/sa-audit-logs.service';
import { AuditLog } from '../../models/sa.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroDocumentTextSolid, heroMagnifyingGlassSolid, heroFunnelSolid, heroArrowDownTraySolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-sa-audit-logs',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ heroDocumentTextSolid, heroMagnifyingGlassSolid, heroFunnelSolid, heroArrowDownTraySolid })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">System Audit Logs</h1>
          <p class="text-sm text-slate-500 font-medium">Immutable record of all administrative actions.</p>
        </div>
        <button (click)="exportLogs()" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
           <ng-icon name="heroArrowDownTraySolid" size="16"></ng-icon>
           Export Logs
        </button>
      </div>

      <!-- Filters -->
      <div class="sa-card !p-4 flex flex-wrap items-center gap-4 bg-slate-50/50">
         <div class="relative flex-1 min-w-[300px]">
            <ng-icon name="heroMagnifyingGlassSolid" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></ng-icon>
            <input type="text" placeholder="Search by organization, admin, or action..." class="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition-all" />
         </div>
         <select class="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none">
            <option>All Actions</option>
            <option>ADMIN_LOGIN</option>
            <option>ORG_CREATED</option>
            <option>ORG_SUSPENDED</option>
            <option>PLAN_CHANGED</option>
         </select>
         <button class="h-10 px-4 bg-white border border-slate-200 text-slate-600 rounded-lg flex items-center gap-2 hover:bg-slate-50">
            <ng-icon name="heroFunnelSolid" size="14"></ng-icon>
            <span class="text-sm font-bold">More Filters</span>
         </button>
      </div>

      <!-- Logs Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-bottom border-slate-200">
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Details</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">IP Address</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 italic">
              <tr *ngFor="let log of logs()" class="hover:bg-slate-50/50 transition-colors">
                <td class="py-4 px-6">
                   <p class="text-[11px] font-mono text-slate-500">{{ log.created_at | date:'yyyy-MM-dd' }}</p>
                   <p class="text-xs font-bold text-slate-900">{{ log.created_at | date:'HH:mm:ss' }}</p>
                </td>
                <td class="py-4 px-6">
                   <div class="flex flex-col">
                      <span class="text-xs font-bold text-slate-900">{{ log.admin_id }}</span>
                      <span class="text-[10px] text-slate-400 font-medium">platform-admin</span>
                   </div>
                </td>
                <td class="py-4 px-6">
                   <span class="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded border border-slate-200 uppercase">
                      {{ log.action }}
                   </span>
                </td>
                <td class="py-4 px-6">
                   <p class="text-xs text-slate-600 leading-relaxed max-w-xs">{{ log.details || 'No additional details provided' }}</p>
                </td>
                <td class="py-4 px-6">
                   <span class="text-[11px] font-mono text-slate-400">{{ log.ip_address || '127.0.0.1' }}</span>
                </td>
              </tr>
              <tr *ngIf="logs().length === 0">
                <td colspan="5" class="py-12 text-center text-slate-400 italic text-sm font-medium">
                   No activity logs found for the selected period.
                </td>
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
export class SAAuditLogsComponent implements OnInit {
  auditService = inject(SAAuditLogsService);
  logs = signal<AuditLog[]>([]);

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.auditService.getAuditLogs({ page: 1, limit: 20 }).subscribe({
      next: (res) => {
        if (res.success) this.logs.set(res.data);
      }
    });
  }

  exportLogs() {
    this.auditService.exportAuditLogs({}, 'csv').subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.csv`;
      a.click();
    });
  }
}
