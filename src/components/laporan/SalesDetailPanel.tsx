import React from 'react';
import { SalesItem, PendingOrderItem } from '../../types/orderTypes';
import { formatCurrency } from '../../utils/formatters';
import { AdditionalOption } from '../../types/salesOrderTypes';

interface SalesDetailPanelProps {
  selectedItem: SalesItem | PendingOrderItem | null;
}

const SalesDetailPanel: React.FC<SalesDetailPanelProps> = ({ selectedItem }) => {
  if (!selectedItem) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center h-full text-gray-500">
        Pilih transaksi penjualan untuk melihat detail item.
      </div>
    );
  }

  if (selectedItem.payment_status === 'pending' && (!selectedItem.order_items || selectedItem.order_items.length === 0)) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Item Pesanan</h3>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Detail item tidak tersedia untuk transaksi tertunda.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Item Pesanan</h3>
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ukuran</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Satuan</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {selectedItem.order_items && selectedItem.order_items.length > 0 ? (
              selectedItem.order_items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    {item.product_name}
                    {item.notes_per_item && (
                      <div className="text-xs text-gray-500">({item.notes_per_item})</div>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {item.dimensions?.panjang && item.dimensions?.lebar
                      ? `${item.dimensions.panjang}x${item.dimensions.lebar} ${item.dimensions.satuan || ''}`
                      : '-'}
                    {item.dimensions?.tebal_bahan_nama && ` (${item.dimensions.tebal_bahan_nama})`}
                    {item.dimensions?.additional_options && item.dimensions.additional_options.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {item.dimensions.additional_options.map((opt: AdditionalOption) => `${opt.name} (${opt.quantity})`).join(', ')}
                      </div>
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

export default SalesDetailPanel;