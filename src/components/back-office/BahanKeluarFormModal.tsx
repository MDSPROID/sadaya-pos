import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { BahanOption } from '../../hooks/useBahanKeluarData';
import SelectBahanModal from '../master-data/SelectBahanModal';

interface BahanKeluarFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'view';
  item: any;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  operatorOptions: { id: string; first_name: string; last_name: string }[];
  onSelectBahan: (bahan: BahanOption) => void;
  showSelectBahanModal: boolean;
  setShowSelectBahanModal: (show: boolean) => void;
}

const BahanKeluarFormModal: React.FC<BahanKeluarFormModalProps> = ({
  isOpen,
  mode,
  item,
  onClose,
  onSubmit,
  operatorOptions,
  onSelectBahan,
  showSelectBahanModal,
  setShowSelectBahanModal,
}) => {
  const [formData, setFormData] = useState(item);

  useEffect(() => {
    setFormData(item);
  }, [item]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleFormSubmit} className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {mode === 'add' ? 'Tambah Pengeluaran Bahan' :
             mode === 'edit' ? 'Edit Pengeluaran Bahan' : 'Detail Pengeluaran Bahan'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="tanggal" className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal
              </label>
              <input
                type="date"
                id="tanggal"
                name="tanggal"
                value={formData?.tanggal || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>
            
            <div>
              <label htmlFor="invoice_id" className="block text-sm font-medium text-gray-700 mb-1">
                Pilih Item Faktur (Placeholder)
              </label>
              <input
                type="text"
                id="invoice_id"
                name="invoice_id"
                value={formData?.invoice_id || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                placeholder="No. Faktur (akan diintegrasikan nanti)"
              />
            </div>

            <div>
              <label htmlFor="operator_id" className="block text-sm font-medium text-gray-700 mb-1">
                Operator
              </label>
              <select
                id="operator_id"
                name="operator_id"
                value={formData?.operator_id || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              >
                <option value="">Pilih Operator</option>
                {operatorOptions.map(op => (
                  <option key={op.id} value={op.id}>{op.first_name} {op.last_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bahan_id" className="block text-sm font-medium text-gray-700 mb-1">
                Kode Bahan
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  id="bahan_id_display"
                  value={formData?.bahan?.id || ''}
                  disabled
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                  placeholder="Pilih Bahan..."
                />
                {mode !== 'view' && (
                  <button
                    type="button"
                    onClick={() => setShowSelectBahanModal(true)}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Bahan
              </label>
              <input
                type="text"
                value={formData?.bahan?.nama || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Satuan
              </label>
              <input
                type="text"
                value={formData?.bahan?.satuan?.nama || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
              />
            </div>

            <div>
              <label htmlFor="jumlah" className="block text-sm font-medium text-gray-700 mb-1">
                Qty
              </label>
              <input
                type="number"
                id="jumlah"
                name="jumlah"
                value={formData?.jumlah || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ukuran (P x L)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  id="ukuran_panjang_keluar"
                  name="ukuran_panjang_keluar"
                  value={formData?.ukuran_panjang_keluar || ''}
                  onChange={handleChange}
                  disabled={mode === 'view'}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  placeholder="Panjang"
                />
                <span className="flex items-center text-gray-500">X</span>
                <input
                  type="number"
                  id="ukuran_lebar_keluar"
                  name="ukuran_lebar_keluar"
                  value={formData?.ukuran_lebar_keluar || ''}
                  onChange={handleChange}
                  disabled={mode === 'view'}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  placeholder="Lebar"
                />
              </div>
            </div>

            {mode === 'view' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dicatat Oleh
                </label>
                <input
                  type="text"
                  value={formData.profiles_dicatat_oleh ? `${formData.profiles_dicatat_oleh.first_name} ${formData.profiles_dicatat_oleh.last_name || ''}` : 'N/A'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {mode === 'view' ? 'Tutup' : 'Batal'}
            </button>
            {mode !== 'view' && (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {mode === 'add' ? 'Tambah' : 'Simpan'}
              </button>
            )}
          </div>
        </form>
      </div>
      {showSelectBahanModal && (
        <SelectBahanModal
          onClose={() => setShowSelectBahanModal(false)}
          onSelectBahan={onSelectBahan}
        />
      )}
    </div>
  );
};

export default BahanKeluarFormModal;