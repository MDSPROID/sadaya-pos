import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { showError, showSuccess, showLoading, dismissToast } from '../../utils/toast';

interface Props {
  purchaseId: string;
  onClose: () => void;
  onPaid: () => void; // callback setelah simpan sukses
}

const formatRp = (n: any) => `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`;

const PurchasePaymentModalPending: React.FC<Props> = ({ purchaseId, onClose, onPaid }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [po, setPo] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);

  // form
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [amountInput, setAmountInput] = useState<string>('');
  const typedAmount = amountInput === '' ? 0 : Number(amountInput)
  const [method, setMethod] = useState<'cash'|'bank_transfer'>('cash');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const tagihan = Number(po?.final_amount || po?.total_amount || 0);
  // const terbayar = Number(po?.paid_amount || 0);

  const paidFromPayments = useMemo(() => {
    return (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);
  
  // Jika belum ada payment, fallback ke po.paid_amount agar tidak blank saat loading awal
  const terbayar = useMemo(() => {
    const fromPo = Number(po?.paid_amount || 0);
    return paidFromPayments > 0 ? paidFromPayments : fromPo;
  }, [paidFromPayments, po]);
  
  const sisa = Math.max(tagihan - terbayar, 0);

  // ⬇️ nilai live saat user mengetik jumlah bayar (belum disimpan ke DB)
  const liveTerbayar = useMemo(
    () => Number(terbayar) + Number(typedAmount || 0),
    [terbayar, typedAmount]
  );
  const liveSisa = Math.max(tagihan - liveTerbayar, 0);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: order, error: e1 } = await supabase
        .from('purchase_orders')
        .select('id, invoice_number, final_amount, total_amount, paid_amount, payment_status, supplier_id')
        .eq('id', purchaseId)
        .maybeSingle();
      if (e1) throw e1;

      setPo(order);

      const { data: pays, error: e2 } = await supabase
        .from('purchase_payments')
        .select('*')
        .eq('purchase_order_id', purchaseId)
        .order('pay_date', { ascending: false });
      if (e2) throw e2;

      setPayments(pays || []);
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Gagal memuat data pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); /* eslint-disable react-hooks/exhaustive-deps */ }, [purchaseId]);

  const handleSubmit = async () => {
    // nominal bisa 0
    const payAmount = Number(typedAmount || 0);
    if(payAmount == 0){
      alert('Nominal bayar tidak boleh 0');
      return;
    }
    if (payAmount > Math.max(tagihan - terbayar, 0)) {
      alert('Nominal bayar melebihi jumlah tagihan');
      return;
    }
  
    const toastId = showLoading('Menyimpan pembayaran...');
    try {
      const isCash = method === 'cash';
  
      // gabungkan BANK + NAMA AKUN jika non tunai
      const combinedBank = !isCash
        ? `${(bankName || '').trim()}${accountName ? ' - ' + accountName.trim() : ''}`.trim()
        : null;
  
      // opsional: validasi bank jika non tunai
      if (!isCash && !bankName) {
        showError('Pilih / isi bank untuk pembayaran non tunai.');
        dismissToast(toastId);
        return;
      }
  
      const basePayload: any = {
        purchase_order_id: purchaseId,
        pay_date: payDate,
        amount: payAmount,
        method,              // 'cash' | 'bank_transfer'
        note: note || null,
      };
  
      let insertErr: any = null;
  
      if (combinedBank) {
        // coba kolom 'bank' dulu
        const { error } = await supabase
          .from('purchase_payments')
          .insert({ ...basePayload, bank_name: combinedBank });
        insertErr = error;
  
        if (insertErr && /column "bank" does not exist/i.test(insertErr.message || '')) {
          // fallback ke 'bank_name'
          const { error: err2 } = await supabase
            .from('purchase_payments')
            .insert({ ...basePayload, bank_name: combinedBank });
          insertErr = err2;
        }
      } else {
        // tunai → tanpa bank/bank_name
        const { error } = await supabase
          .from('purchase_payments')
          .insert(basePayload);
        insertErr = error;
      }
  
      if (insertErr) throw insertErr;
  
      showSuccess('Pembayaran berhasil disimpan.');
      onPaid(); // refresh/close sesuai props kamu
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Gagal menyimpan pembayaran.');
    } finally {
      dismissToast(toastId);
    }
  };  

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Tambah Pembayaran</h3>
          <p className="text-sm text-gray-500">Faktur: {po?.invoice_number || purchaseId}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Ringkasan */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="text-xs text-gray-500">Total Tagihan</div>
              <div className="text-base font-semibold">{formatRp(tagihan)}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="text-xs text-gray-500">Total Terbayar</div>
              <div className="text-base font-semibold text-green-600">
                {formatRp(liveTerbayar)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="text-xs text-gray-500">Sisa Hutang</div>
              <div className={`text-base font-semibold ${liveSisa > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatRp(liveSisa)}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col text-sm">
              <span className="text-gray-700 mb-1">Tanggal Pembayaran</span>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-gray-700 mb-1">Jumlah Bayar</span>
              <input
                type="number"
                min={0}
                step="100"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => {
                  const val = e.target.value;

                  // izinkan kosong agar bisa hapus '0'
                  if (val === '') {
                    setAmountInput('');
                    return;
                  }

                  // hanya angka non-negatif
                  const n = Number(val);
                  if (Number.isNaN(n) || n < 0) return;

                  // jika melebihi sisa tagihan, pop up + clamp
                  const sisaTagihan = Math.max(tagihan - terbayar, 0);
                  if (n > sisaTagihan) {
                    alert('Nominal bayar melebihi jumlah tagihan');
                    setAmountInput(String(sisaTagihan));
                    return;
                  }

                  setAmountInput(val);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-gray-700 mb-1">Metode</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="cash">Tunai</option>
                <option value="bank_transfer">Transfer Bank</option>
              </select>
            </label>

            {method === 'bank_transfer' && (
              <label className="flex flex-col text-sm">
                <span className="text-gray-700 mb-1">Nama Bank</span>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
            )}

            <label className="flex flex-col text-sm sm:col-span-2">
              <span className="text-gray-700 mb-1">Catatan</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </label>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Tutup
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            Simpan Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchasePaymentModalPending;
