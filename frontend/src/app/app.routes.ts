import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./public/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./public/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./public/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    // Reachable by any logged-in role, not nested under a
    // role-specific block - full_name/phone live on every account
    // regardless of role, so this one page serves all three.
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./shared/pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
  {
    // Every route nested under here renders inside the AppShell's
    // sidebar layout, and authGuard blocks the whole group if you're
    // not logged in - so individual pages don't need to repeat that check.
    path: 'customer',
    canActivate: [authGuard, roleGuard('customer')],
    loadComponent: () => import('./shared/components/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./customer/dashboard/dashboard.component').then((m) => m.CustomerDashboardComponent),
      },
      {
        path: 'new-inquiry',
        loadComponent: () => import('./customer/new-inquiry/new-inquiry.component').then((m) => m.NewInquiryComponent),
      },
      {
        path: 'inquiries',
        loadComponent: () => import('./customer/inquiries-list/inquiries-list.component').then((m) => m.InquiriesListComponent),
      },
      {
        path: 'inquiries/:id',
        loadComponent: () => import('./customer/inquiry-detail/inquiry-detail.component').then((m) => m.InquiryDetailComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./customer/orders-list/orders-list.component').then((m) => m.OrdersListComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./customer/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
      },
    ],
  },
  {
    path: 'print-shop',
    canActivate: [authGuard, roleGuard('print_shop')],
    loadComponent: () => import('./shared/components/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./print-shop/dashboard/dashboard.component').then((m) => m.ShopDashboardComponent),
      },
      {
        path: 'open-inquiries',
        loadComponent: () => import('./print-shop/open-inquiries-list/open-inquiries-list.component').then((m) => m.OpenInquiriesListComponent),
      },
      {
        path: 'open-inquiries/:id',
        loadComponent: () => import('./print-shop/inquiry-bid/inquiry-bid.component').then((m) => m.InquiryBidComponent),
      },
      {
        path: 'bids',
        loadComponent: () => import('./print-shop/my-bids/my-bids.component').then((m) => m.MyBidsComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./print-shop/shop-orders-list/shop-orders-list.component').then((m) => m.ShopOrdersListComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./print-shop/shop-order-detail/shop-order-detail.component').then((m) => m.ShopOrderDetailComponent),
      },
      {
        path: 'my-shop',
        loadComponent: () => import('./print-shop/my-shop/my-shop.component').then((m) => m.MyShopComponent),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('admin')],
    loadComponent: () => import('./shared/components/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./admin/admin-users/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'print-shops',
        loadComponent: () => import('./admin/admin-print-shops/admin-print-shops.component').then((m) => m.AdminPrintShopsComponent),
      },
      {
        path: 'disputes',
        loadComponent: () => import('./admin/admin-disputes/admin-disputes.component').then((m) => m.AdminDisputesComponent),
      },
      {
        path: 'categories',
        loadComponent: () => import('./admin/admin-categories/admin-categories.component').then((m) => m.AdminCategoriesComponent),
      },
      {
        path: 'activity',
        loadComponent: () => import('./admin/admin-activity/admin-activity.component').then((m) => m.AdminActivityComponent),
      },
    ],
  },
];
