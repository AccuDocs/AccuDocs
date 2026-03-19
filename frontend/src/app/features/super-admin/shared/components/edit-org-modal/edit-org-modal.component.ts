import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SAOrganizationsService } from '../../../services/sa-organizations.service';
import { Organization, ApiResponse } from '../../../models/sa.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  heroXMarkSolid, 
  heroPencilSquareSolid, 
  heroCheckCircleSolid,
  heroGlobeAltSolid,
  heroEnvelopeSolid,
  heroPhoneSolid
} from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-edit-org-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, NgIconComponent],
  providers: [
    provideIcons({ 
      heroXMarkSolid, 
      heroPencilSquareSolid, 
      heroCheckCircleSolid,
      heroGlobeAltSolid,
      heroEnvelopeSolid,
      heroPhoneSolid
    })
  ],
  template: `
    <div class="modal-container p-0 overflow-hidden rounded-2xl border-none shadow-2xl animate-in zoom-in-95 duration-200">
      <!-- Modal Header -->
      <div class="px-8 py-6 bg-slate-900 flex items-center justify-between text-white border-none">
        <div class="flex items-center gap-4">
           <div class="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <ng-icon name="heroPencilSquareSolid" size="20"></ng-icon>
           </div>
           <div>
              <h2 class="text-xl font-bold tracking-tight">Edit Organization</h2>
              <p class="text-xs text-amber-200 font-medium">Update profile and configuration for {{ data.org.name }}.</p>
           </div>
        </div>
        <button mat-dialog-close class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
          <ng-icon name="heroXMarkSolid" size="20"></ng-icon>
        </button>
      </div>

      <!-- Modal Body -->
      <form [formGroup]="editForm" (ngSubmit)="onSubmit()" class="px-8 py-8 space-y-6 bg-white max-h-[70vh] overflow-y-auto custom-scrollbar">
        <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2 md:col-span-1 space-y-1.5">
               <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Organization Name</label>
               <input 
                 type="text" 
                 formControlName="name"
                 class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all font-semibold"
                 placeholder="e.g. Kapur & Associates"
               />
            </div>
            <div class="col-span-2 md:col-span-1 space-y-1.5 opacity-60">
               <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Unique Slug (Read-only)</label>
               <div class="relative">
                  <input 
                    type="text" 
                    [value]="data.org.slug"
                    readonly
                    class="w-full h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none cursor-not-allowed font-mono"
                  />
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">.accudocs.in</span>
               </div>
            </div>
         </div>

         <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2 md:col-span-1 space-y-1.5">
               <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Contact Email</label>
               <div class="relative">
                  <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <ng-icon name="heroEnvelopeSolid" size="16"></ng-icon>
                  </div>
                  <input 
                    type="email" 
                    formControlName="email"
                    class="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    placeholder="admin@firm.com"
                  />
               </div>
            </div>
            <div class="col-span-2 md:col-span-1 space-y-1.5">
               <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Contact Phone</label>
               <div class="relative">
                  <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <ng-icon name="heroPhoneSolid" size="16"></ng-icon>
                  </div>
                  <input 
                    type="tel" 
                    formControlName="phone"
                    class="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    placeholder="+91 XXXXX XXXXX"
                  />
               </div>
            </div>
         </div>

         <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Address</label>
            <textarea 
              formControlName="address"
              rows="2"
              class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none"
              placeholder="Enter firm office address..."
            ></textarea>
         </div>

         <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2 md:col-span-1 space-y-1.5">
               <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">GSTIN</label>
               <input 
                 type="text" 
                 formControlName="gstin"
                 class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all uppercase font-mono"
                 placeholder="27AAAAA0000A1Z5"
               />
            </div>
            <div class="col-span-2 md:col-span-1 space-y-1.5">
               <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">PAN</label>
               <input 
                 type="text" 
                 formControlName="pan"
                 class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all uppercase font-mono"
                 placeholder="ABCDE1234F"
               />
            </div>
         </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
           <button type="button" mat-dialog-close class="px-6 h-11 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
           <button 
             type="submit" 
             [disabled]="editForm.invalid || isLoading() || !editForm.dirty"
             class="px-8 h-11 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
              <span *ngIf="!isLoading()">Update Changes</span>
              <div *ngIf="isLoading()" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <ng-icon *ngIf="!isLoading()" name="heroCheckCircleSolid" size="18"></ng-icon>
           </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host { display: block; max-width: 600px; margin: auto; }
    .modal-container { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  `]
})
export class SAEditOrgModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<SAEditOrgModalComponent>);
  private orgService = inject(SAOrganizationsService);
  public data = inject(MAT_DIALOG_DATA) as { org: Organization };

  isLoading = signal(false);

  editForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\+91[6-9]\d{9}$/)]],
    address: [''],
    gstin: ['', [Validators.pattern(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)]],
    pan: ['', [Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]]
  });

  ngOnInit() {
    this.editForm.patchValue({
      name: this.data.org.name,
      email: this.data.org.email,
      phone: this.data.org.phone,
      address: this.data.org.address,
      gstin: this.data.org.gstin,
      pan: this.data.org.pan
    });
  }

  onSubmit() {
    if (this.editForm.invalid) return;

    this.isLoading.set(true);
    this.orgService.updateOrganization(this.data.org.id, this.editForm.value as any).subscribe({
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
