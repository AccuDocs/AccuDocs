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
      [class.nav-row-button--active]="active()"
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
      width: calc(100% - 20px);
      min-height: 36px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 1px 10px;
      padding: 0 10px 0 var(--nav-row-padding-left);
      text-align: left;
      background: var(--nav-row-bg);
      border: none;
      border-radius: 8px;
      color: var(--nav-row-color);
      font-size: 13px;
      font-weight: 500;
      box-shadow: var(--nav-row-shadow, none);
      cursor: pointer;
      position: relative;
      transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
    }

    .nav-row-button:hover:not(:disabled) {
      background: var(--nav-row-hover-bg);
      color: var(--nav-row-hover-color);
    }

    .nav-row-button:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--brand-accent-bright) 50%, transparent);
      outline-offset: -2px;
    }

    .nav-row-button--active::after {
      background: var(--nav-row-active-dot, var(--brand-accent-bright));
      border-radius: 999px;
      content: '';
      height: 5px;
      position: absolute;
      right: 9px;
      width: 5px;
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
      line-height: 1.25;
    }

    .nav-row-button--active .nav-row-button__label {
      padding-right: 10px;
    }

    .nav-row-button__badge {
      background: var(--nav-row-badge-bg, var(--color-red));
      color: var(--nav-row-badge-color, white);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-full);
      border: 2px solid var(--nav-row-badge-border, var(--color-surface));
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
    const inactiveColor = this.muted()
      ? 'var(--nav-row-muted, var(--color-text-sub))'
      : 'var(--nav-row-color-base, var(--color-text))';
    const hoverColor = this.disabled()
      ? inactiveColor
      : 'var(--nav-row-hover-color-token, var(--color-text))';

    return {
      '--nav-row-padding-left': `${this.paddingLeft()}px`,
      '--nav-row-bg': this.active() ? 'var(--nav-row-active-bg, var(--color-gold-faint))' : 'transparent',
      '--nav-row-hover-bg': this.active()
        ? 'var(--nav-row-active-bg, var(--color-gold-faint))'
        : 'var(--nav-row-hover-bg-token, var(--color-bg-raised))',
      '--nav-row-color': this.active() ? 'var(--nav-row-active-color, var(--color-text))' : inactiveColor,
      '--nav-row-hover-color': hoverColor,
      '--nav-row-border': this.active() ? this.accentColor() : 'transparent',
      '--nav-row-shadow': this.active() ? 'var(--nav-row-active-shadow, none)' : 'none',
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
