export interface InquirySummary {
  id: number;
  print_category: string;
  status: 'draft' | 'submitted' | 'closed';
  predicted_price_min: number;
  predicted_price_max: number;
  bid_count: number;
  created_at: string;
}

export interface InquirySpecification {
  quantity?: number;
  standard_size?: string;
  width?: number;
  height?: number;
  paper_type?: string;
  gsm?: number;
  colour_mode?: string;
  sides?: string;
  page_count?: number;
  finishing_type?: string;
  urgency?: string;
  deadline?: string;
  location?: string;
  delivery_method?: string;
}

export interface InquiryAttachment {
  id: number;
  original_filename: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface InquiryDetail {
  id: number;
  print_category: string;
  raw_message: string;
  status: 'draft' | 'submitted' | 'closed';
  predicted_price_min: number;
  predicted_price_max: number;
  specification: InquirySpecification;
  attachments: InquiryAttachment[];
}

export interface OpenInquirySummary {
  id: number;
  print_category: string;
  raw_message: string;
  created_at: string;
  already_bid: boolean;
}

export interface OpenInquiryDetail {
  id: number;
  print_category: string;
  raw_message: string;
  already_bid: boolean;
  specification: InquirySpecification;
  attachments: InquiryAttachment[];
}

export interface NerExtractResult {
  specification: Record<string, string | number> & { print_category_text?: string };
  missing_fields: { field: string; question: string }[];
}
