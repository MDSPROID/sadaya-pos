import React from 'react';
import { Trash2 } from 'lucide-react';
import { ProdukItem, JenisMemberOption } from '../../../hooks/useProdukData';
import { ModalMode } from '../../../hooks/useProdukForm';
import { formatCurrency } from '../../../utils/formatters'; // Assuming you have a formatter utility

interface HargaMemberTabProps {
  selectedItem: Partial<ProdukItem>;
  newMemberPriceForm: { jenis_member_id: string; price: number };
  handleMemberPriceFormChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void;
  handleAddMemberPrice: () => void;
  handleDeleteMemberPrice: (jenisMemberId: string) => void;
  handleCancelMemberPriceEdit: () => void;
  modalMode: ModalMode;
  jenisMemberOptions: JenisMemberOption[];
}

const HargaMemberTab: React.FC<HargaMemberTabProps> = ({
  selectedItem,
  newMemberPriceForm,
  handleMemberPriceFormChange,
  handleAddMemberPrice,
  handleDeleteMemberPrice,
  handleCancelMemberPriceEdit,
  modalMode,
  jenisMemberOptions,
}) => {
  return (
    <div className="space-y-6">
      <div className="border p-4 rounded-lg bg-gray-50">
        <h4 className="text-md font-semibold mb-3">Tambah Jenis Member</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="jenis_member_id" className="block text-sm font-medium text-gray-700 mb-1">
              Jenis Member
            </label>
            <select
              id="jenis_member_id"
              name="jenis_member_id"
              value={newMemberPriceForm.jenis_member_id}
              onChange={handleMemberPriceFormChange}
              disabled={modalMode === 'view'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            >
              <option value="">Pilih Jenis Member</option>
              {jenisMemberOptions.map(jm => (
                <option key={jm.id} value={jm.id}>{jm.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Harga
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={newMemberPriceForm.price || ''}
              onChange={handleMemberPriceFormChange}
              disabled={modalMode === 'view'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-4">
          {modalMode !== 'view' && (
            <>
              <button
                type="button"
                onClick={handleCancelMemberPriceEdit}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddMemberPrice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tambah
              </button>
            </>
          )}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Member</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
              {modalMode !== 'view' && (
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {selectedItem.member_prices && selectedItem.member_prices.length > 0 ? (
              selectedItem.member_prices.map((mp, index) => (
                <tr key={mp.jenis_member_id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{mp.jenis_member_nama}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(mp.price)}</td>
                  {modalMode !== 'view' && (
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => handleDeleteMemberPrice(mp.jenis_member_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-2 text-center text-sm text-gray-500">Tidak ada harga member.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HargaMemberTab;