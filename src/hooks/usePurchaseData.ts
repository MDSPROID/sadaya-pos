import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';
import { Supplier, Product, Bahan, BankOption } from '../types/purchaseOrderTypes';
import { getSingleRelatedObject } from '../utils/dataHelpers'; // Import helper

export const usePurchaseData = () => {
  const [supplierOptions, setSupplierOptions] = useState<Supplier[]>([]);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [bahanOptions, setBahanOptions] = useState<Bahan[]>([]);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  const fetchAllPurchaseData = useCallback(async () => {
    setLoadingData(true);
    setErrorData(null);
    try {
      const { data: suppliers, error: suppError } = await supabase
        .from('supplier')
        .select('id, nama, telepon, alamat, jenis_supplier'); // Removed email
      if (suppError) throw suppError;
      setSupplierOptions(suppliers || []);

      const { data: products, error: prodError } = await supabase
        .from('produk')
        .select('id, nama_produk, stok, harga_pokok, satuan(nama)');
      if (prodError) throw prodError;
      const mappedProducts = (products || []).map(p => ({
        ...p,
        satuan: getSingleRelatedObject(p.satuan), // Use helper here
      }));
      setProductOptions(mappedProducts);

      const { data: bahans, error: bahanError } = await supabase
        .from('bahan')
        .select('id, nama, stok, harga_beli, satuan(nama)');
      if (bahanError) throw bahanError;
      const mappedBahans = (bahans || []).map(b => ({
        ...b,
        satuan: getSingleRelatedObject(b.satuan), // Use helper here
      }));
      setBahanOptions(mappedBahans);

      const { data: banks, error: bankError } = await supabase
        .from('bank')
        .select('id, nama_bank, rekening, nama_akun, charge');
      if (bankError) throw bankError;
      setBankOptions(banks || []);

    } catch (err: any) {
      console.error('Error fetching purchase data:', err);
      showError('Gagal memuat data pembelian: ' + err.message);
      setErrorData(err.message);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPurchaseData();
  }, [fetchAllPurchaseData]);

  return {
    supplierOptions,
    productOptions,
    bahanOptions,
    bankOptions,
    loadingData,
    errorData,
    fetchAllPurchaseData,
  };
};