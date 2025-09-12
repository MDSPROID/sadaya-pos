import React from 'react';
import { Trash2 } from 'lucide-react';
import { PurchaseItem } from '../../types/purchaseOrderTypes';

interface PurchaseItemsTableProps {
  items: PurchaseItem[];
  onRemoveItem: (tempId: string) => void;
}

const PurchaseItemsTable: React.FC<PurchaseItemsTableProps> = ({ items, onRemoveItem }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex-shrink-0">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Daftar Item Pembelian</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Satuan</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-2 text-center text-sm text-gray-500">Belum ada item dalam pesanan pembelian.</td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.tempId}>
                  <td className="px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.item_type === 'produk' ? 'Produk' : 'Bahan'}</td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.item_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.notes_per_item || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">Rp {item.unit_price.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.quantity} {item.satuan_nama}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">Rp {item.subtotal_per_item.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => onRemoveItem(item.tempId)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseItemsTable;