import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { isPrinterAvailable } from '../../utils/printAgent';

interface BankOption {
  id: string;
  nama_bank: string;
  rekening: string;
  nama_akun: string;
  charge: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  finalAmount: number;
  bankOptions: BankOption[];
  onProcessPayment: (paymentDetails: {
    dp_amount: number;
    paid_amount: number;
    total_paid: number;
    final_amount: number;
    payment_status: 'paid' | 'pending';
    payment_method: 'cash' | 'bank_transfer';
    bank_id?: string;
    bank_name?: string;
    tempo_active: boolean;
    tempo_date?: string;
  }, options?: { skipPrint?: boolean }) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  finalAmount,
  bankOptions,
  onProcessPayment,
}) => {
  const [bayarTempo, setBayarTempo] = useState(false);
  const [tempoDate, setTempoDate] = useState(new Date().toISOString().split('T')[0]);
  const [dpAmountRaw, setDpAmountRaw] = useState(0);
  const [paidAmountRaw, setPaidAmountRaw] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [printerWarning, setPrinterWarning] = useState<string | null>(null);
  const [showPrintFallback, setShowPrintFallback] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatRupiah = (value: number) =>
    value.toLocaleString('id-ID', { minimumFractionDigits: 0 });

  useEffect(() => {
    if (isOpen) {
      setBayarTempo(false);
      setTempoDate(new Date().toISOString().split('T')[0]);
      setDpAmountRaw(0);
      setPaidAmountRaw(0);
      setPaymentMethod('cash');
      setSelectedBankId('');
      setPrinterWarning(null);
      setShowPrintFallback(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!bayarTempo) {
      setDpAmountRaw(0);
    }
  }, [bayarTempo]);

  if (!isOpen) return null;

  const totalPaid = dpAmountRaw + paidAmountRaw;
  const isEnough = totalPaid >= finalAmount;
  const change = isEnough ? (totalPaid - finalAmount) : 0;

  const handleCurrencyInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const raw = e.target.value.replace(/\D/g, '');
    const numeric = parseInt(raw || '0', 10);
    setter(numeric);
  };

  // Helper: bangun payload berdasarkan nilai TERKINI
  const buildPaymentPayload = () => {
    const currentTotal = dpAmountRaw + paidAmountRaw;
    const selectedBank = bankOptions.find(b => b.id === selectedBankId);
    const status: 'paid' | 'pending' = currentTotal >= finalAmount ? 'paid' : 'pending';
    return {
      dp_amount: dpAmountRaw,
      paid_amount: paidAmountRaw,
      total_paid: currentTotal,
      final_amount: finalAmount,
      payment_status: status,
      payment_method: paymentMethod,
      bank_id: selectedBankId || undefined,
      bank_name: selectedBank?.nama_bank || undefined,
      tempo_active: bayarTempo,
      tempo_date: bayarTempo ? tempoDate : undefined,
    } as const;
  };

  const sendPayment = async (skipPrint = false) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await Promise.resolve(onProcessPayment(buildPaymentPayload(), { skipPrint }));
    } finally {
      // Biasanya modal akan ditutup oleh parent, tapi jika tidak, kita buka lock lagi
      setIsProcessing(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Jika bukan tempo & kurang bayar => blok
    const currentTotal = dpAmountRaw + paidAmountRaw;
    if (!bayarTempo && currentTotal < finalAmount) {
      alert('Jumlah pembayaran belum cukup!');
      return;
    }

    // Cegah submit berulang
    if (isProcessing) return;

    const available = await isPrinterAvailable();
    if (!available) {
      setPrinterWarning('Printer bermasalah atau offline. Anda bisa lanjut bayar tanpa cetak nota atau batalkan transaksi.');
      setShowPrintFallback(true);
      return;
    }

    // Normal flow: lanjut & cetak
    sendPayment(false);
  };

  const disableSubmit = (paymentMethod === 'bank_transfer' && !selectedBankId) || isProcessing;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900">
          <X className="h-6 w-6" />
        </button>
        <h3 className="text-2xl font-semibold mb-4 text-gray-900">Pembayaran</h3>

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
                disabled={isProcessing}
              />
              <span className="ml-2">Bayar Tempo</span>
            </label>
            {bayarTempo && (
              <div className="mt-2">
                <label htmlFor="tempo_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Tempo
                </label>
                <input
                  type="date"
                  id="tempo_date"
                  value={tempoDate}
                  onChange={(e) => setTempoDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isProcessing}
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="dp_amount" className="block text-sm font-medium text-gray-700 mb-1">
              DP
            </label>
            <input
              type="text"
              id="dp_amount"
              value={dpAmountRaw === 0 ? '0' : formatRupiah(dpAmountRaw)}
              onChange={(e) => handleCurrencyInput(e, setDpAmountRaw)}
              disabled={!bayarTempo || isProcessing}
              inputMode="numeric"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          <div>
            <label htmlFor="paid_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Bayar
            </label>
            <input
              type="text"
              id="paid_amount"
              value={paidAmountRaw === 0 ? '0' : formatRupiah(paidAmountRaw)}
              onChange={(e) => handleCurrencyInput(e, setPaidAmountRaw)}
              inputMode="numeric"
              disabled={isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-between items-center text-lg font-bold">
            <span>Kembali:</span>
            <span className={isEnough ? 'text-green-600' : 'text-red-600'}>
              {isEnough ? `Rp ${change.toLocaleString('id-ID')}` : 'Belum Cukup'}
            </span>
          </div>

          {!isEnough && (
            <div className="flex justify-between items-center text-sm text-red-600 -mt-2">
              <span>Kekurangan:</span>
              <span>Rp {(finalAmount - totalPaid).toLocaleString('id-ID')}</span>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <input
                type="radio"
                name="payment_type"
                disabled={isProcessing}
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
                disabled={isProcessing}
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
                    disabled={isProcessing}
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

          {printerWarning && (
            <div className="p-3 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">
              {printerWarning}
            </div>
          )}

          {showPrintFallback ? (
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => sendPayment(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {isProcessing ? 'Memproses...' : 'Lanjut Bayar tanpa Cetak'}
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batalkan Transaksi
              </button>
            </div>
          ) : (
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
                disabled={disableSubmit}
                className={`px-4 py-2 rounded-lg text-white ${
                  disableSubmit ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isProcessing ? 'Memproses...' : 'Bayar & Cetak Nota'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
