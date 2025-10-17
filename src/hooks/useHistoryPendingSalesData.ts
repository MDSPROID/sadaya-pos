import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { PendingOrderItem } from '../types/orderTypes';

interface UseHistoryPendingSalesDataProps {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  searchTerm: string;
}
type FetchOverride = { searchTerm?: string; startDate?: string; endDate?: string };

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

export const useHistoryPendingSalesData = ({ startDate, endDate, searchTerm }: UseHistoryPendingSalesDataProps) => {
  const [data, setData] = useState<PendingOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingSales = useCallback(async (override?: FetchOverride) => {
    setLoading(true);
    setError(null);
    try {
      const sTerm = override?.searchTerm ?? searchTerm ?? '';
      const sDate = override?.startDate ?? startDate;
      const eDate = override?.endDate ?? endDate;

      // 1) Ambil orders pending, terapkan filter tanggal inkusif
      let q = supabase
        .from('orders')
        .select(`
          id, created_at, order_date, pickup_date, invoice_number,
          customer_id, customer_display_name, customer_display_phone,
          kasir_id, operator_id, designer_id, finishing_id,
          total_amount, notes, priority, payment_status, order_status,
          discount_amount, tax_amount, final_amount, payment_method, bank_name
        `)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (sDate) q = q.gte('order_date', sDate);
      if (eDate) q = q.lte('order_date', eDate);

      if (sTerm.trim()) {
        q = q.or([
          `customer_display_name.ilike.%${sTerm}%`,
          `invoice_number.ilike.%${sTerm}%`,
          `customer_display_phone.ilike.%${sTerm}%`
        ].join(','));
      }

      const { data: rows, error: orderErr } = await q;
      if (orderErr) throw orderErr;

      if (!rows || rows.length === 0) {
        setData([]);
        return;
      }

      // 2) Ambil order_items untuk kumpulkan designer per order
      const orderIds = rows.map((r: any) => r.id);
      const { data: itemsRaw, error: itemsErr } = await supabase
        .from('order_items')
        .select('order_id, designer_id')
        .in('order_id', orderIds);

      if (itemsErr) {
        console.warn('order_items fetch error:', itemsErr);
      }

      // 3) Kumpulkan semua user id unik
      const idSet = new Set<string>();
      rows.forEach((r: any) => {
        [r.kasir_id, r.operator_id, r.designer_id, r.finishing_id]
          .filter(Boolean).forEach((id: string) => idSet.add(id));
      });
      (itemsRaw || []).forEach((it: any) => { if (it?.designer_id) idSet.add(it.designer_id); });
      const idList = Array.from(idSet);

      // 4) Map id -> nama (profiles)
      let nameById: Record<string, string> = {};
      if (idList.length) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', idList);

        if (!profErr && Array.isArray(profs)) {
          nameById = profs.reduce((acc: Record<string,string>, p: any) => {
            acc[p.id] = joinName(p.first_name, p.last_name) || '';
            return acc;
          }, {});
        }
      }

      // 5) Map order_id -> daftar nama designer unik dari items
      const designersPerOrder = new Map<string, string[]>();
      (itemsRaw || []).forEach((it: any) => {
        const nm = nameById[it?.designer_id || ''] || '';
        if (!nm.trim()) return;
        const arr = designersPerOrder.get(it.order_id) || [];
        if (!arr.includes(nm)) arr.push(nm);
        designersPerOrder.set(it.order_id, arr);
      });

      // 6) Bentuk payload + hitung durasi (untuk tampilan kolom) + filter teks client-side
      const mapped = (rows as any[]).map((row) => {
        const durasi = calculateDuration(row.order_date);
        const itemDesignerNames = designersPerOrder.get(row.id) || [];
        const singleDesigner = row.designer_id ? (nameById[row.designer_id] || null) : null;

        return {
          ...row,
          kasir_name:     nameById[row.kasir_id || ''] || null,
          operator_name:  nameById[row.operator_id || ''] || null,
          finishing_name: nameById[row.finishing_id || ''] || null,
          designer_name:  singleDesigner,
          designer_names: itemDesignerNames.length ? itemDesignerNames : null,
          durasi_tunggu:  durasi,
        } as PendingOrderItem;
      });

      const term = sTerm.toLowerCase();
      const finalFilteredData = term
        ? mapped.filter((item: any) => {
            const customerName = (item.customer_display_name || '').toLowerCase();
            const customerPhone = (item.customer_display_phone || '').toLowerCase();
            const dn = (Array.isArray(item.designer_names) ? item.designer_names.join(' ') : '').toLowerCase();
            return (
              (item.invoice_number || '').toLowerCase().includes(term) ||
              String(item.id || '').toLowerCase().includes(term) ||
              customerName.includes(term) ||
              customerPhone.includes(term) ||
              (item.notes || '').toLowerCase().includes(term) ||
              (item.kasir_name || '').toLowerCase().includes(term) ||
              (item.operator_name || '').toLowerCase().includes(term) ||
              (item.finishing_name || '').toLowerCase().includes(term) ||
              dn.includes(term)
            );
          })
        : mapped;

      setData(finalFilteredData as any);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Gagal memuat data pending.');
      showError(e?.message || 'Gagal memuat data pending.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchTerm]);

  useEffect(() => { fetchPendingSales(); }, [fetchPendingSales]);

  return { data, loading, error, fetchPendingSales, setData };
};
