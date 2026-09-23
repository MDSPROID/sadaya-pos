import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { getSingleRelatedObject } from '../utils/dataHelpers'; // Import from new utility

export interface ProdukStockItem {
  id: string;
  nama_produk: string;
  kategori: { nama: string } | null;
  satuan: { nama: string } | null;
  stok: number;
  harga_pokok: number;
  harga_jual_umum: number;
}

interface UseProdukStockDataProps {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
  /** Ambil juga seluruh baris (tanpa pagination) untuk cetak/export. */
  fetchAll?: boolean;
}

const ALL_PAGE_SIZE = 1000; // batas default PostgREST per request

const SELECT_COLS = 'id, nama_produk, stok, harga_pokok, harga_jual_umum, kategori(nama), satuan(nama)';
const SEARCH_COLS = (term: string) =>
  `nama_produk.ilike.%${term}%,id.ilike.%${term}%,kategori.nama.ilike.%${term}%`;

const mapProduk = (produk: any): ProdukStockItem => ({
  ...produk,
  kategori: getSingleRelatedObject<{ nama: string }>(produk.kategori),
  satuan: getSingleRelatedObject<{ nama: string }>(produk.satuan),
});

export const useProdukStockData = ({ searchTerm, currentPage, pageSize, fetchAll = false }: UseProdukStockDataProps) => {
  const [data, setData] = useState<ProdukStockItem[]>([]);
  const [allData, setAllData] = useState<ProdukStockItem[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProdukStock = useCallback(async () => {
    setLoading(true);
    setError(null);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('produk')
      .select(SELECT_COLS, { count: 'exact' })
      .order('nama_produk', { ascending: true });

    if (searchTerm) {
      query = query.or(SEARCH_COLS(searchTerm));
    }

    query = query.range(from, to);

    const { data: produkList, error, count } = await query;

    if (error) {
      console.error('Error fetching produk stock:', error);
      showError('Gagal memuat data stok produk.');
      setError(error.message);
    } else {
      setData((produkList || []).map(mapProduk));
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [searchTerm, currentPage, pageSize]);

  // Seluruh baris hasil pencarian (dipaging per 1000) - untuk cetak & export Excel
  const fetchAllProdukStock = useCallback(async () => {
    setLoadingAll(true);
    try {
      const rows: any[] = [];
      let from = 0;
      for (;;) {
        let q = supabase
          .from('produk')
          .select(SELECT_COLS)
          .order('nama_produk', { ascending: true })
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
      setAllData(rows.map(mapProduk));
    } catch (e: any) {
      console.error('Error fetching all produk stock:', e);
      showError('Gagal memuat seluruh data stok produk untuk cetak.');
      setAllData([]);
    } finally {
      setLoadingAll(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchProdukStock();
  }, [fetchProdukStock]);

  useEffect(() => {
    if (fetchAll) fetchAllProdukStock();
  }, [fetchAll, fetchAllProdukStock]);

  return {
    data,
    allData,
    loadingAll,
    totalCount,
    loading,
    error,
    fetchProdukStock,
    fetchAllProdukStock,
  };
};
