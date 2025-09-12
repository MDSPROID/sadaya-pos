export interface Supplier {
  id: string;
  nama: string;
  telepon: string | null;
  alamat: string | null;
  jenis_supplier: string | null;
}

export interface Product {
  id: string;
  nama_produk: string;
  stok: number;
  harga_pokok: number;
  satuan: { nama: string } | null;
}

export interface Bahan {
  id: string;
  nama: string;
  stok: number;
  harga_beli: number;
  satuan: { nama: string } | null;
}

export interface PurchaseItem {
  tempId: string;
  item_type: 'produk' | 'bahan';
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal_per_item: number;
  notes_per_item: string;
  satuan_nama: string | null;
}

export interface PurchaseOrderFormData {
  supplier_id: string | null;
  supplier_name: string;
  supplier_phone: string;
  supplier_address: string;
  order_date: string;
  notes: string;
  items: PurchaseItem[];
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_status: 'paid' | 'due'; // Updated type
  paid_amount: number;
  due_amount: number;
  due_date: string | null;
  payment_method: string;
  bank_id: string | null;
  bank_name: string | null;
}

export interface PaymentDetails {
  paid_amount: number;
  payment_method: 'cash' | 'bank_transfer';
  bank_id?: string;
  bank_name?: string;
  due_amount: number;
  due_date?: string;
}

export interface PurchaseOrderDataToSave {
  order_date: string;
  supplier_id: string | null;
  supplier_display_name: string;
  supplier_display_phone: string;
  recorded_by_id: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_status: 'paid' | 'due'; // Updated type
  notes: string;
  invoice_number: string;
  payment_method: 'cash' | 'bank_transfer';
  bank_id: string | null;
  bank_name: string | null;
  paid_amount: number;
  due_amount: number;
  due_date: string | null;
}

export interface ItemToInsert {
  item_type: 'produk' | 'bahan';
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal_per_item: number;
  notes_per_item: string;
}

export interface BankOption {
  id: string;
  nama_bank: string;
  rekening: string;
  nama_akun: string;
  charge: number;
}

// New interfaces for Purchase Reports
export interface PurchaseItemDetail {
  item_type: 'produk' | 'bahan';
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal_per_item: number;
  notes_per_item: string | null;
}

export interface PurchaseReportItem {
  id: string;
  created_at: string;
  order_date: string;
  invoice_number: string | null;
  supplier_id: string | null;
  supplier_display_name: string | null;
  supplier_display_phone: string | null;
  supplier: { nama: string; telepon: string | null } | null;
  recorded_by_id: string | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_status: 'paid' | 'due';
  notes: string | null;
  payment_method: string | null;
  bank_name: string | null;
  paid_amount: number;
  due_amount: number;
  due_date: string | null;
  purchase_order_items: PurchaseItemDetail[];
}