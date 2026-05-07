import { Component, inject, signal, OnInit, OnDestroy, computed, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroClipboardDocumentCheckSolid,
  heroRocketLaunchSolid,
  heroCheckCircleSolid,
  heroClockSolid,
  heroExclamationTriangleSolid,
  heroMagnifyingGlassSolid,
  heroChevronLeftSolid,
  heroChevronRightSolid,
  heroXMarkSolid,
  heroSparklesSolid,
  heroBoltSolid,
  heroUsersSolid,
  heroCheckSolid,
} from '@ng-icons/heroicons/solid';
import { ChecklistService, ChecklistTemplate } from '@core/services/checklist.service';
import { ClientService, Client } from '@core/services/client.service';

@Component({
  selector: 'app-checklists-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  template: `
    <div class="min-h-full w-full space-y-5 px-6 pb-8 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
        <div class="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_34%),linear-gradient(135deg,rgba(248,250,252,0.98),rgba(239,246,255,0.72))] dark:bg-none"></div>
          <div class="relative max-w-3xl">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              <ng-icon name="heroClipboardDocumentCheckSolid" size="14"></ng-icon>
              Compliance operations
            </div>
            <h1 class="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Document Checklist Control Center</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Track every client document request, pending upload, reminder, due date, and compliance handoff from one clean workspace.
            </p>
            <div class="mt-5 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              <div class="rounded-2xl bg-white/85 p-3 ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:ring-slate-700">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Visible</div>
                <div class="mt-1 text-xl font-black text-slate-950 dark:text-white">{{ visibleChecklists().length }}</div>
              </div>
              <div class="rounded-2xl bg-white/85 p-3 ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:ring-slate-700">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg progress</div>
                <div class="mt-1 text-xl font-black text-blue-700 dark:text-blue-300">{{ averageProgress() }}%</div>
              </div>
              <div class="rounded-2xl bg-white/85 p-3 ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:ring-slate-700">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Due soon</div>
                <div class="mt-1 text-xl font-black text-amber-600">{{ dueSoonCount() }}</div>
              </div>
              <div class="rounded-2xl bg-white/85 p-3 ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:ring-slate-700">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Overdue</div>
                <div class="mt-1 text-xl font-black text-rose-600">{{ visibleOverdueCount() }}</div>
              </div>
            </div>
          </div>

          <div class="relative flex flex-wrap items-center gap-3">
            <button
              type="button"
              (click)="loadChecklists(); loadStats()"
              class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <ng-icon name="heroClockSolid" size="16"></ng-icon>
              Refresh
            </button>
            <button
              type="button"
              (click)="openBulkModal()"
              class="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.98]"
            >
              <ng-icon name="heroRocketLaunchSolid" size="17"></ng-icon>
              Bulk Assign Checklist
            </button>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-2 gap-4 xl:grid-cols-4">
        @for (stat of statCards(); track stat.label) {
          <article class="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-700/50 dark:bg-slate-900 dark:hover:shadow-slate-950/40">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{{ stat.label }}</p>
                <strong class="mt-2 block text-3xl font-black text-slate-950 dark:text-white">{{ stat.value }}</strong>
              </div>
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl transition group-hover:scale-105" [style.background]="stat.bg">
                <ng-icon [name]="stat.icon" size="19" [style.color]="stat.color"></ng-icon>
              </div>
            </div>
            <p class="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{{ statHelper(stat.label) }}</p>
          </article>
        }
      </section>

      <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main class="space-y-5">
          <section class="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div class="relative min-w-0 flex-1">
                <ng-icon name="heroMagnifyingGlassSolid" size="17" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></ng-icon>
                <input
                  type="text"
                  [(ngModel)]="filters.search"
                  (ngModelChange)="onSearchChange()"
                  placeholder="Search by client, checklist, service type, FY, or code..."
                  class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-950"
                />
              </div>

              <select
                [(ngModel)]="filters.financialYear"
                (ngModelChange)="onFilterChange()"
                class="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All Years</option>
                @for (year of fyYears; track year) {
                  <option [value]="year">{{ year }}</option>
                }
              </select>

              <select
                [(ngModel)]="filters.status"
                (ngModelChange)="onFilterChange()"
                class="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>

              @if (hasActiveFilters()) {
                <button
                  type="button"
                  (click)="clearFilters()"
                  class="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Clear filters
                </button>
              }
            </div>
          </section>

          <section class="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
            <div class="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-lg font-black text-slate-950 dark:text-white">Client document requests</h2>
                <p class="mt-1 text-xs font-semibold text-slate-500">
                  Showing {{ visibleChecklists().length }} visible row(s) from {{ totalCount() || checklists().length }} total assignment(s)
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">Upload links</span>
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">ZIP export</span>
                <span class="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Reminders</span>
              </div>
            </div>

            @if (loading()) {
              <div class="space-y-3 p-6">
                @for (i of [1,2,3,4,5]; track i) {
                  <div class="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"></div>
                }
              </div>
            } @else if (visibleChecklists().length === 0) {
              <div class="flex flex-col items-center justify-center px-4 py-16 text-center">
                <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                  <ng-icon name="heroClipboardDocumentCheckSolid" size="30"></ng-icon>
                </div>
                <h3 class="text-lg font-black text-slate-950 dark:text-white">{{ checklists().length ? 'No matching checklists' : 'No checklists yet' }}</h3>
                <p class="mt-2 max-w-md text-sm text-slate-500">
                  {{ checklists().length ? 'Try a different search or clear filters.' : 'Use Bulk Assign Checklist to create document requests for selected clients.' }}
                </p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full min-w-[1040px] text-sm">
                  <thead class="bg-slate-50/80 dark:bg-slate-800/60">
                    <tr>
                      <th class="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Client</th>
                      <th class="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Checklist</th>
                      <th class="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Workflow</th>
                      <th class="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Progress</th>
                      <th class="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Due health</th>
                      <th class="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (cl of visibleChecklists(); track cl.id) {
                      <tr class="border-t border-slate-100 transition hover:bg-blue-50/40 dark:border-slate-800 dark:hover:bg-slate-800/70">
                        <td class="px-5 py-4">
                          <button type="button" class="flex items-center gap-3 text-left" (click)="goToChecklist(cl)">
                            <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                              {{ getClientInitials(cl) }}
                            </span>
                            <span class="min-w-0">
                              <span class="block truncate font-black text-slate-950 dark:text-white">{{ getClientName(cl) }}</span>
                              <span class="mt-0.5 block font-mono text-[11px] font-semibold text-slate-400">{{ getClientCode(cl) || 'No code' }}</span>
                            </span>
                          </button>
                        </td>
                        <td class="px-5 py-4">
                          <button type="button" class="block max-w-[320px] text-left" (click)="goToChecklist(cl)">
                            <span class="block truncate font-black text-slate-800 dark:text-slate-100">{{ cl.name }}</span>
                            <span class="mt-1 block text-xs font-semibold text-slate-500">FY {{ cl.financialYear }} - {{ cl.receivedItems || 0 }}/{{ cl.totalItems || 0 }} documents received</span>
                          </button>
                        </td>
                        <td class="px-5 py-4">
                          <div class="flex flex-col items-start gap-2">
                            <span class="inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest" [ngClass]="serviceTone(cl.serviceType)">
                              {{ cl.serviceType || 'general' }}
                            </span>
                            <span class="inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest" [ngClass]="statusTone(cl.status)">
                              {{ statusLabel(cl.status) }}
                            </span>
                          </div>
                        </td>
                        <td class="px-5 py-4">
                          <div class="min-w-[190px]">
                            <div class="mb-2 flex items-center justify-between">
                              <span class="text-xs font-black text-slate-600 dark:text-slate-300">{{ cl.progress || 0 }}%</span>
                              <span class="text-[11px] font-bold text-slate-400">{{ progressLabel(cl.progress || 0) }}</span>
                            </div>
                            <div class="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div class="h-full rounded-full transition-all duration-700" [style.width.%]="cl.progress || 0" [ngClass]="progressTone(cl.progress || 0)"></div>
                            </div>
                          </div>
                        </td>
                        <td class="px-5 py-4">
                          @if (cl.dueDate) {
                            <div class="flex flex-col gap-1">
                              <span class="text-sm font-black" [ngClass]="isOverdue(cl) ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'">{{ cl.dueDate | date:'dd MMM yyyy' }}</span>
                              <span class="text-xs font-semibold" [ngClass]="dueTone(cl)">{{ dueMeta(cl) }}</span>
                            </div>
                          } @else {
                            <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-400 dark:bg-slate-800">No due date</span>
                          }
                        </td>
                        <td class="px-5 py-4">
                          <div class="flex flex-wrap items-center justify-end gap-2" (click)="$event.stopPropagation()">
                            <button type="button" (click)="goToChecklist(cl)" class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300">
                              Open
                            </button>
                            <button type="button" (click)="generateLink(cl)" class="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
                              Link
                            </button>
                            @if ((cl.receivedItems || 0) > 0) {
                              <button type="button" (click)="downloadAll(cl)" class="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                                ZIP
                              </button>
                            }
                            @if (cl.status === 'active' && (cl.progress || 0) < 100) {
                              <button type="button" (click)="sendReminder(cl)" class="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
                                Remind
                              </button>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <span class="text-xs font-semibold text-slate-500">
                  Showing {{ displayRangeStart() }} to {{ displayRangeEnd() }} of {{ totalCount() || visibleChecklists().length }}
                </span>
                <div class="flex items-center gap-1">
                  <button
                    [disabled]="pagination.page <= 1"
                    (click)="pagination.page = pagination.page - 1; loadChecklists()"
                    class="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    <ng-icon name="heroChevronLeftSolid" size="17"></ng-icon>
                  </button>
                  <span class="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{{ pagination.page }}</span>
                  <button
                    [disabled]="pagination.page * pagination.limit >= totalCount()"
                    (click)="pagination.page = pagination.page + 1; loadChecklists()"
                    class="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    <ng-icon name="heroChevronRightSolid" size="17"></ng-icon>
                  </button>
                </div>
              </div>
            }
          </section>
        </main>

        <aside class="space-y-5">
          <section class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
            <div class="mb-4 flex items-center justify-between">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Compliance health</p>
                <h3 class="mt-1 text-lg font-black text-slate-950 dark:text-white">Today's focus</h3>
              </div>
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <ng-icon name="heroBoltSolid" size="19"></ng-icon>
              </div>
            </div>
            <div class="space-y-3">
              <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-bold text-slate-600 dark:text-slate-300">Average completion</span>
                  <strong class="text-slate-950 dark:text-white">{{ averageProgress() }}%</strong>
                </div>
                <div class="mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-900">
                  <div class="h-full rounded-full bg-blue-600" [style.width.%]="averageProgress()"></div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-2xl bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <span class="text-[10px] font-black uppercase tracking-widest">Due soon</span>
                  <strong class="mt-1 block text-2xl font-black">{{ dueSoonCount() }}</strong>
                </div>
                <div class="rounded-2xl bg-rose-50 p-4 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                  <span class="text-[10px] font-black uppercase tracking-widest">Overdue</span>
                  <strong class="mt-1 block text-2xl font-black">{{ visibleOverdueCount() }}</strong>
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
            <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Recommended additions</p>
            <h3 class="mt-1 text-lg font-black text-slate-950 dark:text-white">What we can implement next</h3>
            <div class="mt-4 space-y-3">
              @for (idea of upgradeIdeas; track idea.title) {
                <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                  <div class="flex items-start gap-3">
                    <span class="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                      <ng-icon name="heroSparklesSolid" size="15"></ng-icon>
                    </span>
                    <div>
                      <h4 class="text-sm font-black text-slate-900 dark:text-white">{{ idea.title }}</h4>
                      <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">{{ idea.description }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
            <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Template coverage</p>
            <h3 class="mt-1 text-lg font-black text-slate-950 dark:text-white">{{ templates().length }} templates ready</h3>
            <div class="mt-4 space-y-2">
              @for (template of templates().slice(0, 4); track template.id) {
                <div class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-slate-800 dark:text-slate-100">{{ template.name }}</p>
                    <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400">{{ template.serviceType }} - {{ template.items.length || 0 }} items</p>
                  </div>
                </div>
              }
              @if (templates().length === 0) {
                <p class="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:bg-slate-800/70">No templates loaded yet.</p>
              }
            </div>
          </section>
        </aside>
      </section>
    </div>

    <div class="hidden">

      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Checklists</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage document checklists across all clients</p>
        </div>
        <button
          (click)="openBulkModal()"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-blue-800 active:scale-[0.97] transition-all shadow-lg shadow-blue-500/25"
        >
          <ng-icon name="heroRocketLaunchSolid" size="18"></ng-icon>
          Bulk Assign Checklist
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        @for (stat of statCards(); track stat.label) {
          <div
            class="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/30 hover:-translate-y-0.5"
            style="padding: 20px 24px;"
          >
            <div class="flex items-center gap-3 mb-2">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center" [style.background]="stat.bg">
                <ng-icon [name]="stat.icon" size="18" [style.color]="stat.color"></ng-icon>
              </div>
              <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ stat.label }}</span>
            </div>
            <div class="text-2xl font-black text-slate-900 dark:text-white">{{ stat.value }}</div>
          </div>
        }
      </div>

      <!-- Filters Bar -->
      <div class="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
        <div class="relative flex-1 min-w-[200px]">
          <ng-icon name="heroMagnifyingGlassSolid" size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></ng-icon>
          <input
            type="text"
            [(ngModel)]="filters.search"
            (ngModelChange)="onFilterChange()"
            placeholder="Search checklists..."
            class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <select
          [(ngModel)]="filters.financialYear"
          (ngModelChange)="onFilterChange()"
          class="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Years</option>
          @for (year of fyYears; track year) {
            <option [value]="year">{{ year }}</option>
          }
        </select>

        <select
          [(ngModel)]="filters.status"
          (ngModelChange)="onFilterChange()"
          class="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <!-- Checklists Table -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
        @if (loading()) {
          <div class="flex justify-center p-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        } @else if (checklists().length === 0) {
          <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
              <ng-icon name="heroClipboardDocumentCheckSolid" size="28" class="text-blue-500"></ng-icon>
            </div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">No checklists yet</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Use "Bulk Assign Checklist" to create checklists for your clients.
            </p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-100 dark:border-slate-700/50">
                  <th class="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Client</th>
                  <th class="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Checklist</th>
                  <th class="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</th>
                  <th class="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">FY</th>
                  <th class="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Progress</th>
                  <th class="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th class="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Due Date</th>
                  <th class="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (cl of checklists(); track cl.id) {
                  <tr
                    class="border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                    (click)="goToChecklist(cl)"
                  >
                    <td class="px-5 py-3.5">
                      <div class="font-semibold text-slate-900 dark:text-white">{{ getClientName(cl) }}</div>
                      <div class="text-[11px] text-slate-400 font-mono">{{ getClientCode(cl) }}</div>
                    </td>
                    <td class="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">{{ cl.name }}</td>
                    <td class="px-5 py-3.5">
                      <span class="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md"
                        [ngClass]="{
                          'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400': cl.serviceType === 'itr',
                          'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400': cl.serviceType === 'gst',
                          'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400': cl.serviceType === 'audit',
                          'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400': cl.serviceType === 'tds' || cl.serviceType === 'roc'
                        }"
                      >{{ cl.serviceType }}</span>
                    </td>
                    <td class="px-5 py-3.5 text-slate-600 dark:text-slate-400">{{ cl.financialYear }}</td>
                    <td class="px-5 py-3.5">
                      <div class="flex items-center gap-2.5 min-w-[140px]">
                        <div class="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            class="h-full rounded-full transition-all duration-500"
                            [style.width.%]="cl.progress"
                            [ngClass]="{
                              'bg-green-500': cl.progress >= 80,
                              'bg-blue-500': cl.progress >= 40 && cl.progress < 80,
                              'bg-amber-500': cl.progress > 0 && cl.progress < 40,
                              'bg-slate-300': cl.progress === 0
                            }"
                          ></div>
                        </div>
                        <span class="text-xs font-bold text-slate-600 dark:text-slate-300 w-10 text-right">{{ cl.progress }}%</span>
                      </div>
                      <div class="text-[10px] text-slate-400 mt-0.5">{{ cl.receivedItems }}/{{ cl.totalItems }} items</div>
                    </td>
                    <td class="px-5 py-3.5">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                        [ngClass]="{
                          'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400': cl.status === 'completed',
                          'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400': cl.status === 'active',
                          'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400': cl.status === 'archived'
                        }"
                      >
                        @if (cl.status === 'completed') {
                          <ng-icon name="heroCheckCircleSolid" size="12"></ng-icon>
                        }
                        {{ cl.status }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                      @if (cl.dueDate) {
                        <span [ngClass]="{'text-red-500 font-bold': isOverdue(cl)}">{{ cl.dueDate | date:'mediumDate' }}</span>
                      } @else {
                        <span class="text-slate-300">—</span>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-right">
                      <div class="flex items-center justify-end gap-1" (click)="$event.stopPropagation()">
                        <!-- Generate Upload Link -->
                        <button
                          (click)="generateLink(cl)"
                          title="Generate Upload Link"
                          class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          🔗
                        </button>
                        <!-- Download All -->
                        @if (cl.receivedItems > 0) {
                          <button
                            (click)="downloadAll(cl)"
                            title="Download All Files"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          >
                            📥
                          </button>
                        }
                        <!-- Send Reminder -->
                        @if (cl.status === 'active' && cl.progress < 100) {
                          <button
                            (click)="sendReminder(cl)"
                            title="Send WhatsApp Reminder"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          >
                            🔔
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
            <span class="text-xs text-slate-500">
              Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to {{ Math.min(pagination.page * pagination.limit, totalCount()) }} of {{ totalCount() }}
            </span>
            <div class="flex items-center gap-1">
              <button
                [disabled]="pagination.page <= 1"
                (click)="pagination.page = pagination.page - 1; loadChecklists()"
                class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
              >
                <ng-icon name="heroChevronLeftSolid" size="16"></ng-icon>
              </button>
              <span class="px-3 py-1 text-sm font-bold text-slate-700 dark:text-slate-300">{{ pagination.page }}</span>
              <button
                [disabled]="pagination.page * pagination.limit >= totalCount()"
                (click)="pagination.page = pagination.page + 1; loadChecklists()"
                class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
              >
                <ng-icon name="heroChevronRightSolid" size="16"></ng-icon>
              </button>
            </div>
          </div>
        }
      </div>

    </div>

    <!-- ==================== BULK CREATE MODAL ==================== -->
      @if (showBulkModal) {
        <!-- Premium Backdrop -->
        <div
          class="modal-overlay-premium bg-slate-900/40 backdrop-blur-[2px]"
          (click)="closeBulkModal()"
          aria-hidden="true"
        ></div>

        <!-- Modal Container -->
        <div
          class="fixed inset-0 flex items-center justify-center p-4"
          style="z-index: var(--z-modal);"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulkModalTitle"
          (click)="closeBulkModal()"
        >
          <div
            class="modal-panel-premium max-w-2xl max-h-[90vh] flex flex-col"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 pb-4 shrink-0">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                  <ng-icon name="heroRocketLaunchSolid" size="20"></ng-icon>
                </div>
                <div>
                  <h3 id="bulkModalTitle" class="text-lg font-bold text-slate-900 dark:text-white">Bulk Assign Checklist</h3>
                  <p class="text-xs text-slate-500">Create checklists for selected clients</p>
                </div>
              </div>
              <button (click)="closeBulkModal()" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <ng-icon name="heroXMarkSolid" size="18"></ng-icon>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-6 pt-0 space-y-5 overflow-y-auto flex-1 custom-scrollbar">

              <!-- Step 1: Template Selection -->
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">1. Select Template</label>
                <div class="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  @for (tmpl of templates(); track tmpl.id) {
                    <button
                      (click)="bulkData.templateId = tmpl.id; bulkData.templateName = tmpl.name"
                      class="flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200"
                      [ngClass]="{
                        'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20': bulkData.templateId === tmpl.id,
                        'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700': bulkData.templateId !== tmpl.id
                      }"
                    >
                      <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <ng-icon name="heroClipboardDocumentCheckSolid" size="16" class="text-blue-500"></ng-icon>
                      </div>
                      <div class="min-w-0">
                        <div class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ tmpl.name }}</div>
                        <div class="text-[10px] text-slate-500 uppercase">{{ tmpl.serviceType }} · {{ tmpl.items.length || 0 }} items</div>
                      </div>
                    </button>
                  }
                </div>
              </div>

              <!-- Step 2: Financial Year + Due Date -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">2. Financial Year</label>
                  <select
                    [(ngModel)]="bulkData.financialYear"
                    class="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    @for (year of fyYears; track year) {
                      <option [value]="year">{{ year }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Due Date (Optional)</label>
                  <input
                    type="date"
                    [(ngModel)]="bulkData.dueDate"
                    class="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <!-- Step 3: Client Selection -->
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  3. Select Clients
                  <span class="text-blue-500 ml-1">({{ selectedClientIds().size }} selected)</span>
                </label>

                <!-- All/None toggle -->
                <div class="flex items-center gap-3 mb-3">
                  <button
                    (click)="selectAllClients()"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                    [ngClass]="{
                      'bg-blue-600 text-white': bulkData.assignAll,
                      'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20': !bulkData.assignAll
                    }"
                  >
                    <ng-icon name="heroUsersSolid" size="14" class="inline mr-1"></ng-icon>
                    All Clients ({{ allClients().length }})
                  </button>
                  <button
                    (click)="deselectAllClients()"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    Clear Selection
                  </button>
                </div>

                <!-- Client Search -->
                <div class="relative mb-2">
                  <ng-icon name="heroMagnifyingGlassSolid" size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></ng-icon>
                  <input
                    type="text"
                    [(ngModel)]="clientSearch"
                    placeholder="Search clients by name, code, or mobile..."
                    class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <!-- Client List -->
                <div class="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl custom-scrollbar">
                  @if (clientsLoading()) {
                    <div class="flex justify-center py-6">
                      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                  } @else {
                    @for (client of filteredClients(); track client.id) {
                      <button
                        (click)="toggleClient(client.id)"
                        class="w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div
                          class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                          [ngClass]="{
                            'bg-blue-600 border-blue-600': selectedClientIds().has(client.id),
                            'border-slate-300 dark:border-slate-600': !selectedClientIds().has(client.id)
                          }"
                        >
                          @if (selectedClientIds().has(client.id)) {
                            <ng-icon name="heroCheckSolid" size="12" class="text-white"></ng-icon>
                          }
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ client.user.name }}</div>
                          <div class="text-[10px] text-slate-400">
                            <span class="font-mono">{{ client.code }}</span>
                            <span class="mx-1">·</span>
                            <span>{{ client.user.mobile }}</span>
                          </div>
                        </div>
                      </button>
                    }
                    @if (filteredClients().length === 0) {
                      <div class="text-center py-6 text-sm text-slate-400">No clients found</div>
                    }
                  }
                </div>
              </div>

              <!-- Step 4: WhatsApp Notification -->
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">4. Notify via WhatsApp</label>
                <button
                  (click)="bulkData.sendWhatsApp = !bulkData.sendWhatsApp"
                  class="flex items-center gap-3 p-3 rounded-xl border w-full text-left transition-all"
                  [ngClass]="{
                    'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/20': bulkData.sendWhatsApp,
                    'border-slate-200 dark:border-slate-700 hover:border-green-300': !bulkData.sendWhatsApp
                  }"
                >
                  <div
                    class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                    [ngClass]="{
                      'bg-green-600 border-green-600': bulkData.sendWhatsApp,
                      'border-slate-300 dark:border-slate-600': !bulkData.sendWhatsApp
                    }"
                  >
                    @if (bulkData.sendWhatsApp) {
                      <ng-icon name="heroCheckSolid" size="12" class="text-white"></ng-icon>
                    }
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-slate-900 dark:text-white">Send WhatsApp Message</div>
                    <div class="text-[10px] text-slate-500">Send checklist of pending documents to each client via WhatsApp</div>
                  </div>
                </button>
              </div>

              <!-- Info -->
              <div class="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                <ng-icon name="heroSparklesSolid" size="18" class="text-blue-500 shrink-0 mt-0.5"></ng-icon>
                <div class="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Smart Assign:</strong> Clients who already have a checklist for the same FY and service type will be automatically skipped. No duplicates!
                </div>
              </div>

              <!-- Bulk Result -->
              @if (bulkResult()) {
                <div class="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30">
                  <ng-icon name="heroCheckCircleSolid" size="18" class="text-green-500 shrink-0 mt-0.5"></ng-icon>
                  <div class="text-xs text-green-700 dark:text-green-300">
                    <strong>Done!</strong> Created <strong>{{ bulkResult()!.created }}</strong> checklists.
                    @if (bulkResult()!.skipped) {
                      Skipped <strong>{{ bulkResult()!.skipped }}</strong> (already had it).
                    }
                    @if (bulkData.sendWhatsApp && bulkResult()!.whatsappSent) {
                      <br/>📱 Sent WhatsApp to <strong>{{ bulkResult()!.whatsappSent }}</strong> clients.
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end gap-3 p-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 shrink-0">
              <button
                (click)="closeBulkModal()"
                class="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium"
              >
                {{ bulkResult() ? 'Close' : 'Cancel' }}
              </button>
              @if (!bulkResult()) {
                <button
                  (click)="executeBulkCreate()"
                  [disabled]="!bulkData.templateId || !bulkData.financialYear || selectedClientIds().size === 0 || bulkLoading()"
                  class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-all"
                >
                  @if (bulkLoading()) {
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  } @else {
                    <ng-icon name="heroRocketLaunchSolid" size="16"></ng-icon>
                    Create for {{ selectedClientIds().size }} Client{{ selectedClientIds().size > 1 ? 's' : '' }}
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Toast -->
      @if (toastMsg()) {
        <div class="fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl animate-in slide-in-from-bottom-4 duration-300"
          [ngClass]="{
            'bg-green-500 text-white': toastType() === 'success',
            'bg-red-500 text-white': toastType() === 'error',
            'bg-blue-500 text-white': toastType() === 'info'
          }"
        >
          {{ toastMsg() }}
        </div>
      }

  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      heroClipboardDocumentCheckSolid,
      heroRocketLaunchSolid,
      heroCheckCircleSolid,
      heroClockSolid,
      heroExclamationTriangleSolid,
      heroMagnifyingGlassSolid,
      heroChevronLeftSolid,
      heroChevronRightSolid,
      heroXMarkSolid,
      heroSparklesSolid,
      heroBoltSolid,
      heroUsersSolid,
      heroCheckSolid,
    })
  ]
})
export class ChecklistsOverviewComponent implements OnInit, OnDestroy {
  private checklistService = inject(ChecklistService);
  private clientService = inject(ClientService);
  private router = inject(Router);
  Math = Math;

  // Scroll position for body lock
  private savedScrollY = 0;

  // Data
  checklists = signal<any[]>([]);
  templates = signal<ChecklistTemplate[]>([]);
  allClients = signal<Client[]>([]);
  loading = signal(false);
  clientsLoading = signal(false);
  totalCount = signal(0);
  bulkLoading = signal(false);
  bulkResult = signal<{ created: number; skipped: number; total: number; whatsappSent?: number } | null>(null);
  toastMsg = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('success');

  // Stats
  statCards = signal<{ label: string; value: string | number; icon: string; color: string; bg: string }[]>([
    { label: 'Total', value: '—', icon: 'heroClipboardDocumentCheckSolid', color: '#0074c9', bg: '#eff6ff' },
    { label: 'Active', value: '—', icon: 'heroBoltSolid', color: '#2563eb', bg: '#dbeafe' },
    { label: 'Completed', value: '—', icon: 'heroCheckCircleSolid', color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Overdue', value: '—', icon: 'heroExclamationTriangleSolid', color: '#dc2626', bg: '#fef2f2' },
  ]);

  upgradeIdeas = [
    {
      title: 'Auto reminder scheduler',
      description: 'Send WhatsApp/email reminders based on due date, pending count, and client response history.',
    },
    {
      title: 'Document approval queue',
      description: 'Review, approve, reject, and comment on uploaded documents before marking checklist items complete.',
    },
    {
      title: 'OCR validation',
      description: 'Read PAN, GSTIN, bank statements, and invoices automatically and flag missing or mismatched data.',
    },
    {
      title: 'Checklist audit trail',
      description: 'Track who requested, uploaded, reviewed, rejected, downloaded, or completed each document.',
    },
  ];

  // Bulk modal
  showBulkModal = false;
  bulkData = {
    templateId: '',
    templateName: '',
    financialYear: '2024-25',
    dueDate: '',
    assignAll: true,
    sendWhatsApp: false,
  };
  clientSearch = '';
  private _selectedClientIds = signal<Set<string>>(new Set());
  selectedClientIds = this._selectedClientIds.asReadonly();

  // Filtered clients for the picker
  filteredClients = computed(() => {
    const search = this.clientSearch.toLowerCase().trim();
    const clients = this.allClients();
    if (!search) return clients;
    return clients.filter(c =>
      c.user.name.toLowerCase().includes(search) ||
      c.code.toLowerCase().includes(search) ||
      c.user.mobile.includes(search)
    );
  });

  // Filters
  filters = { search: '', financialYear: '', status: '' };
  private filterRevision = signal(0);
  pagination = { page: 1, limit: 20 };
  fyYears = ['2024-25', '2025-26', '2023-24', '2022-23'];

  visibleChecklists = computed(() => {
    this.filterRevision();
    const term = this.filters.search.trim().toLowerCase();
    const rows = this.checklists();
    if (!term) return rows;

    return rows.filter((cl) => {
      const haystack = [
        this.getClientName(cl),
        this.getClientCode(cl),
        cl.name,
        cl.serviceType,
        cl.financialYear,
        cl.status,
      ].join(' ').toLowerCase();

      return haystack.includes(term);
    });
  });

  averageProgress = computed(() => {
    const rows = this.visibleChecklists();
    if (rows.length === 0) return 0;
    const total = rows.reduce((sum, cl) => sum + Number(cl.progress || 0), 0);
    return Math.round(total / rows.length);
  });

  visibleOverdueCount = computed(() => this.visibleChecklists().filter((cl) => this.isOverdue(cl)).length);

  dueSoonCount = computed(() =>
    this.visibleChecklists().filter((cl) => {
      const days = this.daysUntilDue(cl);
      return days !== null && days >= 0 && days <= 7 && cl.status !== 'completed';
    }).length
  );

  ngOnInit() {
    this.loadChecklists();
    this.loadTemplates();
    this.loadStats();
    this.loadAllClients();
  }

  // ========== DATA LOADING ==========

  loadChecklists() {
    this.loading.set(true);
    const params: any = { page: this.pagination.page, limit: this.pagination.limit };
    if (this.filters.financialYear) params.financialYear = this.filters.financialYear;
    if (this.filters.status) params.status = this.filters.status;

    this.checklistService.getChecklists(params).subscribe({
      next: (res: any) => {
        this.checklists.set(res.data || []);
        this.totalCount.set(res.meta?.total || res.total || 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadTemplates() {
    this.checklistService.getTemplates().subscribe({
      next: (res) => this.templates.set(res.data || []),
    });
  }

  loadStats() {
    this.checklistService.getStats().subscribe({
      next: (res: any) => {
        const stats = res.data;
        if (stats) {
          this.statCards.set([
            { label: 'Total', value: stats.total, icon: 'heroClipboardDocumentCheckSolid', color: '#0074c9', bg: '#eff6ff' },
            { label: 'Active', value: stats.active, icon: 'heroBoltSolid', color: '#2563eb', bg: '#dbeafe' },
            { label: 'Completed', value: stats.completed, icon: 'heroCheckCircleSolid', color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Overdue', value: stats.overdue, icon: 'heroExclamationTriangleSolid', color: '#dc2626', bg: '#fef2f2' },
          ]);
        }
      }
    });
  }

  loadAllClients() {
    this.clientsLoading.set(true);
    // Fetch all clients (large limit to get everyone)
    this.clientService.getClients(1, 1000).subscribe({
      next: (res) => {
        this.allClients.set(res.data || []);
        // Default: select all
        this.selectAllClients();
        this.clientsLoading.set(false);
      },
      error: () => this.clientsLoading.set(false),
    });
  }

  // ========== CLIENT SELECTION ==========

  selectAllClients() {
    const ids = new Set(this.allClients().map(c => c.id));
    this._selectedClientIds.set(ids);
    this.bulkData.assignAll = true;
  }

  deselectAllClients() {
    this._selectedClientIds.set(new Set());
    this.bulkData.assignAll = false;
  }

  toggleClient(clientId: string) {
    const current = new Set(this._selectedClientIds());
    if (current.has(clientId)) {
      current.delete(clientId);
    } else {
      current.add(clientId);
    }
    this._selectedClientIds.set(current);
    this.bulkData.assignAll = current.size === this.allClients().length;
  }

  // ========== BULK CREATE ==========

  openBulkModal() {
    this.showBulkModal = true;
    this.bulkResult.set(null);
    this.bulkData.templateId = '';
    this.bulkData.templateName = '';
    this.bulkData.sendWhatsApp = false;
    this.clientSearch = '';
    // Keep current selection or select all if empty
    if (this._selectedClientIds().size === 0) {
      this.selectAllClients();
    }
    this.lockBodyScroll();
  }

  closeBulkModal() {
    this.showBulkModal = false;
    this.unlockBodyScroll();
  }

  ngOnDestroy() {
    if (this.showBulkModal) {
      this.unlockBodyScroll();
    }
  }

  // Escape key closes modal
  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.showBulkModal) {
      this.closeBulkModal();
    }
  }

  // Body scroll lock helpers
  private lockBodyScroll(): void {
    this.savedScrollY = window.scrollY;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${this.savedScrollY}px`;
  }

  private unlockBodyScroll(): void {
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, this.savedScrollY);
  }

  executeBulkCreate() {
    this.bulkLoading.set(true);
    this.bulkResult.set(null);

    const selectedIds = Array.from(this._selectedClientIds());
    const clientIds = this.bulkData.assignAll ? 'all' as const : selectedIds;

    this.checklistService.bulkCreateChecklists({
      templateId: this.bulkData.templateId,
      clientIds,
      financialYear: this.bulkData.financialYear,
      dueDate: this.bulkData.dueDate || undefined,
      sendWhatsApp: this.bulkData.sendWhatsApp,
    }).subscribe({
      next: (res) => {
        this.bulkResult.set(res.data);
        this.bulkLoading.set(false);
        this.loadChecklists();
        this.loadStats();
      },
      error: () => this.bulkLoading.set(false),
    });
  }

  // ========== TABLE HELPERS ==========

  onSearchChange() {
    // Search is applied client-side to the current page so typing stays instant.
    this.filterRevision.update((value) => value + 1);
  }

  onFilterChange() {
    this.pagination.page = 1;
    this.filterRevision.update((value) => value + 1);
    this.loadChecklists();
  }

  clearFilters() {
    this.filters.search = '';
    this.filters.financialYear = '';
    this.filters.status = '';
    this.pagination.page = 1;
    this.filterRevision.update((value) => value + 1);
    this.loadChecklists();
  }

  hasActiveFilters(): boolean {
    return Boolean(this.filters.search || this.filters.financialYear || this.filters.status);
  }

  goToChecklist(cl: any) {
    this.router.navigate(['/workspace', cl.clientId], { queryParams: { tab: 'checklists' } });
  }

  getClientName(cl: any): string {
    return cl.client?.user?.name || cl.client?.name || 'Unknown';
  }

  getClientCode(cl: any): string {
    return cl.client?.code || '';
  }

  getClientInitials(cl: any): string {
    const name = this.getClientName(cl);
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'CL';
  }

  isOverdue(cl: any): boolean {
    if (!cl.dueDate || cl.status === 'completed') return false;
    return new Date(cl.dueDate) < new Date();
  }

  daysUntilDue(cl: any): number | null {
    if (!cl.dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(cl.dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / 86400000);
  }

  dueMeta(cl: any): string {
    const days = this.daysUntilDue(cl);
    if (days === null) return 'No due date';
    if (cl.status === 'completed') return 'Completed';
    if (days < 0) return `${Math.abs(days)} day(s) overdue`;
    if (days === 0) return 'Due today';
    if (days <= 7) return `Due in ${days} day(s)`;
    return `Due in ${days} day(s)`;
  }

  dueTone(cl: any): string {
    const days = this.daysUntilDue(cl);
    if (days === null || cl.status === 'completed') return 'text-slate-400';
    if (days < 0) return 'text-rose-600';
    if (days <= 7) return 'text-amber-600';
    return 'text-emerald-600';
  }

  statusLabel(status: string): string {
    return status ? status.replace(/_/g, ' ') : 'active';
  }

  statusTone(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
      case 'archived':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
    }
  }

  serviceTone(serviceType: string): string {
    switch ((serviceType || '').toLowerCase()) {
      case 'gst':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
      case 'audit':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
      case 'tds':
      case 'roc':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300';
      case 'itr':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    }
  }

  progressTone(progress: number): string {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 40) return 'bg-blue-500';
    if (progress > 0) return 'bg-amber-500';
    return 'bg-slate-300';
  }

  progressLabel(progress: number): string {
    if (progress >= 100) return 'Complete';
    if (progress >= 80) return 'Almost done';
    if (progress >= 40) return 'In progress';
    if (progress > 0) return 'Started';
    return 'Not started';
  }

  statHelper(label: string): string {
    switch (label.toLowerCase()) {
      case 'total':
        return 'All assigned document request workflows';
      case 'active':
        return 'Currently waiting for client or staff action';
      case 'completed':
        return 'Closed with all required documents received';
      case 'overdue':
        return 'Needs follow-up before compliance risk grows';
      default:
        return 'Checklist health indicator';
    }
  }

  displayRangeStart(): number {
    if ((this.totalCount() || this.visibleChecklists().length) === 0) return 0;
    return (this.pagination.page - 1) * this.pagination.limit + 1;
  }

  displayRangeEnd(): number {
    return Math.min(this.pagination.page * this.pagination.limit, this.totalCount() || this.visibleChecklists().length);
  }

  // ========== ACTIONS ==========

  generateLink(cl: any) {
    this.checklistService.generateUploadLink(cl.id).subscribe({
      next: (res) => {
        navigator.clipboard.writeText(res.data.url).then(() => {
          this.showToast('Upload link copied to clipboard! 🔗', 'success');
        });
      },
      error: (err: any) => {
        this.showToast(err.error?.message || 'Failed to generate link', 'error');
      },
    });
  }

  downloadAll(cl: any) {
    this.showToast('Preparing ZIP download...', 'info');
    this.checklistService.downloadAllAsZip(cl.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cl.name || 'checklist'}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Download started! 📥', 'success');
      },
      error: () => {
        this.showToast('Failed to download files', 'error');
      },
    });
  }

  sendReminder(cl: any) {
    const clientName = this.getClientName(cl);

    if (!confirm(`Send WhatsApp reminder to ${clientName}?`)) return;

    this.checklistService.sendReminder(cl.id).subscribe({
      next: () => {
        this.showToast(`Reminder sent to ${clientName}!`, 'success');
      },
      error: (err) => {
        console.error(err);
        this.showToast('Failed to send reminder', 'error');
      },
    });
  }

  private showToast(msg: string, type: 'success' | 'error' | 'info') {
    this.toastMsg.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toastMsg.set(null), 3500);
  }
}
