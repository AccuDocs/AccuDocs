import { Component, inject, signal, output, input } from '@angular/core';
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
                  <div class="ts-thumb-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="ts-thumb-icon">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <span class="ts-template-preview-name">{{ tpl.name }}</span>
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

    .ts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }

    .ts-card { position: relative; display: flex; flex-direction: column; gap: 0; border-radius: 12px; border: 2px solid #e2e8f0;
      background: #fff; transition: all 0.18s ease; padding: 0; overflow: hidden; text-align: left; }
    .ts-card:hover { border-color: #93c5fd; box-shadow: 0 4px 16px rgba(59,130,246,0.12); transform: translateY(-2px); }
    .ts-card--selected { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
    .ts-card--default { border-color: #a5f3fc; }

    .ts-thumb { position: relative; width: 100%; aspect-ratio: 3/4; background: #f8fafc; overflow: hidden; border: 0; padding: 0; cursor: pointer; }
    .ts-thumb-img { width: 100%; height: 100%; object-fit: cover; }
    .ts-thumb-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 8px; padding: 12px; }
    .ts-thumb-icon { width: 32px; height: 32px; color: #94a3b8; }
    .ts-template-preview-name { font-size: 10px; color: #94a3b8; text-align: center; }

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

  selectTemplate(tpl: InvoiceTemplate): void {
    this.selectedId.set(tpl.id);
    this.templateSelected.emit(tpl.id);
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
        this.toast.success('Default invoice template updated');
        this.templatesResource.reload();
      },
      error: () => {
        this.settingDefaultId.set(null);
        this.toast.error('Could not update default template');
      },
    });
  }
}
