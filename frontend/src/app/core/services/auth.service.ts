/**
 * A Service in Angular is just a class that holds logic or state you
 * want to share across multiple components, instead of every
 * component re-implementing the same thing. `@Injectable({ providedIn:
 * 'root' })` means Angular creates exactly ONE instance of this class
 * for the whole app and hands it to anything that asks for it - so
 * every component that injects AuthService is sharing the same
 * currentUser state, not separate copies of it.
 */

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { User, LoginResponse } from '../models/user.model';

const TOKEN_KEY = 'printbid_token';
const USER_KEY = 'printbid_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // signal() is Angular's newer, simpler alternative to RxJS
  // BehaviorSubject for holding a single piece of state. Any
  // component template that reads currentUser() automatically
  // re-renders whenever it changes - no manual subscribing needed.
  currentUser = signal<User | null>(this.loadUserFromStorage());

  constructor(private http: HttpClient) {}

  private loadUserFromStorage(): User | null {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          localStorage.setItem(TOKEN_KEY, response.access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(response.user));
          this.currentUser.set(response.user);
        }),
      );
  }

  registerCustomer(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    default_location?: string;
  }): Observable<{ message: string; user_id: number }> {
    return this.http.post<{ message: string; user_id: number }>(
      `${environment.apiUrl}/auth/register/customer`,
      data,
    );
  }

  registerPrintShop(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    business_name: string;
    business_address?: string;
    district?: string;
  }): Observable<{ message: string; user_id: number }> {
    return this.http.post<{ message: string; user_id: number }>(
      `${environment.apiUrl}/auth/register/print-shop`,
      data,
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  dashboardPath(): string {
    const role = this.currentUser()?.role;
    if (role === 'print_shop') return '/print-shop/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/customer/dashboard';
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`);
  }

  updateProfile(data: { full_name?: string; phone?: string; default_location?: string }): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/auth/me`, data).pipe(
      tap((updated) => {
        // Keep localStorage and the shared currentUser signal in
        // sync, so the sidebar's name/role display and anything else
        // reading currentUser() reflects the edit immediately without
        // needing a page refresh or re-login.
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        this.currentUser.set(updated);
      }),
    );
  }
}
