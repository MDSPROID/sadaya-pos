import React from 'react';
import { PurchaseReportItem } from '../../types/purchaseOrderTypes';
import { formatCurrency } from '../../utils/formatters';

interface PurchaseReportDetailPanelProps {
  selectedItem: PurchaseReportItem | null;
}

const PurchaseReportDetailPanel: React.FC<PurchaseReportDetailPanelProps> = ({ selectedItem }) => {
  if (!selectedItem) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center h-full text-gray-500">
        Pilih transaksi pembelian untuk melihat detail item.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Item Pembelian</h3>
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Satuan</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {selectedItem.purchase_order_items && selectedItem.purchase_order_items.length > 0 ? (
              selectedItem.purchase_order_items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {item.item_type === 'produk' ? 'Produk' : 'Bahan'}
                  </td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    {item.item_name}
                    {item.notes_per_item && (
                      <div className="text-xs text-gray-500">({item.notes_per_item})</div>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.subtotal_per_item)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-2 text-center text-sm text-gray-500">Tidak ada item dalam pesanan ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseReportDetailPanel;