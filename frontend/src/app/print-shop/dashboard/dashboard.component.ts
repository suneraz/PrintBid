import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';

import { BidService, MyBidSummary } from '../../core/services/bid.service';
import { OrderService } from '../../core/services/order.service';
import { OpenInquirySummary } from '../../core/models/inquiry.model';
import { Order } from '../../core/models/order.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-shop-dashboard',
  standalone: true,
  imports: [RouterLink, StatCardComponent, EmptyStateComponent, DecimalPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class ShopDashboardComponent implements OnInit {
  private bidService = inject(BidService);
  private orderService = inject(OrderService);

  openInquiries = signal<OpenInquirySummary[]>([]);
  myBids = signal<MyBidSummary[]>([]);
  orders = signal<Order[]>([]);
  isLoading = signal(true);

  openInquiriesCount = computed(() => this.openInquiries().filter((i) => !i.already_bid).length);
  pendingBidsCount = computed(() => this.myBids().filter((b) => b.status === 'pending').length);
  activeOrdersCount = computed(() => this.orders().filter((o) => !['Completed', 'Cancelled'].includes(o.status)).length);
  completedOrdersCount = computed(() => this.orders().filter((o) => o.status === 'Completed').length);

  recentInquiries = computed(() => this.openInquiries().slice(0, 5));

  ngOnInit(): void {
    this.bidService.listOpenInquiries().subscribe((data) => this.openInquiries.set(data));
    this.bidService.listMyBids().subscribe((data) => this.myBids.set(data));
    this.orderService.listMyOrdersAsShop().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
