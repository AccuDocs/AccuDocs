import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SAOrganizationsService } from '../../../services/sa-organizations.service';
import { ApiResponse, Organization } from '../../../models/sa.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroExclamationTriangleSolid, heroNoSymbolSolid, heroCheckCircleSolid } from '@ng-icons/heroicons/solid';

export interface SuspendOrgData {
  orgId: string;
  orgName: string;
  isActive: boolean;
}

@Component({
  selector: 'app-suspend-org-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, NgIconComponent],
  providers: [
    provideIcons({ heroExclamationTriangleSolid, heroNoSymbolSolid, heroCheckCircleSolid })
  ],
  template: `
    <div class="p-8 max-w-md bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
      <div class="flex flex-col items-center text-center">
         <div [class]="data.isActive ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'" class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
            <ng-icon [name]="data.isActive ? 'heroNoSymbolSolid' : 'heroCheckCircleSolid'" size="32"></ng-icon>
         </div>
         
         <h2 class="text-xl font-bold text-slate-900 mb-2">
            {{ data.isActive ? 'Suspend' : 'Activate' }} Organization?
         </h2>
         <p class="text-sm text-slate-500 leading-relaxed mb-8">
            Are you sure you want to {{ data.isActive ? 'suspend all access for' : 'reinstate service for' }} 
            <span class="font-bold text-slate-900">"{{ data.orgName }}"</span>? 
            {{ data.isActive ? 'Users will be unable to log in immediately.' : 'Members will regain access to their dashboard.' }}
         </p>

         <div class="w-full flex flex-col gap-3">
            <button 
              (click)="onConfirm()"
              [disabled]="isLoading()"
              [class]="data.isActive ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'"
              class="w-full py-3 text-white rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
               <span *ngIf="!isLoading()">Confirm {{ data.isActive ? 'Suspension' : 'Activation' }}</span>
               <div *ngIf="isLoading()" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </button>
            <button mat-dialog-close class="w-full py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-all">
              Nevermind, Cancel
            </button>
         </div>
         
         <div *ngIf="data.isActive" class="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
            <ng-icon name="heroExclamationTriangleSolid" size="18" class="text-amber-600 mt-0.5"></ng-icon>
            <p class="text-[11px] text-amber-700 text-left leading-normal font-medium">
               Suspension stops all API calls and background jobs associated with this tenant ID. Data is preserved but inaccessible.
            </p>
         </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SASuspendOrgModalComponent {
  private dialogRef = inject(MatDialogRef<SASuspendOrgModalComponent>);
  private orgService = inject(SAOrganizationsService);
  data: SuspendOrgData = inject(MAT_DIALOG_DATA);

  isLoading = signal(false);

  onConfirm() {
    this.isLoading.set(true);
    const action = this.data.isActive ? 
      this.orgService.suspendOrganization(this.data.orgId) : 
      this.orgService.activateOrganization(this.data.orgId);

    action.subscribe({
      next: (res: ApiResponse<Organization>) => {
        if (res.success) {
          this.dialogRef.close(true);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
