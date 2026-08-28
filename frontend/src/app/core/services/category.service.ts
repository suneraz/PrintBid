import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PrintCategory, AdminCategory } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);

  listCategories(): Observable<PrintCategory[]> {
    return this.http.get<PrintCategory[]>(`${environment.apiUrl}/categories`);
  }

  adminListCategories(): Observable<AdminCategory[]> {
    return this.http.get<AdminCategory[]>(`${environment.apiUrl}/admin/categories`);
  }

  createCategory(name: string, description?: string): Observable<AdminCategory> {
    return this.http.post<AdminCategory>(`${environment.apiUrl}/admin/categories`, { name, description });
  }

  updateCategory(id: number, name: string, description?: string): Observable<AdminCategory> {
    return this.http.put<AdminCategory>(`${environment.apiUrl}/admin/categories/${id}`, { name, description });
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/admin/categories/${id}`);
  }
}
