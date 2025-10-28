import { supabase } from '../integrations/supabase/client';
import { sendPrintRequest } from './printAgent';

// Gunakan type dari sumber tunggal agar konsisten dengan useSalesOrder.ts
import {
  OrderDataToSave,
  ItemToInsert as OrderItemToSave,
  PaymentDetails,
} from '../types/salesOrderTypes';

/** Potong stok: bahan jika ada bahan_id; selain itu potong stok produk.
 *  HANYA dipanggil ketika status === 'paid'
 */
async function adjustStockWhenPaid(items: OrderItemToSave[]) {
  for (const item of items) {
    const { data: product, error: fetchErr } = await supabase
      .from('produk')
      .select('id, stok, bahan_id, quantity_bahan, bahan(id, stok)')
      .eq('id', item.product_id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!product) continue;

    const qty = Number(item.quantity || 0);
    const qtyMultiplier = Math.max(1, Number(product.quantity_bahan || 1));
    const totalForBahan = Math.floor(qty * qtyMultiplier);

    // ✅ Normalisasi: bahan bisa array atau object
    const bahanData = Array.isArray(product.bahan)
      ? product.bahan[0]
      : product.bahan;

    // Jika produk pakai bahan → potong stok bahan
    if (product.bahan_id && bahanData?.id) {
      const newStock = Math.max(0, (Number(bahanData.stok) || 0) - totalForBahan);
      const { error: bahanErr } = await supabase
        .from('bahan')
        .update({ stok: newStock })
        .eq('id', bahanData.id);
      if (bahanErr) throw bahanErr;
    } else {
      // Jika tidak pakai bahan → potong stok produk
      const newStock = Math.max(0, (Number(product.stok) || 0) - qty);
      const { error: prodErr } = await supabase
        .from('produk')
        .update({ stok: newStock })
        .eq('id', product.id);
      if (prodErr) throw prodErr;
    }
  }
}

/**
 * Menyimpan order + item, adjust stok (hanya saat paid), log, dan opsi print.
 */
export const saveSalesOrder = async (
  orderData: OrderDataToSave,
  itemsToInsert: OrderItemToSave[],
  currentUserId: string,
  status: 'pending' | 'paid',
  paymentDetails?: PaymentDetails,
  options?: { skipPrint?: boolean }
) => {
  // 1) Insert main order (pakai spread agar kolom flat & termasuk ready_status)
  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert([{ ...orderData }])
    .select()
    .single();

  if (orderError) throw orderError;

  // 2) Insert items
  const itemsWithOrderId = itemsToInsert.map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_per_item: item.discount_per_item,
    subtotal_per_item: item.subtotal_per_item,
    dimensions: item.dimensions,
    notes_per_item: item.notes_per_item,
    designer_id: item.designer_id,
    order_id: newOrder.id,
  }));

  // Potong stok jika: sudah lunas, atau ada DP, atau naik status ready
  const hasDp = paymentDetails?.dp_amount && paymentDetails.dp_amount > 0;
  const isReady = orderData?.ready_status === 'ready'

  if (itemsWithOrderId.length > 0) {
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);
    if (itemsError) throw itemsError;
  }

  // 3) ✅ Potong stok jika: sudah lunas, atau ada DP, atau naik status ready
  // console.log(status);
  if (status === 'paid' || hasDp || isReady) {
    await adjustStockWhenPaid(itemsToInsert);
  }

  // Adjust stok hanya saat paid
  // if (status === 'paid') {
  //   for (const item of itemsToInsert) {
  //     const { data: productData, error: productFetchError } = await supabase
  //       .from('produk')
  //       .select('stok')
  //       .eq('id', item.product_id)
  //       .single();
  //     if (productFetchError) throw productFetchError;

  //     const newStock = (productData?.stok || 0) - item.quantity;
  //     const { error: stockUpdateError } = await supabase
  //       .from('produk')
  //       .update({ stok: newStock })
  //       .eq('id', item.product_id);
  //     if (stockUpdateError) throw stockUpdateError;
  //   }
  // }

  // 4) Log activity
  await supabase.from('activity_logs').insert([
    {
      user_id: currentUserId,
      action: `Membuat pesanan baru (${newOrder.id})`,
      details: {
        order_id: newOrder.id,
        customer_name: orderData.customer_display_name,
        final_amount: orderData.final_amount,
        status,
      },
    },
  ]);

  // 5) Print nota (jika paid & tidak skip)
  if (status === 'paid' && paymentDetails && !options?.skipPrint) {
    const notaPrintData = {
      tanggal: newOrder.created_at,
      pelanggan: orderData.customer_display_name || 'Umum',
      items: itemsToInsert.map((item) => ({
        nama: item.product_name,
        qty: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal_per_item,
        keterangan: item.notes_per_item,
        dimensions: item.dimensions,
      })),
      total: orderData.final_amount,
      invoice_number: orderData.invoice_number,
      kasir_id: currentUserId,
      payment_status: status,
      paid_amount: paymentDetails.paid_amount ?? 0,
      dp_amount: paymentDetails.dp_amount ?? 0,
      change_amount:
        (paymentDetails.paid_amount ?? 0) +
        (paymentDetails.dp_amount ?? 0) -
        orderData.final_amount,
      payment_method: paymentDetails.payment_method,
      bank_name: paymentDetails.bank_name || null,
      customer_phone: orderData.customer_display_phone || '0',
      customer_name: orderData.customer_display_name || 'UMUM',
    };
    await sendPrintRequest(notaPrintData);
  }

  return newOrder; // opsional, kalau mau dipakai caller
};

/**
 * Update order + replace items. Adjust stok hanya saat paid.
 */
export const updateSalesOrder = async (
  orderId: string,
  orderData: OrderDataToSave,
  itemsToUpsert: OrderItemToSave[],
  currentUserId: string,
  status: 'pending' | 'paid',
  paymentDetails?: PaymentDetails,
  options?: { skipPrint?: boolean }
) => {
  // Jaga invoice_number tetap (kalau memang kebijakanmu begitu)
  const { invoice_number: _ignoreInvoice, ...updatePayload } = orderData as any;

  // 1) update order
  const { data: updatedOrder, error: orderUpdateError } = await supabase
    .from('orders')
    .update({ ...updatePayload })
    .eq('id', orderId)
    .select()
    .single();

  if (orderUpdateError) throw orderUpdateError;

  // 2) Replace items
  const { error: deleteItemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId);
  if (deleteItemsError) throw deleteItemsError;

  const itemsWithOrderId = itemsToUpsert.map((item) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_per_item: item.discount_per_item,
    subtotal_per_item: item.subtotal_per_item,
    dimensions: item.dimensions,
    notes_per_item: item.notes_per_item,
    designer_id: item.designer_id,
    order_id: orderId,
  }));

  // Potong stok jika: sudah lunas, atau ada DP, atau naik status ready
  const hasDp = paymentDetails?.dp_amount && paymentDetails.dp_amount > 0;
  const isReady = orderData?.ready_status === 'ready'

  if (itemsWithOrderId.length > 0) {
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);
    if (itemsError) throw itemsError;
  }

  // 3) ✅ Potong stok jika: sudah lunas, atau ada DP, atau naik status ready
  if (status === 'paid' || hasDp || isReady) {
    await adjustStockWhenPaid(itemsToUpsert);
  }

  // Adjust stok hanya saat paid
  // if (status === 'paid') {
  //   for (const item of itemsToUpsert) {
  //     const { data: productData, error: productFetchError } = await supabase
  //       .from('produk')
  //       .select('stok')
  //       .eq('id', item.product_id)
  //       .single();
  //     if (productFetchError) throw productFetchError;

  //     const newStock = (productData?.stok || 0) - item.quantity;
  //     const { error: stockUpdateError } = await supabase
  //       .from('produk')
  //       .update({ stok: newStock })
  //       .eq('id', item.product_id);
  //     if (stockUpdateError) throw stockUpdateError;
  //   }
  // }

  // Log activity
  await supabase.from('activity_logs').insert([
    {
      user_id: currentUserId,
      action: `Melanjutkan pesanan (${orderId})`,
      details: {
        order_id: orderId,
        customer_name: orderData.customer_display_name,
        final_amount: orderData.final_amount,
        status,
      },
    },
  ]);

  // Print nota (jika paid & tidak skip)
  if (status === 'paid' && paymentDetails && !options?.skipPrint) {
    const notaPrintData = {
      tanggal: updatedOrder.created_at,
      pelanggan: orderData.customer_display_name || 'Umum',
      items: itemsToUpsert.map((item) => ({
        nama: item.product_name,
        qty: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal_per_item,
        keterangan: item.notes_per_item,
        dimensions: item.dimensions,
      })),
      total: orderData.final_amount,
      invoice_number: updatedOrder.invoice_number,
      kasir_id: currentUserId,
      payment_status: status,
      paid_amount: paymentDetails.paid_amount ?? 0,
      dp_amount: paymentDetails.dp_amount ?? 0,
      change_amount:
        (paymentDetails.paid_amount ?? 0) +
        (paymentDetails.dp_amount ?? 0) -
        orderData.final_amount,
      payment_method: paymentDetails.payment_method,
      bank_name: paymentDetails.bank_name || null,
      customer_phone: orderData.customer_display_phone || '0',
      customer_name: orderData.customer_display_name || 'UMUM',
    };
    await sendPrintRequest(notaPrintData);
  }

  return updatedOrder; // opsional
};
