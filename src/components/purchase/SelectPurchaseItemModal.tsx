import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Product, Bahan } from '../../types/purchaseOrderTypes';

interface SelectPurchaseItemModalProps {
  onClose: () => void;
  onSelect: (item: Product | Bahan, type: 'produk' | 'bahan') => void;
  productOptions: Product[];
  bahanOptions: Bahan[];
}

const SelectPurchaseItemModal: React.FC<SelectPurchaseItemModalProps> = ({ onClose, onSelect, productOptions, bahanOptions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'produk' | 'bahan'>('produk');

  const filteredProducts = productOptions.filter(p =>
    p.nama_produk.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBahans = bahanOptions.filter(b =>
    b.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (item: Product | Bahan, type: 'produk' | 'bahan') => {
    onSelect(item, type);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-semibold mb-4">Pilih Produk atau Bahan</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari item (nama, kode)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Tabs for Produk / Bahan */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('produk')}
              className={`
                ${activeTab === 'produk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
              `}
            >
              Produk
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bahan')}
              className={`
                ${activeTab === 'bahan'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
              `}
            >
              Bahan
            </button>
          </nav>
        </div>

        {/* Table Content based on activeTab */}
        <div className="overflow-x-auto max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Beli/Pokok</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeTab === 'produk' && (
                filteredProducts.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-2 text-center text-sm text-gray-500">Tidak ada produk ditemukan.</td></tr>
                ) : (
                  filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{p.id}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{p.nama_produk}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{p.stok}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">Rp {p.harga_pokok.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleSelect(p, 'produk')} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs">Pilih</button>
                      </td>
                    </tr>
                  ))
                )
              )}
              {activeTab === 'bahan' && (
                filteredBahans.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-2 text-center text-sm text-gray-500">Tidak ada bahan ditemukan.</td></tr>
                ) : (
                  filteredBahans.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{b.id}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{b.nama}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{b.stok}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">Rp {b.harga_beli.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleSelect(b, 'bahan')} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs">Pilih</button>
                      </td>
                    </tr>
                  ))
                )
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

export default SelectPurchaseItemModal;