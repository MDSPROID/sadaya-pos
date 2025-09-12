import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { getSingleRelatedObject } from '../utils/dataHelpers';

export interface KasMasukItem {
  id: string;
  created_at: string; // ISO string for timestamp
  tanggal: string; // YYYY-MM-DD format for date input
  nama_pemasukan: string;
  jumlah: number;
  keterangan: string | null;
  petugas_id: string | null;
  profiles: { first_name: string; last_name: string } | null; // Joined profile data
  payment_method: string; // New field
  bank_id: string | null; // New field
  bank: { nama_bank: string } | null; // New field for joined bank data
}

interface UseKasMasukDataProps {
  startDate: string;
  endDate: string;
}

export const useKasMasukData = ({ startDate, endDate }: UseKasMasukDataProps) => {
  const [data, setData] = useState<KasMasukItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKasMasuk = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('kas_masuk')
      .select('*, profiles(first_name, last_name), bank(nama_bank)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('tanggal', startDate);
    }
    if (endDate) {
      query = query.lte('tanggal', endDate);
    }

    const { data: kasMasukList, error } = await query;

    if (error) {
      console.error('Error fetching kas_masuk:', error);
      showError('Gagal memuat data kas masuk.');
      setError(error.message);
    } else {
      const mappedKasMasukList: KasMasukItem[] = (kasMasukList || []).map((item: any) => ({
        ...item,
        profiles: getSingleRelatedObject(item.profiles),
        bank: getSingleRelatedObject(item.bank),
      }));
      setData(mappedKasMasukList);
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchKasMasuk();
  }, [fetchKasMasuk]);

  return {
    data,
    loading,
    error,
    fetchKasMasuk,
    setData, // Expose setData for local updates after CRUD
  };
};