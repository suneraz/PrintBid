import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);

  submitReview(orderId: number, rating: number, comment: string): Observable<{ id: number; print_shop_new_rating: number }> {
    return this.http.post<{ id: number; print_shop_new_rating: number }>(
      `${environment.apiUrl}/orders/${orderId}/review`,
      { rating, comment },
    );
  }
}
