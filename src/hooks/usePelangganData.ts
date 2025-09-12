import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

export interface JenisMemberOption {
  id: string;
  nama: string;
}

export interface PelangganItem {
  id: string;
  nama_pelanggan: string;
  organisasi: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  jenis_member_id: string | null;
  jenis_member: { nama: string } | null;
  npwp: string | null;
  ppn: boolean;
}

interface UsePelangganDataProps {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
}

export const usePelangganData = ({ searchTerm, currentPage, pageSize }: UsePelangganDataProps) => {
  const [data, setData] = useState<PelangganItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [jenisMemberOptions, setJenisMemberOptions] = useState<JenisMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPelanggan = useCallback(async () => {
    setLoading(true);
    setError(null);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('pelanggan')
      .select('*, jenis_member(nama)', { count: 'exact' })
      .order('nama_pelanggan', { ascending: true });

    if (searchTerm) {
      query = query.or(`nama_pelanggan.ilike.%${searchTerm}%,organisasi.ilike.%${searchTerm}%,telepon.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,alamat.ilike.%${searchTerm}%,npwp.ilike.%${searchTerm}%`);
    }

    query = query.range(from, to);

    const { data: pelangganList, error, count } = await query;

    if (error) {
      console.error('Error fetching pelanggan:', error);
      showError('Gagal memuat data pelanggan.');
      setError(error.message);
    } else {
      setData(pelangganList || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [searchTerm, currentPage, pageSize]);

  const fetchJenisMemberOptions = useCallback(async () => {
    const { data: jenisList, error } = await supabase
      .from('jenis_member')
      .select('id, nama')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching jenis member options:', error);
      showError('Gagal memuat opsi jenis member.');
    } else {
      setJenisMemberOptions(jenisList || []);
    }
  }, []);

  useEffect(() => {
    fetchPelanggan();
    fetchJenisMemberOptions();
  }, [fetchPelanggan, fetchJenisMemberOptions]);

  return {
    data,
    setData,
    totalCount,
    jenisMemberOptions,
    fetchJenisMemberOptions, // Expose for quick-add modals
    loading,
    error,
    fetchPelanggan, // Expose for re-fetching
  };
};