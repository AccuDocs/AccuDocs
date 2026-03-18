import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';
import { z } from 'zod';
import { createFormState } from '@shared/utils/validation.util';

const LoginSchema = z.object({
  identifier: z.string().min(1, 'Email or Phone is required').refine(val => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const isPhone = /^\+?[1-9]\d{7,14}$/.test(val);
    return isEmail || isPhone;
  }, 'Invalid email or phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginData = z.infer<typeof LoginSchema>;

@Injectable()
export class LoginFacade {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  form = createFormState<LoginData>({ identifier: '', password: '' }, LoginSchema);
  hidePassword = signal(true);

  async login() {
    if (!this.form.validate()) return;

    this.form.isSubmitting.set(true);
    const { identifier, password } = this.form.value();

    this.authService.adminLogin(identifier, password).subscribe({
      next: () => {
        this.notification.success('Login successful!');
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl).catch(err => {
          console.error('Redirect failed:', err);
          this.router.navigate(['/dashboard']);
        });
      },
      error: (err) => {
        this.notification.error(err.message || 'Login failed');
        this.form.isSubmitting.set(false);
      },
      complete: () => this.form.isSubmitting.set(false),
    });
  }
}
