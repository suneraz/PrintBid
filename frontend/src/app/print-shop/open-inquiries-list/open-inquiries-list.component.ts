import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';

import { BidService } from '../../core/services/bid.service';
import { OpenInquirySummary } from '../../core/models/inquiry.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-open-inquiries-list',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, EmptyStateComponent],
  templateUrl: './open-inquiries-list.component.html',
  styleUrl: './open-inquiries-list.component.scss',
})
export class OpenInquiriesListComponent implements OnInit {
  private bidService = inject(BidService);

  inquiries = signal<OpenInquirySummary[]>([]);
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.bidService.listOpenInquiries().subscribe({
      next: (data) => {
        this.inquiries.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loadError.set(err.error?.error ?? 'Could not load inquiries.');
      },
    });
  }
}
