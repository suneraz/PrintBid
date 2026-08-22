import { Component, OnInit, inject, signal } from '@angular/core';

import { AdminService } from '../../core/services/admin.service';
import { AdminPrintShop } from '../../core/models/admin.model';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

@Component({
  selector: 'app-admin-print-shops',
  standalone: true,
  imports: [],
  templateUrl: './admin-print-shops.component.html',
  styleUrl: './admin-print-shops.component.scss',
})
export class AdminPrintShopsComponent implements OnInit {
  private adminService = inject(AdminService);

  shops = signal<AdminPrintShop[]>([]);
  isLoading = signal(true);
  statusFilter = signal<StatusFilter>('pending');
  processingId = signal<number | null>(null);
  actionError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadShops();
  }

  setFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
    this.loadShops();
  }

  private loadShops(): void {
    this.isLoading.set(true);
    const filter = this.statusFilter();
    this.adminService.listPrintShops(filter === 'all' ? undefined : filter).subscribe({
      next: (data) => {
        this.shops.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  updateApproval(shop: AdminPrintShop, status: 'approved' | 'rejected'): void {
    this.processingId.set(shop.id);
    this.actionError.set(null);

    this.adminService.updateShopApproval(shop.id, status).subscribe({
      next: () => {
        this.processingId.set(null);
        this.loadShops();
      },
      error: (err) => {
        this.processingId.set(null);
        this.actionError.set(err.error?.error ?? 'Could not update this shop.');
      },
    });
  }
}
