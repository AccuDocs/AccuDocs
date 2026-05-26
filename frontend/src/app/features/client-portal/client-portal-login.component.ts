import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroBuildingOffice2Solid,
  heroCheckCircleSolid,
  heroDevicePhoneMobileSolid,
  heroEyeSlashSolid,
  heroEyeSolid,
  heroKeySolid,
  heroShieldCheckSolid,
} from '@ng-icons/heroicons/solid';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-client-portal-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      heroBuildingOffice2Solid,
      heroCheckCircleSolid,
      heroDevicePhoneMobileSolid,
      heroEyeSlashSolid,
      heroEyeSolid,
      heroKeySolid,
      heroShieldCheckSolid,
    }),
  ],
  template: `
    <main class="client-login">
      <section class="login-story">
        <div class="brand">
          <span>
            <ng-icon name="heroBuildingOffice2Solid" size="24"></ng-icon>
          </span>
          <div>
            <strong>AccuDocs</strong>
            <small>Client Portal</small>
          </div>
        </div>

        <div class="story-copy">
          <p class="eyebrow">For client firms</p>
          <h1>Upload documents, track GST work, and view CA invoices in one place.</h1>
          <div class="story-points">
            <span><ng-icon name="heroCheckCircleSolid" size="17"></ng-icon> Mobile number access</span>
            <span><ng-icon name="heroCheckCircleSolid" size="17"></ng-icon> Password from your CA profile</span>
            <span><ng-icon name="heroCheckCircleSolid" size="17"></ng-icon> Connected to your CA firm</span>
          </div>
        </div>
      </section>

      <section class="login-panel">
        <div class="login-card">
          <div class="card-head">
            <p class="eyebrow">Client login</p>
            <h2>Welcome back</h2>
            <p>Use the mobile number and password your CA firm added to your client profile.</p>
          </div>

          <form (ngSubmit)="login()" class="login-form">
            <label>
              <span>Mobile number</span>
              <div class="input-wrap">
                <ng-icon name="heroDevicePhoneMobileSolid" size="18"></ng-icon>
                <input
                  name="mobile"
                  type="tel"
                  autocomplete="tel"
                  [(ngModel)]="mobile"
                  placeholder="99999 99999"
                  [disabled]="isSubmitting()"
                />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div class="input-wrap">
                <ng-icon name="heroKeySolid" size="18"></ng-icon>
                <input
                  name="password"
                  [type]="hidePassword() ? 'password' : 'text'"
                  autocomplete="current-password"
                  [(ngModel)]="password"
                  placeholder="Enter password"
                  [disabled]="isSubmitting()"
                />
                <button
                  type="button"
                  class="icon-button"
                  (click)="togglePasswordVisibility()"
                  [disabled]="isSubmitting()"
                  [attr.aria-label]="hidePassword() ? 'Show password' : 'Hide password'"
                >
                  <ng-icon [name]="hidePassword() ? 'heroEyeSolid' : 'heroEyeSlashSolid'" size="18"></ng-icon>
                </button>
              </div>
            </label>

            <button type="submit" [disabled]="isSubmitting() || !mobile.trim() || !password">
              @if (isSubmitting()) {
                <span class="spinner"></span>
              } @else {
                Open client portal
              }
            </button>
          </form>

          <div class="security-note">
            <ng-icon name="heroShieldCheckSolid" size="16"></ng-icon>
            Client users sign in here. CA/admin users should use the firm login page.
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .client-login {
      display: grid;
      grid-template-columns: minmax(420px, 0.9fr) minmax(0, 1.1fr);
      min-height: 100vh;
      background: #f8fafc;
      color: #0f172a;
    }

    .login-story {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      padding: 48px;
      background: #0f172a;
      color: #e2e8f0;
    }

    .login-story::before {
      position: absolute;
      inset: 0;
      content: '';
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
      background-size: 42px 42px;
      opacity: 0.5;
    }

    .brand,
    .story-copy {
      position: relative;
      z-index: 1;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand span {
      display: grid;
      width: 48px;
      height: 48px;
      place-items: center;
      border-radius: 10px;
      background: #2563eb;
      color: #ffffff;
    }

    .brand strong,
    .brand small {
      display: block;
    }

    .brand strong {
      font-size: 24px;
      font-weight: 900;
    }

    .brand small {
      color: #93c5fd;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .story-copy h1 {
      max-width: 620px;
      margin: 0;
      font-size: 38px;
      line-height: 1.12;
      font-weight: 900;
      letter-spacing: 0;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: #64748b;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .login-story .eyebrow {
      color: #93c5fd;
    }

    .story-points {
      display: grid;
      gap: 12px;
      margin-top: 28px;
    }

    .story-points span {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #cbd5e1;
      font-weight: 700;
    }

    .story-points ng-icon {
      color: #60a5fa;
    }

    .login-panel {
      display: grid;
      place-items: center;
      padding: 32px;
    }

    .login-card {
      width: min(100%, 440px);
      padding: 30px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
    }

    .card-head h2 {
      margin: 0;
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 0;
    }

    .card-head p {
      margin: 10px 0 0;
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }

    .login-form {
      display: grid;
      gap: 18px;
      margin-top: 26px;
    }

    label > span {
      display: block;
      margin-bottom: 8px;
      color: #334155;
      font-size: 13px;
      font-weight: 800;
    }

    .input-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 48px;
      padding: 0 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      color: #64748b;
    }

    .input-wrap:focus-within {
      border-color: #2563eb;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    }

    input {
      min-width: 0;
      width: 100%;
      border: 0;
      outline: 0;
      background: transparent;
      color: #0f172a;
      font-weight: 700;
    }

    .icon-button {
      display: grid;
      width: 34px;
      height: 34px;
      flex: 0 0 34px;
      place-items: center;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #64748b;
    }

    .icon-button:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .login-form button[type='submit'] {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      border: 0;
      border-radius: 8px;
      background: #2563eb;
      color: #ffffff;
      font-weight: 900;
      transition: 160ms ease;
    }

    .login-form button[type='submit']:disabled,
    .icon-button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #ffffff;
      border-radius: 999px;
      animation: spin 700ms linear infinite;
    }

    .security-note {
      display: flex;
      gap: 9px;
      margin-top: 24px;
      color: #64748b;
      font-size: 12px;
      line-height: 1.5;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 920px) {
      .client-login {
        grid-template-columns: 1fr;
      }

      .login-story {
        min-height: 360px;
      }
    }

    @media (max-width: 560px) {
      .login-story,
      .login-panel {
        padding: 22px;
      }

      .story-copy h1 {
        font-size: 30px;
      }

      .login-card {
        padding: 22px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientPortalLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isSubmitting = signal(false);
  readonly hidePassword = signal(true);
  mobile = '';
  password = '';

  login(): void {
    const mobile = this.normalizeMobile(this.mobile);
    const password = this.password;

    if (!mobile || !password) {
      return;
    }

    this.isSubmitting.set(true);
    this.auth.clientLogin(mobile, password).subscribe({
      next: (response) => {
        if (response.data.user.role !== 'client') {
          this.notify.warning('This login is for client users. Opening your firm dashboard instead.');
          this.router.navigateByUrl('/dashboard');
          return;
        }

        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/client-portal';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error) => this.notify.error(error?.message || 'Invalid mobile number or password'),
      complete: () => this.isSubmitting.set(false),
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update((value) => !value);
  }

  private normalizeMobile(value: string): string {
    const trimmed = value.trim();
    const digits = trimmed.replace(/\D/g, '');

    if (digits.length === 10) {
      return `+91${digits}`;
    }

    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }

    return trimmed;
  }
}
