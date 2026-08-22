import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Bid } from '../models/bid.model';
import { Order } from '../models/order.model';
import { OpenInquirySummary, OpenInquiryDetail } from '../models/inquiry.model';

export interface MyBidSummary {
  id: number;
  inquiry_id: number;
  print_category: string;
  bid_price: number;
  estimated_completion_days: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class BidService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  listBidsForInquiry(inquiryId: number): Observable<Bid[]> {
    return this.http.get<Bid[]>(`${this.baseUrl}/inquiries/${inquiryId}/bids`);
  }

  acceptBid(bidId: number): Observable<{ message: string; bid_id: number; suggested_advance_amount: number }> {
    return this.http.post<{ message: string; bid_id: number; suggested_advance_amount: number }>(
      `${this.baseUrl}/bids/${bidId}/accept`,
      {},
    );
  }

  simulatePayment(bidId: number): Observable<{ message: string; order: Order }> {
    return this.http.post<{ message: string; order: Order }>(`${this.baseUrl}/bids/${bidId}/simulate-payment`, {});
  }

  // --- Print shop side ---

  listOpenInquiries(): Observable<OpenInquirySummary[]> {
    return this.http.get<OpenInquirySummary[]>(`${this.baseUrl}/print-shops/me/open-inquiries`);
  }

  getOpenInquiry(inquiryId: number): Observable<OpenInquiryDetail> {
    return this.http.get<OpenInquiryDetail>(`${this.baseUrl}/print-shops/me/open-inquiries/${inquiryId}`);
  }

  submitBid(inquiryId: number, data: { bid_price: number; estimated_completion_days: number; message?: string }): Observable<Bid> {
    return this.http.post<Bid>(`${this.baseUrl}/inquiries/${inquiryId}/bids`, data);
  }

  listMyBids(): Observable<MyBidSummary[]> {
    return this.http.get<MyBidSummary[]>(`${this.baseUrl}/print-shops/me/bids`);
  }
}
