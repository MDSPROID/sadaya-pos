import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { PendingOrderItem } from '../types/orderTypes';

interface UseHistoryPendingSalesDataProps {
  durationFilter: string;
  searchTerm: string;
}

type FetchOverride = { searchTerm?: string; durationFilter?: string };

const joinName = (first?: string | null, last?: string | null) => {
  const parts = [first, last].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
};

// Konsisten hitung durasi tunggu: pakai order_date (YYYY-MM-DD) kalau ada, fallback created_at
const DAY_MS = 24 * 60 * 60 * 1000;
const parseLocalYMD = (ymd?: string | null): Date | null => {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const calcDurasiTunggu = (row: { order_date?: string | null; created_at?: string }, nowMs = Date.now()) => {
  const base = parseLocalYMD(row.order_date) ?? new Date(row.created_at as string);
  return Math.max(0, Math.floor((nowMs - base.getTime()) / DAY_MS));
};

export const useHistoryPendingSalesData = ({
  durationFilter,
  searchTerm,
}: UseHistoryPendingSalesDataProps) => {
  const [data, setData] = useState<PendingOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingSales = useCallback(
    async (override?: FetchOverride) => {
      setLoading(true);
      setError(null);

      try {
        const activeSearch = override?.searchTerm ?? searchTerm ?? '';
        const activeDuration = override?.durationFilter ?? durationFilter ?? 'all';

        // Ambil orders pending + id petugas + designer_id di item
        let query = supabase
          .from('orders')
          .select(`
            id, created_at, order_date, pickup_date, invoice_number,
            customer_id, customer_display_name, customer_display_phone,
            kasir_id, operator_id, designer_id, finishing_id,
            total_amount, notes, priority, payment_status, order_status,
            discount_amount, tax_amount, final_amount, payment_method, bank_name,
            ready_status,
            order_items:order_items(
              id, product_id, product_name, quantity, unit_price,
              discount_per_item, subtotal_per_item, designer_id
            )
          `)
          .eq('payment_status', 'pending')
          .order('order_date', { ascending: false })
          .order('created_at', { ascending: false });

        const { data: ordersList, error: qErr } = await query;
        if (qErr) throw qErr;

        // Kumpulkan semua user id (kasir/operator/designer/finishing + designer di item)
        const idSet = new Set<string>();
        (ordersList ?? []).forEach((r: any) => {
          [r.kasir_id, r.operator_id, r.designer_id, r.finishing_id]
            .filter(Boolean)
            .forEach((id: string) => idSet.add(id));
          (r.order_items ?? [])
            .map((it: any) => it?.designer_id)
            .filter(Boolean)
            .forEach((id: string) => idSet.add(id));
        });
        const idList = Array.from(idSet);

        // Ambil nama user dari profiles (pastikan RLS SELECT di profiles mengizinkan)
        let nameById: Record<string, string> = {};
        if (idList.length > 0) {
          const { data: profs, error: profErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', idList);

          if (!profErr && Array.isArray(profs)) {
            nameById = profs.reduce((acc: Record<string, string>, p: any) => {
              acc[p.id] = joinName(p.first_name, p.last_name) || '';
              return acc;
            }, {});
          }
        }

        // Proses data + hitung durasi + susun nama-nama petugas
        const now = Date.now();
        const processed: PendingOrderItem[] = (ordersList || []).map((order: any) => {
          const d = calcDurasiTunggu(order, now);

          // Designer: kalau item ada designer_id → pakai semua unique; else fallback order.designer_id
          const itemDesignerIds: string[] = Array.from(
            new Set((order.order_items ?? []).map((it: any) => it?.designer_id).filter(Boolean))
          );
          let designer_names: string[] | null = null;
          if (itemDesignerIds.length > 0) {
            const names = itemDesignerIds
              .map((id) => nameById[id] || '')
              .filter((n) => n && n.trim());
            designer_names = names.length ? names : null;
          } else if (order.designer_id) {
            const nm = nameById[order.designer_id] || '';
            designer_names = nm.trim() ? [nm] : null;
          }

          return {
            ...order,
            // display names:
            kasir_name: nameById[order.kasir_id || ''] || null,
            operator_name: nameById[order.operator_id || ''] || null,
            finishing_name: nameById[order.finishing_id || ''] || null,
            designer_name: nameById[order.designer_id || ''] || null, // kompatibilitas
            designer_names,
            // numeric:
            discount_amount: order.discount_amount || 0,
            tax_amount: order.tax_amount || 0,
            final_amount: order.final_amount || order.total_amount,
            // durasi:
            durasi_tunggu: d,
          } as PendingOrderItem;
        });

        // Filter berdasarkan durasi
        const filteredByDuration = processed.filter((item) => {
          if (activeDuration === 'all') return true;
          const d = item.durasi_tunggu;
          if (activeDuration === '1-7') return d >= 1 && d <= 7;
          if (activeDuration === '8-14') return d >= 8 && d <= 14;
          if (activeDuration === '>14') return d > 14;
          return true;
        });

        // Filter teks (client-side) — pakai display name yang baru
        const term = (activeSearch || '').toLowerCase();
        const finalFilteredData = term
          ? filteredByDuration.filter((item) => {
              const customerName =
                (item.customer_display_name || '')?.toLowerCase();
              const customerPhone =
                (item.customer_display_phone || '')?.toLowerCase();
              const kasirName = (item.kasir_name || '').toLowerCase();
              const operatorName = (item.operator_name || '').toLowerCase();
              const designerNames = (item.designer_names || []).join(', ').toLowerCase();
              const finishingName = (item.finishing_name || '').toLowerCase();

              return (
                item.id.toLowerCase().includes(term) ||
                (item.invoice_number || '').toLowerCase().includes(term) ||
                customerName.includes(term) ||
                customerPhone.includes(term) ||
                (item.notes || '').toLowerCase().includes(term) ||
                kasirName.includes(term) ||
                operatorName.includes(term) ||
                designerNames.includes(term) ||
                finishingName.includes(term)
              );
            })
          : filteredByDuration;

        setData(finalFilteredData);
      } catch (e: any) {
        console.error('Error fetching pending orders:', e);
        showError('Gagal memuat data penjualan tertunda.');
        setError(e?.message || 'Gagal memuat data.');
      } finally {
        setLoading(false);
      }
    },
    [durationFilter, searchTerm]
  );

  useEffect(() => {
    fetchPendingSales();
  }, [fetchPendingSales]);

  return {
    data,
    loading,
    error,
    fetchPendingSales,
    setData,
  };
};
