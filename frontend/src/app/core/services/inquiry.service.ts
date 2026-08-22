import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InquirySummary, InquiryDetail, NerExtractResult } from '../models/inquiry.model';

@Injectable({ providedIn: 'root' })
export class InquiryService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  extractSpecification(message: string): Observable<NerExtractResult> {
    return this.http.post<NerExtractResult>(`${this.baseUrl}/ner/extract`, { message });
  }

  predictPrice(spec: Record<string, unknown>): Observable<{
    predicted_price: number;
    price_min: number;
    price_max: number;
  }> {
    return this.http.post<{ predicted_price: number; price_min: number; price_max: number }>(
      `${this.baseUrl}/price/predict`,
      spec,
    );
  }

  createInquiry(payload: Record<string, unknown>): Observable<InquiryDetail> {
    return this.http.post<InquiryDetail>(`${this.baseUrl}/inquiries`, payload);
  }

  listInquiries(): Observable<InquirySummary[]> {
    return this.http.get<InquirySummary[]>(`${this.baseUrl}/inquiries`);
  }

  getInquiry(id: number): Observable<InquiryDetail> {
    return this.http.get<InquiryDetail>(`${this.baseUrl}/inquiries/${id}`);
  }
}
