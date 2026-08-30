import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

import { BidService } from '../../core/services/bid.service';
import { InquiryService } from '../../core/services/inquiry.service';
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
  private inquiryService = inject(InquiryService);
  private fb = inject(FormBuilder);

  inquiryId = Number(this.route.snapshot.paramMap.get('id'));
  inquiry = signal<OpenInquiryDetail | null>(null);
  specificationEntries = signal<[string, string | number][]>([]);
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  submitted = signal(false);

  // Sample images chosen before the bid exists yet - there's no bid
  // ID to attach them to until submitBid() actually creates it, same
  // pattern as inquiry attachments on the customer's side.
  selectedFiles = signal<File[]>([]);
  fileError = signal<string | null>(null);

  private static readonly MAX_FILES = 3;
  private static readonly MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

  form = this.fb.group({
    bid_price: ['', [Validators.required, Validators.min(1)]],
    estimated_completion_days: ['', [Validators.required, Validators.min(1)]],
    message: [''],
  });

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    this.fileError.set(null);

    for (const file of files) {
      if (this.selectedFiles().length >= InquiryBidComponent.MAX_FILES) {
        this.fileError.set(`You can attach up to ${InquiryBidComponent.MAX_FILES} sample images.`);
        break;
      }
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!['jpg', 'jpeg', 'png'].includes(extension)) {
        this.fileError.set('Only JPG and PNG images are accepted.');
        continue;
      }
      if (file.size > InquiryBidComponent.MAX_FILE_SIZE_BYTES) {
        this.fileError.set('Files must be under 8 MB.');
        continue;
      }
      this.selectedFiles.update((current) => [...current, file]);
    }
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.update((current) => current.filter((_, i) => i !== index));
  }

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

    if (this.selectedFiles().length === 0) {
      this.fileError.set('At least one sample image is required to submit a bid.');
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
        next: (bid) => this.uploadSamplesThenFinish(bid.id),
        error: (err) => {
          this.isSubmitting.set(false);
          this.submitError.set(err.error?.error ?? 'Could not submit your bid. Please try again.');
        },
      });
  }

  /**
   * Same reasoning as the customer's attachment uploads - one at a
   * time is plenty for at most 3 images, and a failed sample upload
   * doesn't roll back the bid itself, since the bid is the important
   * part and already succeeded.
   */
  private uploadSamplesThenFinish(bidId: number, index = 0): void {
    const files = this.selectedFiles();
    if (index >= files.length) {
      this.isSubmitting.set(false);
      this.submitted.set(true);
      return;
    }

    this.bidService.uploadBidAttachment(bidId, files[index]).subscribe({
      next: () => this.uploadSamplesThenFinish(bidId, index + 1),
      error: () => this.uploadSamplesThenFinish(bidId, index + 1),
    });
  }

  goToOpenInquiries(): void {
    this.router.navigate(['/print-shop/open-inquiries']);
  }

  downloadAttachment(file: { id: number; original_filename: string }): void {
    this.inquiryService.downloadAttachment(file.id, file.original_filename);
  }
}
