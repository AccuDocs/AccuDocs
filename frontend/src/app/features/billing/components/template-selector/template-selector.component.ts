import { Component, computed, effect, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { InvoiceService } from '../../services/invoice.service';
import { ToastService } from '@core/services/toast.service';

export interface InvoiceTemplate {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  isDefault: boolean;
  orgId: string | null;
  isSystem: boolean;
}

@Component({
  selector: 'app-template-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="template-selector">
      <!-- Header -->
      <div class="ts-header">
        <div>
          <h3 class="ts-title">Invoice Templates</h3>
          <p class="ts-subtitle">Choose a design for your invoice PDF</p>
        </div>
        @if (selectedId()) {
          <button class="ts-clear-btn" (click)="clearSelection()">Clear selection</button>
        }
      </div>

      <!-- Loading -->
      @if (templatesResource.isLoading()) {
        <div class="ts-loading">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="ts-skeleton"></div>
          }
        </div>
      }

      <!-- Grid -->
      @if (!templatesResource.isLoading()) {
        <div class="ts-grid">
          @for (tpl of templates(); track tpl.id) {
            <article
              class="ts-card"
              [class.ts-card--selected]="selectedId() === tpl.id"
              [class.ts-card--default]="tpl.isDefault"
              [id]="'template-card-' + tpl.id"
            >
              <!-- Thumbnail -->
              <button type="button" class="ts-thumb" (click)="selectTemplate(tpl)">
                @if (tpl.thumbnailUrl) {
                  <img [src]="tpl.thumbnailUrl" [alt]="tpl.name" class="ts-thumb-img" />
                } @else {
                  <div class="ts-mini-preview" [ngClass]="previewClass(tpl)">
                    <div class="ts-preview-header">
                      <span></span>
                      <strong>INV</strong>
                    </div>
                    <div class="ts-preview-title">{{ previewTitle(tpl) }}</div>
                    <div class="ts-preview-cards">
                      <span></span>
                      <span></span>
                    </div>
                    <div class="ts-preview-table">
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <div class="ts-preview-total"></div>
                  </div>
                }
                <!-- Selected checkmark -->
                @if (selectedId() === tpl.id) {
                  <div class="ts-check-badge">
                    <svg viewBox="0 0 20 20" fill="currentColor" class="ts-check-icon">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                    </svg>
                  </div>
                }
                <!-- Default badge -->
                @if (tpl.isDefault) {
                  <div class="ts-default-badge">Default</div>
                }
              </button>

              <!-- Name & actions -->
              <div class="ts-card-footer">
                <div class="ts-card-copy">
                  <span class="ts-card-name">{{ tpl.name }}</span>
                  <span class="ts-system-tag">{{ tpl.isSystem ? 'System template' : 'Custom template' }}</span>
                </div>
                <button
                  type="button"
                  class="ts-default-action"
                  [disabled]="tpl.isDefault || settingDefaultId() === tpl.id"
                  (click)="setDefault(tpl)"
                >
                  {{ tpl.isDefault ? 'Default' : settingDefaultId() === tpl.id ? 'Saving...' : 'Set default' }}
                </button>
              </div>
            </article>
          }

          <!-- Empty state -->
          @if (templates().length === 0) {
            <div class="ts-empty">
              <p>No templates available. Contact support.</p>
            </div>
          }
        </div>

        @if (selectedTemplate()) {
          <div class="ts-large-preview">
            <div>
              <p class="ts-preview-kicker">Active PDF design</p>
              <h4>{{ selectedTemplate()!.name }}</h4>
              <p>Download PDF and Print use this default template for generated invoices.</p>
            </div>
            <div class="ts-large-sheet" [ngClass]="previewClass(selectedTemplate()!)">
              <div class="ts-large-hero">
                <span>{{ previewTitle(selectedTemplate()!) }}</span>
                <strong>INV-2026-001</strong>
              </div>
              <div class="ts-large-blocks"><span></span><span></span></div>
              <div class="ts-large-lines">
                <span></span><span></span><span></span><span></span>
              </div>
              <div class="ts-large-total"></div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .template-selector { display: flex; flex-direction: column; gap: 16px; }

    .ts-header { display: flex; align-items: flex-start; justify-content: space-between; }
    .ts-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 2px; }
    .ts-subtitle { font-size: 12px; color: #64748b; margin: 0; }
    .ts-clear-btn { font-size: 12px; color: #3b82f6; background: none; border: none; cursor: pointer; padding: 0; }
    .ts-clear-btn:hover { text-decoration: underline; }

    .ts-loading { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
    .ts-skeleton { height: 160px; border-radius: 12px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite linear; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .ts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }

    .ts-card { position: relative; display: flex; flex-direction: column; gap: 0; border-radius: 12px; border: 2px solid #e2e8f0;
      background: #fff; transition: all 0.18s ease; padding: 0; overflow: hidden; text-align: left; }
    .ts-card:hover { border-color: #93c5fd; box-shadow: 0 4px 16px rgba(59,130,246,0.12); transform: translateY(-2px); }
    .ts-card--selected { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
    .ts-card--default { border-color: #a5f3fc; }

    .ts-thumb { position: relative; width: 100%; aspect-ratio: 3/4; background: #f8fafc; overflow: hidden; border: 0; padding: 0; cursor: pointer; }
    .ts-thumb-img { width: 100%; height: 100%; object-fit: cover; }
    .ts-mini-preview { height: 100%; padding: 14px; background: #fff; color: #0f172a; }
    .ts-preview-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .ts-preview-header span { width: 42%; height: 9px; border-radius: 999px; background: currentColor; opacity: .15; }
    .ts-preview-header strong { font-size: 10px; letter-spacing: .12em; }
    .ts-preview-title { margin-top: 13px; height: 22px; border-radius: 8px; display: flex; align-items: center; padding-inline: 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; background: currentColor; color: #fff; }
    .ts-preview-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
    .ts-preview-cards span { height: 34px; border-radius: 8px; background: currentColor; opacity: .08; }
    .ts-preview-table { display: grid; gap: 6px; margin-top: 13px; }
    .ts-preview-table span { height: 8px; border-radius: 999px; background: currentColor; opacity: .14; }
    .ts-preview-total { width: 46%; height: 24px; margin-left: auto; margin-top: 12px; border-radius: 10px; background: currentColor; opacity: .22; }
    .preview-modern { color: #059669; background: linear-gradient(145deg, #ffffff, #ecfdf5); }
    .preview-compact { color: #111827; background: linear-gradient(145deg, #ffffff, #f8fafc); }
    .preview-premium { color: #0f766e; background: linear-gradient(145deg, #f8fafc, #e0f2fe); }
    .preview-premium .ts-preview-title { background: linear-gradient(135deg, #0f766e, #172554); }
    .preview-compact .ts-preview-title { background: #111827; }

    .ts-check-badge { position: absolute; top: 6px; right: 6px; background: #3b82f6; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
    .ts-check-icon { width: 14px; height: 14px; color: #fff; }
    .ts-default-badge { position: absolute; top: 6px; left: 6px; background: #0ea5e9; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: .06em; }

    .ts-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px; border-top: 1px solid #f1f5f9; }
    .ts-card-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .ts-card-name { font-size: 11px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ts-system-tag { font-size: 9px; color: #94a3b8; white-space: nowrap; }
    .ts-default-action { flex: 0 0 auto; border: 1px solid #dbeafe; color: #2563eb; background: #eff6ff; border-radius: 999px; padding: 5px 9px; font-size: 10px; font-weight: 800; cursor: pointer; }
    .ts-default-action:hover:not(:disabled) { background: #dbeafe; }
    .ts-default-action:disabled { cursor: default; opacity: .65; color: #64748b; background: #f1f5f9; border-color: #e2e8f0; }

    .ts-empty { grid-column: 1 / -1; text-align: center; color: #94a3b8; font-size: 13px; padding: 24px; }
    .ts-large-preview { margin-top: 18px; display: grid; grid-template-columns: minmax(0, .8fr) minmax(280px, 1.2fr); gap: 18px; align-items: stretch; border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px; background: linear-gradient(135deg, #fff, #f8fafc); }
    .ts-preview-kicker { margin: 0 0 8px; font-size: 10px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; color: #64748b; }
    .ts-large-preview h4 { margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; }
    .ts-large-preview p { margin: 8px 0 0; color: #64748b; font-size: 13px; line-height: 1.6; }
    .ts-large-sheet { min-height: 230px; border-radius: 16px; padding: 18px; box-shadow: inset 0 0 0 1px rgba(15, 23, 42, .08); }
    .ts-large-hero { display: flex; justify-content: space-between; align-items: center; border-radius: 14px; padding: 16px; background: currentColor; color: #fff; }
    .ts-large-hero span { font-size: 17px; font-weight: 900; text-transform: uppercase; }
    .ts-large-hero strong { font-size: 12px; }
    .ts-large-blocks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
    .ts-large-blocks span { height: 54px; border-radius: 12px; background: currentColor; opacity: .08; }
    .ts-large-lines { display: grid; gap: 8px; margin-top: 16px; }
    .ts-large-lines span { height: 10px; border-radius: 999px; background: currentColor; opacity: .14; }
    .ts-large-total { width: 35%; height: 34px; margin-left: auto; margin-top: 14px; border-radius: 12px; background: currentColor; opacity: .25; }
    @media (max-width: 720px) {
      .ts-large-preview { grid-template-columns: 1fr; }
    }

    :host-context(.dark) .ts-card { background: #1e293b; border-color: #334155; }
    :host-context(.dark) .ts-thumb { background: #0f172a; }
    :host-context(.dark) .ts-card-footer { border-top-color: #334155; }
    :host-context(.dark) .ts-card-name { color: #e2e8f0; }
    :host-context(.dark) .ts-title { color: #f1f5f9; }
  `],
})
export class TemplateSelectorComponent {
  private invoiceService = inject(InvoiceService);
  private toast = inject(ToastService);

  readonly selectedId = signal<string | null>(null);
  readonly settingDefaultId = signal<string | null>(null);

  readonly templateSelected = output<string | null>();

  readonly templatesResource = rxResource({
    loader: () => this.invoiceService.getTemplates(),
  });

  readonly templates = () => (this.templatesResource.value()?.data ?? []) as InvoiceTemplate[];
  readonly selectedTemplate = computed(() => this.templates().find((tpl) => tpl.id === this.selectedId()) ?? this.templates().find((tpl) => tpl.isDefault) ?? null);

  constructor() {
    effect(() => {
      const currentDefault = this.templates().find((tpl) => tpl.isDefault);
      if (currentDefault && this.selectedId() !== currentDefault.id && !this.settingDefaultId()) {
        this.selectedId.set(currentDefault.id);
        this.templateSelected.emit(currentDefault.id);
      }
    });
  }

  selectTemplate(tpl: InvoiceTemplate): void {
    this.selectedId.set(tpl.id);
    this.templateSelected.emit(tpl.id);
    this.setDefault(tpl);
  }

  clearSelection(): void {
    this.selectedId.set(null);
    this.templateSelected.emit(null);
  }

  setDefault(tpl: InvoiceTemplate): void {
    if (tpl.isDefault || this.settingDefaultId()) {
      return;
    }

    this.settingDefaultId.set(tpl.id);
    this.invoiceService.setDefaultTemplate(tpl.id).subscribe({
      next: () => {
        this.settingDefaultId.set(null);
        this.toast.success('Invoice template applied');
        this.templatesResource.reload();
      },
      error: () => {
        this.settingDefaultId.set(null);
        this.toast.error('Could not update default template');
      },
    });
  }

  previewClass(tpl: InvoiceTemplate): string {
    const name = tpl.name.toLowerCase();
    if (name.includes('compact')) return 'preview-compact';
    if (name.includes('premium') || name.includes('electronics')) return 'preview-premium';
    return 'preview-modern';
  }

  previewTitle(tpl: InvoiceTemplate): string {
    const name = tpl.name.toLowerCase();
    if (name.includes('compact')) return 'Compact GST';
    if (name.includes('premium') || name.includes('electronics')) return 'Premium';
    return 'Retail Sales';
  }
}
