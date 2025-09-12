import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

interface ProfileOption {
  id: string;
  first_name: string;
  last_name: string;
}

export interface BahanOption { // Exported BahanOption
  id: string;
  nama: string;
  satuan: { nama: string } | null; // Correct type for one-to-one relationship
  isi: number;
  ukuran_panjang: number;
  ukuran_lebar: number;
  stok: number;
}

interface BahanKeluarItem {
  id: string;
  created_at: string;
  tanggal: string;
  invoice_id: string | null;
  operator_id: string | null;
  profiles_operator: { first_name: string; last_name: string } | null;
  bahan_id: string | null;
  bahan: { id: string; nama: string; satuan: { nama: string } | null; ukuran_panjang: number; ukuran_lebar: number } | null;
  jumlah: number;
  ukuran_panjang_keluar: number | null;
  ukuran_lebar_keluar: number | null;
  dicatat_oleh_id: string | null;
  profiles_dicatat_oleh: { first_name: string; last_name: string } | null;
}

interface UseBahanKeluarDataProps {
  startDate: string;
  endDate: string;
}

export const useBahanKeluarData = ({ startDate, endDate }: UseBahanKeluarDataProps) => {
  const [data, setData] = useState<BahanKeluarItem[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<ProfileOption[]>([]);
  const [bahanOptions, setBahanOptions] = useState<BahanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBahanKeluar = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('bahan_keluar')
      .select(`
        *,
        profiles_operator:profiles!bahan_keluar_operator_id_fkey(first_name, last_name),
        bahan:bahan(id, nama, satuan(nama), ukuran_panjang, ukuran_lebar),
        profiles_dicatat_oleh:profiles!bahan_keluar_dicatat_oleh_id_fkey(first_name, last_name)
      `)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('tanggal', startDate);
    }
    if (endDate) {
      query = query.lte('tanggal', endDate);
    }

    const { data: bahanKeluarList, error } = await query;

    if (error) {
      console.error('Error fetching bahan_keluar:', error);
      showError('Gagal memuat data bahan keluar.');
      setError(error.message);
    } else {
      setData(bahanKeluarList || []);
    }
    setLoading(false);
  }, [startDate, endDate]);

  const fetchOperatorOptions = useCallback(async () => {
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('id')
      .eq('nama', 'Operator')
      .single();

    if (rolesError || !rolesData) {
      console.error('Error fetching Operator role ID:', rolesError);
      showError('Gagal memuat opsi operator.');
      return;
    }

    const operatorRoleId = rolesData.id;

    const { data: profilesList, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role_id', operatorRoleId)
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching operator profiles:', error);
      showError('Gagal memuat opsi operator.');
    } else {
      setOperatorOptions(profilesList || []);
    }
  }, []);

  const fetchBahanOptions = useCallback(async () => {
    const { data: bahanList, error } = await supabase
      .from('bahan')
      .select('id, nama, isi, ukuran_panjang, ukuran_lebar, satuan(nama), stok')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching bahan options:', error);
      showError('Gagal memuat opsi bahan.');
    } else {
      // Map the data to ensure 'satuan' is a single object or null
      const mappedBahanList = (bahanList || []).map(bahan => ({
        ...bahan,
        satuan: Array.isArray(bahan.satuan) && bahan.satuan.length > 0 ? bahan.satuan[0] : null,
      }));
      setBahanOptions(mappedBahanList);
    }
  }, []);

  useEffect(() => {
    fetchBahanKeluar();
  }, [fetchBahanKeluar]);

  useEffect(() => {
    fetchOperatorOptions();
    fetchBahanOptions();
  }, [fetchOperatorOptions, fetchBahanOptions]);

  return {
    data,
    operatorOptions,
    bahanOptions,
    loading,
    error,
    fetchBahanKeluar,
    fetchOperatorOptions,
    fetchBahanOptions,
    setData, // Expose setData for local updates after CRUD
  };
};