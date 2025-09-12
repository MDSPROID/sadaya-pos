import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

export interface NotaSettings {
  id: string;
  footer_penjualan: string | null;
  footer_pembelian: string | null;
  kode_referensi_penjualan: string;
  kode_referensi_pembelian: string;
  metode_urutan: 'bulan' | 'tahun';
  preview_nota_aktif: boolean;
}

export const useNotaSettings = () => {
  const [notaSettings, setNotaSettings] = useState<Partial<NotaSettings>>({});
  const [loadingNotaSettings, setLoadingNotaSettings] = useState(true);
  const [errorNotaSettings, setErrorNotaSettings] = useState<string | null>(null);

  const fetchNotaSettings = useCallback(async () => {
    setLoadingNotaSettings(true);
    setErrorNotaSettings(null);
    const { data, error } = await supabase
      .from('nota_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching nota settings:', error);
      showError('Gagal memuat pengaturan nota.');
      setErrorNotaSettings(error.message);
    } else if (data) {
      setNotaSettings(data);
    } else {
      // Default values if no settings found
      setNotaSettings({
        kode_referensi_penjualan: 'INV',
        kode_referensi_pembelian: 'PO',
        metode_urutan: 'bulan',
        preview_nota_aktif: true,
        footer_penjualan: 'Transfer Ke rekening bank yang ada di database Bank\nBarang yang sudah dibeli tidak dapat dikembalikan atau ditukar',
        footer_pembelian: 'Senang bekerja sama\nDengan Anda\n=====Terima Kasih ====',
      });
    }
    setLoadingNotaSettings(false);
  }, []);

  useEffect(() => {
    fetchNotaSettings();
  }, [fetchNotaSettings]);

  return {
    notaSettings,
    loadingNotaSettings,
    errorNotaSettings,
    fetchNotaSettings,
  };
};