import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { showError, showSuccess, showLoading, dismissToast } from '../../utils/toast';

interface Props {
  purchaseId: string;
  onClose: () => void;
}

const formatRp = (n: any) => `Rp ${(Number(n) || 0).toLocaleString('id-ID')}`;

type PaymentRow = {
  id: string;
  pay_date: string | null;
  amount: number;
  method: 'cash' | 'bank_transfer' | string;
  bank_name: string | null;
  note: string | null;
  created_at: string;
};

type BankOption = {
  id: string;
  nama_bank: string;
  rekening?: string | null;
  nama_akun?: string | null;
};

const PurchasePaymentsViewModalPending: React.FC<Props> = ({ purchaseId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [po, setPo] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]); // ⬅️ bank list

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<PaymentRow>>({});

  const tagihan = Number(po?.final_amount || po?.total_amount || 0);
  const terbayar = useMemo(() => {
    const fromPayments = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return fromPayments > 0 ? fromPayments : Number(po?.paid_amount || 0);
  }, [payments, po]);
  const sisa = Math.max(tagihan - terbayar, 0);

  const load = async () => {
    setLoading(true);
    try {
      const { data: order, error: e1 } = await supabase
        .from('purchase_orders')
        .select('id, invoice_number, total_amount, final_amount, paid_amount, payment_status')
        .eq('id', purchaseId)
        .maybeSingle();
      if (e1) throw e1;
      setPo(order);

      const { data: pays, error: e2 } = await supabase
        .from('purchase_payments')
        .select('id, pay_date, amount, method, bank_name, note, created_at')
        .eq('purchase_order_id', purchaseId)
        .order('pay_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (e2) throw e2;

      setPayments(
        (pays || []).map((p) => ({
          id: p.id,
          pay_date: p.pay_date,
          amount: Number(p.amount || 0),
          method: (p.method as any) || 'cash',
          bank_name: p.bank_name,
          note: p.note,
          created_at: p.created_at,
        }))
      );

      // ⬇️ ambil daftar bank untuk isian edit
      const { data: banks, error: e3 } = await supabase
        .from('bank')
        .select('id, nama_bank, rekening, nama_akun')
        .order('nama_bank', { ascending: true });
      if (e3) throw e3;
      setBankOptions(banks || []);
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Gagal memuat data pembayaran.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseId]);

  const startEdit = (row: PaymentRow) => {
    setEditingId(row.id);
    setEditDraft({
      pay_date: row.pay_date ?? new Date().toISOString().slice(0, 10),
      amount: row.amount,
      method: row.method as any,
      bank_name: row.bank_name ?? '',
      note: row.note ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const draft = editDraft;

    const amount = Number(draft.amount || 0);
    if (!amount || amount <= 0) {
      showError('Nominal pembayaran harus lebih dari 0.');
      return;
    }
    if (!draft.pay_date) {
      showError('Tanggal pembayaran wajib diisi.');
      return;
    }

    const toastId = showLoading('Menyimpan perubahan...');
    try {
      const payload: any = {
        pay_date: draft.pay_date,
        amount: amount,
        method: draft.method || 'cash',
        note: draft.note || null,
      };
      // hanya simpan bank_name ketika transfer
      if ((draft.method || 'cash') === 'bank_transfer') {
        payload.bank_name = (draft.bank_name || '').toString().trim() || null;
      } else {
        payload.bank_name = null;
      }

      const { error } = await supabase
        .from('purchase_payments')
        .update(payload)
        .eq('id', editingId);
      if (error) throw error;

      showSuccess('Pembayaran berhasil diperbarui.');
      setEditingId(null);
      setEditDraft({});
      await load(); // reload agar ringkasan & status PO ikut update via trigger
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Gagal menyimpan perubahan pembayaran.');
    } finally {
      dismissToast(toastId);
    }
  };

  const deleteRow = async (id: string) => {
    if (!confirm('Hapus pembayaran ini? Tindakan ini tidak dapat dibatalkan.')) return;

    const toastId = showLoading('Menghapus pembayaran...');
    try {
      const { error } = await supabase
        .from('purchase_payments')
        .delete()
        .eq('id', id);
      if (error) throw error;

      showSuccess('Pembayaran berhasil dihapus.');
      await load(); // trigger akan otomatis hitung ulang paid_amount & status
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Gagal menghapus pembayaran.');
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Riwayat Pembayaran</h3>
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
              <div className="text-base font-semibold">{formatRp(terbayar)}</div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <div className="text-xs text-gray-500">Sisa Hutang</div>
              <div className="text-base font-semibold">{formatRp(sisa)}</div>
            </div>
          </div>

          {/* Tabel pembayaran */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Tanggal', 'Jumlah', 'Metode', 'Bank', 'Catatan', 'Aksi'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-sm text-gray-500 text-center">Belum ada pembayaran.</td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const isEditing = editingId === p.id;

                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-2 text-sm">
                          {isEditing ? (
                            <input
                              type="date"
                              value={(editDraft.pay_date as string) ?? new Date().toISOString().slice(0,10)}
                              onChange={(e) => setEditDraft((d) => ({ ...d, pay_date: e.target.value }))}
                              className="px-2 py-1 border border-gray-300 rounded"
                            />
                          ) : (
                            new Date(p.pay_date || p.created_at).toLocaleDateString('id-ID')
                          )}
                        </td>

                        <td className="px-4 py-2 text-sm">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              step="100"
                              value={editDraft.amount ?? p.amount}
                              onChange={(e) => setEditDraft((d) => ({ ...d, amount: Number(e.target.value) }))}
                              className="px-2 py-1 border border-gray-300 rounded w-32"
                            />
                          ) : (
                            formatRp(p.amount)
                          )}
                        </td>

                        <td className="px-4 py-2 text-sm">
                          {isEditing ? (
                            <select
                              value={(editDraft.method as any) ?? p.method}
                              onChange={(e) => setEditDraft((d) => ({ ...d, method: e.target.value as any }))}
                              className="px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="cash">Tunai</option>
                              <option value="bank_transfer">Transfer</option>
                            </select>
                          ) : (
                            p.method === 'cash' ? 'Tunai' : 'Transfer'
                          )}
                        </td>

                        <td className="px-4 py-2 text-sm">
                          {isEditing ? (
                            <>
                              {/* pakai datalist: bisa pilih dari daftar atau ketik manual */}
                              <input
                                type="text"
                                list="bank-list"
                                value={editDraft.bank_name ?? (p.bank_name || '')}
                                onChange={(e) => setEditDraft((d) => ({ ...d, bank_name: e.target.value }))}
                                className="px-2 py-1 border border-gray-300 rounded w-44"
                                disabled={(editDraft.method ?? p.method) !== 'bank_transfer'}
                                placeholder="Pilih / ketik nama bank"
                              />
                              <datalist id="bank-list">
                                {bankOptions.map((b) => (
                                  <option key={b.id} value={b.nama_bank} />
                                ))}
                              </datalist>
                            </>
                          ) : (
                            p.bank_name || '-'
                          )}
                        </td>

                        <td className="px-4 py-2 text-sm">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDraft.note ?? (p.note || '')}
                              onChange={(e) => setEditDraft((d) => ({ ...d, note: e.target.value }))}
                              className="px-2 py-1 border border-gray-300 rounded w-56"
                            />
                          ) : (
                            p.note || '-'
                          )}
                        </td>

                        <td className="px-4 py-2 text-sm">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                onClick={saveEdit}
                                title="Simpan"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                                onClick={cancelEdit}
                                title="Batal"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                onClick={() => startEdit(p)}
                                title="Edit Pembayaran"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                className="inline-flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                onClick={() => deleteRow(p.id)}
                                title="Hapus Pembayaran"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {loading && <div className="text-sm text-gray-500">Memuat…</div>}
        </div>

        <div className="p-6 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchasePaymentsViewModalPending;
