// src/hooks/useStatusOrderData.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { PendingOrderItem } from '../types/orderTypes';
import { calcDurasiTunggu } from '../hooks/durasiTunggu';

interface UseStatusOrderDataProps {
  durationFilter: string;
  searchTerm: string;
}
type FetchOverride = { searchTerm?: string; durationFilter?: string };

const joinName = (first?: string | null, last?: string | null) => {
  const parts = [first, last].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
};

export const useStatusOrderData = ({ durationFilter, searchTerm }: UseStatusOrderDataProps) => {
  const [data, setData] = useState<PendingOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatusOrders = useCallback(async (override?: FetchOverride) => {
    setLoading(true);
    setError(null);
    try {
      const sTerm = override?.searchTerm ?? searchTerm;
      const dFilter = override?.durationFilter ?? durationFilter;

      let fromDays = 0, toDays = 99999;
      if (dFilter === '1-7') { fromDays = 1; toDays = 7; }
      else if (dFilter === '8-14') { fromDays = 8; toDays = 14; }
      else if (dFilter === '>14') { fromDays = 15; toDays = 99999; }

      // Ambil orders READY + id petugas
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

      if (sTerm?.trim()) {
        query = query.or([
          `customer_display_name.ilike.%${sTerm}%`,
          `invoice_number.ilike.%${sTerm}%`,
          `customer_display_phone.ilike.%${sTerm}%`
        ].join(','));
      }

      const { data: rows, error: qErr } = await query;
      if (qErr) throw qErr;

      // Kumpulkan semua user_id unik dari 4 kolom petugas + designer dari items
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

      // Ambil nama user dari profiles (kalau RLS block, aman: fallback '-')
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

      const now = Date.now();
      const mapped = (rows ?? [])
        .filter((row: any) => {
          const d = calcDurasiTunggu(row, now);
          return d >= fromDays && d <= toDays;
        })
        .map((row: any) => {
          // 1) Kumpulkan semua designer dari order_items
          const itemDesignerIds: string[] = Array.from(
            new Set(
              (row.order_items ?? [])
                .map((it: any) => it?.designer_id)
                .filter(Boolean)
            )
          );

          // 2) Tentukan daftar nama:
          //    - jika ada di items, pakai semua nama item
          //    - else fallback ke orders.designer_id
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
            durasi_tunggu: calcDurasiTunggu(row, now),
          };
        }) as any[];

      setData(mapped as any);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Gagal memuat Status Order.');
      showError(e?.message || 'Gagal memuat Status Order.');
    } finally {
      setLoading(false);
    }
  }, [durationFilter, searchTerm]);

  useEffect(() => { fetchStatusOrders(); }, [fetchStatusOrders]);

  return { data, loading, error, fetchStatusOrders, setData };
};
