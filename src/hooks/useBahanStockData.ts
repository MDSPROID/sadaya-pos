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
  supplier: { nama: string } | null;
}

interface UseBahanStockDataProps {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
  /** Ambil juga seluruh baris (tanpa pagination) untuk cetak/export. */
  fetchAll?: boolean;
}

const ALL_PAGE_SIZE = 1000; // batas default PostgREST per request

const SELECT_COLS = 'id, nama, isi, harga_beli, stok, satuan(nama), supplier(nama)';
const SEARCH_COLS = (term: string) =>
  `nama.ilike.%${term}%,id.ilike.%${term}%,satuan.nama.ilike.%${term}%,supplier.nama.ilike.%${term}%`;

const mapBahan = (bahan: any): BahanStockItem => ({
  ...bahan,
  satuan: getSingleRelatedObject<{ nama: string }>(bahan.satuan),
  supplier: getSingleRelatedObject<{ nama: string }>(bahan.supplier),
});

export const useBahanStockData = ({ searchTerm, currentPage, pageSize, fetchAll = false }: UseBahanStockDataProps) => {
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

    let query = supabase
      .from('bahan')
      .select(SELECT_COLS, { count: 'exact' })
      .order('nama', { ascending: true });

    if (searchTerm) {
      query = query.or(SEARCH_COLS(searchTerm));
    }

    query = query.range(from, to);

    const { data: bahanList, error, count } = await query;

    if (error) {
      console.error('Error fetching bahan stock:', error);
      showError('Gagal memuat data stok bahan.');
      setError(error.message);
    } else {
      setData((bahanList || []).map(mapBahan));
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [searchTerm, currentPage, pageSize]);

  // Seluruh baris hasil pencarian (dipaging per 1000) - untuk cetak & export Excel
  const fetchAllBahanStock = useCallback(async () => {
    setLoadingAll(true);
    try {
      const rows: any[] = [];
      let from = 0;
      for (;;) {
        let q = supabase
          .from('bahan')
          .select(SELECT_COLS)
          .order('nama', { ascending: true })
          .range(from, from + ALL_PAGE_SIZE - 1);

        if (searchTerm) {
          q = q.or(SEARCH_COLS(searchTerm));
        }

        const { data: page, error: pageErr } = await q;
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
  }, [searchTerm]);

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
