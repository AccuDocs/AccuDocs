import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowDownTraySolid,
  heroArrowPathSolid,
  heroArrowUpTraySolid,
  heroBookOpenSolid,
  heroCheckCircleSolid,
  heroChevronLeftSolid,
  heroChevronRightSolid,
  heroCloudArrowUpSolid,
  heroFunnelSolid,
  heroMagnifyingGlassSolid,
  heroSparklesSolid,
  heroXMarkSolid,
} from '@ng-icons/heroicons/solid';
import { HotToastService } from '@ngneat/hot-toast';
import { debounceTime, Subject } from 'rxjs';
import { GstExtendedService, HsnSacCode } from '@core/services/gst-extended.service';

const GST_RATES = [0, 0.25, 1, 1.5, 3, 5, 6, 7.5, 9, 12, 13.8, 14, 18, 28];
const PAGE_SIZE = 20;

@Component({
  selector: 'app-hsn-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      heroArrowDownTraySolid,
      heroArrowPathSolid,
      heroArrowUpTraySolid,
      heroBookOpenSolid,
      heroCheckCircleSolid,
      heroChevronLeftSolid,
      heroChevronRightSolid,
      heroCloudArrowUpSolid,
      heroFunnelSolid,
      heroMagnifyingGlassSolid,
      heroSparklesSolid,
      heroXMarkSolid,
    }),
  ],
  template: `
    <div class="w-full min-w-0 animate-in fade-in duration-500" [class.px-6]="!isPicker" [class.pb-8]="!isPicker" [class.pt-4]="!isPicker">
      <div class="space-y-5" [class.max-w-[1560px]]="!isPicker">
        @if (!isPicker) {
          <section class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div class="relative flex flex-col gap-6 p-6 xl:flex-row xl:items-center xl:justify-between">
              <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98),rgba(239,246,255,0.72))]"></div>

              <div class="relative max-w-4xl">
                <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                  <ng-icon name="heroBookOpenSolid" size="14"></ng-icon>
                  GST code search
                </div>
                <h1 class="text-3xl font-black tracking-tight text-slate-950 xl:text-[2.6rem]">Search HSN/SAC Tax Rates</h1>
                <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Search by code, description, chapter, goods, or service keywords, validate GST rates,
                  and reuse the selected classification across billing, inventory, and return workflows.
                </p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                    Search by code or description
                  </span>
                  <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                    Numeric codes can refresh live
                  </span>
                  <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                    Export current results
                  </span>
                </div>
              </div>

              <div class="relative flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  (click)="downloadTemplate()"
                  class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <ng-icon name="heroArrowDownTraySolid" size="16"></ng-icon>
                  Sample CSV
                </button>
                <button
                  type="button"
                  (click)="exportVisible()"
                  [disabled]="codes().length === 0"
                  class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ng-icon name="heroArrowDownTraySolid" size="16"></ng-icon>
                  Export visible
                </button>
                <button
                  type="button"
                  (click)="toggleLiveMode()"
                  class="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black shadow-sm transition"
                  [ngClass]="liveMode()
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'"
                  title="When enabled, numeric code searches can refresh from the public directory"
                >
                  <ng-icon name="heroCloudArrowUpSolid" size="16"></ng-icon>
                  {{ liveMode() ? 'Live auto on' : 'Live auto off' }}
                </button>
                <button
                  type="button"
                  (click)="syncVisibleLive()"
                  [disabled]="liveSyncing() || codes().length === 0"
                  class="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  @if (liveSyncing()) {
                    <ng-icon name="heroArrowPathSolid" size="16" class="animate-spin"></ng-icon>
                    Syncing
                  } @else {
                    <ng-icon name="heroArrowPathSolid" size="16"></ng-icon>
                    Sync visible live
                  }
                </button>
                <button
                  type="button"
                  (click)="triggerImport()"
                  [disabled]="importing()"
                  class="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  @if (importing()) {
                    <ng-icon name="heroArrowPathSolid" size="16" class="animate-spin"></ng-icon>
                    Importing
                  } @else {
                    <ng-icon name="heroArrowUpTraySolid" size="16"></ng-icon>
                    Bulk import
                  }
                </button>
                <input id="hsn-sac-file-input" type="file" (change)="onFileSelected($event)" accept=".xlsx,.xls,.csv" class="hidden" />
              </div>
            </div>
          </section>

          <section class="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total records</p>
              <strong class="mt-3 block text-4xl font-black tracking-tight text-slate-950">{{ total() | number }}</strong>
              <p class="mt-2 text-xs font-semibold text-slate-500">Directory rows available in local cache</p>
            </article>
            <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Visible HSN</p>
              <strong class="mt-3 block text-4xl font-black tracking-tight text-slate-950">{{ visibleHsnCount() }}</strong>
              <p class="mt-2 text-xs font-semibold text-slate-500">Goods codes in the current page result</p>
            </article>
            <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Visible SAC</p>
              <strong class="mt-3 block text-4xl font-black tracking-tight text-slate-950">{{ visibleSacCount() }}</strong>
              <p class="mt-2 text-xs font-semibold text-slate-500">Service codes in the current page result</p>
            </article>
            <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Most common rate</p>
              <strong class="mt-3 block text-4xl font-black tracking-tight text-slate-950">{{ topVisibleRate() }}</strong>
              <p class="mt-2 text-xs font-semibold text-slate-500">Common GST rate across visible rows</p>
            </article>
          </section>
        }

        <section class="grid gap-5" [class.xl:grid-cols-[minmax(0,1fr)_340px]]="!isPicker">
          <main class="space-y-5">
            <section class="rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div class="border-b border-slate-100 px-5 py-4">
                <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Directory filters</p>
                    <h2 class="mt-1 text-2xl font-black tracking-tight text-slate-950">Find the right classification fast</h2>
                    <p class="mt-1 text-sm text-slate-500">
                      Search the cached directory first. If you enter a numeric code, you can refresh that code from the public source before using it.
                    </p>
                  </div>

                  @if (!isPicker) {
                    <div class="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 xl:max-w-sm">
                      Search by HSN code, SAC code, chapter, or description terms like "consulting", "laptop", or "medicaments".
                    </div>
                  }
                </div>
              </div>

              <div class="space-y-5 p-5">
                <div class="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <label class="relative block min-w-0 flex-1">
                    <ng-icon name="heroMagnifyingGlassSolid" size="17" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></ng-icon>
                    <input
                      id="hsn-search-input"
                      type="search"
                      [ngModel]="searchQuery()"
                      (ngModelChange)="onSearchChange($event)"
                      placeholder="Search code, description, chapter, goods, service..."
                      class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-32 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />

                    <div class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                      @if (searchQuery()) {
                        <button
                          type="button"
                          (click)="clearSearch()"
                          class="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-500 transition hover:bg-slate-50"
                        >
                          <ng-icon name="heroXMarkSolid" size="14"></ng-icon>
                        </button>
                      }
                      @if (canSearchOnline()) {
                        <button
                          type="button"
                          (click)="searchOnline()"
                          [disabled]="isSearchingOnline()"
                          class="inline-flex h-8 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ng-icon name="heroCloudArrowUpSolid" size="14"></ng-icon>
                          {{ isSearchingOnline() ? 'Fetching...' : 'Fetch live' }}
                        </button>
                      }
                    </div>
                  </label>

                  @if (activeFilterCount() > 0) {
                    <button
                      type="button"
                      (click)="reset()"
                      class="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                      <ng-icon name="heroXMarkSolid" size="15"></ng-icon>
                      Reset {{ activeFilterCount() }} filter{{ activeFilterCount() === 1 ? '' : 's' }}
                    </button>
                  }
                </div>

                <div class="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div class="space-y-3">
                    <div class="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      <ng-icon name="heroFunnelSolid" size="14"></ng-icon>
                      Type
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        (click)="setType(null)"
                        class="rounded-full px-4 py-2 text-sm font-black transition"
                        [ngClass]="selectedType() === null ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        (click)="setType('HSN')"
                        class="rounded-full px-4 py-2 text-sm font-black transition"
                        [ngClass]="selectedType() === 'HSN' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                      >
                        HSN goods
                      </button>
                      <button
                        type="button"
                        (click)="setType('SAC')"
                        class="rounded-full px-4 py-2 text-sm font-black transition"
                        [ngClass]="selectedType() === 'SAC' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                      >
                        SAC services
                      </button>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <div class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">GST rate</div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        (click)="setRate(null)"
                        class="rounded-full px-4 py-2 text-sm font-black transition"
                        [ngClass]="selectedRate() === null ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                      >
                        Any rate
                      </button>
                      @for (rate of gstRates; track rate) {
                        <button
                          type="button"
                          (click)="setRate(rate)"
                          class="rounded-full px-4 py-2 text-sm font-black transition"
                          [ngClass]="selectedRate() === rate ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                        >
                          {{ rate }}%
                        </button>
                      }
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Quick search</span>
                  <button type="button" (click)="quickSearch('accounting services')" class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Accounting services</button>
                  <button type="button" (click)="quickSearch('laptop')" class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Laptop</button>
                  <button type="button" (click)="quickSearch('consulting')" class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Consulting</button>
                  <button type="button" (click)="quickSearch('medicaments')" class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Medicaments</button>
                </div>
              </div>
            </section>

            <section class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div class="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 class="text-xl font-black tracking-tight text-slate-950">Directory records</h2>
                  <p class="mt-1 text-sm font-semibold text-slate-500">
                    {{ codes().length }} visible of {{ total() | number }} total records
                    @if (lastLiveSyncAt()) {
                      · last live sync {{ lastLiveSyncAt() }}
                    }
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <span class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]" [ngClass]="liveMode() ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                    {{ liveMode() ? 'Live search enabled' : 'Local cache mode' }}
                  </span>
                  @if (selectedType()) {
                    <span class="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">{{ selectedType() }}</span>
                  }
                  @if (selectedRate() !== null) {
                    <span class="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">{{ selectedRate() }}%</span>
                  }
                </div>
              </div>

              @if (isLoading()) {
                <div class="space-y-3 p-5">
                  @for (row of [1,2,3,4,5,6]; track row) {
                    <div class="h-16 animate-pulse rounded-2xl bg-slate-100"></div>
                  }
                </div>
              } @else if (codes().length === 0) {
                <div class="px-6 py-16 text-center">
                  <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                    <ng-icon name="heroBookOpenSolid" size="30"></ng-icon>
                  </div>
                  <h3 class="mt-4 text-lg font-black text-slate-900">No HSN/SAC codes found</h3>
                  <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Try a shorter keyword, clear some filters, or enter a numeric HSN/SAC code and fetch it live from the public directory.
                  </p>
                  <div class="mt-6 flex flex-wrap justify-center gap-3">
                    <button type="button" (click)="reset()" class="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                      Clear filters
                    </button>
                    @if (canSearchOnline()) {
                      <button type="button" (click)="searchOnline()" [disabled]="isSearchingOnline()" class="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                        Fetch live
                      </button>
                    }
                  </div>
                </div>
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[1040px] text-left">
                    <thead class="bg-slate-50 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th class="px-4 py-3">Code</th>
                        <th class="px-4 py-3">Description</th>
                        <th class="px-4 py-3">Type</th>
                        <th class="px-4 py-3">GST rate</th>
                        <th class="px-4 py-3">Chapter</th>
                        <th class="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (code of codes(); track code.id) {
                        <tr
                          class="transition"
                          [ngClass]="{
                            'hover:bg-blue-50/40': true,
                            'bg-blue-50/60': selectedCode()?.id === code.id,
                            'cursor-pointer': isPicker
                          }"
                          (click)="onRowClick(code)"
                        >
                          <td class="px-4 py-4">
                            <button
                              type="button"
                              (click)="copyCode(code); $event.stopPropagation()"
                              class="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                            >
                              {{ code.code }}
                            </button>
                          </td>
                          <td class="px-4 py-4">
                            <div class="max-w-[620px]">
                              <div class="text-sm font-black leading-6 text-slate-900">{{ code.description }}</div>
                              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                                <span>{{ code.type === 'HSN' ? 'Goods classification' : 'Service classification' }}</span>
                                <span>Chapter {{ chapterLabel(code) }}</span>
                                @if (isPicker) {
                                  <span>Click row to select</span>
                                }
                              </div>
                            </div>
                          </td>
                          <td class="px-4 py-4">
                            <span class="inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em]" [ngClass]="code.type === 'HSN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
                              {{ code.type }}
                            </span>
                          </td>
                          <td class="px-4 py-4">
                            <span class="inline-flex rounded-full px-3 py-1 text-xs font-black" [ngClass]="rateClass(code.gstRate)">
                              {{ code.gstRate }}%
                            </span>
                          </td>
                          <td class="px-4 py-4 text-sm font-bold text-slate-600">{{ chapterLabel(code) }}</td>
                          <td class="px-4 py-4 text-right">
                            <div class="flex justify-end gap-2">
                              <button
                                type="button"
                                (click)="selectCode(code); $event.stopPropagation()"
                                class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              >
                                {{ isPicker ? 'Select' : 'View' }}
                              </button>
                              <button
                                type="button"
                                (click)="copyCode(code); $event.stopPropagation()"
                                class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              >
                                Copy
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>

            @if (totalPages() > 1) {
              <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div class="text-sm font-semibold text-slate-500">Page {{ currentPage() }} of {{ totalPages() }}</div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="goToPage(currentPage() - 1)"
                    [disabled]="currentPage() === 1"
                    class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ng-icon name="heroChevronLeftSolid" size="16"></ng-icon>
                  </button>
                  <button
                    type="button"
                    (click)="goToPage(currentPage() + 1)"
                    [disabled]="currentPage() === totalPages()"
                    class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ng-icon name="heroChevronRightSolid" size="16"></ng-icon>
                  </button>
                </div>
              </div>
            }
          </main>

          @if (!isPicker) {
            <aside class="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Selected code</p>
                    <h2 class="mt-1 text-xl font-black tracking-tight text-slate-950">{{ selectedCode()?.code || 'No selection' }}</h2>
                  </div>
                  @if (selectedCode()) {
                    <span class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]" [ngClass]="selectedCode()!.type === 'HSN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
                      {{ selectedCode()!.type }}
                    </span>
                  }
                </div>

                @if (selectedCode(); as code) {
                  <p class="mt-4 text-sm leading-6 text-slate-600">{{ code.description }}</p>

                  <div class="mt-5 grid grid-cols-2 gap-3">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">GST rate</p>
                      <p class="mt-2 text-lg font-black text-slate-950">{{ code.gstRate }}%</p>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Chapter</p>
                      <p class="mt-2 text-lg font-black text-slate-950">{{ chapterLabel(code) }}</p>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Status</p>
                      <p class="mt-2 text-lg font-black text-slate-950">{{ code.isActive ? 'Active' : 'Inactive' }}</p>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Directory</p>
                      <p class="mt-2 text-lg font-black text-slate-950">{{ code.type === 'HSN' ? 'Goods' : 'Services' }}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    (click)="copyCode(code)"
                    class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    <ng-icon name="heroCheckCircleSolid" size="16"></ng-icon>
                    {{ copiedCode() === code.id ? 'Copied' : 'Copy code details' }}
                  </button>
                } @else {
                  <p class="mt-4 text-sm leading-6 text-slate-500">Select a code from the table to preview its tax classification details here.</p>
                }
              </section>

              <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">GST portal style guidance</p>
                <div class="mt-4 space-y-4">
                  <div class="flex items-start gap-3">
                    <div class="mt-0.5 text-blue-600"><ng-icon name="heroSparklesSolid" size="16"></ng-icon></div>
                    <div>
                      <h3 class="text-sm font-black text-slate-900">Search by code or description</h3>
                      <p class="mt-1 text-sm leading-6 text-slate-500">Use numeric HSN/SAC codes when you know the exact classification, or broad keywords to explore matching goods and services.</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    <div class="mt-0.5 text-blue-600"><ng-icon name="heroSparklesSolid" size="16"></ng-icon></div>
                    <div>
                      <h3 class="text-sm font-black text-slate-900">Fetch live for numeric codes</h3>
                      <p class="mt-1 text-sm leading-6 text-slate-500">If the code is not in local cache yet, enter the numeric code and use live fetch to refresh it from the public directory.</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    <div class="mt-0.5 text-blue-600"><ng-icon name="heroSparklesSolid" size="16"></ng-icon></div>
                    <div>
                      <h3 class="text-sm font-black text-slate-900">Export the current result set</h3>
                      <p class="mt-1 text-sm leading-6 text-slate-500">Once you refine the filters, export the visible rows and share the final shortlist with the billing or inventory team.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live directory status</p>
                <h3 class="mt-2 text-xl font-black tracking-tight text-slate-950">{{ liveMode() ? 'Auto live refresh enabled' : 'Local cache mode' }}</h3>
                <p class="mt-2 text-sm leading-6 text-slate-500">
                  Numeric code searches can refresh from the public directory before results are shown. Use visible sync to refresh the records already on this page.
                </p>

                <div class="mt-4 grid grid-cols-2 gap-3">
                  <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Provider</p>
                    <p class="mt-2 text-sm font-black text-slate-950">Public directory cache</p>
                  </div>
                  <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Last sync</p>
                    <p class="mt-2 text-sm font-black text-slate-950">{{ lastLiveSyncAt() || 'Not synced yet' }}</p>
                  </div>
                </div>

                @if (liveSyncSummary()) {
                  <div class="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
                    {{ liveSyncSummary() }}
                  </div>
                }

                <button
                  type="button"
                  (click)="syncVisibleLive()"
                  [disabled]="liveSyncing() || codes().length === 0"
                  class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ng-icon name="heroArrowPathSolid" size="16" [class.animate-spin]="liveSyncing()"></ng-icon>
                  {{ liveSyncing() ? 'Syncing live data...' : 'Refresh visible codes live' }}
                </button>
              </section>
            </aside>
          }
        </section>
      </div>
    </div>
  `,
})
export class HsnDirectoryComponent {
  @Input() isPicker = false;
  @Output() select = new EventEmitter<HsnSacCode>();

  private readonly gstService = inject(GstExtendedService);
  private readonly toast = inject(HotToastService);

  readonly gstRates = GST_RATES;

  readonly searchQuery = signal('');
  readonly selectedType = signal<'HSN' | 'SAC' | null>(null);
  readonly selectedRate = signal<number | null>(null);
  readonly currentPage = signal(1);

  readonly codes = signal<HsnSacCode[]>([]);
  readonly total = signal(0);
  readonly isLoading = signal(false);
  readonly importing = signal(false);
  readonly isSearchingOnline = signal(false);
  readonly selectedCode = signal<HsnSacCode | null>(null);
  readonly copiedCode = signal<string | null>(null);
  readonly liveMode = signal(true);
  readonly liveSyncing = signal(false);
  readonly lastLiveSyncAt = signal<string | null>(null);
  readonly liveSyncSummary = signal<string | null>(null);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  readonly visibleHsnCount = computed(() => this.codes().filter((code) => code.type === 'HSN').length);
  readonly visibleSacCount = computed(() => this.codes().filter((code) => code.type === 'SAC').length);
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchQuery().trim()) count += 1;
    if (this.selectedType()) count += 1;
    if (this.selectedRate() !== null) count += 1;
    return count;
  });
  readonly topVisibleRate = computed(() => {
    const counts = new Map<number, number>();

    for (const code of this.codes()) {
      counts.set(code.gstRate, (counts.get(code.gstRate) ?? 0) + 1);
    }

    let bestRate: number | null = null;
    let bestCount = 0;

    counts.forEach((count, rate) => {
      if (count > bestCount) {
        bestCount = count;
        bestRate = rate;
      }
    });

    if (bestRate === null) return '-';
    const rate = Number(bestRate);
    return `${Number.isInteger(rate) ? rate.toFixed(0) : rate}%`;
  });

  readonly canSearchOnline = computed(() => {
    const query = this.searchQuery().trim();
    return query.length >= 4 && /^\d+$/.test(query);
  });

  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(350), takeUntilDestroyed())
      .subscribe(() => this.loadCodes());

    this.loadCodes();
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadCodes();
  }

  setType(type: 'HSN' | 'SAC' | null): void {
    this.selectedType.set(type);
    this.currentPage.set(1);
    this.loadCodes();
  }

  setRate(rate: number | null): void {
    this.selectedRate.set(rate);
    this.currentPage.set(1);
    this.loadCodes();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadCodes();
  }

  triggerImport(): void {
    const input = document.getElementById('hsn-sac-file-input') as HTMLInputElement | null;
    input?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importing.set(true);
    const toastRef = this.toast.loading('Importing HSN/SAC directory...', { duration: 0 });

    this.gstService.importHsnSacExcel(file).subscribe({
      next: (response: any) => {
        this.importing.set(false);
        toastRef.close();
        this.toast.success(`Successfully imported ${response.data?.succeeded ?? 0} code(s)`);
        this.loadData();
        input.value = '';
      },
      error: (error: any) => {
        this.importing.set(false);
        toastRef.close();
        this.toast.error(`Import failed: ${error.error?.message || error.message}`);
        input.value = '';
      },
    });
  }

  searchOnline(): void {
    const code = this.searchQuery().trim();
    if (!code) return;

    this.isSearchingOnline.set(true);
    const toastRef = this.toast.loading('Searching public HSN/SAC directory...', { duration: 0 });

    this.gstService.lookupOnlineHsn(code).subscribe({
      next: (response: any) => {
        this.isSearchingOnline.set(false);
        toastRef.close();
        this.toast.success(`Found and saved: ${(response.data?.description ?? code).substring(0, 50)}`);
        this.lastLiveSyncAt.set(this.formatLiveTime(new Date()));
        this.liveSyncSummary.set(`Code ${code} refreshed from the live provider.`);
        this.loadCodes();
      },
      error: (error: any) => {
        this.isSearchingOnline.set(false);
        toastRef.close();
        this.toast.error(error.error?.message || 'Code not found in public directory.');
      },
    });
  }

  toggleLiveMode(): void {
    this.liveMode.update((value) => !value);
    this.toast.success(this.liveMode() ? 'Live auto-refresh enabled for numeric searches' : 'Using local HSN/SAC cache');
    this.loadCodes();
  }

  syncVisibleLive(): void {
    const visibleCodes = this.codes().map((code) => code.code);
    if (visibleCodes.length === 0) return;

    this.liveSyncing.set(true);
    const toastRef = this.toast.loading('Refreshing visible HSN/SAC codes from live provider...', { duration: 0 });

    this.gstService.syncLiveHsnSac(visibleCodes).subscribe({
      next: (response) => {
        this.liveSyncing.set(false);
        toastRef.close();

        const result = response.data;
        this.lastLiveSyncAt.set(this.formatLiveTime(new Date(result?.refreshedAt || Date.now())));
        this.liveSyncSummary.set(`${result?.succeeded ?? 0} updated, ${result?.notFound ?? 0} not found, ${result?.failed ?? 0} failed.`);

        if ((result?.succeeded ?? 0) > 0) {
          this.toast.success(`Live sync updated ${result?.succeeded} code(s)`);
        } else if ((result?.failed ?? 0) > 0) {
          const message = result?.results?.find((item) => item.status === 'failed')?.message || 'Live provider unavailable';
          this.toast.error(message);
        } else {
          this.toast.info('No visible codes were updated from live provider');
        }

        this.loadCodes();
      },
      error: (error) => {
        this.liveSyncing.set(false);
        toastRef.close();
        this.toast.error(error.error?.message || 'Live sync failed');
      },
    });
  }

  loadData(): void {
    this.searchQuery.set('');
    this.selectedType.set(null);
    this.selectedRate.set(null);
    this.currentPage.set(1);
    this.loadCodes();
  }

  reset(): void {
    this.loadData();
  }

  quickSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.loadCodes();
  }

  onRowClick(code: HsnSacCode): void {
    this.selectCode(code);
  }

  selectCode(code: HsnSacCode): void {
    this.selectedCode.set(code);
    if (this.isPicker) {
      this.select.emit(code);
    }
  }

  copyCode(code: HsnSacCode): void {
    const text = `${code.code} - ${code.description} | ${code.type} | GST ${code.gstRate}% | Chapter ${this.chapterLabel(code)}`;
    this.copyToClipboard(text, `Copied ${code.code}`);
    this.copiedCode.set(code.id);
    window.setTimeout(() => this.copiedCode.set(null), 1400);
  }

  downloadTemplate(): void {
    const rows = [
      ['Code', 'Description', 'Type', 'GST Rate (%)', 'Chapter', 'Status', 'Directory'],
      ['0101', 'Live horses', 'Goods', '0', '1', 'Active', 'Goods'],
      ['8471', 'Automatic data processing machines', 'Goods', '18', '84', 'Active', 'Goods'],
      ['9982', 'Legal and accounting services', 'Services', '18', '99', 'Active', 'Services'],
    ];
    this.downloadCsv('hsn-sac-import-template.csv', rows);
  }

  exportVisible(): void {
    if (this.codes().length === 0) return;

    const rows = [
      ['Code', 'Description', 'Type', 'GST Rate (%)', 'Chapter', 'Status', 'Directory'],
      ...this.codes().map((code) => [
        code.code,
        code.description,
        code.type === 'HSN' ? 'Goods' : 'Services',
        String(code.gstRate),
        this.chapterLabel(code),
        code.isActive ? 'Active' : 'Inactive',
        code.type === 'HSN' ? 'Goods' : 'Services',
      ]),
    ];

    this.downloadCsv('hsn-sac-visible-codes.csv', rows);
  }

  chapterLabel(code: HsnSacCode): string {
    return code.chapter || code.code?.slice(0, 2) || '-';
  }

  rateClass(rate: number): string {
    if (rate === 0) return 'bg-slate-100 text-slate-600';
    if (rate <= 5) return 'bg-emerald-100 text-emerald-700';
    if (rate <= 12) return 'bg-blue-100 text-blue-700';
    if (rate < 18) return 'bg-violet-100 text-violet-700';
    return 'bg-rose-100 text-rose-700';
  }

  private loadCodes(): void {
    this.isLoading.set(true);

    this.gstService
      .searchHsnSac({
        q: this.searchQuery().trim() || undefined,
        type: this.selectedType() ?? undefined,
        rate: this.selectedRate() ?? undefined,
        page: this.currentPage(),
        limit: PAGE_SIZE,
        live: this.liveMode(),
      })
      .subscribe({
        next: (response) => {
          const rows = (response as any).data ?? [];
          this.codes.set(rows);
          this.total.set((response as any).meta?.total ?? rows.length ?? 0);
          this.isLoading.set(false);

          if (!this.isPicker) {
            const selected = this.selectedCode();
            if (!selected || !rows.some((code: HsnSacCode) => code.id === selected.id)) {
              this.selectedCode.set(rows[0] ?? null);
            }
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.toast.error('Failed to load HSN/SAC codes');
        },
      });
  }

  private copyToClipboard(text: string, successMessage: string): void {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => this.toast.success(successMessage))
        .catch(() => this.fallbackCopy(text, successMessage));
      return;
    }

    this.fallbackCopy(text, successMessage);
  }

  private fallbackCopy(text: string, successMessage: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    this.toast.success(successMessage);
  }

  private downloadCsv(filename: string, rows: string[][]): void {
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private formatLiveTime(date: Date): string {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
