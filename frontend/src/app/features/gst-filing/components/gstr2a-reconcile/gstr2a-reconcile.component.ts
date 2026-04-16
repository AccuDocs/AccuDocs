import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GstExtendedService, Gstr2aEntry, Gstr2aReconciliation } from '@core/services/gst-extended.service';
import { HotToastService } from '@ngneat/hot-toast';

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-gstr2a-reconcile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="gr-root">
      <!-- Header -->
      <div class="gr-header">
        <div>
          <h1 class="gr-title">GSTR-2A Reconciliation</h1>
          <p class="gr-sub">Compare purchase books against GSTR-2A data to spot mismatches and missing entries</p>
        </div>
      </div>

      <!-- Input Panel -->
      <div class="gr-panel">
        <div class="gr-panel-row">
          <!-- Client ID -->
          <div class="gr-field">
            <label class="gr-label" for="gr-client-id">Client ID</label>
            <input id="gr-client-id" class="gr-input" type="text" [(ngModel)]="clientId" placeholder="Client UUID…" />
          </div>

          <!-- Period -->
          <div class="gr-field">
            <label class="gr-label" for="gr-period">GST Period</label>
            <input id="gr-period" class="gr-input" type="month" [(ngModel)]="period" />
          </div>
        </div>

        <!-- JSON upload -->
        <div class="gr-upload-zone"
          [class.gr-upload-zone--drag]="isDragging()"
          (dragover)="$event.preventDefault(); isDragging.set(true)"
          (dragleave)="isDragging.set(false)"
          (drop)="onFileDrop($event)"
          (click)="fileInput.click()"
        >
          <input #fileInput type="file" accept=".json" class="gr-file-hidden" (change)="onFileChange($event)" />
          @if (!fileName()) {
            <div class="gr-upload-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="gr-upload-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
              <p class="gr-upload-text">Drop GSTR-2A JSON file here or <span class="gr-upload-link">browse</span></p>
              <p class="gr-upload-hint">JSON format as downloaded from GST portal</p>
            </div>
          } @else {
            <div class="gr-upload-file">
              <svg viewBox="0 0 24 24" fill="currentColor" class="gr-file-icon">
                <path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clip-rule="evenodd" />
              </svg>
              <div>
                <div class="gr-file-name">{{ fileName() }}</div>
                <div class="gr-file-count">{{ parsedEntries().length }} entries loaded</div>
              </div>
              <button class="gr-file-clear" (click)="clearFile(); $event.stopPropagation()">✕</button>
            </div>
          }
        </div>

        <!-- Parse error -->
        @if (parseError()) {
          <div class="gr-error-msg">
            <svg viewBox="0 0 20 20" fill="currentColor" class="gr-error-icon">
              <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
            </svg>
            {{ parseError() }}
          </div>
        }

        <!-- Run button -->
        <div class="gr-panel-actions">
          <button
            id="gr-run-btn"
            class="gr-run-btn"
            [disabled]="isReconciling() || !clientId || !period || parsedEntries().length === 0"
            (click)="runReconciliation()"
          >
            @if (isReconciling()) {
              <span class="gr-spinner"></span> Reconciling…
            } @else {
              <svg viewBox="0 0 20 20" fill="currentColor" class="gr-btn-icon">
                <path fill-rule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
              </svg>
              Run Reconciliation
            }
          </button>
        </div>
      </div>

      <!-- Summary counts (after reconciliation) -->
      @if (result()) {
        <div class="gr-summary-grid">
          <div class="gr-summary-card gr-summary-card--green">
            <div class="gr-summary-count">{{ result()!.totalMatched }}</div>
            <div class="gr-summary-label">Matched</div>
          </div>
          <div class="gr-summary-card gr-summary-card--amber">
            <div class="gr-summary-count">{{ result()!.totalMismatched }}</div>
            <div class="gr-summary-label">Mismatched</div>
          </div>
          <div class="gr-summary-card gr-summary-card--red">
            <div class="gr-summary-count">{{ result()!.totalMissingBooks }}</div>
            <div class="gr-summary-label">Missing in Books</div>
          </div>
          <div class="gr-summary-card gr-summary-card--blue">
            <div class="gr-summary-count">{{ result()!.totalMissing2a }}</div>
            <div class="gr-summary-label">Missing in 2A</div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="gr-tabs">
          @for (tab of tabs; track tab.key) {
            <button
              class="gr-tab"
              [class.gr-tab--active]="activeTab() === tab.key"
              (click)="activeTab.set(tab.key)"
            >
              {{ tab.label }}
              <span class="gr-tab-count" [class]="'gr-tab-count--' + tab.color">{{ getCount(tab.key) }}</span>
            </button>
          }
        </div>

        <!-- Result Table -->
        <div class="gr-table-wrap">
          <table class="gr-table">
            <thead class="gr-thead">
              <tr>
                <th class="gr-th">Supplier GSTIN</th>
                <th class="gr-th">Invoice No.</th>
                <th class="gr-th">Invoice Date</th>
                @if (activeTab() === 'matched' || activeTab() === 'mismatched') {
                  <th class="gr-th gr-th--right">Books Taxable</th>
                  <th class="gr-th gr-th--right">2A Taxable</th>
                  <th class="gr-th gr-th--right">Books IGST</th>
                  <th class="gr-th gr-th--right">2A IGST</th>
                }
                @if (activeTab() === 'missing_in_books') {
                  <th class="gr-th gr-th--right">Taxable (2A)</th>
                  <th class="gr-th gr-th--right">Tax (2A)</th>
                }
                @if (activeTab() === 'missing_in_2a') {
                  <th class="gr-th gr-th--right">Taxable (Books)</th>
                  <th class="gr-th gr-th--right">Tax (Books)</th>
                }
                @if (activeTab() === 'mismatched') {
                  <th class="gr-th">Mismatch Fields</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (item of activeItems(); track $index) {
                <tr class="gr-row" [class]="'gr-row--' + activeTab()">
                  <td class="gr-td gr-td--gstin">{{ item.supplierGstin || item.vendorGstin || '—' }}</td>
                  <td class="gr-td gr-td--inv">{{ item.invoiceNumber || '—' }}</td>
                  <td class="gr-td gr-td--date">{{ item.invoiceDate | date:'dd MMM yyyy' }}</td>
                  @if (activeTab() === 'matched' || activeTab() === 'mismatched') {
                    <td class="gr-td gr-td--num">{{ item.books?.taxableAmount | number:'1.2-2' }}</td>
                    <td class="gr-td gr-td--num">{{ item.gstr2a?.taxablePurchase | number:'1.2-2' }}</td>
                    <td class="gr-td gr-td--num">{{ item.books?.igst | number:'1.2-2' }}</td>
                    <td class="gr-td gr-td--num">{{ item.gstr2a?.igst | number:'1.2-2' }}</td>
                  }
                  @if (activeTab() === 'missing_in_books') {
                    <td class="gr-td gr-td--num">{{ item.taxablePurchase | number:'1.2-2' }}</td>
                    <td class="gr-td gr-td--num">{{ (item.igst + item.cgst + item.sgst) | number:'1.2-2' }}</td>
                  }
                  @if (activeTab() === 'missing_in_2a') {
                    <td class="gr-td gr-td--num">{{ item.taxableAmount | number:'1.2-2' }}</td>
                    <td class="gr-td gr-td--num">{{ (item.igst + item.cgst + item.sgst) | number:'1.2-2' }}</td>
                  }
                  @if (activeTab() === 'mismatched') {
                    <td class="gr-td">
                      @for (f of item.mismatchFields; track f) {
                        <span class="gr-mismatch-tag">{{ f }}</span>
                      }
                    </td>
                  }
                </tr>
              }
              @if (activeItems().length === 0) {
                <tr>
                  <td colspan="7" class="gr-empty-cell">
                    <div class="gr-empty-inner">✓ No items in this category</div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .gr-root { display: flex; flex-direction: column; gap: 20px; padding: 24px; max-width: 1100px; }

    .gr-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .gr-sub { font-size: 13px; color: #64748b; margin: 0; }

    .gr-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .gr-panel-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .gr-field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 220px; }
    .gr-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; }
    .gr-input { padding: 9px 13px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: #f8fafc; outline: none; width: 100%; }
    .gr-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

    .gr-upload-zone { border: 2px dashed #e2e8f0; border-radius: 12px; padding: 28px; cursor: pointer; transition: all 0.2s; text-align: center; }
    .gr-upload-zone:hover { border-color: #93c5fd; background: #f0f9ff; }
    .gr-upload-zone--drag { border-color: #3b82f6; background: #eff6ff; }
    .gr-file-hidden { display: none; }
    .gr-upload-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .gr-upload-icon { width: 36px; height: 36px; color: #94a3b8; }
    .gr-upload-text { font-size: 14px; color: #374151; margin: 0; }
    .gr-upload-link { color: #3b82f6; font-weight: 600; }
    .gr-upload-hint { font-size: 12px; color: #94a3b8; margin: 0; }
    .gr-upload-file { display: flex; align-items: center; gap: 12px; text-align: left; }
    .gr-file-icon { width: 28px; height: 28px; color: #3b82f6; flex-shrink: 0; }
    .gr-file-name { font-size: 13px; font-weight: 600; color: #1e293b; }
    .gr-file-count { font-size: 12px; color: #16a34a; }
    .gr-file-clear { margin-left: auto; background: none; border: none; font-size: 16px; color: #94a3b8; cursor: pointer; }

    .gr-error-msg { display: flex; align-items: center; gap: 8px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #dc2626; }
    .gr-error-icon { width: 16px; height: 16px; flex-shrink: 0; }

    .gr-panel-actions { display: flex; justify-content: flex-end; }
    .gr-run-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #3b82f6); color: #fff; font-size: 14px; font-weight: 700;
      border: none; cursor: pointer; transition: all 0.2s; }
    .gr-run-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(99,102,241,0.4); }
    .gr-run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .gr-btn-icon { width: 16px; height: 16px; }
    .gr-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
      border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Summary grid */
    .gr-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .gr-summary-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
    .gr-summary-count { font-size: 28px; font-weight: 800; }
    .gr-summary-label { font-size: 12px; font-weight: 600; color: #64748b; margin-top: 4px; }
    .gr-summary-card--green .gr-summary-count { color: #16a34a; }
    .gr-summary-card--amber .gr-summary-count { color: #d97706; }
    .gr-summary-card--red .gr-summary-count { color: #dc2626; }
    .gr-summary-card--blue .gr-summary-count { color: #2563eb; }

    /* Tabs */
    .gr-tabs { display: flex; gap: 4px; background: #f8fafc; padding: 4px; border-radius: 10px; width: fit-content; }
    .gr-tab { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: none;
      background: none; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s; }
    .gr-tab:hover { background: #fff; }
    .gr-tab--active { background: #fff; color: #0f172a; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .gr-tab-count { font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 10px; }
    .gr-tab-count--green { background: #dcfce7; color: #16a34a; }
    .gr-tab-count--amber { background: #fef3c7; color: #d97706; }
    .gr-tab-count--red { background: #fee2e2; color: #dc2626; }
    .gr-tab-count--blue { background: #dbeafe; color: #2563eb; }

    /* Result table */
    .gr-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow-x: auto; }
    .gr-table { width: 100%; border-collapse: collapse; }
    .gr-thead { background: #f8fafc; }
    .gr-th { padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
    .gr-th--right { text-align: right; }
    .gr-row { transition: background 0.1s; }
    .gr-row:hover { background: #f8fafc; }
    .gr-row--matched { }
    .gr-row--mismatched td { background: #fffbeb; }
    .gr-row--missing_in_books td { background: #fef2f2; }
    .gr-row--missing_in_2a td { background: #eff6ff; }
    .gr-td { padding: 10px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    .gr-td--gstin { font-family: monospace; font-size: 12px; }
    .gr-td--inv { font-weight: 600; font-size: 12px; }
    .gr-td--date { color: #64748b; font-size: 12px; white-space: nowrap; }
    .gr-td--num { text-align: right; font-family: monospace; }
    .gr-mismatch-tag { display: inline-block; background: #fef3c7; color: #d97706; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 5px; margin: 1px; }

    .gr-empty-cell { text-align: center; padding: 32px; }
    .gr-empty-inner { font-size: 14px; color: #16a34a; font-weight: 600; }
  `],
})
export class Gstr2aReconcileComponent {
  private gstService = inject(GstExtendedService);
  private toast = inject(HotToastService);

  clientId = '';
  period = currentPeriod();

  readonly fileName = signal<string | null>(null);
  readonly parsedEntries = signal<Gstr2aEntry[]>([]);
  readonly parseError = signal<string | null>(null);
  readonly isDragging = signal(false);
  readonly isReconciling = signal(false);
  readonly result = signal<Gstr2aReconciliation | null>(null);
  readonly activeTab = signal<'matched' | 'mismatched' | 'missing_in_books' | 'missing_in_2a'>('matched');

  readonly tabs = [
    { key: 'matched', label: 'Matched', color: 'green' },
    { key: 'mismatched', label: 'Mismatched', color: 'amber' },
    { key: 'missing_in_books', label: 'Missing in Books', color: 'red' },
    { key: 'missing_in_2a', label: 'Missing in 2A', color: 'blue' },
  ] as const;

  readonly activeItems = () => {
    const r = this.result();
    if (!r) return [];
    const tab = this.activeTab();
    if (tab === 'matched') return r.matched;
    if (tab === 'mismatched') return r.mismatched;
    if (tab === 'missing_in_books') return r.missingInBooks;
    return r.missingIn2a;
  };

  getCount(key: string): number {
    const r = this.result();
    if (!r) return 0;
    if (key === 'matched') return r.totalMatched;
    if (key === 'mismatched') return r.totalMismatched;
    if (key === 'missing_in_books') return r.totalMissingBooks;
    return r.totalMissing2a;
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.parseFile(file);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.parseFile(file);
  }

  clearFile() {
    this.fileName.set(null);
    this.parsedEntries.set([]);
    this.parseError.set(null);
  }

  runReconciliation() {
    if (!this.clientId || !this.period || !this.parsedEntries().length) return;
    this.isReconciling.set(true);
    this.gstService
      .reconcileGSTR2A(this.clientId.trim(), this.period, this.parsedEntries())
      .subscribe({
        next: (res) => {
          this.result.set(res.data ?? null);
          this.isReconciling.set(false);
          this.toast.success('Reconciliation complete');
        },
        error: () => {
          this.isReconciling.set(false);
          this.toast.error('Reconciliation failed');
        },
      });
  }

  private parseFile(file: File) {
    this.parseError.set(null);
    if (!file.name.endsWith('.json')) {
      this.parseError.set('Please upload a .json file');
      return;
    }
    this.fileName.set(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target!.result as string);
        // Support both array root and {b2b: [...]} structure (GSTN portal format)
        const entries: Gstr2aEntry[] = this.normalizeGstr2aJson(raw);
        this.parsedEntries.set(entries);
        if (entries.length === 0) {
          this.parseError.set('No valid entries found in the JSON file');
        }
      } catch {
        this.parseError.set('Invalid JSON file — could not parse');
        this.parsedEntries.set([]);
      }
    };
    reader.readAsText(file);
  }

  private normalizeGstr2aJson(raw: any): Gstr2aEntry[] {
    // If raw is already an array of our format
    if (Array.isArray(raw) && raw[0]?.supplierGstin !== undefined) return raw;

    // GSTN portal format: { b2b: [{ ctin, inv: [{ inum, idt, val, itms }] }] }
    const entries: Gstr2aEntry[] = [];
    const b2b: any[] = raw?.b2b || raw?.data?.b2b || [];
    for (const supplier of b2b) {
      const gstin: string = supplier.ctin || supplier.stin || '';
      for (const inv of supplier.inv || []) {
        const itms = inv.itms || [];
        let igst = 0, cgst = 0, sgst = 0;
        for (const itm of itms) {
          igst += Number(itm.itm_det?.iamt || 0);
          cgst += Number(itm.itm_det?.camt || 0);
          sgst += Number(itm.itm_det?.samt || 0);
        }
        entries.push({
          supplierGstin: gstin,
          invoiceNumber: inv.inum,
          invoiceDate: inv.idt,
          taxablePurchase: Number(inv.val || 0),
          igst,
          cgst,
          sgst,
        });
      }
    }
    return entries;
  }
}
