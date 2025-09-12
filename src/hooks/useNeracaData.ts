import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { getSingleRelatedObject } from '../utils/dataHelpers';

export interface NeracaSummary {
  omset: number;
  laba_penjualan: number;
  piutang: number;
  pembelian: number;
  pemasukan: number;
  pengeluaran: number;
  jumlah_uang_masuk: number;
  jumlah_uang_keluar: number;
  jumlah_piutang_aktif: number;
  jumlah_saldo_akhir: number;
  jumlah_saldo_cash: number; // New field
  jumlah_saldo_bank_transfer: number; // New field
}

export interface NeracaDataPoint {
  sortKey: string; // YYYY-MM-DD, YYYY-MM, or YYYY for sorting
  periodLabel: string; // e.g., "01 Jan", "Jan 2024", "2023"
  Pemasukan: number;
  Pengeluaran: number;
  "Saldo Akhir": number;
  Piutang: number;
  Omset: number;
  "Laba Penjualan": number;
  Pembelian: number;
}

interface UseNeracaDataProps {
  startDate: string;
  endDate: string;
  filterPeriod: 'daily' | 'monthly' | 'yearly'; // New prop for grouping
}

export const useNeracaData = ({ startDate, endDate, filterPeriod }: UseNeracaDataProps) => {
  const [summary, setSummary] = useState<NeracaSummary>({
    omset: 0,
    laba_penjualan: 0,
    piutang: 0,
    pembelian: 0,
    pemasukan: 0,
    pengeluaran: 0,
    jumlah_uang_masuk: 0,
    jumlah_uang_keluar: 0,
    jumlah_piutang_aktif: 0,
    jumlah_saldo_akhir: 0,
    jumlah_saldo_cash: 0, // Initialize
    jumlah_saldo_bank_transfer: 0, // Initialize
  });
  const [periodData, setPeriodData] = useState<NeracaDataPoint[]>([]); // New state for grouped data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNeracaSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // --- Data for the selected period (for Omset, Laba, Pemasukan, Pengeluaran, and period-specific cash/bank balances) ---
      // Fetch kas_masuk within the date range
      const { data: kasMasukPeriodData, error: kasMasukPeriodError } = await supabase
        .from('kas_masuk')
        .select('tanggal, jumlah, payment_method')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
      if (kasMasukPeriodError) throw kasMasukPeriodError;

      // Fetch kas_keluar within the date range
      const { data: kasKeluarPeriodData, error: kasKeluarPeriodError } = await supabase
        .from('kas_keluar')
        .select('tanggal, jumlah, payment_method')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
      if (kasKeluarPeriodError) throw kasKeluarPeriodError;

      // Fetch ALL orders (paid and pending) within the date range for Omset calculation
      const { data: allOrdersForOmsetPeriod, error: allOrdersForOmsetPeriodError } = await supabase
        .from('orders')
        .select('order_date, final_amount, payment_method, payment_status')
        .gte('order_date', startDate)
        .lte('order_date', endDate);
      if (allOrdersForOmsetPeriodError) throw allOrdersForOmsetPeriodError;

      // Fetch order items from PAID orders within the date range for Laba Penjualan
      const { data: orderItemsPeriodData, error: orderItemsPeriodError } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, order:orders(order_date, payment_status)')
        .gte('order.order_date', startDate) // Ensure order date is within range
        .lte('order.order_date', endDate)
        .eq('order.payment_status', 'paid'); // Only paid orders contribute to profit
      if (orderItemsPeriodData === null || orderItemsPeriodError) throw orderItemsPeriodError;

      // Fetch all product costs for Laba Penjualan calculation
      const { data: productsData, error: productsError } = await supabase
        .from('produk')
        .select('id, harga_pokok');
      if (productsData === null || productsError) throw productsError;
      const productCostsMap = new Map(productsData.map(p => [p.id, p.harga_pokok]));

      // Fetch pending orders for Piutang calculation (only those created within the period for summary)
      const { data: pendingOrdersPeriodData, error: pendingOrdersPeriodError } = await supabase
        .from('orders')
        .select('order_date, final_amount')
        .eq('payment_status', 'pending')
        .gte('order_date', startDate) // Only pending orders created within the period
        .lte('order_date', endDate);
      if (pendingOrdersPeriodError) throw pendingOrdersPeriodError;

      // Fetch ALL pending orders for total outstanding piutang (regardless of start date)
      const { data: allPendingOrdersData, error: allPendingOrdersError } = await supabase
        .from('orders')
        .select('final_amount')
        .eq('payment_status', 'pending'); // No date filter for total outstanding
      if (allPendingOrdersError) throw allPendingOrdersError;


      // --- Calculate overall summary for the selected period ---
      const totalPemasukanPeriod = (kasMasukPeriodData || []).reduce((sum, item) => sum + item.jumlah, 0);
      const totalPengeluaranPeriod = (kasKeluarPeriodData || []).reduce((sum, item) => sum + item.jumlah, 0);
      
      // Omset includes both paid and pending sales for the period
      const omsetPeriod = (allOrdersForOmsetPeriod || []).reduce((sum, order) => sum + order.final_amount, 0); 

      // Paid sales amount for the period (only paid orders)
      const paidSalesAmountPeriod = (allOrdersForOmsetPeriod || [])
        .filter(order => order.payment_status === 'paid')
        .reduce((sum, order) => sum + order.final_amount, 0);

      let labaPenjualanPeriod = 0;
      (orderItemsPeriodData || []).forEach(item => {
        const hargaPokok = productCostsMap.get(item.product_id) || 0;
        labaPenjualanPeriod += (item.unit_price - hargaPokok) * item.quantity;
      });

      const pembelianPeriod = 0; // Placeholder for future integration

      // Calculate period-specific cash and bank flows for summary
      let periodCashIn = 0;
      let periodBankIn = 0;
      let periodCashOut = 0;
      let periodBankOut = 0;

      (kasMasukPeriodData || []).forEach(item => {
        if (item.payment_method === 'cash') {
          periodCashIn += item.jumlah;
        } else if (item.payment_method === 'bank_transfer') {
          periodBankIn += item.jumlah;
        }
      });

      (kasKeluarPeriodData || []).forEach(item => {
        if (item.payment_method === 'cash') {
          periodCashOut += item.jumlah;
        } else if (item.payment_method === 'bank_transfer') {
          periodBankOut += item.jumlah;
        }
      });

      // Only paid orders contribute to cash/bank flow for sales
      (allOrdersForOmsetPeriod || []).filter(order => order.payment_status === 'paid').forEach(order => {
        if (order.payment_method === 'cash') {
          periodCashIn += order.final_amount;
        } else if (order.payment_method === 'bank_transfer') {
          periodBankIn += order.final_amount;
        }
      });

      const totalPiutangAktifOverall = (allPendingOrdersData || []).reduce((sum, order: { final_amount: number }) => sum + order.final_amount, 0);

      setSummary({
        omset: omsetPeriod,
        laba_penjualan: labaPenjualanPeriod,
        piutang: totalPiutangAktifOverall, // This is total outstanding, not period-specific
        pembelian: pembelianPeriod,
        pemasukan: totalPemasukanPeriod,
        pengeluaran: totalPengeluaranPeriod,
        jumlah_uang_masuk: totalPemasukanPeriod + paidSalesAmountPeriod, // Corrected: only paid sales
        jumlah_uang_keluar: totalPengeluaranPeriod, // Total outflow from kas_keluar
        jumlah_piutang_aktif: totalPiutangAktifOverall,
        jumlah_saldo_cash: periodCashIn - periodCashOut, // Net change in cash for the period
        jumlah_saldo_bank_transfer: periodBankIn - periodBankOut, // Net change in bank for the period
        jumlah_saldo_akhir: (periodCashIn - periodCashOut) + (periodBankIn - periodBankOut), // Total net change for the period
      });

      // --- Group data for chart based on filterPeriod ---
      const groupedChartData: { [key: string]: NeracaDataPoint } = {};

      const getChartGranularity = (filterPeriod: 'daily' | 'monthly' | 'yearly') => {
        if (filterPeriod === 'yearly') {
          return 'monthly';
        }
        return 'daily';
      };

      const chartGranularity = getChartGranularity(filterPeriod);

      const getChartPeriodKey = (date: Date, granularity: 'daily' | 'monthly') => {
        if (granularity === 'monthly') {
          return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        }
        return date.toISOString().split('T')[0]; // Daily
      };

      const getChartPeriodLabel = (date: Date, granularity: 'daily' | 'monthly', spanYears: boolean) => {
        if (granularity === 'monthly') {
          return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        }
        // Daily label
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: spanYears ? 'numeric' : undefined });
      };

      // Determine chart's actual date range
      let chartStartDateObj = new Date(startDate);
      let chartEndDateObj = new Date(endDate);

      if (filterPeriod === 'yearly') {
        chartStartDateObj = new Date(new Date(startDate).getFullYear(), 0, 1); // Jan 1 of selected year
        chartEndDateObj = new Date(new Date(endDate).getFullYear(), 11, 31); // Dec 31 of selected year
      }

      const chartStartYear = chartStartDateObj.getFullYear();
      const chartEndYear = chartEndDateObj.getFullYear();
      const chartSpanYears = chartEndYear > chartStartYear;

      // Initialize grouped data structure for all periods within the chart's range
      let currentChartDate = new Date(chartStartDateObj);
      while (currentChartDate <= chartEndDateObj) {
        const periodKey = getChartPeriodKey(currentChartDate, chartGranularity);
        if (!groupedChartData[periodKey]) {
          groupedChartData[periodKey] = {
            sortKey: periodKey,
            periodLabel: getChartPeriodLabel(currentChartDate, chartGranularity, chartSpanYears),
            Pemasukan: 0,
            Pengeluaran: 0,
            "Saldo Akhir": 0,
            Piutang: 0,
            Omset: 0,
            "Laba Penjualan": 0,
            Pembelian: 0,
          };
        }

        // Advance currentChartDate based on chartGranularity
        if (chartGranularity === 'monthly') {
          currentChartDate.setMonth(currentChartDate.getMonth() + 1);
          currentChartDate.setDate(1); // Reset to 1st to avoid issues with months having fewer days
        } else { // daily
          currentChartDate.setDate(currentChartDate.getDate() + 1);
        }
      }

      // Populate groupedChartData from kasMasukData, kasKeluarData, paidOrdersData, and orderItemsData
      (kasMasukPeriodData || []).forEach(item => { // Use period data for chart
        const itemDate = new Date(item.tanggal);
        if (itemDate >= chartStartDateObj && itemDate <= chartEndDateObj) {
          const periodKey = getChartPeriodKey(itemDate, chartGranularity);
          if (groupedChartData[periodKey]) {
            groupedChartData[periodKey].Pemasukan += item.jumlah;
          }
        }
      });

      (kasKeluarPeriodData || []).forEach(item => { // Use period data for chart
        const itemDate = new Date(item.tanggal);
        if (itemDate >= chartStartDateObj && itemDate <= chartEndDateObj) {
          const periodKey = getChartPeriodKey(itemDate, chartGranularity);
          if (groupedChartData[periodKey]) {
            groupedChartData[periodKey].Pengeluaran += item.jumlah;
          }
        }
      });

      (allOrdersForOmsetPeriod || []).forEach(order => { // Use all orders for chart omset
        const orderDate = new Date(order.order_date);
        if (orderDate >= chartStartDateObj && orderDate <= chartEndDateObj) {
          const periodKey = getChartPeriodKey(orderDate, chartGranularity);
          if (groupedChartData[periodKey]) {
            groupedChartData[periodKey].Omset += order.final_amount;
          }
        }
      });

      (orderItemsPeriodData || []).forEach(item => { // Use period data for chart
        const orderDetails = getSingleRelatedObject(item.order);
        const orderDate = new Date(orderDetails?.order_date);
        if (orderDetails?.payment_status === 'paid' && orderDate >= chartStartDateObj && orderDate <= chartEndDateObj) {
          const periodKey = getChartPeriodKey(orderDate, chartGranularity);
          if (groupedChartData[periodKey]) {
            const hargaPokok = productCostsMap.get(item.product_id) || 0;
            groupedChartData[periodKey]["Laba Penjualan"] += (item.unit_price - hargaPokok) * item.quantity;
          }
        }
      });

      // Populate Piutang for chart (new pending orders within the period)
      (pendingOrdersPeriodData || []).forEach((order: { order_date: string; final_amount: number }) => { // Use period data for chart
        const orderDate = new Date(order.order_date);
        // Only count pending orders created within the current chart period
        if (orderDate >= chartStartDateObj && orderDate <= chartEndDateObj) {
          const periodKey = getChartPeriodKey(orderDate, chartGranularity);
          if (groupedChartData[periodKey]) {
            groupedChartData[periodKey].Piutang += order.final_amount;
          }
        }
      });

      // Calculate derived values for each chart period
      Object.keys(groupedChartData).forEach(key => {
        const dataPoint = groupedChartData[key];
        dataPoint["Saldo Akhir"] = dataPoint.Pemasukan + dataPoint.Omset - dataPoint.Pengeluaran;
        dataPoint.Pembelian = 0; // Placeholder
      });

      // Sort data points by sortKey
      const sortedChartData = Object.values(groupedChartData).sort((a, b) => {
        return a.sortKey.localeCompare(b.sortKey);
      });
      setPeriodData(sortedChartData);

    } catch (err: any) {
      console.error('Error fetching neraca summary:', err);
      showError('Gagal memuat laporan neraca: ' + err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterPeriod]);

  useEffect(() => {
    fetchNeracaSummary();
  }, [fetchNeracaSummary]);

  return {
    summary,
    periodData, // Return grouped data for the chart
    loading,
    error,
    fetchNeracaSummary,
  };
};