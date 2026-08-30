import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { ShopProfileService } from '../../core/services/shop-profile.service';
import { ShopReview } from '../../core/models/shop-profile.model';

@Component({
  selector: 'app-my-shop',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './my-shop.component.html',
  styleUrl: './my-shop.component.scss',
})
export class MyShopComponent implements OnInit {
  private shopProfileService = inject(ShopProfileService);

  reviews = signal<ShopReview[]>([]);
  averageRating = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return null;
    return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
  });

  ngOnInit(): void {
    this.shopProfileService.listMyReviews().subscribe((data) => this.reviews.set(data));
  }
}
