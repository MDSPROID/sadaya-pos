import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PinjamanKaryawanItem } from '../../hooks/usePinjamanKaryawanData';
import { formatCurrency } from '../../utils/formatters';

interface PaymentLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: PinjamanKaryawanItem | null;
  onProcessPayment: (loanId: string, amountPaid: number, paymentMethod: string) => void;
}

const PaymentLoanModal: React.FC<PaymentLoanModalProps> = ({
  isOpen,
  onClose,
  loan,
  onProcessPayment,
}) => {
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');

  useEffect(() => {
    if (isOpen && loan) {
      setAmountPaid(0); // Reset amount when modal opens
      setPaymentMethod('Cash');
    }
  }, [isOpen, loan]);

  if (!isOpen || !loan) return null;

  const remainingBalance = loan.sisa_pinjaman - amountPaid;
  // const isFullPayment = amountPaid >= loan.sisa_pinjaman; // Removed unused variable

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaid <= 0) {
      alert('Jumlah pembayaran harus lebih dari 0.');
      return;
    }
    onProcessPayment(loan.id, amountPaid, paymentMethod);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900">
          <X className="h-6 w-6" />
        </button>
        <h3 className="text-2xl font-semibold mb-4 text-gray-900">Pembayaran Pinjaman</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={loan.profiles_karyawan?.first_name || 'N/A'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              type="text"
              value={`${loan.profiles_karyawan?.first_name || ''} ${loan.profiles_karyawan?.last_name || ''}`.trim()}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pinjaman</label>
            <input
              type="text"
              value={formatCurrency(loan.jumlah_pinjaman)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sisa Tagihan Awal</label>
            <input
              type="text"
              value={formatCurrency(loan.sisa_pinjaman)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pembayaran Ke</label>
            <input
              type="text"
              value={(loan.jumlah_pembayaran + 1).toLocaleString('id-ID')}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="amountPaid" className="block text-sm font-medium text-gray-700 mb-1">Bayar / Angsur</label>
            <input
              type="number"
              id="amountPaid"
              value={amountPaid === 0 ? '' : amountPaid}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sisa Tagihan Akhir</label>
            <input
              type="text"
              value={formatCurrency(remainingBalance)}
              disabled
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 ${remainingBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}
            />
            {remainingBalance < 0 && (
              <p className="text-xs text-red-500 mt-1">Jumlah pembayaran melebihi sisa tagihan.</p>
            )}
          </div>
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">Metode</label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={amountPaid <= 0 || remainingBalance < 0}
            >
              Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentLoanModal;