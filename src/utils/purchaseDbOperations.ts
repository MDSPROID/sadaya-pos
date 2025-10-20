import { supabase } from '../integrations/supabase/client';
import {
  PurchaseOrderDataToSave,
  ItemToInsert,
  PaymentDetails,
} from '../types/purchaseOrderTypes';

/**
 * Saves a purchase order and its items to the database, updates product/bahan stock,
 * logs activity, optionally records kas keluar, and records a row in purchase_payments
 * when user provides a payment or sets tempo.
 *
 * @param purchaseOrderData The main purchase order data.
 * @param itemsToInsert An array of purchase order items to insert.
 * @param currentUserId The ID of the current user (recorded_by_id).
 * @param paymentStatus 'paid' or 'due' (derived before calling this function).
 * @param paymentDetails Optional payment details from the modal.
 * @returns The newly created purchase order id.
 */
export const savePurchaseOrder = async (
  purchaseOrderData: PurchaseOrderDataToSave,
  itemsToInsert: ItemToInsert[],
  currentUserId: string,
  paymentStatus: 'paid' | 'due',
  paymentDetails?: PaymentDetails,
): Promise<string> => {
  // 1) Insert purchase order (return only id to reduce payload)
  const { data: poRow, error: purchaseOrderError } = await supabase
    .from('purchase_orders')
    .insert([purchaseOrderData])
    .select('id')
    .single();

  if (purchaseOrderError) throw purchaseOrderError;
  const purchaseOrderId = poRow.id as string;

  // 2) Insert items
  const itemsWithOrderId = itemsToInsert.map(item => ({
    purchase_order_id: purchaseOrderId,
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

  // 3) Update stock
  for (const item of itemsToInsert) {
    if (item.item_type === 'produk') {
      const { data: prod, error: e1 } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', item.item_id)
        .single();
      if (e1) throw e1;

      const newStock = (prod?.stok || 0) + item.quantity;
      const { error: e2 } = await supabase
        .from('produk')
        .update({ stok: newStock })
        .eq('id', item.item_id);
      if (e2) throw e2;
    } else if (item.item_type === 'bahan') {
      const { data: bah, error: e1 } = await supabase
        .from('bahan')
        .select('stok')
        .eq('id', item.item_id)
        .single();
      if (e1) throw e1;

      const newStock = (bah?.stok || 0) + item.quantity;
      const { error: e2 } = await supabase
        .from('bahan')
        .update({ stok: newStock })
        .eq('id', item.item_id);
      if (e2) throw e2;
    }
  }

  // 4) Record a payment row when:
  //    - user entered a paid_amount > 0, OR
  //    - status is 'due' (tempo). If you DON'T want zero-amount rows on pure tempo, change the condition.
  // if (paymentDetails && (paymentDetails.paid_amount > 0 || paymentStatus === 'due')) {
  if (paymentDetails && paymentDetails.paid_amount > 0) {
    const payAmount = Number(paymentDetails.paid_amount || 0);
    const payDate =
      purchaseOrderData.order_date || new Date().toISOString().slice(0, 10);

    const basePayment: any = {
      purchase_order_id: purchaseOrderId,
      pay_date: payDate,
      amount: payAmount,
      method: paymentDetails.payment_method, // 'cash' | 'bank_transfer'
      note: null,
    };

    // Non tunai: simpan gabungan "NamaBank - NamaAkun" (sudah dikirim via bank_name)
    // Simpan ke kolom 'bank' jika ada, fallback 'bank_name'
    if (paymentDetails.payment_method === 'bank_transfer') {
      const combinedBank = (paymentDetails.bank_name || '').trim() || null;

      if (combinedBank) {
        // coba kolom 'bank' terlebih dahulu
        const { error } = await supabase
          .from('purchase_payments')
          .insert({ ...basePayment, bank_name: combinedBank });

        if (error) {
          // fallback jika kolom "bank" belum ada
          const needsFallback =
            /column\s+"?bank"?\s+does\s+not\s+exist/i.test(error.message || '');
          if (needsFallback) {
            const { error: err2 } = await supabase
              .from('purchase_payments')
              .insert({ ...basePayment, bank_name: combinedBank });
            if (err2) throw err2;
          } else {
            throw error;
          }
        }
      } else {
        // bank kosong → tetap insert tanpa bank
        const { error } = await supabase
          .from('purchase_payments')
          .insert(basePayment);
        if (error) throw error;
      }
    } else {
      // Tunai → tanpa bank
      const { error } = await supabase
        .from('purchase_payments')
        .insert(basePayment);
      if (error) throw error;
    }
  }

  // 5) Record kas keluar hanya jika benar-benar LUNAS (paid)
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

  // 6) Activity log
  await supabase.from('activity_logs').insert([{
    user_id: currentUserId,
    action: `Membuat pesanan pembelian baru (${purchaseOrderId}) dengan status ${paymentStatus}`,
    details: {
      purchase_order_id: purchaseOrderId,
      supplier_name: purchaseOrderData.supplier_display_name,
      final_amount: purchaseOrderData.final_amount,
      status: paymentStatus
    },
  }]);

  // penting: kembalikan ID untuk caller (kalau diperlukan)
  return purchaseOrderId;
};
