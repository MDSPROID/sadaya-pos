import React from 'react';
import { Printer, Save } from 'lucide-react';
import { useAsyncClick } from '../../utils/useAsyncClick';
import { useSession } from '../SessionContextProvider';
import { isKasirOrSuperAdmin } from '../../utils/roles';

interface OrderSummaryProps {
  totalAmount: number;        // Total amount of items already in cart
  discountAmount: number;     // Discount of items already in cart
  taxAmount: number;          // Tax of items already in cart
  cartFinalAmount: number;    // Final amount of items already in cart
  currentItemSubtotal: number;// Subtotal of the currently configured item
  onSavePending: () => void | Promise<void>;
  onOpenPaymentModal: () => void | Promise<void>;
  /**
   * Opsional: override hak akses tombol Pembayaran.
   * Jika tidak diberikan, komponen akan cek dari role user (Kasir / Super Admin).
   */
  canPay?: boolean;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  totalAmount,
  discountAmount,
  taxAmount,
  cartFinalAmount,
  currentItemSubtotal,
  onSavePending,
  onOpenPaymentModal,
  canPay,
}) => {
  const grandTotal = cartFinalAmount + currentItemSubtotal;
  const { profile } = useSession();

  // Jika prop canPay tidak disuplai, default pakai role user
  const computedCanPay = typeof canPay === 'boolean' ? canPay : isKasirOrSuperAdmin(profile?.role);

  const { onClick: onPendingClick,  loading: savingPending  } = useAsyncClick(onSavePending);
  const { onClick: onPaymentClick,  loading: openingPayment } = useAsyncClick(onOpenPaymentModal);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex-shrink-0">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Ringkasan Total</h2>

      <div className="space-y-3 text-lg">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Total Harga Produk (Keranjang):</span>
          <span className="font-semibold text-gray-900">Rp {totalAmount.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Diskon Item (Keranjang):</span>
          <span className="font-semibold text-red-600">- Rp {discountAmount.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700">PPN (Keranjang):</span>
          <span className="font-semibold text-gray-900">Rp {taxAmount.toLocaleString('id-ID')}</span>
        </div>
        <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center font-bold text-xl">
          <span className="text-gray-900">Total Keranjang:</span>
          <span className="text-blue-600">Rp {cartFinalAmount.toLocaleString('id-ID')}</span>
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
        {/* Pending Trx selalu tersedia */}
        <button
          onClick={onPendingClick}
          disabled={savingPending}
          aria-disabled={savingPending}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors text-white ${
            savingPending ? 'bg-yellow-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'
          }`}
        >
          <Save className="h-5 w-5 mr-2" />
          Pending Trx
        </button>

        {/* Tombol Pembayaran khusus Kasir / Super Admin */}
        {computedCanPay && (
          <button
            onClick={onPaymentClick}
            disabled={openingPayment}
            aria-disabled={openingPayment}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors text-white ${
              openingPayment ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Printer className="h-5 w-5 mr-2" />
            {openingPayment ? 'Membuka…' : 'Pembayaran'}
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderSummary;
