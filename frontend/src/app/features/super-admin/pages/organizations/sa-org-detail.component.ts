import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SAOrganizationsService } from '../../services/sa-organizations.service';
import { Organization, ApiResponse } from '../../models/sa.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  heroChevronLeftSolid,
  heroBuildingOffice2Solid,
  heroCheckBadgeSolid,
  heroArrowsPointingInSolid,
  heroNoSymbolSolid,
  heroClockSolid,
  heroCreditCardSolid,
  heroUsersSolid,
  heroClipboardDocumentListSolid
} from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-sa-org-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent],
  providers: [
    provideIcons({ 
      heroChevronLeftSolid,
      heroBuildingOffice2Solid,
      heroCheckBadgeSolid,
      heroArrowsPointingInSolid,
      heroNoSymbolSolid,
      heroClockSolid,
      heroCreditCardSolid,
      heroUsersSolid,
      heroClipboardDocumentListSolid
    })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500" *ngIf="org()">
      <!-- Breadcrumbs & Back -->
      <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <a routerLink="/super-admin/organizations" class="hover:text-indigo-600 transition-colors">Organizations</a>
        <span>/</span>
        <span class="text-slate-600">{{ org()?.name }}</span>
      </div>

      <!-- Detail Header -->
      <div class="sa-card overflow-hidden !p-0">
        <div class="h-32 bg-slate-900 relative">
          <!-- Decorative Pattern -->
           <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 20px 20px;"></div>
           
           <div class="absolute -bottom-12 left-8 border-4 border-white rounded-2xl shadow-xl overflow-hidden bg-white">
              <div class="w-24 h-24 bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-2xl uppercase">
                <img *ngIf="org()?.logo_s3_key" [src]="org()?.logo_s3_key" class="w-full h-full object-cover">
                <span *ngIf="!org()?.logo_s3_key">{{ org()?.name?.charAt(0) }}</span>
              </div>
           </div>
        </div>
        
        <div class="pt-16 pb-8 px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div>
              <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold text-slate-900">{{ org()?.name }}</h1>
                <span *ngIf="org()?.is_active" class="p-1 bg-emerald-50 text-emerald-600 rounded-full" title="Verified Active">
                  <ng-icon name="heroCheckBadgeSolid" size="18"></ng-icon>
                </span>
              </div>
              <p class="text-sm text-slate-500 font-medium flex items-center gap-2">
                 <span>{{ org()?.slug }}.accudocs.in</span>
                 <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                 <span>ID: {{ org()?.id }}</span>
              </p>
           </div>
           
           <div class="flex items-center gap-3">
              <button (click)="onImpersonate()" class="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
                <ng-icon name="heroArrowsPointingInSolid" size="18"></ng-icon>
                Impersonate
              </button>
              <button class="px-4 py-2 bg-white border border-slate-200 text-rose-600 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-rose-50 transition-all active:scale-95">
                <ng-icon name="heroNoSymbolSolid" size="18"></ng-icon>
                {{ org()?.is_active ? 'Suspend' : 'Activate' }}
              </button>
           </div>
        </div>

        <!-- Tab Navigation -->
        <div class="px-8 border-t border-slate-100 flex gap-8">
           <button 
             *ngFor="let tab of tabs" 
             (click)="activeTab.set(tab.id)"
             [class]="activeTab() === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
             class="py-4 border-b-2 text-xs font-bold uppercase tracking-widest transition-all focus:outline-none"
           >
             <div class="flex items-center gap-2">
                <ng-icon [name]="tab.icon" size="14"></ng-icon>
                {{ tab.label }}
             </div>
           </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div [ngSwitch]="activeTab()" class="animate-in slide-in-from-bottom-2 duration-500">
         
         <!-- General Tab -->
         <div *ngSwitchCase="'general'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 sa-card space-y-8">
               <div>
                  <h3 class="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 border-l-2 border-indigo-600 pl-3">Organization Profile</h3>
                  <div class="grid grid-cols-2 gap-y-6">
                     <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Full Legal Name</p>
                        <p class="text-sm font-semibold text-slate-700">{{ org()?.name }}</p>
                     </div>
                     <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Company Status</p>
                        <span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-100 italic">Verified Entity</span>
                     </div>
                     <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Official Email</p>
                        <p class="text-sm font-semibold text-slate-700">{{ org()?.email }}</p>
                     </div>
                     <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Official Phone</p>
                        <p class="text-sm font-semibold text-slate-700">{{ org()?.phone }}</p>
                     </div>
                  </div>
               </div>

               <div>
                  <h3 class="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 border-l-2 border-indigo-600 pl-3">Administrative Contact</h3>
                  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                     <div class="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-slate-200 text-slate-700 font-bold">JD</div>
                     <div>
                        <p class="text-sm font-bold text-slate-900">John Doe (Primary Owner)</p>
                        <p class="text-xs text-slate-500">Last login: 2 days ago</p>
                     </div>
                     <button class="ml-auto text-xs font-bold text-indigo-600">Contact Admin</button>
                  </div>
               </div>
            </div>

            <div class="sa-card h-fit">
              <h3 class="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Platform Usage</h3>
              <div class="space-y-6">
                 <div>
                    <div class="flex justify-between mb-2">
                       <span class="text-xs font-bold text-slate-500">Storage (5GB)</span>
                       <span class="text-xs font-bold text-slate-900">1.2GB (24%)</span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div class="bg-indigo-600 h-full" style="width: 24%"></div>
                    </div>
                 </div>
                 <div>
                    <div class="flex justify-between mb-2">
                       <span class="text-xs font-bold text-slate-500">Branches</span>
                       <span class="text-xs font-bold text-slate-900">3 of 5</span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div class="bg-emerald-500 h-full" style="width: 60%"></div>
                    </div>
                 </div>
                 <div class="pt-4 border-t border-slate-100">
                    <p class="text-xs text-slate-400 font-medium italic">Data hosted in Mumbai (ap-south-1)</p>
                 </div>
              </div>
            </div>
         </div>

         <!-- Subscription Tab -->
         <div *ngSwitchCase="'subscription'" class="sa-card">
            <div class="flex items-start justify-between mb-8">
               <div>
                  <h3 class="text-lg font-bold text-slate-900">Active Subscription</h3>
                  <p class="text-sm text-slate-500">Management for {{ org()?.name }}'s billing plan.</p>
               </div>
               <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all">Change Plan</button>
            </div>
            
            <div class="p-6 border border-indigo-100 bg-indigo-50/30 rounded-2xl relative overflow-hidden">
               <div class="absolute top-0 right-0 p-4">
                  <span class="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">Active</span>
               </div>
               <div class="flex items-center gap-6">
                  <div class="w-16 h-16 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                     <ng-icon name="heroCreditCardSolid" size="32"></ng-icon>
                  </div>
                  <div>
                     <h4 class="text-xl font-bold text-slate-900">{{ org()?.subscription_plan | uppercase }} Plan</h4>
                     <p class="text-sm text-slate-500">Billed annually • Next payment on Jan 14, 2027</p>
                  </div>
               </div>
            </div>
         </div>

         <!-- Fallback -->
         <div *ngSwitchDefault class="sa-card text-center py-20">
            <ng-icon name="heroClockSolid" size="48" class="text-slate-200 mb-4 mx-auto"></ng-icon>
            <h3 class="text-lg font-bold text-slate-400 italic">This section is being populated...</h3>
         </div>

      </div>
    </div>

    <!-- Loading State -->
    <div *ngIf="isLoading()" class="h-96 flex items-center justify-center">
       <div class="flex flex-col items-center gap-4">
          <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p class="text-sm font-bold text-slate-400 animate-pulse">Fetching Organization Profile...</p>
       </div>
    </div>
  `,
  styles: [`
    .sa-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      transition: all 0.2s ease;
    }
  `]
})
export class SAOrgDetailComponent implements OnInit {
  route = inject(ActivatedRoute);
  orgService = inject(SAOrganizationsService);
  
  org = signal<Organization | null>(null);
  isLoading = signal(true);
  activeTab = signal('general');

  tabs = [
    { id: 'general', label: 'General Info', icon: 'heroBuildingOffice2Solid' },
    { id: 'subscription', label: 'Subscription', icon: 'heroCreditCardSolid' },
    { id: 'admins', label: 'Admins', icon: 'heroUsersSolid' },
    { id: 'activity', label: 'Activity Logs', icon: 'heroClipboardDocumentListSolid' },
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrganization(id);
    }
  }

  loadOrganization(id: string) {
    this.isLoading.set(true);
    this.orgService.getOrganization(id).subscribe({
      next: (res: ApiResponse<Organization>) => {
        if (res.success) {
          this.org.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onImpersonate() {
    if (!this.org()) return;
    this.orgService.impersonate(this.org()!.id).subscribe({
      next: (res: ApiResponse<any>) => {
        if (res.success) {
          // Open organization URL in new tab or handle as needed
          window.open(res.data.url, '_blank');
        }
      }
    });
  }
}
