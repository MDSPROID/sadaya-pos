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
      // === 1) Harga pokok produk untuk hitung laba
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

      // === 2) Ambil orders (tanpa embed profiles untuk hindari ambiguity)
      let ordersQuery = supabase
        .from('orders')
        .select(
          `
          id,
          created_at,
          order_date,
          pickup_date,
          invoice_number,
          customer_id,
          customer_display_name,
          customer_display_phone,
          pelanggan(id, nama_pelanggan, telepon, alamat, catatan),
          kasir_id,
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
        `,
          { count: 'exact' }
        )
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false });

      const { data: salesList, error: fetchError, count } = await ordersQuery;
      if (fetchError) throw fetchError;

      // === 3) Fetch profiles kasir terpisah (berdasarkan kasir_id)
      const kasirIds = Array.from(
        new Set((salesList || []).map(o => o.kasir_id).filter(Boolean))
      ) as string[];

      let kasirMap = new Map<string, { id?: string; first_name?: string; last_name?: string }>();
      if (kasirIds.length > 0) {
        const { data: kasirs, error: kasirErr } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', kasirIds);
        if (kasirErr) throw kasirErr;
        (kasirs || []).forEach(k => {
          kasirMap.set(k.id, { id: k.id, first_name: k.first_name, last_name: k.last_name });
        });
      }

      // === 4) Normalisasi struktur agar kompatibel dengan UI lama
      const formattedSalesList: SalesItem[] = (salesList || []).map(order => {
        const profileKasir = order.kasir_id ? kasirMap.get(order.kasir_id) || null : null;

        return {
          ...order,
          // pelanggan: pastikan array (UI-mu mengharapkan array)
          pelanggan: Array.isArray(order.pelanggan)
            ? order.pelanggan
            : order.pelanggan
            ? [order.pelanggan]
            : null,
          // profiles: isi dengan data kasir hasil fetch terpisah (biar kompatibel)
          profiles: profileKasir
            ? {
                // @ts-ignore (kalau tipe SalesItem.profiles butuh shape tertentu)
                first_name: profileKasir.first_name || '',
                last_name: profileKasir.last_name || '',
              }
            : null,
          order_items: (order.order_items || []) as OrderItemDetail[],
        } as SalesItem;
      });

      setData(formattedSalesList);
      setTotalCount(count || 0);

      // === 5) Summary: Omset
      const { data: allOrdersForOmset, error: allOrdersForOmsetError } = await supabase
        .from('orders')
        .select('final_amount')
        .gte('order_date', startDate)
        .lte('order_date', endDate);
      if (allOrdersForOmsetError) throw allOrdersForOmsetError;
      const currentOmset = (allOrdersForOmset || []).reduce((sum, item) => sum + item.final_amount, 0);

      // === 6) Summary: Laba (hanya dari paid dalam rentang tanggal)
      let totalLaba = 0;
      const { data: allOrderItemsForProfit, error: profitItemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, order:orders(payment_status, order_date)')
        .eq('order.payment_status', 'paid')
        .gte('order.order_date', startDate)
        .lte('order.order_date', endDate);
      if (profitItemsError) throw profitItemsError;

      for (const item of allOrderItemsForProfit || []) {
        const hargaPokok = productPricesMap.get(item.product_id) || 0;
        const profitPerItem = (item.unit_price - hargaPokok) * item.quantity;
        totalLaba += profitPerItem;
      }

      // === 7) Summary: Piutang (pending dalam rentang tanggal)
      const { data: pendingOrders, error: pendingError } = await supabase
        .from('orders')
        .select('final_amount')
        .eq('payment_status', 'pending')
        .gte('order_date', startDate)
        .lte('order_date', endDate);
      if (pendingError) throw pendingError;
      const totalPiutang = (pendingOrders || []).reduce((sum, order) => sum + order.final_amount, 0);

      // === 8) Summary: Transaksi hari ini (paid)
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
