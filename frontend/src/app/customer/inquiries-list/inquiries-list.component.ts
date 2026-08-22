import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';

import { InquiryService } from '../../core/services/inquiry.service';
import { InquirySummary } from '../../core/models/inquiry.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-inquiries-list',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, EmptyStateComponent],
  templateUrl: './inquiries-list.component.html',
  styleUrl: './inquiries-list.component.scss',
})
export class InquiriesListComponent implements OnInit {
  private inquiryService = inject(InquiryService);

  inquiries = signal<InquirySummary[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.inquiryService.listInquiries().subscribe({
      next: (data) => {
        this.inquiries.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
