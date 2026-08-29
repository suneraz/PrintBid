import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { AdminService } from '../../core/services/admin.service';
import { AdminInquiry, AdminBid, AdminOrder, AdminReview } from '../../core/models/admin.model';

type Tab = 'inquiries' | 'bids' | 'orders' | 'reviews';

@Component({
  selector: 'app-admin-activity',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './admin-activity.component.html',
  styleUrl: './admin-activity.component.scss',
})
export class AdminActivityComponent implements OnInit {
  private adminService = inject(AdminService);

  activeTab = signal<Tab>('inquiries');
  isLoading = signal(true);

  inquiries = signal<AdminInquiry[]>([]);
  bids = signal<AdminBid[]>([]);
  orders = signal<AdminOrder[]>([]);
  reviews = signal<AdminReview[]>([]);

  // Loaded once each, the first time their tab is opened - no need
  // to re-fetch every time someone switches tabs back and forth.
  private loaded = { inquiries: false, bids: false, orders: false, reviews: false };

  ngOnInit(): void {
    this.loadTab('inquiries');
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.loadTab(tab);
  }

  private loadTab(tab: Tab): void {
    if (this.loaded[tab]) return;

    this.isLoading.set(true);
    const done = () => {
      this.loaded[tab] = true;
      this.isLoading.set(false);
    };

    if (tab === 'inquiries') {
      this.adminService.listAllInquiries().subscribe({ next: (d) => { this.inquiries.set(d); done(); }, error: done });
    } else if (tab === 'bids') {
      this.adminService.listAllBids().subscribe({ next: (d) => { this.bids.set(d); done(); }, error: done });
    } else if (tab === 'orders') {
      this.adminService.listAllOrders().subscribe({ next: (d) => { this.orders.set(d); done(); }, error: done });
    } else {
      this.adminService.listAllReviews().subscribe({ next: (d) => { this.reviews.set(d); done(); }, error: done });
    }
  }
}
