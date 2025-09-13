import { supabase } from '../integrations/supabase/client';
import { sendPrintRequest } from './printAgent';
// import { NotaSettings } from '../hooks/useNotaSettings'; // Removed unused import

interface OrderItemToSave {
  product_id: string;
  product_name: string; // Ensure product_name is available here
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  subtotal_per_item: number;
  dimensions: { panjang?: number; lebar?: number; satuan?: string; tebal_bahan_id?: string; tebal_bahan_nama?: string; additional_options?: any[] } | null;
  notes_per_item: string;
  designer_id: string | null;
}

interface OrderDataToSave {
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
  payment_status: string;
  order_status: string;
  notes: string;
  priority: string;
  invoice_number: string;
}

interface PaymentDetails {
  dp_amount: number;
  paid_amount: number;
  payment_method: 'cash' | 'bank_transfer';
  bank_id?: string;
  bank_name?: string;
  tempo_active: boolean;
  tempo_date?: string;
}

/**
 * Saves a sales order and its items to the database, updates product stock,
 * logs activity, and optionally sends a print request.
 * @param orderData The main order data.
 * @param itemsToInsert An array of order items to insert.
 * @param currentUserId The ID of the current user (kasir).
 * @param status The payment status ('pending' or 'paid').
 * @param paymentDetails Optional payment details if status is 'paid'.
 * @returns A promise that resolves when the operation is complete.
 */
export const saveSalesOrder = async (
  orderData: OrderDataToSave,
  itemsToInsert: OrderItemToSave[],
  currentUserId: string,
  status: 'pending' | 'paid',
  paymentDetails: PaymentDetails | undefined,
) => {
  // Insert the main order
  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();

  if (orderError) throw orderError;

  // Insert order items
  const itemsWithOrderId = itemsToInsert.map(item => ({
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

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsWithOrderId);

  if (itemsError) throw itemsError;

  // Update product stock pending or paid
  // for (const item of itemsToInsert) {
  //   const { data: productData, error: productFetchError } = await supabase
  //     .from('produk')
  //     .select('stok')
  //     .eq('id', item.product_id)
  //     .single();

  //   if (productFetchError) throw productFetchError;

  //   const newStock = (productData?.stok || 0) - item.quantity;
  //   const { error: stockUpdateError } = await supabase
  //     .from('produk')
  //     .update({ stok: newStock })
  //     .eq('id', item.product_id);

  //   if (stockUpdateError) throw stockUpdateError;
  // }

  // Update product stock only when paid
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
  await supabase.from('activity_logs').insert([{
    user_id: currentUserId,
    action: `Membuat pesanan baru (${newOrder.id})`,
    details: { order_id: newOrder.id, customer_name: orderData.customer_display_name, final_amount: orderData.final_amount, status: status },
  }]);

  // Send print request if status is 'paid'
  if (status === 'paid' && paymentDetails) {
    const notaPrintData = {
      tanggal: newOrder.created_at, // Pass the raw timestamp
      pelanggan: orderData.customer_display_name || 'Umum',
      items: itemsToInsert.map(item => ({
        nama: item.product_name, // Menggunakan nama produk
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
      paid_amount: paymentDetails.paid_amount,
      dp_amount: paymentDetails.dp_amount,
      change_amount: (paymentDetails.paid_amount + paymentDetails.dp_amount) - orderData.final_amount,
      payment_method: paymentDetails.payment_method,
      bank_name: paymentDetails.bank_name || null,
      customer_phone: orderData.customer_display_phone || '0', // Pass customer phone
      customer_name: orderData.customer_display_name || 'UMUM', // Pass customer name
    };
    await sendPrintRequest(notaPrintData);
  }
};

/**
 * Updates an existing sales order and its items. Replaces all items with the provided list.
 * Keeps the existing invoice number. Adjusts stock only when status is 'paid'.
 */
export const updateSalesOrder = async (
  orderId: string,
  orderData: OrderDataToSave,
  itemsToUpsert: OrderItemToSave[],
  currentUserId: string,
  status: 'pending' | 'paid',
  paymentDetails: PaymentDetails | undefined,
) => {
  // Update the main order (exclude invoice_number to preserve it)
  const {
    invoice_number: _ignoreInvoice,
    ...updatePayload
  } = orderData as any;

  const { data: updatedOrder, error: orderUpdateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .select()
    .single();

  if (orderUpdateError) throw orderUpdateError;

  // Replace items: delete existing then insert new
  const { error: deleteItemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId);

  if (deleteItemsError) throw deleteItemsError;

  const itemsWithOrderId = itemsToUpsert.map(item => ({
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

  // Adjust stock only when paid
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
  await supabase.from('activity_logs').insert([{
    user_id: currentUserId,
    action: `Melanjutkan pesanan (${orderId})`,
    details: { order_id: orderId, customer_name: orderData.customer_display_name, final_amount: orderData.final_amount, status: status },
  }]);

  // Send print request if status is 'paid'
  if (status === 'paid' && paymentDetails) {
    const notaPrintData = {
      tanggal: updatedOrder.created_at,
      pelanggan: orderData.customer_display_name || 'Umum',
      items: itemsToUpsert.map(item => ({
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
      paid_amount: paymentDetails.paid_amount,
      dp_amount: paymentDetails.dp_amount,
      change_amount: (paymentDetails.paid_amount + paymentDetails.dp_amount) - orderData.final_amount,
      payment_method: paymentDetails.payment_method,
      bank_name: paymentDetails.bank_name || null,
      customer_phone: orderData.customer_display_phone || '0',
      customer_name: orderData.customer_display_name || 'UMUM',
    };
    await sendPrintRequest(notaPrintData);
  }
};

