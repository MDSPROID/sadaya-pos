import React from 'react';
import { Plus } from 'lucide-react';

interface JenisMemberOption {
  id: string;
  nama: string;
}

interface PelangganItem {
  id: string;
  nama_pelanggan: string;
  organisasi: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  jenis_member_id: string | null;
  npwp: string | null;
  ppn: boolean;
}

interface PelangganModalProps {
  modalMode: 'add' | 'edit' | 'view';
  selectedItem: Partial<PelangganItem>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  jenisMemberOptions: JenisMemberOption[];
  onAddJenisMemberClick: () => void;
}

const PelangganModal: React.FC<PelangganModalProps> = ({
  modalMode,
  selectedItem,
  handleChange,
  handleSubmit,
  onClose,
  jenisMemberOptions,
  onAddJenisMemberClick,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {modalMode === 'add' ? 'Tambah Pelanggan' :
             modalMode === 'edit' ? 'Edit Pelanggan' : 'Detail Pelanggan'}
          </h3>
          
          <div className="space-y-4">
            {modalMode !== 'add' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID
                </label>
                <input
                  type="text"
                  value={selectedItem?.id || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                />
              </div>
            )}
            <div>
              <label htmlFor="nama_pelanggan" className="block text-sm font-medium text-gray-700 mb-1">
                Nama
              </label>
              <input
                type="text"
                id="nama_pelanggan"
                name="nama_pelanggan"
                value={selectedItem?.nama_pelanggan || ''}
                onChange={handleChange}
                disabled={modalMode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>
            
            <div>
              <label htmlFor="organisasi" className="block text-sm font-medium text-gray-700 mb-1">
                Organisasi
              </label>
              <input
                type="text"
                id="organisasi"
                name="organisasi"
                value={selectedItem?.organisasi || ''}
                onChange={handleChange}
                disabled={modalMode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div>
              <label htmlFor="telepon" className="block text-sm font-medium text-gray-700 mb-1">
                HP/Telp
              </label>
              <input
                type="tel"
                id="telepon"
                name="telepon"
                value={selectedItem?.telepon || ''}
                onChange={handleChange}
                disabled={modalMode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={selectedItem?.email || ''}
                onChange={handleChange}
                disabled={modalMode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div>
              <label htmlFor="alamat" className="block text-sm font-medium text-gray-700 mb-1">
                Alamat
              </label>
              <textarea
                rows={3}
                id="alamat"
                name="alamat"
                value={selectedItem?.alamat || ''}
                onChange={handleChange}
                disabled={modalMode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div>
              <label htmlFor="jenis_member_id" className="block text-sm font-medium text-gray-700 mb-1">
                Jenis
              </label>
              <div className="flex items-center space-x-2">
                <select
                  id="jenis_member_id"
                  name="jenis_member_id"
                  value={selectedItem?.jenis_member_id || ''}
                  onChange={handleChange}
                  disabled={modalMode === 'view'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  required
                >
                  <option value="">Pilih Jenis Member</option>
                  {jenisMemberOptions.map(jenis => (
                    <option key={jenis.id} value={jenis.id}>{jenis.nama}</option>
                  ))}
                </select>
                {modalMode !== 'view' && (
                  <button
                    type="button"
                    onClick={onAddJenisMemberClick}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="npwp" className="block text-sm font-medium text-gray-700 mb-1">
                NPWP
              </label>
              <input
                type="text"
                id="npwp"
                name="npwp"
                value={selectedItem?.npwp || ''}
                onChange={handleChange}
                disabled={modalMode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="ppn"
                name="ppn"
                checked={selectedItem?.ppn || false}
                onChange={handleChange}
                disabled={modalMode === 'view'}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ppn" className="ml-2 block text-sm text-gray-900">
                PPN
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {modalMode === 'view' ? 'Tutup' : 'Batal'}
            </button>
            {modalMode !== 'view' && (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {modalMode === 'add' ? 'Tambah' : 'Simpan'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PelangganModal;