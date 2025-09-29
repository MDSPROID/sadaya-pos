import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

export interface NeracaSummary {
  omset: number;
  order_paid_cash: number;
  order_paid_transfer: number;
  order_not_paid: number;
  kas_masuk_tunai: number;
  kas_masuk_transfer: number;
  kas_keluar_tunai: number;
  kas_keluar_transfer: number;
  jumlah_saldo_tunai: number;
  jumlah_saldo_non_tunai: number;
  total_jumlah_saldo: number;
  total_pengeluaran: number;
  jumlah_hutang: number;
  jumlah_piutang: number;
  saldo_seharusnya: number;
}

export interface NeracaDataPoint {
  sortKey: string;         // YYYY-MM-DD atau YYYY-MM
  periodLabel: string;     // "01 Jan", "Jan 2024", "2023"
  Omset: number;
  "Total Pengeluaran": number;
  "Jumlah Hutang": number;
  "Jumlah Piutang": number;
}

interface UseNeracaDataProps {
  startDate: string;
  endDate: string;
  filterPeriod: 'daily' | 'monthly' | 'yearly';
}

export const useNeracaData = ({ startDate, endDate, filterPeriod }: UseNeracaDataProps) => {
  const [summary, setSummary] = useState<NeracaSummary>({
    omset: 0,
    order_paid_cash: 0,
    order_paid_transfer: 0,
    order_not_paid: 0,
    kas_masuk_tunai: 0,
    kas_masuk_transfer: 0,
    kas_keluar_tunai: 0,
    kas_keluar_transfer: 0,
    jumlah_saldo_tunai: 0,
    jumlah_saldo_non_tunai: 0,
    total_jumlah_saldo: 0,
    total_pengeluaran: 0,
    jumlah_hutang: 0,
    jumlah_piutang: 0,
    saldo_seharusnya: 0,
  });

  const [periodData, setPeriodData] = useState<NeracaDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ekstrak payment_method dari kolom notes (bisa "Payment Details: {...}" atau JSON murni)
  const getPaymentMethodFromNotes = (raw?: string | null): string | undefined => {
    if (!raw) return undefined;

    const m = /Payment Details:\s*({[\s\S]*})/i.exec(raw);
    const tryParse = (txt: string) => {
      try {
        const obj = JSON.parse(txt);
        const pm = obj?.payment_method;
        return typeof pm === 'string' ? pm : undefined;
      } catch {
        return undefined;
      }
    };

    if (m?.[1]) {
      const v = tryParse(m[1]);
      if (v) return v;
    }
    const v2 = tryParse(raw);
    if (v2) return v2;

    return undefined;
  };

  const fetchNeracaSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // === Query utama berdasar periode ===
      const { data: kasMasukPeriodData, error: kasMasukPeriodError } = await supabase
        .from('kas_masuk')
        .select('tanggal, jumlah, payment_method')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
      if (kasMasukPeriodError) throw kasMasukPeriodError;

      const { data: kasKeluarPeriodData, error: kasKeluarPeriodError } = await supabase
        .from('kas_keluar')
        .select('tanggal, jumlah, payment_method')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
      if (kasKeluarPeriodError) throw kasKeluarPeriodError;

      const { data: allOrdersForOmsetPeriod, error: allOrdersForOmsetPeriodError } = await supabase
        .from('orders')
        .select('order_date, final_amount, payment_method, payment_status, notes')
        .gte('order_date', startDate)
        .lte('order_date', endDate);
      if (allOrdersForOmsetPeriodError) throw allOrdersForOmsetPeriodError;

      // Pending (untuk jumlah_piutang periode & chart)
      const { data: pendingOrdersPeriodData, error: pendingOrdersPeriodError } = await supabase
        .from('orders')
        .select('order_date, final_amount')
        .eq('payment_status', 'pending')
        .gte('order_date', startDate)
        .lte('order_date', endDate);
      if (pendingOrdersPeriodError) throw pendingOrdersPeriodError;

      // Hutang total (summary): semua due tanpa filter tanggal
      const { data: purchaseDueData, error: purchaseDueError } = await supabase
        .from('purchase_orders')
        .select('final_amount, total_amount, payment_status')
        .eq('payment_status', 'due');
      if (purchaseDueError) throw purchaseDueError;

      // Hutang per-periode (chart)
      // NOTE: jika kolom tanggal PO bukan 'tanggal', ganti field di select & filter ini.
      const { data: hutangPeriodData, error: hutangPeriodError } = await supabase
        .from('purchase_orders')
        .select('order_date, final_amount, total_amount, payment_status')
        .eq('payment_status', 'due')
        .gte('order_date', startDate)
        .lte('order_date', endDate);
      if (hutangPeriodError) throw hutangPeriodError;

      // === Perhitungan Summary ===
      const omsetPeriod = (allOrdersForOmsetPeriod || []).reduce(
        (sum, o) => sum + (o.final_amount || 0),
        0
      );

      // Realisasi paid per metode (method diambil dari notes, fallback ke kolom payment_method)
      let orderPaidCash = 0;
      let orderPaidTransfer = 0;

      (allOrdersForOmsetPeriod || [])
        .filter((o) => o.payment_status === 'paid')
        .forEach((o) => {
          const methodFromNotes = getPaymentMethodFromNotes(o.notes);
          const method = methodFromNotes || o.payment_method || 'cash';
          if (method === 'cash') orderPaidCash += o.final_amount || 0;
          else orderPaidTransfer += o.final_amount || 0;
        });

      // order_not_paid = total order dengan payment_status != 'paid' (tanpa peduli metode)
      const orderNotPaid = (allOrdersForOmsetPeriod || [])
        .filter((o) => o.payment_status !== 'paid')
        .reduce((s, o) => s + (o.final_amount || 0), 0);

      // Kas masuk/keluar per metode
      const kasMasukTunai = (kasMasukPeriodData || []).reduce(
        (s, x) => s + (x.payment_method === 'cash' ? (x.jumlah || 0) : 0),
        0
      );
      const kasMasukTransfer = (kasMasukPeriodData || []).reduce(
        (s, x) => s + (x.payment_method !== 'cash' ? (x.jumlah || 0) : 0),
        0
      );
      const kasKeluarTunai = (kasKeluarPeriodData || []).reduce(
        (s, x) => s + (x.payment_method === 'cash' ? (x.jumlah || 0) : 0),
        0
      );
      const kasKeluarTransfer = (kasKeluarPeriodData || []).reduce(
        (s, x) => s + (x.payment_method !== 'cash' ? (x.jumlah || 0) : 0),
        0
      );

      // Piutang periode = pending pada rentang tanggal
      const jumlahPiutangPeriod = (pendingOrdersPeriodData || []).reduce(
        (s, o) => s + (o.final_amount || 0),
        0
      );

      // Hutang (summary): gunakan final_amount kalau ada, fallback ke total_amount
      const jumlahHutang = (purchaseDueData || []).reduce(
        (s, po) => s + (po.final_amount ?? po.total_amount ?? 0),
        0
      );

      // Saldo-saldo baru
      const jumlahSaldoTunai = orderPaidCash + kasMasukTunai;
      const jumlahSaldoNonTunai = orderPaidTransfer + kasMasukTransfer;
      const totalJumlahSaldo = jumlahSaldoTunai + jumlahSaldoNonTunai;
      const totalPengeluaran = kasKeluarTunai + kasKeluarTransfer;
      const saldoSeharusnya = totalJumlahSaldo + jumlahPiutangPeriod - jumlahHutang;

      setSummary({
        omset: omsetPeriod,
        order_paid_cash: orderPaidCash,
        order_paid_transfer: orderPaidTransfer,
        order_not_paid: orderNotPaid,
        kas_masuk_tunai: kasMasukTunai,
        kas_masuk_transfer: kasMasukTransfer,
        kas_keluar_tunai: kasKeluarTunai,
        kas_keluar_transfer: kasKeluarTransfer,
        jumlah_saldo_tunai: jumlahSaldoTunai,
        jumlah_saldo_non_tunai: jumlahSaldoNonTunai,
        total_jumlah_saldo: totalJumlahSaldo,
        total_pengeluaran: totalPengeluaran,
        jumlah_hutang: jumlahHutang,
        jumlah_piutang: jumlahPiutangPeriod,
        saldo_seharusnya: saldoSeharusnya,
      });

      // === Data untuk Chart: 4 seri (Omset, Total Pengeluaran, Jumlah Hutang, Jumlah Piutang) ===
      type Gran = 'daily' | 'monthly';
      const getChartGranularity = (p: 'daily' | 'monthly' | 'yearly'): Gran =>
        p === 'yearly' ? 'monthly' : 'daily';

      const chartGranularity = getChartGranularity(filterPeriod);

      const getChartPeriodKey = (date: Date, granularity: Gran) =>
        granularity === 'monthly'
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          : date.toISOString().split('T')[0];

      const getChartPeriodLabel = (date: Date, granularity: Gran, spanYears: boolean) =>
        granularity === 'monthly'
          ? date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
          : date.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: spanYears ? 'numeric' : undefined,
            });

      // Rentang chart
      let chartStartDateObj = new Date(startDate);
      let chartEndDateObj = new Date(endDate);
      if (filterPeriod === 'yearly') {
        chartStartDateObj = new Date(new Date(startDate).getFullYear(), 0, 1);
        chartEndDateObj = new Date(new Date(endDate).getFullYear(), 11, 31);
      }
      const spanYears = chartEndDateObj.getFullYear() > chartStartDateObj.getFullYear();

      // Inisialisasi bucket
      const groupedChartData: { [key: string]: NeracaDataPoint } = {};
      let cursor = new Date(chartStartDateObj);
      while (cursor <= chartEndDateObj) {
        const key = getChartPeriodKey(cursor, chartGranularity);
        groupedChartData[key] = {
          sortKey: key,
          periodLabel: getChartPeriodLabel(cursor, chartGranularity, spanYears),
          Omset: 0,
          'Total Pengeluaran': 0,
          'Jumlah Hutang': 0,
          'Jumlah Piutang': 0,
        };

        if (chartGranularity === 'monthly') {
          cursor.setMonth(cursor.getMonth() + 1);
          cursor.setDate(1);
        } else {
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      // OMSET: semua order dalam periode (paid + pending)
      (allOrdersForOmsetPeriod || []).forEach((o) => {
        const d = new Date(o.order_date);
        if (d >= chartStartDateObj && d <= chartEndDateObj) {
          const key = getChartPeriodKey(d, chartGranularity);
          groupedChartData[key].Omset += o.final_amount || 0;
        }
      });

      // TOTAL PENGELUARAN: semua kas_keluar
      (kasKeluarPeriodData || []).forEach((r) => {
        const d = new Date(r.tanggal);
        if (d >= chartStartDateObj && d <= chartEndDateObj) {
          const key = getChartPeriodKey(d, chartGranularity);
          groupedChartData[key]['Total Pengeluaran'] += r.jumlah || 0;
        }
      });

      // JUMLAH PIUTANG: order pending dibuat pada periode tsb
      (pendingOrdersPeriodData || []).forEach((o) => {
        const d = new Date(o.order_date);
        if (d >= chartStartDateObj && d <= chartEndDateObj) {
          const key = getChartPeriodKey(d, chartGranularity);
          groupedChartData[key]['Jumlah Piutang'] += o.final_amount || 0;
        }
      });

      // JUMLAH HUTANG: purchase_orders due pada periode (by kolom 'tanggal')
      (hutangPeriodData || []).forEach((po: any) => {
        const d = new Date(po.order_date);
        if (d >= chartStartDateObj && d <= chartEndDateObj) {
          const key = getChartPeriodKey(d, chartGranularity);
          const amt = (po.final_amount ?? po.total_amount ?? 0) as number;
          groupedChartData[key]['Jumlah Hutang'] += amt;
        }
      });

      // Urutkan & apply
      const sortedChartData = Object.values(groupedChartData).sort((a, b) =>
        a.sortKey.localeCompare(b.sortKey)
      );
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
    periodData,
    loading,
    error,
    fetchNeracaSummary,
  };
};
