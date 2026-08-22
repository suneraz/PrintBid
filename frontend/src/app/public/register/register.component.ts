import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { AuthService } from '../../core/services/auth.service';
import { AUTH_ILLUSTRATION_SVG } from '../../shared/auth-illustration';

type AccountType = 'customer' | 'print_shop';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  illustration: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(AUTH_ILLUSTRATION_SVG);

  accountType = signal<AccountType>('customer');
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isSubmitting = signal(false);

  customerForm = this.fb.group({
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phone: [''],
    default_location: [''],
  });

  shopForm = this.fb.group({
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phone: [''],
    business_name: ['', Validators.required],
    business_address: [''],
    district: [''],
  });

  setAccountType(type: AccountType): void {
    this.accountType.set(type);
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    const isCustomer = this.accountType() === 'customer';
    const form = isCustomer ? this.customerForm : this.shopForm;

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const request = isCustomer
      ? this.authService.registerCustomer(this.customerForm.getRawValue() as any)
      : this.authService.registerPrintShop(this.shopForm.getRawValue() as any);

    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set(
          isCustomer
            ? 'Account created. You can log in now.'
            : 'Account created. A shop admin needs to approve your account before you can bid.',
        );
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error ?? 'Could not create account. Check your details and try again.');
      },
    });
  }
}
