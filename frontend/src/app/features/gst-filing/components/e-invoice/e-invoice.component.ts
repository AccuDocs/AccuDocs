import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GstExtendedService } from '@core/services/gst-extended.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-e-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="einv-root">
      <div class="einv-header">
        <div>
          <h1 class="einv-title">E-Invoice (IRN) Generation</h1>
          <p class="einv-sub">Generate Invoice Reference Numbers via IRP — applicable for turnover above ₹5 Crore</p>
        </div>
      </div>

      <!-- Generate Section -->
      <div class="einv-card">
        <h3 class="einv-card-title">Generate IRN</h3>
        <div class="einv-form-row">
          <div class="einv-field einv-field--grow">
            <label class="einv-label">Invoice ID</label>
            <input id="einv-invoice-id" class="einv-input" type="text" [(ngModel)]="invoiceId" placeholder="Paste invoice UUID…" />
          </div>
          <div class="einv-field einv-field--btn">
            <button id="einv-generate-btn" class="einv-gen-btn" [disabled]="isGenerating() || !invoiceId" (click)="generateIRN()">
              @if (isGenerating()) {
                <span class="einv-spinner"></span> Generating…
              } @else {
                Generate IRN
              }
            </button>
          </div>
          <div class="einv-field einv-field--btn">
            <button class="einv-lookup-btn" [disabled]="!invoiceId" (click)="lookupInvoice()">Lookup Existing</button>
          </div>
        </div>
      </div>

      <!-- IRN Result Card -->
      @if (eInvoice()) {
        <div class="einv-result-card">
          <div class="einv-result-header">
            <div>
              <div class="einv-status-row">
                <span class="einv-irn-badge" [class]="'einv-irn-badge--' + eInvoice()!.status">{{ eInvoice()!.status | uppercase }}</span>
              </div>
            </div>
            @if (eInvoice()!.status === 'generated') {
              <button class="einv-cancel-btn" (click)="cancelIRN()">Cancel IRN</button>
            }
          </div>

          <!-- IRN Hash -->
          <div class="einv-irn-section">
            <label class="einv-label">Invoice Reference Number (IRN)</label>
            <div class="einv-irn-hash">{{ eInvoice()!.irn || '—' }}</div>
          </div>

          <!-- Details Grid -->
          <div class="einv-details-grid">
            <div class="einv-detail">
              <span class="einv-detail-label">Ack Number</span>
              <span class="einv-detail-value">{{ eInvoice()!.ackNo || '—' }}</span>
            </div>
            <div class="einv-detail">
              <span class="einv-detail-label">Ack Date</span>
              <span class="einv-detail-value">{{ eInvoice()!.ackDate ? (eInvoice()!.ackDate | date:'medium') : '—' }}</span>
            </div>
            <div class="einv-detail">
              <span class="einv-detail-label">Generated</span>
              <span class="einv-detail-value">{{ eInvoice()!.createdAt | date:'medium' }}</span>
            </div>
          </div>

          <!-- QR Code Preview -->
          @if (eInvoice()!.signedQrCode) {
            <div class="einv-qr-section">
              <label class="einv-label">Signed QR Code Data</label>
              <div class="einv-qr-box">
                <div class="einv-qr-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="einv-qr-icon">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                  </svg>
                  <span class="einv-qr-label">QR Code</span>
                </div>
                <div class="einv-qr-data">{{ eInvoice()!.signedQrCode }}</div>
              </div>
            </div>
          }

          <!-- Error Message -->
          @if (eInvoice()!.errorMessage) {
            <div class="einv-error">
              <strong>Error:</strong> {{ eInvoice()!.errorMessage }}
            </div>
          }
        </div>
      }

      <!-- Threshold Notice -->
      <div class="einv-notice">
        <svg viewBox="0 0 20 20" fill="currentColor" class="einv-notice-icon">
          <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" />
        </svg>
        <div>
          <strong>E-Invoice Applicability</strong>
          <p>E-invoicing is mandatory for businesses with annual turnover exceeding ₹5 Crore. The organization's turnover flag must be enabled in settings.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .einv-root { display: flex; flex-direction: column; gap: 20px; padding: 24px; max-width: 920px; }
    .einv-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .einv-sub { font-size: 13px; color: #64748b; margin: 0; }

    .einv-card, .einv-result-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .einv-card-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }

    .einv-form-row { display: flex; gap: 12px; align-items: flex-end; }
    .einv-field { display: flex; flex-direction: column; gap: 5px; }
    .einv-field--grow { flex: 1; }
    .einv-field--btn { flex-shrink: 0; }
    .einv-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; }
    .einv-input { padding: 9px 13px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: #f8fafc; outline: none; }
    .einv-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

    .einv-gen-btn { padding: 10px 20px; border-radius: 10px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
    .einv-gen-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(139,92,246,0.4); }
    .einv-gen-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .einv-lookup-btn { padding: 10px 16px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.15s; }
    .einv-lookup-btn:hover:not(:disabled) { background: #f1f5f9; }
    .einv-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .einv-result-header { display: flex; justify-content: space-between; align-items: center; }
    .einv-irn-badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; }
    .einv-irn-badge--generated { background: #dcfce7; color: #166534; }
    .einv-irn-badge--cancelled { background: #fef2f2; color: #991b1b; }
    .einv-irn-badge--failed { background: #fef3c7; color: #92400e; }
    .einv-cancel-btn { padding: 7px 14px; border-radius: 8px; border: 1px solid #fecaca; background: #fff; color: #ef4444; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
    .einv-cancel-btn:hover { background: #fef2f2; }

    .einv-irn-section { display: flex; flex-direction: column; gap: 6px; }
    .einv-irn-hash { font-family: monospace; font-size: 12px; font-weight: 600; color: #0f172a; background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; word-break: break-all; }

    .einv-details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .einv-detail { background: #f8fafc; border-radius: 10px; padding: 10px 14px; }
    .einv-detail-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; display: block; }
    .einv-detail-value { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px; display: block; }

    .einv-qr-section { display: flex; flex-direction: column; gap: 8px; }
    .einv-qr-box { display: flex; gap: 16px; align-items: flex-start; background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
    .einv-qr-placeholder { width: 80px; height: 80px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .einv-qr-icon { width: 32px; height: 32px; color: #94a3b8; }
    .einv-qr-label { font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
    .einv-qr-data { font-family: monospace; font-size: 11px; color: #475569; word-break: break-all; line-height: 1.5; flex: 1; }

    .einv-error { background: #fef2f2; color: #991b1b; font-size: 13px; padding: 12px 16px; border-radius: 10px; border: 1px solid #fecaca; }

    .einv-notice { display: flex; gap: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 16px; }
    .einv-notice-icon { width: 20px; height: 20px; color: #3b82f6; flex-shrink: 0; margin-top: 2px; }
    .einv-notice strong { font-size: 13px; color: #1e40af; display: block; }
    .einv-notice p { font-size: 12px; color: #1e40af; margin: 4px 0 0; }
  `],
})
export class EInvoiceComponent {
  private gstService = inject(GstExtendedService);
  private toast = inject(HotToastService);

  invoiceId = '';
  readonly isGenerating = signal(false);
  readonly eInvoice = signal<any>(null);

  generateIRN() {
    if (!this.invoiceId) return;
    this.isGenerating.set(true);
    this.gstService.generateIRN(this.invoiceId.trim()).subscribe({
      next: (res) => {
        this.isGenerating.set(false);
        this.eInvoice.set(res.data);
        this.toast.success('IRN generated successfully!');
      },
      error: (err) => {
        this.isGenerating.set(false);
        this.toast.error(err.error?.message || 'Failed to generate IRN');
      },
    });
  }

  lookupInvoice() {
    if (!this.invoiceId) return;
    this.gstService.getEInvoiceByInvoice(this.invoiceId.trim()).subscribe({
      next: (res) => {
        if (res.data) {
          this.eInvoice.set(res.data);
        } else {
          this.toast.info('No e-invoice found for this invoice');
        }
      },
      error: () => this.toast.error('Failed to lookup e-invoice'),
    });
  }

  cancelIRN() {
    const invoice = this.eInvoice();
    if (!invoice?.irn) return;
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    const remarks = prompt('Remarks (optional):') || '';
    this.gstService.cancelIRN(invoice.irn, reason, remarks).subscribe({
      next: (res) => {
        this.eInvoice.set(res.data);
        this.toast.success('IRN cancelled');
      },
      error: () => this.toast.error('Failed to cancel IRN'),
    });
  }
}
