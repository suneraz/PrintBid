import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { OrderService } from '../../core/services/order.service';
import { ReviewService } from '../../core/services/review.service';
import { Order, OrderStatus } from '../../core/models/order.model';
import { IconComponent } from '../../shared/components/icon/icon.component';

const ORDER_STAGES: OrderStatus[] = ['Confirmed', 'In Production', 'Ready', 'Dispatched', 'Delivered', 'Completed'];

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, IconComponent],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss',
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private reviewService = inject(ReviewService);

  orderId = Number(this.route.snapshot.paramMap.get('id'));
  order = signal<Order | null>(null);
  stages = ORDER_STAGES;

  rating = signal(5);
  comment = signal('');
  reviewSubmitted = signal(false);
  reviewError = signal<string | null>(null);
  isSubmittingReview = signal(false);

  ngOnInit(): void {
    this.orderService.listMyOrders().subscribe((orders) => {
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

  setRating(value: number): void {
    this.rating.set(value);
  }

  submitReview(): void {
    this.isSubmittingReview.set(true);
    this.reviewError.set(null);

    this.reviewService.submitReview(this.orderId, this.rating(), this.comment()).subscribe({
      next: () => {
        this.isSubmittingReview.set(false);
        this.reviewSubmitted.set(true);
      },
      error: (err) => {
        this.isSubmittingReview.set(false);
        this.reviewError.set(err.error?.error ?? 'Could not submit review.');
      },
    });
  }
}
