import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Order, OrderStatus } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  listMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders`);
  }

  // --- Print shop side ---

  listMyOrdersAsShop(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/print-shops/me/orders`);
  }

  updateOrderStatus(orderId: number, status: OrderStatus, note?: string): Observable<Order> {
    return this.http.patch<Order>(`${this.baseUrl}/orders/${orderId}/status`, { status, note });
  }

  confirmCompletion(orderId: number): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders/${orderId}/confirm-completion`, {});
  }
}
