import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';

interface AddKategoriQuickModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddKategoriQuickModal: React.FC<AddKategoriQuickModalProps> = ({ onClose, onSuccess }) => {
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading('Menambah kategori...');

    const { error } = await supabase
      .from('kategori')
      .insert([{ nama, deskripsi }])
      .select()
      .single();

    if (error) {
      showError('Gagal menambah kategori: ' + error.message);
    } else {
      showSuccess('Kategori berhasil ditambahkan!');
      onSuccess();
      onClose();
    }
    dismissToast(toastId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Tambah Kategori Baru</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="namaKategori" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Kategori
              </label>
              <input
                type="text"
                id="namaKategori"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="deskripsiKategori" className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                id="deskripsiKategori"
                rows={3}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddKategoriQuickModal;