import React, { useRef, useState } from 'react';
import { useHistoryPendingSalesData } from '../hooks/useHistoryPendingSalesData';
import HistoryPendingSalesTable from '../components/back-office/HistoryPendingSalesTable';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const todayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const HistoryPendingSales: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(todayStr());
  const [endDate, setEndDate] = useState<string>(todayStr());

  const typingTimer = useRef<number | null>(null);
  const navigate = useNavigate();

  const {
    data,
    loading,
    error,
    fetchPendingSales,
    setData,
  } = useHistoryPendingSalesData({ startDate, endDate, searchTerm: '' }); // jangan jadikan searchTerm dep hook

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    // debounce agar tidak spam query
    if (typingTimer.current) {
      window.clearTimeout(typingTimer.current); 
    }
    typingTimer.current = window.setTimeout(() => {
      fetchPendingSales({ searchTerm: newValue, startDate, endDate });
    }, 300);
  };

  const handleStartDateChange = async (value: string) => {
    // pastikan range valid
    const fixedEnd = endDate && endDate < value ? value : endDate;
    setStartDate(value);
    if (fixedEnd !== endDate) setEndDate(fixedEnd);
    await fetchPendingSales({ searchTerm, startDate: value, endDate: fixedEnd });
  };

  const handleEndDateChange = async (value: string) => {
    // pastikan range valid
    const fixedStart = startDate && value < startDate ? value : startDate;
    if (fixedStart !== startDate) setStartDate(fixedStart);
    setEndDate(value);
    await fetchPendingSales({ searchTerm, startDate: fixedStart, endDate: value });
  };

  const handleContinue = (orderId: string) => {
    navigate('/dashboard/sales', { state: { loadOrderId: orderId } });
    showSuccess(`Melanjutkan transaksi dengan ID: ${orderId}`);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Yakin ingin menghapus transaksi tertunda ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus order...');
    try {
      // Supabase: agar DELETE mengembalikan row, chain .select('id')
      const { data: deletedRows, error: delErr } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .select('id'); // <= penting

      if (delErr) throw delErr;

      const affected = Array.isArray(deletedRows) ? deletedRows.length : 0;

      if (affected === 0) {
        // RLS menolak / tidak ada data yang cocok
        showError('Tidak bisa menghapus order. Anda mungkin tidak punya izin atau order tidak ditemukan.');
        return;
      }

      setData(prev => prev.filter(item => item.id !== orderId));
      showSuccess('Order berhasil dihapus.');
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'Gagal menghapus order.');
    } finally {
      dismissToast(toastId);
    }
  };

  // ==== Helper Fonnte key dari DB (pakai key/value atau fallback kolom khusus) ====
  const FONNTE_ENV_FALLBACK = (import.meta as any)?.env?.VITE_FONNTE_API_KEY || '';
  const FONNTE_CACHE_TTL_MS = 5 * 60 * 1000;
  let __fonnteKeyCache: { key: string | null; ts: number } = { key: null, ts: 0 };

  const loadFonnteApiKey = async (): Promise<string | null> => {
    const now = Date.now();
    if (__fonnteKeyCache.key && now - __fonnteKeyCache.ts < FONNTE_CACHE_TTL_MS) {
      return __fonnteKeyCache.key;
    }
    try {
      let key: string | null = null;
      {
        const { data, error } = await supabase
          .from('app_settings')
          .select('token_wa')
          .maybeSingle();
        if (!error) key = (data?.token_wa ?? '').trim() || null;
      }
      const val = key || (FONNTE_ENV_FALLBACK || null);
      __fonnteKeyCache = { key: val, ts: now };
      return val;
    } catch {
      const fb = FONNTE_ENV_FALLBACK || null;
      __fonnteKeyCache = { key: fb, ts: now };
      return fb;
    }
  };

  // === helper sama seperti Sales.tsx ===
  const formatRupiah = (n: number) => `Rp ${Number(n||0).toLocaleString('id-ID')}`;

  const formatItemsForWA = (items: Array<any>) => {
    if (!Array.isArray(items) || items.length === 0) return '-';
    const lines: string[] = [];
    items.forEach((it: any, idx: number) => {
      const nama = it?.product_name;
      const qty  = Number(it?.quantity || 0);
      const note = (it?.notes || '').toString().trim();

      // dimensi opsional
      const p = Number(it?.dimensions?.panjang ?? it?.panjang ?? 0);
      const l = Number(it?.dimensions?.lebar   ?? it?.lebar   ?? 0);
      const s = (it?.dimensions?.satuan || it?.satuan || '').toString().toUpperCase();
      const dim = (p && l) ? ` | Dim: ${p} x ${l}${s ? ' ' + s : ''}` : '';

      const subtotal = Number(it?.subtotal_per_item ?? it?.subtotal ?? 0);
      lines.push(`${idx + 1}. ${nama} x${qty}${dim} — ${formatRupiah(subtotal)}${note ? `\n    Catatan: ${note}` : ''}`);
    });
    return lines.join('\n');
  };

  type ExistingPayment = {
    dp_amount?: number | null;
    paid_amount?: number | null;
    total_paid?: number | null;
    final_amount?: number | null;
    payment_status?: 'paid' | 'pending';
    payment_method?: 'cash' | 'bank_transfer' | string | null;
    bank_name?: string | null;
    tempo_active?: boolean | null;
    tempo_date?: string | null;
  };

  // Ekstrak semua "Payment Details: {...}" di orders.notes → array ExistingPayment
  const extractPaymentsFromNotes = (notes?: string): ExistingPayment[] => {
    if (!notes) return [];
    const results: ExistingPayment[] = [];
    const regex = /Payment Details:\s*({[\s\S]*?})/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(notes)) !== null) {
      try {
        const obj = JSON.parse(match[1]);
        results.push({
          dp_amount: Number(obj?.dp_amount ?? 0),
          paid_amount: Number(obj?.paid_amount ?? 0),
          total_paid: Number(obj?.total_paid ?? (Number(obj?.dp_amount ?? 0) + Number(obj?.paid_amount ?? 0))),
          final_amount: Number(obj?.final_amount ?? 0),
          tempo_active: Boolean(obj?.tempo_active),
          tempo_date: obj?.tempo_date || null,
          payment_status: (obj?.payment_status as any) || null,
          payment_method: (obj?.payment_method as any) || null,
          bank_name: obj?.bank_name || null,
        });
      } catch {}
    }
    return results;
  };

  const normalizePhone = (raw?: string) => {
    if (!raw) return '';
    let digits = raw.replace(/\D+/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.startsWith('62')) digits = digits.slice(2);
    return '62' + digits;
  };

  const sendWhatsApp = async (target: string, message: string) => {
    const apiKey = await loadFonnteApiKey();
    if (!apiKey) throw new Error('FONNTE API key not configured.');
    const form = new FormData();
    form.append('target', target);
    form.append('message', message);
    form.append('countryCode', '62');
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: apiKey },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Fonnte error (${res.status}): ${text || 'unknown'}`);
    }
  };

  const markOrderWaNotified = async (orderId: string) => {
    await supabase.from('orders').update({
      wa_notified: true,
      wa_notified_at: new Date().toISOString(),
    }).eq('id', orderId);
  };

  // Build pesan sederhana (pakai invoice + total + catatan pembayaran yang ada di notes)
  const buildWaMessage = (opts: {
    customerName?: string;
    finalAmount: number;
    dpAmount: number;
    paidAmount: number;
    totalPaid: number;
    tempoActive: boolean;
    tempoDate?: string;
    itemsText: string;
    invoice?: string | null;
  }) => {
    const sisa   = Math.max(opts.finalAmount - opts.totalPaid, 0);
    const status = sisa <= 0 ? 'LUNAS' : 'BELUM LUNAS';
  
    const header = opts.invoice ? [`*Invoice:* ${opts.invoice}`, ''] : [];
  
    const lines = [
      ...header,
      `Halo ${opts.customerName || 'Pelanggan'},`,
      `Terima kasih atas pesanan Anda 🙏`,
      ``,
      `Status: *${status}*`,
      `Total: ${formatRupiah(opts.finalAmount)}`,
      `DP: ${formatRupiah(opts.dpAmount)}`,
      `Pembayaran: ${formatRupiah(opts.paidAmount)}`,
      `Total terbayar: ${formatRupiah(opts.totalPaid)}`,
    ];
  
    if (opts.tempoActive && opts.tempoDate) {
      lines.push(`Jatuh tempo: ${new Date(opts.tempoDate).toLocaleDateString('id-ID')}`);
    }
    if (sisa > 0) {
      lines.push(`Sisa tagihan: Rp ${formatRupiah(sisa)}`);
    }
  
    // lines.push('', '*Detail Pesanan:*', opts.itemsText || '-', '', '—', 'Pesan ini dikirim otomatis.');
    lines.push('','*Detail Pesanan:*', opts.itemsText || '-' );
    return lines.join('\n');
  };

  const [waSendingId, setWaSendingId] = useState<string | null>(null);

  const handleSendWhatsApp = async (orderId: string) => {
    let toastId: any;
    try {
      setWaSendingId(orderId);
  
      // Ambil detail order + items
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .select(`
          id,
          invoice_number,
          final_amount,
          notes,
          customer_display_name,
          customer_display_phone,
          pelanggan:customer_id ( nama_pelanggan, telepon ),
          order_items (
            product_name,
            quantity,
            subtotal_per_item,
            dimensions
          )
        `)
        .eq('id', orderId)
        .maybeSingle();
  
      if (oErr || !order) throw new Error(oErr?.message || 'Order tidak ditemukan.');
  
      // pelanggan bisa array (relasi)
      const pel = Array.isArray(order.pelanggan) ? order.pelanggan[0] : (order as any).pelanggan;
  
      const rawPhone =
        order.customer_display_phone ||
        pel?.telepon ||
        '';
      if (!rawPhone) {
        showError('Nomor WhatsApp pelanggan belum ada.');
        return;
      }
  
      const customerName =
        order.customer_display_name ||
        pel?.nama_pelanggan ||
        'Pelanggan';
  
      // ===== Items =====
      const itemsText = formatItemsForWA(order.order_items || []);
  
      // ===== Payment details dari notes =====
      const pays = extractPaymentsFromNotes(order.notes || '');
      // ambil entry terakhir kalau ada; kalau tidak, fallback angka basic
      const last = pays.length ? pays[pays.length - 1] : undefined;
  
      const finalAmount = Number(last?.final_amount ?? order.final_amount ?? 0);
      const dpAmount    = Number(last?.dp_amount ?? 0);
      const paidAmount  = Number(last?.paid_amount ?? 0);
      const totalPaid   = Number(last?.total_paid ?? (dpAmount + paidAmount));
      const tempoActive = Boolean(last?.tempo_active);
      const tempoDate   = last?.tempo_date || undefined;
  
      const msgBase = buildWaMessage({
        customerName,
        finalAmount,
        dpAmount,
        paidAmount,
        totalPaid,
        tempoActive,
        tempoDate,
        itemsText,
        invoice: order.invoice_number,
      });

      let transferInfo = '';
      try {
        const { data: banks, error: bankErr } = await supabase
          .from('bank')
          .select('nama_bank, rekening, nama_akun')
          .limit(1);

        if (!bankErr && banks && banks[0]) {
          const b = banks[0] as any;
          transferInfo =
            `\n\n*Transfer ke:*\n` +
            `Bank: ${b.nama_bank}\n` +
            `No.Rek: ${b.rekening}\n` +
            `a.n: ${b.nama_akun}`;
        }
      } catch (e) {
        console.warn('Gagal ambil data bank untuk WA (history):', e);
      }

      // final message: base + info transfer + kalimat otomatis SETELAH bank
      const finalMsg = msgBase + transferInfo + `\n\n—\nPesan ini dikirim otomatis.`;
  
      toastId = showLoading('Mengirim WhatsApp...');
      const normalized = normalizePhone(rawPhone);
      await sendWhatsApp(normalized, finalMsg);
      await markOrderWaNotified(orderId);
  
      // update row di UI
      setData(prev =>
        prev.map(it =>
          it.id === orderId ? { ...it, wa_notified: true } : it
        )
      );
  
      if (toastId !== undefined) dismissToast(toastId);
      showSuccess('WhatsApp terkirim.');
    } catch (e: any) {
      if (toastId !== undefined) try { dismissToast(toastId); } catch {}
      showError(e?.message || 'Gagal mengirim WhatsApp.');
      console.warn('send WA from history error:', e);
    } finally {
      setWaSendingId(null);
    }
  };

  const handleRekap = () => {
    showSuccess('Melakukan rekap data penjualan tertunda.');
    console.log('Rekap pending sales data');
  };

  // Jangan return full halaman saat loading → biarkan tabel yang menunjukkan loading overlay
  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button
          type="button"
          onClick={() => fetchPendingSales({ searchTerm, startDate, endDate })}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">History Pending Penjualan</h1>
          <p className="text-gray-600">Lihat dan kelola daftar transaksi penjualan yang tertunda.</p>
        </div>
      </div>

      <HistoryPendingSalesTable
        data={data}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(v) => handleStartDateChange(v)}
        onEndDateChange={(v) => handleEndDateChange(v)}
        onRefresh={() => fetchPendingSales({ searchTerm, startDate, endDate })}
        onContinue={handleContinue}
        onDelete={handleDelete}
        onRekap={handleRekap}
        onSendWhatsApp={handleSendWhatsApp}     // << NEW
        waSendingId={waSendingId} 
      />
    </div>
  );
};

export default HistoryPendingSales;
