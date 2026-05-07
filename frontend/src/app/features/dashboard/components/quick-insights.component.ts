import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroShieldCheckSolid, heroDocumentTextSolid, heroBoltSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-quick-insights',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    <div class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section class="relative overflow-hidden rounded-[26px] bg-[#0074c9] p-6 text-white shadow-lg shadow-blue-700/20">
        <div class="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"></div>
        <div class="relative">
          <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <ng-icon name="heroShieldCheckSolid" size="22"></ng-icon>
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">Workspace confidence</p>
          <h4 class="mt-1 text-2xl font-black">94.2%</h4>
          <p class="mt-3 text-sm font-semibold leading-6 text-blue-100">
            Security posture is healthy. Next improvement is operational completeness: reminders, approvals, OCR, and audit automation.
          </p>
          <div class="mt-5 h-2.5 overflow-hidden rounded-full bg-white/20">
            <div class="h-full w-[94%] rounded-full bg-white"></div>
          </div>
        </div>
      </section>

      <section class="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
        <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">What we can add next</p>
        <h4 class="mt-1 text-lg font-black text-slate-950 dark:text-white">ERP dashboard upgrades</h4>

        <div class="mt-5 grid gap-4 md:grid-cols-3">
          @for (item of roadmap; track item.label) {
            <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-900" [style.color]="item.color">
                <ng-icon [name]="item.icon" size="17"></ng-icon>
              </div>
              <h5 class="mt-3 text-sm font-black text-slate-900 dark:text-white">{{ item.label }}</h5>
              <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">{{ item.description }}</p>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({ heroShieldCheckSolid, heroDocumentTextSolid, heroBoltSolid })
  ]
})
export class QuickInsightsComponent {
  roadmap = [
    {
      label: 'Today command queue',
      description: 'Unify due tasks, overdue deadlines, pending documents, and client follow-ups into one priority list.',
      icon: 'heroBoltSolid',
      color: '#0074c9',
    },
    {
      label: 'Document aging analytics',
      description: 'Show which clients are blocking filings because documents are pending for too long.',
      icon: 'heroDocumentTextSolid',
      color: '#16a34a',
    },
    {
      label: 'Firm health score',
      description: 'Score compliance readiness using overdue work, missing files, active clients, and audit activity.',
      icon: 'heroShieldCheckSolid',
      color: '#d97706',
    },
  ];
}
