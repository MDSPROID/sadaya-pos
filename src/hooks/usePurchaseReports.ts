import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { PurchaseReportItem, PurchaseItemDetail } from '../types/purchaseOrderTypes';
import { getSingleRelatedObject } from '../utils/dataHelpers';

interface PurchaseSummary {
  totalPurchaseAmount: number;
  totalPaidAmount: number;
  totalDueAmount: number;
  transactionsToday: number;
}

interface UsePurchaseReportsProps {
  startDate: string;
  endDate: string;
}

export const usePurchaseReports = ({ startDate, endDate }: UsePurchaseReportsProps) => {
  const [data, setData] = useState<PurchaseReportItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<PurchaseSummary>({
    totalPurchaseAmount: 0,
    totalPaidAmount: 0,
    totalDueAmount: 0,
    transactionsToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchaseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all purchase orders within the date range
      let ordersQuery = supabase
        .from('purchase_orders')
        .select(`
          id,
          created_at,
          order_date,
          invoice_number,
          supplier_id,
          supplier_display_name,
          supplier_display_phone,
          supplier(nama, telepon),
          recorded_by_id,
          profiles(first_name, last_name),
          total_amount,
          discount_amount,
          final_amount,
          payment_status,
          notes,
          payment_method,
          bank_name,
          paid_amount,
          due_amount,
          due_date,
          purchase_order_items(item_type, item_id, item_name, quantity, unit_price, subtotal_per_item, notes_per_item)
        `, { count: 'exact' })
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false });

      const { data: purchaseList, error: fetchError, count } = await ordersQuery;

      if (fetchError) throw fetchError;

      const formattedPurchaseList: PurchaseReportItem[] = (purchaseList || []).map(order => ({
        ...order,
        supplier: getSingleRelatedObject(order.supplier),
        profiles: getSingleRelatedObject(order.profiles),
        purchase_order_items: (order.purchase_order_items || []) as PurchaseItemDetail[],
      }));
      setData(formattedPurchaseList);
      setTotalCount(count || 0);

      // --- Calculate Summary ---
      const totalPurchaseAmount = (purchaseList || []).reduce((sum, item) => sum + item.final_amount, 0);
      const totalPaidAmount = (purchaseList || []).reduce((sum, item) => sum + item.paid_amount, 0);
      const totalDueAmount = (purchaseList || []).reduce((sum, item) => sum + item.due_amount, 0);

      const today = new Date().toISOString().split('T')[0];
      const { count: transactionsTodayCount, error: countError } = await supabase
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .eq('order_date', today);

      if (countError) throw countError;

      setSummary({
        totalPurchaseAmount: totalPurchaseAmount,
        totalPaidAmount: totalPaidAmount,
        totalDueAmount: totalDueAmount,
        transactionsToday: transactionsTodayCount || 0,
      });

    } catch (err: any) {
      console.error('Error fetching purchase data or summary:', err);
      showError('Gagal memuat data laporan pembelian: ' + err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchPurchaseData();
  }, [fetchPurchaseData]);

  return {
    data,
    totalCount,
    summary,
    loading,
    error,
    fetchPurchaseData,
    setData,
  };
};