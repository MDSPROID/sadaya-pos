import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

interface Customer {
  id: string;
  nama_pelanggan: string;
  organisasi: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  jenis_member: { nama: string } | null;
  npwp: string | null;
  ppn: boolean;
  current_points: number;
}

interface Product {
  id: string;
  nama_produk: string;
  kategori: { nama: string } | null;
  satuan: { nama: string } | null;
  bahan: { id: string; nama: string; ukuran_panjang: number | null; ukuran_lebar: number | null; stok: number } | null; // Added 'id' to bahan
  quantity_bahan: number;
  use_mesin: boolean;
  mesin: { nama: string } | null;
  harga_pokok: number;
  harga_jual_umum: number;
  harga_jual_khusus: number;
  stok: number;
  barcode_1: string;
  barcode_2: string;
  keterangan: string;
  diskon_persen: number;
  template_order: string;
  grosir_prices: any;
  member_prices: any;
}

interface DesignerOption {
  id: string;
  name: string;
}

interface FinishingOption {
  id: string;
  nama: string;
  harga: number;
}

// New interface for Bahan (Materials)
interface BahanOption {
  id: string;
  nama: string;
  ukuran_panjang: number | null;
  ukuran_lebar: number | null;
}

interface BankOption { // New interface for Bank options
  id: string;
  nama_bank: string;
  rekening: string;
  nama_akun: string;
  charge: number;
}

export const useSalesData = () => {
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [designerOptions, setDesignerOptions] = useState<DesignerOption[]>([]);
  const [finishingOptions, setFinishingOptions] = useState<FinishingOption[]>([]);
  const [bahanOptions, setBahanOptions] = useState<BahanOption[]>([]);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]); // New state for bank options
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  const fetchAllSalesData = useCallback(async () => {
    setLoadingData(true);
    setErrorData(null);
    try {
      const { data: customers, error: custError } = await supabase
        .from('pelanggan')
        .select('*, jenis_member(nama)');
      if (custError) throw custError;
      setCustomerOptions(customers || []);

      const { data: products, error: prodError } = await supabase
        .from('produk')
        .select('*, kategori(nama), satuan(nama), bahan(id, nama, ukuran_panjang, ukuran_lebar, stok), mesin(nama)'); // Select 'id' from bahan
      if (prodError) throw prodError;
      setProductOptions(products || []);

      // Fetch Designer role ID
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id')
        .eq('nama', 'Designer') // Changed from 'Operator' to 'Designer'
        .single();

      if (rolesError) {
        if (rolesError.code === 'PGRST116') { // No rows found
          console.warn("Role 'Designer' tidak ditemukan. Pastikan Anda telah menambahkannya di Master Level (Role) jika ingin menetapkan desainer.");
          showError("Role 'Designer' tidak ditemukan. Daftar desainer mungkin kosong.");
        } else {
          console.error('Error fetching Designer role ID:', rolesError);
          showError('Gagal memuat opsi desainer: ' + rolesError.message);
        }
        setDesignerOptions([]); // Ensure options are cleared on error
      } else if (rolesData) {
        const { data: designers, error: designerError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('role_id', rolesData.id);
        if (designerError) throw designerError;
        setDesignerOptions((designers || []).map(d => ({ id: d.id, name: `${d.first_name} ${d.last_name || ''}` })));
      }

      const { data: finishingData, error: finishingError } = await supabase
        .from('finishing')
        .select('id, nama, harga');
      if (finishingError) throw finishingError;
      setFinishingOptions(finishingData || []);

      // Fetch Bahan data
      const { data: bahanData, error: bahanError } = await supabase
        .from('bahan')
        .select('id, nama, ukuran_panjang, ukuran_lebar');
      if (bahanError) throw bahanError;
      setBahanOptions(bahanData || []);

      // Fetch Bank data
      const { data: bankData, error: bankError } = await supabase
        .from('bank')
        .select('id, nama_bank, rekening, nama_akun, charge');
      if (bankError) throw bankError;
      setBankOptions(bankData || []);

    } catch (err: any) {
      console.error('Error fetching sales data:', err);
      showError('Gagal memuat data penjualan: ' + err.message);
      setErrorData(err.message);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchAllSalesData();
  }, [fetchAllSalesData]);

  return {
    customerOptions,
    productOptions,
    designerOptions,
    finishingOptions,
    bahanOptions,
    bankOptions, // Return new bank options
    loadingData,
    errorData,
    fetchAllSalesData,
  };
};