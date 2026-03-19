import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SAOrganizationsService } from '../../services/sa-organizations.service';
import { Organization, PaginatedResponse } from '../../models/sa.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SACreateOrgModalComponent } from '../../shared/components/create-org-modal/create-org-modal.component';
import { SAEditOrgModalComponent } from '../../shared/components/edit-org-modal/edit-org-modal.component';
import { SASuspendOrgModalComponent } from '../../shared/components/suspend-org-modal/suspend-org-modal.component';
import { 
  heroMagnifyingGlassSolid, 
  heroPlusSolid, 
  heroFunnelSolid, 
  heroChevronLeftSolid, 
  heroChevronRightSolid,
  heroEllipsisVerticalSolid,
  heroEyeSolid,
  heroPencilSquareSolid,
  heroNoSymbolSolid,
  heroCheckCircleSolid
} from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-sa-organizations',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent, MatDialogModule],
  providers: [
    provideIcons({ 
      heroMagnifyingGlassSolid, 
      heroPlusSolid, 
      heroFunnelSolid, 
      heroChevronLeftSolid, 
      heroChevronRightSolid,
      heroEllipsisVerticalSolid,
      heroEyeSolid,
      heroPencilSquareSolid,
      heroNoSymbolSolid,
      heroCheckCircleSolid
    })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">Organizations</h1>
          <p class="text-sm text-slate-500 font-medium">Manage and monitor all CA firms on the platform.</p>
        </div>
        <button (click)="openCreateModal()" class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
          <ng-icon name="heroPlusSolid" size="18"></ng-icon>
          Create Organization
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="relative group flex-1 max-w-md">
          <ng-icon name="heroMagnifyingGlassSolid" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></ng-icon>
          <input 
            type="text" 
            placeholder="Search by name, email or slug..." 
            class="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            (input)="onSearch($event)"
          />
        </div>
        
        <div class="flex items-center gap-3">
           <select class="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer">
             <option value="">All Plans</option>
             <option value="trial">Trial</option>
             <option value="starter">Starter</option>
             <option value="professional">Professional</option>
             <option value="enterprise">Enterprise</option>
           </select>
           <select class="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer">
             <option value="">Status: All</option>
             <option value="true">State: Active</option>
             <option value="false">State: Suspended</option>
           </select>
           <button class="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
             <ng-icon name="heroFunnelSolid" size="16"></ng-icon>
             More Filters
           </button>
        </div>
      </div>

      <!-- Table Section -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-bottom border-slate-200">
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organization</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plan</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joined</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let org of organizations()" class="hover:bg-slate-50/50 transition-colors group">
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs uppercase border border-slate-200 overflow-hidden">
                      <img *ngIf="org.logo_s3_key" [src]="org.logo_s3_key" class="w-full h-full object-cover">
                      <span *ngIf="!org.logo_s3_key">{{ org.name.charAt(0) }}</span>
                    </div>
                    <div>
                      <a [routerLink]="['/super-admin/organizations', org.id]" class="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer select-none">{{ org.name }}</a>
                      <p class="text-xs text-slate-500">{{ org.slug }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-6">
                  <p class="text-sm text-slate-700 font-medium">{{ org.email }}</p>
                  <p class="text-xs text-slate-400">{{ org.phone }}</p>
                </td>
                <td class="py-4 px-6">
                  <span [ngClass]="{
                    'bg-indigo-50 text-indigo-700 border-indigo-200': org.subscription_plan === 'professional',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': org.subscription_plan === 'starter',
                    'bg-violet-50 text-violet-700 border-violet-200': org.subscription_plan === 'enterprise',
                    'bg-slate-100 text-slate-600 border-slate-200': org.subscription_plan === 'trial'
                  }" class="text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide">
                    {{ org.subscription_plan }}
                  </span>
                </td>
                <td class="py-4 px-6">
                  <div class="flex items-center gap-2">
                    <span [class]="org.is_active ? 'bg-emerald-500' : 'bg-rose-500'" class="w-1.5 h-1.5 rounded-full"></span>
                    <span class="text-xs font-bold text-slate-700 uppercase tracking-tight">
                      {{ org.is_active ? 'Active' : 'Suspended' }}
                    </span>
                  </div>
                </td>
                <td class="py-4 px-6 text-sm text-slate-500">
                  {{ org.created_at | date:'mediumDate' }}
                </td>
                <td class="py-4 px-6 text-right">
                   <div class="flex items-center justify-end gap-1">
                      <a [routerLink]="['/super-admin/organizations', org.id]" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View Details">
                        <ng-icon name="heroEyeSolid" size="18"></ng-icon>
                      </a>
                      <button (click)="openEditModal(org)" class="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Edit Organization">
                        <ng-icon name="heroPencilSquareSolid" size="18"></ng-icon>
                      </button>
                      <button (click)="openSuspendModal(org)" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" [title]="org.is_active ? 'Suspend' : 'Activate'">
                        <ng-icon [name]="org.is_active ? 'heroNoSymbolSolid' : 'heroCheckCircleSolid'" size="18"></ng-icon>
                      </button>
                   </div>
                </td>
              </tr>
              <tr *ngIf="organizations().length === 0">
                <td colspan="6" class="py-12 text-center">
                  <div class="flex flex-col items-center justify-center text-slate-400">
                    <ng-icon name="heroMagnifyingGlassSolid" size="48" class="mb-4 opacity-20"></ng-icon>
                    <p class="font-bold">No organizations found</p>
                    <p class="text-xs mt-1">Try adjusting your filters or search query.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Showing {{ organizations().length }} of 142 Organizations
          </p>
          <div class="flex items-center gap-2">
            <button class="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 transition-all">
              <ng-icon name="heroChevronLeftSolid" size="16"></ng-icon>
            </button>
            <div class="flex items-center gap-1">
               <button class="w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20">1</button>
               <button class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all">2</button>
               <button class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all">3</button>
            </div>
            <button class="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
              <ng-icon name="heroChevronRightSolid" size="16"></ng-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SAOrganizationsComponent implements OnInit {
  orgService = inject(SAOrganizationsService);
  dialog = inject(MatDialog);
  
  organizations = signal<Organization[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.loadOrganizations();
  }

  loadOrganizations(search = '') {
    this.isLoading.set(true);
    this.orgService.getOrganizations({ page: 1, limit: 10, search }).subscribe({
      next: (res: PaginatedResponse<Organization>) => {
        if (res.success) {
          this.organizations.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSearch(event: any) {
    const query = event.target.value;
    this.loadOrganizations(query);
  }

  openCreateModal() {
    const dialogRef = this.dialog.open(SACreateOrgModalComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'sa-modal-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadOrganizations();
    });
  }

  openEditModal(org: Organization) {
    const dialogRef = this.dialog.open(SAEditOrgModalComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { org }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadOrganizations();
    });
  }

  openSuspendModal(org: Organization) {
    const dialogRef = this.dialog.open(SASuspendOrgModalComponent, {
      width: '450px',
      maxWidth: '95vw',
      data: {
        orgId: org.id,
        orgName: org.name,
        isActive: org.is_active
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadOrganizations();
    });
  }
}
