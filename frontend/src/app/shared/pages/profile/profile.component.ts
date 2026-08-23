import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  isCustomer = false;
  isLoading = signal(true);
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  saved = signal(false);

  form = this.fb.group({
    full_name: ['', Validators.required],
    phone: [''],
    default_location: [''],
  });

  ngOnInit(): void {
    this.authService.getMe().subscribe({
      next: (user) => {
        this.isCustomer = user.role === 'customer';
        this.form.patchValue({
          full_name: user.full_name,
          phone: user.phone ?? '',
          default_location: user.default_location ?? '',
        });
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    this.saved.set(false);

    const { full_name, phone, default_location } = this.form.getRawValue();
    const payload: { full_name?: string; phone?: string; default_location?: string } = {
      full_name: full_name ?? undefined,
      phone: phone ?? undefined,
    };
    if (this.isCustomer) {
      payload.default_location = default_location ?? undefined;
    }

    this.authService.updateProfile(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saved.set(true);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveError.set(err.error?.error ?? 'Could not save your changes. Please try again.');
      },
    });
  }
}
