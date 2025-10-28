import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BankOption } from '../../types/purchaseOrderTypes';

interface PurchasePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  finalAmount: number;
  bankOptions: BankOption[];
  onProcessPayment: (paymentDetails: {
    paid_amount: number;
    payment_method: 'cash' | 'bank_transfer';
    bank_id?: string;
    bank_name?: string;
    due_amount: number;
    due_date?: string;
  }) => void;
}

const formatRupiah = (value: number) =>
  value.toLocaleString('id-ID', { minimumFractionDigits: 0 });

const parseRupiah = (input: string): number => {
  // ambil digit saja
  const digits = input.replace(/[^\d]/g, '');
  if (!digits) return 0;
  // buang leading zero panjang (biar "00012" -> "12")
  const normalized = digits.replace(/^0+(?=\d)/, '');
  return normalized ? parseInt(normalized, 10) : 0;
};

const PurchasePaymentModal: React.FC<PurchasePaymentModalProps> = ({
  isOpen,
  onClose,
  finalAmount,
  bankOptions,
  onProcessPayment,
}) => {
  const [bayarTempo, setBayarTempo] = useState(false);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmountRaw, setPaidAmountRaw] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setBayarTempo(false);
      setDueDate(new Date().toISOString().split('T')[0]);
      setPaidAmountRaw(0);
      setPaymentMethod('cash');
      setSelectedBankId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const remainingToPay = Math.max(finalAmount - paidAmountRaw, 0);
  const dueAmount = bayarTempo ? remainingToPay : 0;

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (paidAmountRaw > finalAmount) {
      alert('nominal bayar melebihi jumlah yang dibayar');
      return;
    }
    
    if (!bayarTempo && paidAmountRaw  < finalAmount) {
      alert('Jumlah pembayaran belum cukup!');
      return;
    }

    if (paidAmountRaw > finalAmount) {
      alert('nominal bayar melebihi jumlah yang dibayar');
      return;
    }

    const selectedBank = bankOptions.find(bank => bank.id === selectedBankId);

    const combinedBankName =
      paymentMethod === 'bank_transfer' && selectedBank
        ? `${selectedBank.nama_bank} - ${selectedBank.nama_akun}`
        : undefined;

    onProcessPayment({
      paid_amount: paidAmountRaw ,
      payment_method: paymentMethod,
      bank_id: selectedBankId || undefined,
      bank_name: combinedBankName,
      due_amount: dueAmount,
      due_date: bayarTempo ? dueDate : undefined, // Changed null to undefined
    });
  };

  // handler input currency
  const handlePaidChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const numeric = parseRupiah(e.target.value);
    setPaidAmountRaw(numeric);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900">
          <X className="h-6 w-6" />
        </button>
        <h3 className="text-2xl font-semibold mb-4 text-gray-900">Pembayaran Pembelian</h3>

        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="flex justify-between items-center text-lg font-bold text-gray-900">
            <span>Total Pesanan:</span>
            <span>Rp {finalAmount.toLocaleString('id-ID')}</span>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={bayarTempo}
                onChange={(e) => setBayarTempo(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2">Bayar Tempo</span>
            </label>
            {bayarTempo && (
              <div className="mt-2">
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Jatuh Tempo
                </label>
                <input
                  type="date"
                  id="due_date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="paid_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Jumlah Bayar
            </label>
            <input
              type="text"
              id="paid_amount"
              // tampilkan "0" kalau 0, bukan string kosong
              value={paidAmountRaw === 0 ? '' : formatRupiah(paidAmountRaw)}
              onChange={handlePaidChange}
              inputMode="numeric"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-between items-center text-lg font-bold">
            <span>Sisa Tagihan:</span>
            <span className={remainingToPay > 0 ? 'text-red-600' : 'text-green-600'}>
              Rp {remainingToPay.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <input
                type="radio"
                name="payment_type"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={() => setPaymentMethod('cash')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2">Bayar Tunai</span>
            </label>
            <label className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="radio"
                name="payment_type"
                value="bank_transfer"
                checked={paymentMethod === 'bank_transfer'}
                onChange={() => setPaymentMethod('bank_transfer')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2">Bayar Non Tunai</span>
            </label>

            {paymentMethod === 'bank_transfer' && (
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-1">
                    Metode
                  </label>
                  <select
                    id="method"
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Bank</option>
                    {bankOptions.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.nama_bank} ({bank.rekening})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="account_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Akun
                  </label>
                  <input
                    type="text"
                    id="account_name"
                    value={bankOptions.find(bank => bank.id === selectedBankId)?.nama_akun || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batalkan
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Bayar & Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchasePaymentModal;