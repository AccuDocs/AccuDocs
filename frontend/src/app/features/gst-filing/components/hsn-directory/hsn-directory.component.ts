import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
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
    <div class="hd-shell" [class.hd-shell--picker]="isPicker">
      @if (!isPicker) {
        <section class="hd-hero">
          <div class="hd-hero-copy">
            <span class="hd-kicker">GST compliance master</span>
            <h1>HSN / SAC Directory</h1>
            <p>
              Search, validate, import, and reuse GST classification codes across sales, purchases,
              inventory, billing, and return preparation.
            </p>
          </div>

          <div class="hd-hero-actions">
            <button class="hd-action hd-action--ghost" type="button" (click)="downloadTemplate()">
              Sample CSV
            </button>
            <button class="hd-action hd-action--ghost" type="button" (click)="exportVisible()" [disabled]="codes().length === 0">
              Export visible
            </button>
            <button
              class="hd-action hd-action--live"
              type="button"
              [class.hd-action--live-on]="liveMode()"
              (click)="toggleLiveMode()"
              title="When enabled, numeric HSN/SAC searches refresh from the configured live GST provider first"
            >
              {{ liveMode() ? 'Live auto on' : 'Live auto off' }}
            </button>
            <button
              class="hd-action hd-action--sync"
              type="button"
              (click)="syncVisibleLive()"
              [disabled]="liveSyncing() || codes().length === 0"
              title="Refresh visible codes from live GST provider"
            >
              @if (liveSyncing()) {
                <span class="hd-spinner hd-spinner--light"></span>
                Syncing
              } @else {
                Sync visible live
              }
            </button>
            <button
              class="hd-action hd-action--primary"
              type="button"
              (click)="triggerImport()"
              [disabled]="importing()"
              title="Import HSN/SAC directory from Excel or CSV"
            >
              @if (importing()) {
                <span class="hd-spinner hd-spinner--light"></span>
                Importing
              } @else {
                Bulk import
              }
            </button>
            <input #fileInput type="file" (change)="onFileSelected($event)" accept=".xlsx,.xls,.csv" class="hidden" />
          </div>
        </section>

        <section class="hd-metrics">
          <article class="hd-metric-card">
            <span>Total records</span>
            <strong>{{ total() | number }}</strong>
            <small>Available in directory</small>
          </article>
          <article class="hd-metric-card">
            <span>Visible HSN</span>
            <strong>{{ visibleHsnCount() }}</strong>
            <small>Goods codes in current result</small>
          </article>
          <article class="hd-metric-card">
            <span>Visible SAC</span>
            <strong>{{ visibleSacCount() }}</strong>
            <small>Service codes in current result</small>
          </article>
          <article class="hd-metric-card">
            <span>Most common rate</span>
            <strong>{{ topVisibleRate() }}</strong>
            <small>Based on visible rows</small>
          </article>
        </section>
      }

      <section class="hd-workspace">
        <main class="hd-main">
          <section class="hd-command-panel">
            <div class="hd-search-row">
              <div class="hd-search-wrap">
                <svg class="hd-search-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" />
                </svg>
                <input
                  id="hsn-search-input"
                  class="hd-search-input"
                  type="text"
                  placeholder="Search code, description, chapter, goods, service..."
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onSearchChange($event)"
                />
                <div class="hd-search-actions">
                  @if (searchQuery) {
                    <button class="hd-search-clear" type="button" (click)="clearSearch()" title="Clear search">Clear</button>
                  }
                  @if (canSearchOnline()) {
                    <button
                      class="hd-live-sync-btn"
                      type="button"
                      (click)="searchOnline()"
                      [disabled]="isSearchingOnline()"
                      title="Fetch official data from configured GST provider"
                    >
                      @if (isSearchingOnline()) {
                        <span class="hd-spinner hd-spinner--xs"></span>
                      }
                      Fetch live
                    </button>
                  }
                </div>
              </div>

              @if (activeFilterCount() > 0) {
                <button class="hd-reset-btn" type="button" (click)="reset()">Reset {{ activeFilterCount() }} filter(s)</button>
              }
            </div>

            <div class="hd-filter-section">
              <div class="hd-filter-block">
                <span>Type</span>
                <div class="hd-filter-group">
                  <button class="hd-type-btn" type="button" [class.hd-type-btn--active]="!selectedType()" (click)="setType(null)">All</button>
                  <button class="hd-type-btn" type="button" [class.hd-type-btn--active]="selectedType() === 'HSN'" (click)="setType('HSN')">HSN goods</button>
                  <button class="hd-type-btn" type="button" [class.hd-type-btn--active]="selectedType() === 'SAC'" (click)="setType('SAC')">SAC services</button>
                </div>
              </div>

              <div class="hd-filter-block hd-filter-block--wide">
                <span>GST rate</span>
                <div class="hd-rate-chips">
                  <button class="hd-rate-chip" type="button" [class.hd-rate-chip--active]="!selectedRate()" (click)="setRate(null)">Any rate</button>
                  @for (rate of gstRates; track rate) {
                    <button
                      class="hd-rate-chip"
                      type="button"
                      [class.hd-rate-chip--active]="selectedRate() === rate"
                      (click)="setRate(rate)"
                    >
                      {{ rate }}%
                    </button>
                  }
                </div>
              </div>
            </div>
          </section>

          <section class="hd-table-card">
            <div class="hd-table-titlebar">
              <div>
                <h2>Directory records</h2>
                <p>
                  {{ codes().length }} visible of {{ total() | number }} total records
                  @if (lastLiveSyncAt()) {
                    · last live sync {{ lastLiveSyncAt() }}
                  }
                </p>
              </div>
              <span class="hd-status-chip" [class.hd-status-chip--live]="liveMode()">
                {{ liveMode() ? 'Live enabled' : 'Local cache' }}
              </span>
            </div>

            @if (isLoading()) {
              <div class="hd-loading">
                @for (i of [1,2,3,4,5,6,7,8]; track i) {
                  <div class="hd-skeleton-row">
                    <div class="hd-skeleton" style="width: 72px"></div>
                    <div class="hd-skeleton" style="width: 45%"></div>
                    <div class="hd-skeleton" style="width: 60px"></div>
                    <div class="hd-skeleton" style="width: 80px"></div>
                  </div>
                }
              </div>
            } @else {
              <div class="hd-table-scroll">
                <table class="hd-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th>GST rate</th>
                      <th>Chapter</th>
                      <th class="hd-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (code of codes(); track code.id) {
                      <tr
                        class="hd-row"
                        [class.hd-row--selected]="selectedCode()?.id === code.id"
                        [class.hd-row--clickable]="isPicker"
                        (click)="onRowClick(code)"
                      >
                        <td>
                          <button class="hd-code-badge" type="button" (click)="copyCode(code); $event.stopPropagation()">
                            {{ code.code }}
                          </button>
                        </td>
                        <td class="hd-desc-cell">
                          <strong>{{ code.description }}</strong>
                          <span>{{ code.type === 'HSN' ? 'Goods classification' : 'Service classification' }}</span>
                          @if (isPicker) {
                            <small>Click row to select</small>
                          }
                        </td>
                        <td>
                          <span class="hd-type-pill" [class.hd-type-pill--hsn]="code.type === 'HSN'" [class.hd-type-pill--sac]="code.type === 'SAC'">
                            {{ code.type }}
                          </span>
                        </td>
                        <td>
                          <span [class]="'hd-rate-pill hd-rate-pill--' + rateTone(code.gstRate)">
                            {{ code.gstRate }}%
                          </span>
                        </td>
                        <td class="hd-muted">{{ chapterLabel(code) }}</td>
                        <td class="hd-actions-cell">
                          <button class="hd-row-action" type="button" (click)="selectCode(code); $event.stopPropagation()">
                            {{ isPicker ? 'Select' : 'View' }}
                          </button>
                          <button class="hd-row-action" type="button" (click)="copyCode(code); $event.stopPropagation()">
                            Copy
                          </button>
                        </td>
                      </tr>
                    }

                    @if (codes().length === 0) {
                      <tr>
                        <td colspan="6" class="hd-empty">
                          <div class="hd-empty-inner">
                            <div class="hd-empty-icon">HSN</div>
                            <h3>No codes found</h3>
                            <p>Try clearing filters, searching a shorter keyword, or fetching a numeric code live.</p>
                            <div class="hd-empty-actions">
                              <button class="hd-action hd-action--ghost" type="button" (click)="reset()">Clear filters</button>
                              @if (canSearchOnline()) {
                                <button class="hd-action hd-action--primary" type="button" (click)="searchOnline()" [disabled]="isSearchingOnline()">
                                  Fetch live
                                </button>
                              }
                            </div>
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
            <div class="hd-pagination">
              <button class="hd-page-btn" type="button" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)">Prev</button>
              <span>Page {{ currentPage() }} of {{ totalPages() }}</span>
              <button class="hd-page-btn" type="button" [disabled]="currentPage() === totalPages()" (click)="goToPage(currentPage() + 1)">Next</button>
            </div>
          }
        </main>

        @if (!isPicker) {
          <aside class="hd-side">
            <section class="hd-detail-card">
              <span class="hd-card-label">Selected code</span>
              @if (selectedCode(); as code) {
                <div class="hd-detail-code">{{ code.code }}</div>
                <h3>{{ code.description }}</h3>
                <div class="hd-detail-grid">
                  <div>
                    <span>Type</span>
                    <strong>{{ code.type }}</strong>
                  </div>
                  <div>
                    <span>GST rate</span>
                    <strong>{{ code.gstRate }}%</strong>
                  </div>
                  <div>
                    <span>Chapter</span>
                    <strong>{{ chapterLabel(code) }}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{{ code.isActive ? 'Active' : 'Inactive' }}</strong>
                  </div>
                </div>
                <button class="hd-copy-wide" type="button" (click)="copyCode(code)">
                  {{ copiedCode() === code.id ? 'Copied' : 'Copy code details' }}
                </button>
              } @else {
                <p class="hd-muted-panel">Select a code to preview classification details.</p>
              }
            </section>

            <section class="hd-side-card hd-side-card--live">
              <span class="hd-card-label">Live directory status</span>
              <h3>{{ liveMode() ? 'Auto live refresh enabled' : 'Local cache mode' }}</h3>
              <p>
                Numeric code searches can refresh from the configured GST/Sandbox provider before results are shown.
                Use visible sync to refresh the current page.
              </p>
              <div class="hd-live-status-grid">
                <div>
                  <span>Provider</span>
                  <strong>Sandbox/GSTN</strong>
                </div>
                <div>
                  <span>Last sync</span>
                  <strong>{{ lastLiveSyncAt() || 'Not synced' }}</strong>
                </div>
              </div>
              <button class="hd-copy-wide" type="button" (click)="syncVisibleLive()" [disabled]="liveSyncing() || codes().length === 0">
                {{ liveSyncing() ? 'Syncing live data...' : 'Refresh visible codes live' }}
              </button>
              @if (liveSyncSummary()) {
                <small class="hd-live-note">{{ liveSyncSummary() }}</small>
              }
            </section>

            <section class="hd-side-card">
              <span class="hd-card-label">Smart checks to add</span>
              <ul class="hd-roadmap-list">
                <li>Warn when invoice GST rate does not match selected HSN/SAC.</li>
                <li>Auto-suggest HSN/SAC from inventory category and item name.</li>
                <li>Maintain firm-approved aliases for frequently used codes.</li>
                <li>Track code usage in sales, purchases, and GSTR-1 HSN summary.</li>
              </ul>
            </section>

            <section class="hd-side-card hd-side-card--accent">
              <span class="hd-card-label">Recommended integrations</span>
              <div class="hd-integration-list">
                <button type="button" (click)="quickSearch('accounting services')">Accounting services</button>
                <button type="button" (click)="quickSearch('laptop')">Laptop and computers</button>
                <button type="button" (click)="quickSearch('consulting')">Consulting services</button>
              </div>
            </section>
          </aside>
        }
      </section>
    </div>
  `,
  styles: [`
    .hd-shell {
      display: flex;
      flex-direction: column;
      gap: 18px;
      width: min(100%, 1560px);
      padding: 28px 32px;
    }

    .hd-shell--picker {
      width: 100%;
      padding: 0;
      gap: 12px;
    }

    .hd-hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      border: 1px solid #dbe7ff;
      border-radius: 24px;
      padding: 24px;
      background:
        radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.12), transparent 34%),
        linear-gradient(135deg, #ffffff 0%, #f8fbff 55%, #eef6ff 100%);
      box-shadow: 0 18px 46px rgba(15, 23, 42, 0.06);
    }

    .hd-kicker,
    .hd-card-label {
      display: inline-flex;
      color: #2563eb;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .hd-hero h1 {
      margin: 8px 0 6px;
      color: #0f172a;
      font-size: clamp(28px, 3vw, 42px);
      font-weight: 950;
      letter-spacing: -0.06em;
    }

    .hd-hero p {
      max-width: 760px;
      margin: 0;
      color: #64748b;
      font-size: 14px;
      line-height: 1.65;
    }

    .hd-hero-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 10px;
    }

    .hd-action,
    .hd-page-btn,
    .hd-row-action,
    .hd-reset-btn,
    .hd-copy-wide {
      border: 0;
      cursor: pointer;
      font-family: inherit;
      transition: background 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
    }

    .hd-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 42px;
      padding: 0 16px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 850;
      white-space: nowrap;
    }

    .hd-action--ghost {
      border: 1px solid #dbe3ef;
      color: #334155;
      background: #ffffff;
    }

    .hd-action--ghost:hover:not(:disabled) {
      color: #2563eb;
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    .hd-action--primary {
      color: #ffffff;
      background: linear-gradient(135deg, #2563eb, #0f766e);
      box-shadow: 0 14px 30px rgba(37, 99, 235, 0.18);
    }

    .hd-action--primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #1d4ed8, #0f6b63);
    }

    .hd-action--sync {
      color: #ffffff;
      background: linear-gradient(135deg, #0f766e, #059669);
      box-shadow: 0 14px 30px rgba(15, 118, 110, 0.18);
    }

    .hd-action--sync:hover:not(:disabled) {
      background: linear-gradient(135deg, #0f6b63, #047857);
    }

    .hd-action--live {
      border: 1px solid #dbe3ef;
      color: #475569;
      background: #ffffff;
    }

    .hd-action--live:hover:not(:disabled) {
      color: #2563eb;
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    .hd-action--live-on {
      border-color: #99f6e4;
      color: #0f766e;
      background: #f0fdfa;
    }

    .hd-action:disabled,
    .hd-page-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .hidden {
      display: none;
    }

    .hd-metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }

    .hd-metric-card {
      min-height: 104px;
      border: 1px solid #dbe3ef;
      border-radius: 20px;
      padding: 18px;
      background: #ffffff;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.045);
    }

    .hd-metric-card span,
    .hd-filter-block > span {
      display: block;
      color: #8a9ab3;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .hd-metric-card strong {
      display: block;
      margin-top: 8px;
      color: #0f172a;
      font-size: 28px;
      font-weight: 950;
      letter-spacing: -0.05em;
    }

    .hd-metric-card small {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 12px;
      font-weight: 650;
    }

    .hd-workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 18px;
      align-items: start;
    }

    .hd-shell--picker .hd-workspace {
      grid-template-columns: 1fr;
    }

    .hd-main {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }

    .hd-command-panel,
    .hd-table-card,
    .hd-detail-card,
    .hd-side-card {
      border: 1px solid #dbe3ef;
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.045);
    }

    .hd-command-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
    }

    .hd-search-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .hd-search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    }

    .hd-search-icon {
      position: absolute;
      left: 14px;
      width: 17px;
      height: 17px;
      color: #94a3b8;
      pointer-events: none;
    }

    .hd-search-input {
      width: 100%;
      min-height: 46px;
      padding: 0 148px 0 42px;
      border: 1px solid #dbe3ef;
      border-radius: 14px;
      outline: none;
      background: #f8fafc;
      color: #0f172a;
      font-size: 14px;
      font-weight: 650;
    }

    .hd-search-input:focus {
      border-color: #93c5fd;
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
    }

    .hd-search-actions {
      position: absolute;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .hd-search-clear,
    .hd-live-sync-btn,
    .hd-reset-btn {
      min-height: 30px;
      border-radius: 10px;
      padding: 0 10px;
      font-size: 12px;
      font-weight: 800;
    }

    .hd-search-clear,
    .hd-reset-btn {
      border: 1px solid #dbe3ef;
      color: #64748b;
      background: #ffffff;
    }

    .hd-search-clear:hover,
    .hd-reset-btn:hover {
      color: #2563eb;
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    .hd-live-sync-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 0;
      color: #ffffff;
      background: #2563eb;
      cursor: pointer;
    }

    .hd-filter-section {
      display: grid;
      grid-template-columns: 260px minmax(0, 1fr);
      gap: 14px;
      align-items: start;
    }

    .hd-filter-block {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }

    .hd-filter-group,
    .hd-rate-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .hd-type-btn,
    .hd-rate-chip {
      min-height: 32px;
      border: 1px solid #dbe3ef;
      border-radius: 999px;
      padding: 0 13px;
      color: #64748b;
      background: #f8fafc;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
    }

    .hd-type-btn:hover,
    .hd-rate-chip:hover {
      border-color: #bfdbfe;
      color: #2563eb;
      background: #eff6ff;
    }

    .hd-type-btn--active {
      border-color: #2563eb;
      color: #ffffff;
      background: #2563eb;
    }

    .hd-rate-chip--active {
      border-color: #0f766e;
      color: #ffffff;
      background: #0f766e;
    }

    .hd-table-card {
      overflow: hidden;
    }

    .hd-table-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px;
      border-bottom: 1px solid #e8eef7;
      background: #fbfdff;
    }

    .hd-table-titlebar h2 {
      margin: 0;
      color: #0f172a;
      font-size: 16px;
      font-weight: 900;
    }

    .hd-table-titlebar p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 12px;
      font-weight: 650;
    }

    .hd-status-chip {
      border-radius: 999px;
      padding: 5px 10px;
      color: #047857;
      background: #dcfce7;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .hd-status-chip--live {
      color: #1d4ed8;
      background: #dbeafe;
    }

    .hd-table-scroll {
      overflow-x: auto;
    }

    .hd-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 840px;
    }

    .hd-table th {
      padding: 12px 16px;
      border-bottom: 1px solid #e8eef7;
      color: #718198;
      background: #f8fafc;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .hd-th-actions,
    .hd-actions-cell {
      text-align: right;
    }

    .hd-row {
      border-bottom: 1px solid #eef2f7;
      transition: background 130ms ease;
    }

    .hd-row:hover,
    .hd-row--selected {
      background: #f0f7ff;
    }

    .hd-row--clickable {
      cursor: pointer;
    }

    .hd-table td {
      padding: 13px 16px;
      color: #243044;
      font-size: 13px;
      vertical-align: middle;
    }

    .hd-code-badge {
      display: inline-flex;
      border: 1px solid #dbeafe;
      border-radius: 9px;
      padding: 5px 10px;
      color: #1d4ed8;
      background: #eff6ff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }

    .hd-code-badge:hover {
      border-color: #93c5fd;
      background: #dbeafe;
    }

    .hd-desc-cell strong {
      display: block;
      color: #1e293b;
      font-size: 13px;
      font-weight: 750;
      line-height: 1.35;
    }

    .hd-desc-cell span,
    .hd-desc-cell small,
    .hd-muted {
      display: block;
      margin-top: 3px;
      color: #8492a6;
      font-size: 11px;
      font-weight: 700;
    }

    .hd-type-pill,
    .hd-rate-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 24px;
      border-radius: 999px;
      padding: 0 10px;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }

    .hd-type-pill--hsn {
      color: #047857;
      background: #dcfce7;
    }

    .hd-type-pill--sac {
      color: #b45309;
      background: #fef3c7;
    }

    .hd-rate-pill--zero {
      color: #475569;
      background: #f1f5f9;
    }

    .hd-rate-pill--low {
      color: #047857;
      background: #dcfce7;
    }

    .hd-rate-pill--mid {
      color: #1d4ed8;
      background: #dbeafe;
    }

    .hd-rate-pill--standard {
      color: #6d28d9;
      background: #ede9fe;
    }

    .hd-rate-pill--high {
      color: #be123c;
      background: #ffe4e6;
    }

    .hd-actions-cell {
      white-space: nowrap;
    }

    .hd-row-action {
      min-height: 30px;
      border: 1px solid #dbe3ef;
      border-radius: 10px;
      padding: 0 10px;
      color: #475569;
      background: #ffffff;
      font-size: 12px;
      font-weight: 800;
      margin-left: 6px;
    }

    .hd-row-action:hover {
      color: #2563eb;
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    .hd-loading {
      display: flex;
      flex-direction: column;
      padding: 14px 18px;
    }

    .hd-skeleton-row {
      display: flex;
      gap: 24px;
      padding: 14px 0;
      border-bottom: 1px solid #eef2f7;
    }

    .hd-skeleton {
      height: 16px;
      border-radius: 999px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.3s infinite linear;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .hd-empty {
      padding: 52px 24px !important;
      text-align: center;
    }

    .hd-empty-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .hd-empty-icon {
      display: grid;
      place-items: center;
      width: 58px;
      height: 58px;
      border-radius: 18px;
      color: #2563eb;
      background: #eff6ff;
      font-size: 13px;
      font-weight: 950;
    }

    .hd-empty h3 {
      margin: 0;
      color: #0f172a;
      font-size: 18px;
      font-weight: 900;
    }

    .hd-empty p {
      max-width: 420px;
      margin: 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.55;
    }

    .hd-empty-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 8px;
    }

    .hd-pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      color: #64748b;
      font-size: 13px;
      font-weight: 750;
    }

    .hd-page-btn {
      min-height: 36px;
      border: 1px solid #dbe3ef;
      border-radius: 12px;
      padding: 0 14px;
      color: #334155;
      background: #ffffff;
      font-weight: 850;
    }

    .hd-page-btn:hover:not(:disabled) {
      color: #2563eb;
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    .hd-side {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
      position: sticky;
      top: 18px;
    }

    .hd-detail-card,
    .hd-side-card {
      padding: 18px;
    }

    .hd-detail-code {
      display: inline-flex;
      margin-top: 12px;
      border-radius: 14px;
      padding: 10px 14px;
      color: #1d4ed8;
      background: #eff6ff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 24px;
      font-weight: 950;
      letter-spacing: -0.04em;
    }

    .hd-detail-card h3 {
      margin: 14px 0;
      color: #0f172a;
      font-size: 15px;
      line-height: 1.45;
      font-weight: 850;
    }

    .hd-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin: 14px 0;
    }

    .hd-detail-grid div {
      border: 1px solid #e8eef7;
      border-radius: 14px;
      padding: 12px;
      background: #f8fafc;
    }

    .hd-detail-grid span {
      display: block;
      color: #8a9ab3;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .hd-detail-grid strong {
      display: block;
      margin-top: 5px;
      color: #0f172a;
      font-size: 13px;
      font-weight: 900;
    }

    .hd-copy-wide {
      width: 100%;
      min-height: 42px;
      border-radius: 14px;
      color: #ffffff;
      background: #0f172a;
      font-size: 13px;
      font-weight: 850;
    }

    .hd-copy-wide:hover {
      background: #1e293b;
    }

    .hd-muted-panel {
      margin: 14px 0 0;
      color: #64748b;
      font-size: 13px;
      line-height: 1.55;
    }

    .hd-roadmap-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 0;
      margin: 14px 0 0;
      list-style: none;
    }

    .hd-roadmap-list li {
      position: relative;
      padding-left: 18px;
      color: #475569;
      font-size: 13px;
      line-height: 1.45;
      font-weight: 700;
    }

    .hd-roadmap-list li::before {
      content: '';
      position: absolute;
      top: 8px;
      left: 0;
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #2563eb;
    }

    .hd-side-card--accent {
      background:
        radial-gradient(circle at top right, rgba(16, 185, 129, 0.16), transparent 44%),
        #ffffff;
    }

    .hd-side-card--live {
      background:
        radial-gradient(circle at top right, rgba(37, 99, 235, 0.14), transparent 42%),
        #ffffff;
    }

    .hd-side-card--live h3 {
      margin: 12px 0 6px;
      color: #0f172a;
      font-size: 16px;
      font-weight: 900;
    }

    .hd-side-card--live p {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.55;
      font-weight: 650;
    }

    .hd-live-status-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 14px 0;
    }

    .hd-live-status-grid div {
      border: 1px solid #dbeafe;
      border-radius: 12px;
      padding: 10px;
      background: #eff6ff;
    }

    .hd-live-status-grid span {
      display: block;
      color: #64748b;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .hd-live-status-grid strong {
      display: block;
      margin-top: 4px;
      color: #1e3a8a;
      font-size: 12px;
      font-weight: 900;
    }

    .hd-live-note {
      display: block;
      margin-top: 10px;
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.45;
    }

    .hd-integration-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 14px;
    }

    .hd-integration-list button {
      min-height: 38px;
      border: 1px solid #dbe3ef;
      border-radius: 12px;
      color: #334155;
      background: #ffffff;
      font-size: 12px;
      font-weight: 850;
      text-align: left;
      padding: 0 12px;
      cursor: pointer;
    }

    .hd-integration-list button:hover {
      color: #0f766e;
      border-color: #99f6e4;
      background: #f0fdfa;
    }

    .hd-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 999px;
      animation: spin 0.8s linear infinite;
    }

    .hd-spinner--xs {
      width: 12px;
      height: 12px;
      border-width: 1.5px;
    }

    .hd-spinner--light {
      color: #ffffff;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 1200px) {
      .hd-workspace {
        grid-template-columns: 1fr;
      }

      .hd-side {
        position: static;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        display: grid;
      }
    }

    @media (max-width: 900px) {
      .hd-shell {
        padding: 18px;
      }

      .hd-hero,
      .hd-search-row {
        align-items: stretch;
        flex-direction: column;
      }

      .hd-metrics,
      .hd-filter-section,
      .hd-side {
        grid-template-columns: 1fr;
      }

      .hd-search-input {
        padding-right: 104px;
      }
    }
  `],
})
export class HsnDirectoryComponent {
  @Input() isPicker = false;
  @Output() select = new EventEmitter<HsnSacCode>();

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
  readonly importing = signal(false);
  readonly isSearchingOnline = signal(false);
  readonly selectedCode = signal<HsnSacCode | null>(null);
  readonly copiedCode = signal<string | null>(null);
  readonly liveMode = signal(true);
  readonly liveSyncing = signal(false);
  readonly lastLiveSyncAt = signal<string | null>(null);
  readonly liveSyncSummary = signal<string | null>(null);

  readonly totalPages = computed(() => Math.ceil(this.total() / 20));
  readonly visibleHsnCount = computed(() => this.codes().filter((code) => code.type === 'HSN').length);
  readonly visibleSacCount = computed(() => this.codes().filter((code) => code.type === 'SAC').length);
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchQuery.trim()) count += 1;
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

    return bestRate === null ? '-' : `${bestRate}%`;
  });

  canSearchOnline = computed(() => {
    const query = this.searchQuery.trim();
    return query.length >= 4 && /^\d+$/.test(query);
  });

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(350), takeUntilDestroyed())
      .subscribe(() => this.loadCodes());

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

  triggerImport() {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importing.set(true);
    const toast = this.toast.loading('Importing HSN/SAC directory...', { duration: 0 });

    this.gstService.importHsnSacExcel(file).subscribe({
      next: (res: any) => {
        this.importing.set(false);
        toast.close();
        this.toast.success(`Successfully imported ${res.data?.succeeded ?? 0} codes`);
        this.loadData();
        input.value = '';
      },
      error: (err: any) => {
        this.importing.set(false);
        toast.close();
        this.toast.error('Import failed: ' + (err.error?.message || err.message));
        input.value = '';
      }
    });
  }

  searchOnline() {
    const code = this.searchQuery.trim();
    if (!code) return;

    this.isSearchingOnline.set(true);
    const toast = this.toast.loading('Searching official GST records...', { duration: 0 });

    this.gstService.lookupOnlineHsn(code).subscribe({
      next: (res: any) => {
        this.isSearchingOnline.set(false);
        toast.close();
        this.toast.success(`Found and saved: ${(res.data?.description ?? code).substring(0, 50)}`);
        this.lastLiveSyncAt.set(this.formatLiveTime(new Date()));
        this.liveSyncSummary.set(`Code ${code} refreshed from live provider.`);
        this.loadCodes();
      },
      error: (err: any) => {
        this.isSearchingOnline.set(false);
        toast.close();
        this.toast.error(err.error?.message || 'Code not found in official records.');
      }
    });
  }

  toggleLiveMode() {
    this.liveMode.update((value) => !value);
    this.toast.success(this.liveMode() ? 'Live auto-refresh enabled for numeric code searches' : 'Using local HSN/SAC cache');
    this.loadCodes();
  }

  syncVisibleLive() {
    const visibleCodes = this.codes().map((code) => code.code);
    if (visibleCodes.length === 0) return;

    this.liveSyncing.set(true);
    const toast = this.toast.loading('Refreshing visible HSN/SAC codes from live provider...', { duration: 0 });

    this.gstService.syncLiveHsnSac(visibleCodes).subscribe({
      next: (res) => {
        this.liveSyncing.set(false);
        toast.close();

        const result = res.data;
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
      error: (err) => {
        this.liveSyncing.set(false);
        toast.close();
        this.toast.error(err.error?.message || 'Live sync failed');
      },
    });
  }

  loadData() {
    this.searchQuery = '';
    this.selectedType.set(null);
    this.selectedRate.set(null);
    this.currentPage.set(1);
    this.loadCodes();
  }

  reset() {
    this.loadData();
  }

  quickSearch(query: string) {
    this.searchQuery = query;
    this.currentPage.set(1);
    this.loadCodes();
  }

  onRowClick(code: HsnSacCode) {
    this.selectCode(code);
  }

  selectCode(code: HsnSacCode) {
    this.selectedCode.set(code);
    if (this.isPicker) {
      this.select.emit(code);
    }
  }

  copyCode(code: HsnSacCode) {
    const text = `${code.code} - ${code.description} | ${code.type} | GST ${code.gstRate}% | Chapter ${this.chapterLabel(code)}`;
    this.copyToClipboard(text, `Copied ${code.code}`);
    this.copiedCode.set(code.id);
    window.setTimeout(() => this.copiedCode.set(null), 1400);
  }

  downloadTemplate() {
    const rows = [
      ['code', 'description', 'type', 'gstRate', 'chapter'],
      ['8471', 'Automatic data processing machines', 'HSN', '18', '84'],
      ['9982', 'Legal and accounting services', 'SAC', '18', '99'],
    ];
    this.downloadCsv('hsn-sac-import-template.csv', rows);
  }

  exportVisible() {
    if (this.codes().length === 0) return;
    const rows = [
      ['code', 'description', 'type', 'gstRate', 'chapter'],
      ...this.codes().map((code) => [
        code.code,
        code.description,
        code.type,
        String(code.gstRate),
        this.chapterLabel(code),
      ]),
    ];
    this.downloadCsv('hsn-sac-visible-codes.csv', rows);
  }

  chapterLabel(code: HsnSacCode) {
    return code.chapter || code.code?.slice(0, 2) || '-';
  }

  rateTone(rate: number) {
    if (rate === 0) return 'zero';
    if (rate <= 5) return 'low';
    if (rate <= 12) return 'mid';
    if (rate < 18) return 'standard';
    return 'high';
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
        live: this.liveMode(),
      })
      .subscribe({
        next: (res) => {
          const rows = (res as any).data ?? [];
          this.codes.set(rows);
          this.total.set((res as any).meta?.total ?? rows.length ?? 0);
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

  private copyToClipboard(text: string, successMessage: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => this.toast.success(successMessage))
        .catch(() => this.fallbackCopy(text, successMessage));
      return;
    }

    this.fallbackCopy(text, successMessage);
  }

  private fallbackCopy(text: string, successMessage: string) {
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

  private downloadCsv(filename: string, rows: string[][]) {
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

  private formatLiveTime(date: Date) {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
