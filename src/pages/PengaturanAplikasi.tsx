import React from 'react';
import { useSession } from '../components/SessionContextProvider';
import { useAppSettings } from '../hooks/useAppSettings';

const PengaturanAplikasi: React.FC = () => {
  const { profile } = useSession();
  const isAdminOrSuperAdmin = profile?.role === 'Super Admin' || profile?.role === 'Admin';

  const {
    settings,
    loadingSettings,
    errorSettings,
    isEditingSettings,
    setIsEditingSettings,
    handleSettingsChange,
    handleSaveSettings,
    handleImageUpload,
    fetchSettings,
  } = useAppSettings(isAdminOrSuperAdmin);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  if (loadingSettings) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat pengaturan aplikasi...</p>
      </div>
    );
  }

  if (errorSettings) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {errorSettings}</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Aplikasi</h1>
          <p className="text-gray-600">Kelola informasi dasar perusahaan dan pengaturan aplikasi.</p>
        </div>
        {isAdminOrSuperAdmin && (
          <div className="flex space-x-3">
            {!isEditingSettings ? (
              <button
                onClick={() => setIsEditingSettings(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Ubah Pengaturan
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditingSettings(false);
                    fetchSettings(); // Revert changes
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Simpan Pengaturan
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pengaturan Dasar Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan Dasar</h3>
          <div>
            <label htmlFor="nama_perusahaan" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Perusahaan
            </label>
            <input
              type="text"
              id="nama_perusahaan"
              name="nama_perusahaan"
              value={settings.nama_perusahaan || ''}
              onChange={handleSettingsChange}
              disabled={!isEditingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          {/* Lokasi Cabang dan Lokasi PC dihapus */}
          <div>
            <label htmlFor="alamat" className="block text-sm font-medium text-gray-700 mb-1">
              Alamat
            </label>
            <textarea
              id="alamat"
              name="alamat"
              rows={2}
              value={settings.alamat || ''}
              onChange={handleSettingsChange}
              disabled={!isEditingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="kota_kabupaten" className="block text-sm font-medium text-gray-700 mb-1">
              Kota / Kabupaten
            </label>
            <input
              type="text"
              id="kota_kabupaten"
              name="kota_kabupaten"
              value={settings.kota_kabupaten || ''}
              onChange={handleSettingsChange}
              disabled={!isEditingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="provinsi" className="block text-sm font-medium text-gray-700 mb-1">
              Provinsi
            </label>
            <input
              type="text"
              id="provinsi"
              name="provinsi"
              value={settings.provinsi || ''}
              onChange={handleSettingsChange}
              disabled={!isEditingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="slogan_toko" className="block text-sm font-medium text-gray-700 mb-1">
              Slogan Toko
            </label>
            <input
              type="text"
              id="slogan_toko"
              name="slogan_toko"
              value={settings.slogan_toko || ''}
              onChange={handleSettingsChange}
              disabled={!isEditingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="telepon" className="block text-sm font-medium text-gray-700 mb-1">
              Telepon
            </label>
            <input
              type="text"
              id="telepon"
              name="telepon"
              value={settings.telepon || ''}
              onChange={handleSettingsChange}
              disabled={!isEditingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="npwp" className="block text-sm font-medium text-gray-700 mb-1">
              NPWP
            </label>
            <input
              type="text"
              id="npwp"
              name="npwp"
              value={settings.npwp || ''}
              onChange={handleSettingsChange}
              disabled={!isEditingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="pajak_penjualan" className="block text-sm font-medium text-gray-700 mb-1">
              Pajak Penjualan (%)
            </label>
            <input
              type="number"
              id="pajak_penjualan"
              name="pajak_penjualan"
              value={settings.pajak_penjualan || 0}
              onChange={handleSettingsChange}
              disabled={!isEditingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label htmlFor="diskon_toko" className="block text-sm font-medium text-gray-700 mb-1">
              Diskon Toko (%)
            </label>
            <input
              type="number"
              id="diskon_toko"
              name="diskon_toko"
              value={settings.diskon_toko || 0}
              onChange={handleSettingsChange}
              disabled={!isEditingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label htmlFor="service_charge" className="block text-sm font-medium text-gray-700 mb-1">
              Service Charge (%)
            </label>
            <input
              type="number"
              id="service_charge"
              name="service_charge"
              value={settings.service_charge || 0}
              onChange={handleSettingsChange}
              disabled={!isEditingSettings}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              min="0"
              max="100"
            />
          </div>
          <div className="col-span-full">
            <label htmlFor="auto_select_harga_member" className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                id="auto_select_harga_member"
                name="auto_select_harga_member"
                checked={settings.auto_select_harga_member || false}
                onChange={handleSettingsChange}
                disabled={!isEditingSettings}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2">Auto Select Harga Member</span>
            </label>
          </div>
          <div className="col-span-full">
            <label htmlFor="pembulatan_total_harga" className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                id="pembulatan_total_harga"
                name="pembulatan_total_harga"
                checked={settings.pembulatan_total_harga || false}
                onChange={handleSettingsChange}
                disabled={!isEditingSettings}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2">Pembulatan Total Harga</span>
            </label>
          </div>
        </div>

        {/* Logo Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Logo</h3>
          <div className="border border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center min-h-[200px]">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Company Logo" className="max-w-full max-h-48 object-contain" />
            ) : (
              <div className="text-gray-500 text-center">Tidak ada logo</div>
            )}
          </div>
          {isEditingSettings && (
            <div className="flex flex-col items-center space-y-2">
              <label htmlFor="logo_upload" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                Pilih Gambar
              </label>
              <input
                type="file"
                id="logo_upload"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={!isEditingSettings}
              />
              <p className="text-sm text-gray-500">Unggah file gambar (JPG, PNG, dll.)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PengaturanAplikasi;