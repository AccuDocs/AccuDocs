import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GstExtendedService } from '@core/services/gst-extended.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-gstr9',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="g9-root">
      <div class="g9-header">
        <div>
          <h1 class="g9-title">GSTR-9 Annual Return</h1>
          <p class="g9-sub">Generate comprehensive annual GST return summary from GSTR-1 & GSTR-3B data</p>
        </div>
      </div>

      <!-- Controls -->
      <div class="g9-controls">
        <div class="g9-field">
          <label class="g9-label">Client ID</label>
          <input id="gstr9-client-id" class="g9-input" [(ngModel)]="clientId" placeholder="Client UUID" />
        </div>
        <div class="g9-field">
          <label class="g9-label">Financial Year</label>
          <select class="g9-select" [(ngModel)]="financialYear">
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
            <option value="2022-23">2022-23</option>
            <option value="2021-22">2021-22</option>
          </select>
        </div>
        <div class="g9-field g9-field--btn">
          <button id="gstr9-generate-btn" class="g9-gen-btn" [disabled]="isLoading() || !clientId" (click)="generate()">
            @if (isLoading()) {
              <span class="g9-spinner"></span> Generating…
            } @else {
              Generate GSTR-9
            }
          </button>
        </div>
        @if (data()) {
          <div class="g9-field g9-field--btn">
            <button class="g9-download-btn" (click)="download()">⬇ Download JSON</button>
          </div>
        }
      </div>

      @if (data()) {
        <!-- Summary Card -->
        <div class="g9-summary-card">
          <div class="g9-summary-header">
            <div>
              <h3 class="g9-summary-name">{{ data()!.summary.clientName }}</h3>
              <span class="g9-summary-gstin">{{ data()!.summary.clientGstin }}</span>
            </div>
            <div class="g9-summary-fy">FY {{ data()!.summary.financialYear }}</div>
          </div>

          <div class="g9-metrics-grid">
            <div class="g9-metric">
              <span class="g9-metric-label">Total Outward Supplies</span>
              <span class="g9-metric-value">₹{{ data()!.summary.totalOutwardSupplies | number:'1.2-2' }}</span>
            </div>
            <div class="g9-metric">
              <span class="g9-metric-label">Total Inward Supplies</span>
              <span class="g9-metric-value">₹{{ data()!.summary.totalInwardSupplies | number:'1.2-2' }}</span>
            </div>
            <div class="g9-metric">
              <span class="g9-metric-label">Total Tax Liability</span>
              <span class="g9-metric-value g9-metric-value--danger">₹{{ data()!.summary.totalTaxLiability | number:'1.2-2' }}</span>
            </div>
            <div class="g9-metric">
              <span class="g9-metric-label">ITC Availed</span>
              <span class="g9-metric-value g9-metric-value--green">₹{{ data()!.summary.totalItcAvailed | number:'1.2-2' }}</span>
            </div>
            <div class="g9-metric g9-metric--highlight">
              <span class="g9-metric-label">Net Tax Payable</span>
              <span class="g9-metric-value g9-metric-value--bold">₹{{ data()!.summary.netTaxPayable | number:'1.2-2' }}</span>
            </div>
            <div class="g9-metric">
              <span class="g9-metric-label">Returns Filed / Draft</span>
              <span class="g9-metric-value">{{ data()!.summary.returnsFiled }} / {{ data()!.summary.returnsDraft }}</span>
            </div>
          </div>
        </div>

        <!-- Table Sections (Accordion) -->
        @for (table of tables(); track table.key) {
          <div class="g9-accordion">
            <button class="g9-accordion-header" (click)="toggleSection(table.key)">
              <span class="g9-accordion-title">{{ table.title }}</span>
              <span class="g9-accordion-arrow" [class.g9-accordion-arrow--open]="openSections().includes(table.key)">▼</span>
            </button>
            @if (openSections().includes(table.key)) {
              <div class="g9-accordion-body">
                <pre class="g9-pre">{{ table.data | json }}</pre>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .g9-root { display: flex; flex-direction: column; gap: 20px; padding: 24px; max-width: 960px; }
    .g9-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .g9-sub { font-size: 13px; color: #64748b; margin: 0; }

    .g9-controls { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .g9-field { display: flex; flex-direction: column; gap: 5px; }
    .g9-field--btn { flex-shrink: 0; }
    .g9-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; }
    .g9-input, .g9-select { padding: 9px 13px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: #f8fafc; outline: none; min-width: 200px; }
    .g9-input:focus, .g9-select:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .g9-gen-btn { padding: 10px 20px; border-radius: 10px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
    .g9-gen-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(245,158,11,0.4); }
    .g9-gen-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .g9-download-btn { padding: 10px 16px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; transition: 0.15s; }
    .g9-download-btn:hover { background: #f1f5f9; }
    .g9-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .g9-summary-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .g9-summary-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .g9-summary-name { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
    .g9-summary-gstin { font-size: 12px; font-weight: 600; font-family: monospace; color: #64748b; }
    .g9-summary-fy { padding: 4px 12px; border-radius: 8px; background: #f1f5f9; font-size: 13px; font-weight: 700; color: #475569; }

    .g9-metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .g9-metric { background: #f8fafc; border-radius: 12px; padding: 14px 18px; display: flex; flex-direction: column; gap: 4px; }
    .g9-metric--highlight { background: linear-gradient(135deg, #fef3c7, #fde68a); }
    .g9-metric-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
    .g9-metric-value { font-size: 18px; font-weight: 800; color: #0f172a; }
    .g9-metric-value--danger { color: #dc2626; }
    .g9-metric-value--green { color: #16a34a; }
    .g9-metric-value--bold { color: #78350f; }

    .g9-accordion { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    .g9-accordion + .g9-accordion { margin-top: -1px; }
    .g9-accordion-header { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 14px 20px; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 700; color: #0f172a; text-align: left; transition: background 0.15s; }
    .g9-accordion-header:hover { background: #f8fafc; }
    .g9-accordion-title { flex: 1; }
    .g9-accordion-arrow { font-size: 10px; color: #94a3b8; transition: transform 0.2s; }
    .g9-accordion-arrow--open { transform: rotate(180deg); }
    .g9-accordion-body { padding: 0 20px 16px; }
    .g9-pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; font-size: 12px; font-family: monospace; color: #475569; overflow-x: auto; margin: 0; white-space: pre-wrap; }
  `],
})
export class Gstr9Component {
  private gstService = inject(GstExtendedService);
  private toast = inject(HotToastService);

  clientId = '';
  financialYear = '2024-25';
  readonly isLoading = signal(false);
  readonly data = signal<any>(null);
  readonly openSections = signal<string[]>([]);

  tables() {
    const d = this.data();
    if (!d) return [];
    return [
      { key: 'table4', title: d.table4?.title || 'Table 4 — Outward Supplies (B2B)', data: d.table4 },
      { key: 'table5', title: d.table5?.title || 'Table 5 — Outward Supplies (B2C)', data: d.table5 },
      { key: 'table6', title: d.table6?.title || 'Table 6 — ITC Availed', data: d.table6 },
      { key: 'table7', title: d.table7?.title || 'Table 7 — ITC Reversed', data: d.table7 },
      { key: 'table9', title: d.table9?.title || 'Table 9 — Tax Paid', data: d.table9 },
    ];
  }

  toggleSection(key: string) {
    const current = this.openSections();
    if (current.includes(key)) {
      this.openSections.set(current.filter(k => k !== key));
    } else {
      this.openSections.set([...current, key]);
    }
  }

  generate() {
    if (!this.clientId) return;
    this.isLoading.set(true);
    this.gstService.generateGSTR9(this.clientId.trim(), this.financialYear).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.data.set(res.data);
        this.openSections.set([]);
        this.toast.success('GSTR-9 generated!');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Failed to generate GSTR-9');
      },
    });
  }

  download() {
    const d = this.data();
    if (!d) return;
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR9_${d.summary?.clientName || 'client'}_${this.financialYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('GSTR-9 downloaded');
  }
}
