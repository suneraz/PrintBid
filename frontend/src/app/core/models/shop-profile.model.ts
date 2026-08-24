export interface ShopServiceEntry {
  category_id: number;
  category_name: string;
}

export interface PortfolioItem {
  id: number;
  caption: string | null;
  uploaded_at: string;
}

export interface ShopReview {
  id: number;
  rating: number;
  comment: string | null;
  customer_name: string;
  created_at: string;
}
