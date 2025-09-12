import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';

interface AddSupplierQuickModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddSupplierQuickModal: React.FC<AddSupplierQuickModalProps> = ({ onClose, onSuccess }) => {
  const [nama, setNama] = useState('');
  const [jenisSupplier, setJenisSupplier] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading('Menambah supplier...');

    const { error } = await supabase // Removed 'data' from destructuring
      .from('supplier')
      .insert([{ nama, jenis_supplier: jenisSupplier }])
      .select()
      .single();

    if (error) {
      showError('Gagal menambah supplier: ' + error.message);
    } else {
      showSuccess('Supplier berhasil ditambahkan!');
      onSuccess();
      onClose();
    }
    dismissToast(toastId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[999]"> {/* Changed z-index to z-[999] */}
      <div className="bg-white rounded-lg max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Tambah Supplier Baru</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="namaSupplier" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Supplier
              </label>
              <input
                type="text"
                id="namaSupplier"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="jenisSupplier" className="block text-sm font-medium text-gray-700 mb-1">
                Jenis Supplier
              </label>
              <input
                type="text"
                id="jenisSupplier"
                value={jenisSupplier}
                onChange={(e) => setJenisSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            {/* Removed Email Field */}
            {/*
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            */}
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

export default AddSupplierQuickModal;