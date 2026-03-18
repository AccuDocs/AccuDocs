import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SAAdminsService } from '../../services/sa-admins.service';
import { 
  SuperAdmin, 
  ApiResponse 
} from '../../models/sa.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroUserGroupSolid, heroShieldCheckSolid, heroPlusSolid, heroEllipsisVerticalSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-sa-admins',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({ heroUserGroupSolid, heroShieldCheckSolid, heroPlusSolid, heroEllipsisVerticalSolid })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">Super Admins</h1>
          <p class="text-sm text-slate-500 font-medium">Manage cross-platform administrative accounts.</p>
        </div>
        <button class="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">
           <ng-icon name="heroPlusSolid" size="18"></ng-icon>
           Add Super Admin
        </button>
      </div>

      <!-- Admin List -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div *ngFor="let admin of admins()" class="sa-card group relative">
            <div class="flex items-start justify-between mb-4">
               <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  {{ admin.name.substring(0, 2).toUpperCase() }}
               </div>
               <button class="text-slate-400 hover:text-slate-600 transition-colors">
                  <ng-icon name="heroEllipsisVerticalSolid" size="20"></ng-icon>
               </button>
            </div>
            
            <h3 class="text-lg font-bold text-slate-900 mb-0.5">{{ admin.name }}</h3>
            <p class="text-sm text-slate-500 mb-4">{{ admin.email }}</p>
            
            <div class="flex flex-col gap-2 pt-4 border-t border-slate-50">
               <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MFA Status:</span>
                  <span [class]="admin.mfa_enabled ? 'text-emerald-600' : 'text-amber-500'" class="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                     <ng-icon [name]="admin.mfa_enabled ? 'heroShieldCheckSolid' : 'heroShieldCheckSolid'" size="12"></ng-icon>
                     {{ admin.mfa_enabled ? 'Protected' : 'Inactive' }}
                  </span>
               </div>
               <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Login:</span>
                  <span class="text-[10px] font-bold text-slate-700 uppercase tracking-widest">{{ admin.last_login_at ? (admin.last_login_at | date:'shortDate') : 'Never' }}</span>
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
export class SAAdminsComponent implements OnInit {
  adminService = inject(SAAdminsService);
  admins = signal<SuperAdmin[]>([]);

  ngOnInit() {
    this.adminService.getSuperAdmins().subscribe({
      next: (res: ApiResponse<SuperAdmin[]>) => {
        if (res.success) this.admins.set(res.data);
      }
    });
  }
}
