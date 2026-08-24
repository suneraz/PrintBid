export interface Dispute {
  id: number;
  status: 'open' | 'resolved' | 'rejected';
  description: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}
