import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { SalesItem, OrderItemDetail } from '../types/orderTypes';

interface SalesSummary {
  omset: number;
  laba: number;
  piutang: number;
  transactionsToday: number;
}

interface UseSalesReportsProps {
  startDate: string;
  endDate: string;
}

export const useSalesReports = ({ startDate, endDate }: UseSalesReportsProps) => {
  const [data, setData] = useState<SalesItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<SalesSummary>({
    omset: 0,
    laba: 0,
    piutang: 0,
    transactionsToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: allProducts, error: productsError } = await supabase
        .from('produk')
        .select('id, harga_pokok');
      if (productsError) throw productsError;

      const productPricesMap = new Map<string, number>();
      (allProducts || []).forEach(p => {
        if (p.id && p.harga_pokok !== null) {
          productPricesMap.set(p.id, p.harga_pokok);
        }
      });

      // Fetch all orders (paid and pending) within the date range for the main table data
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          created_at,
          order_date,
          pickup_date,
          invoice_number,
          customer_id,
          customer_display_name,
          customer_display_phone,
          pelanggan(nama_pelanggan, telepon),
          kasir_id,
          profiles(first_name, last_name),
          total_amount,
          discount_amount,
          tax_amount,
          final_amount,
          payment_status,
          order_status,
          notes,
          priority,
          payment_method,
          bank_name,
          order_items(product_id, product_name, quantity, unit_price, subtotal_per_item, dimensions, notes_per_item)
        `, { count: 'exact' })
        // Removed payment_status filter here to fetch both paid and pending for the table
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false });

      const { data: salesList, error: fetchError, count } = await ordersQuery;

      if (fetchError) throw fetchError;

      const formattedSalesList: SalesItem[] = (salesList || []).map(order => ({
        ...order,
        pelanggan: Array.isArray(order.pelanggan) ? order.pelanggan : (order.pelanggan ? [order.pelanggan] : null),
        profiles: Array.isArray(order.profiles) && order.profiles.length > 0 ? order.profiles[0] : null,
        order_items: (order.order_items || []) as OrderItemDetail[],
      }));
      setData(formattedSalesList);
      setTotalCount(count || 0);

      // --- Calculate Omset (total of all orders in date range) ---
      const { data: allOrdersForOmset, error: allOrdersForOmsetError } = await supabase
        .from('orders')
        .select('final_amount')
        .gte('order_date', startDate)
        .lte('order_date', endDate);
      if (allOrdersForOmsetError) throw allOrdersForOmsetError;
      const currentOmset = (allOrdersForOmset || []).reduce((sum, item) => sum + item.final_amount, 0);

      // --- Calculate Laba (only from paid orders in date range) ---
      let totalLaba = 0;
      const { data: allOrderItemsForProfit, error: profitItemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, order:orders(payment_status, order_date)')
        .eq('order.payment_status', 'paid')
        .gte('order.order_date', startDate)
        .lte('order.order_date', endDate);
      if (profitItemsError) throw profitItemsError;

      for (const item of (allOrderItemsForProfit || [])) {
        const hargaPokok = productPricesMap.get(item.product_id) || 0;
        const profitPerItem = (item.unit_price - hargaPokok) * item.quantity;
        totalLaba += profitPerItem;
      }

      // --- Calculate Piutang (total outstanding from pending orders within the date range) ---
      const { data: pendingOrders, error: pendingError } = await supabase
        .from('orders')
        .select('final_amount')
        .eq('payment_status', 'pending')
        .gte('order_date', startDate) // Apply date filter for piutang
        .lte('order_date', endDate); // Apply date filter for piutang

      if (pendingError) throw pendingError;
      const totalPiutang = (pendingOrders || []).reduce((sum, order) => sum + order.final_amount, 0);

      // --- Calculate Transactions Today (only paid orders today) ---
      const today = new Date().toISOString().split('T')[0];
      const { count: transactionsTodayCount, error: countError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('order_date', today)
        .eq('payment_status', 'paid');

      if (countError) throw countError;

      setSummary({
        omset: currentOmset,
        laba: totalLaba,
        piutang: totalPiutang,
        transactionsToday: transactionsTodayCount || 0,
      });

    } catch (err: any) {
      console.error('Error fetching sales data or summary:', err);
      showError('Gagal memuat data laporan penjualan: ' + err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  return {
    data,
    totalCount,
    summary,
    loading,
    error,
    fetchSalesData,
    setData,
  };
};