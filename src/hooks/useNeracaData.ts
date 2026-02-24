// ============================================================================
// FILE: useNeracaData.ts (FINAL FIXED VERSION)
// ============================================================================
// PERBAIKAN:
// 1. ✅ Fix Bug #1: Exclude entry "SALDO AWAL" dari kas_masuk/kas_keluar
// 2. ✅ Fix Bug #2: Hitung saldo awal dari transaksi sebelum periode
// 3. ✅ Hapus duplikasi query
// 4. ✅ Tambah logging untuk debugging
// ============================================================================

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
  // Tambahan untuk transparansi
  saldo_awal_tunai?: number;
  saldo_awal_non_tunai?: number;
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
  saldo_awal_tunai: 0,
  saldo_awal_non_tunai: 0,
};

const getDpFromNotes = (notes: any): number => {
  try {
    if (!notes) return 0;

    if (typeof notes === 'object' && notes !== null) {
      if (typeof notes.dp_amount === 'number') return notes.dp_amount || 0;
      if (typeof (notes as any).PaymentDetails?.dp_amount === 'number') 
        return (notes as any).PaymentDetails.dp_amount || 0;
    }

    const str = String(notes).trim();
    const prefix = 'Payment Details:';
    let jsonPart = str.startsWith(prefix) ? str.slice(prefix.length).trim() : str;

    const parsed = JSON.parse(jsonPart);

    if (typeof parsed?.dp_amount === 'number') return parsed.dp_amount || 0;
    if (typeof parsed?.PaymentDetails?.dp_amount === 'number') 
      return parsed.PaymentDetails.dp_amount || 0;

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

    const m = /Payment Details:\s*({[\s\S]*})/i.exec(raw);
    if (m?.[1]) {
      const v = tryParse(m[1]);
      if (v) return v;
    }

    const v2 = tryParse(raw);
    if (v2) return v2;

    return undefined;
  };

  // ========================================================================
  // FUNGSI BARU: HITUNG SALDO AWAL (FIX BUG #2)
  // ========================================================================
  const calculateOpeningBalance = useCallback(async (beforeDate: string) => {
    try {
      let saldoAwalTunai = 0;
      let saldoAwalNonTunai = 0;

      // 1. Kas Masuk sebelum periode (transaksi biasa, tidak termasuk SALDO AWAL)
      const { data: kasMasukBefore, error: kmError } = await supabase
        .from('kas_masuk')
        .select('jumlah, payment_method')
        .neq('nama_pemasukan', 'SALDO AWAL')
        .lt('tanggal', beforeDate)
        .limit(10000);
      if (kmError) throw kmError;

      (kasMasukBefore || []).forEach(km => {
        if (km.payment_method === 'cash') {
          saldoAwalTunai += km.jumlah || 0;
        } else {
          saldoAwalNonTunai += km.jumlah || 0;
        }
      });
      console.log('🔍 DEBUG saldoAwal Step 1 - kasMasukBefore:', (kasMasukBefore||[]).length, 'rows, saldoAwalTunai=', saldoAwalTunai, 'detail:', JSON.stringify(kasMasukBefore));

      // 1b. SALDO AWAL entry — dicatat tepat di tanggal startDate, harus ikut ke saldo awal
      //     Gunakan .lte() + filter nama = 'SALDO AWAL' agar ambil entry di tanggal start
      const { data: saldoAwalEntries, error: saError } = await supabase
        .from('kas_masuk')
        .select('jumlah, payment_method')
        .eq('nama_pemasukan', 'SALDO AWAL')
        .lte('tanggal', beforeDate)
        .limit(100);
      if (saError) throw saError;

      (saldoAwalEntries || []).forEach(km => {
        if (km.payment_method === 'cash') {
          saldoAwalTunai += km.jumlah || 0;
        } else {
          saldoAwalNonTunai += km.jumlah || 0;
        }
      });
      console.log('🔍 DEBUG saldoAwal Step 1b - saldoAwalEntries:', (saldoAwalEntries||[]).length, 'rows, saldoAwalTunai=', saldoAwalTunai, 'detail:', JSON.stringify(saldoAwalEntries));

      // 2. Kas Keluar sebelum periode
      const { data: kasKeluarBefore, error: kkError } = await supabase
        .from('kas_keluar')
        .select('jumlah, payment_method')
        .lt('tanggal', beforeDate)
        .limit(10000);

      if (kkError) throw kkError;

      (kasKeluarBefore || []).forEach(kk => {
        if (kk.payment_method === 'cash') {
          saldoAwalTunai -= kk.jumlah || 0;
        } else {
          saldoAwalNonTunai -= kk.jumlah || 0;
        }
      });
      console.log('🔍 DEBUG saldoAwal Step 2 - kasKeluarBefore:', (kasKeluarBefore||[]).length, 'rows, saldoAwalTunai=', saldoAwalTunai);

      // 3. Orders sebelum periode (paid & pending dengan DP)
      const { data: ordersBefore, error: ordersError } = await supabase
        .from('orders')
        .select('final_amount, payment_method, payment_status, notes')
        .lt('order_date', beforeDate)
        .limit(10000);

      if (ordersError) throw ordersError;

      (ordersBefore || []).forEach(o => {
        const methodFromNotes = getPaymentMethodFromNotes(o.notes);
        // FIX: Jangan fallback ke 'cash' jika tidak ada payment_method
        // Order tanpa payment_method tidak bisa diklasifikasikan sbg tunai/transfer
        const method = methodFromNotes || o.payment_method;
        if (!method) return; // Skip jika tidak ada method sama sekali

        if (o.payment_status === 'paid') {
          if (method === 'cash') {
            saldoAwalTunai += o.final_amount || 0;
          } else {
            saldoAwalNonTunai += o.final_amount || 0;
          }
        } else if (o.payment_status === 'pending') {
          const dp = getDpFromNotes(o.notes) || 0;
          if (dp > 0) { // Hanya masuk saldo jika ada DP yang sudah dibayar
            if (method === 'cash') {
              saldoAwalTunai += dp;
            } else {
              saldoAwalNonTunai += dp;
            }
          }
        }
      });

      console.log('🔍 DEBUG saldoAwal Step 3 - ordersBefore:', (ordersBefore||[]).length, 'rows, saldoAwalTunai FINAL=', saldoAwalTunai, 'saldoAwalNonTunai FINAL=', saldoAwalNonTunai);
      return { saldoAwalTunai, saldoAwalNonTunai };
    } catch (err) {
      console.error('Error calculating opening balance:', err);
      return { saldoAwalTunai: 0, saldoAwalNonTunai: 0 };
    }
  }, []);

  // ========================================================================
  // FETCH DATA NERACA (IMPROVED - FIX BOTH BUGS)
  // ========================================================================
  const fetchNeracaSummary = useCallback(
    async (override?: { startDate?: string; endDate?: string; filterPeriod?: Period }) => {
      const sDate = override?.startDate ?? startDate;
      const eDate = override?.endDate ?? endDate;
      const p = override?.filterPeriod ?? filterPeriod;

      try {
        setLoading(true);
        setError(null);

        // ====================================================================
        // STEP 1: HITUNG SALDO AWAL (FIX BUG #2)
        // ====================================================================
        const { saldoAwalTunai, saldoAwalNonTunai } = await calculateOpeningBalance(sDate);

        // ====================================================================
        // STEP 2: AMBIL DATA PERIODE (FIX BUG #1 - EXCLUDE SALDO AWAL)
        // ====================================================================

        // Kas Masuk dalam periode (EXCLUDE SALDO AWAL agar tidak double-count dengan saldoAwal)
        const { data: kasMasukPeriodData, error: kasMasukPeriodError } = await supabase
          .from('kas_masuk')
          .select('tanggal, jumlah, payment_method')
          .neq('nama_pemasukan', 'SALDO AWAL')
          .gte('tanggal', sDate)
          .lte('tanggal', eDate)
          .limit(10000);
        if (kasMasukPeriodError) throw kasMasukPeriodError;

        // Kas Keluar dalam periode
        const { data: kasKeluarPeriodData, error: kasKeluarPeriodError } = await supabase
          .from('kas_keluar')
          .select('tanggal, jumlah, payment_method')
          .gte('tanggal', sDate)
          .lte('tanggal', eDate)
          .limit(10000);
        if (kasKeluarPeriodError) throw kasKeluarPeriodError;

        // Orders dalam periode
        const { data: allOrdersForOmsetPeriod, error: allOrdersForOmsetPeriodError } = await supabase
          .from('orders')
          .select('order_date, final_amount, payment_method, payment_status, notes, invoice_number')
          .gte('order_date', sDate)
          .lte('order_date', eDate)
          .limit(10000);
        if (allOrdersForOmsetPeriodError) throw allOrdersForOmsetPeriodError;

        // Pending Orders dalam periode (untuk piutang)
        const { data: pendingOrdersPeriodData, error: pendingOrdersPeriodError } = await supabase
          .from('orders')
          .select('order_date, final_amount, notes, payment_method')
          .eq('payment_status', 'pending')
          .gte('order_date', sDate)
          .lte('order_date', eDate)
          .limit(10000);
        if (pendingOrdersPeriodError) throw pendingOrdersPeriodError;

        // Purchase Orders (hutang)
        const { data: hutangPeriodData, error: hutangPeriodError } = await supabase
          .from('purchase_orders')
          .select('order_date, final_amount, total_amount, paid_amount, payment_status')
          .eq('payment_status', 'due')
          .gte('order_date', sDate)
          .lte('order_date', eDate)
          .limit(10000);
        if (hutangPeriodError) throw hutangPeriodError;

        // ====================================================================
        // STEP 3: PROSES DATA & HITUNG SUMMARY
        // ====================================================================

        // Omset
        const omsetPeriod = (allOrdersForOmsetPeriod || []).reduce(
          (sum: number, o: any) => sum + (o.final_amount || 0),
          0
        );

        // Order Paid Cash & Transfer
        let orderPaidCash = 0;
        let orderPaidTransfer = 0;

        (allOrdersForOmsetPeriod || []).forEach((o: any) => {
          const methodFromNotes = getPaymentMethodFromNotes(o.notes);
          // FIX: Jangan fallback ke '' lalu masuk ke 'else' (transfer) secara salah
          const method = methodFromNotes || o.payment_method;
          if (!method) return; // Skip order tanpa payment_method (tidak bisa diklasifikasikan)

          if (o.payment_status === 'paid') {
            if (method === 'cash') {
              orderPaidCash += o.final_amount || 0;
            } else {
              orderPaidTransfer += o.final_amount || 0;
            }
          } else if (o.payment_status === 'pending') {
            const dp = getDpFromNotes(o.notes) || 0;
            if (dp > 0) { // Hanya hitung jika ada DP
              if (method === 'cash') {
                orderPaidCash += dp;
              } else {
                orderPaidTransfer += dp;
              }
            }
          }
        });

        // Kas Masuk & Keluar
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

        // Piutang - FIX BUG #3: Hitung SEMUA pending order, termasuk payment_method = NULL
        // Order dengan payment_method NULL tetap punya piutang (sisa tagihan yang belum dibayar)
        const jumlahPiutangPeriod = (pendingOrdersPeriodData || []).reduce((s: number, o: any) => {
          const finalAmount = Number(o?.final_amount || 0);
          const dpAmount = getDpFromNotes(o?.notes) || 0;
          const remaining = Math.max(0, finalAmount - Number(dpAmount || 0));
          return s + remaining;
        }, 0);

        // Hutang
        const jumlahHutang = (hutangPeriodData || []).reduce(
          (s: number, po: any) => {
            const unpaid = (po.final_amount || 0) - (po.paid_amount || 0);
            return s + Math.max(0, unpaid);
          },
          0
        );

        // ====================================================================
        // STEP 4: HITUNG SALDO FINAL (DENGAN SALDO AWAL - FIX BUG #2)
        // ====================================================================
        const orderNotPaid = jumlahPiutangPeriod;
        
        // 👇 FIX BUG #2: Tambahkan saldo awal
        const jumlahSaldoTunai = saldoAwalTunai + orderPaidCash + kasMasukTunai - kasKeluarTunai;
        const jumlahSaldoNonTunai = saldoAwalNonTunai + orderPaidTransfer + kasMasukTransfer - kasKeluarTransfer;
        const totalJumlahSaldo = jumlahSaldoTunai + jumlahSaldoNonTunai;
        
        const totalPengeluaran = kasKeluarTunai + kasKeluarTransfer;
        const saldoSeharusnya = totalJumlahSaldo + jumlahPiutangPeriod - jumlahHutang;

        // ====================================================================
        // STEP 5: LOGGING (DEVELOPMENT ONLY)
        // ====================================================================
        if (process.env.NODE_ENV === 'development') {
          console.group('=== DEBUG: Neraca Summary ===');
          console.log('📅 Periode:', sDate, '→', eDate);
          console.log('💰 Saldo Awal:');
          console.log('  - Tunai:', saldoAwalTunai.toLocaleString('id-ID'));
          console.log('  - Non-Tunai:', saldoAwalNonTunai.toLocaleString('id-ID'));
          console.log('📊 Kas Masuk Periode (exclude SALDO AWAL):');
          console.log('  - Tunai:', kasMasukTunai.toLocaleString('id-ID'));
          console.log('  - Transfer:', kasMasukTransfer.toLocaleString('id-ID'));
          console.log('💵 Saldo Akhir:');
          console.log('  - Tunai:', jumlahSaldoTunai.toLocaleString('id-ID'));
          console.log('  - Non-Tunai:', jumlahSaldoNonTunai.toLocaleString('id-ID'));
          console.log('  - Total:', totalJumlahSaldo.toLocaleString('id-ID'));
          console.groupEnd();
        }

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
          saldo_awal_tunai: saldoAwalTunai,
          saldo_awal_non_tunai: saldoAwalNonTunai,
        });

        // ====================================================================
        // STEP 6: POPULATE CHART DATA (same as before)
        // ====================================================================
        type Gran = 'daily' | 'monthly';
        const chartGranularity: Gran = p === 'yearly' ? 'monthly' : 'daily';

        // FIX: Parse tanggal sebagai local date (bukan UTC) untuk menghindari timezone shift
        // "2026-02-23" di-parse UTC jadi 2026-02-22T17:00:00 WIB → key salah!
        const parseLocalDate = (dateStr: string): Date => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day); // local timezone, bukan UTC
        };

        const getKey = (d: Date) =>
          chartGranularity === 'monthly'
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const getLabel = (d: Date, spanYears: boolean) =>
          chartGranularity === 'monthly'
            ? d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
            : d.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: spanYears ? 'numeric' : undefined,
              });

        let startObj = parseLocalDate(sDate);
        let endObj = parseLocalDate(eDate);
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

        // Populate chart data
        (allOrdersForOmsetPeriod || []).forEach((o: any) => {
          if (!o.order_date) return;
          const d = parseLocalDate(o.order_date);
          const key = getKey(d);
          if (grouped[key]) grouped[key].Omset += o.final_amount || 0;
        });
        (kasKeluarPeriodData || []).forEach((r: any) => {
          if (!r.tanggal) return;
          const d = parseLocalDate(r.tanggal);
          const key = getKey(d);
          if (grouped[key]) grouped[key]['Total Pengeluaran'] += r.jumlah || 0;
        });
        (pendingOrdersPeriodData || []).forEach((o: any) => {
          if (!o.order_date) return;
          const d = parseLocalDate(o.order_date);
          const key = getKey(d);
          if (!grouped[key]) return;

          const finalAmount = Number(o?.final_amount || 0);
          const dpAmount = getDpFromNotes(o?.notes) || 0;
          const remaining = Math.max(0, finalAmount - Number(dpAmount || 0));
          grouped[key]['Jumlah Piutang'] += remaining;
        });
        (hutangPeriodData || []).forEach((po: any) => {
          if (!po.order_date) return;
          const d = parseLocalDate(po.order_date);
          const key = getKey(d);
          if (grouped[key]) {
            const unpaid = (po.final_amount || 0) - (po.paid_amount || 0);
            grouped[key]['Jumlah Hutang'] += Math.max(0, unpaid);
          }
        });

        const finalPeriodData = Object.values(grouped).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        setPeriodData(finalPeriodData);

      } catch (err: any) {
        console.error('Error fetching neraca summary:', err);
        showError('Gagal memuat laporan neraca: ' + err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, filterPeriod, calculateOpeningBalance]
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