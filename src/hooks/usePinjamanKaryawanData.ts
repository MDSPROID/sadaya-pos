import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { getSingleRelatedObject } from '../utils/dataHelpers'; // Import getSingleRelatedObject

interface ProfileOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface BankOption { // New interface for Bank options
  id: string;
  nama_bank: string;
  rekening: string;
  nama_akun: string;
  charge: number;
}

export interface PinjamanKaryawanItem {
  id: string;
  created_at: string;
  tanggal_pinjam: string;
  karyawan_id: string | null;
  profiles_karyawan: { first_name: string; last_name: string } | null;
  jumlah_pinjaman: number;
  jatuh_tempo: string | null;
  status: string;
  keterangan: string | null;
  dicatat_oleh_id: string | null;
  profiles_dicatat_oleh: { first_name: string; last_name: string } | null;
  sisa_pinjaman: number; // New field
  jumlah_pembayaran: number; // New field
  payment_method: string; // New field
  bank_id: string | null; // New field
  bank: { nama_bank: string } | null; // New field for joined bank data
}

interface UsePinjamanKaryawanDataProps {
  startDate: string;
  endDate: string;
}

export const usePinjamanKaryawanData = ({ startDate, endDate }: UsePinjamanKaryawanDataProps) => {
  const [data, setData] = useState<PinjamanKaryawanItem[]>([]);
  const [karyawanOptions, setKaryawanOptions] = useState<ProfileOption[]>([]);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]); // New state for bank options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPinjamanKaryawan = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('pinjaman_karyawan')
      .select(`
        id,
        created_at,
        tanggal_pinjam,
        karyawan_id,
        profiles_karyawan:profiles!pinjaman_karyawan_karyawan_id_fkey(first_name, last_name),
        jumlah_pinjaman,
        jatuh_tempo,
        status,
        keterangan,
        dicatat_oleh_id,
        profiles_dicatat_oleh:profiles!pinjaman_karyawan_dicatat_oleh_id_fkey(first_name, last_name),
        sisa_pinjaman,
        jumlah_pembayaran,
        payment_method,
        bank_id,
        bank:bank(nama_bank)
      `)
      .order('tanggal_pinjam', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('tanggal_pinjam', startDate);
    }
    if (endDate) {
      query = query.lte('tanggal_pinjam', endDate);
    }

    const { data: pinjamanList, error } = await query;

    if (error) {
      console.error('Error fetching pinjaman_karyawan:', error);
      showError('Gagal memuat data pinjaman karyawan.');
      setError(error.message);
    } else {
      // Map the data to ensure profiles and bank are single objects or null
      const mappedPinjamanList: PinjamanKaryawanItem[] = (pinjamanList || []).map((item: any) => ({
        ...item,
        profiles_karyawan: getSingleRelatedObject(item.profiles_karyawan),
        profiles_dicatat_oleh: getSingleRelatedObject(item.profiles_dicatat_oleh),
        bank: getSingleRelatedObject(item.bank),
      }));
      setData(mappedPinjamanList);
    }
    setLoading(false);
  }, [startDate, endDate]);

  const fetchKaryawanOptions = useCallback(async () => {
    try {
      // Fetch all roles first
      const { data: allRoles, error: rolesError } = await supabase
        .from('roles')
        .select('id, nama');

      if (rolesError) throw rolesError;

      // Filter out 'Super Admin' and 'User' roles, as these are typically not considered 'karyawan' for loans
      const employeeRoleIds = (allRoles || [])
        .filter(role => role.nama !== 'Super Admin' && role.nama !== 'User')
        .map(role => role.id);

      if (employeeRoleIds.length === 0) {
        // If no valid employee roles are found, set options to empty and log a warning
        console.warn("Tidak ada role yang valid untuk karyawan (selain Super Admin dan User).");
        setKaryawanOptions([]);
        return;
      }

      // Fetch profiles associated with these employee roles
      const { data: profilesList, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('role_id', employeeRoleIds) // Use .in() to match multiple role IDs
        .order('first_name', { ascending: true });

      if (profilesError) throw profilesError;

      setKaryawanOptions(profilesList || []);
    } catch (error: any) {
      console.error('Error fetching karyawan options:', error);
      showError('Gagal memuat opsi karyawan: ' + error.message);
      setKaryawanOptions([]);
    }
  }, []);

  const fetchBankOptions = useCallback(async () => {
    const { data: bankList, error } = await supabase
      .from('bank')
      .select('id, nama_bank, rekening, nama_akun, charge')
      .order('nama_bank', { ascending: true });

    if (error) {
      console.error('Error fetching bank options:', error);
      showError('Gagal memuat opsi bank.');
    } else {
      setBankOptions(bankList || []);
    }
  }, []);

  useEffect(() => {
    fetchPinjamanKaryawan();
  }, [fetchPinjamanKaryawan]);

  useEffect(() => {
    fetchKaryawanOptions();
    fetchBankOptions(); // Fetch bank options
  }, [fetchKaryawanOptions, fetchBankOptions]);

  return {
    data,
    karyawanOptions,
    bankOptions, // Return bank options
    loading,
    error,
    fetchPinjamanKaryawan,
    setData, // Expose setData for local updates after CRUD
  };
};