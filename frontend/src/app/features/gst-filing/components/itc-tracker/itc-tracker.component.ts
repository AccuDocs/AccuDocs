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
        <div class="itc-results-grid">
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
        <aside class="itc-detail-card">
          <div class="itc-detail-head">
            <span>Selected Period</span>
            <strong>{{ latestRecord()!.period }}</strong>
          </div>
          <dl class="itc-detail-list">
            <div>
              <dt>Status</dt>
              <dd>{{ latestRecord()!.status | titlecase }}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{{ latestRecord()!.source }}</dd>
            </div>
            <div>
              <dt>Total Claimed</dt>
              <dd>INR {{ latestRecord()!.igstClaimed + latestRecord()!.cgstClaimed + latestRecord()!.sgstClaimed | number:'1.2-2' }}</dd>
            </div>
            <div>
              <dt>Net Eligible</dt>
              <dd class="itc-detail-positive">INR {{ latestRecord()!.eligibleItc - latestRecord()!.reversedItc | number:'1.2-2' }}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd class="itc-detail-danger">INR {{ latestRecord()!.ineligibleItc | number:'1.2-2' }}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{{ latestRecord()!.updatedAt | date:'dd MMM yyyy, h:mm a' }}</dd>
            </div>
          </dl>
          <div class="itc-detail-actions">
            <button type="button" class="itc-action-btn itc-action-btn--download" (click)="downloadRecord(latestRecord()!)">Download CSV</button>
            <button type="button" class="itc-action-btn" (click)="calculate()">Recalculate</button>
          </div>
        </aside>
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
                <th class="itc-th itc-th--right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (rec of records(); track rec.id) {
                <tr class="itc-tr" [class.itc-tr--active]="latestRecord().id === rec.id">
                  <td class="itc-td"><span class="itc-period-tag">{{ rec.period }}</span></td>
                  <td class="itc-td itc-td--right itc-td--num">₹{{ rec.igstClaimed | number:'1.2-2' }}</td>
                  <td class="itc-td itc-td--right itc-td--num">₹{{ rec.cgstClaimed | number:'1.2-2' }}</td>
                  <td class="itc-td itc-td--right itc-td--num">₹{{ rec.sgstClaimed | number:'1.2-2' }}</td>
                  <td class="itc-td itc-td--right"><span class="itc-eligible-badge">₹{{ rec.eligibleItc | number:'1.2-2' }}</span></td>
                  <td class="itc-td itc-td--right"><span class="itc-blocked-badge">₹{{ rec.ineligibleItc | number:'1.2-2' }}</span></td>
                  <td class="itc-td"><span class="itc-source-tag" [class.itc-source-tag--auto]="rec.source === 'GSTR2A'">{{ rec.source }}</span></td>
                  <td class="itc-td itc-td--right">
                    <div class="itc-row-actions">
                      <button type="button" class="itc-action-btn" [class.itc-action-btn--active]="latestRecord().id === rec.id" (click)="selectRecord(rec)">
                        {{ latestRecord().id === rec.id ? 'Viewing' : 'View' }}
                      </button>
                      <button type="button" class="itc-action-btn itc-action-btn--download" (click)="downloadRecord(rec)">Download</button>
                    </div>
                  </td>
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
    :host { display: block; width: 100%; }
    .itc-root { display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: none; padding: 24px 0 0; }

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
    .itc-results-grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.8fr); gap: 16px; align-items: stretch; }
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

    .itc-detail-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .itc-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .itc-detail-head span { color: #64748b; font-size: 11px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
    .itc-detail-head strong { color: #0f172a; font-size: 20px; line-height: 1; }
    .itc-detail-list { display: grid; gap: 8px; margin: 0; }
    .itc-detail-list div { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    .itc-detail-list dt { color: #64748b; font-size: 12px; font-weight: 700; }
    .itc-detail-list dd { color: #1e293b; font-size: 12px; font-weight: 800; margin: 0; text-align: right; }
    .itc-detail-positive { color: #059669 !important; }
    .itc-detail-danger { color: #dc2626 !important; }
    .itc-detail-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; margin-top: auto; }

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
    .itc-history { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow-x: auto; }
    .itc-history-title { font-size: 14px; font-weight: 700; color: #0f172a; padding: 14px 16px; margin: 0; border-bottom: 1px solid #e2e8f0; }
    .itc-table { width: 100%; min-width: 920px; border-collapse: collapse; }
    .itc-th { padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .itc-th--right { text-align: right; }
    .itc-tr:hover { background: #f8fafc; }
    .itc-tr--active { background: #eff6ff; }
    .itc-td { padding: 11px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    .itc-td--right { text-align: right; }
    .itc-td--num { font-family: monospace; }
    .itc-period-tag { background: #eff6ff; color: #3b82f6; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-family: monospace; }
    .itc-eligible-badge { color: #16a34a; font-weight: 700; font-family: monospace; }
    .itc-blocked-badge { color: #dc2626; font-weight: 700; font-family: monospace; }
    .itc-source-tag { font-size: 11px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 6px; font-weight: 600; }
    .itc-source-tag--auto { background: #dcfce7; color: #15803d; }
    .itc-row-actions { display: inline-flex; justify-content: flex-end; gap: 8px; }
    .itc-action-btn { min-height: 30px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #1e293b;
      padding: 0 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .itc-action-btn:hover { background: #f8fafc; border-color: #94a3b8; }
    .itc-action-btn--active { border-color: #10b981; background: #ecfdf5; color: #047857; }
    .itc-action-btn--download { border-color: #93c5fd; background: #eff6ff; color: #2563eb; }
    .itc-action-btn--download:hover { background: #dbeafe; border-color: #60a5fa; }

    /* Empty */
    .itc-empty { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 48px 24px;
      display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .itc-empty-icon { width: 40px; height: 40px; color: #cbd5e1; }
    .itc-empty p { font-size: 14px; color: #64748b; margin: 0; text-align: center; }

    :host-context(.dark) .itc-title,
    :host-context(.dark-theme) .itc-title,
    :host-context(.dark) .itc-summary-period,
    :host-context(.dark-theme) .itc-summary-period,
    :host-context(.dark) .itc-history-title,
    :host-context(.dark-theme) .itc-history-title,
    :host-context(.dark) .itc-detail-head strong,
    :host-context(.dark-theme) .itc-detail-head strong {
      color: #f8fafc;
    }

    :host-context(.dark) .itc-sub,
    :host-context(.dark-theme) .itc-sub,
    :host-context(.dark) .itc-label,
    :host-context(.dark-theme) .itc-label,
    :host-context(.dark) .itc-summary-source,
    :host-context(.dark-theme) .itc-summary-source,
    :host-context(.dark) .itc-total-label,
    :host-context(.dark-theme) .itc-total-label,
    :host-context(.dark) .itc-breakdown-label,
    :host-context(.dark-theme) .itc-breakdown-label,
    :host-context(.dark) .itc-detail-head span,
    :host-context(.dark-theme) .itc-detail-head span,
    :host-context(.dark) .itc-detail-list dt,
    :host-context(.dark-theme) .itc-detail-list dt,
    :host-context(.dark) .itc-empty p,
    :host-context(.dark-theme) .itc-empty p {
      color: #94a3b8;
    }

    :host-context(.dark) .itc-controls,
    :host-context(.dark-theme) .itc-controls,
    :host-context(.dark) .itc-summary-card,
    :host-context(.dark-theme) .itc-summary-card,
    :host-context(.dark) .itc-detail-card,
    :host-context(.dark-theme) .itc-detail-card,
    :host-context(.dark) .itc-history,
    :host-context(.dark-theme) .itc-history,
    :host-context(.dark) .itc-empty,
    :host-context(.dark-theme) .itc-empty {
      background: #0f1f33;
      border-color: #263a55;
    }

    :host-context(.dark) .itc-input,
    :host-context(.dark-theme) .itc-input,
    :host-context(.dark) .itc-load-btn,
    :host-context(.dark-theme) .itc-load-btn,
    :host-context(.dark) .itc-action-btn,
    :host-context(.dark-theme) .itc-action-btn {
      background: #13243a;
      border-color: #2d405e;
      color: #e2e8f0;
    }

    :host-context(.dark) .itc-input:focus,
    :host-context(.dark-theme) .itc-input:focus {
      background: #142943;
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, .16);
    }

    :host-context(.dark) .itc-breakdown-item,
    :host-context(.dark-theme) .itc-breakdown-item,
    :host-context(.dark) .itc-th,
    :host-context(.dark-theme) .itc-th {
      background: #14243c;
      border-color: #263a55;
    }

    :host-context(.dark) .itc-td,
    :host-context(.dark-theme) .itc-td,
    :host-context(.dark) .itc-detail-list dd,
    :host-context(.dark-theme) .itc-detail-list dd {
      color: #e2e8f0;
      border-color: #263a55;
    }

    :host-context(.dark) .itc-detail-list div,
    :host-context(.dark-theme) .itc-detail-list div,
    :host-context(.dark) .itc-history-title,
    :host-context(.dark-theme) .itc-history-title,
    :host-context(.dark) .itc-th,
    :host-context(.dark-theme) .itc-th {
      border-color: #263a55;
    }

    :host-context(.dark) .itc-tr:hover,
    :host-context(.dark-theme) .itc-tr:hover,
    :host-context(.dark) .itc-tr--active,
    :host-context(.dark-theme) .itc-tr--active {
      background: #172b47;
    }

    :host-context(.dark) .itc-period-tag,
    :host-context(.dark-theme) .itc-period-tag {
      background: rgba(96, 165, 250, .16);
      color: #93c5fd;
    }

    :host-context(.dark) .itc-source-tag,
    :host-context(.dark-theme) .itc-source-tag {
      background: #263a55;
      color: #cbd5e1;
    }

    :host-context(.dark) .itc-source-tag--auto,
    :host-context(.dark-theme) .itc-source-tag--auto,
    :host-context(.dark) .itc-action-btn--active,
    :host-context(.dark-theme) .itc-action-btn--active {
      background: rgba(16, 185, 129, .16);
      border-color: rgba(16, 185, 129, .45);
      color: #6ee7b7;
    }

    :host-context(.dark) .itc-action-btn--download,
    :host-context(.dark-theme) .itc-action-btn--download {
      background: rgba(96, 165, 250, .16);
      border-color: rgba(96, 165, 250, .45);
      color: #93c5fd;
    }

    :host-context(.dark) .itc-bar-label,
    :host-context(.dark-theme) .itc-bar-label {
      color: #cbd5e1;
    }

    :host-context(.dark) .itc-bar-track,
    :host-context(.dark-theme) .itc-bar-track {
      background: #263a55;
    }

    @media (max-width: 1100px) {
      .itc-results-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 720px) {
      .itc-root { padding-top: 16px; }
      .itc-controls,
      .itc-summary-header,
      .itc-control-group--btn {
        align-items: stretch;
        flex-direction: column;
      }
      .itc-control-group--btn { width: 100%; margin-left: 0; }
      .itc-calc-btn,
      .itc-load-btn,
      .itc-input { width: 100%; }
      .itc-breakdown-grid { grid-template-columns: 1fr; }
      .itc-summary-total,
      .itc-total-label,
      .itc-total-amount { text-align: left; }
    }
  `],
})
export class ItcTrackerComponent implements OnChanges {
  private gstService = inject(GstExtendedService);
  private toast = inject(HotToastService);

  @Input() clientId = '';
  @Input() isEmbedded = false;
  period = currentPeriod();

  readonly records = signal<ItcLedgerRecord[]>([]);
  readonly selectedRecord = signal<ItcLedgerRecord | null>(null);
  readonly isLoading = signal(false);
  readonly isCalculating = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'] && this.isEmbedded && this.clientId) {
      this.loadLedger();
    }
  }

  readonly latestRecord = computed(() => this.selectedRecord() ?? this.records()[0] ?? null);

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
        if (record) {
          this.records.set([record, ...this.records().filter(r => r.period !== record.period)]);
          this.selectedRecord.set(record);
        }
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
        const records = res.data ?? [];
        this.records.set(records);
        this.selectedRecord.set(records[0] ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load ITC ledger');
      },
    });
  }

  selectRecord(record: ItcLedgerRecord): void {
    this.selectedRecord.set(record);
    this.period = record.period;
    this.toast.success(`Showing ITC period ${record.period}`);
  }

  downloadRecord(record: ItcLedgerRecord): void {
    this.downloadCsv(`itc-${record.period}.csv`, [
      ['Field', 'Value'],
      ['Period', record.period],
      ['Source', record.source],
      ['Status', record.status],
      ['IGST Claimed', record.igstClaimed],
      ['CGST Claimed', record.cgstClaimed],
      ['SGST Claimed', record.sgstClaimed],
      ['Eligible ITC', record.eligibleItc],
      ['Blocked ITC', record.ineligibleItc],
      ['Reversed ITC', record.reversedItc],
      ['Net Eligible ITC', record.eligibleItc - record.reversedItc],
    ]);
    this.toast.success(`Downloaded ITC ${record.period}`);
  }

  private downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
    if (typeof document === 'undefined') return;
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
