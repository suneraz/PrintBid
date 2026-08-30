export type OrderStatus =
  | 'Confirmed'
  | 'In Production'
  | 'Ready'
  | 'Dispatched'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  changed_at: string;
  note?: string;
}

import { InquirySpecification } from './inquiry.model';

export interface OrderAttachment {
  id: number;
  original_filename: string;
}

export interface Order {
  id: number;
  inquiry_id: number;
  print_category: string;
  print_shop_name: string;
  customer_name: string;
  status: OrderStatus;
  delivery_method: string;
  created_at: string;
  specification: InquirySpecification | null;
  attachments: OrderAttachment[];
  status_history: OrderStatusHistoryEntry[];
}
