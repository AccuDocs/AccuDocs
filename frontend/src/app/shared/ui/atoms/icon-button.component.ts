import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent, type IconSize, type IconTone } from './icon.component';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'ghost' | 'soft';

@Component({
  selector: 'app-icon-button, ui-icon-button',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <button
      type="button"
      class="icon-button"
      [disabled]="disabled()"
      [class.icon-button--active]="active()"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="title() || ariaLabel()"
      [ngStyle]="buttonVars()"
      (click)="onClick($event)"
    >
      <app-icon
        [name]="icon()"
        [size]="iconSize()"
        tone="current"
        ariaLabel=""
      />

      @if (dot()) {
        <span class="icon-button__dot"></span>
      } @else if (hasBadge()) {
        <span class="icon-button__badge">{{ badge() }}</span>
      }
    </button>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }

    .icon-button {
      width: var(--icon-button-size);
      height: var(--icon-button-size);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border: none;
      border-radius: var(--radius-md);
      background: var(--icon-button-bg);
      color: var(--icon-button-color);
      cursor: pointer;
      box-shadow: var(--shadow-xs);
      transition: background 200ms ease, color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
    }

    .icon-button:hover:not(:disabled) {
      background: var(--icon-button-hover-bg);
      color: var(--icon-button-hover-color);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }

    .icon-button:active:not(:disabled) {
      transform: translateY(0);
    }

    .icon-button:focus-visible {
      outline: 2px solid var(--ring-color);
      outline-offset: 2px;
    }

    .icon-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .icon-button__badge {
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--danger);
      color: white;
      font-size: 10px;
      font-weight: 700;
      line-height: 18px;
      text-align: center;
      box-shadow: 0 0 0 2px var(--surface-color);
    }

    .icon-button__dot {
      position: absolute;
      top: 7px;
      right: 7px;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--danger);
      box-shadow: 0 0 0 2px var(--surface-color);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButtonComponent {
  icon = input.required<string>();
  ariaLabel = input.required<string>();
  title = input<string>('');
  size = input<IconButtonSize>('md');
  tone = input<Exclude<IconTone, 'current'>>('secondary');
  variant = input<IconButtonVariant>('ghost');
  active = input<boolean>(false);
  disabled = input<boolean>(false);
  badge = input<string | number | null>(null);
  dot = input<boolean>(false);

  clicked = output<MouseEvent>();

  iconSize = computed<IconSize>(() => {
    const sizeMap: Record<IconButtonSize, IconSize> = {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    };

    return sizeMap[this.size()];
  });

  buttonVars = computed(() => {
    const sizeMap: Record<IconButtonSize, string> = {
      sm: '30px',
      md: '34px',
      lg: '40px',
    };

    const toneMap: Record<Exclude<IconTone, 'current'>, string> = {
      primary: 'var(--primary)',
      secondary: 'var(--text-secondary)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      info: 'var(--info)',
      muted: 'var(--text-muted)',
    };

    const tone = toneMap[this.tone()];
    const inactiveColor = this.tone() === 'secondary' || this.tone() === 'muted'
      ? 'var(--text-secondary)'
      : tone;
    const hoverColor = this.tone() === 'secondary' || this.tone() === 'muted'
      ? 'var(--text-primary)'
      : tone;
    const baseBackground = this.variant() === 'soft'
      ? 'var(--background-color)'
      : 'transparent';
    const hoverBackground = this.variant() === 'soft'
      ? '#EFF6FF'
      : '#F0F5FF';

    return {
      '--icon-button-size': sizeMap[this.size()],
      '--icon-button-bg': this.active() ? 'var(--primary-50)' : baseBackground,
      '--icon-button-hover-bg': this.active() ? 'var(--primary-100)' : hoverBackground,
      '--icon-button-color': this.active() ? 'var(--primary-700)' : inactiveColor,
      '--icon-button-hover-color': this.active() ? 'var(--primary-800)' : hoverColor,
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
