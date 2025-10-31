// src/utils/salesDbOperations.ts
import { supabase } from '../integrations/supabase/client';
import { sendPrintRequest } from './printAgent';

import {
  OrderDataToSave,
  ItemToInsert as OrderItemToSave,
  PaymentDetails,
} from '../types/salesOrderTypes';

/* =========================
   Helpers normalisasi dimensi
   ========================= */
type DimInput =
  | { panjang?: number | string; lebar?: number | string; satuan?: string }
  | string
  | null
  | undefined;

const normalizeDims = (raw: DimInput) => {
  if (!raw) return {} as { panjang?: number; lebar?: number; satuan?: string };
  let obj: any = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { obj = {}; }
  }
  const toNum = (v: any) =>
    v === '' || v === null || v === undefined
      ? undefined
      : Number(String(v).replace(/[^\d.]/g, ''));
  return {
    panjang: toNum(obj?.panjang),
    lebar: toNum(obj?.lebar),
    satuan: obj?.satuan || 'M',
  } as { panjang?: number; lebar?: number; satuan?: string };
};

const areaFromDimsM2 = (dims?: { panjang?: number; lebar?: number; satuan?: string }) => {
  if (!dims) return 0;
  let p = Number(dims.panjang) || 0;
  let l = Number(dims.lebar) || 0;
  const satuan = String(dims.satuan || 'M').toUpperCase(); // "M" / "CM"
  if (satuan === 'CM') { p /= 100; l /= 100; }
  const a = p * l;
  return Number.isFinite(a) && a > 0 ? a : 0;
};

const shouldUseArea = (dims?: { panjang?: number; lebar?: number; satuan?: string }) => {
  if (!dims) return false;
  const p = Number(dims.panjang) || 0;
  const l = Number(dims.lebar) || 0;
  const satuan = String(dims.satuan || '').toUpperCase();
  // Hanya gunakan luas jika satuan dimensi M/CM dan P & L > 0
  if ((satuan === 'M' || satuan === 'CM') && p > 0 && l > 0) return true;
  return false;
};

/* ======================================================
   Ambil metadata produk → bahan_id
   ====================================================== */
type ProdukMeta = {
  product_id: string;
  bahan_id: string | null;
};

async function getProdukBahanMeta(productIds: string[]): Promise<Map<string, ProdukMeta>> {
  if (!productIds.length) return new Map();
  const uniq = Array.from(new Set(productIds));

  const { data, error } = await supabase
    .from('produk')
    .select(`id, bahan_id`)
    .in('id', uniq);

  if (error) throw error;

  const map = new Map<string, ProdukMeta>();
  for (const row of (data as any[]) || []) {
    map.set(row.id, {
      product_id: row.id,
      bahan_id: row?.bahan_id ?? null,
    });
  }
  return map;
}

/* ======================================================
   Hitung total pemakaian stok per-bahan untuk kumpulan item
   ATURAN TERBARU:
   - Jika dims kosong/tidak valid → pakai QTY
   - Jika dims ada & satuan M/CM → pakai area(P×L)×QTY
   ====================================================== */
type LiteItem = {
  product_id: string;
  quantity: number;
  stock_deducted?: number | null; // tersimpan m² (optional)
  dimensions?: any;               // sumber kebenaran unit dimensi (M/CM)
};

function calcTotalsPerBahan(items: LiteItem[], meta: Map<string, ProdukMeta>): Map<string, number> {
  const perBahan = new Map<string, number>();
  for (const it of items) {
    const m = meta.get(it.product_id);
    if (!m || !m.bahan_id) continue;

    const qty = Number(it.quantity || 0);
    if (!qty) continue;

    const dims = normalizeDims(it.dimensions);
    let toDeduct = 0;

    if (shouldUseArea(dims)) {
      // Gunakan luas m² × QTY (pakai stock_deducted kalau ada/valid; kalau tidak, hitung ulang)
      let sd = Number(it.stock_deducted || 0);
      if (!sd || sd <= 0) {
        const area = areaFromDimsM2(dims);
        sd = area > 0 ? area * qty : 0;
      } else {
        // sd di DB adalah luas m² per-item × qty? kita treat sd sudah termasuk QTY.
        // Bila sd ternyata tersimpan per-item (bukan total), uncomment:
        // sd = sd * qty;
      }
      toDeduct = sd;
    } else {
      // Dimensi tidak ada → pakai QTY
      toDeduct = qty;
    }

    if (!toDeduct) continue;
    perBahan.set(m.bahan_id, (perBahan.get(m.bahan_id) || 0) + Number(toDeduct));
  }
  return perBahan;
}

/* =========================================
   Terapkan delta stok per-bahan (bisa ±)
   delta > 0 → stok berkurang
   delta < 0 → stok bertambah kembali
   ========================================= */
async function applyDeltaPerBahan(perBahanDelta: Map<string, number>) {
  if (!perBahanDelta.size) return;
  for (const [bahanId, delta] of perBahanDelta) {
    if (!delta) continue;

    const { data: row, error: gerr } = await supabase
      .from('bahan')
      .select('stok')
      .eq('id', bahanId)
      .maybeSingle();
    if (gerr) throw gerr;

    const curr = Number(row?.stok || 0);
    const next = Math.max(0, curr - delta);
    const { error: uerr } = await supabase
      .from('bahan')
      .update({ stok: next })
      .eq('id', bahanId);
    if (uerr) throw uerr;
  }
}

/* =========================================
   SAVE ORDER (insert BARU)
   ========================================= */
export const saveSalesOrder = async (
  orderData: OrderDataToSave,
  itemsToInsert: OrderItemToSave[],
  currentUserId: string,
  status: 'pending' | 'paid',
  paymentDetails?: PaymentDetails,
  options?: { skipPrint?: boolean }
) => {
  // 1) Insert order
  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert([{ ...orderData }])
    .select()
    .single();
  if (orderError) throw orderError;

  // 2) Insert items (isi stock_deducted mengikuti aturan baru)
  const itemsWithOrderId = itemsToInsert.map((item) => {
    const dimsObj = normalizeDims(item.dimensions as any);

    // kalau dims valid & satuan M/CM → simpan luas m² × QTY
    // kalau dims tidak valid → simpan 0 (karena pemotongan akan pakai QTY)
    let stock_deducted = 0;
    if (shouldUseArea(dimsObj)) {
      const area = areaFromDimsM2(dimsObj);
      if (area > 0) stock_deducted = Number((area * Number(item.quantity || 1)).toFixed(3));
    }

    return {
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
      stock_deducted, // m² total untuk item ini (0 jika pakai QTY)
    };
  });

  if (itemsWithOrderId.length > 0) {
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);
    if (itemsError) throw itemsError;
  }

  // 3) Potong stok total untuk transaksi baru jika paid / ada DP / ready
  const hasDp = (paymentDetails?.dp_amount ?? 0) > 0;
  const isReady = orderData?.ready_status === 'ready';
  if (status === 'paid' || hasDp || isReady) {
    const productIds = itemsWithOrderId.map((x) => x.product_id);
    const meta = await getProdukBahanMeta(productIds);
    const totalsBaru = calcTotalsPerBahan(
      itemsWithOrderId.map((x) => ({
        product_id: x.product_id,
        quantity: x.quantity,
        stock_deducted: x.stock_deducted,
        dimensions: x.dimensions,
      })),
      meta
    );
    await applyDeltaPerBahan(totalsBaru); // delta = +baru (sebelumnya 0)
  }

  // 4) Log
  await supabase.from('activity_logs').insert([{
    user_id: currentUserId,
    action: `Membuat pesanan baru (${newOrder.id})`,
    details: {
      order_id: newOrder.id,
      customer_name: orderData.customer_display_name,
      final_amount: orderData.final_amount,
      status,
    },
  }]);

  // 5) Print
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
        (paymentDetails.paid_amount ?? 0) + (paymentDetails.dp_amount ?? 0) - orderData.final_amount,
      payment_method: paymentDetails.payment_method,
      bank_name: paymentDetails.bank_name || null,
      customer_phone: orderData.customer_display_phone || '0',
      customer_name: orderData.customer_display_name || 'UMUM',
    };
    await sendPrintRequest(notaPrintData);
  }

  return newOrder;
};

/* =========================================
   UPDATE ORDER (hitung DELTA stok)
   ========================================= */
export const updateSalesOrder = async (
  orderId: string,
  orderData: OrderDataToSave,
  itemsToUpsert: OrderItemToSave[],
  currentUserId: string,
  status: 'pending' | 'paid',
  paymentDetails?: PaymentDetails,
  options?: { skipPrint?: boolean }
) => {
  const { invoice_number: _ignoreInvoice, ...updatePayload } = orderData as any;

  // 0) Ambil items lama dulu (SEBELUM replace)
  const { data: oldItems, error: oldErr } = await supabase
    .from('order_items')
    .select('product_id, quantity, stock_deducted, dimensions')
    .eq('order_id', orderId);
  if (oldErr) throw oldErr;

  // 1) Update order
  const { data: updatedOrder, error: orderUpdateError } = await supabase
    .from('orders')
    .update({ ...updatePayload })
    .eq('id', orderId)
    .select()
    .single();
  if (orderUpdateError) throw orderUpdateError;

  // 2) Replace items (recompute stock_deducted sesuai aturan baru)
  const { error: deleteItemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId);
  if (deleteItemsError) throw deleteItemsError;

  const itemsWithOrderId = itemsToUpsert.map((item) => {
    const dimsObj = normalizeDims(item.dimensions as any);

    let stock_deducted = 0;
    if (shouldUseArea(dimsObj)) {
      const area = areaFromDimsM2(dimsObj);
      if (area > 0) stock_deducted = Number((area * Number(item.quantity || 1)).toFixed(3));
    }

    return {
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
      stock_deducted, // 0 jika pakai QTY
    };
  });

  if (itemsWithOrderId.length > 0) {
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);
    if (itemsError) throw itemsError;
  }

  // 3) Ubah stok hanya jika paid / ada DP / ready
  const hasDp = (paymentDetails?.dp_amount ?? 0) > 0;
  const isReady = orderData?.ready_status === 'ready';
  if (status === 'paid' || hasDp || isReady) {
    // Ambil meta produk sekali jalan
    const productIds = [
      ...(oldItems || []).map((x: any) => x.product_id),
      ...itemsWithOrderId.map((x) => x.product_id),
    ];
    const meta = await getProdukBahanMeta(productIds);

    // Totals lama (pakai aturan baru)
    const totalsLama = calcTotalsPerBahan(
      (oldItems || []).map((x: any) => ({
        product_id: x.product_id,
        quantity: Number(x.quantity || 0),
        stock_deducted: Number(x.stock_deducted || 0),
        dimensions: x.dimensions,
      })),
      meta
    );

    // Totals baru
    const totalsBaru = calcTotalsPerBahan(
      itemsWithOrderId.map((x) => ({
        product_id: x.product_id,
        quantity: x.quantity,
        stock_deducted: x.stock_deducted,
        dimensions: x.dimensions,
      })),
      meta
    );

    // Delta = baru - lama
    const bahanKeys = new Set<string>([
      ...Array.from(totalsLama.keys()),
      ...Array.from(totalsBaru.keys()),
    ]);

    const deltaMap = new Map<string, number>();
    for (const k of bahanKeys) {
      const oldVal = Number(totalsLama.get(k) || 0);
      const newVal = Number(totalsBaru.get(k) || 0);
      const delta = newVal - oldVal;
      if (Math.abs(delta) > 1e-9) {
        deltaMap.set(k, delta);
      }
    }

    if (deltaMap.size > 0) {
      await applyDeltaPerBahan(deltaMap);
    }
  }

  // 4) Log
  await supabase.from('activity_logs').insert([{
    user_id: currentUserId,
    action: `Melanjutkan pesanan (${orderId})`,
    details: {
      order_id: orderId,
      customer_name: orderData.customer_display_name,
      final_amount: orderData.final_amount,
      status,
    },
  }]);

  // 5) Print
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
        (paymentDetails.paid_amount ?? 0) + (paymentDetails.dp_amount ?? 0) - orderData.final_amount,
      payment_method: paymentDetails.payment_method,
      bank_name: paymentDetails.bank_name || null,
      customer_phone: orderData.customer_display_phone || '0',
      customer_name: orderData.customer_display_name || 'UMUM',
    };
    await sendPrintRequest(notaPrintData);
  }

  return updatedOrder;
};
