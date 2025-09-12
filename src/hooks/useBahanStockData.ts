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
}

export const useBahanStockData = ({ searchTerm, currentPage, pageSize }: UseBahanStockDataProps) => {
  const [data, setData] = useState<BahanStockItem[]>([]);
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
      .select('id, nama, isi, harga_beli, stok, satuan(nama), supplier(nama)', { count: 'exact' })
      .order('nama', { ascending: true });

    if (searchTerm) {
      query = query.or(`nama.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%,satuan.nama.ilike.%${searchTerm}%,supplier.nama.ilike.%${searchTerm}%`);
    }

    query = query.range(from, to);

    const { data: bahanList, error, count } = await query;

    if (error) {
      console.error('Error fetching bahan stock:', error);
      showError('Gagal memuat data stok bahan.');
      setError(error.message);
    } else {
      const mappedBahanList = (bahanList || []).map(bahan => ({
        ...bahan,
        satuan: getSingleRelatedObject<{ nama: string }>(bahan.satuan),
        supplier: getSingleRelatedObject<{ nama: string }>(bahan.supplier),
      }));
      
      setData(mappedBahanList);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [searchTerm, currentPage, pageSize]);

  useEffect(() => {
    fetchBahanStock();
  }, [fetchBahanStock]);

  return {
    data,
    totalCount,
    loading,
    error,
    fetchBahanStock,
  };
};