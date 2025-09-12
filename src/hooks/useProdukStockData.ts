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
}

export const useProdukStockData = ({ searchTerm, currentPage, pageSize }: UseProdukStockDataProps) => {
  const [data, setData] = useState<ProdukStockItem[]>([]);
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
      .select('id, nama_produk, stok, harga_pokok, harga_jual_umum, kategori(nama), satuan(nama)', { count: 'exact' })
      .order('nama_produk', { ascending: true });

    if (searchTerm) {
      query = query.or(`nama_produk.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%,kategori.nama.ilike.%${searchTerm}%`);
    }

    query = query.range(from, to);

    const { data: produkList, error, count } = await query;

    if (error) {
      console.error('Error fetching produk stock:', error);
      showError('Gagal memuat data stok produk.');
      setError(error.message);
    } else {
      // Map the data to ensure 'kategori' and 'satuan' are single objects or null
      const mappedProdukList = (produkList || []).map(produk => ({
        ...produk,
        kategori: getSingleRelatedObject<{ nama: string }>(produk.kategori),
        satuan: getSingleRelatedObject<{ nama: string }>(produk.satuan),
      }));
      setData(mappedProdukList);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [searchTerm, currentPage, pageSize]);

  useEffect(() => {
    fetchProdukStock();
  }, [fetchProdukStock]);

  return {
    data,
    totalCount,
    loading,
    error,
    fetchProdukStock,
  };
};