import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SAAnnouncementsService } from '../../services/sa-announcements.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroMegaphoneSolid, heroPaperAirplaneSolid, heroClockSolid, heroTrashSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-sa-announcements',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [
    provideIcons({ heroMegaphoneSolid, heroPaperAirplaneSolid, heroClockSolid, heroTrashSolid })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500 pb-12">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">Platform Announcements</h1>
          <p class="text-sm text-slate-500 font-medium">Broadcast news, updates, or alerts to all tenants.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- New Announcement Form -->
        <div class="lg:col-span-2 space-y-6">
          <div class="sa-card">
            <h2 class="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
               <ng-icon name="heroMegaphoneSolid" size="18" class="text-indigo-600"></ng-icon>
               New Broadcast
            </h2>
            
            <form [formGroup]="announcementForm" (ngSubmit)="onBroadcast()" class="space-y-4">
               <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Announcement Title</label>
                  <input type="text" formControlName="title" placeholder="e.g. Scheduled Maintenance for GST Module" class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all" />
               </div>

               <div>
                  <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Message Body (Markdown Supported)</label>
                  <textarea formControlName="message" rows="5" placeholder="Detailed announcement details..." class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"></textarea>
               </div>

               <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
                     <select formControlName="priority" class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer">
                        <option value="low">Low (Info)</option>
                        <option value="medium">Medium (Update)</option>
                        <option value="high">High (Urgent)</option>
                     </select>
                  </div>
                  <div>
                     <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Target Audience</label>
                     <select formControlName="target_type" class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer">
                        <option value="all">All Organizations</option>
                        <option value="plan_based">Plan Specific</option>
                        <option value="specific_orgs">Targeted Orgs</option>
                     </select>
                  </div>
               </div>

               <div class="flex items-center justify-end pt-4">
                  <button type="submit" [disabled]="announcementForm.invalid || isSubmitting()" class="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                     <ng-icon name="heroPaperAirplaneSolid" size="18"></ng-icon>
                     {{ isSubmitting() ? 'Broadcasting...' : 'Post Announcement' }}
                  </button>
               </div>
            </form>
          </div>
        </div>

        <!-- History / Recent Sidebar -->
        <div class="space-y-6">
           <div class="sa-card">
              <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                 Recent Activity
                 <ng-icon name="heroClockSolid" size="14"></ng-icon>
              </h3>
              
              <div class="space-y-4">
                 <div *ngFor="let msg of history()" class="p-3 border border-slate-100 rounded-xl bg-slate-50/30 group relative">
                    <p class="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{{ msg.title }}</p>
                    <p class="text-[10px] text-slate-400 font-medium mt-1 truncate">{{ msg.message }}</p>
                    <div class="mt-3 flex items-center justify-between">
                       <span class="text-[9px] font-bold bg-white px-2 py-0.5 border border-slate-200 rounded text-slate-500 uppercase">{{ msg.priority }}</span>
                       <span class="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">{{ msg.created_at | date:'shortDate' }}</span>
                    </div>
                 </div>
                 
                 <div *ngIf="history().length === 0" class="py-12 text-center">
                    <p class="text-xs text-slate-400 italic">No broadcast history available.</p>
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
export class SAAnnouncementsComponent implements OnInit {
  fb = inject(FormBuilder);
  annService = inject(SAAnnouncementsService);
  
  announcementForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    message: ['', [Validators.required]],
    target_type: ['all' as const, [Validators.required]],
    priority: ['medium' as const, [Validators.required]]
  });

  isSubmitting = signal(false);
  history = signal<any[]>([]);

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.annService.getHistory({ page: 1, limit: 5 }).subscribe({
      next: (res) => {
        if (res.success) this.history.set(res.data);
      }
    });
  }

  onBroadcast() {
    if (this.announcementForm.invalid) return;
    this.isSubmitting.set(true);
    
    this.annService.broadcast(this.announcementForm.value as any).subscribe({
      next: (res) => {
        if (res.success) {
          this.announcementForm.reset({ target_type: 'all', priority: 'medium' });
          this.loadHistory();
        }
        this.isSubmitting.set(false);
      },
      error: () => this.isSubmitting.set(false)
    });
  }
}
