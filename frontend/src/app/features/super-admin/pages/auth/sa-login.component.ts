import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SuperAdminAuthService } from '../../services/sa-auth.service';
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
  selector: 'app-sa-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgIconComponent],
  providers: [
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
    <div class="flex min-h-screen bg-white">
      <!-- Left Column: Decorative Panel (Hidden on mobile) -->
      <div class="hidden lg:flex w-1/2 bg-[#0f172a] relative overflow-hidden flex-col justify-center px-20">
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
            <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 rotate-3">
              <ng-icon name="heroShieldCheckSolid" size="36"></ng-icon>
            </div>
            <div>
              <h1 class="text-4xl font-black text-white tracking-tight">AccuDocs</h1>
              <p class="text-indigo-400 font-bold uppercase tracking-[0.2em] text-xs mt-1">Super Admin Portal</p>
            </div>
          </div>

          <h2 class="text-3xl font-bold text-slate-200 mb-8 leading-tight">
            Centralized Command Hub for <br/> Platform Operations.
          </h2>

          <div class="space-y-6">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
                <ng-icon name="heroCheckCircleSolid" size="20"></ng-icon>
              </div>
              <div>
                <p class="text-slate-100 font-semibold">Platform Control</p>
                <p class="text-slate-400 text-sm">Manage organizations, roles, and global configurations.</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
                <ng-icon name="heroCheckCircleSolid" size="20"></ng-icon>
              </div>
              <div>
                <p class="text-slate-100 font-semibold">Advanced Analytics</p>
                <p class="text-slate-400 text-sm">Real-time monitoring of MRR, growth, and usage metrics.</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
                <ng-icon name="heroCheckCircleSolid" size="20"></ng-icon>
              </div>
              <div>
                <p class="text-slate-100 font-semibold">Multi-tenant Management</p>
                <p class="text-slate-400 text-sm">Oversee all CA firms with seamless impersonation tools.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Decoration -->
        <div class="absolute bottom-12 left-20 text-slate-500 text-sm font-medium">
          &copy; 2026 AccuDocs SaaS Platform • Version 2.4.0
        </div>
      </div>

      <!-- Right Column: Login Form -->
      <div class="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 bg-slate-50">
        <div class="max-w-md w-full mx-auto">
          <div class="mb-10 text-center lg:text-left">
            <h3 class="text-3xl font-bold text-slate-900 mb-2">Welcome back</h3>
            <p class="text-slate-500 font-medium">Sign in to your super admin account</p>
          </div>

          <!-- Error Alert -->
          <div *ngIf="errorMessage()" class="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
            <div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
               <ng-icon name="heroLockClosedSolid" size="18"></ng-icon>
            </div>
            <p class="text-sm font-semibold">{{ errorMessage() }}</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <div class="relative group">
                <ng-icon name="heroEnvelopeSolid" size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></ng-icon>
                <input 
                  type="email" 
                  formControlName="email"
                  placeholder="admin@accudocs.in"
                  class="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium text-slate-900"
                />
              </div>
              <div *ngIf="loginForm.get('email')?.touched && loginForm.get('email')?.invalid" class="mt-2 text-xs font-bold text-red-500">
                Please enter a valid email address
              </div>
            </div>

            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <div class="relative group">
                <ng-icon name="heroLockClosedSolid" size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></ng-icon>
                <input 
                  [type]="showPassword() ? 'text' : 'password'" 
                  formControlName="password"
                  placeholder="••••••••"
                  class="w-full h-12 pl-12 pr-12 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium text-slate-900"
                />
                <button 
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ng-icon [name]="showPassword() ? 'heroEyeSlashSolid' : 'heroEyeSolid'" size="20"></ng-icon>
                </button>
              </div>
              <div *ngIf="loginForm.get('password')?.touched && loginForm.get('password')?.invalid" class="mt-2 text-xs font-bold text-red-500">
                Password is required
              </div>
            </div>

            <button 
              type="submit" 
              [disabled]="loginForm.invalid || isLoading()"
              class="w-full h-12 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-indigo-600/20"
            >
              <span *ngIf="!isLoading()">Sign In to Portal</span>
              <div *ngIf="isLoading()" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </button>
          </form>

          <div class="mt-12 text-center">
            <p class="text-sm text-slate-400 font-medium">
              Confidential Access. Unauthorized entry is strictly prohibited and monitored.
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
  `]
})
export class SALoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(SuperAdminAuthService);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login(email!, password!).subscribe({
      next: (res) => {
        if (res.success) {
          this.router.navigate(['/super-admin/dashboard']);
        } else {
          this.errorMessage.set(res.message || 'Login failed');
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Invalid credentials or server error';
        this.errorMessage.set(errorMsg);
        this.isLoading.set(false);
      }
    });
  }
}
