import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { PendingOrderItem } from '../types/orderTypes';

interface UseHistoryPendingSalesDataProps {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  searchTerm: string;
}

export type PendingFetchMode = 'range' | 'all';

type FetchOverride = {
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  /** 'all' = semua order pending dari yang paling lama s/d hari ini (abaikan tanggal), pakai cache */
  mode?: PendingFetchMode;
  /** paksa ambil ulang dari server walau cache masih berlaku (mode 'all') */
  force?: boolean;
};

const ORDER_SELECT = `
  id, created_at, order_date, pickup_date, invoice_number,
  customer_id, customer_display_name, customer_display_phone,
  kasir_id, operator_id, designer_id, finishing_id,
  total_amount, notes, priority, payment_status, order_status,
  discount_amount, tax_amount, final_amount, payment_method, bank_name, wa_notified
`;

const PAGE_SIZE = 1000;   // batas default PostgREST per request
const ID_CHUNK = 200;     // batas aman panjang URL untuk .in()
const ALL_CACHE_TTL_MS = 10 * 60 * 1000;

// Cache modul: bertahan selama tab dibuka (pindah halaman lalu kembali tidak query ulang)
let allPendingCache: { rows: PendingOrderItem[]; fetchedAt: number } | null = null;

const joinName = (first?: string | null, last?: string | null) => {
  const a = (first || '').trim();
  const b = (last || '').trim();
  const s = `${a} ${b}`.trim();
  return s || null;
};

const calculateDuration = (orderDate: string): number => {
  const today = new Date();
  const order = new Date(orderDate);
  const diffTime = Math.abs(today.getTime() - order.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/** Ambil orders pending; tanpa tanggal = semua. Dipaging per 1000 agar tidak terpotong. */
const fetchPendingOrders = async (opts: { startDate?: string; endDate?: string; serverTerm?: string }) => {
  const rows: any[] = [];
  let from = 0;
  for (;;) {
    let q = supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (opts.startDate) q = q.gte('order_date', opts.startDate);
    if (opts.endDate) q = q.lte('order_date', opts.endDate);
    if (opts.serverTerm?.trim()) {
      const t = opts.serverTerm.trim();
      q = q.or([
        `customer_display_name.ilike.%${t}%`,
        `invoice_number.ilike.%${t}%`,
        `customer_display_phone.ilike.%${t}%`,
      ].join(','));
    }

    const { data, error } = await q;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
};

/** Lengkapi nama petugas & designer per order (order_items + profiles), dipecah per-chunk. */
const enrichRows = async (rows: any[]): Promise<PendingOrderItem[]> => {
  if (rows.length === 0) return [];

  const orderIds = rows.map((r) => r.id as string);
  const itemsRaw: any[] = [];
  for (const ids of chunk(orderIds, ID_CHUNK)) {
    const { data, error } = await supabase
      .from('order_items')
      .select('order_id, designer_id')
      .in('order_id', ids);
    if (error) console.warn('order_items fetch error:', error);
    else itemsRaw.push(...(data || []));
  }

  const idSet = new Set<string>();
  rows.forEach((r) => {
    [r.kasir_id, r.operator_id, r.designer_id, r.finishing_id].filter(Boolean).forEach((id: string) => idSet.add(id));
  });
  itemsRaw.forEach((it) => { if (it?.designer_id) idSet.add(it.designer_id); });

  const nameById: Record<string, string> = {};
  for (const ids of chunk(Array.from(idSet), ID_CHUNK)) {
    const { data: profs, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', ids);
    if (!error && Array.isArray(profs)) {
      profs.forEach((p: any) => { nameById[p.id] = joinName(p.first_name, p.last_name) || ''; });
    }
  }

  const designersPerOrder = new Map<string, string[]>();
  itemsRaw.forEach((it) => {
    const nm = nameById[it?.designer_id || ''] || '';
    if (!nm.trim()) return;
    const arr = designersPerOrder.get(it.order_id) || [];
    if (!arr.includes(nm)) arr.push(nm);
    designersPerOrder.set(it.order_id, arr);
  });

  return rows.map((row) => {
    const itemDesignerNames = designersPerOrder.get(row.id) || [];
    return {
      ...row,
      kasir_name:     nameById[row.kasir_id || ''] || null,
      operator_name:  nameById[row.operator_id || ''] || null,
      finishing_name: nameById[row.finishing_id || ''] || null,
      designer_name:  row.designer_id ? (nameById[row.designer_id] || null) : null,
      designer_names: itemDesignerNames.length ? itemDesignerNames : null,
      durasi_tunggu:  calculateDuration(row.order_date),
    } as PendingOrderItem;
  });
};

const applyTerm = (rows: PendingOrderItem[], sTerm: string) => {
  const term = sTerm.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((item: any) => {
    const dn = (Array.isArray(item.designer_names) ? item.designer_names.join(' ') : '').toLowerCase();
    return (
      (item.invoice_number || '').toLowerCase().includes(term) ||
      String(item.id || '').toLowerCase().includes(term) ||
      (item.customer_display_name || '').toLowerCase().includes(term) ||
      (item.customer_display_phone || '').toLowerCase().includes(term) ||
      (item.notes || '').toLowerCase().includes(term) ||
      (item.kasir_name || '').toLowerCase().includes(term) ||
      (item.operator_name || '').toLowerCase().includes(term) ||
      (item.finishing_name || '').toLowerCase().includes(term) ||
      dn.includes(term)
    );
  });
};

export const useHistoryPendingSalesData = ({ startDate, endDate, searchTerm }: UseHistoryPendingSalesDataProps) => {
  const [data, setData] = useState<PendingOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** waktu data mode 'all' terakhir diambil dari server (null = belum/ bukan mode all) */
  const [allFetchedAt, setAllFetchedAt] = useState<number | null>(null);

  const fetchPendingSales = useCallback(async (override?: FetchOverride) => {
    setLoading(true);
    setError(null);
    try {
      const sTerm = override?.searchTerm ?? searchTerm ?? '';
      const mode: PendingFetchMode = override?.mode ?? 'range';

      let mapped: PendingOrderItem[];

      if (mode === 'all') {
        const fresh = allPendingCache && (Date.now() - allPendingCache.fetchedAt) < ALL_CACHE_TTL_MS;
        if (!fresh || override?.force) {
          const rows = await fetchPendingOrders({});
          allPendingCache = { rows: await enrichRows(rows), fetchedAt: Date.now() };
        }
        mapped = allPendingCache!.rows;
        setAllFetchedAt(allPendingCache!.fetchedAt);
      } else {
        const rows = await fetchPendingOrders({
          startDate: override?.startDate ?? startDate,
          endDate: override?.endDate ?? endDate,
          serverTerm: sTerm,
        });
        mapped = await enrichRows(rows);
        setAllFetchedAt(null);
      }

      setData(applyTerm(mapped, sTerm));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Gagal memuat data pending.');
      showError(e?.message || 'Gagal memuat data pending.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchTerm]);

  /** Setelah ubah/hapus baris, sinkronkan juga ke cache mode 'all' agar tidak muncul lagi saat toggle. */
  const patchCache = useCallback((updater: (rows: PendingOrderItem[]) => PendingOrderItem[]) => {
    if (allPendingCache) allPendingCache = { ...allPendingCache, rows: updater(allPendingCache.rows) };
  }, []);

  useEffect(() => { fetchPendingSales(); }, [fetchPendingSales]);

  return { data, loading, error, fetchPendingSales, setData, allFetchedAt, patchCache };
};
