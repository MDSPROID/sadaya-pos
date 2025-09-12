import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { getSingleRelatedObject } from '../utils/dataHelpers';

export interface KasKeluarItem {
  id: string;
  created_at: string; // ISO string for timestamp
  tanggal: string; // YYYY-MM-DD format for date input
  nama_pengeluaran: string;
  jumlah: number;
  keterangan: string | null;
  petugas_id: string | null;
  profiles: { first_name: string; last_name: string } | null; // Joined profile data
  payment_method: string; // New field
  bank_id: string | null; // New field
  bank: { nama_bank: string } | null; // New field for joined bank data
}

interface UseKasKeluarDataProps {
  startDate: string;
  endDate: string;
}

export const useKasKeluarData = ({ startDate, endDate }: UseKasKeluarDataProps) => {
  const [data, setData] = useState<KasKeluarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKasKeluar = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('kas_keluar')
      .select('*, profiles(first_name, last_name), bank(nama_bank)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('tanggal', startDate);
    }
    if (endDate) {
      query = query.lte('tanggal', endDate);
    }

    const { data: kasKeluarList, error } = await query;

    if (error) {
      console.error('Error fetching kas_keluar:', error);
      showError('Gagal memuat data kas keluar.');
      setError(error.message);
    } else {
      const mappedKasKeluarList: KasKeluarItem[] = (kasKeluarList || []).map((item: any) => ({
        ...item,
        profiles: getSingleRelatedObject(item.profiles),
        bank: getSingleRelatedObject(item.bank),
      }));
      setData(mappedKasKeluarList);
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchKasKeluar();
  }, [fetchKasKeluar]);

  return {
    data,
    loading,
    error,
    fetchKasKeluar,
    setData, // Expose setData for local updates after CRUD
  };
};