import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

interface DashboardStats {
  totalProduk: number;
  karyawanAktif: number;
  totalPelanggan: number;
  totalSupplier: number;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProduk: 0,
    karyawanAktif: 0,
    totalPelanggan: 0,
    totalSupplier: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Total Produk
      const { count: produkCount, error: produkError } = await supabase
        .from('produk')
        .select('*', { count: 'exact', head: true });
      if (produkError) throw produkError;

      // Fetch Karyawan Aktif (profiles with roles other than 'Super Admin' and 'User')
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, roles(nama)');
      if (profilesError) throw profilesError;
      const karyawanAktifCount = (profilesData || []).filter(
        (profile: any) => profile.roles?.nama !== 'Super Admin' && profile.roles?.nama !== 'User'
      ).length;

      // Fetch Total Pelanggan
      const { count: pelangganCount, error: pelangganError } = await supabase
        .from('pelanggan')
        .select('*', { count: 'exact', head: true });
      if (pelangganError) throw pelangganError;

      // Fetch Total Supplier
      const { count: supplierCount, error: supplierError } = await supabase
        .from('supplier')
        .select('*', { count: 'exact', head: true });
      if (supplierError) throw supplierError;

      setStats({
        totalProduk: produkCount || 0,
        karyawanAktif: karyawanAktifCount,
        totalPelanggan: pelangganCount || 0,
        totalSupplier: supplierCount || 0,
      });
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      showError('Gagal memuat statistik dashboard: ' + err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, fetchStats };
};