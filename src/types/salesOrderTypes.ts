export interface Product {
  id: string;
  nama_produk: string;
  kategori: { nama: string } | null;
  satuan: { nama: string } | null;
  bahan: { id: string; nama: string; ukuran_panjang: number | null; ukuran_lebar: number | null } | null;
  quantity_bahan: number;
  use_mesin: boolean;
  mesin: { nama: string } | null;
  harga_pokok: number;
  harga_jual_umum: number;
  harga_jual_khusus: number;
  stok: number;
  barcode_1: string;
  barcode_2: string;
  keterangan: string;
  diskon_persen: number;
  template_order: string;
  grosir_prices: any;
  member_prices: any;
}

export interface AdditionalOption {
  id: string;
  name: string;
  cost: number;
  quantity: number;
  selected: boolean;
}

export interface OrderItem {
  tempId: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  discount_per_item: number;
  subtotal_per_item: number; /* Fixed: Changed from subtotal_per_per_item */
  dimensions: {
    panjang?: number;
    lebar?: number;
    satuan?: string;
    tebal_bahan_id?: string;
    tebal_bahan_nama?: string;
    additional_options?: AdditionalOption[];
  } | null;
  notes_per_item: string;
  designer_id: string | null;
  designer_name: string | null;
  satuan_nama: string | null;
  bahan_nama: string | null;
  mesin_nama: string | null;
}

export interface OrderFormData {
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_notes: string;
  order_date: string;
  pickup_date: string;
  priority: string;
  items: OrderItem[];
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  payment_status: string;
  order_status: string;
  notes: string;
}

export interface Customer {
  id: string;
  nama_pelanggan: string;
  organisasi: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  jenis_member: { nama: string } | null;
  npwp: string | null;
  ppn: boolean;
  current_points: number;
}

export interface DesignerOption {
  id: string;
  name: string;
}

export interface PaymentDetails {
  dp_amount: number;
  paid_amount: number;
  payment_method: 'cash' | 'bank_transfer';
  bank_id?: string;
  bank_name?: string;
  tempo_active: boolean;
  tempo_date?: string;
}

export interface OrderDataToSave {
  order_date: string;
  pickup_date: string | null;
  customer_id: string | null;
  customer_display_name: string;
  customer_display_phone: string;
  kasir_id: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  payment_status: 'pending' | 'paid';
  order_status: string;
  ready_status: 'ready' | 'not_ready';
  notes: string;
  priority: string;
  invoice_number: string;
  payment_method?: 'cash' | 'bank_transfer';
  bank_name?: string | null;
}

export interface ItemToInsert {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  subtotal_per_item: number;
  dimensions: OrderItem['dimensions'];
  notes_per_item: string;
  designer_id: string | null;
  product_name: string;
}