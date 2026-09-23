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

/**
 * Extract DP amount from order notes
 * @param notes - Order notes yang bisa berisi payment details
 * @returns DP amount atau 0 jika tidak ada
 */
const getDpFromNotes = (notes: any): number => {
  try {
    if (!notes) return 0;

    // Jika notes berbentuk object & punya dp_amount
    if (typeof notes === 'object' && notes !== null) {
      if (typeof notes.dp_amount === 'number') return notes.dp_amount || 0;
      if (typeof (notes as any).PaymentDetails?.dp_amount === 'number') {
        return (notes as any).PaymentDetails.dp_amount || 0;
      }
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
    if (typeof parsed?.PaymentDetails?.dp_amount === 'number') {
      return parsed.PaymentDetails.dp_amount || 0;
    }

    return 0;
  } catch {
    return 0;
  }
};

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
      // === 1) Ambil orders (tanpa embed profiles untuk hindari ambiguity)
      // Hanya kolom yang dipakai tabel, filter, pencarian, dan export. Kolom berat
      // seperti order_items.dimensions diambil belakangan hanya untuk baris yang
      // dicetak tanda terimanya — lihat fetchOrderItemDetails di bawah.
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
          pelanggan(nama_pelanggan, telepon),
          kasir_id,
          operator_id,
          finishing_id,
          designer_id,
          final_amount,
          payment_status,
          notes,
          payment_method,
          order_items(designer_id, product_name)
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

      // === 5) Ringkasan dihitung dari daftar yang SUDAH diambil di atas.
      //     Sebelumnya omset & piutang di-query ulang ke tabel orders padahal
      //     barisnya persis sama — tiga permintaan besar untuk data yang identik.
      const currentOmset = (salesList || []).reduce(
        (sum: number, o: any) => sum + Number(o.final_amount || 0),
        0
      );

      const totalPiutang = (salesList || []).reduce((sum: number, o: any) => {
        if (o?.payment_status !== 'pending') return sum;
        // Lewati order yang belum ada metode pembayaran (belum fix order)
        const method = (o?.payment_method ?? '').toString().trim();
        if (!method) return sum;

        const finalAmount = Number(o?.final_amount || 0);
        const dpAmount = getDpFromNotes(o?.notes) || 0;
        return sum + Math.max(0, finalAmount - Number(dpAmount || 0));
      }, 0);

      // === 6) Transaksi hari ini (paid) — hitungan ringan di server
      const today = new Date().toISOString().split('T')[0];
      const { count: transactionsTodayCount, error: countError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('order_date', today)
        .eq('payment_status', 'paid');
      if (countError) throw countError;

      setSummary({
        omset: currentOmset,
        // Laba belum ditampilkan di halaman mana pun. Perhitungannya dulu menarik
        // seluruh tabel produk + seluruh order_items pada rentang, jadi dilepas
        // sampai laporan labanya benar-benar dibuat.
        laba: 0,
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
