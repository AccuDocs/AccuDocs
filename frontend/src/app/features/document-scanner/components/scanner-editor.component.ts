import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-scanner-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="editor-shell">
      <div class="editor-header">
        <div>
          <p class="eyebrow">Extracted Fields</p>
          <h2>{{ title }}</h2>
        </div>
        <div class="confidence-badge" [class]="confidenceTone">
          OCR Confidence: {{ ocrConfidence ?? 0 }}%
        </div>
      </div>

      <form [formGroup]="form" class="editor-grid">
        <label [class.low-confidence]="isLowConfidence('document_number')">
          <span>Document Number <strong *ngIf="isLowConfidence('document_number')">⚠</strong></span>
          <input type="text" formControlName="document_number" placeholder="INV-001" />
        </label>

        <label [class.low-confidence]="isLowConfidence('date')">
          <span>Date <strong *ngIf="isLowConfidence('date')">⚠</strong></span>
          <input type="date" formControlName="date" />
        </label>

        <label class="full" [class.low-confidence]="isLowConfidence('vendor_or_customer')">
          <span>Vendor / Customer <strong *ngIf="isLowConfidence('vendor_or_customer')">⚠</strong></span>
          <input type="text" formControlName="vendor_or_customer" placeholder="Acme Traders" />
        </label>

        <label [class.low-confidence]="isLowConfidence('gstin')">
          <span>GSTIN <strong *ngIf="isLowConfidence('gstin')">⚠</strong></span>
          <input type="text" formControlName="gstin" placeholder="22AAAAA0000A1Z5" (blur)="validateGstin()" />
          <small *ngIf="gstinMessage" class="field-error">{{ gstinMessage }}</small>
        </label>

        <label [class.low-confidence]="isLowConfidence('payment_mode')">
          <span>Payment Mode <strong *ngIf="isLowConfidence('payment_mode')">⚠</strong></span>
          <select formControlName="payment_mode">
            <option [ngValue]="null">Select payment mode</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Credit">Credit</option>
          </select>
        </label>

        <label [class.low-confidence]="isLowConfidence('subtotal')">
          <span>Subtotal <strong *ngIf="isLowConfidence('subtotal')">⚠</strong></span>
          <input type="number" step="0.01" formControlName="subtotal" />
        </label>

        <label [class.low-confidence]="isLowConfidence('tax_amount')">
          <span>Tax Amount <strong *ngIf="isLowConfidence('tax_amount')">⚠</strong></span>
          <input type="number" step="0.01" formControlName="tax_amount" />
        </label>

        <label [class.low-confidence]="isLowConfidence('discount')">
          <span>Discount <strong *ngIf="isLowConfidence('discount')">⚠</strong></span>
          <input type="number" step="0.01" formControlName="discount" />
        </label>

        <label [class.low-confidence]="isLowConfidence('total_amount')">
          <span>Total Amount <strong *ngIf="isLowConfidence('total_amount')">⚠</strong></span>
          <input type="number" step="0.01" formControlName="total_amount" />
        </label>

        <label class="full">
          <span>Notes</span>
          <textarea rows="4" formControlName="notes" placeholder="Optional notes for this document"></textarea>
        </label>

        <section class="full line-items">
          <div class="section-head">
            <div>
              <p class="eyebrow">Line Items</p>
              <h3>Captured Items</h3>
            </div>
            <button type="button" class="ghost-btn" (click)="addRowRequested.emit()">+ Add Row</button>
          </div>

          <div class="line-table">
            <div class="line-table-head">
              <span>Description</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span>Amount</span>
              <span></span>
            </div>

            <div
              class="line-table-row"
              *ngFor="let lineGroup of lineItems.controls; let index = index"
              [formGroup]="lineGroup"
            >
              <input type="text" formControlName="description" placeholder="Item description" />
              <input type="number" step="0.001" formControlName="quantity" />
              <input type="number" step="0.01" formControlName="unit_price" />
              <input type="number" step="0.01" formControlName="amount" readonly />
              <button type="button" class="icon-btn" (click)="removeRowRequested.emit(index)">✕</button>
            </div>

            <div class="line-empty" *ngIf="lineItems.length === 0">
              No line items detected yet. Add one if you need to capture item-level detail.
            </div>
          </div>
        </section>
      </form>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .editor-shell {
        display: grid;
        gap: 1.25rem;
      }

      .editor-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .editor-header h2,
      .section-head h3 {
        margin: 0.2rem 0 0;
        font-size: 1.1rem;
        color: #0f172a;
      }

      .eyebrow {
        margin: 0;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #64748b;
      }

      .confidence-badge {
        border-radius: 999px;
        padding: 0.7rem 1rem;
        font-size: 0.86rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .confidence-badge.green {
        background: #dcfce7;
        color: #166534;
      }

      .confidence-badge.yellow {
        background: #fef3c7;
        color: #92400e;
      }

      .confidence-badge.red {
        background: #fee2e2;
        color: #b91c1c;
      }

      .editor-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      label {
        display: grid;
        gap: 0.45rem;
      }

      label span {
        font-size: 0.84rem;
        font-weight: 700;
        color: #1e293b;
      }

      label.low-confidence {
        background: #fef3c7;
        border-radius: 1rem;
        padding: 0.85rem;
        border: 1px solid #fbbf24;
      }

      input,
      select,
      textarea {
        width: 100%;
        border-radius: 0.95rem;
        border: 1px solid #cbd5e1;
        background: white;
        padding: 0.85rem 0.95rem;
        font: inherit;
        color: #0f172a;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      input:focus,
      select:focus,
      textarea:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
      }

      textarea {
        resize: vertical;
      }

      .full {
        grid-column: 1 / -1;
      }

      .field-error {
        color: #b91c1c;
        font-size: 0.77rem;
      }

      .line-items {
        border: 1px solid #dbeafe;
        background: linear-gradient(180deg, rgba(239, 246, 255, 0.9), #ffffff);
        padding: 1rem;
        border-radius: 1.2rem;
      }

      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .ghost-btn,
      .icon-btn {
        border: none;
        border-radius: 999px;
        font: inherit;
        cursor: pointer;
      }

      .ghost-btn {
        background: #dbeafe;
        color: #1d4ed8;
        font-weight: 700;
        padding: 0.7rem 1rem;
      }

      .icon-btn {
        background: #fee2e2;
        color: #b91c1c;
        width: 2.4rem;
        height: 2.4rem;
      }

      .line-table {
        display: grid;
        gap: 0.75rem;
      }

      .line-table-head,
      .line-table-row {
        display: grid;
        grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr)) auto;
        gap: 0.75rem;
        align-items: center;
      }

      .line-table-head {
        color: #475569;
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .line-empty {
        border: 1px dashed #bfdbfe;
        color: #64748b;
        text-align: center;
        padding: 1rem;
        border-radius: 1rem;
      }

      @media (max-width: 900px) {
        .editor-grid {
          grid-template-columns: 1fr;
        }

        .line-table-head {
          display: none;
        }

        .line-table-row {
          grid-template-columns: 1fr;
          padding: 0.85rem;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          background: white;
        }
      }
    `,
  ],
})
export class ScannerEditorComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() title = 'Review & edit before saving';
  @Input() ocrConfidence: number | null = null;
  @Input() fieldConfidences: Record<string, number> = {};

  @Output() addRowRequested = new EventEmitter<void>();
  @Output() removeRowRequested = new EventEmitter<number>();

  gstinMessage = '';

  get lineItems(): FormArray<FormGroup> {
    return this.form.get('line_items') as FormArray<FormGroup>;
  }

  get confidenceTone(): 'green' | 'yellow' | 'red' {
    const score = this.ocrConfidence ?? 0;
    if (score >= 85) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  }

  isLowConfidence(field: string): boolean {
    const confidence = this.fieldConfidences[field];
    return typeof confidence === 'number' && confidence > 0 && confidence < 70;
  }

  validateGstin(): void {
    const value = (this.form.get('gstin')?.value || '').trim();
    this.gstinMessage = value && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(value)
      ? 'GSTIN format looks invalid.'
      : '';
  }
}
