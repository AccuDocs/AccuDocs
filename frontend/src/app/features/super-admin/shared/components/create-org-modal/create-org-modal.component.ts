import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SAOrganizationsService } from '../../../services/sa-organizations.service';
import { ApiResponse } from '../../../models/sa.models';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMarkSolid, heroBuildingOffice2Solid, heroCheckCircleSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-create-org-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, NgIconComponent],
  providers: [
    provideIcons({ heroXMarkSolid, heroBuildingOffice2Solid, heroCheckCircleSolid })
  ],
  template: `
    <div class="modal-container p-0 overflow-hidden rounded-2xl border-none shadow-2xl animate-in zoom-in-95 duration-200">
      <!-- Modal Header -->
      <div class="px-8 py-6 bg-slate-900 flex items-center justify-between text-white border-none">
        <div class="flex items-center gap-4">
           <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <ng-icon name="heroBuildingOffice2Solid" size="20"></ng-icon>
           </div>
           <div>
              <h2 class="text-xl font-bold tracking-tight">Create Organization</h2>
              <p class="text-xs text-indigo-200 font-medium">Provision a new CA firm instance on the platform.</p>
           </div>
        </div>
        <button mat-dialog-close class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
          <ng-icon name="heroXMarkSolid" size="20"></ng-icon>
        </button>
      </div>

      <!-- Modal Body -->
      <form [formGroup]="orgForm" (ngSubmit)="onSubmit()" class="px-8 py-8 space-y-6 bg-white">
        <div class="grid grid-cols-2 gap-6">
           <div class="col-span-2 md:col-span-1 space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Organization Name</label>
              <input 
                type="text" 
                formControlName="name"
                class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                placeholder="e.g. Kapur & Associates"
              />
           </div>
           <div class="col-span-2 md:col-span-1 space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Unique Slug</label>
              <div class="relative">
                 <input 
                   type="text" 
                   formControlName="slug"
                   class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all font-mono"
                   placeholder="kapur-ca"
                 />
                 <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">.accudocs.in</span>
              </div>
           </div>
        </div>

        <div class="grid grid-cols-2 gap-6">
           <div class="col-span-2 md:col-span-1 space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Admin Email</label>
              <input 
                type="email" 
                formControlName="email"
                class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all"
                placeholder="admin@firm.com"
              />
           </div>
           <div class="col-span-2 md:col-span-1 space-y-1.5">
              <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Admin Phone</label>
              <input 
                type="tel" 
                formControlName="phone"
                class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all"
                placeholder="+91 XXXXX XXXXX"
              />
           </div>
        </div>

        <div class="space-y-1.5">
           <label class="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Initial Subscription Plan</label>
           <div class="grid grid-cols-4 gap-3">
              <label *ngFor="let plan of plans" class="cursor-pointer group">
                 <input type="radio" formControlName="subscription_plan" [value]="plan.id" class="hidden peer" />
                 <div class="p-3 border border-slate-200 rounded-xl bg-slate-50 text-center peer-checked:bg-white peer-checked:border-indigo-600 peer-checked:ring-4 peer-checked:ring-indigo-500/10 transition-all group-hover:bg-slate-100">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-peer-checked:text-indigo-600">{{ plan.name }}</p>
                    <p class="text-[11px] font-bold text-slate-900">{{ plan.price }}</p>
                 </div>
              </label>
           </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
           <button type="button" mat-dialog-close class="px-6 h-11 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
           <button 
             type="submit" 
             [disabled]="orgForm.invalid || isLoading()"
             class="px-8 h-11 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
              <span *ngIf="!isLoading()">Create & Provision</span>
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
    input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  `]
})
export class SACreateOrgModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<SACreateOrgModalComponent>);
  private orgService = inject(SAOrganizationsService);

  isLoading = signal(false);

  plans = [
    { id: 'trial', name: 'Trial', price: 'Free' },
    { id: 'starter', name: 'Starter', price: '₹9,999' },
    { id: 'professional', name: 'Pro', price: '₹24,999' },
    { id: 'enterprise', name: 'Custom', price: 'Contact' }
  ];

  orgForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?\d{10,12}$/)]],
    subscription_plan: ['trial', Validators.required]
  });

  constructor() {
    // Auto-generate slug from name and enforce lowercase
    this.orgForm.get('name')?.valueChanges.subscribe(name => {
      const slugControl = this.orgForm.get('slug');
      if (name && (!slugControl?.value || slugControl?.pristine)) {
        const generatedSlug = name.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        slugControl?.setValue(generatedSlug, { emitEvent: false });
      }
    });

    this.orgForm.get('slug')?.valueChanges.subscribe(val => {
      if (val) {
        const lowerVal = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (val !== lowerVal) {
          this.orgForm.get('slug')?.setValue(lowerVal, { emitEvent: false });
        }
      }
    });
  }

  onSubmit() {
    if (this.orgForm.invalid) return;

    this.isLoading.set(true);
    this.orgService.createOrganization(this.orgForm.value as any).subscribe({
      next: (res: ApiResponse<any>) => {
        if (res.success) {
          this.dialogRef.close(true);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}
