import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { v4 as uuidv4 } from 'uuid';

export interface AppSettings {
  id: string;
  nama_perusahaan: string | null;
  alamat: string | null;
  kota_kabupaten: string | null;
  provinsi: string | null;
  slogan_toko: string | null;
  telepon: string | null;
  npwp: string | null;
  pajak_penjualan: number;
  diskon_toko: number;
  service_charge: number;
  auto_select_harga_member: boolean;
  pembulatan_total_harga: boolean;
  logo_url: string | null;
}

export const useAppSettings = (isAdminOrSuperAdmin: boolean) => {
  const [settings, setSettings] = useState<Partial<AppSettings>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching app settings:', error);
      showError('Gagal memuat pengaturan aplikasi.');
      setError(error.message);
    } else if (data) {
      setSettings(data);
    } else {
      // Default values if no settings found, and insert them to create the first row
      const defaultSettings: Partial<AppSettings> = {
        nama_perusahaan: '',
        alamat: '',
        kota_kabupaten: '',
        provinsi: '',
        slogan_toko: '',
        telepon: '',
        npwp: '',
        pajak_penjualan: 0,
        diskon_toko: 0,
        service_charge: 0,
        auto_select_harga_member: false,
        pembulatan_total_harga: false,
        logo_url: null,
      };
      const { data: newSettings, error: insertError } = await supabase
        .from('app_settings')
        .insert([defaultSettings])
        .select('*')
        .single();

      if (insertError) {
        console.error('Error inserting default app settings:', insertError);
        showError('Gagal membuat pengaturan aplikasi default.');
        setError(insertError.message);
      } else {
        setSettings(newSettings); // Set state with the newly created settings (including its ID)
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? parseFloat(value) : value),
    }));
  };

  const handleSaveSettings = async () => {
    if (!isAdminOrSuperAdmin) {
      showError('Anda tidak memiliki izin untuk menyimpan pengaturan.');
      return;
    }
    if (!settings.id) {
      showError('ID pengaturan tidak ditemukan. Coba refresh halaman.');
      return;
    }

    const toastId = showLoading('Menyimpan pengaturan aplikasi...');
    
    // Menggunakan update eksplisit karena ID sudah pasti ada
    const { error } = await supabase
      .from('app_settings')
      .update(settings) // Menggunakan seluruh objek settings
      .eq('id', settings.id) // Memastikan update berdasarkan ID
      .select()
      .single();

    if (error) {
      showError('Gagal menyimpan pengaturan: ' + error.message);
    } else {
      showSuccess('Pengaturan berhasil disimpan!');
      setIsEditing(false);
      fetchSettings(); // Re-fetch to ensure latest data
    }
    dismissToast(toastId);
  };

  const handleImageUpload = async (file: File) => {
    if (!isAdminOrSuperAdmin) {
      showError('Anda tidak memiliki izin untuk mengunggah logo.');
      return;
    }
    if (!settings.id) {
      showError('ID pengaturan tidak ditemukan. Coba refresh halaman.');
      return;
    }

    const toastId = showLoading('Mengunggah logo...');
    // const fileExtension = file.name.split('.').pop();
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const fileExtension = file.name.split('.').pop();
    const fileName = `logo-${uniqueSuffix}.${fileExtension}`;
    // const fileName = `logo.${fileExtension}`; // Always name it logo.ext
    const filePath = `${fileName}`;

    try {

      // hapus file lama jika ada
      if (settings.logo_url) {
        // Ambil nama file lama dari URL
        const parts = settings.logo_url.split('/');
        const oldFileName = parts[parts.length - 1];
        if (oldFileName) {
          await supabase.storage.from('app-logos').remove([oldFileName]);
        }
      }

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('app-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite if file exists
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('app-logos')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Gagal mendapatkan URL publik logo.');
      }

      // Update settings with new logo URL menggunakan update eksplisit
      const { error: updateError } = await supabase
        .from('app_settings')
        .update({ logo_url: publicUrlData.publicUrl }) // Hanya update logo_url
        .eq('id', settings.id) // Memastikan update berdasarkan ID
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setSettings(prev => ({ ...prev, logo_url: publicUrlData.publicUrl }));
      showSuccess('Logo berhasil diunggah dan disimpan!');
    } catch (error: any) {
      showError('Gagal mengunggah logo: ' + error.message);
    } finally {
      dismissToast(toastId);
    }
  };

  return {
    settings,
    loadingSettings: loading,
    errorSettings: error,
    isEditingSettings: isEditing,
    setIsEditingSettings: setIsEditing,
    handleSettingsChange,
    handleSaveSettings,
    handleImageUpload,
    fetchSettings,
  };
};