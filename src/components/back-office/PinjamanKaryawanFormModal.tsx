import React, { useState, useEffect } from 'react';
import { PinjamanKaryawanItem } from '../../hooks/usePinjamanKaryawanData';

interface PinjamanKaryawanFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'view';
  item: Partial<PinjamanKaryawanItem>;
  onClose: () => void;
  onSubmit: (formData: Partial<PinjamanKaryawanItem>) => void;
  karyawanOptions: { id: string; first_name: string; last_name: string }[];
  bankOptions: { id: string; nama_bank: string; rekening: string; nama_akun: string; charge: number }[]; // New prop
}

const PinjamanKaryawanFormModal: React.FC<PinjamanKaryawanFormModalProps> = ({
  isOpen,
  mode,
  item,
  onClose,
  onSubmit,
  karyawanOptions,
  bankOptions, // Destructure new prop
}) => {
  const [formData, setFormData] = useState<Partial<PinjamanKaryawanItem>>(item);

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
            {mode === 'add' ? 'Tambah Pinjaman Karyawan' :
             mode === 'edit' ? 'Edit Pinjaman Karyawan' : 'Detail Pinjaman Karyawan'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="tanggal_pinjam" className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Pinjam
              </label>
              <input
                type="date"
                id="tanggal_pinjam"
                name="tanggal_pinjam"
                value={formData?.tanggal_pinjam || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>
            
            <div>
              <label htmlFor="karyawan_id" className="block text-sm font-medium text-gray-700 mb-1">
                Karyawan
              </label>
              <select
                id="karyawan_id"
                name="karyawan_id"
                value={formData?.karyawan_id || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              >
                <option value="">Pilih Karyawan</option>
                {karyawanOptions.map(karyawan => (
                  <option key={karyawan.id} value={karyawan.id}>{karyawan.first_name} {karyawan.last_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="jumlah_pinjaman" className="block text-sm font-medium text-gray-700 mb-1">
                Jumlah Pinjaman
              </label>
              <input
                type="number"
                id="jumlah_pinjaman"
                name="jumlah_pinjaman"
                value={formData?.jumlah_pinjaman || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>

            <div>
              <label htmlFor="jatuh_tempo" className="block text-sm font-medium text-gray-700 mb-1">
                Jatuh Tempo
              </label>
              <input
                type="date"
                id="jatuh_tempo"
                name="jatuh_tempo"
                value={formData?.jatuh_tempo || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData?.status || 'active'}
                onChange={handleChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              >
                <option value="active">Aktif</option>
                <option value="completed">Lunas</option>
                <option value="defaulted">Macet</option>
              </select>
            </div>

            {/* New: Payment Method */}
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

            {/* New: Bank Selection if payment_method is bank_transfer */}
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

            <div>
              <label htmlFor="keterangan" className="block text-sm font-medium text-gray-700 mb-1">
                Keterangan
              </label>
              <textarea
                id="keterangan"
                name="keterangan"
                value={formData?.keterangan || ''}
                onChange={handleChange}
                disabled={mode === 'view'}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              ></textarea>
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
    </div>
  );
};

export default PinjamanKaryawanFormModal;