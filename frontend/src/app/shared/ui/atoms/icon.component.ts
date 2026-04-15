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
      primary: '#3B82F6',
      secondary: 'var(--color-text-sub)',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#0EA5E9',
      muted: 'var(--color-text-dim)',
      current: 'currentColor',
    };

    return toneMap[this.tone()];
  }
}
