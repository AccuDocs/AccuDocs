import { Injectable, computed, inject, signal } from '@angular/core';
import { HotToastService } from '@ngneat/hot-toast';
import type { Toast, ToastType } from '@shared/ui/molecules/toast.component';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private hotToast = inject(HotToastService);
  private toasts = signal<Toast[]>([]);
  private defaultDuration = 5000;

  // Kept for the legacy toast container API. Hot Toast now renders notifications globally.
  readonly activeToasts = computed(() => this.toasts());

  /**
   * Show a success toast
   */
  success(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'success', title, message, duration });
  }

  /**
   * Show an error toast
   */
  error(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'error', title, message, duration: duration ?? 8000 });
  }

  /**
   * Show a warning toast
   */
  warning(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'warning', title, message, duration });
  }

  /**
   * Show an info toast
   */
  info(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'info', title, message, duration });
  }

  /**
   * Show a custom toast
   */
  show(options: {
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    dismissible?: boolean;
  }): string {
    const content = this.formatMessage(options.title, options.message);
    const id = this.toastId(options.type, content);
    const toastOptions = {
      id,
      duration: options.duration ?? this.durationFor(options.type),
      dismissible: options.dismissible ?? true,
    };

    const ref = options.type === 'success'
      ? this.hotToast.success(content, toastOptions)
      : options.type === 'error'
        ? this.hotToast.error(content, toastOptions)
        : options.type === 'warning'
          ? this.hotToast.warning(content, toastOptions)
          : this.hotToast.info(content, toastOptions);

    return ref.getToast().id;
  }

  /**
   * Dismiss a specific toast
   */
  dismiss(id: string): void {
    this.hotToast.close(id);
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    this.hotToast.close();
    this.toasts.set([]);
  }

  private durationFor(type: ToastType): number {
    return type === 'error' ? 8000 : this.defaultDuration;
  }

  private formatMessage(title: string, message?: string): string {
    const primary = title?.trim();
    const secondary = message?.trim();

    if (primary && secondary) {
      return `${primary}: ${secondary}`;
    }

    return primary || secondary || 'Notification';
  }

  private toastId(type: ToastType, message: string): string {
    return `toast-${type}-${this.hash(message)}`;
  }

  private hash(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }

    return Math.abs(hash).toString(36);
  }
}
