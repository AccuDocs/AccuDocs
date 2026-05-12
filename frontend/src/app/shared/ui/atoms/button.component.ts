import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button, ui-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [class]="buttonClasses()"
      [attr.aria-busy]="loading() ? 'true' : null"
      [attr.aria-disabled]="disabled() ? 'true' : null"
      (click)="onClick($event)"
    >
      <!-- Loading Spinner -->
      @if (loading()) {
        <svg 
          class="animate-spin shrink-0" 
          [class]="spinnerSizeClass()"
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      }
      
      <!-- Icon Left -->
      @if (iconLeft() && !loading()) {
        <ng-content select="[icon-left]"></ng-content>
      }
      
      <!-- Button Content -->
      <span class="truncate">
        <ng-content></ng-content>
      </span>
      
      <!-- Icon Right -->
      @if (iconRight()) {
        <ng-content select="[icon-right]"></ng-content>
      }
    </button>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }
    :host([fullWidth]) {
      display: flex;
      width: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  // Inputs
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  fullWidth = input<boolean>(false);
  iconLeft = input<boolean>(false);
  iconRight = input<boolean>(false);

  // Outputs
  clicked = output<MouseEvent>();

  // Click handler
  onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }

  // Computed spinner size based on button size
  spinnerSizeClass = computed(() => {
    const sizeMap: Record<ButtonSize, string> = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };
    return sizeMap[this.size()];
  });

  // Computed button classes
  buttonClasses = computed(() => {
    const baseClasses = [
      'inline-flex items-center justify-center gap-2',
      'font-medium',
      'transition-all duration-200 ease-smooth',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
      'active:scale-[0.97]',
    ].join(' ');

    const variantClasses: Record<ButtonVariant, string> = {
      primary: [
        'bg-primary-600 text-white',
        'hover:bg-[#1E3A8A]',
        'focus-visible:ring-primary-500',
        'shadow-button hover:shadow-primary',
        'dark:bg-primary-500 dark:hover:bg-primary-400',
      ].join(' '),
      secondary: [
        'bg-white text-text-secondary',
        'border border-[#D0D7DE]',
        'hover:bg-background hover:border-border-color',
        'focus-visible:ring-primary-500',
        'shadow-xs',
        'dark:bg-secondary-800 dark:text-secondary-100 dark:border-secondary-700',
        'dark:hover:bg-secondary-700',
      ].join(' '),
      success: [
        'bg-success-600 text-white',
        'hover:bg-success-700',
        'focus-visible:ring-success-500',
        'shadow-button hover:shadow-success',
      ].join(' '),
      warning: [
        'bg-warning-500 text-white',
        'hover:bg-warning-600',
        'focus-visible:ring-warning-500',
        'shadow-button hover:shadow-button-hover',
      ].join(' '),
      danger: [
        'bg-danger-600 text-white',
        'hover:bg-danger-700',
        'focus-visible:ring-danger-500',
        'shadow-button hover:shadow-danger',
      ].join(' '),
      ghost: [
        'bg-transparent text-primary-600',
        'hover:bg-primary-100 hover:text-primary-700',
        'focus-visible:ring-primary-500',
        'dark:text-primary-300 dark:hover:bg-primary-900/30 dark:hover:text-primary-100',
      ].join(' '),
      link: [
        'bg-transparent text-primary-600',
        'hover:text-primary-700 hover:underline',
        'focus-visible:ring-primary-500',
        'dark:text-primary-400 dark:hover:text-primary-300',
        'px-0',
      ].join(' '),
    };

    const sizeClasses: Record<ButtonSize, string> = {
      xs: 'px-2.5 py-1 text-xs rounded-sm min-h-[28px]',
      sm: 'px-3 py-1.5 text-xs rounded-md min-h-[32px]',
      md: 'px-4 py-2 text-sm rounded-md min-h-[40px]',
      lg: 'px-5 py-3 text-sm rounded-md min-h-[48px]',
    };

    return [
      baseClasses,
      variantClasses[this.variant()],
      this.variant() !== 'link' ? sizeClasses[this.size()] : 'text-sm',
      this.fullWidth() ? 'w-full' : '',
    ].join(' ');
  });
}
