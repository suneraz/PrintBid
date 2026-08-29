import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus } from '../../core/models/order.model';
import { IconComponent } from '../../shared/components/icon/icon.component';

const ORDER_STAGES: OrderStatus[] = ['Confirmed', 'In Production', 'Ready', 'Dispatched', 'Delivered', 'Completed'];

@Component({
  selector: 'app-shop-order-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, IconComponent],
  templateUrl: './shop-order-detail.component.html',
  styleUrl: './shop-order-detail.component.scss',
})
export class ShopOrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);

  orderId = Number(this.route.snapshot.paramMap.get('id'));
  order = signal<Order | null>(null);
  stages = ORDER_STAGES;

  isUpdating = signal(false);
  updateError = signal<string | null>(null);
  note = signal('');

  // The one obvious next step, if there is one - null once the order
  // reaches Delivered (the shop's part is done at that point; only
  // the customer can take it to Completed from here) or a terminal
  // state (Completed or Cancelled).
  nextStage = computed<OrderStatus | null>(() => {
    const order = this.order();
    if (!order || ['Cancelled', 'Completed', 'Delivered'].includes(order.status)) return null;
    const currentIndex = this.stages.indexOf(order.status);
    return this.stages[currentIndex + 1] ?? null;
  });

  // Shown once the shop has done everything it can - waiting on the
  // customer to confirm receipt before the order is truly finished.
  awaitingCustomerConfirmation = computed(() => this.order()?.status === 'Delivered');

  ngOnInit(): void {
    this.loadOrder();
  }

  private loadOrder(): void {
    this.orderService.listMyOrdersAsShop().subscribe((orders) => {
      this.order.set(orders.find((o) => o.id === this.orderId) ?? null);
    });
  }

  stageState(stage: OrderStatus): 'done' | 'current' | 'pending' {
    const order = this.order();
    if (!order || order.status === 'Cancelled') return 'pending';
    const currentIndex = this.stages.indexOf(order.status);
    const stageIndex = this.stages.indexOf(stage);
    if (stageIndex < currentIndex) return 'done';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  }

  advanceStatus(): void {
    const next = this.nextStage();
    if (!next) return;
    this.setStatus(next);
  }

  cancelOrder(): void {
    if (!confirm('Cancel this order? This cannot be undone.')) return;
    this.setStatus('Cancelled');
  }

  private setStatus(status: OrderStatus): void {
    this.isUpdating.set(true);
    this.updateError.set(null);

    this.orderService.updateOrderStatus(this.orderId, status, this.note() || undefined).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.note.set('');
        this.loadOrder();
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.updateError.set(err.error?.error ?? 'Could not update order status.');
      },
    });
  }
}
