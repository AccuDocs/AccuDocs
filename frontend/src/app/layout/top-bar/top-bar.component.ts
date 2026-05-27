import { Component, inject, ChangeDetectionStrategy, DestroyRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, timer } from 'rxjs';
import { NavigationService } from '../../core/navigation.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { WhatsAppService, WhatsAppStatus } from '../../core/services/whatsapp.service';
import { IconComponent } from '@ui/atoms/icon.component';
import { IconButtonComponent } from '@ui/atoms/icon-button.component';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, IconButtonComponent],
  template: `
    <header
      class="top-bar"
      style="
        height: var(--header-height);
        background: var(--ad-header-bg);
        border-bottom: 1px solid var(--ad-header-border);
        display: flex;
        align-items: center;
        padding: 0 24px;
        gap: 12px;
        flex-shrink: 0;
      "
    >
      <!-- Breadcrumb (left) -->
      <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
        @if (nav.activeHubData(); as hub) {
          <span style="color: var(--text-muted); font-size: 12px; font-weight: 400;">
            {{ hub.label }}
          </span>
          @if (nav.activeModuleData(); as module) {
            <span style="color: var(--text-hint); font-size: 12px;"> / </span>
            <span style="color: var(--text-primary); font-size: 12px; font-weight: 600;">
              {{ module.label }}
            </span>
          }
        }
      </div>

      <!-- Search (center) -->
      <button
        (click)="nav.openCommandPalette()"
        style="
          flex: 0.8;
          max-width: 400px;
          min-width: 200px;
          background: var(--color-bg-raised);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          color: var(--text-muted);
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        "
        class="hover:border-primary-200"
      >
        <span style="display: flex; align-items: center; gap: 6px;">
          <app-icon name="heroMagnifyingGlassSolid" size="sm" tone="secondary" />
          <span>Search modules...</span>
        </span>
        <span
          style="
          background: var(--card-border);
            padding: 2px 6px;
            border-radius: var(--radius-sm);
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 500;
          "
        >
          Ctrl K
        </span>
      </button>

      <!-- Right side: WA status + notifications + user -->
      <div style="display: flex; align-items: center; gap: 16px;">
        <!-- WhatsApp status -->
        <div
          [style.background]="waBadgeTone().background"
          [style.border-color]="waBadgeTone().border"
          [style.color]="waBadgeTone().text"
          [title]="waStatusMessage()"
          style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: var(--radius-full);
            border: 1px solid;
            font-size: 12px;
          "
        >
          <span
            [style.background]="waBadgeTone().dot"
            style="
              width: 6px;
              height: 6px;
              border-radius: 50%;
            "
          ></span>
          {{ waLabel() }}
        </div>

        <!-- Notifications bell -->
        <app-icon-button
          icon="heroBellSolid"
          ariaLabel="Notifications"
          title="Notifications"
          size="md"
          tone="secondary"
          [badge]="3"
        />

        <!-- Theme toggle -->
        <app-icon-button
          (clicked)="themeService.toggleTheme()"
          [icon]="themeService.isDarkMode() ? 'heroSunSolid' : 'heroMoonSolid'"
          [title]="themeService.isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'"
          ariaLabel="Toggle theme"
          size="md"
          tone="secondary"
          [active]="themeService.isDarkMode()"
        />

        <!-- User profile container -->
        <div style="position: relative;">
          <!-- User profile button -->
          <button
            (click)="userMenuOpen.set(!userMenuOpen())"
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              background: transparent;
              border: 1px solid var(--color-border);
              border-radius: var(--radius-md);
              padding: 2px 12px 2px 2px;
              cursor: pointer;
              transition: all 0.2s;
            "
            class="hover:border-primary-200"
          >
            <div
              style="
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: var(--brand-accent-soft);
                color: var(--brand-accent);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 11px;
                flex-shrink: 0;
              "
            >
              {{ authService.currentUser()?.name?.charAt(0) || 'CA' }}
            </div>
            <span style="font-size: 12px; color: var(--color-text); font-weight: 500;">
              {{ authService.currentUser()?.name || 'You' }}
            </span>
          </button>

          <!-- Dropdown Panel -->
          @if (userMenuOpen()) {
            <div
              style="
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                width: 200px;
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-dropdown);
                z-index: 50;
                overflow: hidden;
              "
            >
              <div style="padding: 12px; border-bottom: 1px solid var(--color-border);">
                <div style="font-weight: 600; font-size: 13px; color: var(--color-text);">
                   {{ authService.currentUser()?.name || 'User' }}
                </div>
                <div style="font-size: 11px; color: var(--color-text-sub); margin-top: 2px; text-transform: capitalize;">
                  {{ authService.currentUser()?.role || 'Admin' }}
                </div>
              </div>
              <div style="padding: 4px;">
                <button
                  (click)="logout()"
                  style="
                    width: 100%;
                    text-align: left;
                    padding: 8px 12px;
                    border: none;
                    background: transparent;
                    color: var(--color-red);
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: background 0.2s;
                  "
                  class="hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <app-icon name="heroArrowLeftStartOnRectangleSolid" size="sm" tone="danger" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          }
          
          <!-- Backdrop -->
          @if (userMenuOpen()) {
            <div 
              (click)="userMenuOpen.set(false)" 
              style="position: fixed; inset: 0; z-index: 40;"
            ></div>
          }
        </div>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent implements OnInit {
  nav = inject(NavigationService);
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  whatsappService = inject(WhatsAppService);
  userMenuOpen = signal(false);
  waStatus = signal<WhatsAppStatus['status']>('DISCONNECTED');
  waStatusMessage = signal('WhatsApp status not checked yet');
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    timer(1500, 30000)
      .pipe(
        switchMap(() =>
          this.whatsappService.getStatus().pipe(
            catchError(() =>
              of<WhatsAppStatus>({
                status: 'DISCONNECTED',
                qrCode: null,
                message: 'Unable to read WhatsApp status',
              })
            )
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((status) => {
        this.waStatus.set(status.status);
        this.waStatusMessage.set(status.message || this.waLabel());
      });
  }

  waLabel(): string {
    const labels: Record<WhatsAppStatus['status'], string> = {
      AUTHENTICATED: 'WA Connected',
      QR_READY: 'WA QR Ready',
      INITIALIZING: 'WA Starting',
      DISCONNECTED: 'WA Disconnected',
    };
    return labels[this.waStatus()];
  }

  waBadgeTone(): { background: string; border: string; text: string; dot: string } {
    if (this.waStatus() === 'AUTHENTICATED') {
      return {
        background: 'var(--success-bg)',
        border: 'var(--success-border)',
        text: 'var(--color-text-sub)',
        dot: 'var(--success)',
      };
    }

    if (this.waStatus() === 'QR_READY' || this.waStatus() === 'INITIALIZING') {
      return {
        background: '#fffbeb',
        border: '#fde68a',
        text: '#92400e',
        dot: '#f59e0b',
      };
    }

    return {
      background: '#f8fafc',
      border: '#e2e8f0',
      text: '#64748b',
      dot: '#94a3b8',
    };
  }

  logout() {
    this.userMenuOpen.set(false);
    this.authService.logout();
  }
}
