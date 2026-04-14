import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { ToastService } from '@core/services/toast.service';
import { ScannerEditorComponent } from './scanner-editor.component';
import { DocumentScannerService } from '../services/document-scanner.service';
import { DocumentType, ScannerDocumentData, ScannerLineItem } from '../models/document-scanner.models';

@Component({
  selector: 'app-scanner-documents-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ScannerEditorComponent],
  template: `
    <div class="list-page">
      <header class="list-hero">
        <div>
          <p class="eyebrow">Scanned Documents</p>
          <h1>Browse, export, edit, and soft-delete saved OCR records.</h1>
        </div>
        <a routerLink="/documents/scanner" class="primary-link">Scan Another Document</a>
      </header>

      <section class="filter-card" [formGroup]="filterForm">
        <div class="filter-grid">
          <label>
            <span>Type</span>
            <select formControlName="type">
              <option value="">All</option>
              <option value="sale">Sales</option>
              <option value="purchase">Purchases</option>
              <option value="expense">Expenses</option>
            </select>
          </label>

          <label>
            <span>From</span>
            <input type="date" formControlName="from" />
          </label>

          <label>
            <span>To</span>
            <input type="date" formControlName="to" />
          </label>

          <label class="vendor-filter">
            <span>Vendor / Customer</span>
            <input type="text" formControlName="vendor" placeholder="Search by party name" />
          </label>
        </div>

        <div class="filter-actions">
          <button type="button" class="secondary-btn" (click)="applyFilters()">Apply Filters</button>
          <button type="button" class="ghost-btn" (click)="resetFilters()">Reset</button>
          <button type="button" class="ghost-btn" (click)="downloadExcel()">Export Excel</button>
          <button type="button" class="ghost-btn" (click)="downloadCsv()">Export CSV</button>
        </div>
      </section>

      <section class="table-card">
        <div class="table-head">
          <div>
            <p class="eyebrow">Registry</p>
            <h2>{{ total() }} document{{ total() === 1 ? '' : 's' }}</h2>
          </div>
          <div class="pager">
            <button type="button" class="ghost-btn" [disabled]="page() === 1" (click)="changePage(page() - 1)">← Prev</button>
            <span>Page {{ page() }} of {{ totalPages() }}</span>
            <button type="button" class="ghost-btn" [disabled]="page() >= totalPages()" (click)="changePage(page() + 1)">Next →</button>
          </div>
        </div>

        <div class="table-wrap" *ngIf="documents().length; else emptyState">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Document Number</th>
                <th>Vendor / Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>OCR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let document of documents()">
                <td>#{{ document.id }}</td>
                <td>{{ labelForType(document.doc_type) }}</td>
                <td>{{ document.document_number || '—' }}</td>
                <td>{{ document.vendor_or_customer || '—' }}</td>
                <td>{{ document.date || '—' }}</td>
                <td>{{ formatCurrency(document.total_amount) }}</td>
                <td>{{ document.ocr_confidence ?? 0 }}%</td>
                <td class="actions">
                  <button type="button" class="link-btn" (click)="openView(document.id!)">View</button>
                  <button type="button" class="link-btn" (click)="openEdit(document.id!)">Edit</button>
                  <button type="button" class="danger-btn" (click)="deleteDocument(document.id!)">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ng-template #emptyState>
          <div class="empty-state">
            No scanned documents match the current filters yet.
          </div>
        </ng-template>
      </section>
    </div>

    <div class="modal-shell" *ngIf="viewDocument() as document" (click)="closeModals()">
      <div class="modal-panel details-modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Document Details</p>
            <h2>#{{ document.id }} · {{ labelForType(document.doc_type) }}</h2>
          </div>
          <button type="button" class="ghost-btn" (click)="closeModals()">Close</button>
        </div>

        <div class="details-grid">
          <div><span>Document Number</span><strong>{{ document.document_number || '—' }}</strong></div>
          <div><span>Date</span><strong>{{ document.date || '—' }}</strong></div>
          <div><span>Vendor / Customer</span><strong>{{ document.vendor_or_customer || '—' }}</strong></div>
          <div><span>GSTIN</span><strong>{{ document.gstin || '—' }}</strong></div>
          <div><span>Total</span><strong>{{ formatCurrency(document.total_amount) }}</strong></div>
          <div><span>Payment Mode</span><strong>{{ document.payment_mode || '—' }}</strong></div>
        </div>

        <div class="line-items-view" *ngIf="document.line_items?.length">
          <p class="eyebrow">Line Items</p>
          <div class="line-view-row" *ngFor="let item of document.line_items">
            <strong>{{ item.description }}</strong>
            <span>{{ item.quantity ?? 0 }} × {{ formatCurrency(item.unit_price) }}</span>
            <span>{{ formatCurrency(item.amount) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-shell" *ngIf="isEditing()" (click)="closeModals()">
      <div class="modal-panel edit-modal" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Edit Document</p>
            <h2>Update saved scanner fields</h2>
          </div>
          <button type="button" class="ghost-btn" (click)="closeModals()">Close</button>
        </div>

        <app-scanner-editor
          [form]="editForm"
          [ocrConfidence]="editForm.get('ocr_confidence')?.value || 0"
          [fieldConfidences]="{}"
          title="Edit saved document"
          (addRowRequested)="addEditLineItem()"
          (removeRowRequested)="removeEditLineItem($event)"
        />

        <div class="filter-actions">
          <button type="button" class="secondary-btn" (click)="closeModals()">Cancel</button>
          <button type="button" class="primary-btn" [disabled]="isUpdating()" (click)="saveEdit()">
            {{ isUpdating() ? 'Saving changes...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .list-page {
        display: grid;
        gap: 1.25rem;
        padding: 1.5rem;
      }

      .list-hero,
      .filter-card,
      .table-card,
      .modal-panel {
        border: 1px solid #dbeafe;
        border-radius: 1.5rem;
        background: #ffffff;
        box-shadow: 0 18px 45px -32px rgba(15, 23, 42, 0.28);
      }

      .list-hero,
      .filter-card,
      .table-card,
      .modal-panel {
        padding: 1.5rem;
      }

      .list-hero,
      .table-head,
      .filter-actions,
      .modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }

      .eyebrow {
        margin: 0 0 0.35rem;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #64748b;
      }

      h1,
      h2 {
        margin: 0;
        color: #0f172a;
      }

      .primary-link,
      .primary-btn,
      .secondary-btn,
      .ghost-btn,
      .link-btn,
      .danger-btn {
        border: none;
        font: inherit;
        border-radius: 999px;
        cursor: pointer;
      }

      .primary-link,
      .primary-btn {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
        padding: 0.85rem 1.2rem;
        text-decoration: none;
        font-weight: 700;
      }

      .secondary-btn,
      .ghost-btn {
        background: #e2e8f0;
        color: #334155;
        padding: 0.8rem 1.1rem;
        font-weight: 700;
      }

      .ghost-btn {
        background: #eff6ff;
        color: #1d4ed8;
      }

      .link-btn {
        background: #dbeafe;
        color: #1d4ed8;
        padding: 0.55rem 0.9rem;
      }

      .danger-btn {
        background: #fee2e2;
        color: #b91c1c;
        padding: 0.55rem 0.9rem;
      }

      .filter-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 1rem;
      }

      .vendor-filter {
        grid-column: span 1;
      }

      label {
        display: grid;
        gap: 0.45rem;
      }

      label span {
        font-size: 0.82rem;
        font-weight: 700;
        color: #334155;
      }

      input,
      select {
        border: 1px solid #cbd5e1;
        border-radius: 0.95rem;
        padding: 0.85rem 0.95rem;
        font: inherit;
      }

      .table-wrap {
        overflow: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 0.95rem 0.75rem;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
      }

      th {
        color: #475569;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      .empty-state {
        border: 1px dashed #bfdbfe;
        border-radius: 1rem;
        padding: 2rem;
        text-align: center;
        color: #64748b;
      }

      .pager {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .modal-shell {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.72);
        display: grid;
        place-items: center;
        padding: 1rem;
        z-index: 70;
      }

      .modal-panel {
        width: min(100%, 72rem);
        max-height: 90vh;
        overflow: auto;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }

      .details-grid div,
      .line-view-row {
        border: 1px solid #e2e8f0;
        border-radius: 1rem;
        padding: 1rem;
      }

      .details-grid span,
      .line-items-view span {
        display: block;
        color: #64748b;
        font-size: 0.82rem;
      }

      .details-grid strong {
        color: #0f172a;
      }

      .line-items-view {
        display: grid;
        gap: 0.75rem;
        margin-top: 1rem;
      }

      .line-view-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }

      @media (max-width: 1024px) {
        .list-hero,
        .filter-actions,
        .table-head,
        .modal-head,
        .details-grid,
        .filter-grid {
          display: grid;
          grid-template-columns: 1fr;
        }

        .actions {
          justify-content: flex-start;
          flex-wrap: wrap;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScannerDocumentsListComponent {
  private fb = inject(FormBuilder);
  private scannerService = inject(DocumentScannerService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly documents = signal<ScannerDocumentData[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly isEditing = signal(false);
  readonly isUpdating = signal(false);
  readonly viewDocument = signal<ScannerDocumentData | null>(null);
  readonly editingDocumentId = signal<number | null>(null);
  readonly editingDocumentType = signal<DocumentType>('sale');
  readonly pageSize = 20;
  readonly activeType = computed(() => this.filterForm.get('type')?.value as DocumentType | '');

  readonly filterForm = this.fb.group({
    type: ['' as DocumentType | ''],
    from: [''],
    to: [''],
    vendor: [''],
  });

  readonly editForm = this.fb.group({
    document_number: [''],
    date: ['', Validators.required],
    vendor_or_customer: [''],
    gstin: [''],
    subtotal: [null as number | null],
    tax_amount: [null as number | null],
    discount: [0 as number | null],
    total_amount: [null as number | null, Validators.required],
    currency: ['INR'],
    payment_mode: [null as ScannerDocumentData['payment_mode']],
    notes: [''],
    email: [''],
    phone: [''],
    raw_ocr_text: [''],
    ocr_confidence: [0 as number | null],
    line_items: this.fb.array<FormGroup>([]),
  });

  constructor() {
    this.loadDocuments();

    merge(
      this.editForm.get('subtotal')!.valueChanges,
      this.editForm.get('tax_amount')!.valueChanges,
      this.editForm.get('discount')!.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateEditTotal());
  }

  get editLineItems(): FormArray<FormGroup> {
    return this.editForm.get('line_items') as FormArray<FormGroup>;
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadDocuments();
  }

  resetFilters(): void {
    this.filterForm.reset({
      type: '',
      from: '',
      to: '',
      vendor: '',
    });
    this.applyFilters();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.page.set(page);
    this.loadDocuments();
  }

  openView(documentId: number): void {
    this.scannerService.getDocument(documentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.viewDocument.set(response.data),
        error: (error) => this.toast.error('Unable to load document', error.message),
      });
  }

  openEdit(documentId: number): void {
    this.scannerService.getDocument(documentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.populateEditForm(response.data);
          this.editingDocumentId.set(documentId);
          this.isEditing.set(true);
        },
        error: (error) => this.toast.error('Unable to load document for editing', error.message),
      });
  }

  saveEdit(): void {
    const documentId = this.editingDocumentId();
    if (!documentId) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toast.error('Missing required fields', 'Date and Total Amount are required.');
      return;
    }

    this.isUpdating.set(true);
    this.scannerService.updateDocument(documentId, this.buildEditPayload())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isUpdating.set(false);
          this.toast.success('Document updated');
          this.closeModals();
          this.loadDocuments();
        },
        error: (error) => {
          this.isUpdating.set(false);
          this.toast.error('Update failed', error.message);
        },
      });
  }

  deleteDocument(documentId: number): void {
    this.scannerService.deleteDocument(documentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Document deleted');
          this.loadDocuments();
        },
        error: (error) => this.toast.error('Delete failed', error.message),
      });
  }

  addEditLineItem(item?: Partial<ScannerLineItem>): void {
    const group = this.fb.group({
      description: [item?.description || ''],
      quantity: [item?.quantity ?? null],
      unit_price: [item?.unit_price ?? null],
      amount: [item?.amount ?? null],
    });

    merge(group.get('quantity')!.valueChanges, group.get('unit_price')!.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const quantity = Number(group.get('quantity')!.value || 0);
        const unitPrice = Number(group.get('unit_price')!.value || 0);
        const amount = quantity && unitPrice ? Number((quantity * unitPrice).toFixed(2)) : 0;
        group.get('amount')!.setValue(amount || null, { emitEvent: false });
      });

    this.editLineItems.push(group);
  }

  removeEditLineItem(index: number): void {
    this.editLineItems.removeAt(index);
  }

  closeModals(): void {
    this.viewDocument.set(null);
    this.isEditing.set(false);
    this.isUpdating.set(false);
    this.editingDocumentId.set(null);
    this.editingDocumentType.set('sale');
  }

  labelForType(type: DocumentType): string {
    switch (type) {
      case 'sale':
        return 'Sale Receipt';
      case 'purchase':
        return 'Purchase Order';
      case 'expense':
        return 'Expense Bill';
      default:
        return type;
    }
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return 'INR 0.00';
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  }

  downloadExcel(): void {
    this.scannerService.exportExcel(this.currentFilters())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => this.saveBlob(blob, 'scanned-documents.xlsx'),
        error: (error) => this.toast.error('Excel export failed', error.message),
      });
  }

  downloadCsv(): void {
    this.scannerService.exportCsv(this.currentFilters())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => this.saveBlob(blob, 'scanned-documents.csv'),
        error: (error) => this.toast.error('CSV export failed', error.message),
      });
  }

  private loadDocuments(): void {
    this.scannerService.getDocuments({
      ...this.currentFilters(),
      page: this.page(),
      limit: this.pageSize,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.documents.set(response.data || []);
          this.total.set(response.total || 0);
          this.totalPages.set(response.total_pages || 1);
        },
        error: (error) => this.toast.error('Unable to load documents', error.message),
      });
  }

  private currentFilters() {
    const raw = this.filterForm.getRawValue();
    return {
      type: (raw.type || '') as DocumentType | '',
      from: raw.from || '',
      to: raw.to || '',
      vendor: raw.vendor || '',
    };
  }

  private populateEditForm(document: ScannerDocumentData): void {
    this.editForm.patchValue({
      document_number: document.document_number || '',
      date: document.date || '',
      vendor_or_customer: document.vendor_or_customer || '',
      gstin: document.gstin || '',
      subtotal: document.subtotal,
      tax_amount: document.tax_amount,
      discount: document.discount ?? 0,
      total_amount: document.total_amount,
      currency: document.currency || 'INR',
      payment_mode: document.payment_mode || null,
      notes: document.notes || '',
      email: document.email || '',
      phone: document.phone || '',
      raw_ocr_text: document.raw_ocr_text || '',
      ocr_confidence: document.ocr_confidence || 0,
    }, { emitEvent: false });

    this.editingDocumentType.set(document.doc_type);
    this.editLineItems.clear();
    (document.line_items || []).forEach((item) => this.addEditLineItem(item));
    this.recalculateEditTotal();
  }

  private buildEditPayload(): Partial<ScannerDocumentData> {
    const raw = this.editForm.getRawValue();
    return {
      doc_type: this.editingDocumentType(),
      document_number: raw.document_number || null,
      date: raw.date || null,
      vendor_or_customer: raw.vendor_or_customer || null,
      gstin: raw.gstin || null,
      subtotal: raw.subtotal,
      tax_amount: raw.tax_amount,
      discount: raw.discount,
      total_amount: raw.total_amount,
      currency: raw.currency || 'INR',
      payment_mode: raw.payment_mode || null,
      notes: raw.notes || null,
      email: raw.email || null,
      phone: raw.phone || null,
      raw_ocr_text: raw.raw_ocr_text || null,
      ocr_confidence: raw.ocr_confidence,
      line_items: this.sanitizedLineItems(this.editLineItems.getRawValue()),
    };
  }

  private recalculateEditTotal(): void {
    const subtotal = Number(this.editForm.get('subtotal')!.value || 0);
    const tax = Number(this.editForm.get('tax_amount')!.value || 0);
    const discount = Number(this.editForm.get('discount')!.value || 0);
    const total = Number((subtotal + tax - discount).toFixed(2));
    this.editForm.get('total_amount')!.setValue(total || null, { emitEvent: false });
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private sanitizedLineItems(rows: Array<Record<string, unknown>>): ScannerLineItem[] {
    return rows
      .map((row) => ({
        description: String(row['description'] || '').trim(),
        quantity: row['quantity'] === null || row['quantity'] === '' ? null : Number(row['quantity']),
        unit_price: row['unit_price'] === null || row['unit_price'] === '' ? null : Number(row['unit_price']),
        amount: row['amount'] === null || row['amount'] === '' ? null : Number(row['amount']),
      }))
      .filter((row) => row.description || row.amount !== null);
  }
}
