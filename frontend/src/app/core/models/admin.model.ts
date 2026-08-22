export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: 'customer' | 'print_shop' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface AdminPrintShop {
  id: number;
  business_name: string;
  district: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  rating_average: number;
  completed_orders_count: number;
  email: string;
}

export interface AdminDispute {
  id: number;
  order_id: number;
  raised_by_email: string;
  description: string;
  status: 'open' | 'resolved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
}

export interface PlatformStats {
  total_users: number;
  total_customers: number;
  total_print_shops: number;
  pending_shop_approvals: number;
  total_inquiries: number;
  total_bids: number;
  total_orders: number;
  completed_orders: number;
  open_disputes: number;
  total_reviews: number;
}
