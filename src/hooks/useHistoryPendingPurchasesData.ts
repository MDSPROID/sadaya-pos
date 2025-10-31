import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

interface PendingPurchaseItem {
  id: string;
  created_at: string;
  order_date: string;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  invoice_number?: string | null;
  total_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  final_amount?: number;
  paid_amount?: number;
  payment_status?: 'paid' | 'due' | string | null;
  keterangan?: string;
}

type FetchArgs = {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  paymentStatus?: 'all' | 'paid' | 'due';
};

const buildKeterangan = (
  orderNotes: string | null = null,
  itemNotes: Array<{ notes_per_item?: string | null }> = []
): string => {
  const parts: string[] = [];

  const orderPart = (orderNotes ?? '').trim();
  if (orderPart) {
    parts.push(`<b>Keterangan pembelian:</b>\n${orderPart}`);
  }

  const itemPartArr = itemNotes
    .map((n) => (n?.notes_per_item ?? '').trim())
    .filter(Boolean);

  if (itemPartArr.length > 0) {
    parts.push(`<b>Keterangan per item:</b>\n${itemPartArr.join('\n')}`);
  }

  return parts.join('\n\n');
};

export const useHistoryPendingPurchasesData = ({
  startDate = '',
  endDate = '',
  searchTerm = '',
  paymentStatus = 'due',
}: FetchArgs) => {
  const [data, setData] = useState<PendingPurchaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingPurchases = useCallback(async (args?: FetchArgs) => {
    const s = args?.startDate ?? startDate;
    const e = args?.endDate ?? endDate;
    const q = (args?.searchTerm ?? searchTerm).trim();
    const ps = args?.paymentStatus ?? paymentStatus;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('purchase_orders')
        .select(
          `
          id,
          created_at,
          order_date,
          supplier_id,
          supplier_display_name,
          supplier_display_phone,
          invoice_number,
          total_amount,
          discount_amount,
          final_amount,
          paid_amount,
          due_amount,
          due_date,
          payment_status,
          notes,
          purchase_order_items ( notes_per_item ),
          suppliers:supplier_id ( nama, telepon )
        `
        )
        .order('created_at', { ascending: false });

      if (s) query = query.gte('order_date', s);
      if (e) query = query.lte('order_date', e);

      if (q) {
        // Gunakan kolom denormalisasi untuk pencarian (stabil di Supabase)
        query = query.or(
          [
            `invoice_number.ilike.%${q}%`,
            `supplier_display_name.ilike.%${q}%`,
            `supplier_display_phone.ilike.%${q}%`,
          ].join(',')
        );
      }

      if (ps && ps !== 'all') {
        query = query.eq('payment_status', ps);
      }

      const { data: rows, error: err } = await query;
      if (err) throw err;

      const normalized: PendingPurchaseItem[] = (rows || []).map((r: any) => {
        const keterangan = buildKeterangan(r?.notes, r?.purchase_order_items ?? []);
        return {
          id: r.id,
          created_at: r.created_at,
          order_date: r.order_date,
          supplier_id: r.supplier_id,
          supplier_name:
            r.supplier_display_name ??
            r?.suppliers?.nama ??
            null,
          supplier_phone:
            r.supplier_display_phone ??
            r?.suppliers?.telepon ??
            null,
          invoice_number: r.invoice_number ?? null,
          total_amount: Number(r.total_amount || 0),
          discount_amount: Number(r.discount_amount || 0),
          // tax_amount: Number(r.tax_amount || 0), // aktifkan jika kolom ada
          final_amount: Number(r.final_amount || r.total_amount || 0),
          paid_amount: Number(r.paid_amount || 0),
          payment_status: r.payment_status || 'due',
          keterangan: keterangan || '',
        };
      });

      setData(normalized);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Gagal memuat data pending pembelian.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchTerm, paymentStatus]);

  useEffect(() => {
    fetchPendingPurchases();
  }, [fetchPendingPurchases]);

  return { data, loading, error, fetchPendingPurchases, setData };
};
