import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';
import type { Warehouse } from '../../models/inventory.models';

@Component({
  selector: 'app-warehouse-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <a routerLink="/inventory" class="text-slate-400 hover:text-white"><mat-icon>arrow_back</mat-icon></a>
          <h1 class="text-xl font-bold">Warehouses</h1>
        </div>
        <button (click)="showForm = !showForm"
                class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition-all">
          <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> New Warehouse
        </button>
      </div>

      <!-- Create Form Panel -->
      @if (showForm) {
        <div class="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-6 mb-6">
          <h2 class="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-4">New Warehouse</h2>
          <form [formGroup]="form" (ngSubmit)="create()" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="col-span-2">
              <label class="text-xs text-slate-400 mb-1.5 block">Name *</label>
              <input formControlName="name" type="text" class="input-field" placeholder="Main Warehouse"/>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1.5 block">Code *</label>
              <input formControlName="code" type="text" class="input-field" placeholder="WH-01"/>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1.5 block">GSTIN</label>
              <input formControlName="gstin" type="text" class="input-field" placeholder="Optional"/>
            </div>
            <div class="col-span-2 md:col-span-4">
              <label class="text-xs text-slate-400 mb-1.5 block">Address</label>
              <input formControlName="address" type="text" class="input-field" placeholder="Full address"/>
            </div>
            <div class="flex gap-4 items-center col-span-2 md:col-span-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input formControlName="isDefault" type="checkbox" class="accent-indigo-500 w-4 h-4"/>
                <span class="text-sm text-slate-300">Set as Default Warehouse</span>
              </label>
            </div>
            <div class="col-span-2 md:col-span-4 flex gap-3">
              <button type="submit" [disabled]="form.invalid"
                      class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold disabled:opacity-50 transition-all">
                Create
              </button>
              <button type="button" (click)="showForm = false"
                      class="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Warehouse Cards -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (i of [1,2,3]; track i) {
            <div class="h-40 bg-slate-900 rounded-xl animate-pulse"></div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (wh of warehouses(); track wh.id) {
            <div class="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-5 transition-all group">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-white font-bold">{{ wh.name }}</span>
                    @if (wh.isDefault) {
                      <span class="text-[10px] px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 rounded font-bold">DEFAULT</span>
                    }
                  </div>
                  <div class="font-mono text-xs text-indigo-300">{{ wh.code }}</div>
                </div>
                <span class="w-2 h-2 rounded-full mt-1" [class]="wh.isActive ? 'bg-emerald-400' : 'bg-rose-400'"></span>
              </div>
              @if (wh.address) {
                <p class="text-slate-400 text-xs mb-3 leading-relaxed">{{ wh.address }}</p>
              }
              @if (wh.gstin) {
                <div class="font-mono text-[10px] text-slate-500 mb-3">GSTIN: {{ wh.gstin }}</div>
              }
              <div class="flex gap-2 pt-2 border-t border-slate-800">
                <a [routerLink]="['/inventory/warehouses', wh.id, 'stock']"
                   class="flex-1 text-center text-xs py-1.5 bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300 rounded-lg transition-all font-semibold">
                  View Stock
                </a>
                <button (click)="deleteWh(wh)"
                        class="px-3 py-1.5 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-300 text-slate-400 rounded-lg transition-all text-xs">
                  <mat-icon class="text-[14px] w-3.5 h-3.5">delete</mat-icon>
                </button>
              </div>
            </div>
          } @empty {
            <div class="col-span-3 py-20 text-center text-slate-500">
              <p class="text-4xl mb-3">🏭</p>
              <p class="font-semibold">No warehouses created yet</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`.input-field { @apply w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500; }`],
})
export class WarehouseListComponent implements OnInit {
  private service = inject(InventoryService);
  private fb = inject(FormBuilder);

  warehouses = signal<Warehouse[]>([]);
  loading = signal(true);
  showForm = false;

  form = this.fb.group({
    name:      ['', Validators.required],
    code:      ['', Validators.required],
    gstin:     [''],
    address:   [''],
    isDefault: [false],
    isActive:  [true],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.service.getWarehouses().subscribe({
      next: (res: any) => { this.warehouses.set(res.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  create() {
    if (this.form.invalid) return;
    this.service.createWarehouse(this.form.value as any).subscribe({
      next: () => { this.showForm = false; this.form.reset({ isDefault: false, isActive: true }); this.load(); },
    });
  }

  deleteWh(wh: Warehouse) {
    if (confirm(`Remove "${wh.name}"?`)) {
      this.service.deleteWarehouse(wh.id).subscribe({ next: () => this.load() });
    }
  }
}
