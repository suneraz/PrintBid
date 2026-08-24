export interface Bid {
  id: number;
  print_shop_id: number;
  print_shop_name: string;
  print_shop_rating: number;
  portfolio_ids: number[];
  bid_price: number;
  estimated_completion_days: number;
  message?: string;
  rank_score: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}
