import { Component, inject, signal, computed, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { GstExtendedService, ItcLedgerRecord } from '@core/services/gst-extended.service';
import { HotToastService } from '@ngneat/hot-toast';

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-itc-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="itc-root">
      <!-- Header -->
      <div class="itc-header">
        <div>
          <h1 class="itc-title">ITC Tracker</h1>
          <p class="itc-sub">Input Tax Credit eligibility analysis per GST period</p>
        </div>
      </div>

      <!-- Controls -->
      <div class="itc-controls">
        @if (!isEmbedded) {
          <div class="itc-control-group">
            <label class="itc-label" for="itc-client-input">Client ID</label>
            <input
              id="itc-client-input"
              class="itc-input"
              type="text"
              [(ngModel)]="clientId"
              placeholder="Paste client UUID…"
            />
          </div>
        }
        <div class="itc-control-group">
          <label class="itc-label" for="itc-period-input">Period (YYYY-MM)</label>
          <input
            id="itc-period-input"
            class="itc-input"
            type="month"
            [(ngModel)]="period"
          />
        </div>
        <div class="itc-control-group itc-control-group--btn">
          <button
            id="itc-calculate-btn"
            class="itc-calc-btn"
            [disabled]="isCalculating() || !clientId || !period"
            (click)="calculate()"
          >
            @if (isCalculating()) {
              <span class="itc-spinner"></span> Calculating…
            } @else {
              <svg viewBox="0 0 20 20" fill="currentColor" class="itc-btn-icon">
                <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" />
              </svg>
              Recalculate ITC
            }
          </button>
          <button
            id="itc-load-btn"
            class="itc-load-btn"
            [disabled]="!clientId"
            (click)="loadLedger()"
          >
            View History
          </button>
        </div>
      </div>

      <!-- Summary Card (latest record) -->
      @if (latestRecord()) {
        <div class="itc-summary-card">
          <div class="itc-summary-header">
            <div>
              <div class="itc-summary-period">{{ latestRecord()!.period }}</div>
              <div class="itc-summary-source">Source: {{ latestRecord()!.source | titlecase }} · Status: {{ latestRecord()!.status | titlecase }}</div>
            </div>
            <div class="itc-summary-total">
              <div class="itc-total-label">Net Eligible ITC</div>
              <div class="itc-total-amount">₹{{ (latestRecord()!.eligibleItc - latestRecord()!.reversedItc) | number:'1.2-2' }}</div>
            </div>
          </div>

          <!-- Tax breakdown -->
          <div class="itc-breakdown-grid">
            <div class="itc-breakdown-item">
              <div class="itc-breakdown-label">IGST Claimed</div>
              <div class="itc-breakdown-value itc-breakdown-value--blue">₹{{ latestRecord()!.igstClaimed | number:'1.2-2' }}</div>
            </div>
            <div class="itc-breakdown-item">
              <div class="itc-breakdown-label">CGST Claimed</div>
              <div class="itc-breakdown-value itc-breakdown-value--indigo">₹{{ latestRecord()!.cgstClaimed | number:'1.2-2' }}</div>
            </div>
            <div class="itc-breakdown-item">
              <div class="itc-breakdown-label">SGST Claimed</div>
              <div class="itc-breakdown-value itc-breakdown-value--violet">₹{{ latestRecord()!.sgstClaimed | number:'1.2-2' }}</div>
            </div>
          </div>

          <!-- Eligible vs Blocked progress bar -->
          <div class="itc-bar-section">
            <div class="itc-bar-labels">
              <span class="itc-bar-label itc-bar-label--eligible">
                <span class="itc-dot itc-dot--green"></span>
                Eligible: ₹{{ latestRecord()!.eligibleItc | number:'1.2-2' }}
              </span>
              <span class="itc-bar-label itc-bar-label--blocked">
                <span class="itc-dot itc-dot--red"></span>
                Blocked (Sec 17(5)): ₹{{ latestRecord()!.ineligibleItc | number:'1.2-2' }}
              </span>
              @if (latestRecord()!.reversedItc > 0) {
                <span class="itc-bar-label itc-bar-label--reversed">
                  <span class="itc-dot itc-dot--amber"></span>
                  Reversed: ₹{{ latestRecord()!.reversedItc | number:'1.2-2' }}
                </span>
              }
            </div>
            <div class="itc-bar-track">
              <div
                class="itc-bar-fill itc-bar-fill--green"
                [style.width.%]="eligiblePct()"
              ></div>
              <div
                class="itc-bar-fill itc-bar-fill--red"
                [style.width.%]="blockedPct()"
              ></div>
            </div>
          </div>
        </div>
      }

      <!-- History Table -->
      @if (records().length > 0) {
        <div class="itc-history">
          <h3 class="itc-history-title">ITC History</h3>
          <table class="itc-table">
            <thead>
              <tr>
                <th class="itc-th">Period</th>
                <th class="itc-th itc-th--right">IGST</th>
                <th class="itc-th itc-th--right">CGST</th>
                <th class="itc-th itc-th--right">SGST</th>
                <th class="itc-th itc-th--right">Eligible ITC</th>
                <th class="itc-th itc-th--right">Blocked</th>
                <th class="itc-th">Source</th>
              </tr>
            </thead>
            <tbody>
              @for (rec of records(); track rec.id) {
                <tr class="itc-tr">
                  <td class="itc-td"><span class="itc-period-tag">{{ rec.period }}</span></td>
                  <td class="itc-td itc-td--right itc-td--num">₹{{ rec.igstClaimed | number:'1.2-2' }}</td>
                  <td class="itc-td itc-td--right itc-td--num">₹{{ rec.cgstClaimed | number:'1.2-2' }}</td>
                  <td class="itc-td itc-td--right itc-td--num">₹{{ rec.sgstClaimed | number:'1.2-2' }}</td>
                  <td class="itc-td itc-td--right"><span class="itc-eligible-badge">₹{{ rec.eligibleItc | number:'1.2-2' }}</span></td>
                  <td class="itc-td itc-td--right"><span class="itc-blocked-badge">₹{{ rec.ineligibleItc | number:'1.2-2' }}</span></td>
                  <td class="itc-td"><span class="itc-source-tag" [class.itc-source-tag--auto]="rec.source === 'GSTR2A'">{{ rec.source }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Empty state -->
      @if (records().length === 0 && !isLoading()) {
        <div class="itc-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="itc-empty-icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p>Enter a Client ID and period, then click <strong>Recalculate ITC</strong></p>
        </div>
      }
    </div>
  `,
  styles: [`
    .itc-root { display: flex; flex-direction: column; gap: 20px; padding: 24px; max-width: 960px; }

    .itc-header { }
    .itc-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .itc-sub { font-size: 13px; color: #64748b; margin: 0; }

    .itc-controls { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; background: #fff;
      border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
    .itc-control-group { display: flex; flex-direction: column; gap: 6px; }
    .itc-control-group--btn { flex-direction: row; align-items: flex-end; gap: 8px; margin-left: auto; }
    .itc-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; }
    .itc-input { padding: 9px 13px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px;
      background: #f8fafc; outline: none; min-width: 180px; }
    .itc-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

    .itc-calc-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 10px;
      background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 13px; font-weight: 700;
      border: none; cursor: pointer; transition: all 0.2s; }
    .itc-calc-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(16,185,129,0.4); }
    .itc-calc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .itc-btn-icon { width: 16px; height: 16px; }
    .itc-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
      border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .itc-load-btn { padding: 9px 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff;
      font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.15s; }
    .itc-load-btn:hover:not(:disabled) { background: #f1f5f9; }
    .itc-load-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Summary card */
    .itc-summary-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 18px; }
    .itc-summary-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .itc-summary-period { font-size: 18px; font-weight: 800; color: #0f172a; }
    .itc-summary-source { font-size: 12px; color: #64748b; margin-top: 2px; }
    .itc-total-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; text-align: right; }
    .itc-total-amount { font-size: 24px; font-weight: 800; color: #10b981; text-align: right; }

    .itc-breakdown-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .itc-breakdown-item { background: #f8fafc; border-radius: 10px; padding: 12px; }
    .itc-breakdown-label { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .itc-breakdown-value { font-size: 16px; font-weight: 700; }
    .itc-breakdown-value--blue { color: #2563eb; }
    .itc-breakdown-value--indigo { color: #4f46e5; }
    .itc-breakdown-value--violet { color: #7c3aed; }

    .itc-bar-section { display: flex; flex-direction: column; gap: 8px; }
    .itc-bar-labels { display: flex; gap: 20px; flex-wrap: wrap; }
    .itc-bar-label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #374151; }
    .itc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .itc-dot--green { background: #10b981; }
    .itc-dot--red { background: #ef4444; }
    .itc-dot--amber { background: #f59e0b; }
    .itc-bar-track { height: 10px; border-radius: 99px; background: #f1f5f9; display: flex; overflow: hidden; }
    .itc-bar-fill { height: 100%; transition: width 0.5s ease; }
    .itc-bar-fill--green { background: #10b981; }
    .itc-bar-fill--red { background: #ef4444; }

    /* History table */
    .itc-history { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .itc-history-title { font-size: 14px; font-weight: 700; color: #0f172a; padding: 14px 16px; margin: 0; border-bottom: 1px solid #e2e8f0; }
    .itc-table { width: 100%; border-collapse: collapse; }
    .itc-th { padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .itc-th--right { text-align: right; }
    .itc-tr:hover { background: #f8fafc; }
    .itc-td { padding: 11px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    .itc-td--right { text-align: right; }
    .itc-td--num { font-family: monospace; }
    .itc-period-tag { background: #eff6ff; color: #3b82f6; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-family: monospace; }
    .itc-eligible-badge { color: #16a34a; font-weight: 700; font-family: monospace; }
    .itc-blocked-badge { color: #dc2626; font-weight: 700; font-family: monospace; }
    .itc-source-tag { font-size: 11px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 6px; font-weight: 600; }
    .itc-source-tag--auto { background: #dcfce7; color: #15803d; }

    /* Empty */
    .itc-empty { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 48px 24px;
      display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .itc-empty-icon { width: 40px; height: 40px; color: #cbd5e1; }
    .itc-empty p { font-size: 14px; color: #64748b; margin: 0; text-align: center; }
  `],
})
export class ItcTrackerComponent implements OnChanges {
  private gstService = inject(GstExtendedService);
  private toast = inject(HotToastService);

  @Input() clientId = '';
  @Input() isEmbedded = false;
  period = currentPeriod();

  readonly records = signal<ItcLedgerRecord[]>([]);
  readonly isLoading = signal(false);
  readonly isCalculating = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'] && this.isEmbedded && this.clientId) {
      this.loadLedger();
    }
  }

  readonly latestRecord = computed(() => this.records()[0] ?? null);

  readonly eligiblePct = computed(() => {
    const rec = this.latestRecord();
    if (!rec) return 0;
    const total = rec.eligibleItc + rec.ineligibleItc;
    if (total === 0) return 0;
    return Math.round((rec.eligibleItc / total) * 100);
  });

  readonly blockedPct = computed(() => {
    return 100 - this.eligiblePct();
  });

  calculate() {
    if (!this.clientId || !this.period) return;
    this.isCalculating.set(true);
    this.gstService.calculateITC(this.clientId.trim(), this.period).subscribe({
      next: (res) => {
        const record = res.data;
        if (record) this.records.set([record, ...this.records().filter(r => r.period !== record.period)]);
        this.isCalculating.set(false);
        this.toast.success('ITC calculated successfully');
      },
      error: () => {
        this.isCalculating.set(false);
        this.toast.error('Failed to calculate ITC');
      },
    });
  }

  loadLedger() {
    if (!this.clientId) return;
    this.isLoading.set(true);
    this.gstService.getITCLedger(this.clientId.trim()).subscribe({
      next: (res) => {
        this.records.set(res.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load ITC ledger');
      },
    });
  }
}
