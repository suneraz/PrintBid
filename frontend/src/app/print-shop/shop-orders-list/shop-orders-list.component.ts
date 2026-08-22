import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models/order.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-shop-orders-list',
  standalone: true,
  imports: [RouterLink, DatePipe, EmptyStateComponent],
  templateUrl: './shop-orders-list.component.html',
  styleUrl: './shop-orders-list.component.scss',
})
export class ShopOrdersListComponent implements OnInit {
  private orderService = inject(OrderService);

  orders = signal<Order[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.orderService.listMyOrdersAsShop().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
