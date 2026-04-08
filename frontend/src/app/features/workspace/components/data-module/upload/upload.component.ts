import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowUpTraySolid, heroDocumentArrowDownSolid,
  heroCheckCircleSolid, heroExclamationCircleSolid,
  heroCloudArrowUpSolid
} from '@ng-icons/heroicons/solid';
import { DataService } from '@core/services/data.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroArrowUpTraySolid, heroDocumentArrowDownSolid, heroCheckCircleSolid, heroExclamationCircleSolid, heroCloudArrowUpSolid })],
  template: `
    <div class="space-y-6">
      <!-- Upload Type Toggle -->
      <div class="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex gap-1">
        @for (type of types; track type.key) {
          <button
            (click)="selectedType.set(type.key)"
            class="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all text-center"
            [class]="selectedType() === type.key
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'"
          >{{ type.label }}</button>
        }
      </div>

      <!-- Drop Zone -->
      <div
        class="sa-card border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer"
        [ngClass]="isDragging() ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300'"
        (dragover)="onDragOver($event)"
        (dragleave)="isDragging.set(false)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        <input #fileInput type="file" accept=".xlsx,.xls,.csv" (change)="onFileSelected($event)" class="hidden" />
        <div class="flex flex-col items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ng-icon name="heroCloudArrowUpSolid" size="32"></ng-icon>
          </div>
          <div>
            <p class="text-lg font-bold text-slate-900">Upload {{ selectedType() | titlecase }} Data</p>
            <p class="text-sm text-slate-500 mt-1">Drag & drop your Excel file here, or click to browse</p>
            <p class="text-xs text-slate-400 mt-2">.xlsx, .xls, .csv — Max 10MB</p>
          </div>
        </div>
      </div>

      <!-- Upload Progress -->
      @if (isUploading()) {
        <div class="sa-card">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 animate-pulse">
              <ng-icon name="heroArrowUpTraySolid" size="20"></ng-icon>
            </div>
            <div class="flex-1">
              <p class="text-sm font-bold text-slate-900">Processing {{ fileName() }}...</p>
              <div class="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div class="bg-indigo-600 h-2 rounded-full transition-all duration-500" style="width: 60%"></div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Result -->
      @if (result()) {
        <div class="sa-card space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" [class]="result()!.failed === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
              <ng-icon [name]="result()!.failed === 0 ? 'heroCheckCircleSolid' : 'heroExclamationCircleSolid'" size="24"></ng-icon>
            </div>
            <div>
              <p class="text-sm font-bold text-slate-900">Upload Complete</p>
              <p class="text-xs text-slate-500">{{ fileName() }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-emerald-700">{{ result()!.imported }}</p>
              <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Imported</p>
            </div>
            <div class="bg-rose-50 border border-rose-100 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-rose-700">{{ result()!.failed }}</p>
              <p class="text-[10px] font-bold text-rose-600 uppercase tracking-widest mt-1">Failed</p>
            </div>
          </div>
          @if (result()!.errors.length > 0) {
            <div class="bg-rose-50 border border-rose-200 rounded-lg p-4">
              <p class="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-2">Errors</p>
              <div class="space-y-1 max-h-40 overflow-y-auto">
                @for (err of result()!.errors; track $index) {
                  <p class="text-xs text-rose-700">Row {{ err.row }}: <span class="font-bold">{{ err.field }}</span> — {{ err.message }}</p>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Download Template -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
            <ng-icon name="heroDocumentArrowDownSolid" size="20"></ng-icon>
          </div>
          <div class="flex-1">
            <p class="text-sm font-bold text-slate-900">Download Template</p>
            <p class="text-xs text-slate-500 mt-0.5">Use our Excel template for correct formatting</p>
          </div>
          <button class="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            Download .xlsx
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`:host{display:block}.sa-card{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:all .2s ease}.sa-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08);transform:translateY(-1px)}`]
})
export class UploadComponent {
  @Input() clientId = '';

  private dataService = inject(DataService);
  private toast = inject(ToastService);

  selectedType = signal<'sales' | 'purchases' | 'expenses'>('sales');
  isDragging = signal(false);
  isUploading = signal(false);
  fileName = signal('');
  result = signal<{ imported: number; failed: number; errors: any[] } | null>(null);

  types = [
    { key: 'sales' as const, label: 'Sales' },
    { key: 'purchases' as const, label: 'Purchases' },
    { key: 'expenses' as const, label: 'Expenses' },
  ];

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.uploadFile(file);
  }

  onFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.uploadFile(file);
  }

  uploadFile(file: File) {
    this.fileName.set(file.name);
    this.isUploading.set(true);
    this.result.set(null);

    let obs;
    switch (this.selectedType()) {
      case 'sales': obs = this.dataService.uploadSales(this.clientId, file); break;
      case 'purchases': obs = this.dataService.uploadPurchases(this.clientId, file); break;
      default: this.toast.error('Expenses upload not supported yet'); this.isUploading.set(false); return;
    }

    obs.subscribe({
      next: (res: any) => {
        this.isUploading.set(false);
        if (res.success) {
          this.result.set(res.data);
          this.toast.success(`Imported ${res.data.imported} rows`);
        }
      },
      error: (err) => { this.isUploading.set(false); this.toast.error('Upload failed', err.message); }
    });
  }
}
