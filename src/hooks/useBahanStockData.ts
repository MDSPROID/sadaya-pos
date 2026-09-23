import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { getSingleRelatedObject } from '../utils/dataHelpers'; // Import from new utility

export interface BahanStockItem {
  id: string;
  nama: string;
  satuan: { nama: string } | null;
  isi: number;
  harga_beli: number;
  stok: number;
  /** Batas peringatan stok menipis. 0 = tidak dipantau. */
  stok_minimum: number;
  supplier: { nama: string } | null;
}

interface UseBahanStockDataProps {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
  /** Ambil juga seluruh baris (tanpa pagination) untuk cetak/export. */
  fetchAll?: boolean;
  /** Hanya tampilkan barang yang stoknya sudah di bawah/sama dengan batas minimum. */
  hanyaMenipis?: boolean;
}

const ALL_PAGE_SIZE = 1000; // batas default PostgREST per request

const SELECT_COLS = 'id, nama, isi, harga_beli, stok, stok_minimum, satuan(nama), supplier(nama)';
const SELECT_COLS_LEGACY = 'id, nama, isi, harga_beli, stok, satuan(nama), supplier(nama)';

/**
 * Kolom stok minimum baru ada setelah `supabase/sql/stok_minimum.sql` dijalankan.
 * Kalau aplikasi terlanjur di-deploy lebih dulu, query diulang tanpa kolom itu
 * supaya halaman tetap tampil (batasnya dianggap 0 / tidak dipantau) — bukan
 * gagal total dengan pesan "column does not exist".
 */
let kolomMinimumAda = true;

const kolomHilang = (e: any) =>
  /stok_minimum|stok_menipis/.test(String(e?.message ?? '')) &&
  /does not exist|schema cache/i.test(String(e?.message ?? ''));

const jalankan = async <T,>(build: (cols: string, pakaiMinimum: boolean) => any): Promise<T> => {
  if (kolomMinimumAda) {
    const res = await build(SELECT_COLS, true);
    if (!res.error) return res as T;
    if (!kolomHilang(res.error)) return res as T;
    kolomMinimumAda = false;
  }
  return (await build(SELECT_COLS_LEGACY, false)) as T;
};

const SEARCH_COLS = (term: string) =>
  `nama.ilike.%${term}%,id.ilike.%${term}%,satuan.nama.ilike.%${term}%,supplier.nama.ilike.%${term}%`;

const mapBahan = (bahan: any): BahanStockItem => ({
  ...bahan,
  satuan: getSingleRelatedObject<{ nama: string }>(bahan.satuan),
  supplier: getSingleRelatedObject<{ nama: string }>(bahan.supplier),
});

export const useBahanStockData = ({ searchTerm, currentPage, pageSize, fetchAll = false, hanyaMenipis = false }: UseBahanStockDataProps) => {
  const [data, setData] = useState<BahanStockItem[]>([]);
  const [allData, setAllData] = useState<BahanStockItem[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBahanStock = useCallback(async () => {
    setLoading(true);
    setError(null);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: bahanList, error, count } = await jalankan<any>((cols, pakaiMinimum) => {
      let q = supabase
        .from('bahan')
        .select(cols, { count: 'exact' })
        .order('nama', { ascending: true });
      if (searchTerm) q = q.or(SEARCH_COLS(searchTerm));
      if (hanyaMenipis && pakaiMinimum) q = q.eq('stok_menipis', true);
      return q.range(from, to);
    });

    if (error) {
      console.error('Error fetching bahan stock:', error);
      showError('Gagal memuat data stok bahan.');
      setError(error.message);
    } else {
      setData((bahanList || []).map(mapBahan));
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [searchTerm, currentPage, pageSize, hanyaMenipis]);

  // Seluruh baris hasil pencarian (dipaging per 1000) - untuk cetak & export Excel
  const fetchAllBahanStock = useCallback(async () => {
    setLoadingAll(true);
    try {
      const rows: any[] = [];
      let from = 0;
      for (;;) {
        const { data: page, error: pageErr } = await jalankan<any>((cols, pakaiMinimum) => {
          let q = supabase
            .from('bahan')
            .select(cols)
            .order('nama', { ascending: true })
            .range(from, from + ALL_PAGE_SIZE - 1);
          if (searchTerm) q = q.or(SEARCH_COLS(searchTerm));
          if (hanyaMenipis && pakaiMinimum) q = q.eq('stok_menipis', true);
          return q;
        });
        if (pageErr) throw pageErr;
        rows.push(...(page || []));
        if (!page || page.length < ALL_PAGE_SIZE) break;
        from += ALL_PAGE_SIZE;
      }
      setAllData(rows.map(mapBahan));
    } catch (e: any) {
      console.error('Error fetching all bahan stock:', e);
      showError('Gagal memuat seluruh data stok bahan untuk cetak.');
      setAllData([]);
    } finally {
      setLoadingAll(false);
    }
  }, [searchTerm, hanyaMenipis]);

  useEffect(() => {
    fetchBahanStock();
  }, [fetchBahanStock]);

  useEffect(() => {
    if (fetchAll) fetchAllBahanStock();
  }, [fetchAll, fetchAllBahanStock]);

  return {
    data,
    allData,
    loadingAll,
    totalCount,
    loading,
    error,
    fetchBahanStock,
    fetchAllBahanStock,
  };
};
