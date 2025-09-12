import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Product {
  id: string;
  nama_produk: string;
  kategori: { nama: string } | null;
  satuan: { nama: string } | null;
  bahan: { id: string; nama: string; ukuran_panjang: number | null; ukuran_lebar: number | null } | null;
  harga_jual_umum: number;
}

interface AdditionalOption {
  id: string;
  name: string;
  cost: number;
  quantity: number;
  selected: boolean;
}

interface FinishingOption {
  id: string;
  nama: string;
  harga: number;
}

interface BahanOption {
  id: string;
  nama: string;
  ukuran_panjang: number | null;
  ukuran_lebar: number | null;
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  initialQuantity: number;
  initialDimensions: { panjang?: number; lebar?: number; satuan?: string; tebal_bahan_id?: string; tebal_bahan_nama?: string; additional_options?: AdditionalOption[] };
  initialAdditionalOptions: AdditionalOption[]; // Added this line
  finishingOptions: FinishingOption[];
  bahanOptions: BahanOption[];
  onSave: (
    quantity: number,
    dimensions: { panjang?: number; lebar?: number; satuan?: string; tebal_bahan_id?: string; tebal_bahan_nama?: string },
    additionalOptions: AdditionalOption[]
  ) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  initialQuantity,
  initialDimensions,
  initialAdditionalOptions, // Destructure new prop
  finishingOptions,
  bahanOptions,
  onSave,
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [dimensions, setDimensions] = useState(initialDimensions);
  const [additionalOptions, setAdditionalOptions] = useState<AdditionalOption[]>([]);

  useEffect(() => {
    setQuantity(initialQuantity);
    setDimensions(initialDimensions);

    const newAdditionalOptions: AdditionalOption[] = finishingOptions.map(finishing => {
      const existingOption = initialAdditionalOptions?.find(opt => opt.id === finishing.id); // Use initialAdditionalOptions
      return {
        id: finishing.id,
        name: finishing.nama,
        cost: finishing.harga,
        quantity: existingOption ? existingOption.quantity : 1,
        selected: !!existingOption,
      };
    });
    setAdditionalOptions(newAdditionalOptions);

  }, [isOpen, product, initialQuantity, initialDimensions, initialAdditionalOptions, finishingOptions]); // Add initialAdditionalOptions to dependencies

  const handleDimensionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDimensions(prev => ({ ...prev, [name]: parseFloat(value) || value }));
  };

  const handleBahanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBahanId = e.target.value;
    const selectedBahan = bahanOptions.find(b => b.id === selectedBahanId);
    setDimensions(prev => ({
      ...prev,
      tebal_bahan_id: selectedBahanId,
      tebal_bahan_nama: selectedBahan?.nama || undefined,
      panjang: selectedBahan?.ukuran_panjang || prev.panjang,
      lebar: selectedBahan?.ukuran_lebar || prev.lebar,
    }));
  };

  const handleAdditionalOptionChange = (id: string, field: 'selected' | 'quantity', value: boolean | number) => {
    setAdditionalOptions(prev =>
      prev.map(opt =>
        opt.id === id
          ? { ...opt, [field]: value }
          : opt
      )
    );
  };

  const handleSave = () => {
    const filteredAdditionalOptions = additionalOptions.filter(opt => opt.selected && opt.quantity > 0);
    onSave(quantity, dimensions, filteredAdditionalOptions);
  };

  if (!isOpen) return null;

  const modalTitle = product.kategori?.nama === 'Cetak Outdoor' ? 'Detail Order Outdoor' : `Detail Produk: ${product.nama_produk}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900">
          <X className="h-6 w-6" />
        </button>
        <h3 className="text-2xl font-semibold mb-4 text-gray-900">{modalTitle}</h3>

        <div className="space-y-4">
          {/* Bahan (Dropdown) */}
          <div>
            <label htmlFor="bahan_select" className="block text-sm font-medium text-gray-700 mb-1">
              *Bahan
            </label>
            <select
              id="bahan_select"
              name="tebal_bahan_id"
              value={dimensions.tebal_bahan_id || ''}
              onChange={handleBahanChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih Bahan</option>
              {bahanOptions.map(bahan => (
                <option key={bahan.id} value={bahan.id}>
                  {bahan.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Dimensions (PxL) */}
          <div className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="panjang" className="block text-sm font-medium text-gray-700 mb-1">
                *Ukuran (PxL)
              </label>
              <input
                type="number"
                id="panjang"
                name="panjang"
                value={dimensions.panjang || ''}
                onChange={handleDimensionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-500 text-xl">X</span>
            </div>
            <div>
              <input
                type="number"
                id="lebar"
                name="lebar"
                value={dimensions.lebar || ''}
                onChange={handleDimensionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Tebal Bahan (Editable Text Input) */}
          <div>
            <label htmlFor="tebal_bahan_input" className="block text-sm font-medium text-gray-700 mb-1">
              Tebal Bahan
            </label>
            <input
              type="text"
              id="tebal_bahan_input"
              value={dimensions.tebal_bahan_nama || ''}
              onChange={(e) => setDimensions(prev => ({ ...prev, tebal_bahan_nama: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Additional Options (Finishing) as a table */}
          {finishingOptions.length > 0 && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Opsi Tambahan</h4>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biaya</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banyaknya</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pilih</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {additionalOptions.map((option, index) => {
                      return (
                        <tr key={option.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{option.name}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">Rp {option.cost.toLocaleString('id-ID')}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            <input
                              type="number"
                              value={option.quantity}
                              onChange={(e) => handleAdditionalOptionChange(option.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                              min="0"
                              disabled={!option.selected}
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-center">
                            <input
                              type="checkbox"
                              checked={option.selected}
                              onChange={(e) => handleAdditionalOptionChange(option.id, 'selected', e.target.checked)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quantity (Jumlah) - moved to bottom */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Jumlah
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
        </div>

        {/* Save and Cancel Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;