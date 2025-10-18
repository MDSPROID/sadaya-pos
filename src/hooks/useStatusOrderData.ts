// src/hooks/useStatusOrderData.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { PendingOrderItem } from '../types/orderTypes';

interface UseStatusOrderDataProps {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  searchTerm: string;
  statusFilter: 'all' | 'new' | 'proses_cetak' | 'siap_ambil'; // ⬅️ NEW
}
type FetchOverride = {
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  statusFilter?: 'all' | 'new' | 'proses_cetak' | 'siap_ambil';
};

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

export const useStatusOrderData = ({ startDate, endDate, searchTerm, statusFilter }: UseStatusOrderDataProps) => {
  const [data, setData] = useState<PendingOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatusOrders = useCallback(async (override?: FetchOverride) => {
    setLoading(true);
    setError(null);
    try {
      const sTerm = override?.searchTerm ?? searchTerm;
      const sDate = override?.startDate ?? startDate; // 'YYYY-MM-DD'
      const eDate = override?.endDate ?? endDate;     // 'YYYY-MM-DD'
      const stFilter = override?.statusFilter ?? statusFilter;

      // let fromDays = 0, toDays = 99999;
      // if (dFilter === '1-7')      { fromDays = 1;  toDays = 7; }
      // else if (dFilter === '8-14'){ fromDays = 8;  toDays = 14; }
      // else if (dFilter === '>14') { fromDays = 15; toDays = 99999; }

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
        .eq('ready_status', 'ready')
        .order('created_at', { ascending: false });

      // ⬇️ NEW: terapkan filter status (new | proses_cetak | siap_ambil)
      if (stFilter !== 'all') {
        query = query.eq('order_status', stFilter);
      }

      if (sTerm?.trim()) {
        query = query.or([
          `customer_display_name.ilike.%${sTerm}%`,
          `invoice_number.ilike.%${sTerm}%`,
          `customer_display_phone.ilike.%${sTerm}%`
        ].join(','));
      }

      // ⬇️ Filter tanggal (inklusif)
      // Jika kolom order_date bertipe DATE, cukup YYYY-MM-DD.
      // Jika bertipe timestamp, tetap aman karena .gte/.lte akan cocok string prefix.
      if (sDate) query = query.gte('order_date', sDate);
      if (eDate) query = query.lte('order_date', eDate);

      const { data: rows, error: qErr } = await query;
      if (qErr) throw qErr;

      const idSet = new Set<string>();
      (rows ?? []).forEach((r: any) => {
        [r.kasir_id, r.operator_id, r.designer_id, r.finishing_id]
          .filter(Boolean)
          .forEach((id: string) => idSet.add(id));

        (r.order_items ?? [])
          .map((it: any) => it?.designer_id)
          .filter(Boolean)
          .forEach((id: string) => idSet.add(id));
      });
      const idList = Array.from(idSet);

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

      const mapped = (rows ?? [])
        .map((row: any) => {
          const durasi = calculateDuration(row.order_date);

          const itemDesignerIds: string[] = Array.from(
            new Set(
              (row.order_items ?? [])
                .map((it: any) => it?.designer_id)
                .filter(Boolean)
            )
          );

          let designer_names: string[] = [];
          if (itemDesignerIds.length > 0) {
            designer_names = itemDesignerIds
              .map((id) => nameById[id] || '')
              .filter((n) => n && n.trim());
          } else if (row.designer_id) {
            const nm = nameById[row.designer_id] || '';
            if (nm.trim()) designer_names = [nm];
          }

          return {
            ...row,
            kasir_name: nameById[row.kasir_id || ''] || null,
            operator_name: nameById[row.operator_id || ''] || null,
            finishing_name: nameById[row.finishing_id || ''] || null,
            designer_names: designer_names.length ? designer_names : null,
            durasi_tunggu: durasi,
          };
        });

      setData(mapped as any);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Gagal memuat Status Order.');
      showError(e?.message || 'Gagal memuat Status Order.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, searchTerm, statusFilter]);

  useEffect(() => { fetchStatusOrders(); }, [fetchStatusOrders]);

  return { data, loading, error, fetchStatusOrders, setData };
};
