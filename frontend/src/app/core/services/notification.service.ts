import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private toast = inject(ToastService);

  success(message: string, _action: string = 'Close'): void {
    this.toast.success(message);
  }

  error(message: string, _action: string = 'Close'): void {
    this.toast.error(message);
  }

  warning(message: string, _action: string = 'Close'): void {
    this.toast.warning(message);
  }

  info(message: string, _action: string = 'Close'): void {
    this.toast.info(message);
  }
}
