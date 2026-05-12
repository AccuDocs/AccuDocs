import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroEyeSolid,
  heroFolderOpenSolid,
  heroPencilSquareSolid,
  heroTrashSolid,
} from '@ng-icons/heroicons/solid';
import { ToastService } from '@core/services/toast.service';
import { ScannerEditorComponent } from './scanner-editor.component';
import { DocumentScannerService } from '../services/document-scanner.service';
import { DocumentType, ScannerDocumentData, ScannerLineItem } from '../models/document-scanner.models';

@Component({
  selector: 'app-scanner-documents-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgIconComponent, ScannerEditorComponent],
  providers: [
    provideIcons({
      heroEyeSolid,
      heroFolderOpenSolid,
      heroPencilSquareSolid,
      heroTrashSolid,
    }),
  ],
  template: `
    <div class="list-page">
      <header class="list-hero">
        <div class="hero-copy-wrap">
          <p class="eyebrow hero-eyebrow">
            <ng-icon name="heroFolderOpenSolid" size="14"></ng-icon>
            Scanned Documents
          </p>
          <h1>Browse, export, edit, and soft-delete saved OCR records.</h1>
        </div>
        <a routerLink="/documents" class="primary-link">
          <ng-icon name="heroFolderOpenSolid" size="16"></ng-icon>
          Back to Documents
        </a>
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
          <div class="filter-action-group">
            <button type="button" class="primary-btn" (click)="applyFilters()">Apply Filters</button>
            <button type="button" class="ghost-btn" (click)="resetFilters()">Reset</button>
          </div>
          <div class="filter-action-group export-actions">
            <button type="button" class="export-btn excel-btn" (click)="downloadExcel()">Export Excel</button>
            <button type="button" class="export-btn csv-btn" (click)="downloadCsv()">Export CSV</button>
          </div>
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
                  <div class="action-group">
                    <button type="button" class="action-btn view-btn" title="View document" (click)="openView(document.id!)">
                      <ng-icon name="heroEyeSolid" size="16"></ng-icon>
                      <span>View</span>
                    </button>
                    <button type="button" class="action-btn edit-btn" title="Edit document" (click)="openEdit(document.id!)">
                      <ng-icon name="heroPencilSquareSolid" size="16"></ng-icon>
                      <span>Edit</span>
                    </button>
                    <button type="button" class="action-btn delete-btn" title="Delete document" (click)="deleteDocument(document.id!)">
                      <ng-icon name="heroTrashSolid" size="16"></ng-icon>
                      <span>Delete</span>
                    </button>
                  </div>
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

        <div class="form-actions">
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
        min-width: 0;
      }

      .list-page {
        display: grid;
        gap: 1.5rem;
        width: 100%;
        min-height: 100%;
        min-width: 0;
        padding: 1rem 1.5rem 2rem;
        animation: pageIn 420ms cubic-bezier(0, 0, 0.2, 1);
      }

      .filter-card,
      .table-card,
      .modal-panel {
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        background: #ffffff;
        box-shadow: 0 4px 24px -4px rgba(15, 23, 42, 0.05);
      }

      .list-hero,
      .filter-card,
      .modal-panel {
        padding: 1.5rem;
      }

      .list-hero,
      .table-head,
      .modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1.5rem;
      }

      .list-hero {
        position: relative;
        min-height: 8.5rem;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        border-radius: 28px;
        background: #ffffff;
        box-shadow: 0 4px 24px -4px rgba(15, 23, 42, 0.05);
      }

      .list-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 34%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98), rgba(239, 246, 255, 0.72));
        pointer-events: none;
      }

      .list-hero > * {
        position: relative;
      }

      .hero-copy-wrap {
        max-width: 56rem;
      }

      .eyebrow {
        margin: 0 0 0.35rem;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--text-secondary, #64748b);
      }

      .hero-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        margin-bottom: 0.75rem;
        border-radius: 999px;
        background: #eff6ff;
        padding: 0.35rem 0.75rem;
        color: #1d4ed8;
        letter-spacing: 0.2em;
      }

      h1,
      h2 {
        margin: 0;
        color: var(--text-primary, #0f172a);
      }

      h1 {
        font-size: clamp(2rem, 3vw, 2.7rem);
        font-weight: 900;
        letter-spacing: 0;
        line-height: 1.05;
      }

      h2 {
        font-size: 1.125rem;
        font-weight: 800;
        letter-spacing: 0;
        line-height: 1.2;
      }

      .primary-link,
      .primary-btn,
      .secondary-btn,
      .ghost-btn,
      .export-btn,
      .action-btn {
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        font: inherit;
        line-height: 1;
        white-space: nowrap;
        border-radius: 16px;
        cursor: pointer;
        transition:
          background-color 160ms ease,
          border-color 160ms ease,
          box-shadow 160ms ease,
          color 160ms ease,
          transform 160ms ease;
      }

      .primary-link:focus-visible,
      .primary-btn:focus-visible,
      .secondary-btn:focus-visible,
      .ghost-btn:focus-visible,
      .export-btn:focus-visible,
      .action-btn:focus-visible,
      input:focus-visible,
      select:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px var(--ring-color, rgba(79, 70, 229, 0.18));
      }

      .primary-link:hover,
      .primary-btn:hover,
      .secondary-btn:hover,
      .ghost-btn:hover,
      .export-btn:hover,
      .action-btn:hover {
        transform: translateY(-1px);
      }

      button:disabled,
      button:disabled:hover {
        cursor: not-allowed;
        opacity: 0.55;
        transform: none;
      }

      .primary-link,
      .primary-btn {
        min-height: 2.75rem;
        background: #0074c9;
        color: white;
        padding: 0.8rem 1.25rem;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 900;
        box-shadow: 0 4px 16px -4px rgba(0, 116, 201, 0.3);
      }

      .primary-link:hover,
      .primary-btn:hover {
        background: #005fa3;
        color: white;
      }

      .secondary-btn,
      .ghost-btn {
        min-height: 2.5rem;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        color: #475569;
        padding: 0.7rem 1rem;
        font-size: 0.875rem;
        font-weight: 800;
      }

      .ghost-btn {
        background: #f8fafc;
        color: #475569;
      }

      .secondary-btn:hover,
      .ghost-btn:hover {
        border-color: #cbd5e1;
        background: #f1f5f9;
        color: #0f172a;
      }

      .export-btn {
        min-height: 2.5rem;
        border: 1px solid transparent;
        padding: 0.7rem 1rem;
        font-size: 0.78rem;
        font-weight: 900;
      }

      .excel-btn {
        border-color: #bbf7d0;
        background: #f0fdf4;
        color: #15803d;
      }

      .excel-btn:hover {
        background: #dcfce7;
      }

      .csv-btn {
        border-color: #bfdbfe;
        background: #eff6ff;
        color: #1d4ed8;
      }

      .csv-btn:hover {
        background: #dbeafe;
      }

      .filter-card {
        display: grid;
        gap: 1.25rem;
        padding: 1.5rem;
      }

      .filter-grid {
        display: grid;
        grid-template-columns: minmax(10rem, 1fr) minmax(11rem, 1fr) minmax(11rem, 1fr) minmax(16rem, 1.25fr);
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
        font-size: 0.78rem;
        font-weight: 900;
        color: #334155;
      }

      input,
      select {
        width: 100%;
        min-width: 0;
        height: 3rem;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: #f8fafc;
        color: #0f172a;
        padding: 0.75rem 0.95rem;
        font: inherit;
        font-size: 0.9rem;
        font-weight: 500;
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease,
          background-color 160ms ease;
      }

      input::placeholder {
        color: #94a3b8;
      }

      input:focus,
      select:focus {
        border-color: #0074c9;
        background: #ffffff;
        outline: none;
      }

      .filter-actions,
      .form-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .filter-actions {
        justify-content: space-between;
      }

      .filter-action-group {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .export-actions {
        margin-left: auto;
      }

      .form-actions {
        justify-content: flex-end;
        margin-top: 1rem;
      }

      .table-card {
        overflow: hidden;
        border-radius: 24px;
      }

      .table-head {
        align-items: center;
        border-bottom: 1px solid #f1f5f9;
        padding: 1.25rem 2rem;
      }

      .table-wrap {
        overflow-x: auto;
        overflow-y: hidden;
      }

      table {
        width: 100%;
        min-width: 74rem;
        table-layout: fixed;
        border-collapse: separate;
        border-spacing: 0;
      }

      th,
      td {
        padding: 0.9rem 1.25rem;
        border-bottom: 1px solid #f1f5f9;
        color: #0f172a;
        text-align: left;
        vertical-align: middle;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      th {
        color: #64748b;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0;
        background: #f8fafc;
      }

      td {
        font-size: 0.9rem;
        font-weight: 500;
      }

      tbody tr {
        transition: background-color 160ms ease;
      }

      tbody tr:hover {
        background: #f8fafc;
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      th:nth-child(1),
      td:nth-child(1) {
        width: 4rem;
      }

      th:nth-child(2),
      td:nth-child(2) {
        width: 10.5rem;
      }

      th:nth-child(3),
      td:nth-child(3) {
        width: 16rem;
      }

      th:nth-child(5),
      td:nth-child(5) {
        width: 10rem;
      }

      th:nth-child(6),
      td:nth-child(6) {
        width: 8rem;
      }

      th:nth-child(7),
      td:nth-child(7) {
        width: 6rem;
      }

      th:nth-child(8),
      td:nth-child(8) {
        width: 18rem;
        text-align: right;
      }

      .actions {
        overflow: visible;
      }

      .action-group {
        display: inline-flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      .action-btn {
        min-height: 2.5rem;
        border: 1px solid transparent;
        border-radius: 999px;
        padding: 0.6rem 0.85rem;
        font-size: 0.82rem;
        font-weight: 800;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }

      .view-btn {
        border-color: #bfdbfe;
        background: #eff6ff;
        color: #1d4ed8;
      }

      .view-btn:hover {
        background: #dbeafe;
      }

      .edit-btn {
        border-color: #fde68a;
        background: #fffbeb;
        color: #b45309;
      }

      .edit-btn:hover {
        background: #fef3c7;
      }

      .delete-btn {
        border-color: #fecdd3;
        background: #fff1f2;
        color: #be123c;
      }

      .delete-btn:hover {
        background: #ffe4e6;
      }

      .empty-state {
        margin: 0 1.5rem 1.5rem;
        border: 1px dashed #bfdbfe;
        border-radius: 22px;
        padding: 2rem;
        text-align: center;
        color: #64748b;
      }

      .pager {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #0f172a;
        white-space: nowrap;
      }

      .pager span {
        color: #334155;
        font-size: 0.875rem;
        font-weight: 700;
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
        border-radius: 24px;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }

      .details-grid div,
      .line-view-row {
        border: 1px solid #e2e8f0;
        border-radius: 18px;
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

      :host-context(.dark) .secondary-btn {
        background: #334155;
        color: #e2e8f0;
      }

      :host-context(.dark) .secondary-btn:hover {
        background: #475569;
      }

      :host-context(.dark) .ghost-btn,
      :host-context(.dark) .view-btn {
        border-color: rgba(99, 102, 241, 0.35);
        background: rgba(99, 102, 241, 0.16);
        color: #c7d2fe;
      }

      :host-context(.dark) tbody tr:hover {
        background: rgba(148, 163, 184, 0.06);
      }

      @keyframes pageIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 1024px) {
        .filter-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 768px) {
        .list-page {
          gap: 1rem;
          padding: 1rem;
        }

        .list-hero,
        .table-head,
        .modal-head,
        .details-grid,
        .filter-grid {
          display: grid;
          grid-template-columns: 1fr;
        }

        .list-hero {
          min-height: 0;
        }

        h1 {
          font-size: 1.5rem;
        }

        .primary-link,
        .filter-action-group,
        .filter-action-group button {
          width: 100%;
        }

        .export-actions {
          margin-left: 0;
        }

        .table-head {
          align-items: start;
          padding: 1.25rem;
        }

        .pager {
          flex-wrap: wrap;
        }

        .line-view-row {
          display: grid;
          grid-template-columns: 1fr;
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
