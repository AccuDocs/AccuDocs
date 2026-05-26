import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoginFacade } from './login.facade';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroEnvelopeSolid,
  heroLockClosedSolid,
  heroEyeSolid,
  heroEyeSlashSolid,
  heroShieldCheckSolid,
  heroCheckCircleSolid
} from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [
    LoginFacade,
    provideIcons({
      heroEnvelopeSolid,
      heroLockClosedSolid,
      heroEyeSolid,
      heroEyeSlashSolid,
      heroShieldCheckSolid,
      heroCheckCircleSolid
    })
  ],
  template: `
    <div class="flex min-h-screen bg-white dark:bg-[#081321]">
      <!-- Left Column: Decorative Panel (Hidden on mobile) -->
      <div class="hidden lg:flex w-1/2 bg-[#0F1E35] relative overflow-hidden flex-col justify-center px-12 xl:px-20">
        <!-- Abstract Grid Pattern -->
        <div class="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div class="relative z-10">
          <div class="flex items-center gap-4 mb-12">
            <div class="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-2xl shadow-primary/20">
              <ng-icon name="heroShieldCheckSolid" size="36"></ng-icon>
            </div>
            <div>
              <h1 class="text-4xl font-semibold text-white">AccuDocs</h1>
              <p class="text-primary-300 font-medium uppercase tracking-[0.12em] text-xs mt-1">Smart Accounting. Clear Books.</p>
            </div>
          </div>

          <h2 class="text-3xl font-bold text-slate-200 mb-8 leading-tight">
            Smart accounting workflows for clear books.
          </h2>

          <div class="space-y-6">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-primary-300">
                <ng-icon name="heroCheckCircleSolid" size="20"></ng-icon>
              </div>
              <div>
                <p class="text-slate-100 font-semibold">Smart Workspace</p>
                <p class="text-slate-400 text-sm">Effortless organization and management for your files.</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-primary-300">
                <ng-icon name="heroCheckCircleSolid" size="20"></ng-icon>
              </div>
              <div>
                <p class="text-slate-100 font-semibold">Advanced Security</p>
                <p class="text-slate-400 text-sm">Industry-standard encryption to keep your data safe.</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-primary-300">
                <ng-icon name="heroCheckCircleSolid" size="20"></ng-icon>
              </div>
              <div>
                <p class="text-slate-100 font-semibold">Real-time Collaboration</p>
                <p class="text-slate-400 text-sm">Seamlessly share and work together with your team.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Decoration -->
        <div class="absolute bottom-12 left-12 xl:left-20 text-slate-500 text-sm font-medium">
          &copy; 2026 AccuDocs Platform | Secure & Encrypted
        </div>
      </div>

      <!-- Right Column: Login Form -->
      <div class="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 bg-slate-50 dark:bg-[#081321]">
        <div class="max-w-md w-full mx-auto">
          <div class="mb-10 text-center lg:text-left">
            <h3 class="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">Welcome back</h3>
            <p class="text-slate-500 dark:text-slate-400 font-medium">Sign in to your AccuDocs account</p>
          </div>

          <form class="space-y-6" (ngSubmit)="facade.login()">
            <div>
              <label class="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Email or Phone</label>
              <div class="relative group">
                <ng-icon name="heroEnvelopeSolid" size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors"></ng-icon>
                <input 
                  id="identifier"
                  name="identifier"
                  type="text" 
                  autocomplete="username"
                  [(ngModel)]="facade.form.value().identifier"
                  placeholder="name@company.com or phone"
                  class="w-full h-12 pl-12 pr-4 bg-white dark:bg-[#14243C] border border-[#D0D7DE] dark:border-[#2D405E] rounded-md outline-none focus:border-primary-600 focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] transition-all font-medium text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  [class.border-red-500]="facade.form.errors().identifier"
                />
              </div>
              @if (facade.form.errors().identifier) {
                <div class="mt-2 text-xs font-bold text-red-500">
                  {{ facade.form.errors().identifier?.[0] }}
                </div>
              }
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-bold text-slate-700 dark:text-slate-200">Password</label>
                <a href="#" class="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors">Forgot password?</a>
              </div>
              <div class="relative group">
                <ng-icon name="heroLockClosedSolid" size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors"></ng-icon>
                <input 
                  id="password"
                  name="password"
                  [type]="facade.hidePassword() ? 'password' : 'text'" 
                  [(ngModel)]="facade.form.value().password"
                  placeholder="••••••••"
                  class="w-full h-12 pl-12 pr-12 bg-white dark:bg-[#14243C] border border-[#D0D7DE] dark:border-[#2D405E] rounded-md outline-none focus:border-primary-600 focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] transition-all font-medium text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  [class.border-red-500]="facade.form.errors().password"
                />
                <button 
                  type="button"
                  (click)="facade.hidePassword.set(!facade.hidePassword())"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ng-icon [name]="facade.hidePassword() ? 'heroEyeSolid' : 'heroEyeSlashSolid'" size="20"></ng-icon>
                </button>
              </div>
              @if (facade.form.errors().password) {
                <div class="mt-2 text-xs font-bold text-red-500">
                  {{ facade.form.errors().password?.[0] }}
                </div>
              }
            </div>

            <div class="flex items-center gap-2">
              <input 
                id="remember" 
                name="remember"
                type="checkbox" 
                class="w-4 h-4 rounded border-slate-300 dark:border-[#2D405E] dark:bg-[#14243C] text-primary-600 focus:ring-primary-600/20 cursor-pointer"
              />
              <label for="remember" class="text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">Remember me</label>
            </div>

            <button 
              type="submit" 
              [disabled]="facade.form.isSubmitting()"
              class="w-full h-12 bg-primary-600 text-white rounded-md font-medium flex items-center justify-center gap-3 hover:bg-[#1E3A8A] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/20"
            >
              @if (!facade.form.isSubmitting()) {
                <span>Sign In to Portal</span>
              } @else {
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              }
            </button>
          </form>

          <div class="mt-12 text-center">
            <p class="text-sm text-slate-400 dark:text-slate-500 font-medium flex items-center justify-center gap-2">
              <ng-icon name="heroShieldCheckSolid" size="16"></ng-icon>
              Secure 256-bit SSL encrypted access
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .animate-in { animation-fill-mode: both; }
    .fade-in { animation: fadeIn 0.4s ease-out; }
    .slide-in-from-top-2 { animation: slideInFromTop 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideInFromTop { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  facade = inject(LoginFacade);
}
