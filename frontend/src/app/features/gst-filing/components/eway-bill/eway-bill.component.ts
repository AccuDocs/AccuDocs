import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GstExtendedService } from '@core/services/gst-extended.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-eway-bill',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ewb-root" [class.p-0]="isEmbedded">
      <div class="ewb-header" *ngIf="!isEmbedded">
        <div>
          <h1 class="ewb-title">E-Way Bill Generation</h1>
          <p class="ewb-sub">Generate, manage, and track e-way bills for goods transport</p>
        </div>
      </div>

      <!-- Generate Form -->
      <div class="ewb-card">
        <h3 class="ewb-card-title">Generate E-Way Bill</h3>
        <div class="ewb-form-grid">
          <div class="ewb-field ewb-field--full" *ngIf="!isEmbedded">
            <label class="ewb-label">Invoice ID</label>
            <input id="ewb-invoice-id" class="ewb-input" type="text" [(ngModel)]="invoiceId" placeholder="Paste invoice UUID…" (change)="loadHistory()" />
          </div>
          <div class="ewb-field">
            <label class="ewb-label">Transporter ID</label>
            <input class="ewb-input" type="text" [(ngModel)]="transporterId" placeholder="GSTIN of transporter" />
          </div>
          <div class="ewb-field">
            <label class="ewb-label">Vehicle Number</label>
            <input class="ewb-input" type="text" [(ngModel)]="vehicleNo" placeholder="e.g. GJ05AB1234" />
          </div>
          <div class="ewb-field">
            <label class="ewb-label">Distance (km)</label>
            <input class="ewb-input" type="number" [(ngModel)]="distanceKm" placeholder="0" min="1" />
          </div>
          <div class="ewb-field">
            <label class="ewb-label">Transport Mode</label>
            <select class="ewb-select" [(ngModel)]="transportMode">
              <option value="road">🚛 Road</option>
              <option value="rail">🚂 Rail</option>
              <option value="air">✈️ Air</option>
              <option value="ship">🚢 Ship</option>
            </select>
          </div>
        </div>
        <div class="ewb-actions">
          <button id="ewb-generate-btn" class="ewb-generate-btn" [disabled]="isGenerating() || !invoiceId" (click)="generate()">
            @if (isGenerating()) {
              <span class="ewb-spinner"></span> Generating…
            } @else {
              Generate E-Way Bill
            }
          </button>
          <button class="ewb-check-btn" [disabled]="!invoiceId" (click)="checkRequired()">Check if Required</button>
        </div>
        @if (requiredCheck() !== null) {
          <div class="ewb-check-result" [class.ewb-check-result--yes]="requiredCheck()">
            {{ requiredCheck() ? '⚠️ E-Way Bill is REQUIRED (value > ₹50,000 with goods)' : '✅ E-Way Bill is NOT required for this invoice' }}
          </div>
        }
      </div>

      <!-- Generated E-Way Bill Card -->
      @if (ewayBill()) {
        <div class="ewb-result-card">
          <div class="ewb-result-header">
            <div>
              <div class="ewb-bill-no">{{ ewayBill()!.ewayBillNo }}</div>
              <div class="ewb-bill-date">Generated: {{ ewayBill()!.generatedAt | date:'medium' }}</div>
            </div>
            <span class="ewb-bill-status" [class]="'ewb-bill-status--' + ewayBill()!.status">{{ ewayBill()!.status | uppercase }}</span>
          </div>

          <!-- Countdown -->
          @if (ewayBill()!.validUpto && ewayBill()!.status === 'generated') {
            <div class="ewb-countdown">
              <div class="ewb-countdown-label">Valid Until</div>
              <div class="ewb-countdown-value">{{ ewayBill()!.validUpto | date:'medium' }}</div>
              <div class="ewb-countdown-remaining" [class.ewb-countdown-remaining--urgent]="hoursRemaining() < 6">
                {{ hoursRemaining() > 0 ? hoursRemaining() + ' hours remaining' : 'EXPIRED' }}
              </div>
            </div>
          }

          <!-- Details Grid -->
          <div class="ewb-details-grid" [class.grid-cols-2]="isEmbedded" [class.lg:grid-cols-4]="!isEmbedded">
            <div class="ewb-detail">
              <span class="ewb-detail-label">Vehicle</span>
              <span class="ewb-detail-value">{{ ewayBill()!.vehicleNo || '—' }}</span>
            </div>
            <div class="ewb-detail">
              <span class="ewb-detail-label">Distance</span>
              <span class="ewb-detail-value">{{ ewayBill()!.distanceKm }} km</span>
            </div>
            <div class="ewb-detail">
              <span class="ewb-detail-label">Mode</span>
              <span class="ewb-detail-value">{{ ewayBill()!.transportMode | titlecase }}</span>
            </div>
            <div class="ewb-detail">
              <span class="ewb-detail-label">Transporter</span>
              <span class="ewb-detail-value">{{ ewayBill()!.transporterId || '—' }}</span>
            </div>
          </div>

          <!-- Actions -->
          @if (ewayBill()!.status === 'generated') {
            <div class="ewb-bill-actions">
              <button class="ewb-action-btn ewb-action-btn--update" (click)="updateVehicle()">Update Vehicle</button>
              <button class="ewb-action-btn ewb-action-btn--cancel" (click)="cancelBill()">Cancel E-Way Bill</button>
            </div>
          }
        </div>
      }

      <!-- History -->
      @if (history().length > 0) {
        <div class="ewb-history-card">
          <h3 class="ewb-card-title">E-Way Bill History</h3>
          <div class="overflow-x-auto">
            <table class="ewb-table">
              <thead>
                <tr>
                  <th class="ewb-th">Bill No</th>
                  <th class="ewb-th">Vehicle</th>
                  <th class="ewb-th">Distance</th>
                  <th class="ewb-th">Mode</th>
                  <th class="ewb-th">Status</th>
                  <th class="ewb-th">Generated</th>
                </tr>
              </thead>
              <tbody>
                @for (bill of history(); track bill.id) {
                  <tr class="ewb-tr">
                    <td class="ewb-td"><span class="ewb-mono">{{ bill.ewayBillNo }}</span></td>
                    <td class="ewb-td">{{ bill.vehicleNo || '—' }}</td>
                    <td class="ewb-td">{{ bill.distanceKm }} km</td>
                    <td class="ewb-td">{{ bill.transportMode | titlecase }}</td>
                    <td class="ewb-td"><span class="ewb-bill-status ewb-bill-status--sm" [class]="'ewb-bill-status--' + bill.status">{{ bill.status }}</span></td>
                    <td class="ewb-td">{{ bill.createdAt | date:'shortDate' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .ewb-root { display: flex; flex-direction: column; gap: 20px; padding: 24px; max-width: 920px; }
    .ewb-root.p-0 { padding: 0; max-width: 100%; }
    .ewb-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .ewb-sub { font-size: 13px; color: #64748b; margin: 0; }

    .ewb-card, .ewb-result-card, .ewb-history-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .ewb-card-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }

    .ewb-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .ewb-field { display: flex; flex-direction: column; gap: 5px; }
    .ewb-field--full { grid-column: 1 / -1; }
    .ewb-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; }
    .ewb-input, .ewb-select { padding: 9px 13px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: #f8fafc; outline: none; }
    .ewb-input:focus, .ewb-select:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

    .ewb-actions { display: flex; gap: 10px; align-items: center; }
    .ewb-generate-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 10px; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
    .ewb-generate-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(249,115,22,0.4); }
    .ewb-generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ewb-check-btn { padding: 10px 16px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.15s; }
    .ewb-check-btn:hover:not(:disabled) { background: #f1f5f9; }
    .ewb-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .ewb-check-result { padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; background: #f0fdf4; color: #16a34a; }
    .ewb-check-result--yes { background: #fffbeb; color: #b45309; }

    .ewb-result-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .ewb-bill-no { font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace; }
    .ewb-bill-date { font-size: 12px; color: #64748b; margin-top: 2px; }
    .ewb-bill-status { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: .05em; }
    .ewb-bill-status--sm { font-size: 10px; padding: 2px 6px; }
    .ewb-bill-status--generated { background: #dcfce7; color: #166534; }
    .ewb-bill-status--cancelled { background: #fef2f2; color: #991b1b; }
    .ewb-bill-status--expired { background: #fef3c7; color: #92400e; }

    .ewb-countdown { background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 14px 18px; text-align: center; }
    .ewb-countdown-label { font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: .05em; }
    .ewb-countdown-value { font-size: 16px; font-weight: 700; color: #78350f; margin-top: 2px; }
    .ewb-countdown-remaining { font-size: 13px; font-weight: 800; color: #b45309; margin-top: 4px; }
    .ewb-countdown-remaining--urgent { color: #dc2626; }

    .ewb-details-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .ewb-detail { background: #f8fafc; border-radius: 10px; padding: 10px 14px; }
    .ewb-detail-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; display: block; }
    .ewb-detail-value { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px; display: block; }

    .ewb-bill-actions { display: flex; gap: 10px; }
    .ewb-action-btn { padding: 8px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; border: 1px solid #e2e8f0; background: #fff; }
    .ewb-action-btn--update { color: #2563eb; }
    .ewb-action-btn--update:hover { background: #eff6ff; border-color: #3b82f6; }
    .ewb-action-btn--cancel { color: #dc2626; }
    .ewb-action-btn--cancel:hover { background: #fef2f2; border-color: #ef4444; }

    .ewb-table { width: 100%; border-collapse: collapse; }
    .ewb-th { padding: 10px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .ewb-tr:hover { background: #f8fafc; }
    .ewb-td { padding: 11px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    .ewb-mono { font-family: monospace; font-weight: 600; }

    :host-context(.dark) .ewb-root,
    :host-context(.dark-theme) .ewb-root {
      color: #dbeafe;
    }

    :host-context(.dark) .ewb-card,
    :host-context(.dark-theme) .ewb-card,
    :host-context(.dark) .ewb-result-card,
    :host-context(.dark-theme) .ewb-result-card,
    :host-context(.dark) .ewb-history-card,
    :host-context(.dark-theme) .ewb-history-card {
      background: #0f1f34;
      border-color: rgba(148, 163, 184, .24);
    }

    :host-context(.dark) .ewb-title,
    :host-context(.dark-theme) .ewb-title,
    :host-context(.dark) .ewb-card-title,
    :host-context(.dark-theme) .ewb-card-title,
    :host-context(.dark) .ewb-bill-no,
    :host-context(.dark-theme) .ewb-bill-no,
    :host-context(.dark) .ewb-detail-value,
    :host-context(.dark-theme) .ewb-detail-value,
    :host-context(.dark) .ewb-td,
    :host-context(.dark-theme) .ewb-td {
      color: #f8fafc;
    }

    :host-context(.dark) .ewb-sub,
    :host-context(.dark-theme) .ewb-sub,
    :host-context(.dark) .ewb-label,
    :host-context(.dark-theme) .ewb-label,
    :host-context(.dark) .ewb-bill-date,
    :host-context(.dark-theme) .ewb-bill-date,
    :host-context(.dark) .ewb-detail-label,
    :host-context(.dark-theme) .ewb-detail-label,
    :host-context(.dark) .ewb-th,
    :host-context(.dark-theme) .ewb-th {
      color: #9fb2ca;
    }

    :host-context(.dark) .ewb-input,
    :host-context(.dark-theme) .ewb-input,
    :host-context(.dark) .ewb-select,
    :host-context(.dark-theme) .ewb-select {
      background: #13243b;
      border-color: rgba(148, 163, 184, .28);
      color: #eef6ff;
    }

    :host-context(.dark) .ewb-input::placeholder,
    :host-context(.dark-theme) .ewb-input::placeholder {
      color: #8da2bd;
    }

    :host-context(.dark) .ewb-input:focus,
    :host-context(.dark-theme) .ewb-input:focus,
    :host-context(.dark) .ewb-select:focus,
    :host-context(.dark-theme) .ewb-select:focus {
      background: #162a45;
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, .16);
    }

    :host-context(.dark) .ewb-check-btn,
    :host-context(.dark-theme) .ewb-check-btn,
    :host-context(.dark) .ewb-action-btn,
    :host-context(.dark-theme) .ewb-action-btn {
      background: #13243b;
      border-color: rgba(148, 163, 184, .28);
      color: #eef6ff;
    }

    :host-context(.dark) .ewb-check-btn:hover:not(:disabled),
    :host-context(.dark-theme) .ewb-check-btn:hover:not(:disabled),
    :host-context(.dark) .ewb-action-btn:hover,
    :host-context(.dark-theme) .ewb-action-btn:hover {
      background: #172b48;
    }

    :host-context(.dark) .ewb-check-result,
    :host-context(.dark-theme) .ewb-check-result {
      background: rgba(34, 197, 94, .18);
      color: #86efac;
    }

    :host-context(.dark) .ewb-check-result--yes,
    :host-context(.dark-theme) .ewb-check-result--yes {
      background: rgba(245, 158, 11, .18);
      color: #fcd34d;
    }

    :host-context(.dark) .ewb-detail,
    :host-context(.dark-theme) .ewb-detail,
    :host-context(.dark) .ewb-th,
    :host-context(.dark-theme) .ewb-th {
      background: #172b48;
    }

    :host-context(.dark) .ewb-td,
    :host-context(.dark-theme) .ewb-td,
    :host-context(.dark) .ewb-th,
    :host-context(.dark-theme) .ewb-th {
      border-color: rgba(148, 163, 184, .2);
    }

    :host-context(.dark) .ewb-tr,
    :host-context(.dark-theme) .ewb-tr {
      background: #0f1f34;
    }

    :host-context(.dark) .ewb-tr:hover,
    :host-context(.dark-theme) .ewb-tr:hover {
      background: #142844;
    }

    :host-context(.dark) .ewb-bill-status--generated,
    :host-context(.dark-theme) .ewb-bill-status--generated {
      background: rgba(34, 197, 94, .18);
      color: #86efac;
    }

    :host-context(.dark) .ewb-bill-status--cancelled,
    :host-context(.dark-theme) .ewb-bill-status--cancelled {
      background: rgba(248, 113, 113, .18);
      color: #fca5a5;
    }

    :host-context(.dark) .ewb-bill-status--expired,
    :host-context(.dark-theme) .ewb-bill-status--expired {
      background: rgba(245, 158, 11, .18);
      color: #fcd34d;
    }

    :host-context(.dark) .ewb-countdown,
    :host-context(.dark-theme) .ewb-countdown {
      background: linear-gradient(135deg, rgba(245, 158, 11, .18), rgba(217, 119, 6, .14));
    }

    :host-context(.dark) .ewb-countdown-label,
    :host-context(.dark-theme) .ewb-countdown-label,
    :host-context(.dark) .ewb-countdown-remaining,
    :host-context(.dark-theme) .ewb-countdown-remaining {
      color: #fcd34d;
    }

    :host-context(.dark) .ewb-countdown-value,
    :host-context(.dark-theme) .ewb-countdown-value {
      color: #fef3c7;
    }
  `],
})
export class EwayBillComponent implements OnInit {
  private gstService = inject(GstExtendedService);
  private toast = inject(HotToastService);

  @Input() isEmbedded = false;
  @Input() clientIdOverride?: string;
  @Input() initialInvoiceId?: string;

  invoiceId = '';
  transporterId = '';
  vehicleNo = '';
  distanceKm = 0;
  transportMode: 'road' | 'rail' | 'air' | 'ship' = 'road';

  readonly isGenerating = signal(false);
  readonly ewayBill = signal<any>(null);
  readonly history = signal<any[]>([]);
  readonly requiredCheck = signal<boolean | null>(null);

  ngOnInit() {
    if (this.clientIdOverride) {
      // In embedded mode, we don't necessarily set invoiceId from clientId
      // But we can use it to scope history if needed.
    }
    
    if (this.initialInvoiceId) {
      this.invoiceId = this.initialInvoiceId;
      this.loadHistory();
    }
  }

  hoursRemaining(): number {
    const bill = this.ewayBill();
    if (!bill?.validUpto) return 0;
    const diff = new Date(bill.validUpto).getTime() - Date.now();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60)));
  }

  generate() {
    if (!this.invoiceId) return;
    this.isGenerating.set(true);
    this.gstService.generateEWayBill({
      invoiceId: this.invoiceId.trim(),
      transporterId: this.transporterId || undefined,
      vehicleNo: this.vehicleNo || undefined,
      distanceKm: this.distanceKm,
      transportMode: this.transportMode,
    }).subscribe({
      next: (res) => {
        this.isGenerating.set(false);
        this.ewayBill.set(res.data);
        this.toast.success('E-Way Bill generated!');
        this.loadHistory();
      },
      error: (err) => {
        this.isGenerating.set(false);
        this.toast.error(err.error?.message || 'Failed to generate e-way bill');
      },
    });
  }

  checkRequired() {
    if (!this.invoiceId) return;
    this.gstService.checkEWayBillRequired(this.invoiceId.trim()).subscribe({
      next: (res) => this.requiredCheck.set(res.data?.required ?? null),
      error: () => this.toast.error('Failed to check requirement'),
    });
  }

  cancelBill() {
    const bill = this.ewayBill();
    if (!bill?.ewayBillNo) return;
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    this.gstService.cancelEWayBill(bill.ewayBillNo, reason).subscribe({
      next: (res) => {
        this.ewayBill.set(res.data);
        this.toast.success('E-Way Bill cancelled');
        this.loadHistory();
      },
      error: () => this.toast.error('Failed to cancel'),
    });
  }

  updateVehicle() {
    const bill = this.ewayBill();
    if (!bill?.ewayBillNo) return;
    const newVehicle = prompt('New vehicle number:', bill.vehicleNo || '');
    if (!newVehicle) return;
    this.gstService.updateEWayBillVehicle(bill.ewayBillNo, newVehicle).subscribe({
      next: (res) => {
        this.ewayBill.set(res.data);
        this.toast.success('Vehicle updated');
      },
      error: () => this.toast.error('Failed to update vehicle'),
    });
  }

  loadHistory() {
    if (!this.invoiceId) return;
    this.gstService.getEWayBillByInvoice(this.invoiceId.trim()).subscribe({
      next: (res) => this.history.set(res.data ?? []),
    });
  }
}
