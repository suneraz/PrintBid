import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { OrderService } from '../../core/services/order.service';
import { ReviewService } from '../../core/services/review.service';
import { DisputeService } from '../../core/services/dispute.service';
import { Order, OrderStatus } from '../../core/models/order.model';
import { Dispute } from '../../core/models/dispute.model';
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
  private disputeService = inject(DisputeService);

  orderId = Number(this.route.snapshot.paramMap.get('id'));
  order = signal<Order | null>(null);
  stages = ORDER_STAGES;

  rating = signal(5);
  comment = signal('');
  reviewSubmitted = signal(false);
  reviewError = signal<string | null>(null);
  isSubmittingReview = signal(false);

  disputes = signal<Dispute[]>([]);
  showDisputeForm = signal(false);
  disputeDescription = signal('');
  isSubmittingDispute = signal(false);
  disputeError = signal<string | null>(null);

  isConfirmingCompletion = signal(false);
  confirmError = signal<string | null>(null);

  // The customer's own confirmation step, separate from the shop's
  // status updates - only shown once the shop has actually marked
  // the order Delivered, since confirming before then wouldn't mean
  // anything.
  canConfirmCompletion = computed(() => this.order()?.status === 'Delivered');

  // A new dispute can be raised unless there's already one sitting
  // open - no point letting someone stack up several open reports
  // about the same order before the first is even looked at.
  hasOpenDispute = computed(() => this.disputes().some((d) => d.status === 'open'));

  ngOnInit(): void {
    this.loadOrder();
    this.loadDisputes();
  }

  private loadOrder(): void {
    this.orderService.listMyOrders().subscribe((orders) => {
      this.order.set(orders.find((o) => o.id === this.orderId) ?? null);
    });
  }

  confirmCompletion(): void {
    if (!confirm("Confirm you've received this order? This closes it out and unlocks leaving a review.")) return;

    this.isConfirmingCompletion.set(true);
    this.confirmError.set(null);

    this.orderService.confirmCompletion(this.orderId).subscribe({
      next: () => {
        this.isConfirmingCompletion.set(false);
        this.loadOrder();
      },
      error: (err) => {
        this.isConfirmingCompletion.set(false);
        this.confirmError.set(err.error?.error ?? 'Could not confirm completion.');
      },
    });
  }

  private loadDisputes(): void {
    this.disputeService.listForOrder(this.orderId).subscribe((data) => this.disputes.set(data));
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

  submitDispute(): void {
    const description = this.disputeDescription().trim();
    if (!description) {
      this.disputeError.set('Please describe the issue.');
      return;
    }

    this.isSubmittingDispute.set(true);
    this.disputeError.set(null);

    this.disputeService.raise(this.orderId, description).subscribe({
      next: () => {
        this.isSubmittingDispute.set(false);
        this.disputeDescription.set('');
        this.showDisputeForm.set(false);
        this.loadDisputes();
      },
      error: (err) => {
        this.isSubmittingDispute.set(false);
        this.disputeError.set(err.error?.errors?.description?.[0] ?? err.error?.error ?? 'Could not submit your report.');
      },
    });
  }
}
