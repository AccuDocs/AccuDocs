import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-payment-link',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pl-wrapper">
      <!-- Generate button (initial state) -->
      @if (!linkUrl()) {
        <button
          id="generate-payment-link-btn"
          class="pl-generate-btn"
          [disabled]="isGenerating()"
          (click)="generateLink()"
        >
          @if (isGenerating()) {
            <span class="pl-spinner"></span>
            <span>Generating…</span>
          } @else {
            <svg viewBox="0 0 20 20" fill="currentColor" class="pl-icon">
              <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 1 1 2.828 2.828l-3 3a2 2 0 0 1-2.828 0 1 1 0 0 0-1.414 1.414 4 4 0 0 0 5.656 0l3-3a4 4 0 0 0-5.656-5.656l-1.5 1.5a1 1 0 1 0 1.414 1.414l1.5-1.5Zm-5 5a2 2 0 0 1 2.828 0 1 1 0 1 0 1.414-1.414 4 4 0 0 0-5.656 0l-3 3a4 4 0 1 0 5.656 5.656l1.5-1.5a1 1 0 1 0-1.414-1.414l-1.5 1.5a2 2 0 1 1-2.828-2.828l3-3Z" clip-rule="evenodd" />
            </svg>
            <span>Generate Payment Link</span>
          }
        </button>
      }

      <!-- Link display (after generation) -->
      @if (linkUrl()) {
        <div class="pl-result">
          <!-- URL row -->
          <div class="pl-url-row">
            <div class="pl-url-box">
              <svg viewBox="0 0 20 20" fill="currentColor" class="pl-link-icon">
                <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 1 1 2.828 2.828l-3 3a2 2 0 0 1-2.828 0 1 1 0 0 0-1.414 1.414 4 4 0 0 0 5.656 0l3-3a4 4 0 0 0-5.656-5.656l-1.5 1.5a1 1 0 1 0 1.414 1.414l1.5-1.5Z" clip-rule="evenodd" />
              </svg>
              <span class="pl-url-text" [title]="linkUrl()!">{{ linkUrl() }}</span>
            </div>
            <button
              id="copy-payment-link-btn"
              class="pl-copy-btn"
              [class.pl-copy-btn--copied]="copied()"
              (click)="copyLink()"
              [title]="copied() ? 'Copied!' : 'Copy link'"
            >
              @if (copied()) {
                <svg viewBox="0 0 20 20" fill="currentColor" class="pl-action-icon">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                </svg>
                <span>Copied!</span>
              } @else {
                <svg viewBox="0 0 20 20" fill="currentColor" class="pl-action-icon">
                  <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
                  <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
                </svg>
                <span>Copy</span>
              }
            </button>
          </div>

          <!-- Expiry notice -->
          @if (expiresAt()) {
            <p class="pl-expiry">
              <svg viewBox="0 0 16 16" fill="currentColor" class="pl-expiry-icon">
                <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm.75-10.25a.75.75 0 0 0-1.5 0v3.5c0 .27.144.518.378.651l2.25 1.25a.75.75 0 0 0 .744-1.302L8.75 7.863V4.75z" clip-rule="evenodd" />
              </svg>
              Expires {{ expiresAt() | date:'dd MMM yyyy, h:mm a' }}
            </p>
          }

          <!-- Action buttons -->
          <div class="pl-actions">
            <!-- WhatsApp share -->
            <a
              [href]="whatsappShareUrl()"
              target="_blank"
              rel="noopener noreferrer"
              id="whatsapp-share-link"
              class="pl-wa-btn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" class="pl-wa-icon">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Share via WhatsApp
            </a>

            <!-- Regenerate -->
            <button class="pl-regen-btn" (click)="regenerate()">
              Regenerate link
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .pl-wrapper { display: flex; flex-direction: column; gap: 12px; }

    /* Generate button */
    .pl-generate-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px;
      background: linear-gradient(135deg, #3b82f6, #6366f1); color: #fff; font-size: 13px; font-weight: 600;
      border: none; cursor: pointer; transition: all 0.2s; }
    .pl-generate-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(59,130,246,0.4); }
    .pl-generate-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .pl-icon { width: 16px; height: 16px; }

    .pl-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
      border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Result card */
    .pl-result { display: flex; flex-direction: column; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: 14px; }

    .pl-url-row { display: flex; align-items: center; gap: 8px; }
    .pl-url-box { display: flex; align-items: center; gap: 8px; flex: 1; background: #fff; border: 1px solid #e2e8f0;
      border-radius: 8px; padding: 8px 12px; min-width: 0; }
    .pl-link-icon { width: 14px; height: 14px; color: #3b82f6; flex-shrink: 0; }
    .pl-url-text { font-size: 12px; color: #3b82f6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace; }

    .pl-copy-btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 12px; border-radius: 8px;
      border: 1px solid #e2e8f0; background: #fff; font-size: 12px; font-weight: 600; color: #374151;
      cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
    .pl-copy-btn:hover { background: #f1f5f9; }
    .pl-copy-btn--copied { background: #dcfce7; border-color: #86efac; color: #16a34a; }
    .pl-action-icon { width: 14px; height: 14px; }

    .pl-expiry { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #f59e0b; margin: 0; }
    .pl-expiry-icon { width: 12px; height: 12px; }

    .pl-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    .pl-wa-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 10px;
      background: #25d366; color: #fff; font-size: 12px; font-weight: 700; text-decoration: none;
      transition: all 0.2s; }
    .pl-wa-btn:hover { background: #1da851; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,211,102,0.35); }
    .pl-wa-icon { width: 16px; height: 16px; }

    .pl-regen-btn { font-size: 12px; color: #64748b; background: none; border: none; cursor: pointer;
      padding: 6px 8px; border-radius: 6px; transition: background 0.15s; }
    .pl-regen-btn:hover { background: #f1f5f9; }

    :host-context(.dark) .pl-result { background: #1e293b; border-color: #334155; }
    :host-context(.dark) .pl-url-box { background: #0f172a; border-color: #334155; }
    :host-context(.dark) .pl-copy-btn { background: #1e293b; border-color: #334155; color: #e2e8f0; }
    :host-context(.dark) .pl-copy-btn:hover { background: #334155; }
  `],
})
export class PaymentLinkComponent {
  private invoiceService = inject(InvoiceService);
  private toast = inject(HotToastService);

  readonly invoiceId = input.required<string>();

  readonly linkUrl = signal<string | null>(null);
  readonly expiresAt = signal<Date | null>(null);
  readonly isGenerating = signal(false);
  readonly copied = signal(false);

  readonly whatsappShareUrl = () => {
    if (!this.linkUrl()) return '#';
    const msg = encodeURIComponent(
      `Hi, please find your invoice payment link here: ${this.linkUrl()}`
    );
    return `https://wa.me/?text=${msg}`;
  };

  generateLink(): void {
    this.isGenerating.set(true);
    this.invoiceService.generatePaymentLink(this.invoiceId()).subscribe({
      next: (res) => {
        this.linkUrl.set(res.data?.url ?? null);
        this.expiresAt.set(res.data?.expiresAt ? new Date(res.data.expiresAt) : null);
        this.isGenerating.set(false);
        this.toast.success('Payment link generated!');
      },
      error: () => {
        this.isGenerating.set(false);
        this.toast.error('Failed to generate payment link');
      },
    });
  }

  regenerate(): void {
    this.linkUrl.set(null);
    this.expiresAt.set(null);
    this.generateLink();
  }

  async copyLink(): Promise<void> {
    const url = this.linkUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      this.toast.success('Link copied to clipboard');
      setTimeout(() => this.copied.set(false), 2500);
    } catch {
      this.toast.error('Failed to copy link');
    }
  }
}
