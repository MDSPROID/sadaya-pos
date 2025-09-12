import React from 'react';
import { DollarSign } from 'lucide-react';

interface PurchaseSummaryProps {
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currentItemSubtotal: number;
  onOpenPaymentModal: () => void;
}

const PurchaseSummary: React.FC<PurchaseSummaryProps> = ({
  totalAmount,
  discountAmount,
  finalAmount,
  currentItemSubtotal,
  onOpenPaymentModal,
}) => {
  const grandTotal = finalAmount + currentItemSubtotal;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex-shrink-0">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Ringkasan Total</h2>
      <div className="space-y-3 text-lg">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Total Harga Item (Keranjang):</span>
          <span className="font-semibold text-gray-900">Rp {totalAmount.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Diskon (Keranjang):</span>
          <span className="font-semibold text-red-600">- Rp {discountAmount.toLocaleString('id-ID')}</span>
        </div>
        <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center font-bold text-xl">
          <span className="text-gray-900">Total Keranjang:</span>
          <span className="text-blue-600">Rp {finalAmount.toLocaleString('id-ID')}</span>
        </div>
        {currentItemSubtotal > 0 && (
          <div className="flex justify-between items-center text-base text-gray-700">
            <span>Subtotal Item Saat Ini:</span>
            <span className="font-semibold">Rp {currentItemSubtotal.toLocaleString('id-ID')}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center font-bold text-2xl">
          <span className="text-gray-900">GRAND TOTAL:</span>
          <span className="text-blue-600">Rp {grandTotal.toLocaleString('id-ID')}</span>
        </div>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onOpenPaymentModal}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <DollarSign className="h-5 w-5 mr-2" />
          Pembayaran
        </button>
      </div>
    </div>
  );
};

export default PurchaseSummary;