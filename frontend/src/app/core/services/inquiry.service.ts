import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InquirySummary, InquiryDetail, InquiryAttachment, NerExtractResult } from '../models/inquiry.model';

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

  uploadAttachment(inquiryId: number, file: File): Observable<InquiryAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<InquiryAttachment>(`${this.baseUrl}/inquiries/${inquiryId}/attachments`, formData);
  }

  deleteAttachment(inquiryId: number, attachmentId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/inquiries/${inquiryId}/attachments/${attachmentId}`);
  }

  /**
   * Attachment downloads need the auth token attached, but a plain
   * <a href> link can't add an Authorization header - so instead of
   * navigating directly to the API URL, this fetches the file as a
   * blob (with the token, via the normal HttpClient interceptor) and
   * triggers the browser's save dialog manually.
   */
  downloadAttachment(attachmentId: number, filename: string): void {
    this.http.get(`${this.baseUrl}/inquiry-attachments/${attachmentId}/download`, { responseType: 'blob' }).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
