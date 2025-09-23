export interface BaseOrder {
  id: string;
  created_at: string;
  order_date: string;
  pickup_date: string | null;
  invoice_number: string | null;
  customer_id: string | null;
  customer_display_name: string | null;
  customer_display_phone: string | null;
  pelanggan: Array<{ nama_pelanggan: string; telepon: string | null }> | null;
  kasir_id: string | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
  total_amount: number;
  notes: string | null;
  priority: string;
  payment_status: string;
  order_status: string;
  ready_status: 'ready' | 'not_ready';
  payment_method?: string | null;
  bank_name?: string | null;
}

export interface OrderItemDetail {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal_per_item: number;
  dimensions: any;
  notes_per_item: string;
}

export interface SalesItem extends BaseOrder {
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  order_items: OrderItemDetail[];
}

export interface PendingOrderItem extends BaseOrder {
  durasi_tunggu: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  order_items: OrderItemDetail[];
}