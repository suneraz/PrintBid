/**
 * Reactive Forms (as opposed to template-driven forms with ngModel)
 * define the form's structure and validation rules here in the
 * TypeScript class, not scattered across the HTML template. The
 * proposal specifically calls for Reactive Forms, and it also scales
 * better once forms get more complex (like the register form, which
 * has two different sets of fields depending on account type).
 */

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { AuthService } from '../../core/services/auth.service';
import { AUTH_ILLUSTRATION_SVG } from '../../shared/auth-illustration';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  // inject() runs at field-initialization time, before the
  // constructor body - unlike constructor-parameter injection, which
  // wouldn't be ready yet for the "form = this.fb.group(...)" line
  // right below it.
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  illustration: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(AUTH_ILLUSTRATION_SVG);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  errorMessage = signal<string | null>(null);
  isSubmitting = signal(false);

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const { email, password } = this.form.getRawValue();

    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate([this.authService.dashboardPath()]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        // The backend gives a specific, safe-to-show message for a
        // suspended account (safe because the person already proved
        // they know the right password) - fall back to a generic
        // message for everything else, like wrong credentials.
        this.errorMessage.set(err.error?.error ?? 'Invalid email or password.');
      },
    });
  }
}
