import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ShopServiceEntry, PortfolioItem, ShopReview } from '../models/shop-profile.model';

@Injectable({ providedIn: 'root' })
export class ShopProfileService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  listMyServices(): Observable<ShopServiceEntry[]> {
    return this.http.get<ShopServiceEntry[]>(`${this.baseUrl}/print-shops/me/services`);
  }

  updateMyServices(categoryIds: number[]): Observable<ShopServiceEntry[]> {
    return this.http.put<ShopServiceEntry[]>(`${this.baseUrl}/print-shops/me/services`, { category_ids: categoryIds });
  }

  listMyPortfolio(): Observable<PortfolioItem[]> {
    return this.http.get<PortfolioItem[]>(`${this.baseUrl}/print-shops/me/portfolio`);
  }

  uploadPortfolioItem(file: File, caption?: string): Observable<PortfolioItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    return this.http.post<PortfolioItem>(`${this.baseUrl}/print-shops/me/portfolio`, formData);
  }

  deletePortfolioItem(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/print-shops/me/portfolio/${id}`);
  }

  /**
   * The image endpoint requires the auth token, but a plain <img
   * src="..."> can't attach one - browsers don't let img tags send
   * custom headers. So instead of binding the URL directly, this
   * fetches the image as a blob through HttpClient (where the auth
   * interceptor still applies), and the component turns that into
   * an object URL to bind to [src] instead.
   */
  getPortfolioImageBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/print-shops/me/portfolio/${id}/image`, { responseType: 'blob' });
  }

  listMyReviews(): Observable<ShopReview[]> {
    return this.http.get<ShopReview[]>(`${this.baseUrl}/print-shops/me/reviews`);
  }
}
