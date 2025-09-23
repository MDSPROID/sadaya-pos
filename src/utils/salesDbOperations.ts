import { supabase } from '../integrations/supabase/client';
import { sendPrintRequest } from './printAgent';

// Gunakan type dari sumber tunggal agar konsisten dengan useSalesOrder.ts
import {
  OrderDataToSave,
  ItemToInsert as OrderItemToSave,
  PaymentDetails,
} from '../types/salesOrderTypes';

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
  // Insert main order (pakai spread agar kolom flat & termasuk ready_status)
  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert([{ ...orderData }])
    .select()
    .single();

  if (orderError) throw orderError;

  // Insert items
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

  if (itemsWithOrderId.length > 0) {
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);
    if (itemsError) throw itemsError;
  }

  // Adjust stok hanya saat paid
  if (status === 'paid') {
    for (const item of itemsToInsert) {
      const { data: productData, error: productFetchError } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', item.product_id)
        .single();
      if (productFetchError) throw productFetchError;

      const newStock = (productData?.stok || 0) - item.quantity;
      const { error: stockUpdateError } = await supabase
        .from('produk')
        .update({ stok: newStock })
        .eq('id', item.product_id);
      if (stockUpdateError) throw stockUpdateError;
    }
  }

  // Log activity
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

  // Print nota (jika paid & tidak skip)
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

  const { data: updatedOrder, error: orderUpdateError } = await supabase
    .from('orders')
    .update({ ...updatePayload })
    .eq('id', orderId)
    .select()
    .single();

  if (orderUpdateError) throw orderUpdateError;

  // Replace items
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

  if (itemsWithOrderId.length > 0) {
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);
    if (itemsError) throw itemsError;
  }

  // Adjust stok hanya saat paid
  if (status === 'paid') {
    for (const item of itemsToUpsert) {
      const { data: productData, error: productFetchError } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', item.product_id)
        .single();
      if (productFetchError) throw productFetchError;

      const newStock = (productData?.stok || 0) - item.quantity;
      const { error: stockUpdateError } = await supabase
        .from('produk')
        .update({ stok: newStock })
        .eq('id', item.product_id);
      if (stockUpdateError) throw stockUpdateError;
    }
  }

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
