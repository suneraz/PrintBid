import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { BidService, MyBidSummary } from '../../core/services/bid.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-my-bids',
  standalone: true,
  imports: [DatePipe, DecimalPipe, EmptyStateComponent],
  templateUrl: './my-bids.component.html',
  styleUrl: './my-bids.component.scss',
})
export class MyBidsComponent implements OnInit {
  private bidService = inject(BidService);

  bids = signal<MyBidSummary[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.bidService.listMyBids().subscribe({
      next: (data) => {
        this.bids.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
