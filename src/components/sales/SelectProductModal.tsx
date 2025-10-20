import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface Product {
  id: string;
  nama_produk: string;
  kategori: { nama: string } | null;
  satuan: { nama: string } | null;
  bahan: { id: string; nama: string; stok: number; ukuran_panjang: number | null; ukuran_lebar: number | null } | null; // Added 'id' to bahan
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

interface SelectProductModalProps {
  onClose: () => void;
  onSelect: (product: Product) => void;
  productOptions: Product[];
}

const SelectProductModal: React.FC<SelectProductModalProps> = ({ onClose, onSelect, productOptions }) => {
  const [productSearchTerm, setProductSearchTerm] = useState('');

  const filteredProducts = productOptions.filter(p =>
    p.nama_produk.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.barcode_1?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.barcode_2?.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const handleSelect = (product: Product) => {
    onSelect(product);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold mb-4">Pilih Produk</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari produk (nama, kode, barcode)..."
            value={productSearchTerm}
            onChange={(e) => setProductSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Produk</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Jual</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-center text-sm text-gray-500">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  // Pakai stok bahan jika produk punya bahan_id (p.bahan?.id ada). Jika tidak, pakai stok produk.
                  const displayedStock =
                    p.bahan?.id ? Number(p.bahan?.stok ?? 0) : Number(p.stok ?? 0);

                  const stockNote = p.bahan?.id
                    ? `(Stok mengikuti bahan: ${p.bahan?.nama || '-'})`
                    : ''; // kosong kalau tidak pakai bahan

                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {p.id}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span>{p.nama_produk}</span>
                          {/* onSavePending} */}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        Rp {Number(p.harga_jual_umum || 0).toLocaleString('id-ID')}
                      </td>
                      <td
                        className="px-4 py-2 whitespace-nowrap text-sm text-gray-900"
                        title={p.bahan?.id ? 'Pakai stok bahan' : 'Pakai stok produk'}
                      >
                        {displayedStock}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleSelect(p)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Tutup</button>
        </div>
      </div>
    </div>
  );
};

export default SelectProductModal;