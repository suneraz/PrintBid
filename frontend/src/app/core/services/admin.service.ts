import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminUser, AdminPrintShop, AdminDispute, AdminInquiry, AdminBid, AdminOrder, AdminReview, PlatformStats } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.baseUrl}/admin/stats`);
  }

  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/admin/users`);
  }

  listPrintShops(status?: string): Observable<AdminPrintShop[]> {
    const url = status ? `${this.baseUrl}/admin/print-shops?status=${status}` : `${this.baseUrl}/admin/print-shops`;
    return this.http.get<AdminPrintShop[]>(url);
  }

  updateShopApproval(shopId: number, approvalStatus: 'approved' | 'rejected'): Observable<AdminPrintShop> {
    return this.http.patch<AdminPrintShop>(`${this.baseUrl}/admin/print-shops/${shopId}/approval`, {
      approval_status: approvalStatus,
    });
  }

  listDisputes(status?: string): Observable<AdminDispute[]> {
    const url = status ? `${this.baseUrl}/admin/disputes?status=${status}` : `${this.baseUrl}/admin/disputes`;
    return this.http.get<AdminDispute[]>(url);
  }

  resolveDispute(disputeId: number, status: 'resolved' | 'rejected', adminNotes?: string): Observable<AdminDispute> {
    return this.http.patch<AdminDispute>(`${this.baseUrl}/admin/disputes/${disputeId}`, {
      status,
      admin_notes: adminNotes,
    });
  }

  updateUserStatus(userId: number, isActive: boolean): Observable<{ id: number; email: string; is_active: boolean }> {
    return this.http.patch<{ id: number; email: string; is_active: boolean }>(
      `${this.baseUrl}/admin/users/${userId}/status`,
      { is_active: isActive },
    );
  }

  listAllInquiries(): Observable<AdminInquiry[]> {
    return this.http.get<AdminInquiry[]>(`${this.baseUrl}/admin/inquiries`);
  }

  listAllBids(): Observable<AdminBid[]> {
    return this.http.get<AdminBid[]>(`${this.baseUrl}/admin/bids`);
  }

  listAllOrders(): Observable<AdminOrder[]> {
    return this.http.get<AdminOrder[]>(`${this.baseUrl}/admin/orders`);
  }

  listAllReviews(): Observable<AdminReview[]> {
    return this.http.get<AdminReview[]>(`${this.baseUrl}/admin/reviews`);
  }
}
