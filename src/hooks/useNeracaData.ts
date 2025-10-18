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
  sortKey: string;
  periodLabel: string;
  Omset: number;
  'Total Pengeluaran': number;
  'Jumlah Hutang': number;
  'Jumlah Piutang': number;
}

type Period = 'daily' | 'monthly' | 'yearly';

const ZERO_SUMMARY: NeracaSummary = {
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
};

const getDpFromNotes = (notes: any): number => {
  try {
    if (!notes) return 0;

    // Jika notes berbentuk object & punya dp_amount
    if (typeof notes === 'object' && notes !== null) {
      if (typeof notes.dp_amount === 'number') return notes.dp_amount || 0;
      if (typeof (notes as any).PaymentDetails?.dp_amount === 'number') return (notes as any).PaymentDetails.dp_amount || 0;
    }

    // Jika string diawali "Payment Details: { ... }"
    const str = String(notes).trim();
    const prefix = 'Payment Details:';
    let jsonPart = str.startsWith(prefix) ? str.slice(prefix.length).trim() : str;

    // Coba parse JSON langsung
    const parsed = JSON.parse(jsonPart);

    // Bentuk yang umum: { dp_amount: 1000000, ... }
    if (typeof parsed?.dp_amount === 'number') return parsed.dp_amount || 0;

    // Antisipasi variasi kunci (jaga-jaga)
    if (typeof parsed?.PaymentDetails?.dp_amount === 'number') return parsed.PaymentDetails.dp_amount || 0;

    return 0;
  } catch {
    return 0;
  }
};

export function useNeracaData({
  startDate,
  endDate,
  filterPeriod,
  autoFetch = true,
}: {
  startDate: string;
  endDate: string;
  filterPeriod: Period;
  autoFetch?: boolean;
}) {
  const [summary, setSummary] = useState<NeracaSummary>(ZERO_SUMMARY);
  const [periodData, setPeriodData] = useState<NeracaDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const resetToZero = useCallback(() => {
    setSummary(ZERO_SUMMARY);
    setPeriodData([]);
  }, []);

  const getPaymentMethodFromNotes = (raw?: string | null): string | undefined => {
    const norm = (x?: string | null) =>
      (x ?? '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

    if (!raw) return undefined;

    const tryParse = (txt: string) => {
      try {
        const obj = JSON.parse(txt);
        // coba beberapa lokasi umum
        const a = obj?.payment_method;
        const b = obj?.PaymentDetails?.payment_method;
        const c = obj?.PaymentDetails?.method;
        const d = obj?.method;
        const pick = a ?? b ?? c ?? d;
        return typeof pick === 'string' ? norm(pick) : undefined;
      } catch {
        return undefined;
      }
    };

    // pola "Payment Details: {...}"
    const m = /Payment Details:\s*({[\s\S]*})/i.exec(raw);
    if (m?.[1]) {
      const v = tryParse(m[1]);
      if (v) return v;
    }

    // coba parse seluruh string sebagai JSON
    const v2 = tryParse(raw);
    if (v2) return v2;

    return undefined;
  };

  // ⬇️ Tambah dukungan override agar bisa fetch langsung saat tombol ditekan.
  const fetchNeracaSummary = useCallback(
    async (override?: { startDate?: string; endDate?: string; filterPeriod?: Period }) => {
      const sDate = override?.startDate ?? startDate;
      const eDate = override?.endDate ?? endDate;
      const p = override?.filterPeriod ?? filterPeriod;

      try {
        setLoading(true);
        setError(null);

        const { data: kasMasukPeriodData, error: kasMasukPeriodError } = await supabase
          .from('kas_masuk')
          .select('tanggal, jumlah, payment_method')
          .gte('tanggal', sDate)
          .lte('tanggal', eDate);
        if (kasMasukPeriodError) throw kasMasukPeriodError;

        const { data: kasKeluarPeriodData, error: kasKeluarPeriodError } = await supabase
          .from('kas_keluar')
          .select('tanggal, jumlah, payment_method')
          .gte('tanggal', sDate)
          .lte('tanggal', eDate);
        if (kasKeluarPeriodError) throw kasKeluarPeriodError;

        const { data: allOrdersForOmsetPeriod, error: allOrdersForOmsetPeriodError } = await supabase
          .from('orders')
          .select('order_date, final_amount, payment_method, payment_status, notes, invoice_number, ready_status')
          .gte('order_date', sDate)
          .lte('order_date', eDate);
        if (allOrdersForOmsetPeriodError) throw allOrdersForOmsetPeriodError;

        const { data: pendingOrdersPeriodData, error: pendingOrdersPeriodError } = await supabase
          .from('orders')
          .select('order_date, final_amount')
          .eq('payment_status', 'pending')
          .gte('order_date', sDate)
          .lte('order_date', eDate);
        if (pendingOrdersPeriodError) throw pendingOrdersPeriodError;

        const { data: purchaseDueData, error: purchaseDueError } = await supabase
          .from('purchase_orders')
          .select('final_amount, total_amount, payment_status')
          .eq('payment_status', 'due');
        if (purchaseDueError) throw purchaseDueError;

        const { data: hutangPeriodData, error: hutangPeriodError } = await supabase
          .from('purchase_orders')
          .select('order_date, final_amount, total_amount, payment_status')
          .eq('payment_status', 'due')
          .gte('order_date', sDate)
          .lte('order_date', eDate);
        if (hutangPeriodError) throw hutangPeriodError;

        const omsetPeriod = (allOrdersForOmsetPeriod || []).reduce(
          (sum: number, o: any) => sum + (o.final_amount || 0),
          0
        );

        let orderPaidCash = 0;
        let orderPaidTransfer = 0;
        // (allOrdersForOmsetPeriod || [])
        //   .filter((o: any) => o.payment_status === 'paid')
        //   .forEach((o: any) => {
        //     const methodFromNotes = getPaymentMethodFromNotes(o.notes);
        //     const method = methodFromNotes || o.payment_method || 'cash';
        //     if (method === 'cash') orderPaidCash += o.final_amount || 0;
        //     else orderPaidTransfer += o.final_amount || 0;
        // });

        (allOrdersForOmsetPeriod || []).forEach((o: any) => {
          const methodFromNotes = getPaymentMethodFromNotes(o.notes);
          const method = methodFromNotes || o.payment_method || ''; // kosong kalau tidak diketahui

          if (o.payment_status === 'paid') {
            // paid: masukkan full final_amount ke bucket sesuai metode
            if (method === 'cash') {
              // default-kan kosong ke cash jika memang di sistemmu cash jadi default
              orderPaidCash += o.final_amount || 0;
            } else {
              orderPaidTransfer += o.final_amount || 0;
            }
          } else if (o.payment_status === 'pending') {
            // pending: jika cash, masukkan hanya DP
            if (method === 'cash') {
              const dp = getDpFromNotes(o.notes) || 0;
              orderPaidCash += dp;
            }else{
              const dp = getDpFromNotes(o.notes) || 0;
              orderPaidTransfer += dp;
            }
            // console.log(o.invoice_number+' - '+o.payment_method+' - '+o.payment_status+' - '+orderPaidCash)+'\n';
          }
        });

        const orderNotPaid = (allOrdersForOmsetPeriod || [])
          .filter((o: any) => o.payment_status !== 'paid')
          .filter((o: any) => o.ready_status === 'ready')
          .reduce((s: number, o: any) => s + (o.final_amount || 0), 0);

        const kasMasukTunai = (kasMasukPeriodData || []).reduce(
          (s: number, x: any) => s + (x.payment_method === 'cash' ? (x.jumlah || 0) : 0),
          0
        );
        const kasMasukTransfer = (kasMasukPeriodData || []).reduce(
          (s: number, x: any) => s + (x.payment_method !== 'cash' ? (x.jumlah || 0) : 0),
          0
        );
        const kasKeluarTunai = (kasKeluarPeriodData || []).reduce(
          (s: number, x: any) => s + (x.payment_method === 'cash' ? (x.jumlah || 0) : 0),
          0
        );
        const kasKeluarTransfer = (kasKeluarPeriodData || []).reduce(
          (s: number, x: any) => s + (x.payment_method !== 'cash' ? (x.jumlah || 0) : 0),
          0
        );

        const jumlahPiutangPeriod = (pendingOrdersPeriodData || []).reduce(
          (s: number, o: any) => s + (o.final_amount || 0),
          0
        );

        const jumlahHutang = (purchaseDueData || []).reduce(
          (s: number, po: any) => s + (po.final_amount ?? po.total_amount ?? 0),
          0
        );

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

        // === Chart ===
        type Gran = 'daily' | 'monthly';
        const chartGranularity: Gran = p === 'yearly' ? 'monthly' : 'daily';

        const getKey = (d: Date) =>
          chartGranularity === 'monthly'
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            : d.toISOString().split('T')[0];

        const getLabel = (d: Date, spanYears: boolean) =>
          chartGranularity === 'monthly'
            ? d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
            : d.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: spanYears ? 'numeric' : undefined,
              });

        let startObj = new Date(sDate);
        let endObj = new Date(eDate);
        if (p === 'yearly') {
          startObj = new Date(new Date(sDate).getFullYear(), 0, 1);
          endObj = new Date(new Date(eDate).getFullYear(), 11, 31);
        }
        const spanYears = endObj.getFullYear() > startObj.getFullYear();

        const grouped: Record<string, NeracaDataPoint> = {};
        let cur = new Date(startObj);
        while (cur <= endObj) {
          const key = getKey(cur);
          grouped[key] = {
            sortKey: key,
            periodLabel: getLabel(cur, spanYears),
            Omset: 0,
            'Total Pengeluaran': 0,
            'Jumlah Hutang': 0,
            'Jumlah Piutang': 0,
          };
          if (chartGranularity === 'monthly') {
            cur.setMonth(cur.getMonth() + 1);
            cur.setDate(1);
          } else {
            cur.setDate(cur.getDate() + 1);
          }
        }

        (allOrdersForOmsetPeriod || []).forEach((o: any) => {
          const d = new Date(o.order_date);
          if (d >= startObj && d <= endObj) grouped[getKey(d)].Omset += o.final_amount || 0;
        });
        (kasKeluarPeriodData || []).forEach((r: any) => {
          const d = new Date(r.tanggal);
          if (d >= startObj && d <= endObj) grouped[getKey(d)]['Total Pengeluaran'] += r.jumlah || 0;
        });
        (pendingOrdersPeriodData || []).forEach((o: any) => {
          const d = new Date(o.order_date);
          if (d >= startObj && d <= endObj) grouped[getKey(d)]['Jumlah Piutang'] += o.final_amount || 0;
        });
        (hutangPeriodData || []).forEach((po: any) => {
          const d = new Date(po.order_date);
          if (d >= startObj && d <= endObj) {
            grouped[getKey(d)]['Jumlah Hutang'] += (po.final_amount ?? po.total_amount ?? 0) as number;
          }
        });

        setPeriodData(Object.values(grouped).sort((a, b) => a.sortKey.localeCompare(b.sortKey)));
      } catch (err: any) {
        console.error('Error fetching neraca summary:', err);
        showError('Gagal memuat laporan neraca: ' + err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, filterPeriod]
  );

  useEffect(() => {
    if (autoFetch) fetchNeracaSummary();
  }, [autoFetch, fetchNeracaSummary]);

  return {
    summary,
    periodData,
    loading,
    error,
    fetchNeracaSummary,
    resetToZero,
  };
}
