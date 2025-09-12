import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { useSession } from '../components/SessionContextProvider';

interface NotaSettings {
  id: string;
  footer_penjualan: string;
  footer_pembelian: string;
  kode_referensi_penjualan: string;
  kode_referensi_pembelian: string;
  metode_urutan: string;
  preview_nota_aktif: boolean;
}

const Nota: React.FC = () => {
  const { profile } = useSession();
  const isAdminOrSuperAdmin = profile?.role === 'Super Admin' || profile?.role === 'Admin';

  const [settings, setSettings] = useState<Partial<NotaSettings>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('nota_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for initial load
      console.error('Error fetching nota settings:', error);
      showError('Gagal memuat pengaturan nota.');
      setError(error.message);
    } else if (data) {
      setSettings(data);
    } else {
      // If no settings found, initialize with default values
      setSettings({
        footer_penjualan: 'Transfer Ke rekening bank yang ada di database Bank\nBarang yang sudah dibeli tidak dapat dikembalikan atau ditukar',
        footer_pembelian: 'Senang bekerja sama\nDengan Anda\n=====Terima Kasih ====',
        kode_referensi_penjualan: 'INV',
        kode_referensi_pembelian: 'PO',
        metode_urutan: 'bulan',
        preview_nota_aktif: true,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSave = async () => {
    if (!isAdminOrSuperAdmin) {
      showError('Anda tidak memiliki izin untuk menyimpan pengaturan.');
      return;
    }

    const toastId = showLoading('Menyimpan pengaturan nota...');
    const { error } = await supabase
      .from('nota_settings')
      .upsert([settings], { onConflict: 'id' }) // Use upsert to insert if not exists, update if exists
      .select()
      .single();

    if (error) {
      showError('Gagal menyimpan pengaturan: ' + error.message);
    } else {
      showSuccess('Pengaturan berhasil disimpan!');
      setIsEditing(false);
      fetchSettings(); // Re-fetch to ensure latest data and defaults are applied
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat pengaturan nota...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchSettings} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Nota</h1>
          <p className="text-gray-600">Kelola teks footer dan kode referensi untuk nota penjualan dan pembelian.</p>
        </div>
        {isAdminOrSuperAdmin && (
          <div className="flex space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Ubah Pengaturan
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    fetchSettings(); // Revert changes
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Simpan Pengaturan
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Footer Nota Penjualan */}
          <div>
            <label htmlFor="footer_penjualan" className="block text-sm font-medium text-gray-700 mb-1">
              Footer Nota Penjualan
            </label>
            <textarea
              id="footer_penjualan"
              name="footer_penjualan"
              rows={5}
              value={settings.footer_penjualan || ''}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              * Untuk informasi rekening bank dinamis, fitur ini akan diimplementasikan di kemudian hari.
            </p>
          </div>

          {/* Footer Nota Pembelian */}
          <div>
            <label htmlFor="footer_pembelian" className="block text-sm font-medium text-gray-700 mb-1">
              Footer Nota Pembelian
            </label>
            <textarea
              id="footer_pembelian"
              name="footer_pembelian"
              rows={5}
              value={settings.footer_pembelian || ''}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          {/* Kode Referensi Nota */}
          <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kode Referensi Nota</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="kode_referensi_penjualan" className="block text-sm font-medium text-gray-700 mb-1">
                  Penjualan
                </label>
                <input
                  type="text"
                  id="kode_referensi_penjualan"
                  name="kode_referensi_penjualan"
                  value={settings.kode_referensi_penjualan || ''}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
              </div>
              <div>
                <label htmlFor="kode_referensi_pembelian" className="block text-sm font-medium text-gray-700 mb-1">
                  Pembelian
                </label>
                <input
                  type="text"
                  id="kode_referensi_pembelian"
                  name="kode_referensi_pembelian"
                  value={settings.kode_referensi_pembelian || ''}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
              </div>
              <div>
                <label htmlFor="metode_urutan" className="block text-sm font-medium text-gray-700 mb-1">
                  Metode Urutan
                </label>
                <select
                  id="metode_urutan"
                  name="metode_urutan"
                  value={settings.metode_urutan || 'bulan'}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                >
                  <option value="bulan">Bulan</option>
                  <option value="tahun">Tahun</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Contoh: INV0219-1...INV0319-1
                </p>
              </div>
              <div className="flex items-end">
                <label htmlFor="preview_nota_aktif" className="flex items-center text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    id="preview_nota_aktif"
                    name="preview_nota_aktif"
                    checked={settings.preview_nota_aktif || false}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2">Preview Nota Aktif</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nota;