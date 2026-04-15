import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../atoms/icon.component';

@Component({
  selector: 'app-nav-row-button, ui-nav-row-button',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <button
      type="button"
      class="nav-row-button"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel() || label()"
      [attr.title]="title() || label()"
      [ngStyle]="buttonVars()"
      (click)="onClick($event)"
    >
      @if (iconName()) {
        <app-icon
          [name]="iconName()"
          [size]="iconSize()"
          tone="current"
          ariaLabel=""
        />
      } @else if (glyph()) {
        <span class="nav-row-button__glyph" aria-hidden="true">{{ glyph() }}</span>
      }

      <span class="nav-row-button__label">{{ label() }}</span>

      @if (hasBadge()) {
        <span class="nav-row-button__badge">{{ badge() }}</span>
      }
    </button>
  `,
  styles: [`
    :host {
      display: block;
    }

    .nav-row-button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px 10px var(--nav-row-padding-left);
      text-align: left;
      background: var(--nav-row-bg);
      border: none;
      border-left: 3px solid var(--nav-row-border);
      color: var(--nav-row-color);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
    }

    .nav-row-button:hover:not(:disabled) {
      background: var(--nav-row-hover-bg);
      color: var(--nav-row-hover-color);
    }

    .nav-row-button:focus-visible {
      outline: 2px solid var(--ring-color);
      outline-offset: -2px;
    }

    .nav-row-button:disabled {
      cursor: not-allowed;
      opacity: var(--nav-row-disabled-opacity, 0.5);
    }

    .nav-row-button__glyph {
      width: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
    }

    .nav-row-button__label {
      flex: 1;
      min-width: 0;
    }

    .nav-row-button__badge {
      background: var(--color-red);
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavRowButtonComponent {
  label = input.required<string>();
  iconName = input<string>('');
  glyph = input<string>('');
  active = input<boolean>(false);
  disabled = input<boolean>(false);
  badge = input<string | number | null>(null);
  title = input<string>('');
  ariaLabel = input<string>('');
  accentColor = input<string>('var(--color-gold)');
  paddingLeft = input<number>(16);
  muted = input<boolean>(false);
  disabledOpacity = input<number>(0.5);

  clicked = output<MouseEvent>();

  iconSize = computed<'sm'>(() => 'sm');

  buttonVars = computed(() => {
    const inactiveColor = this.muted() ? 'var(--color-text-sub)' : 'var(--color-text)';
    const hoverColor = this.disabled() ? inactiveColor : 'var(--color-text)';

    return {
      '--nav-row-padding-left': `${this.paddingLeft()}px`,
      '--nav-row-bg': this.active() ? 'var(--color-gold-faint)' : 'transparent',
      '--nav-row-hover-bg': this.active() ? 'var(--color-gold-faint)' : 'var(--color-bg-raised)',
      '--nav-row-color': this.active() ? 'var(--color-text)' : inactiveColor,
      '--nav-row-hover-color': hoverColor,
      '--nav-row-border': this.active() ? this.accentColor() : 'transparent',
      '--nav-row-disabled-opacity': `${this.disabledOpacity()}`,
    };
  });

  hasBadge(): boolean {
    return this.badge() !== null && this.badge() !== undefined && this.badge() !== '';
  }

  onClick(event: MouseEvent): void {
    if (!this.disabled()) {
      this.clicked.emit(event);
    }
  }
}
