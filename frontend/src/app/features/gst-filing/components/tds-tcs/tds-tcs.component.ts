import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComplianceExtendedService } from '@core/services/compliance-extended.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-tds-tcs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tds-root">
      <div class="tds-header">
        <div>
          <h1 class="tds-title">TDS & TCS Management</h1>
          <p class="tds-sub">Track Tax Deducted at Source and Tax Collected at Source entries</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tds-tabs">
        <button class="tds-tab" [class.tds-tab--active]="activeTab() === 'tds'" (click)="activeTab.set('tds')">TDS</button>
        <button class="tds-tab" [class.tds-tab--active]="activeTab() === 'tcs'" (click)="activeTab.set('tcs')">TCS</button>
      </div>

      <!-- TDS Tab -->
      @if (activeTab() === 'tds') {
        <!-- TDS Entry Form -->
        <div class="tds-card">
          <h3 class="tds-card-title">{{ editingTdsId() ? 'Edit' : 'New' }} TDS Entry</h3>
          <div class="tds-form-grid">
            <div class="tds-field">
              <label class="tds-label">Client ID</label>
              <input class="tds-input" [(ngModel)]="tdsForm.clientId" placeholder="Client UUID" />
            </div>
            <div class="tds-field">
              <label class="tds-label">Deductor Name</label>
              <input class="tds-input" [(ngModel)]="tdsForm.deductor" placeholder="Deductor name" />
            </div>
            <div class="tds-field">
              <label class="tds-label">PAN</label>
              <input class="tds-input" [(ngModel)]="tdsForm.pan" placeholder="AAAAA1234A" maxlength="10" />
            </div>
            <div class="tds-field">
              <label class="tds-label">Section</label>
              <select class="tds-select" [(ngModel)]="tdsForm.section" (ngModelChange)="onSectionChange()">
                <option value="">Select section…</option>
                @for (sec of sections(); track sec.section) {
                  <option [value]="sec.section">{{ sec.section }} — {{ sec.description }}</option>
                }
              </select>
            </div>
            <div class="tds-field">
              <label class="tds-label">Amount (₹)</label>
              <input class="tds-input" type="number" [(ngModel)]="tdsForm.amount" (ngModelChange)="onAmountChange()" placeholder="0.00" />
            </div>
            <div class="tds-field">
              <label class="tds-label">TDS Rate (%)</label>
              <input class="tds-input" type="number" [(ngModel)]="tdsForm.tdsRate" readonly />
            </div>
            <div class="tds-field">
              <label class="tds-label">TDS Amount (₹)</label>
              <input class="tds-input" type="number" [(ngModel)]="tdsForm.tdsAmount" readonly />
            </div>
            <div class="tds-field">
              <label class="tds-label">Period</label>
              <input class="tds-input" [(ngModel)]="tdsForm.period" placeholder="e.g. 2024-25 Q1" />
            </div>
            <div class="tds-field">
              <label class="tds-label">Challan No</label>
              <input class="tds-input" [(ngModel)]="tdsForm.challanNo" placeholder="Optional" />
            </div>
            <div class="tds-field">
              <label class="tds-label">Status</label>
              <select class="tds-select" [(ngModel)]="tdsForm.status">
                <option value="pending">Pending</option>
                <option value="deducted">Deducted</option>
                <option value="deposited">Deposited</option>
                <option value="filed">Filed</option>
              </select>
            </div>
          </div>
          <div class="tds-form-actions">
            <button class="tds-save-btn" (click)="saveTDS()">
              {{ editingTdsId() ? 'Update' : 'Save' }} TDS Entry
            </button>
            @if (editingTdsId()) {
              <button class="tds-cancel-btn" (click)="resetTdsForm()">Cancel</button>
            }
          </div>
        </div>

        <!-- Filters -->
        <div class="tds-filters">
          <input class="tds-input tds-input--filter" [(ngModel)]="tdsFilterPeriod" placeholder="Filter by period…" />
          <button class="tds-filter-btn" (click)="loadTDS()">Load</button>
          <button class="tds-export-btn" (click)="exportSummary()">📊 Export Form 26AS</button>
        </div>

        <!-- TDS Table -->
        @if (tdsEntries().length > 0) {
          <div class="tds-table-card">
            <table class="tds-table">
              <thead>
                <tr>
                  <th class="tds-th">Deductor</th>
                  <th class="tds-th">PAN</th>
                  <th class="tds-th">Section</th>
                  <th class="tds-th tds-th--right">Amount</th>
                  <th class="tds-th tds-th--right">Rate</th>
                  <th class="tds-th tds-th--right">TDS</th>
                  <th class="tds-th">Period</th>
                  <th class="tds-th">Status</th>
                  <th class="tds-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of tdsEntries(); track entry.id) {
                  <tr class="tds-tr">
                    <td class="tds-td">{{ entry.deductor }}</td>
                    <td class="tds-td"><span class="tds-mono">{{ entry.pan }}</span></td>
                    <td class="tds-td"><span class="tds-section-badge">{{ entry.section }}</span></td>
                    <td class="tds-td tds-td--right tds-td--num">₹{{ entry.amount | number:'1.2-2' }}</td>
                    <td class="tds-td tds-td--right">{{ entry.tdsRate }}%</td>
                    <td class="tds-td tds-td--right tds-td--num"><strong>₹{{ entry.tdsAmount | number:'1.2-2' }}</strong></td>
                    <td class="tds-td"><span class="tds-period-tag">{{ entry.period }}</span></td>
                    <td class="tds-td"><span class="tds-status-badge" [class]="'tds-status--' + entry.status">{{ entry.status }}</span></td>
                    <td class="tds-td">
                      <div class="tds-action-row">
                        <button class="tds-action-btn" (click)="editTDS(entry)">✏️</button>
                        <button class="tds-action-btn tds-action-btn--del" (click)="deleteTDS(entry.id)">🗑️</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- TCS Tab -->
      @if (activeTab() === 'tcs') {
        <div class="tds-card">
          <h3 class="tds-card-title">{{ editingTcsId() ? 'Edit' : 'New' }} TCS Entry</h3>
          <div class="tds-form-grid">
            <div class="tds-field">
              <label class="tds-label">Seller GSTIN</label>
              <input class="tds-input" [(ngModel)]="tcsForm.sellerGstin" placeholder="15-digit GSTIN" maxlength="15" />
            </div>
            <div class="tds-field">
              <label class="tds-label">Buyer GSTIN</label>
              <input class="tds-input" [(ngModel)]="tcsForm.buyerGstin" placeholder="15-digit GSTIN" maxlength="15" />
            </div>
            <div class="tds-field">
              <label class="tds-label">Transaction Value (₹)</label>
              <input class="tds-input" type="number" [(ngModel)]="tcsForm.transactionValue" placeholder="0.00" />
            </div>
            <div class="tds-field">
              <label class="tds-label">TCS Rate (%)</label>
              <input class="tds-input" type="number" [(ngModel)]="tcsForm.tcsRate" placeholder="0.00" step="0.01" />
            </div>
            <div class="tds-field">
              <label class="tds-label">TCS Amount (₹)</label>
              <input class="tds-input" type="number" [ngModel]="computedTcsAmount()" readonly />
            </div>
            <div class="tds-field">
              <label class="tds-label">Period</label>
              <input class="tds-input" [(ngModel)]="tcsForm.period" placeholder="e.g. 2024-25 Q1" />
            </div>
          </div>
          <div class="tds-form-actions">
            <button class="tds-save-btn tds-save-btn--tcs" (click)="saveTCS()">
              {{ editingTcsId() ? 'Update' : 'Save' }} TCS Entry
            </button>
            @if (editingTcsId()) {
              <button class="tds-cancel-btn" (click)="resetTcsForm()">Cancel</button>
            }
          </div>
        </div>

        <!-- TCS Filters -->
        <div class="tds-filters">
          <input class="tds-input tds-input--filter" [(ngModel)]="tcsFilterPeriod" placeholder="Filter by period…" />
          <button class="tds-filter-btn" (click)="loadTCS()">Load</button>
        </div>

        <!-- TCS Table -->
        @if (tcsEntries().length > 0) {
          <div class="tds-table-card">
            <table class="tds-table">
              <thead>
                <tr>
                  <th class="tds-th">Seller GSTIN</th>
                  <th class="tds-th">Buyer GSTIN</th>
                  <th class="tds-th tds-th--right">Value</th>
                  <th class="tds-th tds-th--right">Rate</th>
                  <th class="tds-th tds-th--right">TCS Amount</th>
                  <th class="tds-th">Period</th>
                  <th class="tds-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of tcsEntries(); track entry.id) {
                  <tr class="tds-tr">
                    <td class="tds-td"><span class="tds-mono">{{ entry.sellerGstin }}</span></td>
                    <td class="tds-td"><span class="tds-mono">{{ entry.buyerGstin }}</span></td>
                    <td class="tds-td tds-td--right tds-td--num">₹{{ entry.transactionValue | number:'1.2-2' }}</td>
                    <td class="tds-td tds-td--right">{{ entry.tcsRate }}%</td>
                    <td class="tds-td tds-td--right tds-td--num"><strong>₹{{ entry.tcsAmount | number:'1.2-2' }}</strong></td>
                    <td class="tds-td"><span class="tds-period-tag">{{ entry.period }}</span></td>
                    <td class="tds-td">
                      <div class="tds-action-row">
                        <button class="tds-action-btn" (click)="editTCS(entry)">✏️</button>
                        <button class="tds-action-btn tds-action-btn--del" (click)="deleteTCS(entry.id)">🗑️</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .tds-root { display: flex; flex-direction: column; gap: 20px; padding: 24px; max-width: 1000px; }
    .tds-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .tds-sub { font-size: 13px; color: #64748b; margin: 0; }

    .tds-tabs { display: flex; gap: 4px; background: #f1f5f9; border-radius: 12px; padding: 4px; width: fit-content; }
    .tds-tab { padding: 8px 20px; border-radius: 10px; border: none; background: transparent; font-size: 13px; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.15s; }
    .tds-tab--active { background: #fff; color: #0f172a; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

    .tds-card, .tds-table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .tds-card-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }

    .tds-form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .tds-field { display: flex; flex-direction: column; gap: 5px; }
    .tds-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; }
    .tds-input, .tds-select { padding: 9px 13px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: #f8fafc; outline: none; }
    .tds-input:focus, .tds-select:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .tds-input[readonly] { background: #f1f5f9; color: #475569; }
    .tds-input--filter { max-width: 220px; }

    .tds-form-actions { display: flex; gap: 10px; }
    .tds-save-btn { padding: 10px 20px; border-radius: 10px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
    .tds-save-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(16,185,129,0.4); }
    .tds-save-btn--tcs { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .tds-save-btn--tcs:hover { box-shadow: 0 4px 14px rgba(59,130,246,0.4); }
    .tds-cancel-btn { padding: 10px 16px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; }

    .tds-filters { display: flex; gap: 10px; align-items: center; }
    .tds-filter-btn { padding: 9px 16px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; transition: 0.15s; }
    .tds-filter-btn:hover { background: #f1f5f9; }
    .tds-export-btn { padding: 9px 16px; border-radius: 10px; background: #eff6ff; border: 1px solid #bfdbfe; font-size: 13px; font-weight: 600; color: #1e40af; cursor: pointer; transition: 0.15s; margin-left: auto; }
    .tds-export-btn:hover { background: #dbeafe; }

    .tds-table { width: 100%; border-collapse: collapse; }
    .tds-th { padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .tds-th--right { text-align: right; }
    .tds-tr:hover { background: #f8fafc; }
    .tds-td { padding: 10px 12px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    .tds-td--right { text-align: right; }
    .tds-td--num { font-family: monospace; }
    .tds-mono { font-family: monospace; font-weight: 600; font-size: 12px; }
    .tds-section-badge { background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
    .tds-period-tag { background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; font-family: monospace; }
    .tds-status-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; }
    .tds-status--pending { background: #fef3c7; color: #92400e; }
    .tds-status--deducted { background: #dbeafe; color: #1e40af; }
    .tds-status--deposited { background: #dcfce7; color: #166534; }
    .tds-status--filed { background: #e0e7ff; color: #3730a3; }

    .tds-action-row { display: flex; gap: 4px; }
    .tds-action-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: 0.15s; }
    .tds-action-btn:hover { background: #f1f5f9; }
    .tds-action-btn--del:hover { background: #fef2f2; border-color: #fecaca; }
  `],
})
export class TdsTcsComponent {
  private complianceService = inject(ComplianceExtendedService);
  private toast = inject(HotToastService);

  readonly activeTab = signal<'tds' | 'tcs'>('tds');
  readonly sections = signal<any[]>([]);
  readonly tdsEntries = signal<any[]>([]);
  readonly tcsEntries = signal<any[]>([]);
  readonly editingTdsId = signal<string | null>(null);
  readonly editingTcsId = signal<string | null>(null);

  tdsFilterPeriod = '';
  tcsFilterPeriod = '';

  tdsForm = {
    clientId: '', deductor: '', pan: '', section: '', amount: 0,
    tdsRate: 0, tdsAmount: 0, period: '', challanNo: '', status: 'pending' as string,
  };

  tcsForm = {
    sellerGstin: '', buyerGstin: '', transactionValue: 0,
    tcsRate: 0, period: '',
  };

  computedTcsAmount(): number {
    return Math.round(this.tcsForm.transactionValue * this.tcsForm.tcsRate) / 100;
  }

  ngOnInit() {
    this.complianceService.getTDSSections().subscribe({
      next: (res) => this.sections.set(res.data ?? []),
    });
  }

  onSectionChange() {
    const sec = this.sections().find(s => s.section === this.tdsForm.section);
    if (sec) {
      this.tdsForm.tdsRate = sec.rate_individual;
      this.onAmountChange();
    }
  }

  onAmountChange() {
    this.tdsForm.tdsAmount = Math.round(this.tdsForm.amount * this.tdsForm.tdsRate) / 100;
  }

  loadTDS() {
    this.complianceService.listTDS({ period: this.tdsFilterPeriod || undefined }).subscribe({
      next: (res) => this.tdsEntries.set(res.data ?? []),
      error: () => this.toast.error('Failed to load TDS entries'),
    });
  }

  saveTDS() {
    const id = this.editingTdsId();
    const obs = id
      ? this.complianceService.updateTDS(id, this.tdsForm)
      : this.complianceService.createTDS(this.tdsForm);

    obs.subscribe({
      next: () => {
        this.toast.success(id ? 'TDS entry updated' : 'TDS entry created');
        this.resetTdsForm();
        this.loadTDS();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to save TDS'),
    });
  }

  editTDS(entry: any) {
    this.editingTdsId.set(entry.id);
    this.tdsForm = { ...entry };
  }

  deleteTDS(id: string) {
    if (!confirm('Delete this TDS entry?')) return;
    this.complianceService.deleteTDS(id).subscribe({
      next: () => { this.toast.success('Deleted'); this.loadTDS(); },
      error: () => this.toast.error('Failed to delete'),
    });
  }

  resetTdsForm() {
    this.editingTdsId.set(null);
    this.tdsForm = { clientId: '', deductor: '', pan: '', section: '', amount: 0, tdsRate: 0, tdsAmount: 0, period: '', challanNo: '', status: 'pending' };
  }

  loadTCS() {
    this.complianceService.listTCS({ period: this.tcsFilterPeriod || undefined }).subscribe({
      next: (res) => this.tcsEntries.set(res.data ?? []),
      error: () => this.toast.error('Failed to load TCS entries'),
    });
  }

  saveTCS() {
    const id = this.editingTcsId();
    const data = { ...this.tcsForm, tcsAmount: this.computedTcsAmount() };
    const obs = id
      ? this.complianceService.updateTCS(id, data)
      : this.complianceService.createTCS(data);

    obs.subscribe({
      next: () => {
        this.toast.success(id ? 'TCS entry updated' : 'TCS entry created');
        this.resetTcsForm();
        this.loadTCS();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to save TCS'),
    });
  }

  editTCS(entry: any) {
    this.editingTcsId.set(entry.id);
    this.tcsForm = { sellerGstin: entry.sellerGstin, buyerGstin: entry.buyerGstin, transactionValue: entry.transactionValue, tcsRate: entry.tcsRate, period: entry.period };
  }

  deleteTCS(id: string) {
    if (!confirm('Delete this TCS entry?')) return;
    this.complianceService.deleteTCS(id).subscribe({
      next: () => { this.toast.success('Deleted'); this.loadTCS(); },
      error: () => this.toast.error('Failed to delete'),
    });
  }

  resetTcsForm() {
    this.editingTcsId.set(null);
    this.tcsForm = { sellerGstin: '', buyerGstin: '', transactionValue: 0, tcsRate: 0, period: '' };
  }

  exportSummary() {
    const clientId = this.tdsForm.clientId || prompt('Enter Client ID for Form 26AS:');
    if (!clientId) return;
    const fy = prompt('Financial Year (e.g. 2024-25):', '2024-25');
    if (!fy) return;
    this.complianceService.getForm26ASSummary(clientId, fy).subscribe({
      next: (res) => {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Form26AS_${fy}.json`; a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Form 26AS exported');
      },
      error: () => this.toast.error('Failed to export'),
    });
  }
}
