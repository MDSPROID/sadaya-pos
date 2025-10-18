import React from 'react';
import { Plus } from 'lucide-react';
import { ProdukItem, KategoriOption, SatuanOption, BahanOption, MesinOption } from '../../../hooks/useProdukData';
import { ModalMode } from '../../../hooks/useProdukForm';

interface ProdukFormTabProps {
  selectedItem: Partial<ProdukItem>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  modalMode: ModalMode;
  kategoriOptions: KategoriOption[];
  satuanOptions: SatuanOption[];
  bahanOptions: BahanOption[];
  mesinOptions: MesinOption[];
  onKategoriQuickAdd: () => void;
  onSatuanQuickAdd: () => void;
  onBahanQuickAdd: () => void;
  onMesinQuickAdd: () => void;
  setSelectedItem: React.Dispatch<React.SetStateAction<Partial<ProdukItem>>>; // Needed for use_bahan checkbox
}

const ProdukFormTab: React.FC<ProdukFormTabProps> = ({
  selectedItem,
  handleChange,
  modalMode,
  kategoriOptions,
  satuanOptions,
  bahanOptions,
  mesinOptions,
  onKategoriQuickAdd,
  onSatuanQuickAdd,
  onBahanQuickAdd,
  onMesinQuickAdd,
  setSelectedItem,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
          ID
        </label>
        <input
          type="text"
          id="id"
          name="id"
          value={selectedItem?.id || ''}
          onChange={handleChange}
          disabled={modalMode === 'view' || modalMode === 'edit'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          required
        />
      </div>
      <div>
        <label htmlFor="nama_produk" className="block text-sm font-medium text-gray-700 mb-1">
          Nama Produk
        </label>
        <input
          type="text"
          id="nama_produk"
          name="nama_produk"
          value={selectedItem?.nama_produk || ''}
          onChange={handleChange}
          disabled={modalMode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          required
        />
      </div>

      <div>
        <label htmlFor="kategori_id" className="block text-sm font-medium text-gray-700 mb-1">
          Kategori
        </label>
        <div className="flex items-center space-x-2">
          <select
            id="kategori_id"
            name="kategori_id"
            value={selectedItem?.kategori_id || ''}
            onChange={handleChange}
            disabled={modalMode === 'view'}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            required
          >
            <option value="">Pilih Kategori</option>
            {kategoriOptions.map(kategori => (
              <option key={kategori.id} value={kategori.id}>{kategori.nama}</option>
            ))}
          </select>
          {modalMode !== 'view' && (
            <button
              type="button"
              onClick={onKategoriQuickAdd}
              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="satuan_id" className="block text-sm font-medium text-gray-700 mb-1">
          Satuan
        </label>
        <div className="flex items-center space-x-2">
          <select
            id="satuan_id"
            name="satuan_id"
            value={selectedItem?.satuan_id || ''}
            onChange={handleChange}
            disabled={modalMode === 'view'}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            required
          >
            <option value="">Pilih Satuan</option>
            {satuanOptions.map(satuan => (
              <option key={satuan.id} value={satuan.id}>{satuan.nama}</option>
            ))}
          </select>
          {modalMode !== 'view' && (
            <button
              type="button"
              onClick={onSatuanQuickAdd}
              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="col-span-2">
        <div className="flex items-center space-x-2 mb-1">
          <input
            type="checkbox"
            id="use_bahan"
            name="use_bahan"
            checked={!!selectedItem?.bahan_id}
            onChange={(e) => setSelectedItem(prev => ({ ...prev, bahan_id: e.target.checked ? (bahanOptions[0]?.id || '') : null }))}
            disabled={modalMode === 'view'}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="use_bahan" className="block text-sm font-medium text-gray-700">
            Bahan
          </label>
        </div>
        {selectedItem?.bahan_id && (
          <div className="flex items-center space-x-2">
            <select
              id="bahan_id"
              name="bahan_id"
              value={selectedItem?.bahan_id || ''}
              onChange={handleChange}
              disabled={modalMode === 'view'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              required
            >
              <option value="">Pilih Bahan</option>
              {bahanOptions.map(bahan => (
                <option key={bahan.id} value={bahan.id}>{bahan.nama}</option>
              ))}
            </select>
            {modalMode !== 'view' && (
              <button
                type="button"
                onClick={onBahanQuickAdd}
                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="quantity_bahan" className="block text-sm font-medium text-gray-700 mb-1">
          Bagian dari Bahan
        </label>
        <input
          type="number"
          id="quantity_bahan"
          name="quantity_bahan"
          value={selectedItem?.quantity_bahan || ''}
          onChange={handleChange}
          disabled={modalMode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
        />
      </div>

      <div className="col-span-2">
        <div className="flex items-center space-x-2 mb-1">
          <input
            type="checkbox"
            id="use_mesin"
            name="use_mesin"
            checked={selectedItem?.use_mesin || false}
            onChange={handleChange}
            disabled={modalMode === 'view'}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="use_mesin" className="block text-sm font-medium text-gray-700">
            Mesin
          </label>
        </div>
        {selectedItem?.use_mesin && (
          <div className="flex items-center space-x-2">
            <select
              id="mesin_id"
              name="mesin_id"
              value={selectedItem?.mesin_id || ''}
              onChange={handleChange}
              disabled={modalMode === 'view'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              required
            >
              <option value="">Pilih Mesin</option>
              {mesinOptions.map(mesin => (
                <option key={mesin.id} value={mesin.id}>{mesin.nama}</option>
              ))}
            </select>
            {modalMode !== 'view' && (
              <button
                type="button"
                onClick={onMesinQuickAdd}
                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="harga_pokok" className="block text-sm font-medium text-gray-700 mb-1">
          Harga Pokok
        </label>
        <input
          type="number"
          id="harga_pokok"
          name="harga_pokok"
          value={selectedItem?.harga_pokok || ''}
          onChange={handleChange}
          disabled={modalMode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
        />
      </div>
      <div>
        <label htmlFor="stok" className="block text-sm font-medium text-gray-700 mb-1">
          Stok {selectedItem.bahan_id && (
            <span className="mt-1 text-xs text-gray-500">
              {selectedItem.bahan_id && (
                <>(Stok mengikuti bahan: {selectedItem.bahan?.nama ?? ''})</>
              )}
            </span>
          )}
        </label>
        <input
          type="number"
          id="stok"
          name="stok"
          value={selectedItem?.stok || ''}
          onChange={handleChange}
          readOnly={Boolean(selectedItem.bahan_id)}
          // disabled={modalMode === 'view'}
          onClick={() => {
            if (selectedItem.bahan_id) {
              window.alert(
                'Stok produk ini mengikuti stok Bahan yang dipilih.\n' +
                'Jika ingin mengubah stok, silakan ke menu Bahan.'
              );
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
        />
      </div>

      <div>
        <label htmlFor="harga_jual_umum" className="block text-sm font-medium text-gray-700 mb-1">
          Harga Jual (Umum)
        </label>
        <input
          type="number"
          id="harga_jual_umum"
          name="harga_jual_umum"
          value={selectedItem?.harga_jual_umum || ''}
          onChange={handleChange}
          disabled={modalMode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
        />
      </div>
      <div>
        <label htmlFor="barcode_1" className="block text-sm font-medium text-gray-700 mb-1">
          Barcode 1
        </label>
        <input
          type="text"
          id="barcode_1"
          name="barcode_1"
          value={selectedItem?.barcode_1 || ''}
          onChange={handleChange}
          disabled={modalMode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
        />
      </div>

      <div>
        <label htmlFor="harga_jual_khusus" className="block text-sm font-medium text-gray-700 mb-1">
          Harga Jual (Khusus)
        </label>
        <input
          type="number"
          id="harga_jual_khusus"
          name="harga_jual_khusus"
          value={selectedItem?.harga_jual_khusus || ''}
          onChange={handleChange}
          disabled={modalMode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
        />
      </div>
      <div>
        <label htmlFor="barcode_2" className="block text-sm font-medium text-gray-700 mb-1">
          Barcode 2
        </label>
        <input
          type="text"
          id="barcode_2"
          name="barcode_2"
          value={selectedItem?.barcode_2 || ''}
          onChange={handleChange}
          disabled={modalMode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
        />
      </div>

      <div className="col-span-2">
        <label htmlFor="keterangan" className="block text-sm font-medium text-gray-700 mb-1">
          Keterangan
        </label>
        <textarea
          id="keterangan"
          name="keterangan"
          rows={3}
          value={selectedItem?.keterangan || ''}
          onChange={handleChange}
          disabled={modalMode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
        />
      </div>

      <div>
        <label htmlFor="diskon_persen" className="block text-sm font-medium text-gray-700 mb-1">
          Diskon (%)
        </label>
        <input
          type="number"
          id="diskon_persen"
          name="diskon_persen"
          value={selectedItem?.diskon_persen || ''}
          onChange={handleChange}
          disabled={modalMode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
        />
      </div>
      <div>
        <label htmlFor="template_order" className="block text-sm font-medium text-gray-700 mb-1">
          Template Order
        </label>
        <select
          id="template_order"
          name="template_order"
          value={selectedItem?.template_order || ''}
          onChange={handleChange}
          disabled={modalMode === 'view'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
        >
          <option value="">Pilih Template</option>
          <option value="Cetak offset">Cetak offset</option>
          <option value="Cetak Outdoor">Cetak Outdoor</option>
          <option value="Acrylic">Acrylic</option>
          <option value="Jasa Potong">Jasa Potong</option>
          <option value="Lain-lain">Lain-lain</option>
        </select>
      </div>
    </div>
  );
};

export default ProdukFormTab;