import React from 'react';
import { Plus, Search } from 'lucide-react';

interface Product {
  id: string;
  nama_produk: string;
  kategori: { nama: string } | null;
  satuan: { nama: string } | null;
  bahan: { id: string; nama: string; ukuran_panjang: number | null; ukuran_lebar: number | null } | null; // Added 'id' to bahan
  quantity_bahan: number;
  use_mesin: boolean;
  mesin: { nama: string } | null;
  harga_pokok: number;
  harga_jual_umum: number;
  harga_jual_khusus: number;
  stok: number;
  barcode_1: string;
  barcode_2: string;
  keterangan: string;
  diskon_persen: number;
  template_order: string;
  grosir_prices: any;
  member_prices: any;
}

interface ProductInputFormProps {
  selectedProduct: Product | null;
  itemQuantity: number;
  setItemQuantity: (qty: number) => void;
  itemNotes: string;
  setItemNotes: (notes: string) => void;
  // Updated type for itemDimensions to include tebal_bahan_id and tebal_bahan_nama
  itemDimensions: { panjang?: number; lebar?: number; satuan?: string; tebal_bahan_id?: string; tebal_bahan_nama?: string };
  // Updated setItemDimensions type to match the full state setter type
  setItemDimensions: (dims: { panjang?: number; lebar?: number; satuan?: string; tebal_bahan_id?: string; tebal_bahan_nama?: string }) => void;
  itemDiscount: number;
  setItemDiscount: (discount: number) => void;
  onSelectProductClick: () => void;
  onAddItemToOrder: () => void;
  onOpenProductDetailModal: () => void; // New prop for opening detail modal
}

const ProductInputForm: React.FC<ProductInputFormProps> = ({
  selectedProduct,
  itemQuantity,
  setItemQuantity,
  itemNotes,
  setItemNotes,
  itemDimensions,
  setItemDimensions,
  itemDiscount,
  setItemDiscount,
  onSelectProductClick,
  onAddItemToOrder,
  onOpenProductDetailModal, // Destructure new prop
}) => {
  // Removed unused type alias ItemDimensionsState

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex-shrink-0">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Input Produk</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
            Kode Produk
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="product_id"
              value={selectedProduct?.id || ''}
              disabled
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
              placeholder="Pilih produk..."
            />
            <button
              type="button"
              onClick={onSelectProductClick}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="product_name_display" className="block text-sm font-medium text-gray-700 mb-1">
            Nama Produk
          </label>
          <input
            type="text"
            id="product_name_display"
            value={selectedProduct?.nama_produk || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="satuan_display" className="block text-sm font-medium text-gray-700 mb-1">
              Satuan
            </label>
            <input
              type="text"
              id="satuan_display"
              value={selectedProduct?.satuan?.nama || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="bahan_display" className="block text-sm font-medium text-gray-700 mb-1">
              Bahan
            </label>
            <input
              type="text"
              id="bahan_display"
              value={selectedProduct?.bahan?.nama || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="dim_panjang" className="block text-sm font-medium text-gray-700 mb-1">
              P
            </label>
            <input
              type="number"
              id="dim_panjang"
              value={itemDimensions.panjang || ''}
              onChange={(e) => setItemDimensions({ ...itemDimensions, panjang: parseFloat(e.target.value) || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="dim_lebar" className="block text-sm font-medium text-gray-700 mb-1">
              L
            </label>
            <input
              type="number"
              id="dim_lebar"
              value={itemDimensions.lebar || ''}
              onChange={(e) => setItemDimensions({ ...itemDimensions, lebar: parseFloat(e.target.value) || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="dim_satuan" className="block text-sm font-medium text-gray-700 mb-1">
              Satuan Dimensi
            </label>
            <select
              id="dim_satuan"
              value={itemDimensions.satuan || 'M'} // Changed default to 'M'
              onChange={(e) => setItemDimensions({ ...itemDimensions, satuan: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="M">M</option>
              <option value="CM">CM</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="item_notes" className="block text-sm font-medium text-gray-700 mb-1">
            Keterangan Item
          </label>
          <textarea
            id="item_notes"
            rows={2}
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Catatan spesifik untuk item ini"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="item_quantity" className="block text-sm font-medium text-gray-700 mb-1">
              QTY
            </label>
            <input
              type="number"
              id="item_quantity"
              value={itemQuantity}
              onChange={(e) => setItemQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
            />
          </div>
          <div>
            <label htmlFor="item_discount" className="block text-sm font-medium text-gray-700 mb-1">
              Diskon Item (Rp)
            </label>
            <input
              type="number"
              id="item_discount"
              value={itemDiscount}
              onChange={(e) => setItemDiscount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenProductDetailModal} // Button to open the detail modal
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          disabled={!selectedProduct} // Disable if no product is selected
        >
          <Search className="h-5 w-5 mr-2" />
          Detail Produk
        </button>
        <button
          type="button"
          onClick={onAddItemToOrder}
          className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Ke Keranjang
        </button>
      </div>
    </div>
  );
};

export default ProductInputForm;