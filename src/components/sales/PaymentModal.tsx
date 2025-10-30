// src/components/sales/PaymentModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { isPrinterAvailable } from '../../utils/printAgent';

interface BankOption {
  id: string;
  nama_bank: string;
  rekening: string;
  nama_akun: string;
  charge: number;
}

interface ExistingPayment {
  id: string;
  created_at?: string | null;
  dp_amount?: number | null;
  paid_amount?: number | null;
  tempo_active?: boolean | null;
  tempo_date?: string | null;
  payment_method?: 'cash' | 'bank_transfer' | string | null;
  bank_name?: string | null;
}

interface NotePaymentDetails {
  dp_amount?: number | null;
  paid_amount?: number | null;
  total_paid?: number | null;
  final_amount?: number | null;
  payment_status?: 'paid' | 'pending';
  payment_method?: 'cash' | 'bank_transfer' | string | null;
  bank_name?: string | null;
  tempo_active?: boolean | null;
  tempo_date?: string | null;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  finalAmount: number;
  bankOptions: BankOption[];
  existingPayments?: ExistingPayment[];     // histori baris (jika ada)
  noteDetails?: NotePaymentDetails | null;  // hasil parse dari notes (terbaru)
  onProcessPayment: (paymentDetails: {
    dp_amount: number;              // TOTAL DP TERKINI (overwrite)
    paid_amount: number;            // bayar sekarang (non-DP)
    total_paid: number;             // DP total + bayar histori + bayar input
    final_amount: number;
    payment_status: 'paid' | 'pending';
    payment_method: 'cash' | 'bank_transfer';
    bank_id?: string;
    bank_name?: string;
    tempo_active: boolean;
    tempo_date?: string;
  }, options?: { skipPrint?: boolean }) => void;
}

/* ---------- Helpers (tanpa hooks) ---------- */
const onlyDigits = (s: string) => s.replace(/\D/g, '');
const toNumber = (s: string) => {
  const n = parseInt(onlyDigits(s) || '0', 10);
  return Number.isFinite(n) ? n : 0;
};
const formatRibuan = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 0 });

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  finalAmount,
  bankOptions,
  onProcessPayment,
  existingPayments = [],
  noteDetails = null,
}) => {
  /* ---------- State top-level (aman dari invalid hook call) ---------- */
  const [bayarTempo, setBayarTempo] = useState(false);
  const [tempoDate, setTempoDate] = useState(new Date().toISOString().split('T')[0]);

  // Input string supaya bisa dikosongkan
  const [dpInput, setDpInput] = useState<string>('');
  const [paidInput, setPaidInput] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [printerWarning, setPrinterWarning] = useState<string | null>(null);
  const [showPrintFallback, setShowPrintFallback] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  /* ---------- Ringkasan histori ---------- */
  const historyPaidSum = useMemo(() => {
    return (existingPayments ?? []).reduce(
      (acc, p) => acc + Number(p?.paid_amount ?? 0),
      0
    );
  }, [existingPayments]);

  const lastDpRecord = useMemo(() => {
    const list = (existingPayments ?? []).filter(p => Number(p?.dp_amount ?? 0) > 0);
    if (!list.length) return null;
    return list
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      )[0];
  }, [existingPayments]);

  const lastTempoAny = useMemo(() => {
    const list = (existingPayments ?? []).filter(p => p?.tempo_active && p?.tempo_date);
    if (!list.length) return null;
    return list
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      )[0];
  }, [existingPayments]);

  const noteDp = useMemo(() => Number(noteDetails?.dp_amount ?? 0), [noteDetails]);

  const lastDp = useMemo(
    () => Number(lastDpRecord?.dp_amount ?? 0),
    [lastDpRecord]
  );

  const noteTempoActive = !!noteDetails?.tempo_active;
  const noteTempoDate = noteDetails?.tempo_date || null;

  /* ---------- Prefill saat modal dibuka ---------- */
  useEffect(() => {
    if (!isOpen) return;

    const seedDp = Number.isFinite(noteDp) && noteDp > 0 ? noteDp : lastDp;
    setDpInput(seedDp > 0 ? formatRibuan(seedDp) : '');
    setPaidInput('');

    const seedTempoActive =
      noteTempoActive ||
      !!lastTempoAny?.tempo_active ||
      !!lastDpRecord?.tempo_active;

    const seedTempoDate =
      noteTempoDate ||
      lastTempoAny?.tempo_date ||
      lastDpRecord?.tempo_date ||
      new Date().toISOString().split('T')[0];

    setBayarTempo(seedTempoActive);
    setTempoDate(seedTempoDate);

    // Reset field lain
    setPaymentMethod('cash');
    setSelectedBankId('');
    setPrinterWarning(null);
    setShowPrintFallback(false);
    setIsProcessing(false);
  }, [
    isOpen,
    noteDp,
    lastDp,
    noteTempoActive,
    noteTempoDate,
    lastTempoAny?.tempo_active,
    lastTempoAny?.tempo_date,
    lastDpRecord?.tempo_active,
    lastDpRecord?.tempo_date,
  ]);

  if (!isOpen) return null;

  /* ---------- Perhitungan total/kembali/kekurangan ---------- */
  const dpAmount = toNumber(dpInput);
  const paidAmount = toNumber(paidInput);
  const grandTotalPaid = dpAmount + historyPaidSum + paidAmount;
  const isEnough = grandTotalPaid >= finalAmount;
  const change = isEnough ? grandTotalPaid - finalAmount : 0;
  const shortage = Math.max(finalAmount - grandTotalPaid, 0);

  /* ---------- Payload & Submit ---------- */
  const buildPaymentPayload = () => {
    const selectedBank = bankOptions.find(b => b.id === selectedBankId);
    const status: 'paid' | 'pending' = grandTotalPaid >= finalAmount ? 'paid' : 'pending';
    return {
      dp_amount: dpAmount,            // TOTAL DP TERKINI (overwrite)
      paid_amount: paidAmount,        // bayar sekarang (non-DP)
      total_paid: grandTotalPaid,     // DP total + bayar histori + bayar input
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
      setIsProcessing(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Jika bukan tempo, total keseluruhan (histori + input) harus cukup
    if (!bayarTempo && grandTotalPaid < finalAmount) {
      alert('Jumlah pembayaran belum cukup!');
      return;
    }

    if (isProcessing) return;

    const available = await isPrinterAvailable();
    if (!available) {
      setPrinterWarning(
        'Printer bermasalah atau offline. Anda bisa lanjut bayar tanpa cetak nota atau batalkan transaksi.'
      );
      setShowPrintFallback(true);
      return;
    }

    // Normal flow
    sendPayment(false);
  };

  const disableSubmit =
    (paymentMethod === 'bank_transfer' && !selectedBankId) || isProcessing;

  const existingTotalPaid = (existingPayments ?? []).reduce(
    (acc, p) => acc + Number(p?.dp_amount ?? 0) + Number(p?.paid_amount ?? 0),
    0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900">
          <X className="h-6 w-6" />
        </button>
        <h3 className="text-2xl font-semibold mb-4 text-gray-900">Pembayaran</h3>

        {/* ====== Riwayat Pembayaran (jika ada) ====== */}
        {existingPayments.length > 0 && (
          <div className="mb-4 rounded-lg border border-gray-200">
            <div className="px-4 py-2 bg-gray-50 rounded-t-lg font-medium">Riwayat Pembayaran</div>
            <div className="p-4 space-y-2 text-sm">
              <ul className="space-y-2 max-h-44 overflow-auto pr-1">
                {existingPayments
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.created_at || 0).getTime() -
                      new Date(a.created_at || 0).getTime()
                  )
                  .map((p) => (
                    <li key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="text-gray-700">
                        <div className="text-gray-600">
                          Metode : {p.payment_method?.toString().toUpperCase() || '—'}
                          {p.bank_name ? ` • ${p.bank_name.toString().toUpperCase()}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div>
                          DP: <b>Rp {(Number(p.dp_amount || 0)).toLocaleString('id-ID')}</b>
                        </div>
                        <div>
                          Bayar: <b>Rp {(Number(p.paid_amount || 0)).toLocaleString('id-ID')}</b>
                        </div>
                        {p.tempo_active && p.tempo_date && (
                          <div className="text-orange-700">
                            Tempo: <b>{new Date(p.tempo_date).toLocaleDateString('id-ID')}</b>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>

              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-700">Total sudah dibayar:</span>
                  <b>Rp {existingTotalPaid.toLocaleString('id-ID')}</b>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Sisa tagihan :</span>
                  <b>Rp {Math.max(finalAmount - existingTotalPaid, 0).toLocaleString('id-ID')}</b>
                </div>
              </div>
            </div>
          </div>
        )}

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
                onChange={(e) => {
                  const checked = e.target.checked;
                  setBayarTempo(checked);
                  // sesuai permintaan:
                  // - jika checked (tempo aktif): kosongkan kolom Bayar
                  // - jika unchecked (tempo non-aktif): kosongkan kolom DP
                  if (checked) {
                    setPaidInput('');
                  } else {
                    setDpInput('');
                  }
                }}
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

          {/* DP (total terkini) */}
          <div>
            <label htmlFor="dp_amount" className="block text-sm font-medium text-gray-700 mb-1">
              DP (total terkini)
            </label>
            <input
              type="text"
              id="dp_amount"
              value={dpInput}
              onChange={(e) => {
                const digits = onlyDigits(e.target.value);
                if (digits === '') return setDpInput('');
                // live format ribuan tanpa "Rp"
                setDpInput(formatRibuan(parseInt(digits, 10)));
              }}
              inputMode="numeric"
              autoComplete="off"
              disabled={!bayarTempo || isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>

          {/* Bayar (non-DP) */}
          <div>
            <label htmlFor="paid_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Bayar
            </label>
            <input
              type="text"
              id="paid_amount"
              value={paidInput}
              onChange={(e) => {
                const digits = onlyDigits(e.target.value);
                if (digits === '') return setPaidInput('');
                // live format ribuan tanpa "Rp"
                setPaidInput(formatRibuan(parseInt(digits, 10)));
              }}
              inputMode="numeric"
              autoComplete="off"
              disabled={bayarTempo || isProcessing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
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
              <span>Kekurangan (setelah input ini):</span>
              <span>Rp {shortage.toLocaleString('id-ID')}</span>
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
