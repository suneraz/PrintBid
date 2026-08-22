import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

import { BidService } from '../../core/services/bid.service';
import { OpenInquiryDetail } from '../../core/models/inquiry.model';

@Component({
  selector: 'app-shop-inquiry-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, DecimalPipe],
  templateUrl: './inquiry-bid.component.html',
  styleUrl: './inquiry-bid.component.scss',
})
export class InquiryBidComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bidService = inject(BidService);
  private fb = inject(FormBuilder);

  inquiryId = Number(this.route.snapshot.paramMap.get('id'));
  inquiry = signal<OpenInquiryDetail | null>(null);
  specificationEntries = signal<[string, string | number][]>([]);
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  submitted = signal(false);

  form = this.fb.group({
    bid_price: ['', [Validators.required, Validators.min(1)]],
    estimated_completion_days: ['', [Validators.required, Validators.min(1)]],
    message: [''],
  });

  ngOnInit(): void {
    this.bidService.getOpenInquiry(this.inquiryId).subscribe({
      next: (data) => {
        this.inquiry.set(data);
        const entries = Object.entries(data.specification).filter(
          ([, v]) => v !== undefined && v !== null && v !== '',
        ) as [string, string | number][];
        this.specificationEntries.set(entries);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loadError.set(err.error?.error ?? 'This inquiry is no longer available.');
      },
    });
  }

  submitBid(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const { bid_price, estimated_completion_days, message } = this.form.getRawValue();

    this.bidService
      .submitBid(this.inquiryId, {
        bid_price: Number(bid_price),
        estimated_completion_days: Number(estimated_completion_days),
        message: message || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitted.set(true);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.submitError.set(err.error?.error ?? 'Could not submit your bid. Please try again.');
        },
      });
  }

  goToOpenInquiries(): void {
    this.router.navigate(['/print-shop/open-inquiries']);
  }
}
