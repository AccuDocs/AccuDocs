import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPuzzlePieceSolid, heroPlusSolid, heroEllipsisVerticalSolid, heroCheckCircleSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-sa-service-templates',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ heroPuzzlePieceSolid, heroPlusSolid, heroEllipsisVerticalSolid, heroCheckCircleSolid })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">Service Templates</h1>
          <p class="text-sm text-slate-500 font-medium">Define standard workflows and compliance checklists for all CA firms.</p>
        </div>
        <button class="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2">
           <ng-icon name="heroPlusSolid" size="18"></ng-icon>
           Create Template
        </button>
      </div>

      <!-- Template Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div *ngFor="let template of templates()" class="sa-card group hover:border-indigo-200 transition-all cursor-pointer relative">
            <div class="flex items-start justify-between mb-4">
               <div class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                  <ng-icon name="heroPuzzlePieceSolid" size="24"></ng-icon>
               </div>
               <button class="text-slate-400 hover:text-slate-600">
                  <ng-icon name="heroEllipsisVerticalSolid" size="18"></ng-icon>
               </button>
            </div>
            
            <h3 class="text-lg font-bold text-slate-900 mb-1">{{ template.name }}</h3>
            <p class="text-sm text-slate-500 leading-relaxed mb-6">{{ template.description }}</p>
            
            <div class="flex items-center justify-between pt-4 border-t border-slate-50">
               <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Orgs:</span>
                  <span class="text-xs font-bold text-indigo-600">{{ template.usageCount }}</span>
               </div>
               <div class="flex items-center gap-1 text-emerald-600">
                  <ng-icon name="heroCheckCircleSolid" size="14"></ng-icon>
                  <span class="text-[10px] font-bold uppercase tracking-widest">Published</span>
               </div>
            </div>
         </div>
      </div>

      <!-- Create Placeholder -->
      <div class="sa-card border-2 border-dashed border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center py-12 group cursor-pointer hover:bg-slate-50 transition-colors">
         <div class="w-12 h-12 rounded-full border-2 border-slate-200 text-slate-300 flex items-center justify-center group-hover:border-indigo-300 group-hover:text-indigo-400 transition-colors mb-3">
            <ng-icon name="heroPlusSolid" size="24"></ng-icon>
         </div>
         <p class="text-sm font-bold text-slate-400 group-hover:text-indigo-500 transition-colors tracking-tight">Add a new global service category</p>
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
export class SAServiceTemplatesComponent {
  templates = signal([
    { name: 'Income Tax Return', description: 'Standard workflow for ITR 1, 2, 3 and 4 with automated document verification rules.', usageCount: 42 },
    { name: 'GST Filing (GSTR-1/3B)', description: 'Monthly and quarterly compliance flow with reconciliation checklists.', usageCount: 118 },
    { name: 'TDS Returns', description: 'Template for quarterly TDS compliance and form 16/16A generation steps.', usageCount: 24 },
    { name: 'Company Incorporation', description: 'End-to-end ROC workflow including name approval and SPICe+ support.', usageCount: 8 }
  ]);
}
