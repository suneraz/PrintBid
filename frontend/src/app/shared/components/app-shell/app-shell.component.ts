/**
 * This is a Layout component - it doesn't show any real page content
 * itself, it just draws the sidebar + top bar shell, and leaves a
 * <router-outlet> in the middle for whichever actual page (dashboard,
 * chat, orders, etc.) is currently active to render into.
 *
 * The customer/print-shop/admin routes will all be nested INSIDE this
 * component's route (set up in app.routes.ts), so this shell only
 * gets built once and the inner page swaps out as you navigate -
 * the sidebar itself never re-renders.
 */

import { Component, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { IconComponent } from '../icon/icon.component';

interface NavItem {
  label: string;
  path: string;
  icon: string; // one of the icon keys handled in the template
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  customer: [
    { label: 'Home', path: '/', icon: 'home' },
    { label: 'Dashboard', path: '/customer/dashboard', icon: 'grid' },
    { label: 'New Inquiry', path: '/customer/new-inquiry', icon: 'chat' },
    { label: 'My Inquiries', path: '/customer/inquiries', icon: 'list' },
    { label: 'My Orders', path: '/customer/orders', icon: 'package' },
    { label: 'My Profile', path: '/profile', icon: 'users' },
  ],
  print_shop: [
    { label: 'Home', path: '/', icon: 'home' },
    { label: 'Dashboard', path: '/print-shop/dashboard', icon: 'grid' },
    { label: 'Open Inquiries', path: '/print-shop/open-inquiries', icon: 'list' },
    { label: 'My Bids', path: '/print-shop/bids', icon: 'tag' },
    { label: 'My Orders', path: '/print-shop/orders', icon: 'package' },
    { label: 'My Shop', path: '/print-shop/my-shop', icon: 'shop' },
    { label: 'My Profile', path: '/profile', icon: 'users' },
  ],
  admin: [
    { label: 'Home', path: '/', icon: 'home' },
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'grid' },
    { label: 'Users', path: '/admin/users', icon: 'users' },
    { label: 'Print Shops', path: '/admin/print-shops', icon: 'shop' },
    { label: 'Disputes', path: '/admin/disputes', icon: 'flag' },
    { label: 'Categories', path: '/admin/categories', icon: 'tag' },
    { label: 'Platform Activity', path: '/admin/activity', icon: 'list' },
    { label: 'My Profile', path: '/profile', icon: 'users' },
  ],
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  constructor(
    public authService: AuthService,
    private router: Router,
  ) {}

  navItems = computed<NavItem[]>(() => {
    const role = this.authService.currentUser()?.role;
    return role ? NAV_BY_ROLE[role] : [];
  });

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
