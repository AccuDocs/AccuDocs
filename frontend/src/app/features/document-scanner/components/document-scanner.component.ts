import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, merge } from 'rxjs';
import { ToastService } from '@core/services/toast.service';
import { ScannerEditorComponent } from './scanner-editor.component';
import { DocumentScannerService } from '../services/document-scanner.service';
import {
  ClientScannerSaveResponse,
  DocumentType,
  PreviewResponse,
  SaveResponse,
  ScannerDocumentData,
  ScannerLineItem,
} from '../models/document-scanner.models';

@Component({
  selector: 'app-document-scanner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ScannerEditorComponent],
  template: `
    <div class="scanner-page" [class.embedded]="embedded">
      <header class="scanner-hero">
        <div>
          <p class="eyebrow">{{ embedded ? 'Scan & Upload Document' : 'Document Scanner' }}</p>
          <h1>
            {{
              embedded
                ? 'Capture sales, purchases, and expenses directly inside this client workspace.'
                : 'Capture receipts, purchase orders, and expense bills in one flow.'
            }}
          </h1>
          <p class="lead">
            {{
              embedded
                ? 'Upload an image, review the OCR extraction, and save it straight into this client record.'
                : 'Choose a document type, upload an image, review the OCR extraction, and save it into the document register.'
            }}
          </p>
        </div>
        <a *ngIf="!embedded" routerLink="/documents/scanner/all" class="hero-link">View All Documents</a>
      </header>

      <div class="step-tracker">
        <div class="step-pill" *ngFor="let trackerStep of trackerSteps" [class.active]="step() >= trackerStep.step">
          {{ trackerStep.label }}
        </div>
      </div>

      <section *ngIf="!embedded && step() === 1" class="step-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Step 1</p>
            <h2>Select the document type</h2>
          </div>
        </div>

        <div class="type-grid">
          <button
            type="button"
            class="type-card"
            *ngFor="let option of typeOptions"
            [class.active]="selectedType() === option.value"
            (click)="selectType(option.value)"
          >
            <span class="type-icon">{{ option.icon }}</span>
            <span class="type-title">{{ option.title }}</span>
            <span class="type-copy">{{ option.description }}</span>
          </button>
        </div>

        <div class="footer-actions">
          <button type="button" class="secondary-btn" disabled>Choose a type to continue</button>
          <button
            type="button"
            class="primary-btn"
            [disabled]="!selectedType()"
            (click)="goToUploadStep()"
          >
            Next →
          </button>
        </div>
      </section>

      <section *ngIf="step() === 2" class="step-card upload-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Step {{ embedded ? '1' : '2' }}</p>
            <h2>Upload an image for OCR extraction</h2>
          </div>
          <button *ngIf="!embedded" type="button" class="ghost-link" (click)="step.set(1)">← Change type</button>
        </div>

        <div class="upload-layout">
          <div
            class="drop-zone"
            [class.disabled]="isPreviewLoading()"
            [class.dragging]="isDragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="isDragging.set(false)"
            (drop)="onDrop($event)"
            (click)="!isPreviewLoading() && fileInput.click()"
          >
            <input
              #fileInput
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff"
              class="hidden"
              (change)="onFileSelected($event)"
            />
            <div class="drop-icon">⬆</div>
            <h3>Drag & drop a document image</h3>
            <p>Accepted: JPG, JPEG, PNG, WEBP, BMP, TIFF. Maximum file size: 10MB.</p>
            <span class="upload-meta" *ngIf="selectedType()">
              Current type: {{ labelForType(selectedType()!) }}
            </span>
          </div>

          <div class="upload-preview">
            <ng-container *ngIf="previewThumbnail(); else emptyPreview">
              <img [src]="previewThumbnail()!" alt="Uploaded preview" />
              <div class="file-meta">
                <strong>{{ selectedFileName() }}</strong>
                <span>{{ selectedFileSize() }}</span>
              </div>
            </ng-container>
            <ng-template #emptyPreview>
              <div class="empty-preview">Your uploaded image preview will appear here.</div>
            </ng-template>
          </div>
        </div>

        <div class="status-strip" *ngIf="isPreviewLoading() || progressText() || uploadError()">
          <div class="spinner" *ngIf="isPreviewLoading()"></div>
          <span *ngIf="isPreviewLoading()">{{ progressText() }}</span>
          <span class="error-text" *ngIf="uploadError()">{{ uploadError() }}</span>
        </div>
      </section>

      <section *ngIf="step() === 3" class="step-card review-card">
        <div class="review-layout">
          <div class="image-panel">
            <div class="image-wrap" (click)="isImageModalOpen.set(true)">
              <img [src]="imageBase64() || ''" alt="Uploaded document" />
              <button type="button" class="zoom-btn">Click to zoom</button>
            </div>
            <div class="warning-stack" *ngIf="warnings().length > 0">
              <div class="warning-chip" *ngFor="let warning of warnings()">{{ warning }}</div>
            </div>
          </div>

          <div class="editor-panel">
            <app-scanner-editor
              [form]="documentForm"
              [ocrConfidence]="ocrConfidence()"
              [fieldConfidences]="fieldConfidences()"
              title="Preview + Edit"
              (addRowRequested)="addLineItemRow()"
              (removeRowRequested)="removeLineItemRow($event)"
            />
          </div>
        </div>

        <div class="footer-actions">
          <button type="button" class="secondary-btn" (click)="reupload()">← Re-upload</button>
          <button type="button" class="primary-btn" [disabled]="isSaving()" (click)="confirmAndSave()">
            <span *ngIf="!isSaving()">✓ Confirm & Save</span>
            <span *ngIf="isSaving()">Saving document...</span>
          </button>
        </div>
      </section>

      <section *ngIf="step() === 4" class="step-card success-card">
        <div class="success-mark">
          <div class="check-circle">
            <span>✓</span>
          </div>
        </div>
        <p class="eyebrow">Step {{ embedded ? '3' : '4' }}</p>
        <h2>Document saved successfully</h2>
        <p class="success-copy">{{ successMessage() }}</p>

        <div class="summary-card" *ngIf="savedSummary() as summary">
          <div><span>Type</span><strong>{{ labelForType(summary.doc_type) }}</strong></div>
          <div><span>Vendor / Customer</span><strong>{{ summary.vendor_or_customer || 'Not provided' }}</strong></div>
          <div><span>Total</span><strong>{{ formatCurrency(summary.total_amount) }}</strong></div>
          <div><span>Date</span><strong>{{ summary.date || 'Not set' }}</strong></div>
        </div>

        <div class="footer-actions centered">
          <button type="button" class="secondary-btn" (click)="scanAnother()">Scan Another Document</button>
          <button *ngIf="!embedded" type="button" class="primary-btn" (click)="viewAllDocuments()">View All Documents</button>
        </div>
      </section>
    </div>

    <div class="image-modal" *ngIf="isImageModalOpen()" (click)="isImageModalOpen.set(false)">
      <img [src]="imageBase64() || ''" alt="Document zoom preview" (click)="$event.stopPropagation()" />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .scanner-page {
        display: grid;
        gap: 1.25rem;
        padding: 1.5rem;
      }

      .scanner-page.embedded {
        padding: 0;
      }

      .scanner-hero,
      .step-card {
        border: 1px solid #dbeafe;
        border-radius: 1.6rem;
        background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), #ffffff);
        box-shadow: 0 18px 45px -32px rgba(15, 23, 42, 0.35);
      }

      .scanner-hero {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1.5rem;
        padding: 1.75rem;
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

      .lead,
      .success-copy {
        margin: 0.75rem 0 0;
        max-width: 55rem;
        color: #475569;
        line-height: 1.6;
      }

      .hero-link,
      .ghost-link {
        border: none;
        background: transparent;
        color: #1d4ed8;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
      }

      .step-tracker {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .step-pill {
        border-radius: 999px;
        background: #e2e8f0;
        color: #475569;
        padding: 0.7rem 1rem;
        font-weight: 700;
      }

      .step-pill.active {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .step-card {
        padding: 1.5rem;
      }

      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }

      .type-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }

      .type-card {
        display: grid;
        gap: 0.65rem;
        align-content: start;
        padding: 1.5rem;
        border-radius: 1.35rem;
        border: 2px solid #dbeafe;
        background: #ffffff;
        text-align: left;
        cursor: pointer;
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }

      .type-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 30px -20px rgba(29, 78, 216, 0.45);
      }

      .type-card.active {
        border-color: #2563eb;
        background: #eff6ff;
        box-shadow: 0 20px 40px -24px rgba(37, 99, 235, 0.35);
      }

      .type-icon {
        font-size: 2rem;
      }

      .type-title {
        font-size: 1.15rem;
        font-weight: 800;
        color: #0f172a;
      }

      .type-copy {
        color: #475569;
        line-height: 1.5;
      }

      .footer-actions {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 1.5rem;
      }

      .footer-actions.centered {
        justify-content: center;
      }

      .primary-btn,
      .secondary-btn {
        border: none;
        border-radius: 999px;
        font: inherit;
        font-weight: 700;
        padding: 0.9rem 1.3rem;
        cursor: pointer;
        transition: transform 0.2s ease, opacity 0.2s ease;
      }

      .primary-btn {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
      }

      .primary-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .secondary-btn {
        background: #e2e8f0;
        color: #334155;
      }

      .upload-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
        gap: 1rem;
      }

      .drop-zone,
      .upload-preview,
      .summary-card,
      .image-wrap {
        border-radius: 1.35rem;
        border: 1px dashed #93c5fd;
        background: #f8fbff;
      }

      .drop-zone {
        display: grid;
        gap: 0.75rem;
        justify-items: center;
        text-align: center;
        padding: 2.2rem;
        cursor: pointer;
      }

      .drop-zone.dragging {
        background: #dbeafe;
        border-color: #2563eb;
      }

      .drop-zone.disabled {
        opacity: 0.55;
        pointer-events: none;
      }

      .drop-icon {
        width: 4rem;
        height: 4rem;
        border-radius: 1.2rem;
        display: grid;
        place-items: center;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 1.6rem;
      }

      .upload-preview {
        min-height: 18rem;
        padding: 1rem;
        display: grid;
        align-content: start;
        gap: 0.85rem;
      }

      .upload-preview img,
      .image-wrap img {
        width: 100%;
        object-fit: contain;
        border-radius: 1rem;
        background: white;
      }

      .file-meta {
        display: grid;
        gap: 0.2rem;
        color: #475569;
      }

      .empty-preview {
        display: grid;
        place-items: center;
        min-height: 100%;
        color: #64748b;
        text-align: center;
        padding: 1rem;
      }

      .status-strip {
        margin-top: 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        border-radius: 999px;
        background: #eff6ff;
        padding: 0.85rem 1rem;
        color: #1d4ed8;
        font-weight: 700;
      }

      .spinner {
        width: 1rem;
        height: 1rem;
        border-radius: 999px;
        border: 2px solid rgba(37, 99, 235, 0.18);
        border-top-color: #2563eb;
        animation: spin 0.9s linear infinite;
      }

      .error-text {
        color: #b91c1c;
      }

      .review-layout {
        display: grid;
        grid-template-columns: minmax(20rem, 0.95fr) minmax(24rem, 1.05fr);
        gap: 1rem;
      }

      .image-panel {
        display: grid;
        gap: 1rem;
      }

      .image-wrap {
        position: sticky;
        top: 1rem;
        padding: 1rem;
        cursor: zoom-in;
      }

      .zoom-btn {
        margin-top: 0.85rem;
        border: none;
        background: #dbeafe;
        color: #1d4ed8;
        border-radius: 999px;
        padding: 0.7rem 1rem;
        font-weight: 700;
      }

      .warning-stack {
        display: grid;
        gap: 0.6rem;
      }

      .warning-chip {
        border-radius: 999px;
        background: #fef3c7;
        color: #92400e;
        padding: 0.7rem 1rem;
        font-weight: 700;
      }

      .success-card {
        text-align: center;
        justify-items: center;
      }

      .success-mark {
        display: flex;
        justify-content: center;
        margin-bottom: 0.5rem;
      }

      .check-circle {
        width: 6rem;
        height: 6rem;
        display: grid;
        place-items: center;
        border-radius: 999px;
        background: radial-gradient(circle at top, #86efac, #16a34a);
        color: white;
        font-size: 2.2rem;
        font-weight: 800;
        box-shadow: 0 18px 40px -24px rgba(22, 163, 74, 0.7);
        animation: pulse-in 0.5s ease;
      }

      .summary-card {
        width: min(100%, 40rem);
        margin-top: 1.25rem;
        padding: 1rem;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        border-style: solid;
      }

      .summary-card div {
        display: grid;
        gap: 0.3rem;
        text-align: left;
      }

      .summary-card span {
        color: #64748b;
        font-size: 0.82rem;
      }

      .summary-card strong {
        color: #0f172a;
      }

      .image-modal {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.88);
        display: grid;
        place-items: center;
        padding: 1.5rem;
        z-index: 70;
      }

      .image-modal img {
        max-width: min(100%, 72rem);
        max-height: 90vh;
        border-radius: 1rem;
        background: white;
      }

      .hidden {
        display: none;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes pulse-in {
        from {
          transform: scale(0.7);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }

      @media (max-width: 1024px) {
        .scanner-hero,
        .section-head,
        .footer-actions,
        .review-layout,
        .upload-layout {
          grid-template-columns: 1fr;
          display: grid;
        }

        .type-grid,
        .summary-card {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentScannerComponent {
  @Input() clientId: string | null = null;
  @Input() embedded = false;
  @Input() presetType: DocumentType | null = null;

  private fb = inject(FormBuilder);
  private scannerService = inject(DocumentScannerService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly step = signal<1 | 2 | 3 | 4>(1);
  readonly selectedType = signal<DocumentType | null>(sessionStorage.getItem('scanner-doc-type') as DocumentType | null);
  readonly isDragging = signal(false);
  readonly isPreviewLoading = signal(false);
  readonly isSaving = signal(false);
  readonly progressText = signal('');
  readonly uploadError = signal('');
  readonly previewThumbnail = signal<string | null>(null);
  readonly imageBase64 = signal<string | null>(null);
  readonly fieldConfidences = signal<Record<string, number>>({});
  readonly ocrConfidence = signal<number>(0);
  readonly warnings = signal<string[]>([]);
  readonly savedDocument = signal<SaveResponse['data'] | null>(null);
  readonly savedDocumentId = signal<number | null>(null);
  readonly savedClientRecordId = signal<string | null>(null);
  readonly savedClientRecordType = signal<DocumentType | null>(null);
  readonly isImageModalOpen = signal(false);

  private selectedFile: File | null = null;
  private progressTimers: ReturnType<typeof setTimeout>[] = [];

  readonly savedSummary = computed(() => this.savedDocument());
  readonly typeOptions = [
    { value: 'sale' as const, icon: '🧾', title: 'Sale Receipt', description: 'Capture retail invoices, cash memos, and sale receipts.' },
    { value: 'purchase' as const, icon: '📦', title: 'Purchase Order', description: 'Scan supplier purchase orders and procurement documents.' },
    { value: 'expense' as const, icon: '💸', title: 'Expense Bill', description: 'Extract utility bills, reimbursements, and expense slips.' },
  ];

  readonly documentForm = this.fb.group({
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
    merge(
      this.documentForm.get('subtotal')!.valueChanges,
      this.documentForm.get('tax_amount')!.valueChanges,
      this.documentForm.get('discount')!.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalculateTotal());
  }

  ngOnInit(): void {
    if (this.embedded && this.presetType) {
      this.applyPresetType(this.presetType);
      return;
    }

    if (this.selectedType()) {
      this.step.set(2);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.embedded) {
      return;
    }

    if (changes['presetType'] && this.presetType) {
      this.applyPresetType(this.presetType, !changes['presetType'].firstChange);
      return;
    }

    if (changes['embedded'] && this.embedded && this.presetType) {
      this.applyPresetType(this.presetType);
    }
  }

  get lineItems(): FormArray<FormGroup> {
    return this.documentForm.get('line_items') as FormArray<FormGroup>;
  }

  get trackerSteps(): Array<{ label: string; step: 1 | 2 | 3 | 4 }> {
    return this.embedded
      ? [
          { label: '1. Upload', step: 2 },
          { label: '2. Review', step: 3 },
          { label: '3. Saved', step: 4 },
        ]
      : [
          { label: '1. Type', step: 1 },
          { label: '2. Upload', step: 2 },
          { label: '3. Review', step: 3 },
          { label: '4. Saved', step: 4 },
        ];
  }

  selectType(docType: DocumentType): void {
    this.selectedType.set(docType);
    if (!this.embedded) {
      sessionStorage.setItem('scanner-doc-type', docType);
    }
  }

  goToUploadStep(): void {
    if (!this.selectedType()) {
      return;
    }

    this.step.set(2);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.isPreviewLoading()) {
      this.isDragging.set(true);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  addLineItemRow(item?: Partial<ScannerLineItem>): void {
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

    this.lineItems.push(group);
  }

  removeLineItemRow(index: number): void {
    this.lineItems.removeAt(index);
  }

  reupload(): void {
    this.clearFileState();
    this.step.set(2);
  }

  confirmAndSave(): void {
    if (!this.selectedType() || !this.selectedFile) {
      this.toast.error('No document selected', 'Upload a document before saving.');
      return;
    }

    if (this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();
      this.toast.error('Missing required fields', 'Date and Total Amount are required before saving.');
      return;
    }

    const payload = this.buildPayload();
    this.isSaving.set(true);

    const saveRequest: Observable<SaveResponse | ClientScannerSaveResponse> = this.clientId
      ? this.scannerService.saveDocumentForClient(this.clientId, this.selectedFile, payload)
      : this.scannerService.saveDocument(this.selectedFile, payload);

    saveRequest
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: SaveResponse | ClientScannerSaveResponse) => {
          this.isSaving.set(false);
          this.savedDocument.set(response.data);
          this.savedDocumentId.set(response.document_id);
          if ('client_record_id' in response) {
            this.savedClientRecordId.set(response.client_record_id);
            this.savedClientRecordType.set(response.client_record_type);
            this.toast.success(
              'Document imported',
              `Saved into ${this.destinationLabelForType(response.client_record_type)} for this client.`,
            );
          } else {
            this.savedClientRecordId.set(null);
            this.savedClientRecordType.set(null);
            this.toast.success('Document saved', `Saved as document #${response.document_id}`);
          }
          this.step.set(4);
        },
        error: (error: any) => {
          this.isSaving.set(false);
          this.toast.error('Save failed', error.message || 'Could not save the scanned document.');
        },
      });
  }

  scanAnother(): void {
    this.resetFlow();
  }

  viewAllDocuments(): void {
    this.router.navigate(['/documents/scanner/all']);
  }

  labelForType(type: DocumentType): string {
    return this.typeOptions.find((option) => option.value === type)?.title || type;
  }

  destinationLabelForType(type: DocumentType): string {
    switch (type) {
      case 'sale':
        return 'Sales';
      case 'purchase':
        return 'Purchases';
      case 'expense':
        return 'Expenses';
      default:
        return type;
    }
  }

  successMessage(): string {
    if (this.savedClientRecordType()) {
      const destination = this.destinationLabelForType(this.savedClientRecordType()!);
      const clientRecordId = this.savedClientRecordId();
      const scannerId = this.savedDocumentId();
      return clientRecordId
        ? `Saved into ${destination} for this client as record #${clientRecordId}. OCR source remains stored as scanner document #${scannerId}.`
        : `Saved into ${destination} for this client. OCR source remains stored as scanner document #${scannerId}.`;
    }

    return `Document ID #${this.savedDocumentId()} is now stored with its OCR data, local copy, and S3 metadata.`;
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

  selectedFileName(): string {
    return this.selectedFile?.name || '';
  }

  selectedFileSize(): string {
    if (!this.selectedFile) {
      return '';
    }

    const sizeMb = this.selectedFile.size / (1024 * 1024);
    return `${sizeMb.toFixed(2)} MB`;
  }

  private handleFile(file: File): void {
    if (!this.selectedType()) {
      this.toast.error('Select a document type first');
      this.step.set(1);
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];
    if (!allowed.includes(file.type)) {
      this.uploadError.set('Unsupported file type. Please upload JPG, JPEG, PNG, WEBP, BMP, or TIFF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.uploadError.set('File size exceeds the 10MB limit.');
      return;
    }

    this.uploadError.set('');
    if (this.previewThumbnail()?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewThumbnail()!);
    }
    this.selectedFile = file;
    this.previewThumbnail.set(URL.createObjectURL(file));
    this.isPreviewLoading.set(true);
    this.progressText.set('Uploading...');
    this.startProgressSequence();

    this.scannerService.previewDocument(file, this.selectedType()!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.applyPreview(response),
        error: (error) => {
          this.isPreviewLoading.set(false);
          this.clearProgressTimers();
          this.progressText.set('');
          this.uploadError.set(error.message || 'Unable to read the document.');
          this.toast.error('Preview failed', error.message || 'Unable to read the document.');
        },
      });
  }

  private applyPreview(response: PreviewResponse): void {
    this.clearProgressTimers();
    this.isPreviewLoading.set(false);
    this.progressText.set('');
    this.imageBase64.set(response.image_base64);
    this.fieldConfidences.set(response.field_confidences || {});
    this.ocrConfidence.set(response.ocr_confidence || 0);
    this.warnings.set(response.warnings || []);

    this.documentForm.patchValue({
      document_number: response.data.document_number || '',
      date: response.data.date || '',
      vendor_or_customer: response.data.vendor_or_customer || '',
      gstin: response.data.gstin || '',
      subtotal: response.data.subtotal,
      tax_amount: response.data.tax_amount,
      discount: response.data.discount ?? 0,
      total_amount: response.data.total_amount,
      currency: response.data.currency || 'INR',
      payment_mode: response.data.payment_mode || null,
      notes: response.data.notes || '',
      email: response.data.email || '',
      phone: response.data.phone || '',
      raw_ocr_text: response.raw_ocr_text || '',
      ocr_confidence: response.ocr_confidence || 0,
    }, { emitEvent: false });

    this.lineItems.clear();
    (response.data.line_items || []).forEach((lineItem) => this.addLineItemRow(lineItem));
    this.recalculateTotal();
    this.step.set(3);
  }

  private buildPayload(): ScannerDocumentData {
    const raw = this.documentForm.getRawValue();
    return {
      doc_type: this.selectedType()!,
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
      ocr_confidence: raw.ocr_confidence,
      raw_ocr_text: raw.raw_ocr_text || null,
      line_items: this.sanitizedLineItems(this.lineItems.getRawValue()),
    };
  }

  private recalculateTotal(): void {
    const subtotal = Number(this.documentForm.get('subtotal')!.value || 0);
    const tax = Number(this.documentForm.get('tax_amount')!.value || 0);
    const discount = Number(this.documentForm.get('discount')!.value || 0);
    const total = Number((subtotal + tax - discount).toFixed(2));
    this.documentForm.get('total_amount')!.setValue(total || null, { emitEvent: false });
  }

  private startProgressSequence(): void {
    this.clearProgressTimers();
    this.progressTimers = [
      setTimeout(() => this.isPreviewLoading() && this.progressText.set('Reading document...'), 400),
      setTimeout(() => this.isPreviewLoading() && this.progressText.set('Extracting data...'), 1400),
    ];
  }

  private clearProgressTimers(): void {
    this.progressTimers.forEach((timer) => clearTimeout(timer));
    this.progressTimers = [];
  }

  private clearFileState(): void {
    if (this.previewThumbnail()?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewThumbnail()!);
    }
    this.selectedFile = null;
    this.previewThumbnail.set(null);
    this.imageBase64.set(null);
    this.fieldConfidences.set({});
    this.ocrConfidence.set(0);
    this.warnings.set([]);
    this.isPreviewLoading.set(false);
    this.progressText.set('');
    this.uploadError.set('');
    this.documentForm.reset({
      document_number: '',
      date: '',
      vendor_or_customer: '',
      gstin: '',
      subtotal: null,
      tax_amount: null,
      discount: 0,
      total_amount: null,
      currency: 'INR',
      payment_mode: null,
      notes: '',
      email: '',
      phone: '',
      raw_ocr_text: '',
      ocr_confidence: 0,
    });
    this.lineItems.clear();
  }

  private resetFlow(): void {
    this.clearFileState();
    this.savedDocument.set(null);
    this.savedDocumentId.set(null);
    this.savedClientRecordId.set(null);
    this.savedClientRecordType.set(null);
    if (this.embedded && this.presetType) {
      this.selectedType.set(this.presetType);
      this.step.set(2);
      return;
    }

    this.selectedType.set(null);
    sessionStorage.removeItem('scanner-doc-type');
    this.step.set(1);
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

  private applyPresetType(docType: DocumentType, resetForTypeChange = false): void {
    const typeChanged = this.selectedType() !== docType;
    this.selectedType.set(docType);

    if (resetForTypeChange && typeChanged) {
      this.clearFileState();
      this.savedDocument.set(null);
      this.savedDocumentId.set(null);
      this.savedClientRecordId.set(null);
      this.savedClientRecordType.set(null);
    }

    if (this.step() === 1 || typeChanged) {
      this.step.set(2);
    }
  }
}
