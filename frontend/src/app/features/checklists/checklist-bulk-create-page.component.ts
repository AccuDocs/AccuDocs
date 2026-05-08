import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowLeftSolid,
  heroCalendarDaysSolid,
  heroCheckCircleSolid,
  heroCheckSolid,
  heroClipboardDocumentCheckSolid,
  heroClockSolid,
  heroMagnifyingGlassSolid,
  heroRocketLaunchSolid,
  heroSparklesSolid,
  heroUsersSolid,
} from '@ng-icons/heroicons/solid';
import { ChecklistService, ChecklistTemplate } from '@core/services/checklist.service';
import { Client, ClientService } from '@core/services/client.service';

type BulkCreateResult = {
  created: number;
  skipped: number;
  total: number;
  whatsappSent?: number;
};

type BulkChecklistForm = {
  templateId: string;
  financialYear: string;
  dueDate: string;
  sendWhatsApp: boolean;
};

@Component({
  selector: 'app-checklist-bulk-create-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      heroArrowLeftSolid,
      heroCalendarDaysSolid,
      heroCheckCircleSolid,
      heroCheckSolid,
      heroClipboardDocumentCheckSolid,
      heroClockSolid,
      heroMagnifyingGlassSolid,
      heroRocketLaunchSolid,
      heroSparklesSolid,
      heroUsersSolid,
    }),
  ],
  template: `
    <div class="min-h-full w-full space-y-5 px-6 pb-8 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section class="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm">
        <div class="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.9),rgba(239,246,255,0.72))]"></div>
          <div class="relative max-w-3xl">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
              <ng-icon name="heroRocketLaunchSolid" size="14"></ng-icon>
              Checklist automation
            </div>
            <h1 class="text-3xl font-black tracking-tight text-slate-950">Create Bulk Checklist Assignment</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Build document request checklists for multiple clients in one pass, choose the financial year, set a due date, and optionally notify clients on WhatsApp.
            </p>
            <div class="mt-5 flex flex-wrap gap-2">
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                {{ templates().length }} template(s) ready
              </span>
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                {{ selectedCount() }} client(s) selected
              </span>
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                Smart duplicate protection
              </span>
            </div>
          </div>

          <div class="relative flex flex-wrap items-center gap-3">
            <button
              type="button"
              (click)="goBack()"
              class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ng-icon name="heroArrowLeftSolid" size="16"></ng-icon>
              Back to checklists
            </button>
            <button
              type="button"
              (click)="submit()"
              [disabled]="!canSubmit()"
              class="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              @if (submitting()) {
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"></span>
                Creating...
              } @else {
                <ng-icon name="heroCheckCircleSolid" size="17"></ng-icon>
                Create for {{ selectedCount() }} Client{{ selectedCount() === 1 ? '' : 's' }}
              }
            </button>
          </div>
        </div>
      </section>

      @if (result()) {
        <section class="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-start gap-3">
              <div class="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <ng-icon name="heroCheckCircleSolid" size="22"></ng-icon>
              </div>
              <div>
                <p class="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Assignment complete</p>
                <h2 class="mt-1 text-xl font-black text-emerald-950">Created {{ result()!.created }} checklist assignment(s)</h2>
                <p class="mt-1 text-sm font-semibold text-emerald-800/80">
                  Skipped {{ result()!.skipped }} duplicate assignment(s)
                  @if (form().sendWhatsApp && result()!.whatsappSent) {
                    and sent WhatsApp to {{ result()!.whatsappSent }} client(s).
                  }
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                (click)="resetResult()"
                class="rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
              >
                Create another batch
              </button>
              <button
                type="button"
                (click)="goBack()"
                class="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                View checklist overview
              </button>
            </div>
          </div>
        </section>
      }

      @if (errorMessage()) {
        <section class="rounded-[24px] border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p class="text-sm font-bold text-rose-700">{{ errorMessage() }}</p>
        </section>
      }

      <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main class="space-y-5">
          <section class="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-100 px-6 py-5">
              <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Step 1</p>
              <div class="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 class="text-2xl font-black text-slate-950">Choose a checklist template</h2>
                  <p class="mt-1 text-sm text-slate-500">Select the document request template that will be assigned to each client in this batch.</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {{ templates().length }} option{{ templates().length === 1 ? '' : 's' }}
                </span>
              </div>
            </div>

            <div class="p-6">
              @if (templatesLoading()) {
                <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  @for (item of [1,2,3]; track item) {
                    <div class="h-36 animate-pulse rounded-[24px] bg-slate-100"></div>
                  }
                </div>
              } @else if (templates().length === 0) {
                <div class="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                  <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                    <ng-icon name="heroClipboardDocumentCheckSolid" size="26"></ng-icon>
                  </div>
                  <h3 class="mt-4 text-lg font-black text-slate-900">No checklist templates available</h3>
                  <p class="mt-2 text-sm text-slate-500">Create checklist templates first, then come back to assign them in bulk.</p>
                </div>
              } @else {
                <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  @for (template of templates(); track template.id) {
                    <button
                      type="button"
                      (click)="selectTemplate(template)"
                      class="group rounded-[24px] border p-5 text-left transition-all duration-200"
                      [ngClass]="selectedTemplate()?.id === template.id
                        ? 'border-emerald-300 bg-emerald-50 shadow-md shadow-emerald-100 ring-4 ring-emerald-100'
                        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-slate-50 hover:shadow-sm'"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200">
                          <ng-icon name="heroClipboardDocumentCheckSolid" size="20"></ng-icon>
                        </div>
                        <span class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]" [ngClass]="serviceTone(template.serviceType)">
                          {{ template.serviceType || 'general' }}
                        </span>
                      </div>

                      <h3 class="mt-4 text-lg font-black text-slate-950">{{ template.name }}</h3>
                      <p class="mt-2 min-h-[3rem] text-sm leading-6 text-slate-500">
                        {{ template.description || 'Includes the standard request list for this compliance workflow.' }}
                      </p>

                      <div class="mt-4 flex items-center justify-between">
                        <span class="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{{ template.items.length || 0 }} item(s)</span>
                        @if (selectedTemplate()?.id === template.id) {
                          <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                            <ng-icon name="heroCheckSolid" size="16"></ng-icon>
                          </span>
                        }
                      </div>
                    </button>
                  }
                </div>
              }
            </div>
          </section>

          <section class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article class="rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div class="border-b border-slate-100 px-6 py-5">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Step 2</p>
                <h2 class="mt-1 text-2xl font-black text-slate-950">Assignment information</h2>
                <p class="mt-1 text-sm text-slate-500">Set the financial year and optionally put a due date on every created checklist.</p>
              </div>

              <div class="grid gap-5 p-6 md:grid-cols-2">
                <label class="block">
                  <span class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Financial year</span>
                  <select
                    [ngModel]="form().financialYear"
                    (ngModelChange)="updateForm({ financialYear: $event })"
                    class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  >
                    @for (year of financialYears; track year) {
                      <option [value]="year">{{ year }}</option>
                    }
                  </select>
                </label>

                <label class="block">
                  <span class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Due date</span>
                  <input
                    type="date"
                    [ngModel]="form().dueDate"
                    (ngModelChange)="updateForm({ dueDate: $event })"
                    class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>
            </article>

            <article class="rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div class="border-b border-slate-100 px-6 py-5">
                <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Step 4</p>
                <h2 class="mt-1 text-2xl font-black text-slate-950">Client notification</h2>
                <p class="mt-1 text-sm text-slate-500">Choose whether clients should receive the checklist immediately on WhatsApp.</p>
              </div>

              <div class="p-6">
                <button
                  type="button"
                  (click)="toggleWhatsApp()"
                  class="w-full rounded-[24px] border p-5 text-left transition-all duration-200"
                  [ngClass]="form().sendWhatsApp
                    ? 'border-emerald-300 bg-emerald-50 shadow-md shadow-emerald-100 ring-4 ring-emerald-100'
                    : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'"
                >
                  <div class="flex items-start gap-4">
                    <div class="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200">
                      <ng-icon name="heroUsersSolid" size="20"></ng-icon>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <h3 class="text-base font-black text-slate-950">Send WhatsApp message</h3>
                          <p class="mt-1 text-sm leading-6 text-slate-500">Push the newly created checklist to every selected client right after assignment.</p>
                        </div>
                        <span
                          class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition"
                          [ngClass]="form().sendWhatsApp ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'"
                        >
                          <ng-icon name="heroCheckSolid" size="14"></ng-icon>
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                <div class="mt-4 rounded-[24px] border border-blue-100 bg-blue-50 p-4">
                  <div class="flex items-start gap-3">
                    <ng-icon name="heroSparklesSolid" size="18" class="mt-0.5 shrink-0 text-blue-500"></ng-icon>
                    <p class="text-sm font-semibold leading-6 text-blue-800">
                      Smart Assign skips clients who already have a checklist for the same financial year and service type, so duplicate requests are not created.
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section class="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-100 px-6 py-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Step 3</p>
                  <h2 class="mt-1 text-2xl font-black text-slate-950">Select clients</h2>
                  <p class="mt-1 text-sm text-slate-500">Pick the clients who should receive this checklist assignment.</p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    (click)="selectAllClients()"
                    class="rounded-2xl px-4 py-2 text-xs font-black transition"
                    [ngClass]="isAllSelected()
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'"
                  >
                    All clients ({{ allClients().length }})
                  </button>
                  <button
                    type="button"
                    (click)="clearSelection()"
                    class="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            </div>

            <div class="space-y-5 p-6">
              <label class="relative block">
                <ng-icon name="heroMagnifyingGlassSolid" size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></ng-icon>
                <input
                  type="search"
                  [ngModel]="clientSearch()"
                  (ngModelChange)="clientSearch.set($event); resetResult()"
                  placeholder="Search clients by name, code, or mobile..."
                  class="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              @if (clientsLoading()) {
                <div class="space-y-3">
                  @for (row of [1,2,3,4]; track row) {
                    <div class="h-20 animate-pulse rounded-[24px] bg-slate-100"></div>
                  }
                </div>
              } @else if (filteredClients().length === 0) {
                <div class="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                  <h3 class="text-lg font-black text-slate-900">No matching clients</h3>
                  <p class="mt-2 text-sm text-slate-500">Try a different search term or clear the current client filter.</p>
                </div>
              } @else {
                <div class="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Client directory</p>
                      <p class="mt-1 text-sm font-semibold text-slate-600">{{ filteredClients().length }} visible client(s) in this picker</p>
                    </div>
                    <span class="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                      {{ selectedCount() }} selected
                    </span>
                  </div>

                  <div class="max-h-[560px] overflow-y-auto pr-1">
                    <div class="grid gap-3 md:grid-cols-2">
                      @for (client of filteredClients(); track client.id) {
                        <button
                          type="button"
                          (click)="toggleClient(client.id)"
                          class="w-full rounded-[24px] border p-4 text-left transition-all duration-200"
                          [ngClass]="isSelected(client.id)
                            ? 'border-blue-300 bg-blue-50 shadow-sm shadow-blue-100 ring-4 ring-blue-100'
                            : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-sm'"
                        >
                          <div class="flex items-start justify-between gap-3">
                            <div class="flex min-w-0 items-start gap-3">
                              <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
                                {{ getClientInitials(client) }}
                              </span>
                              <div class="min-w-0">
                                <div class="flex flex-wrap items-center gap-2">
                                  <h3 class="truncate text-base font-black text-slate-950">{{ client.user.name }}</h3>
                                  <span class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                                    [ngClass]="isSelected(client.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'">
                                    {{ isSelected(client.id) ? 'Selected' : 'Ready' }}
                                  </span>
                                </div>
                                <p class="mt-1 text-xs font-semibold text-slate-500">{{ client.businessName || client.entityType || 'Client workspace' }}</p>
                              </div>
                            </div>

                            <span
                              class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-white transition"
                              [ngClass]="isSelected(client.id) ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white text-transparent'"
                            >
                              <ng-icon name="heroCheckSolid" size="14"></ng-icon>
                            </span>
                          </div>

                          <div class="mt-4 flex flex-wrap gap-2">
                            <span class="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                              {{ client.code || 'No code' }}
                            </span>
                            <span class="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                              {{ client.user.mobile || client.mobile || 'No mobile' }}
                            </span>
                            @if (client.gstin) {
                              <span class="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                                GSTIN
                              </span>
                            }
                          </div>
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          </section>
        </main>

        <aside class="space-y-5">
          <section class="sticky top-24 overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#0f766e_0%,#164e63_100%)] text-white shadow-xl shadow-slate-200/80">
            <div class="p-6">
              <p class="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/90">Assignment summary</p>
              <h2 class="mt-2 text-3xl font-black">{{ selectedCount() }}</h2>
              <p class="text-sm font-semibold text-emerald-50/85">client{{ selectedCount() === 1 ? '' : 's' }} selected for this batch</p>

              <div class="mt-6 space-y-4 border-t border-white/15 pt-5">
                <div class="flex items-start justify-between gap-4 text-sm font-semibold text-white/90">
                  <span>Template</span>
                  <span class="max-w-[170px] text-right font-black text-white">{{ selectedTemplate()?.name || 'Select template' }}</span>
                </div>
                <div class="flex items-start justify-between gap-4 text-sm font-semibold text-white/90">
                  <span>Service type</span>
                  <span class="font-black uppercase text-white">{{ selectedTemplate()?.serviceType || '-' }}</span>
                </div>
                <div class="flex items-start justify-between gap-4 text-sm font-semibold text-white/90">
                  <span>Financial year</span>
                  <span class="font-black text-white">{{ form().financialYear }}</span>
                </div>
                <div class="flex items-start justify-between gap-4 text-sm font-semibold text-white/90">
                  <span>Due date</span>
                  <span class="font-black text-white">{{ form().dueDate || 'Not set' }}</span>
                </div>
                <div class="flex items-start justify-between gap-4 text-sm font-semibold text-white/90">
                  <span>WhatsApp</span>
                  <span class="font-black text-white">{{ form().sendWhatsApp ? 'Enabled' : 'Off' }}</span>
                </div>
              </div>

              <div class="mt-6 grid grid-cols-2 gap-3">
                <div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Checklist items</p>
                  <p class="mt-2 text-2xl font-black text-white">{{ selectedTemplate()?.items?.length || 0 }}</p>
                </div>
                <div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Estimated requests</p>
                  <p class="mt-2 text-2xl font-black text-white">{{ estimatedRequestCount() }}</p>
                </div>
              </div>

              <div class="mt-6 rounded-[24px] bg-white/10 p-4 ring-1 ring-white/10">
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Selected clients</p>
                <div class="mt-3 space-y-2">
                  @for (client of selectedClientPreview(); track client.id) {
                    <div class="flex items-center gap-3 text-sm font-semibold text-white/90">
                      <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-xs font-black text-white">
                        {{ getClientInitials(client) }}
                      </span>
                      <span class="min-w-0 flex-1 truncate">{{ client.user.name }}</span>
                    </div>
                  }
                  @if (selectedCount() > selectedClientPreview().length) {
                    <p class="text-xs font-semibold text-white/70">+{{ selectedCount() - selectedClientPreview().length }} more client(s)</p>
                  }
                  @if (selectedCount() === 0) {
                    <p class="text-sm font-semibold text-white/70">Select one or more clients to continue.</p>
                  }
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">What happens on submit</p>
            <div class="mt-4 space-y-3">
              <div class="flex items-start gap-3 text-sm font-semibold text-slate-600">
                <span class="mt-0.5 text-emerald-500"><ng-icon name="heroCheckCircleSolid" size="16"></ng-icon></span>
                Validate selected clients against existing assignments
              </div>
              <div class="flex items-start gap-3 text-sm font-semibold text-slate-600">
                <span class="mt-0.5 text-emerald-500"><ng-icon name="heroCheckCircleSolid" size="16"></ng-icon></span>
                Create checklist rows using the chosen template and FY
              </div>
              <div class="flex items-start gap-3 text-sm font-semibold text-slate-600">
                <span class="mt-0.5 text-emerald-500"><ng-icon name="heroCheckCircleSolid" size="16"></ng-icon></span>
                Skip duplicate client-service-year combinations automatically
              </div>
              <div class="flex items-start gap-3 text-sm font-semibold text-slate-600">
                <span class="mt-0.5 text-emerald-500"><ng-icon name="heroCheckCircleSolid" size="16"></ng-icon></span>
                Optionally send the checklist immediately on WhatsApp
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  `,
})
export class ChecklistBulkCreatePageComponent implements OnInit {
  private readonly checklistService = inject(ChecklistService);
  private readonly clientService = inject(ClientService);
  private readonly router = inject(Router);

  readonly templates = signal<ChecklistTemplate[]>([]);
  readonly allClients = signal<Client[]>([]);
  readonly templatesLoading = signal(false);
  readonly clientsLoading = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<BulkCreateResult | null>(null);
  readonly clientSearch = signal('');
  readonly selectedClientIds = signal<Set<string>>(new Set());
  readonly form = signal<BulkChecklistForm>({
    templateId: '',
    financialYear: this.getDefaultFinancialYear(),
    dueDate: '',
    sendWhatsApp: false,
  });

  readonly financialYears = this.buildFinancialYears();

  readonly selectedTemplate = computed(() => {
    const templateId = this.form().templateId;
    return this.templates().find((template) => template.id === templateId) ?? null;
  });

  readonly filteredClients = computed(() => {
    const term = this.clientSearch().trim().toLowerCase();
    if (!term) return this.allClients();

    return this.allClients().filter((client) => {
      const searchable = [
        client.user?.name,
        client.code,
        client.user?.mobile,
        client.mobile,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  });

  readonly selectedCount = computed(() => this.selectedClientIds().size);

  readonly isAllSelected = computed(() => {
    const clients = this.allClients();
    return clients.length > 0 && this.selectedClientIds().size === clients.length;
  });

  readonly selectedClientPreview = computed(() =>
    this.allClients().filter((client) => this.selectedClientIds().has(client.id)).slice(0, 4)
  );

  readonly canSubmit = computed(() =>
    Boolean(this.form().templateId && this.form().financialYear && this.selectedCount() > 0 && !this.submitting())
  );

  readonly estimatedRequestCount = computed(() =>
    (this.selectedTemplate()?.items?.length ?? 0) * this.selectedCount()
  );

  ngOnInit(): void {
    this.loadTemplates();
    this.loadClients();
  }

  goBack(): void {
    this.router.navigate(['/compliance/checklists']);
  }

  loadTemplates(): void {
    this.templatesLoading.set(true);

    this.checklistService.getTemplates().subscribe({
      next: (response) => {
        const templates = response.data ?? [];
        this.templates.set(templates);
        if (!this.form().templateId && templates.length > 0) {
          this.updateForm({ templateId: templates[0].id });
        }
        this.templatesLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Could not load checklist templates right now.');
        this.templatesLoading.set(false);
      },
    });
  }

  loadClients(): void {
    this.clientsLoading.set(true);

    this.clientService.getClients(1, 1000).subscribe({
      next: (response) => {
        const clients = response.data ?? [];
        this.allClients.set(clients);
        this.selectedClientIds.set(new Set(clients.map((client) => client.id)));
        this.clientsLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Could not load clients for checklist assignment.');
        this.clientsLoading.set(false);
      },
    });
  }

  updateForm(patch: Partial<BulkChecklistForm>): void {
    this.form.update((current) => ({ ...current, ...patch }));
    this.result.set(null);
    this.errorMessage.set(null);
  }

  selectTemplate(template: ChecklistTemplate): void {
    this.updateForm({ templateId: template.id });
  }

  toggleWhatsApp(): void {
    this.updateForm({ sendWhatsApp: !this.form().sendWhatsApp });
  }

  selectAllClients(): void {
    this.selectedClientIds.set(new Set(this.allClients().map((client) => client.id)));
    this.result.set(null);
  }

  clearSelection(): void {
    this.selectedClientIds.set(new Set());
    this.result.set(null);
  }

  toggleClient(clientId: string): void {
    const next = new Set(this.selectedClientIds());

    if (next.has(clientId)) {
      next.delete(clientId);
    } else {
      next.add(clientId);
    }

    this.selectedClientIds.set(next);
    this.result.set(null);
  }

  isSelected(clientId: string): boolean {
    return this.selectedClientIds().has(clientId);
  }

  submit(): void {
    if (!this.canSubmit()) return;

    this.submitting.set(true);
    this.result.set(null);
    this.errorMessage.set(null);

    const clientIds = this.isAllSelected() ? ('all' as const) : Array.from(this.selectedClientIds());

    this.checklistService
      .bulkCreateChecklists({
        templateId: this.form().templateId,
        clientIds,
        financialYear: this.form().financialYear,
        dueDate: this.form().dueDate || undefined,
        sendWhatsApp: this.form().sendWhatsApp,
      })
      .subscribe({
        next: (response) => {
          this.result.set(response.data);
          this.submitting.set(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Could not create checklist assignments. Please try again.');
          this.submitting.set(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      });
  }

  resetResult(): void {
    this.result.set(null);
    this.errorMessage.set(null);
  }

  getClientInitials(client: Client): string {
    const name = client.user?.name || client.code || 'Client';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'CL';
  }

  serviceTone(serviceType: string): string {
    switch ((serviceType || '').toLowerCase()) {
      case 'gst':
        return 'bg-emerald-100 text-emerald-700';
      case 'audit':
        return 'bg-amber-100 text-amber-700';
      case 'tds':
      case 'roc':
        return 'bg-violet-100 text-violet-700';
      case 'itr':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  private buildFinancialYears(): string[] {
    const current = this.getFinancialYearStart(new Date());
    return Array.from({ length: 5 }, (_, index) => this.formatFinancialYear(current - index));
  }

  private getDefaultFinancialYear(): string {
    return this.formatFinancialYear(this.getFinancialYearStart(new Date()));
  }

  private getFinancialYearStart(date: Date): number {
    const month = date.getMonth();
    const year = date.getFullYear();
    return month >= 3 ? year : year - 1;
  }

  private formatFinancialYear(startYear: number): string {
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
  }
}
