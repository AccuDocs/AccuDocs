import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../../services/invoice.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-bulk-generate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bulk-root" [class.p-0]="isEmbedded">
      <!-- Header -->
      <div class="bulk-header" *ngIf="!isEmbedded">
        <div>
          <h1 class="bulk-title">Bulk Invoice Generation</h1>
          <p class="bulk-sub">Generate invoices for multiple clients at once — max 500 per batch</p>
        </div>
      </div>

      <!-- Form -->
      <div class="bulk-form-card">
        <div class="bulk-form-grid">
          <!-- Client IDs -->
          <div class="bulk-field bulk-field--full" *ngIf="!isEmbedded">
            <label class="bulk-label">Client IDs (comma-separated UUIDs)</label>
            <textarea
              id="bulk-client-ids"
              class="bulk-textarea"
              [(ngModel)]="clientIdsText"
              rows="3"
              placeholder="paste comma-separated client UUIDs…"
            ></textarea>
            <div class="bulk-hint">{{ parsedClientCount() }} client(s) detected</div>
          </div>

          <!-- Period -->
          <div class="bulk-field">
            <label class="bulk-label">Period</label>
            <input
              id="bulk-period"
              class="bulk-input"
              type="text"
              [(ngModel)]="period"
              placeholder="e.g. April 2025"
            />
          </div>

          <!-- Due Date -->
          <div class="bulk-field">
            <label class="bulk-label">Due Date</label>
            <input
              id="bulk-due-date"
              class="bulk-input"
              type="date"
              [(ngModel)]="dueDate"
            />
          </div>
        </div>

        <!-- Line Items Template -->
        <div class="bulk-section">
          <h3 class="bulk-section-title">Line Items Template</h3>
          @for (item of lineItems; track $index) {
            <div class="bulk-line-row">
              <input class="bulk-input bulk-input--flex" [(ngModel)]="item.description" placeholder="Description" />
              <input class="bulk-input bulk-input--sm" [(ngModel)]="item.sacCode" placeholder="SAC Code" />
              <input class="bulk-input bulk-input--xs" type="number" [(ngModel)]="item.quantity" placeholder="Qty" min="1" />
              <input class="bulk-input bulk-input--sm" type="number" [(ngModel)]="item.unitRate" placeholder="Rate" min="0" />
              <button class="bulk-remove-btn" (click)="removeLineItem($index)" title="Remove">✕</button>
            </div>
          }
          <button class="bulk-add-btn" (click)="addLineItem()">
            <svg viewBox="0 0 20 20" fill="currentColor" class="bulk-add-icon"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
            Add Line Item
          </button>
        </div>

        <!-- Submit -->
        <div class="bulk-actions">
          <button
            id="bulk-generate-btn"
            class="bulk-submit-btn"
            [disabled]="isSubmitting() || parsedClientCount() === 0"
            (click)="submit()"
          >
            @if (isSubmitting()) {
              <span class="bulk-spinner"></span> Submitting…
            } @else {
              🚀 Generate {{ parsedClientCount() }} Invoice(s)
            }
          </button>
          @if (parsedClientCount() > 500) {
            <div class="bulk-warning">⚠️ Max 500 clients per batch</div>
          }
        </div>
      </div>

      <!-- Job Progress -->
      @if (jobId()) {
        <div class="bulk-progress-card">
          <div class="bulk-progress-header">
            <h3 class="bulk-progress-title">Job Progress</h3>
            <span class="bulk-status-badge" [class]="'bulk-status--' + jobStatus()">{{ jobStatus() }}</span>
          </div>

          <div class="bulk-progress-bar-track">
            <div class="bulk-progress-bar-fill" [style.width.%]="progressPct()"></div>
          </div>

          <div class="bulk-progress-stats">
            <div class="bulk-stat">
              <span class="bulk-stat-value">{{ jobCompleted() }}</span>
              <span class="bulk-stat-label">Completed</span>
            </div>
            <div class="bulk-stat">
              <span class="bulk-stat-value bulk-stat-value--red">{{ jobFailed() }}</span>
              <span class="bulk-stat-label">Failed</span>
            </div>
            <div class="bulk-stat">
              <span class="bulk-stat-value">{{ jobTotal() }}</span>
              <span class="bulk-stat-label">Total</span>
            </div>
          </div>

          @if (jobStatus() === 'completed') {
            <div class="bulk-complete-msg">✅ All invoices generated successfully!</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .bulk-root { display: flex; flex-direction: column; gap: 20px; padding: 24px; max-width: 900px; }
    .bulk-root.p-0 { padding: 0; max-width: 100%; }
    .bulk-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .bulk-sub { font-size: 13px; color: #64748b; margin: 0; }

    .bulk-form-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .bulk-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .bulk-field { display: flex; flex-direction: column; gap: 6px; }
    .bulk-field--full { grid-column: 1 / -1; }
    .bulk-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; }
    .bulk-input { padding: 9px 13px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: #f8fafc; outline: none; }
    .bulk-input:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .bulk-input--flex { flex: 1; }
    .bulk-input--sm { width: 120px; }
    .bulk-input--xs { width: 70px; }
    .bulk-textarea { padding: 10px 13px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: #f8fafc; outline: none; resize: vertical; font-family: monospace; }
    .bulk-textarea:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .bulk-hint { font-size: 11px; color: #94a3b8; }

    .bulk-section { display: flex; flex-direction: column; gap: 10px; }
    .bulk-section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0; }
    .bulk-line-row { display: flex; gap: 8px; align-items: center; }
    .bulk-remove-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #fecaca; background: #fff; color: #ef4444; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .bulk-remove-btn:hover { background: #fef2f2; }
    .bulk-add-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1px dashed #cbd5e1; background: transparent; font-size: 13px; font-weight: 600; color: #3b82f6; cursor: pointer; transition: all 0.15s; }
    .bulk-add-btn:hover { background: #eff6ff; border-color: #3b82f6; }
    .bulk-add-icon { width: 16px; height: 16px; }

    .bulk-actions { display: flex; align-items: center; gap: 16px; }
    .bulk-submit-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
    .bulk-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
    .bulk-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .bulk-warning { font-size: 12px; color: #f59e0b; font-weight: 600; }
    .bulk-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .bulk-progress-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .bulk-progress-header { display: flex; justify-content: space-between; align-items: center; }
    .bulk-progress-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }
    .bulk-status-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 8px; text-transform: uppercase; letter-spacing: .05em; }
    .bulk-status--queued { background: #fef3c7; color: #92400e; }
    .bulk-status--processing { background: #dbeafe; color: #1e40af; }
    .bulk-status--completed { background: #dcfce7; color: #166534; }
    .bulk-status--failed { background: #fef2f2; color: #991b1b; }

    .bulk-progress-bar-track { height: 10px; border-radius: 99px; background: #f1f5f9; overflow: hidden; }
    .bulk-progress-bar-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 99px; transition: width 0.5s ease; }

    .bulk-progress-stats { display: flex; gap: 24px; }
    .bulk-stat { display: flex; flex-direction: column; gap: 2px; }
    .bulk-stat-value { font-size: 18px; font-weight: 800; color: #0f172a; }
    .bulk-stat-value--red { color: #ef4444; }
    .bulk-stat-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }

    .bulk-complete-msg { font-size: 14px; font-weight: 600; color: #16a34a; text-align: center; padding: 8px; background: #f0fdf4; border-radius: 10px; }
  `],
})
export class BulkGenerateComponent {
  private invoiceService = inject(InvoiceService);
  private toast = inject(HotToastService);

  @Input() isEmbedded = false;
  @Input() clientIdOverride?: string;

  clientIdsText = '';
  period = '';
  dueDate = '';
  lineItems: Array<{ description: string; sacCode: string; quantity: number; unitRate: number }> = [
    { description: '', sacCode: '', quantity: 1, unitRate: 0 },
  ];

  readonly isSubmitting = signal(false);
  readonly jobId = signal<string | null>(null);
  readonly jobStatus = signal('');
  readonly jobCompleted = signal(0);
  readonly jobFailed = signal(0);
  readonly jobTotal = signal(0);

  private pollInterval: any = null;

  ngOnInit() {
    if (this.clientIdOverride) {
      this.clientIdsText = this.clientIdOverride;
    }
  }

  parsedClientCount(): number {
    if (!this.clientIdsText.trim()) return 0;
    return this.clientIdsText.split(',').map(s => s.trim()).filter(s => s.length > 0).length;
  }

  progressPct(): number {
    const total = this.jobTotal();
    if (total === 0) return 0;
    return Math.round(((this.jobCompleted() + this.jobFailed()) / total) * 100);
  }

  addLineItem() {
    this.lineItems.push({ description: '', sacCode: '', quantity: 1, unitRate: 0 });
  }

  removeLineItem(index: number) {
    this.lineItems.splice(index, 1);
  }

  submit() {
    const clientIds = this.clientIdsText.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (clientIds.length === 0) return;
    if (clientIds.length > 500) {
      this.toast.error('Maximum 500 clients per batch');
      return;
    }

    this.isSubmitting.set(true);
    this.invoiceService.createBulkJob({
      clientIds,
      lineItemsTemplate: this.lineItems.filter(li => li.description),
      dueDate: this.dueDate,
      period: this.period,
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.jobId.set(res.data?.jobId || null);
        this.jobStatus.set(res.data?.status || 'queued');
        this.jobTotal.set(res.data?.totalCount || clientIds.length);
        this.toast.success('Bulk job started!');
        this.startPolling();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err.error?.message || 'Failed to create bulk job');
      },
    });
  }

  private startPolling() {
    this.pollInterval = setInterval(() => {
      const id = this.jobId();
      if (!id) return;

      this.invoiceService.getBulkJobStatus(id).subscribe({
        next: (res) => {
          const data = res.data;
          if (!data) return;
          this.jobStatus.set(data.status);
          this.jobCompleted.set(data.completedCount);
          this.jobFailed.set(data.failedCount);
          this.jobTotal.set(data.totalCount);

          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
          }
        },
      });
    }, 2000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
