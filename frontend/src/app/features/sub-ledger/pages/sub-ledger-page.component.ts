import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AgeingRow,
  ChartPoint,
  InventoryBalance,
  LedgerEntry,
  PartyBalance,
  ReportRow,
  SubLedgerDashboard,
  SubLedgerSection,
  TaxSummary,
  TopAccountBalance,
} from '../models/sub-ledger.models';
import {
  AuditLogsPayload,
  InventoryLedgerPayload,
  OutstandingPayload,
  PartyLedgerPayload,
  ReportsPayload,
  SubLedgerService,
  TaxLedgerPayload,
} from '../data-access/sub-ledger.service';

@Component({
  selector: 'app-sub-ledger-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="ledger-shell" [class.client-ledger-shell]="clientId">
      <div class="ledger-frame">
        <header class="ledger-header">
          <div class="ledger-title-block">
            <p class="ledger-eyebrow">{{ eyebrow() }}</p>
            <h1>{{ title() }}</h1>
            <p>{{ subtitle() }}</p>
          </div>

          @if (section() !== 'dashboard') {
            <form class="ledger-filter-form" (ngSubmit)="applyFilters()">
              <input
                name="search"
                [(ngModel)]="search"
                class="ledger-input"
                placeholder="Search"
              />
              <input
                name="startDate"
                type="date"
                [(ngModel)]="startDate"
                class="ledger-input"
              />
              <input
                name="endDate"
                type="date"
                [(ngModel)]="endDate"
                class="ledger-input"
              />
              <button class="ledger-apply-button">
                Apply
              </button>
            </form>
          }
        </header>

        <div class="ledger-layout">
          <aside class="ledger-feature-switch" aria-label="Ledger features">
            @for (option of visibleSectionOptions(); track option.id) {
              <button
                type="button"
                [class.active]="section() === option.id"
                (click)="selectSection(option.id)"
              >
                {{ option.label }}
              </button>
            }
          </aside>

          <div class="ledger-content">
            @if (loading()) {
              <div class="grid gap-3 md:grid-cols-3">
                @for (item of [1, 2, 3, 4, 5, 6]; track item) {
                  <div class="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"></div>
                }
              </div>
            } @else if (error()) {
              <div class="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
                {{ error() }}
              </div>
            } @else {
              @switch (section()) {
            @case ('dashboard') {
              @if (dashboardData(); as dashboard) {
                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <article class="metric-card">
                    <span>Total Sub Ledgers</span>
                    <strong>{{ dashboard.kpis.totalSubLedgers | number:'1.0-0' }}</strong>
                  </article>
                  <article class="metric-card">
                    <span>Receivable Amount</span>
                    <strong>{{ dashboard.kpis.receivableAmount | currency:'INR':'symbol':'1.0-0' }}</strong>
                  </article>
                  <article class="metric-card">
                    <span>Payable Amount</span>
                    <strong>{{ dashboard.kpis.payableAmount | currency:'INR':'symbol':'1.0-0' }}</strong>
                  </article>
                  <article class="metric-card">
                    <span>Overdue Amount</span>
                    <strong>{{ dashboard.kpis.overdueAmount | currency:'INR':'symbol':'1.0-0' }}</strong>
                  </article>
                  <article class="metric-card">
                    <span>Today's Transactions</span>
                    <strong>{{ dashboard.kpis.todayTransactions | number:'1.0-0' }}</strong>
                  </article>
                </div>

                <div class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <article class="panel">
                    <div class="panel-head">
                      <h2>Monthly Collections</h2>
                      <span>{{ chartTotal(dashboard.monthlyCollections) | currency:'INR':'symbol':'1.0-0' }}</span>
                    </div>
                    <div class="chart-row">
                      @for (point of dashboard.monthlyCollections; track point.label) {
                        <div class="chart-column">
                          <div class="chart-bar" [style.height.%]="barHeight(point, dashboard.monthlyCollections)"></div>
                          <span>{{ point.label }}</span>
                        </div>
                      } @empty {
                        <div class="empty-block">No collections posted</div>
                      }
                    </div>
                  </article>

                  <article class="panel">
                    <div class="panel-head">
                      <h2>Outstanding</h2>
                      <span>{{ chartTotal(dashboard.outstandingChart) | currency:'INR':'symbol':'1.0-0' }}</span>
                    </div>
                    <div class="space-y-3">
                      @for (point of dashboard.outstandingChart; track point.label) {
                        <div>
                          <div class="mb-1 flex items-center justify-between text-xs font-black text-slate-500">
                            <span>{{ point.label }}</span>
                            <span>{{ point.value | currency:'INR':'symbol':'1.0-0' }}</span>
                          </div>
                          <div class="h-2 rounded-full bg-slate-100">
                            <div class="h-2 rounded-full bg-blue-600" [style.width.%]="barWidth(point, dashboard.outstandingChart)"></div>
                          </div>
                        </div>
                      }
                    </div>
                  </article>
                </div>

                <div class="grid gap-4 lg:grid-cols-2">
                  <ng-container *ngTemplateOutlet="miniList; context: { title: 'Top Customers', rows: dashboard.topCustomers }"></ng-container>
                  <ng-container *ngTemplateOutlet="miniList; context: { title: 'Top Vendors', rows: dashboard.topVendors }"></ng-container>
                </div>
              }
            }
            @case ('customers') {
              <ng-container *ngTemplateOutlet="partyLedger; context: { rows: partyRows(), entries: ledgerRows(), kind: 'customer' }"></ng-container>
            }
            @case ('vendors') {
              <ng-container *ngTemplateOutlet="partyLedger; context: { rows: partyRows(), entries: ledgerRows(), kind: 'vendor' }"></ng-container>
            }
            @case ('employees') {
              <ng-container *ngTemplateOutlet="partyLedger; context: { rows: partyRows(), entries: ledgerRows(), kind: 'employee' }"></ng-container>
            }
            @case ('bank') {
              <ng-container *ngTemplateOutlet="partyLedger; context: { rows: partyRows(), entries: ledgerRows(), kind: 'bank' }"></ng-container>
            }
            @case ('inventory') {
              <div class="grid gap-4">
                <article class="panel">
                  <div class="panel-head">
                    <h2>Item Balances</h2>
                    <span>{{ inventoryRows().length }} items</span>
                  </div>
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>HSN</th>
                          <th class="num">In Qty</th>
                          <th class="num">Out Qty</th>
                          <th class="num">Balance</th>
                          <th class="num">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of inventoryRows(); track row.id) {
                          <tr>
                            <td><strong>{{ row.name }}</strong><small>{{ row.code || 'No SKU' }}</small></td>
                            <td>{{ row.hsn || '-' }}</td>
                            <td class="num text-emerald-600">{{ row.inQty | number:'1.0-2' }}</td>
                            <td class="num text-rose-600">{{ row.outQty | number:'1.0-2' }}</td>
                            <td class="num font-black">{{ row.balance | number:'1.0-2' }}</td>
                            <td class="num">{{ row.stockValue | currency:'INR':'symbol':'1.0-0' }}</td>
                          </tr>
                        } @empty {
                          <tr><td colspan="6" class="empty-cell">No inventory ledger entries</td></tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </article>
                <ng-container *ngTemplateOutlet="entryLedger; context: { entries: ledgerRows() }"></ng-container>
              </div>
            }
            @case ('tax') {
              @if (taxSummary(); as tax) {
                <div class="grid gap-3 md:grid-cols-5">
                  <article class="metric-card"><span>GST Input</span><strong>{{ tax.gstInput | currency:'INR':'symbol':'1.0-0' }}</strong></article>
                  <article class="metric-card"><span>GST Output</span><strong>{{ tax.gstOutput | currency:'INR':'symbol':'1.0-0' }}</strong></article>
                  <article class="metric-card"><span>TDS</span><strong>{{ tax.tdsAmount | currency:'INR':'symbol':'1.0-0' }}</strong></article>
                  <article class="metric-card"><span>TCS</span><strong>{{ tax.tcsAmount | currency:'INR':'symbol':'1.0-0' }}</strong></article>
                  <article class="metric-card"><span>Net GST Payable</span><strong>{{ tax.netGstPayable | currency:'INR':'symbol':'1.0-0' }}</strong></article>
                </div>
              }
              <ng-container *ngTemplateOutlet="entryLedger; context: { entries: ledgerRows() }"></ng-container>
            }
            @case ('outstanding') {
              <div class="grid gap-4 xl:grid-cols-2">
                <ng-container *ngTemplateOutlet="ageingTable; context: { title: 'Receivables Ageing', rows: receivableRows() }"></ng-container>
                <ng-container *ngTemplateOutlet="ageingTable; context: { title: 'Payables Ageing', rows: payableRows() }"></ng-container>
              </div>
            }
            @case ('reports') {
              <article class="panel">
                <div class="panel-head">
                  <h2>Reports</h2>
                  <span>{{ reportRows().length }} reports</span>
                </div>
                <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  @for (report of reportRows(); track report.name) {
                    <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p class="text-xs font-black uppercase text-slate-500">{{ report.name }}</p>
                      <p class="mt-3 text-xl font-black text-slate-950">{{ report.amount | currency:'INR':'symbol':'1.0-0' }}</p>
                      <p class="mt-1 text-xs font-bold text-slate-500">{{ report.rows | number:'1.0-0' }} row(s)</p>
                    </div>
                  }
                </div>
              </article>
            }
            @case ('audit-logs') {
              <ng-container *ngTemplateOutlet="entryLedger; context: { entries: ledgerRows() }"></ng-container>
            }
              }
            }
          </div>
        </div>
      </div>
    </section>

    <ng-template #partyLedger let-rows="rows" let-entries="entries" let-kind="kind">
      <div class="grid gap-4">
        <article class="panel">
          <div class="panel-head">
            <h2>{{ title() }} Balances</h2>
            <span>{{ rows.length }} accounts</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>GSTIN / Mobile</th>
                  <th class="num">Debit</th>
                  <th class="num">Credit</th>
                  <th class="num">Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows; track row.id) {
                  <tr>
                    <td><strong>{{ row.name }}</strong><small>{{ row.code || kind }}</small></td>
                    <td><span>{{ row.gstin || '-' }}</span><small>{{ row.mobile || '-' }}</small></td>
                    <td class="num">{{ (row.totalDebit || 0) | currency:'INR':'symbol':'1.0-0' }}</td>
                    <td class="num">{{ (row.totalCredit || 0) | currency:'INR':'symbol':'1.0-0' }}</td>
                    <td class="num font-black">{{ row.balance | currency:'INR':'symbol':'1.0-0' }}</td>
                    <td><span class="status-pill" [class]="ratingClass(row.rating)">{{ row.rating || 'good' }}</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="empty-cell">No {{ kind }} sub ledger accounts</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
        <ng-container *ngTemplateOutlet="entryLedger; context: { entries: entries }"></ng-container>
      </div>
    </ng-template>

    <ng-template #entryLedger let-entries="entries">
      <article class="panel">
        <div class="panel-head">
          <h2>Transaction Ledger</h2>
          <span>{{ entries.length }} entries</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher</th>
                <th>Account</th>
                <th>Description</th>
                <th class="num">Debit</th>
                <th class="num">Credit</th>
                <th class="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of entries; track entry.id) {
                <tr>
                  <td>{{ entry.date | date:'dd MMM yyyy' }}</td>
                  <td><strong>{{ entry.voucher || '-' }}</strong><small>{{ formatType(entry.transactionType) }}</small></td>
                  <td>{{ entry.partyName || '-' }}</td>
                  <td>{{ entry.description || '-' }}</td>
                  <td class="num text-emerald-700">{{ entry.debit ? (entry.debit | currency:'INR':'symbol':'1.0-0') : '-' }}</td>
                  <td class="num text-rose-700">{{ entry.credit ? (entry.credit | currency:'INR':'symbol':'1.0-0') : '-' }}</td>
                  <td class="num font-black">{{ entry.balanceLabel || (entry.balance | currency:'INR':'symbol':'1.0-0') }}</td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="empty-cell">No transactions found</td></tr>
              }
            </tbody>
          </table>
        </div>
      </article>
    </ng-template>

    <ng-template #miniList let-title="title" let-rows="rows">
      <article class="panel">
        <div class="panel-head">
          <h2>{{ title }}</h2>
          <span>{{ rows.length }} accounts</span>
        </div>
        <div class="divide-y divide-slate-100">
          @for (row of asTopRows(rows); track row.id) {
            <div class="flex items-center justify-between gap-4 px-4 py-3">
              <span class="truncate text-sm font-black text-slate-800">{{ row.name }}</span>
              <strong class="whitespace-nowrap text-sm font-black text-slate-950">{{ row.balance | currency:'INR':'symbol':'1.0-0' }}</strong>
            </div>
          } @empty {
            <div class="px-4 py-8 text-center text-sm font-bold text-slate-400">No balances</div>
          }
        </div>
      </article>
    </ng-template>

    <ng-template #ageingTable let-title="title" let-rows="rows">
      <article class="panel">
        <div class="panel-head">
          <h2>{{ title }}</h2>
          <span>{{ rows.length }} accounts</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th class="num">Total</th>
                <th class="num">0-30</th>
                <th class="num">31-60</th>
                <th class="num">61-90</th>
                <th class="num">90+</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows; track row.id) {
                <tr>
                  <td><strong>{{ row.name }}</strong><small>{{ row.nextDueDate ? 'Due' : (row.code || '-') }} {{ row.nextDueDate | date:'dd MMM yyyy' }}</small></td>
                  <td class="num font-black">{{ row.totalOutstanding | currency:'INR':'symbol':'1.0-0' }}</td>
                  <td class="num">{{ row.bucket0to30 | currency:'INR':'symbol':'1.0-0' }}</td>
                  <td class="num">{{ row.bucket31to60 | currency:'INR':'symbol':'1.0-0' }}</td>
                  <td class="num">{{ row.bucket61to90 | currency:'INR':'symbol':'1.0-0' }}</td>
                  <td class="num text-rose-700">{{ row.bucket90Plus | currency:'INR':'symbol':'1.0-0' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty-cell">No outstanding balances</td></tr>
              }
            </tbody>
          </table>
        </div>
      </article>
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .ledger-shell {
      color: #0f172a;
      min-height: 100%;
    }

    .ledger-shell:not(.client-ledger-shell) {
      background: #f8fafc;
      padding: 20px;
    }

    .client-ledger-shell {
      background: transparent;
      padding: 0;
    }

    .ledger-frame {
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-width: 100%;
      min-width: 0;
    }

    .ledger-header {
      align-items: flex-end;
      background: rgba(255, 255, 255, .92);
      border: 1px solid #dbe4ef;
      border-radius: 16px;
      box-shadow: 0 14px 34px rgba(15, 23, 42, .07);
      display: flex;
      gap: 18px;
      justify-content: space-between;
      padding: 18px 20px;
    }

    .ledger-title-block {
      min-width: 0;
    }

    .ledger-eyebrow {
      color: #2563eb;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0;
      margin: 0 0 8px;
      text-transform: uppercase;
    }

    .ledger-header h1 {
      color: #020617;
      font-size: 28px;
      font-weight: 950;
      line-height: 1.05;
      margin: 0;
    }

    .ledger-header p {
      color: #64748b;
      font-size: 14px;
      font-weight: 650;
      line-height: 1.45;
      margin: 8px 0 0;
      max-width: 720px;
    }

    .ledger-filter-form {
      align-items: center;
      display: grid;
      gap: 10px;
      grid-template-columns: minmax(220px, 1fr) 156px 156px auto;
      max-width: 640px;
      width: min(100%, 640px);
    }

    .ledger-input {
      background: #fff;
      border: 1px solid #cfd9e7;
      border-radius: 12px;
      color: #0f172a;
      font-size: 13px;
      font-weight: 750;
      height: 44px;
      outline: none;
      padding: 0 14px;
      transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
      width: 100%;
    }

    .ledger-input:focus {
      background: #fff;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, .13);
    }

    .ledger-apply-button {
      background: #2454dc;
      border: 0;
      border-radius: 12px;
      box-shadow: 0 10px 22px rgba(37, 99, 235, .22);
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      font-weight: 950;
      height: 44px;
      padding: 0 18px;
      transition: background .18s ease, transform .18s ease, box-shadow .18s ease;
      white-space: nowrap;
    }

    .ledger-apply-button:hover {
      background: #1d4ed8;
      box-shadow: 0 14px 28px rgba(37, 99, 235, .26);
      transform: translateY(-1px);
    }

    .ledger-layout {
      display: flex;
      flex-direction: column;
      gap: 18px;
      min-width: 0;
    }

    .ledger-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }

    .ledger-feature-switch {
      align-items: center;
      align-self: stretch;
      background: #edf5fb;
      border: 1px solid #dbe4ef;
      border-radius: 16px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .045);
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 6px;
      width: 100%;
    }

    .ledger-feature-switch button {
      align-items: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 10px;
      color: #526a88;
      cursor: pointer;
      display: flex;
      flex: 0 0 auto;
      font-size: 13px;
      font-weight: 850;
      justify-content: center;
      min-height: 40px;
      padding: 0 16px;
      text-align: center;
      transition: background .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease;
      white-space: nowrap;
    }

    .ledger-feature-switch button:hover {
      background: rgba(255, 255, 255, .62);
      color: #334155;
    }

    .ledger-feature-switch button.active {
      background: #fff;
      border-color: #e0e8f4;
      box-shadow: 0 8px 18px rgba(15, 23, 42, .08);
      color: #0b4fe8;
    }

    .metric-card {
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      border: 1px solid #dbe4ef;
      border-radius: 14px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .06);
      min-height: 118px;
      padding: 18px;
    }

    .metric-card span,
    .panel-head span {
      color: #5d6f89;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .metric-card strong {
      color: #020617;
      display: block;
      font-size: 26px;
      font-weight: 950;
      line-height: 1.1;
      margin-top: 16px;
    }

    .panel {
      background: #fff;
      border: 1px solid #dbe4ef;
      border-radius: 14px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .055);
      overflow: hidden;
    }

    .panel-head {
      align-items: center;
      background: #fbfdff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      min-height: 60px;
      padding: 15px 18px;
    }

    .panel-head h2 {
      color: #020617;
      font-size: 15px;
      font-weight: 950;
      margin: 0;
    }

    .chart-row {
      align-items: end;
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(6, minmax(48px, 1fr));
      min-height: 250px;
      padding: 20px;
    }

    .chart-column {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 190px;
      justify-content: end;
    }

    .chart-bar {
      background: linear-gradient(180deg, #2563eb, #059669);
      border-radius: 6px 6px 2px 2px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .25);
      min-height: 6px;
      width: 100%;
    }

    .chart-column span {
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
    }

    .table-wrap {
      max-width: 100%;
      overflow-x: auto;
    }

    table {
      border-collapse: collapse;
      min-width: 860px;
      width: 100%;
    }

    th {
      background: #f8fbff;
      color: #5d6f89;
      font-size: 11px;
      font-weight: 950;
      padding: 13px 16px;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    td {
      border-top: 1px solid #eef2f7;
      color: #253449;
      font-size: 13px;
      font-weight: 700;
      padding: 13px 16px;
      vertical-align: middle;
    }

    tbody tr {
      transition: background .16s ease;
    }

    tbody tr:hover {
      background: #f8fbff;
    }

    td strong {
      color: #020617;
      display: block;
      font-size: 13px;
      font-weight: 950;
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    td small {
      color: #94a3b8;
      display: block;
      font-size: 11px;
      font-weight: 800;
      margin-top: 2px;
    }

    .num {
      font-variant-numeric: tabular-nums;
      text-align: right;
      white-space: nowrap;
    }

    .status-pill {
      border-radius: 999px;
      display: inline-flex;
      font-size: 11px;
      font-weight: 950;
      padding: 5px 10px;
      text-transform: uppercase;
    }

    .rating-good {
      background: #dcfce7;
      color: #15803d;
    }

    .rating-watch {
      background: #fef3c7;
      color: #b45309;
    }

    .rating-risk {
      background: #fee2e2;
      color: #b91c1c;
    }

    .empty-cell,
    .empty-block {
      color: #8ea0b8;
      font-size: 13px;
      font-weight: 850;
      padding: 38px 16px;
      text-align: center;
    }

    :host-context(.dark) .ledger-shell,
    :host-context(.dark-theme) .ledger-shell {
      color: #dbeafe;
    }

    :host-context(.dark) .ledger-shell:not(.client-ledger-shell),
    :host-context(.dark-theme) .ledger-shell:not(.client-ledger-shell) {
      background: #071321;
    }

    :host-context(.dark) .ledger-header,
    :host-context(.dark-theme) .ledger-header,
    :host-context(.dark) .ledger-feature-switch,
    :host-context(.dark-theme) .ledger-feature-switch,
    :host-context(.dark) .metric-card,
    :host-context(.dark-theme) .metric-card,
    :host-context(.dark) .panel,
    :host-context(.dark-theme) .panel {
      background: #0f1f34;
      border-color: rgba(148, 163, 184, .24);
      box-shadow: none;
    }

    :host-context(.dark) .ledger-header h1,
    :host-context(.dark-theme) .ledger-header h1,
    :host-context(.dark) .metric-card strong,
    :host-context(.dark-theme) .metric-card strong,
    :host-context(.dark) .panel-head h2,
    :host-context(.dark-theme) .panel-head h2,
    :host-context(.dark) td strong,
    :host-context(.dark-theme) td strong {
      color: #f8fafc;
    }

    :host-context(.dark) .ledger-header p,
    :host-context(.dark-theme) .ledger-header p,
    :host-context(.dark) .metric-card span,
    :host-context(.dark-theme) .metric-card span,
    :host-context(.dark) .panel-head span,
    :host-context(.dark-theme) .panel-head span,
    :host-context(.dark) .chart-column span,
    :host-context(.dark-theme) .chart-column span,
    :host-context(.dark) td small,
    :host-context(.dark-theme) td small,
    :host-context(.dark) .empty-cell,
    :host-context(.dark-theme) .empty-cell,
    :host-context(.dark) .empty-block,
    :host-context(.dark-theme) .empty-block {
      color: #9fb2ca;
    }

    :host-context(.dark) .ledger-eyebrow,
    :host-context(.dark-theme) .ledger-eyebrow {
      color: #6ea8ff;
    }

    :host-context(.dark) .ledger-input,
    :host-context(.dark-theme) .ledger-input {
      background: #13243b;
      border-color: rgba(148, 163, 184, .28);
      color: #eef6ff;
    }

    :host-context(.dark) .ledger-input::placeholder,
    :host-context(.dark-theme) .ledger-input::placeholder {
      color: #8da2bd;
    }

    :host-context(.dark) .ledger-input:focus,
    :host-context(.dark-theme) .ledger-input:focus {
      background: #162a45;
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, .16);
    }

    :host-context(.dark) .ledger-input[type="date"]::-webkit-calendar-picker-indicator,
    :host-context(.dark-theme) .ledger-input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1) opacity(.75);
    }

    :host-context(.dark) .ledger-feature-switch button,
    :host-context(.dark-theme) .ledger-feature-switch button {
      color: #9fb2ca;
    }

    :host-context(.dark) .ledger-feature-switch button:hover,
    :host-context(.dark-theme) .ledger-feature-switch button:hover {
      background: rgba(96, 165, 250, .12);
      color: #dbeafe;
    }

    :host-context(.dark) .ledger-feature-switch button.active,
    :host-context(.dark-theme) .ledger-feature-switch button.active {
      background: #172b48;
      border-color: rgba(96, 165, 250, .28);
      box-shadow: none;
      color: #6ea8ff;
    }

    :host-context(.dark) .panel-head,
    :host-context(.dark-theme) .panel-head {
      background: #13243b;
      border-bottom-color: rgba(148, 163, 184, .22);
    }

    :host-context(.dark) th,
    :host-context(.dark-theme) th {
      background: #172b48;
      color: #9fc2ef;
    }

    :host-context(.dark) td,
    :host-context(.dark-theme) td {
      border-top-color: rgba(148, 163, 184, .2);
      color: #dbeafe;
    }

    :host-context(.dark) tbody tr,
    :host-context(.dark-theme) tbody tr {
      background: #0f1f34;
    }

    :host-context(.dark) tbody tr:hover,
    :host-context(.dark-theme) tbody tr:hover {
      background: #142844;
    }

    :host-context(.dark) .chart-row,
    :host-context(.dark-theme) .chart-row,
    :host-context(.dark) .table-wrap,
    :host-context(.dark-theme) .table-wrap {
      background: #0f1f34;
    }

    :host-context(.dark) .ledger-content :where(.bg-white, .bg-slate-50, .bg-slate-100),
    :host-context(.dark-theme) .ledger-content :where(.bg-white, .bg-slate-50, .bg-slate-100) {
      background-color: #13243b;
    }

    :host-context(.dark) .ledger-content :where(.border-slate-100, .border-slate-200),
    :host-context(.dark-theme) .ledger-content :where(.border-slate-100, .border-slate-200) {
      border-color: rgba(148, 163, 184, .22);
    }

    :host-context(.dark) .ledger-content :where(.divide-slate-100) > :not([hidden]) ~ :not([hidden]),
    :host-context(.dark-theme) .ledger-content :where(.divide-slate-100) > :not([hidden]) ~ :not([hidden]) {
      border-color: rgba(148, 163, 184, .18);
    }

    :host-context(.dark) .ledger-content :where(.text-slate-950, .text-slate-900, .text-slate-800),
    :host-context(.dark-theme) .ledger-content :where(.text-slate-950, .text-slate-900, .text-slate-800) {
      color: #f8fafc;
    }

    :host-context(.dark) .ledger-content :where(.text-slate-700, .text-slate-600, .text-slate-500, .text-slate-400),
    :host-context(.dark-theme) .ledger-content :where(.text-slate-700, .text-slate-600, .text-slate-500, .text-slate-400) {
      color: #9fb2ca;
    }

    :host-context(.dark) .ledger-content :where(.text-emerald-600, .text-emerald-700),
    :host-context(.dark-theme) .ledger-content :where(.text-emerald-600, .text-emerald-700) {
      color: #6ee7b7;
    }

    :host-context(.dark) .ledger-content :where(.text-rose-600, .text-rose-700),
    :host-context(.dark-theme) .ledger-content :where(.text-rose-600, .text-rose-700) {
      color: #fda4af;
    }

    :host-context(.dark) .rating-good,
    :host-context(.dark-theme) .rating-good {
      background: rgba(34, 197, 94, .18);
      color: #86efac;
    }

    :host-context(.dark) .rating-watch,
    :host-context(.dark-theme) .rating-watch {
      background: rgba(245, 158, 11, .18);
      color: #fcd34d;
    }

    :host-context(.dark) .rating-risk,
    :host-context(.dark-theme) .rating-risk {
      background: rgba(248, 113, 113, .18);
      color: #fca5a5;
    }

    @media (max-width: 1080px) {
      .ledger-header {
        align-items: stretch;
        flex-direction: column;
      }

      .ledger-filter-form {
        max-width: none;
        width: 100%;
      }
    }

    @media (max-width: 860px) {
      .ledger-shell:not(.client-ledger-shell) {
        padding: 12px;
      }

      .ledger-feature-switch button {
        min-width: max-content;
      }

      .ledger-filter-form {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 620px) {
      .ledger-header {
        border-radius: 14px;
        padding: 16px;
      }

      .ledger-header h1 {
        font-size: 24px;
      }

      .ledger-filter-form {
        grid-template-columns: 1fr;
      }

      .chart-row {
        grid-template-columns: repeat(3, minmax(56px, 1fr));
      }

      .metric-card strong {
        font-size: 20px;
      }
    }
  `],
})
export class SubLedgerPageComponent implements OnInit, OnChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(SubLedgerService);

  @Input() clientId: string | null = null;

  search = '';
  startDate = '';
  endDate = '';

  section = signal<SubLedgerSection>('dashboard');
  loading = signal(false);
  error = signal<string | null>(null);
  dashboardData = signal<SubLedgerDashboard | null>(null);
  partyData = signal<PartyLedgerPayload | null>(null);
  inventoryData = signal<InventoryLedgerPayload | null>(null);
  taxData = signal<TaxLedgerPayload | null>(null);
  outstandingData = signal<OutstandingPayload | null>(null);
  reportsData = signal<ReportsPayload | null>(null);
  auditData = signal<AuditLogsPayload | null>(null);

  readonly sectionOptions: ReadonlyArray<{ id: SubLedgerSection; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'customers', label: 'Customer Ledger' },
    { id: 'vendors', label: 'Vendor Ledger' },
    { id: 'inventory', label: 'Inventory Ledger' },
    { id: 'employees', label: 'Employee Ledger' },
    { id: 'tax', label: 'Tax Ledger' },
    { id: 'bank', label: 'Bank Sub Ledger' },
    { id: 'outstanding', label: 'Outstanding' },
    { id: 'reports', label: 'Reports' },
    { id: 'audit-logs', label: 'Audit Logs' },
  ];

  title = computed(() => {
    const labels: Record<SubLedgerSection, string> = {
      dashboard: 'Dashboard',
      customers: 'Customer Ledger',
      vendors: 'Vendor Ledger',
      inventory: 'Inventory Ledger',
      employees: 'Employee Ledger',
      tax: 'Tax Ledger',
      bank: 'Bank Sub Ledger',
      outstanding: 'Outstanding',
      reports: 'Reports',
      'audit-logs': 'Audit Logs',
    };
    return labels[this.section()];
  });

  subtitle = computed(() => {
    const copy: Record<SubLedgerSection, string> = {
      dashboard: 'Subsidiary ledger control for receivables, payables, inventory, tax, and ageing.',
      customers: 'Client-wise receivable balances, invoices, receipts, ageing, and risk flags.',
      vendors: 'Supplier-wise payable balances, bills, payments, due dates, and ageing.',
      inventory: 'Item-wise quantity movement across purchase, sale, transfer, and adjustment entries.',
      employees: 'Salary, advance, reimbursement, and incentive balances.',
      tax: 'GST input, GST output, TDS, TCS, and net tax position.',
      bank: 'Bank-wise receipts, payments, contra movements, and reconciliation balances.',
      outstanding: 'Receivable and payable ageing by account.',
      reports: 'Outstanding, ageing, collection, payment, and ledger summary reports.',
      'audit-logs': 'Posting and ledger activity trail.',
    };
    return copy[this.section()];
  });

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.section.set((data['section'] as SubLedgerSection) ?? (this.clientId ? 'vendors' : 'dashboard'));
      this.normalizeSectionForScope();
      this.load();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'] && !changes['clientId'].firstChange) {
      this.normalizeSectionForScope();
      this.load();
    }
  }

  applyFilters(): void {
    this.load();
  }

  visibleSectionOptions(): ReadonlyArray<{ id: SubLedgerSection; label: string }> {
    return this.clientId
      ? this.sectionOptions.filter((option) => option.id !== 'dashboard' && option.id !== 'customers')
      : this.sectionOptions;
  }

  eyebrow(): string {
    return this.clientId ? 'Client Ledger' : 'Sub Ledger';
  }

  private normalizeSectionForScope(): void {
    if (this.clientId && (this.section() === 'dashboard' || this.section() === 'customers')) {
      this.section.set('vendors');
    }
  }

  selectSection(section: SubLedgerSection): void {
    if (this.section() === section) return;

    this.section.set(section);
    this.search = '';
    this.startDate = '';
    this.endDate = '';
    this.load();
  }

  partyRows(): PartyBalance[] {
    return this.partyData()?.summaries ?? [];
  }

  inventoryRows(): InventoryBalance[] {
    return this.inventoryData()?.summaries ?? [];
  }

  taxSummary(): TaxSummary | null {
    return this.taxData()?.summary ?? null;
  }

  ledgerRows(): LedgerEntry[] {
    if (this.section() === 'inventory') return this.inventoryData()?.entries ?? [];
    if (this.section() === 'tax') return this.taxData()?.entries ?? [];
    if (this.section() === 'audit-logs') return this.auditData()?.entries ?? [];
    return this.partyData()?.entries ?? [];
  }

  receivableRows(): AgeingRow[] {
    return this.outstandingData()?.receivables ?? [];
  }

  payableRows(): AgeingRow[] {
    return this.outstandingData()?.payables ?? [];
  }

  reportRows(): ReportRow[] {
    return this.reportsData()?.reports ?? [];
  }

  chartTotal(points: ChartPoint[]): number {
    return points.reduce((sum, point) => sum + point.value, 0);
  }

  barHeight(point: ChartPoint, points: ChartPoint[]): number {
    return Math.max(this.barWidth(point, points), point.value > 0 ? 8 : 0);
  }

  barWidth(point: ChartPoint, points: ChartPoint[]): number {
    const max = Math.max(...points.map((item) => item.value), 1);
    return Math.min(Math.round((point.value / max) * 100), 100);
  }

  asTopRows(rows: TopAccountBalance[]): TopAccountBalance[] {
    return rows;
  }

  ratingClass(rating?: string): string {
    if (rating === 'risk') return 'rating-risk';
    if (rating === 'watch') return 'rating-watch';
    return 'rating-good';
  }

  formatType(type: string | null): string {
    return (type || 'entry').replace(/_/g, ' ');
  }

  private query() {
    return {
      clientId: this.clientId || undefined,
      search: this.search || undefined,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      limit: 100,
    };
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    const section = this.section();
    if (section === 'dashboard') {
      this.service.dashboard(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.dashboardData.set(res.data);
          this.loading.set(false);
        },
        error: () => this.fail(),
      });
      return;
    }

    if (section === 'customers') {
      this.service.customers(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => this.setParty(res.data),
        error: () => this.fail(),
      });
      return;
    }

    if (section === 'vendors') {
      this.service.vendors(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => this.setParty(res.data),
        error: () => this.fail(),
      });
      return;
    }

    if (section === 'employees') {
      this.service.employees(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => this.setParty(res.data),
        error: () => this.fail(),
      });
      return;
    }

    if (section === 'bank') {
      this.service.bank(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => this.setParty(res.data),
        error: () => this.fail(),
      });
      return;
    }

    if (section === 'inventory') {
      this.service.inventory(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.inventoryData.set(res.data);
          this.loading.set(false);
        },
        error: () => this.fail(),
      });
      return;
    }

    if (section === 'tax') {
      this.service.tax(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.taxData.set(res.data);
          this.loading.set(false);
        },
        error: () => this.fail(),
      });
      return;
    }

    if (section === 'outstanding') {
      this.service.outstanding(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.outstandingData.set(res.data);
          this.loading.set(false);
        },
        error: () => this.fail(),
      });
      return;
    }

    if (section === 'reports') {
      this.service.reports(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.reportsData.set(res.data);
          this.loading.set(false);
        },
        error: () => this.fail(),
      });
      return;
    }

    this.service.auditLogs(this.query()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.auditData.set(res.data);
        this.loading.set(false);
      },
      error: () => this.fail(),
    });
  }

  private setParty(data: PartyLedgerPayload): void {
    this.partyData.set(data);
    this.loading.set(false);
  }

  private fail(): void {
    this.error.set('Sub ledger data could not be loaded.');
    this.loading.set(false);
  }
}
