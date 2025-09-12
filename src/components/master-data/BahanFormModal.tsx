import React from 'react';
import { Plus } from 'lucide-react';

// Define interfaces (can be imported from a shared types file if available)
interface SatuanOption {
  id: string;
  nama: string;
}

interface SupplierOption {
  id: string;
  nama: string;
  jenis_supplier: string;
}

interface BahanItem {
  id: string;
  nama: string;
  satuan_id: string | null;
  satuan: { nama: string } | null;
  isi: number;
  ukuran_panjang: number;
  ukuran_lebar: number;
  harga_beli: number;
  stok: number;
  supplier_id: string | null;
  supplier: { nama: string; jenis_supplier: string } | null;
}

interface BahanFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'view';
  item: Partial<BahanItem>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  satuanOptions: SatuanOption[];
  supplierOptions: SupplierOption[];
  onShowAddSatuanModal: () => void;
  onShowAddSupplierModal: () => void;
}

const BahanFormModal: React.FC<BahanFormModalProps> = ({
  isOpen,
  mode,
  item,
  onClose,
  onSubmit,
  onChange,
  satuanOptions,
  supplierOptions,
  onShowAddSatuanModal,
  onShowAddSupplierModal,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {mode === 'add' ? 'Tambah Bahan' :
             mode === 'edit' ? 'Edit Bahan' : 'Detail Bahan'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
                ID Kode Bahan
              </label>
              <input
                type="text"
                id="id"
                name="id"
                value={item?.id || ''}
                onChange={onChange}
                disabled={mode === 'view' || mode === 'edit'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>
            <div>
              <label htmlFor="nama" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Bahan
              </label>
              <input
                type="text"
                id="nama"
                name="nama"
                value={item?.nama || ''}
                onChange={onChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>
            
            <div>
              <label htmlFor="satuan_id" className="block text-sm font-medium text-gray-700 mb-1">
                Satuan
              </label>
              <div className="flex items-center space-x-2">
                <select
                  id="satuan_id"
                  name="satuan_id"
                  value={item?.satuan_id || ''}
                  onChange={onChange}
                  disabled={mode === 'view'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  required
                >
                  <option value="">Pilih Satuan</option>
                  {satuanOptions.map(satuan => (
                    <option key={satuan.id} value={satuan.id}>{satuan.nama}</option>
                  ))}
                </select>
                {mode !== 'view' && (
                  <button
                    type="button"
                    onClick={onShowAddSatuanModal}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="isi" className="block text-sm font-medium text-gray-700 mb-1">
                Isi
              </label>
              <input
                type="number"
                id="isi"
                name="isi"
                value={item?.isi || ''}
                onChange={onChange}
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
                  id="ukuran_panjang"
                  name="ukuran_panjang"
                  value={item?.ukuran_panjang || ''}
                  onChange={onChange}
                  disabled={mode === 'view'}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  placeholder="Panjang"
                  required
                />
                <span className="flex items-center text-gray-500">X</span>
                <input
                  type="number"
                  id="ukuran_lebar"
                  name="ukuran_lebar"
                  value={item?.ukuran_lebar || ''}
                  onChange={onChange}
                  disabled={mode === 'view'}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  placeholder="Lebar"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="harga_beli" className="block text-sm font-medium text-gray-700 mb-1">
                Harga Beli
              </label>
              <input
                type="number"
                id="harga_beli"
                name="harga_beli"
                value={item?.harga_beli || ''}
                onChange={onChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>

            <div>
              <label htmlFor="stok" className="block text-sm font-medium text-gray-700 mb-1">
                Stok
              </label>
              <input
                type="number"
                id="stok"
                name="stok"
                value={item?.stok || ''}
                onChange={onChange}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                required
              />
            </div>

            <div>
              <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <div className="flex items-center space-x-2">
                <select
                  id="supplier_id"
                  name="supplier_id"
                  value={item?.supplier_id || ''}
                  onChange={onChange}
                  disabled={mode === 'view'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  required
                >
                  <option value="">Pilih Supplier</option>
                  {supplierOptions.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.jenis_supplier} - {supplier.nama}
                    </option>
                  ))}
                </select>
                {mode !== 'view' && (
                  <button
                    type="button"
                    onClick={onShowAddSupplierModal}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
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

export default BahanFormModal;