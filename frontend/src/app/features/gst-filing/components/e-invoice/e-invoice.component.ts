import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Invoice } from '@features/billing/models/invoice.model';
import { InvoiceService } from '@features/billing/services/invoice.service';
import { GstExtendedService } from '@core/services/gst-extended.service';
import { HotToastService } from '@ngneat/hot-toast';

interface EInvoiceRecord {
  id?: string;
  invoiceId?: string;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  signedQrCode?: string;
  status?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  rawResponse?: unknown;
}

@Component({
  selector: 'app-e-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="einv-root" [class.einv-root--embedded]="isEmbedded">
      <header class="einv-hero">
        <div>
          <span class="einv-eyebrow">GST E-Invoice</span>
          <h1>E-Invoice & IRN Console</h1>
          <p>Generate, verify, cancel, and archive IRN details for client invoices.</p>
        </div>
        <div class="einv-hero-actions">
          <button type="button" class="einv-secondary-btn" (click)="loadInvoices()" [disabled]="isLoadingInvoices() || !clientIdOverride">
            @if (isLoadingInvoices()) {
              <span class="einv-spinner einv-spinner--dark"></span>
              Syncing
            } @else {
              Refresh Queue
            }
          </button>
          <button type="button" class="einv-primary-btn" (click)="generateIRN()" [disabled]="isGenerating() || !invoiceId.trim()">
            @if (isGenerating()) {
              <span class="einv-spinner"></span>
              Generating
            } @else {
              Generate IRN
            }
          </button>
        </div>
      </header>

      <section class="einv-metrics" aria-label="E-invoice summary">
        <article>
          <span>Invoice Queue</span>
          <strong>{{ invoices().length }}</strong>
        </article>
        <article>
          <span>Ready for IRN</span>
          <strong>{{ readyInvoices().length }}</strong>
        </article>
        <article>
          <span>Selected Value</span>
          <strong>{{ selectedInvoice() ? (selectedInvoice()!.totalAmount | currency:'INR':'symbol-narrow':'1.0-0') : 'INR 0' }}</strong>
        </article>
        <article>
          <span>IRN Status</span>
          <strong>{{ eInvoice()?.status ? (eInvoice()!.status | titlecase) : 'Not generated' }}</strong>
        </article>
      </section>

      <section class="einv-workspace">
        <div class="einv-panel">
          <div class="einv-panel-head">
            <div>
              <span>IRN workflow</span>
              <h2>Invoice selection</h2>
            </div>
          </div>

          <div class="einv-form-grid">
            <label class="einv-field">
              <span>Invoice ID</span>
              <input class="einv-input" type="text" [(ngModel)]="invoiceId" placeholder="Paste invoice UUID" />
            </label>

            <label class="einv-field">
              <span>Quick Select</span>
              <select class="einv-input" [ngModel]="selectedInvoice()?.id || ''" (ngModelChange)="selectInvoiceById($event)">
                <option value="">Select invoice from queue</option>
                @for (invoice of invoices(); track invoice.id) {
                  <option [value]="invoice.id">{{ invoice.invoiceNumber }} - {{ invoice.totalAmount | currency:'INR':'symbol-narrow':'1.0-0' }}</option>
                }
              </select>
            </label>
          </div>

          <div class="einv-action-row">
            <button type="button" class="einv-primary-btn" (click)="generateIRN()" [disabled]="isGenerating() || !invoiceId.trim()">
              Generate IRN
            </button>
            <button type="button" class="einv-secondary-btn" (click)="lookupInvoice()" [disabled]="!invoiceId.trim()">
              Lookup Existing
            </button>
            <button type="button" class="einv-secondary-btn" (click)="clearSelection()">
              Clear
            </button>
          </div>

          @if (selectedInvoice()) {
            <div class="einv-selected">
              <div>
                <span>Selected Invoice</span>
                <strong>{{ selectedInvoice()!.invoiceNumber }}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{{ selectedInvoice()!.invoiceDate | date:'dd MMM yyyy' }}</strong>
              </div>
              <div>
                <span>GST Type</span>
                <strong>{{ selectedInvoice()!.gstType }}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{{ selectedInvoice()!.status | titlecase }}</strong>
              </div>
            </div>
          }
        </div>

        <aside class="einv-panel einv-compliance">
          <div class="einv-panel-head">
            <div>
              <span>Applicability</span>
              <h2>E-invoice readiness</h2>
            </div>
          </div>
          <div class="einv-check-list">
            <div>
              <span>Turnover threshold</span>
              <strong>Above INR 5 Crore</strong>
            </div>
            <div>
              <span>Invoice type</span>
              <strong>Tax invoice</strong>
            </div>
            <div>
              <span>Current mode</span>
              <strong>IRP sandbox/simulation</strong>
            </div>
            <div>
              <span>Client binding</span>
              <strong>{{ clientIdOverride ? 'Workspace client' : 'Manual invoice' }}</strong>
            </div>
          </div>
        </aside>
      </section>

      @if (eInvoice()) {
        <section class="einv-result-grid">
          <div class="einv-result-card">
            <div class="einv-result-header">
              <div>
                <span class="einv-status-badge" [class]="'einv-status-badge--' + normalizedStatus()">{{ eInvoice()!.status || 'generated' }}</span>
                <h2>IRN record</h2>
              </div>
              <div class="einv-result-actions">
                <button type="button" class="einv-secondary-btn" (click)="copyIrn()" [disabled]="!eInvoice()!.irn">Copy IRN</button>
                <button type="button" class="einv-secondary-btn" (click)="downloadRecord()">Download JSON</button>
                @if (normalizedStatus() === 'generated') {
                  <button type="button" class="einv-danger-btn" (click)="cancelIRN()">Cancel IRN</button>
                }
              </div>
            </div>

            <div class="einv-irn-box">
              <span>Invoice Reference Number</span>
              <strong>{{ eInvoice()!.irn || 'Not available' }}</strong>
            </div>

            <div class="einv-detail-grid">
              <div>
                <span>Ack Number</span>
                <strong>{{ eInvoice()!.ackNo || 'Pending' }}</strong>
              </div>
              <div>
                <span>Ack Date</span>
                <strong>{{ eInvoice()!.ackDate ? (eInvoice()!.ackDate | date:'dd MMM yyyy, h:mm a') : 'Pending' }}</strong>
              </div>
              <div>
                <span>Created</span>
                <strong>{{ eInvoice()!.createdAt ? (eInvoice()!.createdAt | date:'dd MMM yyyy, h:mm a') : 'Now' }}</strong>
              </div>
            </div>

            @if (eInvoice()!.errorMessage) {
              <div class="einv-error">
                <strong>Error</strong>
                <span>{{ eInvoice()!.errorMessage }}</span>
              </div>
            }
          </div>

          <aside class="einv-qr-card">
            <div class="einv-qr-visual" aria-hidden="true">
              <span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span>
            </div>
            <div>
              <span>Signed QR Data</span>
              <p>{{ eInvoice()!.signedQrCode || 'QR data will appear after successful IRN generation.' }}</p>
            </div>
          </aside>
        </section>
      }

      <section class="einv-panel">
        <div class="einv-panel-head">
          <div>
            <span>Invoice queue</span>
            <h2>Client invoices</h2>
          </div>
          <button type="button" class="einv-secondary-btn" (click)="loadInvoices()" [disabled]="isLoadingInvoices() || !clientIdOverride">
            Refresh
          </button>
        </div>

        @if (invoices().length > 0) {
          <div class="einv-table-wrap">
            <table class="einv-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Receiver</th>
                  <th>Date</th>
                  <th class="right">Value</th>
                  <th>Status</th>
                  <th class="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (invoice of invoices(); track invoice.id) {
                  <tr [class.einv-active-row]="selectedInvoice()?.id === invoice.id">
                    <td>
                      <strong>{{ invoice.invoiceNumber }}</strong>
                      <small>{{ invoice.id }}</small>
                    </td>
                    <td>{{ invoice.receiverName || invoice.client?.name || 'Client' }}</td>
                    <td>{{ invoice.invoiceDate | date:'dd MMM yyyy' }}</td>
                    <td class="right">{{ invoice.totalAmount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                    <td><span class="einv-table-status">{{ invoice.status | titlecase }}</span></td>
                    <td class="right">
                      <div class="einv-row-actions">
                        <button type="button" class="einv-action-btn" [class.einv-action-btn--active]="selectedInvoice()?.id === invoice.id" (click)="selectInvoice(invoice)">
                          {{ selectedInvoice()?.id === invoice.id ? 'Selected' : 'Select' }}
                        </button>
                        <button type="button" class="einv-action-btn einv-action-btn--primary" (click)="generateForInvoice(invoice)" [disabled]="isGenerating()">
                          Generate
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="einv-empty">
            <strong>No client invoices loaded</strong>
            <span>{{ clientIdOverride ? 'Create or issue invoices in Billing, then refresh this queue.' : 'Paste an invoice UUID above to generate or lookup IRN.' }}</span>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .einv-root { display: flex; flex-direction: column; gap: 18px; width: 100%; padding: 24px 0 0; color: #0f172a; }
    .einv-root:not(.einv-root--embedded) { padding: 24px; }

    .einv-hero,
    .einv-panel,
    .einv-result-card,
    .einv-qr-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
    }

    .einv-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .einv-eyebrow,
    .einv-panel-head span,
    .einv-field span,
    .einv-selected span,
    .einv-check-list span,
    .einv-irn-box span,
    .einv-detail-grid span,
    .einv-qr-card span,
    .einv-metrics span {
      color: #64748b;
      font-size: 11px;
      font-weight: 850;
      letter-spacing: .07em;
      text-transform: uppercase;
    }

    .einv-hero h1,
    .einv-panel-head h2,
    .einv-result-header h2 {
      margin: 4px 0 0;
      color: #0f172a;
      font-size: 20px;
      font-weight: 900;
      line-height: 1.15;
    }

    .einv-hero p {
      margin: 6px 0 0;
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
    }

    .einv-hero-actions,
    .einv-action-row,
    .einv-result-actions,
    .einv-row-actions,
    .einv-detail-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
    }

    .einv-primary-btn,
    .einv-secondary-btn,
    .einv-danger-btn,
    .einv-action-btn {
      min-height: 38px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      padding: 0 13px;
      font: inherit;
      font-size: 13px;
      font-weight: 850;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      white-space: nowrap;
    }

    button:disabled { cursor: not-allowed; opacity: .55; }
    .einv-primary-btn { border-color: #7c3aed; background: #7c3aed; color: #fff; }
    .einv-primary-btn:hover:not(:disabled) { background: #6d28d9; }
    .einv-secondary-btn { background: #fff; color: #1e293b; }
    .einv-secondary-btn:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
    .einv-danger-btn { border-color: #fecaca; background: #fff; color: #dc2626; }
    .einv-danger-btn:hover:not(:disabled) { background: #fef2f2; }

    .einv-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, .4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: einv-spin .7s linear infinite;
    }
    .einv-spinner--dark { border-color: rgba(30, 41, 59, .25); border-top-color: #1e293b; }
    @keyframes einv-spin { to { transform: rotate(360deg); } }

    .einv-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .einv-metrics article {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      display: grid;
      gap: 8px;
      min-height: 86px;
    }
    .einv-metrics strong { color: #0f172a; font-size: 20px; font-weight: 950; line-height: 1.1; }

    .einv-workspace,
    .einv-result-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.45fr) minmax(300px, .8fr);
      gap: 16px;
      align-items: stretch;
    }

    .einv-panel { display: flex; flex-direction: column; gap: 16px; }
    .einv-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .einv-form-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(240px, .9fr); gap: 12px; }
    .einv-field { display: grid; gap: 6px; }
    .einv-input {
      width: 100%;
      min-height: 44px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      color: #0f172a;
      padding: 0 12px;
      font-size: 13px;
      font-weight: 750;
      outline: none;
    }
    .einv-input:focus { border-color: #7c3aed; background: #fff; box-shadow: 0 0 0 3px rgba(124, 58, 237, .12); }

    .einv-selected,
    .einv-check-list,
    .einv-detail-grid {
      display: grid;
      gap: 10px;
    }
    .einv-selected { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .einv-selected div,
    .einv-check-list div,
    .einv-detail-grid div {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      padding: 12px;
      display: grid;
      gap: 4px;
    }
    .einv-selected strong,
    .einv-check-list strong,
    .einv-detail-grid strong {
      color: #0f172a;
      font-size: 13px;
      font-weight: 900;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .einv-result-card,
    .einv-qr-card { display: flex; flex-direction: column; gap: 16px; }
    .einv-result-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .einv-status-badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border-radius: 999px;
      background: #ecfdf5;
      color: #047857;
      padding: 0 10px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .einv-status-badge--cancelled { background: #fef2f2; color: #b91c1c; }
    .einv-status-badge--failed { background: #fffbeb; color: #b45309; }

    .einv-irn-box {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      padding: 14px;
      display: grid;
      gap: 8px;
    }
    .einv-irn-box strong {
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .einv-detail-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }

    .einv-error {
      border: 1px solid #fecaca;
      border-radius: 10px;
      background: #fef2f2;
      color: #991b1b;
      padding: 12px;
      display: grid;
      gap: 2px;
      font-size: 13px;
    }

    .einv-qr-card { justify-content: space-between; }
    .einv-qr-visual {
      width: 160px;
      max-width: 100%;
      aspect-ratio: 1;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: #fff;
      padding: 16px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .einv-qr-visual span { border-radius: 4px; background: #0f172a; }
    .einv-qr-visual span:nth-child(2n) { background: #7c3aed; }
    .einv-qr-card p {
      margin: 8px 0 0;
      color: #475569;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .einv-table-wrap { overflow-x: auto; }
    .einv-table { width: 100%; min-width: 900px; border-collapse: collapse; }
    .einv-table th,
    .einv-table td {
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 10px;
      text-align: left;
      white-space: nowrap;
      vertical-align: middle;
    }
    .einv-table th {
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .07em;
      text-transform: uppercase;
    }
    .einv-table td { color: #1e293b; font-size: 13px; font-weight: 700; }
    .einv-table small {
      display: block;
      max-width: 260px;
      margin-top: 3px;
      color: #94a3b8;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .right { text-align: right !important; }
    .einv-active-row { background: #f5f3ff; }
    .einv-table-status {
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      padding: 4px 9px;
      font-size: 11px;
      font-weight: 900;
    }
    .einv-action-btn { min-height: 32px; background: #fff; color: #1e293b; font-size: 12px; }
    .einv-action-btn--primary { border-color: #c4b5fd; background: #f5f3ff; color: #6d28d9; }
    .einv-action-btn--active { border-color: #10b981; background: #ecfdf5; color: #047857; }

    .einv-empty {
      min-height: 160px;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      display: grid;
      place-content: center;
      gap: 6px;
      text-align: center;
      color: #64748b;
      padding: 24px;
    }
    .einv-empty strong { color: #0f172a; font-size: 15px; }
    .einv-empty span { font-size: 13px; }

    :host-context(.dark) .einv-root,
    :host-context(.dark-theme) .einv-root { color: #e2e8f0; }

    :host-context(.dark) .einv-hero,
    :host-context(.dark-theme) .einv-hero,
    :host-context(.dark) .einv-panel,
    :host-context(.dark-theme) .einv-panel,
    :host-context(.dark) .einv-result-card,
    :host-context(.dark-theme) .einv-result-card,
    :host-context(.dark) .einv-qr-card,
    :host-context(.dark-theme) .einv-qr-card,
    :host-context(.dark) .einv-metrics article,
    :host-context(.dark-theme) .einv-metrics article {
      background: #0f1f33;
      border-color: #263a55;
    }

    :host-context(.dark) .einv-hero h1,
    :host-context(.dark-theme) .einv-hero h1,
    :host-context(.dark) .einv-panel-head h2,
    :host-context(.dark-theme) .einv-panel-head h2,
    :host-context(.dark) .einv-result-header h2,
    :host-context(.dark-theme) .einv-result-header h2,
    :host-context(.dark) .einv-metrics strong,
    :host-context(.dark-theme) .einv-metrics strong,
    :host-context(.dark) .einv-selected strong,
    :host-context(.dark-theme) .einv-selected strong,
    :host-context(.dark) .einv-check-list strong,
    :host-context(.dark-theme) .einv-check-list strong,
    :host-context(.dark) .einv-detail-grid strong,
    :host-context(.dark-theme) .einv-detail-grid strong,
    :host-context(.dark) .einv-irn-box strong,
    :host-context(.dark-theme) .einv-irn-box strong,
    :host-context(.dark) .einv-table td,
    :host-context(.dark-theme) .einv-table td,
    :host-context(.dark) .einv-empty strong,
    :host-context(.dark-theme) .einv-empty strong {
      color: #f8fafc;
    }

    :host-context(.dark) .einv-hero p,
    :host-context(.dark-theme) .einv-hero p,
    :host-context(.dark) .einv-eyebrow,
    :host-context(.dark-theme) .einv-eyebrow,
    :host-context(.dark) .einv-panel-head span,
    :host-context(.dark-theme) .einv-panel-head span,
    :host-context(.dark) .einv-field span,
    :host-context(.dark-theme) .einv-field span,
    :host-context(.dark) .einv-selected span,
    :host-context(.dark-theme) .einv-selected span,
    :host-context(.dark) .einv-check-list span,
    :host-context(.dark-theme) .einv-check-list span,
    :host-context(.dark) .einv-detail-grid span,
    :host-context(.dark-theme) .einv-detail-grid span,
    :host-context(.dark) .einv-irn-box span,
    :host-context(.dark-theme) .einv-irn-box span,
    :host-context(.dark) .einv-qr-card span,
    :host-context(.dark-theme) .einv-qr-card span,
    :host-context(.dark) .einv-metrics span,
    :host-context(.dark-theme) .einv-metrics span,
    :host-context(.dark) .einv-table th,
    :host-context(.dark-theme) .einv-table th,
    :host-context(.dark) .einv-empty,
    :host-context(.dark-theme) .einv-empty,
    :host-context(.dark) .einv-qr-card p,
    :host-context(.dark-theme) .einv-qr-card p {
      color: #94a3b8;
    }

    :host-context(.dark) .einv-input,
    :host-context(.dark-theme) .einv-input,
    :host-context(.dark) .einv-secondary-btn,
    :host-context(.dark-theme) .einv-secondary-btn,
    :host-context(.dark) .einv-action-btn,
    :host-context(.dark-theme) .einv-action-btn {
      background: #13243a;
      border-color: #2d405e;
      color: #e2e8f0;
    }

    :host-context(.dark) .einv-input:focus,
    :host-context(.dark-theme) .einv-input:focus {
      background: #142943;
      border-color: #a78bfa;
      box-shadow: 0 0 0 3px rgba(167, 139, 250, .16);
    }

    :host-context(.dark) .einv-selected div,
    :host-context(.dark-theme) .einv-selected div,
    :host-context(.dark) .einv-check-list div,
    :host-context(.dark-theme) .einv-check-list div,
    :host-context(.dark) .einv-detail-grid div,
    :host-context(.dark-theme) .einv-detail-grid div,
    :host-context(.dark) .einv-irn-box,
    :host-context(.dark-theme) .einv-irn-box,
    :host-context(.dark) .einv-empty,
    :host-context(.dark-theme) .einv-empty {
      background: #14243c;
      border-color: #263a55;
    }

    :host-context(.dark) .einv-table th,
    :host-context(.dark-theme) .einv-table th,
    :host-context(.dark) .einv-table td,
    :host-context(.dark-theme) .einv-table td {
      border-color: #263a55;
    }

    :host-context(.dark) .einv-active-row,
    :host-context(.dark-theme) .einv-active-row {
      background: #172b47;
    }

    :host-context(.dark) .einv-table-status,
    :host-context(.dark-theme) .einv-table-status {
      background: #263a55;
      color: #cbd5e1;
    }

    :host-context(.dark) .einv-action-btn--primary,
    :host-context(.dark-theme) .einv-action-btn--primary {
      background: rgba(167, 139, 250, .16);
      border-color: rgba(167, 139, 250, .45);
      color: #c4b5fd;
    }

    :host-context(.dark) .einv-action-btn--active,
    :host-context(.dark-theme) .einv-action-btn--active {
      background: rgba(16, 185, 129, .16);
      border-color: rgba(16, 185, 129, .45);
      color: #6ee7b7;
    }

    :host-context(.dark) .einv-qr-visual,
    :host-context(.dark-theme) .einv-qr-visual {
      background: #14243c;
      border-color: #2d405e;
    }

    @media (max-width: 1200px) {
      .einv-workspace,
      .einv-result-grid { grid-template-columns: 1fr; }
      .einv-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 760px) {
      .einv-hero,
      .einv-panel-head,
      .einv-result-header {
        flex-direction: column;
        align-items: stretch;
      }
      .einv-hero-actions,
      .einv-action-row,
      .einv-result-actions { justify-content: stretch; }
      .einv-primary-btn,
      .einv-secondary-btn,
      .einv-danger-btn { width: 100%; }
      .einv-metrics,
      .einv-form-grid,
      .einv-selected,
      .einv-detail-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class EInvoiceComponent implements OnInit, OnChanges {
  private gstService = inject(GstExtendedService);
  private invoiceService = inject(InvoiceService);
  private toast = inject(HotToastService);

  @Input() isEmbedded = false;
  @Input() clientIdOverride?: string;
  @Input() initialInvoiceId?: string;

  invoiceId = '';
  readonly invoices = signal<Invoice[]>([]);
  readonly selectedInvoice = signal<Invoice | null>(null);
  readonly isLoadingInvoices = signal(false);
  readonly isGenerating = signal(false);
  readonly eInvoice = signal<EInvoiceRecord | null>(null);

  readonly readyInvoices = computed(() =>
    this.invoices().filter((invoice) => invoice.status !== 'draft' && invoice.status !== 'cancelled')
  );

  ngOnInit(): void {
    if (this.initialInvoiceId) {
      this.invoiceId = this.initialInvoiceId;
      this.lookupInvoice(false);
    }
    this.loadInvoices();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientIdOverride'] && !changes['clientIdOverride'].firstChange) {
      this.clearSelection();
      this.loadInvoices();
    }
  }

  loadInvoices(): void {
    if (!this.clientIdOverride) return;
    this.isLoadingInvoices.set(true);
    this.invoiceService.getInvoices({
      clientId: this.clientIdOverride,
      limit: 25,
      sortBy: 'invoiceDate',
      sortOrder: 'desc',
    }, { silenceErrors: true }).subscribe({
      next: (res) => {
        const invoices = res.data ?? [];
        this.invoices.set(invoices);
        if (!this.selectedInvoice() && invoices.length > 0) {
          this.selectInvoice(invoices[0], false);
        }
        this.isLoadingInvoices.set(false);
      },
      error: () => {
        this.invoices.set([]);
        this.isLoadingInvoices.set(false);
      },
    });
  }

  selectInvoiceById(invoiceId: string): void {
    const invoice = this.invoices().find((item) => item.id === invoiceId);
    if (invoice) this.selectInvoice(invoice);
  }

  selectInvoice(invoice: Invoice, showToast = true): void {
    this.selectedInvoice.set(invoice);
    this.invoiceId = invoice.id;
    this.eInvoice.set(null);
    if (showToast) this.toast.success(`${invoice.invoiceNumber} selected`);
  }

  generateForInvoice(invoice: Invoice): void {
    this.selectInvoice(invoice, false);
    this.generateIRN();
  }

  generateIRN(): void {
    const id = this.invoiceId.trim();
    if (!id) return;
    this.isGenerating.set(true);
    this.gstService.generateIRN(id).subscribe({
      next: (res) => {
        this.isGenerating.set(false);
        this.eInvoice.set(res.data as EInvoiceRecord);
        this.toast.success('IRN generated successfully');
      },
      error: (err) => {
        this.isGenerating.set(false);
        this.toast.error(err.error?.message || 'Failed to generate IRN');
      },
    });
  }

  lookupInvoice(showEmptyToast = true): void {
    const id = this.invoiceId.trim();
    if (!id) return;
    this.gstService.getEInvoiceByInvoice(id).subscribe({
      next: (res) => {
        if (res.data) {
          this.eInvoice.set(res.data as EInvoiceRecord);
          this.toast.success('E-invoice record loaded');
        } else {
          this.eInvoice.set(null);
          if (showEmptyToast) this.toast.info('No e-invoice found for this invoice');
        }
      },
      error: () => this.toast.error('Failed to lookup e-invoice'),
    });
  }

  cancelIRN(): void {
    const invoice = this.eInvoice();
    if (!invoice?.irn) return;
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    const remarks = prompt('Remarks (optional):') || '';
    this.gstService.cancelIRN(invoice.irn, reason, remarks).subscribe({
      next: (res) => {
        this.eInvoice.set(res.data as EInvoiceRecord);
        this.toast.success('IRN cancelled');
      },
      error: () => this.toast.error('Failed to cancel IRN'),
    });
  }

  copyIrn(): void {
    const irn = this.eInvoice()?.irn;
    if (!irn || typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(irn).then(() => this.toast.success('IRN copied'));
  }

  downloadRecord(): void {
    const record = this.eInvoice();
    if (!record || typeof document === 'undefined') return;
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `e-invoice-${record.irn || this.invoiceId || 'record'}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.toast.success('E-invoice record downloaded');
  }

  clearSelection(): void {
    this.invoiceId = '';
    this.selectedInvoice.set(null);
    this.eInvoice.set(null);
  }

  normalizedStatus(): string {
    return String(this.eInvoice()?.status || 'generated').toLowerCase();
  }
}
