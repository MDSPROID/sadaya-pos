import { supabase } from '../integrations/supabase/client';
// import { showError } from './toast'; // Removed unused import
import {
  PurchaseOrderDataToSave,
  ItemToInsert,
  PaymentDetails,
} from '../types/purchaseOrderTypes';

/**
 * Saves a purchase order and its items to the database, updates product/bahan stock,
 * logs activity, and optionally records kas keluar.
 * @param purchaseOrderData The main purchase order data.
 * @param itemsToInsert An array of purchase order items to insert.
 * @param currentUserId The ID of the current user (recorded_by_id).
 * @param paymentStatus The payment status ('paid' or 'due').
 * @param paymentDetails Optional payment details if status is 'paid'.
 * @returns A promise that resolves when the operation is complete.
 */
export const savePurchaseOrder = async (
  purchaseOrderData: PurchaseOrderDataToSave,
  itemsToInsert: ItemToInsert[],
  currentUserId: string,
  paymentStatus: 'paid' | 'due', // Changed status type
  paymentDetails?: PaymentDetails,
) => {
  // Insert the main purchase order
  const { data: newPurchaseOrder, error: purchaseOrderError } = await supabase
    .from('purchase_orders')
    .insert([purchaseOrderData])
    .select()
    .single();

  if (purchaseOrderError) throw purchaseOrderError;

  // Insert purchase order items
  const itemsWithOrderId = itemsToInsert.map(item => ({
    purchase_order_id: newPurchaseOrder.id,
    item_type: item.item_type,
    item_id: item.item_id,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal_per_item: item.subtotal_per_item,
    notes_per_item: item.notes_per_item,
  }));

  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(itemsWithOrderId);

  if (itemsError) throw itemsError;

  // Update product/bahan stock
  for (const item of itemsToInsert) {
    if (item.item_type === 'produk') {
      const { data: productData, error: productFetchError } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', item.item_id)
        .single();

      if (productFetchError) throw productFetchError;

      const newStock = (productData?.stok || 0) + item.quantity;
      const { error: stockUpdateError } = await supabase
        .from('produk')
        .update({ stok: newStock })
        .eq('id', item.item_id);

      if (stockUpdateError) throw stockUpdateError;
    } else if (item.item_type === 'bahan') {
      const { data: bahanData, error: bahanFetchError } = await supabase
        .from('bahan')
        .select('stok')
        .eq('id', item.item_id)
        .single();

      if (bahanFetchError) throw bahanFetchError;

      const newStock = (bahanData?.stok || 0) + item.quantity;
      const { error: stockUpdateError } = await supabase
        .from('bahan')
        .update({ stok: newStock })
        .eq('id', item.item_id);

      if (stockUpdateError) throw stockUpdateError;
    }
  }

  // Record as Kas Keluar if payment status is 'paid' (fully paid)
  if (paymentStatus === 'paid' && paymentDetails) {
    const { error: kasKeluarError } = await supabase.from('kas_keluar').insert([{
      tanggal: purchaseOrderData.order_date,
      nama_pengeluaran: `Pembelian: ${purchaseOrderData.supplier_display_name || 'Umum'} (Faktur: ${purchaseOrderData.invoice_number})`,
      jumlah: purchaseOrderData.paid_amount,
      keterangan: purchaseOrderData.notes || `Pembayaran pembelian dari ${purchaseOrderData.supplier_display_name}`,
      petugas_id: currentUserId,
      payment_method: paymentDetails.payment_method,
      bank_id: paymentDetails.bank_id,
    }]);
    if (kasKeluarError) throw kasKeluarError;
  }

  // Log activity
  await supabase.from('activity_logs').insert([{
    user_id: currentUserId,
    action: `Membuat pesanan pembelian baru (${newPurchaseOrder.id}) dengan status ${paymentStatus}`, // Adjusted message
    details: { purchase_order_id: newPurchaseOrder.id, supplier_name: purchaseOrderData.supplier_display_name, final_amount: purchaseOrderData.final_amount, status: paymentStatus },
  }]);
};