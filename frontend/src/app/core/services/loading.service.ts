import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private loadingSignal = signal<boolean>(false);
  private loadingCount = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private visibleSince = 0;
  private readonly showDelayMs = 140;
  private readonly minVisibleMs = 320;

  readonly isLoading = this.loadingSignal.asReadonly();

  show(): void {
    this.loadingCount++;

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    if (this.loadingSignal() || this.showTimer) {
      return;
    }

    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      if (this.loadingCount > 0) {
        this.visibleSince = Date.now();
        this.loadingSignal.set(true);
      }
    }, this.showDelayMs);
  }

  hide(): void {
    this.loadingCount--;
    if (this.loadingCount <= 0) {
      this.loadingCount = 0;
      this.scheduleHide();
    }
  }

  reset(): void {
    this.loadingCount = 0;
    this.clearTimers();
    this.loadingSignal.set(false);
  }

  private scheduleHide(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
      return;
    }

    if (!this.loadingSignal()) {
      return;
    }

    const remainingVisibleMs = Math.max(0, this.minVisibleMs - (Date.now() - this.visibleSince));
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      if (this.loadingCount === 0) {
        this.loadingSignal.set(false);
      }
    }, remainingVisibleMs);
  }

  private clearTimers(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
