export interface PrintCategory {
  id: number;
  name: string;
}

export interface AdminCategory {
  id: number;
  name: string;
  description: string | null;
  shop_count: number;
  inquiry_count: number;
}
