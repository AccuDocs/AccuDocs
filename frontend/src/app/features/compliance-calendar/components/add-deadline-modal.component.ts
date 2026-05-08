import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCalendarDaysSolid, heroSparklesSolid, heroXMarkSolid } from '@ng-icons/heroicons/solid';

import { ComplianceService, DeadlineType } from '@core/services/compliance.service';

@Component({
  selector: 'app-add-deadline-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroCalendarDaysSolid, heroSparklesSolid, heroXMarkSolid })],
  template: `
    <div
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      (click)="close.emit()"
    >
      <div class="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]"></div>

      <section class="modal-shell animate-page-enter" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="flex min-w-0 items-start gap-4">
            <div class="icon-orb">
              <ng-icon name="heroCalendarDaysSolid" size="18"></ng-icon>
            </div>
            <div class="min-w-0">
              <p class="eyebrow">Compliance Setup</p>
              <h2 class="modal-title">Add Custom Deadline</h2>
              <p class="modal-subtitle">
                Create a one-time or recurring due date for GST, ITR, TDS, ROC, or other statutory work.
              </p>
            </div>
          </div>

          <button type="button" (click)="close.emit()" class="icon-button" aria-label="Close dialog">
            <ng-icon name="heroXMarkSolid" size="18"></ng-icon>
          </button>
        </header>

        <form (ngSubmit)="onSubmit()">
          <div class="modal-body">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="field-group">
                <label class="field-label" for="deadline-type">Compliance Type *</label>
                <select
                  id="deadline-type"
                  [(ngModel)]="form.type"
                  name="type"
                  required
                  class="field-input field-select"
                >
                  <option value="">Select type</option>
                  <option value="ITR">ITR</option>
                  <option value="GST">GST</option>
                  <option value="TDS">TDS</option>
                  <option value="ROC">ROC</option>
                  <option value="ADVANCE_TAX">Advance Tax</option>
                  <option value="OTHER">Other</option>
                </select>
                <p class="field-hint">Choose the compliance bucket for this deadline.</p>
              </div>

              <div class="field-group">
                <label class="field-label" for="deadline-date">Due Date *</label>
                <input
                  id="deadline-date"
                  [(ngModel)]="form.dueDate"
                  name="dueDate"
                  type="date"
                  required
                  class="field-input"
                />
                <p class="field-hint">Use the actual filing or payment deadline.</p>
              </div>
            </div>

            <div class="field-group mt-4">
              <label class="field-label" for="deadline-title">Title *</label>
              <input
                id="deadline-title"
                [(ngModel)]="form.title"
                name="title"
                required
                placeholder="e.g. GSTR-3B March Filing"
                class="field-input"
              />
              <p class="field-hint">Keep it short and recognizable for the team.</p>
            </div>

            <section class="feature-panel mt-4">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                    <ng-icon name="heroSparklesSolid" size="14"></ng-icon>
                    Automation
                  </div>
                  <h3 class="mt-2 text-sm font-black text-slate-950">Recurring Rule</h3>
                  <p class="mt-1 text-sm font-medium leading-6 text-slate-500">
                    Turn this on if the same deadline repeats every month, quarter, half-year, or year.
                  </p>
                </div>

                <label class="toggle" aria-label="Toggle recurring deadline">
                  <input [(ngModel)]="form.recurring" name="recurring" type="checkbox" />
                  <span class="toggle-track">
                    <span class="toggle-thumb"></span>
                  </span>
                </label>
              </div>

              @if (form.recurring) {
                <div class="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div class="field-group">
                    <label class="field-label" for="deadline-pattern">Repeat Pattern</label>
                    <select
                      id="deadline-pattern"
                      [(ngModel)]="form.recurringPattern"
                      name="recurringPattern"
                      class="field-input field-select"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="half-yearly">Half-Yearly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div class="pattern-chip">
                    Repeats {{ form.recurringPattern }}
                  </div>
                </div>
              }
            </section>

            <div class="field-group mt-4">
              <label class="field-label" for="deadline-description">Description</label>
              <textarea
                id="deadline-description"
                [(ngModel)]="form.description"
                name="description"
                rows="4"
                placeholder="Add notes, coverage period, filing details, or follow-up instructions..."
                class="field-textarea"
              ></textarea>
            </div>
          </div>

          <footer class="modal-footer">
            <button type="button" (click)="close.emit()" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" [disabled]="saving()" class="btn btn-primary">
              {{ saving() ? 'Creating...' : 'Create Deadline' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .modal-shell {
      position: relative;
      width: 100%;
      max-width: 720px;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid #dbe3ef;
      background: #ffffff;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
    }
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid #e8eef6;
      background:
        radial-gradient(circle at top left, rgba(14, 165, 233, 0.10), transparent 34%),
        linear-gradient(180deg, #fcfdff 0%, #f8fbff 100%);
      padding: 24px 24px 20px;
    }
    .icon-orb {
      display: grid;
      height: 44px;
      width: 44px;
      flex-shrink: 0;
      place-items: center;
      border-radius: 14px;
      background: #e0f2fe;
      color: #0369a1;
      box-shadow: inset 0 0 0 1px rgba(3, 105, 161, 0.08);
    }
    .eyebrow {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #0369a1;
    }
    .modal-title {
      margin-top: 8px;
      font-size: 28px;
      font-weight: 950;
      line-height: 1.1;
      color: #0f172a;
    }
    .modal-subtitle {
      margin-top: 8px;
      max-width: 520px;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.6;
      color: #64748b;
    }
    .icon-button {
      display: grid;
      height: 38px;
      width: 38px;
      flex-shrink: 0;
      place-items: center;
      border-radius: 12px;
      border: 1px solid transparent;
      color: #64748b;
      transition: all 0.16s ease;
    }
    .icon-button:hover {
      border-color: #e2e8f0;
      background: white;
      color: #334155;
    }
    .modal-body {
      padding: 24px;
    }
    .field-group {
      min-width: 0;
    }
    .field-label {
      display: block;
      margin-bottom: 8px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #64748b;
    }
    .field-hint {
      margin-top: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
    }
    .field-input,
    .field-textarea {
      width: 100%;
      border-radius: 14px;
      border: 1px solid #dbe3ef;
      background: #f8fafc;
      padding: 0 14px;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      outline: none;
      transition: all 0.16s ease;
    }
    .field-input {
      height: 46px;
    }
    .field-select {
      cursor: pointer;
    }
    .field-textarea {
      min-height: 112px;
      resize: vertical;
      padding-top: 12px;
      padding-bottom: 12px;
    }
    .field-input:focus,
    .field-textarea:focus {
      border-color: #93c5fd;
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.10);
    }
    .field-input::placeholder,
    .field-textarea::placeholder {
      color: #94a3b8;
      font-weight: 500;
    }
    .feature-panel {
      border-radius: 20px;
      border: 1px solid #dbe3ef;
      background: linear-gradient(180deg, #fcfdff 0%, #f8fbff 100%);
      padding: 18px;
    }
    .toggle {
      position: relative;
      display: inline-flex;
      cursor: pointer;
      align-items: center;
    }
    .toggle input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .toggle-track {
      display: inline-flex;
      width: 52px;
      padding: 3px;
      border-radius: 999px;
      background: #cbd5e1;
      transition: background-color 0.16s ease;
    }
    .toggle-thumb {
      height: 22px;
      width: 22px;
      border-radius: 999px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
      transition: transform 0.16s ease;
    }
    .toggle input:checked + .toggle-track {
      background: #0284c7;
    }
    .toggle input:checked + .toggle-track .toggle-thumb {
      transform: translateX(24px);
    }
    .pattern-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 46px;
      border-radius: 14px;
      background: #e0f2fe;
      padding: 0 14px;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #0369a1;
      white-space: nowrap;
    }
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid #e8eef6;
      padding: 18px 24px 24px;
      background: #ffffff;
    }
    .btn {
      display: inline-flex;
      height: 42px;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      padding: 0 18px;
      font-size: 14px;
      font-weight: 800;
      transition: all 0.16s ease;
    }
    .btn-secondary {
      border: 1px solid #dbe3ef;
      background: #ffffff;
      color: #475569;
    }
    .btn-secondary:hover {
      background: #f8fafc;
    }
    .btn-primary {
      min-width: 152px;
      background: #0369a1;
      color: #ffffff;
      box-shadow: 0 10px 24px rgba(3, 105, 161, 0.18);
    }
    .btn-primary:hover:not(:disabled) {
      background: #075985;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }
    @media (max-width: 640px) {
      .modal-header,
      .modal-body,
      .modal-footer {
        padding-left: 18px;
        padding-right: 18px;
      }
      .modal-title {
        font-size: 24px;
      }
      .modal-footer {
        flex-direction: column-reverse;
      }
      .btn,
      .btn-primary,
      .pattern-chip {
        width: 100%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddDeadlineModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private complianceService = inject(ComplianceService);

  saving = signal(false);

  form = {
    type: '' as string,
    title: '',
    dueDate: '',
    recurring: false,
    recurringPattern: 'monthly',
    description: '',
  };

  onSubmit() {
    if (!this.form.type || !this.form.title || !this.form.dueDate) return;

    this.saving.set(true);
    this.complianceService
      .createDeadline({
        type: this.form.type as DeadlineType,
        title: this.form.title,
        dueDate: this.form.dueDate,
        recurring: this.form.recurring,
        recurringPattern: this.form.recurring ? this.form.recurringPattern : undefined,
        description: this.form.description || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: () => this.saving.set(false),
      });
  }
}
