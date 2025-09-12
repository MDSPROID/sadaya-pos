import React from 'react';
import { ProdukItem } from '../../../hooks/useProdukData';
import { ModalMode } from '../../../hooks/useProdukForm';

interface HargaGrosirTabProps {
  selectedItem: Partial<ProdukItem>;
  handleGrosirChange: (satuanType: 'satuan1' | 'satuan2', field: string, value: any, index?: number) => void;
  modalMode: ModalMode;
}

const HargaGrosirTab: React.FC<HargaGrosirTabProps> = ({
  selectedItem,
  handleGrosirChange,
  modalMode,
}) => {
  return (
    <div className="space-y-6">
      {/* Harga Grosir Satuan 1 */}
      <div className="border p-4 rounded-lg bg-gray-50">
        <h4 className="text-md font-semibold mb-3">Harga Grosir Satuan 1</h4>
        <div className="flex items-center space-x-4 mb-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="satuan1_status"
              value="Aktif"
              checked={selectedItem?.grosir_prices?.satuan1?.active || false}
              onChange={() => handleGrosirChange('satuan1', 'active', true)}
              disabled={modalMode === 'view'}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Aktif</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="satuan1_status"
              value="Non Aktif"
              checked={!selectedItem?.grosir_prices?.satuan1?.active || false}
              onChange={() => handleGrosirChange('satuan1', 'active', false)}
              disabled={modalMode === 'view'}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Non Aktif</span>
          </label>
        </div>
        {(selectedItem?.grosir_prices?.satuan1?.active || false) && (
          <div className="space-y-3">
            {selectedItem?.grosir_prices?.satuan1?.tiers.map((tier, index) => (
              <div key={index} className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-24">Jumlah Beli {index + 1}:</label>
                <input
                  type="number"
                  value={tier.qty}
                  onChange={(e) => handleGrosirChange('satuan1', 'qty', e.target.value, index)}
                  disabled={modalMode === 'view'}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-lg disabled:bg-gray-50"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={tier.price}
                  onChange={(e) => handleGrosirChange('satuan1', 'price', e.target.value, index)}
                  disabled={modalMode === 'view'}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-lg disabled:bg-gray-50"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Harga Grosir Satuan 2 */}
      <div className="border p-4 rounded-lg bg-gray-50">
        <h4 className="text-md font-semibold mb-3">Harga Grosir Satuan 2</h4>
        <div className="flex items-center space-x-4 mb-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="satuan2_status"
              value="Aktif"
              checked={selectedItem?.grosir_prices?.satuan2?.active || false}
              onChange={() => handleGrosirChange('satuan2', 'active', true)}
              disabled={modalMode === 'view'}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Aktif</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="satuan2_status"
              value="Non Aktif"
              checked={!selectedItem?.grosir_prices?.satuan2?.active || false}
              onChange={() => handleGrosirChange('satuan2', 'active', false)}
              disabled={modalMode === 'view'}
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Non Aktif</span>
          </label>
        </div>
        {(selectedItem?.grosir_prices?.satuan2?.active || false) && (
          <div className="space-y-3">
            {selectedItem?.grosir_prices?.satuan2?.tiers.map((tier, index) => (
              <div key={index} className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-24">Jumlah Beli {index + 1}:</label>
                <input
                  type="number"
                  value={tier.qty}
                  onChange={(e) => handleGrosirChange('satuan2', 'qty', e.target.value, index)}
                  disabled={modalMode === 'view'}
                  className="w-24 px-2 py-1 border border-gray-300 rounded-lg disabled:bg-gray-50"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  value={tier.price}
                  onChange={(e) => handleGrosirChange('satuan2', 'price', e.target.value, index)}
                  disabled={modalMode === 'view'}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-lg disabled:bg-gray-50"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HargaGrosirTab;