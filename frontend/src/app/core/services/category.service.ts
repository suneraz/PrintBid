import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PrintCategory } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);

  listCategories(): Observable<PrintCategory[]> {
    return this.http.get<PrintCategory[]>(`${environment.apiUrl}/categories`);
  }
}
