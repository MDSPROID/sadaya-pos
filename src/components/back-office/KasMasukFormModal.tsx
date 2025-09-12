import React, { useState, useEffect } from 'react';
import { KasMasukItem } from '../../hooks/useKasMasukData';

interface BankOption {
  id: string;
  nama_bank: string;
  rekening: string;
  nama_akun: string;
  charge: number;
}

interface KasMasukFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'view';
  item: Partial<KasMasukItem>;
  onClose: () => void;
  onSubmit: (formData: Partial<KasMasukItem>) => void;
  bankOptions: BankOption[];
}

const KasMasukFormModal: React.FC<KasMasukFormModalProps> = ({
  isOpen,
  mode,
  item,
  onClose,
  onSubmit,
  bankOptions,
}) => {
  const [formData, setFormData] = useState<Partial<KasMasukItem>>(item);

  useEffect(() => {
    setFormData(item);
  }, [item]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
            {mode === 'add' ? 'Tambah Pemasukan' :
             mode === 'edit' ? 'Edit Pemasukan' : 'Detail Pemasukan'}
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
              <label htmlFor="nama_pemasukan" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Pemasukan
              </label>
              <input
                type="text"
                id="nama_pemasukan"
                name="nama_pemasukan"
                value={formData?.nama_pemasukan || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>

            <div>
              <label htmlFor="jumlah" className="block text-sm font-medium text-gray-700 mb-1">
                Jumlah
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
              <label htmlFor="keterangan" className="block text-sm font-medium text-gray-700 mb-1">
                Keterangan
              </label>
              <textarea
                id="keterangan"
                name="keterangan"
                rows={3}
                value={formData?.keterangan || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                id="payment_method"
                name="payment_method"
                value={formData?.payment_method || 'cash'}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              >
                <option value="cash">Tunai</option>
                <option value="bank_transfer">Transfer Bank</option>
              </select>
            </div>

            {/* Bank Selection if payment_method is bank_transfer */}
            {formData.payment_method === 'bank_transfer' && (
              <div>
                <label htmlFor="bank_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Bank
                </label>
                <select
                  id="bank_id"
                  name="bank_id"
                  value={formData?.bank_id || ''}
                  onChange={handleChange}
                  disabled={mode === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  required
                >
                  <option value="">Pilih Bank</option>
                  {bankOptions.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.nama_bank} ({bank.rekening})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === 'view' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Petugas
                </label>
                <input
                  type="text"
                  value={formData.profiles ? `${formData.profiles.first_name} ${formData.profiles.last_name || ''}` : 'N/A'}
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
    </div>
  );
};

export default KasMasukFormModal;