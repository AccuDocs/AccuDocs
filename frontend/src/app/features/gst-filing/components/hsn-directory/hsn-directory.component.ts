import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GstExtendedService, HsnSacCode } from '@core/services/gst-extended.service';
import { HotToastService } from '@ngneat/hot-toast';

const GST_RATES = [0, 0.25, 1, 1.5, 3, 5, 6, 7.5, 9, 12, 13.8, 14, 18, 28];

@Component({
  selector: 'app-hsn-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="hd-root">
      <!-- Page Header -->
      <div class="hd-page-header">
        <div>
          <h1 class="hd-page-title">HSN / SAC Directory</h1>
          <p class="hd-page-sub">Search goods and services codes for GST compliance</p>
        </div>
        <div class="hd-stats">
          @if (total() > 0) {
            <span class="hd-stat-badge">{{ total() | number }} codes</span>
          }
        </div>
      </div>

      <!-- Search & Filter Bar -->
      <div class="hd-toolbar">
        <!-- Search input -->
        <div class="hd-search-wrap">
          <svg class="hd-search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" />
          </svg>
          <input
            id="hsn-search-input"
            class="hd-search-input"
            type="text"
            placeholder="Search by code or description…"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
          />
          @if (searchQuery) {
            <button class="hd-search-clear" (click)="clearSearch()">✕</button>
          }
        </div>

        <!-- Type filter -->
        <div class="hd-filter-group">
          <button class="hd-type-btn" [class.hd-type-btn--active]="!selectedType()" (click)="setType(null)">All</button>
          <button class="hd-type-btn" [class.hd-type-btn--active]="selectedType() === 'HSN'" (click)="setType('HSN')">HSN (Goods)</button>
          <button class="hd-type-btn" [class.hd-type-btn--active]="selectedType() === 'SAC'" (click)="setType('SAC')">SAC (Services)</button>
        </div>

        <!-- GST Rate chips -->
        <div class="hd-rate-chips">
          <button
            class="hd-rate-chip"
            [class.hd-rate-chip--active]="!selectedRate()"
            (click)="setRate(null)"
          >Any Rate</button>
          @for (rate of gstRates; track rate) {
            <button
              class="hd-rate-chip"
              [class.hd-rate-chip--active]="selectedRate() === rate"
              (click)="setRate(rate)"
            >{{ rate }}%</button>
          }
        </div>
      </div>

      <!-- Table -->
      <div class="hd-table-wrap">
        @if (isLoading()) {
          <div class="hd-loading">
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <div class="hd-skeleton-row">
                <div class="hd-skeleton" style="width:80px"></div>
                <div class="hd-skeleton" style="width:260px"></div>
                <div class="hd-skeleton" style="width:50px"></div>
                <div class="hd-skeleton" style="width:60px"></div>
              </div>
            }
          </div>
        }

        @if (!isLoading()) {
          <table class="hd-table">
            <thead class="hd-thead">
              <tr>
                <th class="hd-th">Code</th>
                <th class="hd-th hd-th--grow">Description</th>
                <th class="hd-th hd-th--center">Type</th>
                <th class="hd-th hd-th--center">GST Rate</th>
                <th class="hd-th">Chapter</th>
              </tr>
            </thead>
            <tbody>
              @for (code of codes(); track code.id) {
                <tr class="hd-row">
                  <td class="hd-td">
                    <span class="hd-code-badge">{{ code.code }}</span>
                  </td>
                  <td class="hd-td hd-td--desc">{{ code.description }}</td>
                  <td class="hd-td hd-td--center">
                    <span class="hd-type-pill" [class.hd-type-pill--hsn]="code.type === 'HSN'" [class.hd-type-pill--sac]="code.type === 'SAC'">
                      {{ code.type }}
                    </span>
                  </td>
                  <td class="hd-td hd-td--center">
                    <span class="hd-rate-pill">{{ code.gstRate }}%</span>
                  </td>
                  <td class="hd-td hd-td--muted">{{ code.chapter || '—' }}</td>
                </tr>
              }
              @if (codes().length === 0) {
                <tr>
                  <td colspan="5" class="hd-empty">
                    <div class="hd-empty-inner">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="hd-empty-icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                      <p>No codes found for your search</p>
                      <button class="hd-reset-btn" (click)="reset()">Clear filters</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Pagination -->
      @if (totalPages() > 1) {
        <div class="hd-pagination">
          <button class="hd-page-btn" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)">← Prev</button>
          <span class="hd-page-info">Page {{ currentPage() }} of {{ totalPages() }}</span>
          <button class="hd-page-btn" [disabled]="currentPage() === totalPages()" (click)="goToPage(currentPage() + 1)">Next →</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .hd-root { display: flex; flex-direction: column; gap: 20px; padding: 24px; max-width: 1200px; }

    .hd-page-header { display: flex; align-items: center; justify-content: space-between; }
    .hd-page-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .hd-page-sub { font-size: 13px; color: #64748b; margin: 0; }
    .hd-stats { display: flex; align-items: center; }
    .hd-stat-badge { background: #eff6ff; color: #3b82f6; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }

    .hd-toolbar { display: flex; flex-direction: column; gap: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }

    .hd-search-wrap { position: relative; display: flex; align-items: center; }
    .hd-search-icon { position: absolute; left: 12px; width: 16px; height: 16px; color: #94a3b8; pointer-events: none; }
    .hd-search-input { width: 100%; padding: 10px 36px 10px 36px; border: 1px solid #e2e8f0; border-radius: 10px;
      font-size: 14px; outline: none; background: #f8fafc; transition: all 0.2s; }
    .hd-search-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .hd-search-clear { position: absolute; right: 12px; background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 13px; }

    .hd-filter-group { display: flex; gap: 6px; flex-wrap: wrap; }
    .hd-type-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid #e2e8f0; background: #f8fafc;
      font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s; }
    .hd-type-btn:hover { background: #f1f5f9; }
    .hd-type-btn--active { background: #3b82f6; border-color: #3b82f6; color: #fff; }

    .hd-rate-chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .hd-rate-chip { padding: 4px 10px; border-radius: 16px; border: 1px solid #e2e8f0; background: #f8fafc;
      font-size: 11px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s; }
    .hd-rate-chip:hover { background: #f1f5f9; }
    .hd-rate-chip--active { background: #0ea5e9; border-color: #0ea5e9; color: #fff; }

    .hd-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .hd-table { width: 100%; border-collapse: collapse; }
    .hd-thead { background: #f8fafc; }
    .hd-th { padding: 11px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .hd-th--grow { width: 100%; }
    .hd-th--center { text-align: center; }
    .hd-row { transition: background 0.1s; }
    .hd-row:hover { background: #f8fafc; }
    .hd-td { padding: 11px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .hd-td--desc { color: #374151; font-size: 12.5px; max-width: 400px; }
    .hd-td--center { text-align: center; }
    .hd-td--muted { color: #94a3b8; font-size: 12px; }

    .hd-code-badge { font-family: monospace; font-size: 12px; font-weight: 700; background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 6px; }
    .hd-type-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
    .hd-type-pill--hsn { background: #dcfce7; color: #16a34a; }
    .hd-type-pill--sac { background: #fef3c7; color: #d97706; }
    .hd-rate-pill { font-size: 12px; font-weight: 600; background: #f0fdf4; color: #15803d; padding: 2px 8px; border-radius: 6px; }

    .hd-loading { display: flex; flex-direction: column; gap: 1px; padding: 12px; }
    .hd-skeleton-row { display: flex; gap: 20px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .hd-skeleton { height: 16px; border-radius: 4px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite linear; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .hd-empty { padding: 48px 24px; text-align: center; }
    .hd-empty-inner { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .hd-empty-icon { width: 40px; height: 40px; color: #cbd5e1; }
    .hd-empty p { font-size: 14px; color: #64748b; margin: 0; }
    .hd-reset-btn { font-size: 12px; color: #3b82f6; background: none; border: none; cursor: pointer; }

    .hd-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .hd-page-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.15s; }
    .hd-page-btn:hover:not(:disabled) { background: #f1f5f9; }
    .hd-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .hd-page-info { font-size: 13px; color: #64748b; }
  `],
})
export class HsnDirectoryComponent {
  private gstService = inject(GstExtendedService);
  private toast = inject(HotToastService);

  readonly gstRates = GST_RATES;

  searchQuery = '';
  readonly selectedType = signal<'HSN' | 'SAC' | null>(null);
  readonly selectedRate = signal<number | null>(null);
  readonly currentPage = signal(1);

  readonly codes = signal<HsnSacCode[]>([]);
  readonly total = signal(0);
  readonly isLoading = signal(false);
  readonly totalPages = computed(() => Math.ceil(this.total() / 20));

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(350), takeUntilDestroyed())
      .subscribe(() => this.loadCodes());

    // Initial load
    this.loadCodes();
  }

  onSearchChange(_: string) {
    this.currentPage.set(1);
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch() {
    this.searchQuery = '';
    this.currentPage.set(1);
    this.loadCodes();
  }

  setType(type: 'HSN' | 'SAC' | null) {
    this.selectedType.set(type);
    this.currentPage.set(1);
    this.loadCodes();
  }

  setRate(rate: number | null) {
    this.selectedRate.set(rate);
    this.currentPage.set(1);
    this.loadCodes();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadCodes();
  }

  reset() {
    this.searchQuery = '';
    this.selectedType.set(null);
    this.selectedRate.set(null);
    this.currentPage.set(1);
    this.loadCodes();
  }

  private loadCodes() {
    this.isLoading.set(true);
    this.gstService
      .searchHsnSac({
        q: this.searchQuery || undefined,
        type: this.selectedType() ?? undefined,
        rate: this.selectedRate() ?? undefined,
        page: this.currentPage(),
        limit: 20,
      })
      .subscribe({
        next: (res) => {
          this.codes.set((res as any).data ?? []);
          this.total.set((res as any).meta?.total ?? (res as any).data?.length ?? 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toast.error('Failed to load HSN/SAC codes');
        },
      });
  }
}
