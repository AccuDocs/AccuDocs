import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import * as heroSolid from '@ng-icons/heroicons/solid';
import * as heroOutline from '@ng-icons/heroicons/outline';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IconTone =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'current';

@Component({
  selector: 'app-icon, ui-icon',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  template: `
    <ng-icon 
      [name]="name()" 
      [size]="iconSize()"
      [class]="className()"
      [style.color]="iconColor()"
      [attr.aria-hidden]="!ariaLabel() ? 'true' : null"
      [attr.aria-label]="ariaLabel()"
      [attr.role]="ariaLabel() ? 'img' : null"
    ></ng-icon>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      ...heroSolid,
      ...heroOutline,
    }),
  ],
})
export class IconComponent {
  // Inputs
  name = input.required<string>();
  size = input<IconSize>('md');
  tone = input<IconTone>('current');
  className = input<string>('');
  ariaLabel = input<string>('');

  // Size mapping
  iconSize(): string {
    const sizeMap: Record<IconSize, string> = {
      xs: '16',
      sm: '20',
      md: '24',
      lg: '32',
      xl: '40',
      '2xl': '48',
    };
    return sizeMap[this.size()];
  }

  iconColor(): string {
    const toneMap: Record<IconTone, string> = {
      primary: 'var(--primary)',
      secondary: 'var(--text-secondary)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger: 'var(--danger)',
      info: 'var(--info)',
      muted: 'var(--text-muted)',
      current: 'currentColor',
    };

    return toneMap[this.tone()];
  }
}
