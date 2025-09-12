import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { PendingOrderItem } from '../types/orderTypes'; // OrderItemDetail dihapus

interface UseHistoryPendingSalesDataProps {
  durationFilter: string;
  searchTerm: string;
}

export const useHistoryPendingSalesData = ({ durationFilter, searchTerm }: UseHistoryPendingSalesDataProps) => {
  const [data, setData] = useState<PendingOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateDuration = (orderDate: string): number => {
    const today = new Date();
    const order = new Date(orderDate);
    const diffTime = Math.abs(today.getTime() - order.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const fetchPendingSales = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('orders')
      .select(`
        id,
        created_at,
        order_date,
        customer_id,
        customer_display_name,
        customer_display_phone,
        pelanggan(nama_pelanggan, telepon),
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
      `)
      .eq('payment_status', 'pending')
      .order('order_date', { ascending: false })
      .order('created_at', { ascending: false });

    const { data: ordersList, error } = await query;

    if (error) {
      console.error('Error fetching pending orders:', error);
      showError('Gagal memuat data penjualan tertunda.');
      setError(error.message);
    } else {
      const processedData: PendingOrderItem[] = (ordersList || []).map(order => {
        const rawProfiles: any = order.profiles;
        let profileData: { first_name: string | null; last_name: string | null; } | null = null;

        if (rawProfiles) {
          if (Array.isArray(rawProfiles) && rawProfiles.length > 0) {
            profileData = {
              first_name: rawProfiles[0].first_name as string | null,
              last_name: rawProfiles[0].last_name as string | null,
            };
          } else if (typeof rawProfiles === 'object') {
            profileData = {
              first_name: rawProfiles.first_name as string | null,
              last_name: rawProfiles.last_name as string | null,
            };
          }
        }

        return {
          ...order,
          pelanggan: Array.isArray(order.pelanggan) ? order.pelanggan : (order.pelanggan ? [order.pelanggan] : null),
          profiles: profileData,
          durasi_tunggu: calculateDuration(order.order_date),
          discount_amount: order.discount_amount || 0,
          tax_amount: order.tax_amount || 0,
          final_amount: order.final_amount || order.total_amount,
          order_items: [], // Pending orders don't have detailed order_items fetched here
        };
      });

      const filteredByDuration = processedData.filter(item => {
        if (durationFilter === 'all') return true;
        const duration = item.durasi_tunggu;
        if (durationFilter === '1-7' && duration >= 1 && duration <= 7) return true;
        if (durationFilter === '8-14' && duration >= 8 && duration <= 14) return true;
        if (durationFilter === '>14' && duration > 14) return true;
        return false;
      });

      const finalFilteredData = filteredByDuration.filter(item => {
        const customerName = item.customer_display_name || item.pelanggan?.[0]?.nama_pelanggan || '';
        const customerPhone = item.customer_display_phone || item.pelanggan?.[0]?.telepon || '';
        const kasirName = item.profiles?.first_name || ''; 
        
        return (
          item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          kasirName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });

      setData(finalFilteredData);
    }
    setLoading(false);
  }, [durationFilter, searchTerm]);

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