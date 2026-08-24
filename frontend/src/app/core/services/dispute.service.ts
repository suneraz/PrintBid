import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Dispute } from '../models/dispute.model';

@Injectable({ providedIn: 'root' })
export class DisputeService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  listForOrder(orderId: number): Observable<Dispute[]> {
    return this.http.get<Dispute[]>(`${this.baseUrl}/orders/${orderId}/disputes`);
  }

  raise(orderId: number, description: string): Observable<Dispute> {
    return this.http.post<Dispute>(`${this.baseUrl}/orders/${orderId}/disputes`, { description });
  }
}
