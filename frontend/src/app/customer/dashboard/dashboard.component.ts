import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { InquiryService } from '../../core/services/inquiry.service';
import { OrderService } from '../../core/services/order.service';
import { InquirySummary } from '../../core/models/inquiry.model';
import { Order } from '../../core/models/order.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [RouterLink, StatCardComponent, EmptyStateComponent, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class CustomerDashboardComponent implements OnInit {
  inquiries = signal<InquirySummary[]>([]);
  orders = signal<Order[]>([]);
  isLoading = signal(true);

  activeInquiriesCount = computed(
    () => this.inquiries().filter((i) => i.status === 'submitted').length,
  );
  ordersInProgressCount = computed(
    () => this.orders().filter((o) => !['Completed', 'Cancelled'].includes(o.status)).length,
  );
  completedOrdersCount = computed(
    () => this.orders().filter((o) => o.status === 'Completed').length,
  );

  recentInquiries = computed(() => this.inquiries().slice(0, 6));

  constructor(
    private inquiryService: InquiryService,
    private orderService: OrderService,
  ) {}

  ngOnInit(): void {
    this.inquiryService.listInquiries().subscribe((data) => this.inquiries.set(data));
    this.orderService.listMyOrders().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  formatPriceRange(min: number, max: number): string {
    return `LKR ${Math.round(min).toLocaleString()} - ${Math.round(max).toLocaleString()}`;
  }
}
