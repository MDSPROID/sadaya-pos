import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { PendingOrderItem } from '../types/orderTypes'; // pastikan tipe ini sesuai strukturnya

interface UseHistoryPendingSalesDataProps {
  durationFilter: string;
  searchTerm: string; // tidak akan dipakai sebagai trigger fetch di sini
}

type FetchOverride = {
  searchTerm?: string;
  durationFilter?: string;
};

export const useHistoryPendingSalesData = ({
  durationFilter,
  searchTerm,
}: UseHistoryPendingSalesDataProps) => {
  const [data, setData] = useState<PendingOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateDuration = (orderDate: string): number => {
    const today = new Date();
    const order = new Date(orderDate);
    const diffTime = Math.abs(today.getTime() - order.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const fetchPendingSales = useCallback(
    async (override?: FetchOverride) => {
      setLoading(true);
      setError(null);

      const activeSearch = override?.searchTerm ?? searchTerm ?? '';
      const activeDuration = override?.durationFilter ?? durationFilter ?? 'all';

      let query = supabase
        .from('orders')
        .select(
          `
          id,
          created_at,
          order_date,
          customer_id,
          customer_display_name,
          customer_display_phone,
          pelanggan(nama_pelanggan, telepon, catatan),
          kasir_id,
          profiles(first_name, last_name),
          total_amount,
          notes,
          pickup_date,
          priority,
          invoice_number,
          discount_amount,
          tax_amount,
          final_amount,
          payment_status,
          order_status,
          payment_method,
          bank_name
        `
        )
        .eq('payment_status', 'pending')
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false });

      const { data: ordersList, error } = await query;

      if (error) {
        console.error('Error fetching pending orders:', error);
        showError('Gagal memuat data penjualan tertunda.');
        setError(error.message);
        setLoading(false);
        return;
      }

      const processedData: PendingOrderItem[] = (ordersList || []).map((order: any) => {
        const rawProfiles: any = order.profiles;
        let profileData: { first_name: string | null; last_name: string | null } | null = null;

        if (rawProfiles) {
          if (Array.isArray(rawProfiles) && rawProfiles.length > 0) {
            profileData = {
              first_name: rawProfiles[0].first_name ?? null,
              last_name: rawProfiles[0].last_name ?? null,
            };
          } else if (typeof rawProfiles === 'object') {
            profileData = {
              first_name: rawProfiles.first_name ?? null,
              last_name: rawProfiles.last_name ?? null,
            };
          }
        }

        const pelangganArr = Array.isArray(order.pelanggan)
          ? order.pelanggan
          : order.pelanggan
          ? [order.pelanggan]
          : [];

        const pelanggan0 = pelangganArr[0] || null;

        return {
          ...order,
          pelanggan: Array.isArray(order.pelanggan)
            ? order.pelanggan
            : order.pelanggan
            ? [order.pelanggan]
            : null,
          profiles: profileData,
          durasi_tunggu: calculateDuration(order.order_date),
          discount_amount: order.discount_amount || 0,
          tax_amount: order.tax_amount || 0,
          final_amount: order.final_amount || order.total_amount,
          catatan_pelanggan: pelanggan0?.catatan ?? null,
          order_items: [], // tidak diambil di sini
        } as PendingOrderItem;
      });

      // Filter berdasarkan durasi
      const filteredByDuration = processedData.filter((item) => {
        if (activeDuration === 'all') return true;
        const d = item.durasi_tunggu;
        if (activeDuration === '1-7') return d >= 1 && d <= 7;
        if (activeDuration === '8-14') return d >= 8 && d <= 14;
        if (activeDuration === '>14') return d > 14;
        return true;
      });

      // Filter teks (client-side)
      const term = activeSearch.toLowerCase();
      const finalFilteredData = term
        ? filteredByDuration.filter((item) => {
            const customerName =
              (item.customer_display_name ||
                item.pelanggan?.[0]?.nama_pelanggan ||
                '')?.toLowerCase();
            const customerPhone =
              (item.customer_display_phone ||
                item.pelanggan?.[0]?.telepon ||
                '')?.toLowerCase();
            const kasirName = item.profiles?.first_name?.toLowerCase() || '';
            return (
              item.id.toLowerCase().includes(term) ||
              (item.invoice_number || '').toLowerCase().includes(term) ||
              customerName.includes(term) ||
              customerPhone.includes(term) ||
              (item.notes || '').toLowerCase().includes(term) ||
              kasirName.includes(term)
            );
          })
        : filteredByDuration;

      setData(finalFilteredData);
      setLoading(false);
    },
    [durationFilter, searchTerm]
  );

  // Initial load sekali saat mount
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
