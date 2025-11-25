import React, { useState } from 'react';
import { useSalesData } from '../hooks/useSalesData';
import { useSalesOrder } from '../hooks/useSalesOrder';
import { showError } from '../utils/toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHistoryPendingSalesData } from '../hooks/useHistoryPendingSalesData';
// import PrinterStatusBadge from '../components/sales/PrinterStatusBadge';
import { supabase } from '../integrations/supabase/client';

import { isKasirOrSuperAdmin } from '../utils/roles';
import { useSession } from '../components/SessionContextProvider';

// Modular components
import CustomerForm from '../components/sales/CustomerForm';
import ProductInputForm from '../components/sales/ProductInputForm';
import OrderItemsTable from '../components/sales/OrderItemsTable';
import OrderSummary from '../components/sales/OrderSummary';
import SelectCustomerModal from '../components/sales/SelectCustomerModal';
import SelectProductModal from '../components/sales/SelectProductModal';
import ProductDetailModal from '../components/sales/ProductDetailModal';
import PaymentModal from '../components/sales/PaymentModal';

// const FONNTE_API_KEY = (import.meta as any)?.env?.VITE_FONNTE_API_KEY || '6b1EaxqeQSR9oHv7EUdF'; //token fonnte

// ====== FONNTE API KEY (dinamis via DB) ======
const FONNTE_ENV_FALLBACK =
  (import.meta as any)?.env?.VITE_FONNTE_API_KEY || ''; // fallback kalau DB kosong

const FONNTE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit
let __fonnteKeyCache: { key: string | null; ts: number } = { key: null, ts: 0 };

const loadFonnteApiKey = async (): Promise<string | null> => {
  const now = Date.now();
  if (__fonnteKeyCache.key && now - __fonnteKeyCache.ts < FONNTE_CACHE_TTL_MS) {
    dbg('FONNTE key from cache');
    return __fonnteKeyCache.key;
  }

  try {
    dbg('FONNTE key fetch from app_settings');
    const { data, error } = await supabase
      .from('app_settings')
      .select('token_wa')
      .maybeSingle();

    if (error) {
      console.warn('[Sales] loadFonnteApiKey error:', error);
      // fallback ke ENV jika ada
      const fb = FONNTE_ENV_FALLBACK || null;
      __fonnteKeyCache = { key: fb, ts: now };
      return fb;
    }

    const key = (data?.token_wa || '').trim();
    const val = key || (FONNTE_ENV_FALLBACK || null);
    __fonnteKeyCache = { key: val, ts: now };
    return val;
  } catch (e) {
    console.warn('[Sales] loadFonnteApiKey exception:', e);
    const fb = FONNTE_ENV_FALLBACK || null;
    __fonnteKeyCache = { key: fb, ts: now };
    return fb;
  }
};

// === DEBUG helper ============================================================
const __DBG = true; // true or false buat matikan log
const dbg = (...a:any[]) => { if (__DBG) console.log('[Sales]', ...a); };
// ============================================================================

const formatRupiah = (n: number) => `Rp ${Number(n||0).toLocaleString('id-ID')}`;

const formatRupiahNonSymbol = (n: any) => {
  const num = Number(n) || 0;
  return `${num.toLocaleString('id-ID')}`;
};

// ====== HELPER CETAK NOTA VIA BROWSER (FORMAT BARU) ======
const printReceiptWindow = (params: {
  invoiceNumber?: string;
  customerName?: string;
  items: any[];
  finalAmount: number;
  dpAmount: number;
  paidAmount: number;
  totalPaid: number;
  tempoActive: boolean;
  tempoDate?: string;
  company?: {
    logoUrl?: string;
    companyName?: string;
    address?: string;
    phone?: string;
  };
  bank?: {
    nama_bank?: string;
    rekening?: string;
    nama_akun?: string;
  };
  kasirName?: string;
}) => {
  if (typeof window === 'undefined') return;

  const {
    invoiceNumber,
    customerName,
    items,
    finalAmount,
    dpAmount,
    paidAmount,
    totalPaid,
    tempoActive,
    tempoDate,
    company,
    bank,
    kasirName,
  } = params;

  const sisa = Math.max(finalAmount - totalPaid, 0);
  const status = sisa <= 0 ? 'LUNAS' : 'BELUM LUNAS';

  const now = new Date();
  const tgl = now.toLocaleDateString('id-ID');
  const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const itemsRows = (items || [])
    .map((it: any, idx: number) => {
      const name =
        it?.product_name ||
        it?.nama_produk ||
        it?.nama ||
        `Item ${idx + 1}`;

      const qty = Number(it?.quantity ?? it?.qty ?? 0);

      // --- Ambil harga dengan fallback berurutan ---
      let harga = Number(
        it?.unit_price ??
        it?.harga_satuan ??
        it?.price ??
        it?.harga ??
        0
      );

      // Kalau harga masih 0, coba hitung dari subtotal_per_item / qty
      if ((!harga || isNaN(harga) || harga === 0) && qty > 0) {
        const rawSubtotal = Number(it?.subtotal_per_item ?? it?.subtotal ?? 0);
        if (rawSubtotal > 0) {
          harga = rawSubtotal / qty;
        }
      }

      if (!isFinite(harga)) harga = 0;

      const subtotal = (() => {
        const s = Number(
          it?.subtotal_per_item ??
          it?.subtotal ??
          qty * harga
        );
        return isFinite(s) ? s : 0;
      })();

      return `
        <tr>
          <td style="font-size:10px;" class="left">${name}</td>
          <td style="font-size:10px;" class="right">${formatRupiahNonSymbol(harga)}</td>
          <td style="font-size:10px;" class="center">${qty}</td>
          <td style="font-size:10px;" class="right">${formatRupiahNonSymbol(subtotal)}</td>
        </tr>
      `;
    })
    .join('');

  const bankLine1 = bank
    ? `${bank.nama_bank || ''} A/N ${bank.nama_akun || ''}`
    : '';
  const bankLine2 = bank?.rekening || '';

  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) return;

  w.document.open();
  w.document.write(`
    <html>
      <head>
        <title>Nota Penjualan</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0; /* hilangkan margin halaman */
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            margin: 0;
            padding: 0;
            width: 80mm;       /* lebar fix 80mm */
            margin-left: auto; /* center */
            margin-right: auto;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .left { text-align: left; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; }
          td, th { padding: 2px 0; vertical-align: top; }
          th { border-bottom: 1px solid #000; }
          .info-table td { font-size: 11px; }
          img {
            image-rendering: crisp-edges;
            image-rendering: -webkit-optimize-contrast;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">

        <!-- Header perusahaan -->
        <div class="center">
          ${
            company?.logoUrl
              ? `<img src="${company.logoUrl}" style="width:140px;height:auto;margin-bottom:4px;filter:grayscale(100%) contrast(200%);" />`
              : ''
          }
          <div style="font-size:14px !important; font-weight:bold;"><strong>${company?.companyName || ''}</strong></div>
          <div>${company?.address || ''}</div>
          <div>${company?.phone || ''}</div>
        </div>

        <div class="divider"></div>

        <!-- Info nota dalam bentuk tabel kiri-kanan -->
        <table class="info-table">
          <tr>
            <!-- Kolom kiri -->
            <td class="left" style="vertical-align: top; width: 60%;">
              <table style="width:100%; font-size:11px; border-collapse: collapse;">
                <tr>
                  <td style="width:60px; padding:1px 0;">Nota</td>
                  <td style="padding:1px 0;">:</td>
                  <td style="padding:1px 0;">${invoiceNumber || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:1px 0;">Telp/HP</td>
                  <td style="padding:1px 0;">:</td>
                  <td style="padding:1px 0;">${company?.phone || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:1px 0;">Customer</td>
                  <td style="padding:1px 0;">:</td>
                  <td style="padding:1px 0;">
                    ${customerName ? customerName.charAt(0).toUpperCase() + customerName.slice(1).toLowerCase() : '-'}
                  </td>
                </tr>
              </table>
            </td>

            <!-- Kolom kanan -->
            <td class="left" style="vertical-align: top; width: 40%;">
              <table style="width:100%; font-size:11px;">
                <tr>
                  <td style="width:40px;">Tgl</td>
                  <td>:</td>
                  <td>${tgl}</td>
                </tr>
                <tr>
                  <td>Jam</td>
                  <td>:</td>
                  <td>${jam}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>


        <div class="divider"></div>

        <!-- Tabel produk -->
        <table>
          <thead>
            <tr>
              <th style="font-size:11px;" class="left">Nama Produk</th>
              <th style="font-size:11px;" class="right">Harga</th>
              <th style="font-size:11px;" class="center">Qty</th>
              <th style="font-size:11px;" class="right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="divider"></div>

        <!-- Ringkasan -->
        <table>
          <tbody>
            <tr>
              <td style="font-size:11px;" class="left">Grand total :</td>
              <td style="font-size:11px;" class="right">
                ${formatRupiah(finalAmount).replace(/^Rp\\s*/,'')}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="divider"></div>

        <table>
          <tbody>
            <tr>
              <td style="font-size:11px;" class="left">Sisa :</td>
              <td style="font-size:11px;" class="right">
                ${formatRupiah(sisa).replace(/^Rp\\s*/,'')}
              </td>
            </tr>
            <tr>
              <td style="font-size:11px;" class="left">Bayar :</td>
              <td style="font-size:11px;" class="right">
                ${formatRupiah(paidAmount).replace(/^Rp\\s*/,'')}
              </td>
            </tr>
            <tr>
              <td style="font-size:11px;" class="left">Kembali :</td>
              <td style="font-size:11px;" class="right">
                ${formatRupiah(Math.max(totalPaid - finalAmount, 0)).replace(/^Rp\\s*/,'')}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="divider"></div>

        <!-- Status & Petugas -->
        <table>
          <tbody>
            <tr>
              <td style="font-size:11px;" class="left">Status</td>
              <td style="font-size:11px;" class="right">Petugas</td>
            </tr>
            <tr>
              <td style="font-size:11px;" class="left"><strong>${status}</strong></td>
              <td style="font-size:11px;" class="right">${kasirName || ''}</td>
            </tr>
          </tbody>
        </table>

        ${
          tempoActive && tempoDate
            ? `
          <div style="margin-top:4px;">Tempo : ${new Date(tempoDate).toLocaleDateString('id-ID')}</div>
        `
            : ''
        }

        <!-- Bank transfer -->
        ${
          bankLine1 || bankLine2
            ? `
        <div class="center" style="margin-top:8px;">
          Transfer Ke :<br/>
          ${bankLine1}<br/>
          ${bankLine2}
        </div>
        `
            : ''
        }

      </body>
    </html>
  `);
  w.document.close();
};
// ====== END HELPER CETAK NOTA ======

const formatItemsForWA = (items: Array<any>) => {
  dbg('formatItemsForWA items=', items);
  if (!Array.isArray(items) || items.length === 0) return '-';
  const lines: string[] = [];
  items.forEach((it: any, idx: number) => {
    const nama = it?.product_name || it?.nama_produk || 'Item';
    const qty  = Number(it?.quantity || it?.qty || 0);
    const note = (it?.notes || it?.item_notes || '').toString().trim();

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

// tandai order sudah dikirimi WA (abaikan error kalau kolom belum ada)
const markOrderWaNotified = async (orderId: string) => {
  try {
    const payload: any = { wa_notified: true };
    // kalau kamu punya kolom timestamp, ikut set
    payload.wa_notified_at = new Date().toISOString();

    const { error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', orderId);

    if (error) {
      console.warn('[Sales] markOrderWaNotified error:', error);
      return false;
    }
    console.log('[Sales] markOrderWaNotified OK for order', orderId);
    return true;
  } catch (e) {
    console.warn('[Sales] markOrderWaNotified exception:', e);
    return false;
  }
};


// Pesan dasar (tanpa invoice); invoice bisa ditambahkan setelah save.
const buildWaMessage = (opts: {
  customerName?: string;
  finalAmount: number;
  dpAmount: number;
  paidAmount: number;
  totalPaid: number;
  tempoActive: boolean;
  tempoDate?: string;
  itemsText: string; // <-- baru
}) => {
  dbg('buildWaMessage opts=', opts);
  const sisa   = Math.max(opts.finalAmount - opts.totalPaid, 0);
  const status = sisa <= 0 ? 'LUNAS' : 'BELUM LUNAS';

  const lines = [
    ``,
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

  lines.push('', '*Detail Pesanan:*', opts.itemsText || '-', '', '—', 'Pesan ini dikirim otomatis.');
  return lines.join('\n');
};

// kirim via Fonnte (FE). Untuk produksi, disarankan pakai proxy backend.
const sendWhatsApp = async (target: string, message: string) => {
  const apiKey = await loadFonnteApiKey();
  // dbg('sendWhatsApp -> target=', target, 'len(message)=', message?.length, 'FONNTE_API_KEY?', !!FONNTE_API_KEY);
  if (!apiKey) {
    throw new Error('FONNTE API key not configured.');
  }

  // Kirim sebagai FormData (lebih kompatibel)
  const form = new FormData();
  form.append('target', target);
  form.append('message', message);
  form.append('countryCode', '62'); // opsional: jika target belum pakai 62 di depan

  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': apiKey, // JANGAN set Content-Type, biarkan browser set boundary
    },
    body: form,
  });

  dbg('sendWhatsApp -> response.ok=', res.ok, 'status=', res.status);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[Sales] Fonnte error body:', text);
    throw new Error(`Fonnte error (${res.status}): ${text || 'unknown'}`);
  }
};

type ExistingPayment = {
  id: string;
  created_at?: string | null;
  dp_amount?: number | null;
  paid_amount?: number | null;
  tempo_active?: boolean | null;
  tempo_date?: string | null;
  payment_method?: 'cash' | 'bank_transfer' | string | null;
  bank_name?: string | null;
};

// Ekstrak semua "Payment Details: {...}" di orders.notes → array ExistingPayment
const extractPaymentsFromNotes = (notes?: string): ExistingPayment[] => {
  dbg('extractPaymentsFromNotes notes len=', notes?.length);
  if (!notes) return [];
  const results: ExistingPayment[] = [];
  const regex = /Payment Details:\s*({[\s\S]*?})/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(notes)) !== null) {
    try {
      const obj = JSON.parse(match[1]);
      results.push({
        id: `notes-${results.length + 1}`,
        created_at: null,
        dp_amount: Number(obj?.dp_amount ?? 0),
        paid_amount: Number(obj?.paid_amount ?? 0),
        tempo_active: Boolean(obj?.tempo_active),
        tempo_date: obj?.tempo_date || null,
        payment_method: (obj?.payment_method as any) || null,
        bank_name: obj?.bank_name || null,
      });
    } catch (e) {
      console.warn('[Sales] parse payment details failed:', e);
    }
  }
  dbg('extractPaymentsFromNotes -> count=', results.length);
  return results;
};

const Sales: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const loadOrderId = (location.state as { loadOrderId?: string })?.loadOrderId;

  const { profile } = useSession();
  const canPay = isKasirOrSuperAdmin(profile?.role);

  const kasirName = profile
  ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
  : '-';

  // App settings untuk logo + identitas perusahaan
  const [appSettings, setAppSettings] = React.useState<{
    logo_url?: string;
    nama_perusahaan?: string;
    alamat?: string;
    telepon?: string;
  } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('logo_url, nama_perusahaan, alamat, telepon')
          .maybeSingle();

        if (error) {
          console.warn('[Sales] load app_settings for print error:', error);
          return;
        }
        setAppSettings(data || null);
      } catch (e) {
        console.warn('[Sales] load app_settings exception:', e);
      }
    })();
  }, []);

  const [reloadingProducts, setReloadingProducts] = useState(false);

  // === [WA ADD] — state WA DIPINDAH KE DALAM KOMPONEN ===
  const [showWaPrompt, setShowWaPrompt] = useState(false);
  const [waInput, setWaInput] = useState<string>('');
  const [waPendingDetail, setWaPendingDetail] = useState<null | {
    msg: string;
    navigateTo?: 'history' | 'sales';
    orderId?: string;
  }>(null);
  const [savingWa, setSavingWa] = useState(false);
  // =====================================================

  // 2) Handler baru untuk tombol "Pilih Produk"
  const handleOpenSelectProductWithReload = async () => {
    setReloadingProducts(true);
    try {
      dbg('reload master data before open select product');
      await fetchAllSalesData();
    } catch (e) {
      console.warn('Gagal reload data produk:', e);
    } finally {
      setReloadingProducts(false);
      dbg('open SelectProductModal');
      setShowSelectProductModal(true);
    }
  };

  const fetchOrderCustomerIfMissing = async () => {
    try {
      if (!loadOrderId) return null;
      if (orderFormData?.customer_id) {
        dbg('fetchOrderCustomerIfMissing: sudah punya cid=', orderFormData.customer_id);
        return orderFormData.customer_id;
      }
  
      dbg('fetchOrderCustomerIfMissing: query orders for loadOrderId=', loadOrderId);
      const { data, error } = await supabase
        .from('orders')
        .select('customer_id, pelanggan:customer_id(id, telepon)')
        .eq('id', loadOrderId)
        .maybeSingle();
  
      if (error) {
        dbg('fetchOrderCustomerIfMissing error', error);
        return null;
      }
  
      const pelangganRow = Array.isArray(data?.pelanggan) ? data.pelanggan[0] : data?.pelanggan;
      const cid = data?.customer_id || pelangganRow?.id || null;
      const tel = pelangganRow?.telepon || '';
  
      if (cid) {
        dbg('fetchOrderCustomerIfMissing: hydrate cid=', cid, ' tel=', tel);
        setOrderFormData((prev:any) => ({
          ...prev,
          customer_id: cid,
          customer_phone: tel || (prev?.customer_phone ?? ''),
        }));
        return cid as string;
      }
  
      dbg('fetchOrderCustomerIfMissing: tidak ada customer di order');
      return null;
    } catch (e:any) {
      dbg('fetchOrderCustomerIfMissing exception', e?.message || e);
      return null;
    }
  };

  const upsertAnonymousCustomerWithPhone = async (normalizedPhone: string): Promise<string | null> => {
    try {
      const name =
        (orderFormData.customer_name ||
          (orderFormData as any).customer_display_name ||
          '').trim() || '(Tanpa Nama)';
  
      const address = (orderFormData.customer_address || '').trim();
      const notes   = (orderFormData.customer_notes || '').trim();
  
      dbg('upsertAnonymousCustomerWithPhone start (no onConflict)', { name, normalizedPhone });
  
      // 1) cek apakah sudah ada by telepon
      const { data: found, error: findErr } = await supabase
        .from('pelanggan')
        .select('id')
        .eq('telepon', normalizedPhone)
        .limit(1);
  
      if (findErr) {
        dbg('find pelanggan by telepon error', findErr);
        showError(`Gagal cek pelanggan (WA): ${findErr.message}`);
        return null;
      }
  
      // 2) kalau ADA → update data pelengkap (optional)
      if (Array.isArray(found) && found[0]?.id) {
        const cid = String(found[0].id);
        dbg('pelanggan sudah ada, update optional fields cid=', cid);
  
        const { error: upErr } = await supabase
          .from('pelanggan')
          .update({
            nama_pelanggan: name || null,
            alamat: address || null,
            catatan: notes  || null,
          })
          .eq('id', cid);
  
        if (upErr) {
          dbg('update pelanggan (optional fields) error', upErr);
          // tidak fatal: tetap lanjut return cid supaya alur tidak terblokir
        }
  
        dbg('upsertAnonymousCustomerWithPhone done (existing)', { cid });
        return cid;
      }
  
      // 3) kalau TIDAK ADA → insert baris baru
      dbg('pelanggan belum ada, insert baru');
      const { data: inserted, error: insErr } = await supabase
        .from('pelanggan')
        .insert([{
          nama_pelanggan: name,
          telepon: normalizedPhone,
          alamat: address || null,
          catatan: notes  || null,
        }])
        .select('id')
        .limit(1);
  
      if (insErr) {
        dbg('insert pelanggan error', insErr);
        showError(`Gagal menyimpan pelanggan (WA): ${insErr.message}`);
        return null;
      }
  
      const newId = inserted?.[0]?.id ?? null;
      dbg('upsertAnonymousCustomerWithPhone done (inserted)', { newId });
      return newId;
    } catch (e: any) {
      dbg('upsertAnonymousCustomerWithPhone exception', e?.message || e);
      showError(e?.message || 'Gagal menyimpan pelanggan (WA).');
      return null;
    }
  };

  const {
    customerOptions,
    productOptions,
    designerOptions,
    finishingOptions,
    bahanOptions,
    bankOptions,
    loadingData,
    errorData,
    fetchAllSalesData,
  } = useSalesData();

  const { fetchPendingSales } = useHistoryPendingSalesData({ startDate: '', endDate: '', searchTerm: '' });

  const {
    orderFormData,
    setOrderFormData,
    resetOrderForm,
    selectedProduct,
    itemQuantity,
    setItemQuantity,
    itemNotes,
    setItemNotes,
    itemDimensions,
    setItemDimensions,
    itemDiscount,
    setItemDiscount,
    itemAdditionalOptions,
    currentItemSubtotal,
    handleFormChange,
    handleSelectCustomer,
    handleSelectProduct,
    handleUpdateProductDetailsFromModal,
    handleAddItemToOrder,
    handleRemoveItem,
    handleUpdateItemDesigner,
    handleSaveOrder,
  } = useSalesOrder(loadOrderId, productOptions, designerOptions, customerOptions, fetchPendingSales);

  const [showSelectCustomerModal, setShowSelectCustomerModal] = useState(false);
  const [showSelectProductModal, setShowSelectProductModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSaveCustomerConfirm, setShowSaveCustomerConfirm] = useState(false);
  const [postConfirmAction, setPostConfirmAction] = useState<'pending' | 'payment' | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // === Ambil user login untuk isi designer_id pada insert pertama ===
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) {
        console.warn('getUser error:', error);
        return;
      }
      dbg('supabase.auth.getUser ->', data?.user?.id);
      setCurrentUserId(data?.user?.id);
    })();
    return () => { mounted = false; };
  }, []);

  const [existingPayments, setExistingPayments] = useState<ExistingPayment[]>([]);

  // Helper: pastikan designer_id terisi user yang input pertama
  const ensureDesignerId = async () => {
    if (!orderFormData?.designer_id && currentUserId) {
      dbg('ensureDesignerId -> set designer_id =', currentUserId);
      setOrderFormData((prev: any) => ({ ...prev, designer_id: currentUserId }));
      await new Promise((r) => setTimeout(r, 0));
    }
  };

  const normalizePhone = (raw?: string) => {
    dbg('normalizePhone raw=', raw);
    if (!raw) return '';
    let digits = raw.replace(/\D+/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.startsWith('62')) digits = digits.slice(2);
    const result = '62' + digits;
    dbg('normalizePhone result=', result);
    return result;
  };

  const saveCustomerPhoneToDB = async (customerId: string, normalized: string): Promise<boolean> => {
    dbg('saveCustomerPhoneToDB -> id=', customerId, 'phone=', normalized);
    const { error } = await supabase
      .from('pelanggan')
      .update({ telepon: normalized })
      .eq('id', customerId);

    if (error) {
      console.error('[Sales] Gagal update nomor WA:', error);
      showError(`Gagal menyimpan nomor WA: ${error.message}`);
      return false;
    }

    dbg('saveCustomerPhoneToDB -> SUCCESS');
    return true;
  };

  const checkCustomerExistsByPhone = async (phoneRaw: string) => {
    dbg('checkCustomerExistsByPhone phoneRaw=', phoneRaw);
    const normalized = normalizePhone(phoneRaw);
    const { data, error } = await supabase
      .from('pelanggan')
      .select('id')
      .or(`telepon.eq.${normalized},telepon.eq.${phoneRaw}`)
      .limit(1);

    dbg('checkCustomerExistsByPhone -> error=', error, 'data=', data);
    if (error) {
      console.warn('checkCustomerExistsByPhone error', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  };

  const maybeAskToSaveCustomer = async (nextAction: 'pending' | 'payment'): Promise<boolean> => {
    dbg('maybeAskToSaveCustomer action=', nextAction, 'loadOrderId=', loadOrderId, 'customer_id=', orderFormData.customer_id);
    if (loadOrderId) return true;
    if (orderFormData.customer_id) return true;
    const phoneRaw = (orderFormData.customer_phone || '').trim();
    dbg('maybeAskToSaveCustomer phoneRaw=', phoneRaw);
    if (!phoneRaw) return true;

    const exists = await checkCustomerExistsByPhone(phoneRaw);
    dbg('maybeAskToSaveCustomer existsByPhone=', exists);
    if (exists) return true;

    setPostConfirmAction(nextAction);
    setShowSaveCustomerConfirm(true);
    return false;
  };

  const persistCustomerNotes = async (): Promise<boolean> => {
    const notes = (orderFormData.customer_notes || '').trim();
    dbg('persistCustomerNotes cid=', orderFormData.customer_id, 'notes=', notes);
    if (!orderFormData.customer_id) return true;
    const { error } = await supabase
      .from('pelanggan')
      .update({ catatan: notes || null })
      .eq('id', orderFormData.customer_id);
    if (error) {
      console.warn('persistCustomerNotes error', error);
      return false;
    }
    return true;
  };

  const saveCustomerNow = async () => {
    setSavingCustomer(true);
    try {
      const name =
        (orderFormData.customer_name ||
          (orderFormData as any).customer_display_name ||
          '').trim() || '(Tanpa Nama)';

      const phoneRaw =
        (orderFormData.customer_phone ||
          (orderFormData as any).customer_display_phone ||
          '').trim();

      const address = (orderFormData.customer_address || '').trim();
      const notes = (orderFormData.customer_notes || '').trim();
      const normalized = phoneRaw ? normalizePhone(phoneRaw) : null;

      dbg('saveCustomerNow payload=', { name, phoneRaw, normalized, address, notes });

      const upsertRes = await supabase
        .from('pelanggan')
        .upsert(
          {
            nama_pelanggan: name,
            telepon: normalized || null,
            alamat: address || null,
            catatan: notes || null,
          }
        )
        .select('id');

      dbg('saveCustomerNow upsert result=', upsertRes);

      if (upsertRes.error) {
        console.error('upsert pelanggan error:', upsertRes.error);
        showError(upsertRes.error.message || 'Gagal menyimpan data pelanggan.');
        return false;
      }

      let newId = upsertRes.data?.[0]?.id;

      if (!newId) {
        const findRes = await supabase
        .from('pelanggan')
        .select('id')
        .or(
          normalized && phoneRaw
            ? `telepon.eq.${normalized},telepon.eq.${phoneRaw}`
            : phoneRaw
            ? `telepon.eq.${phoneRaw}`
            : 'id.gt.0'
        )
        .limit(1);
        dbg('saveCustomerNow find-after-upsert=', findRes);

        if (findRes.error) {
          console.warn('find-after-upsert error:', findRes.error);
        } else {
          newId = findRes.data?.[0]?.id;
        }
      }

      if (!newId) {
        showError('Pelanggan tidak ditemukan setelah disimpan. Cek RLS/Policy dan unique index.');
        return false;
      }

      dbg('saveCustomerNow -> set customer_id=', newId);
      setOrderFormData((prev: any) => ({ ...prev, customer_id: newId }));
      await persistCustomerNotes();
      return true;
    } catch (e: any) {
      console.error('saveCustomerNow exception', e);
      showError(e?.message || 'Terjadi kesalahan saat menyimpan pelanggan.');
      return false;
    } finally {
      setSavingCustomer(false);
      setShowSaveCustomerConfirm(false);
    }
  };

  const handleOpenProductDetailModal = () => {
    dbg('handleOpenProductDetailModal selectedProduct=', selectedProduct);
    if (!selectedProduct) {
      showError('Pilih produk terlebih dahulu untuk melihat detail.');
      return;
    }
    setShowProductDetailModal(true);
  };

  const handleOpenPaymentModal = async () => {
    dbg('handleOpenPaymentModal items.length=', orderFormData.items?.length);
    if (orderFormData.items.length === 0) {
      showError('Keranjang belanja kosong. Tambahkan item terlebih dahulu.');
      return;
    }
    const canProceed = await maybeAskToSaveCustomer('payment');
    dbg('handleOpenPaymentModal canProceed=', canProceed);
    if (!canProceed) return;

    await ensureDesignerId();

    let list: ExistingPayment[] = extractPaymentsFromNotes(orderFormData.notes);

    setExistingPayments(list);
    setShowPaymentModal(true);
  };

  React.useEffect(() => {
    if (!loadOrderId) {
      dbg('effect(loadOrderId) resetOrderForm');
      resetOrderForm();
      setExistingPayments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrderId]);

  React.useEffect(() => {
    if (!loadOrderId) return;
    (async () => {
      const cid = await fetchOrderCustomerIfMissing();
      dbg('effect hydrate from order -> cid=', cid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrderId]);

  React.useEffect(() => {
    if (!loadOrderId) return;
    const cid = orderFormData.customer_id;
    if (!cid) return;

    let cancelled = false;
    (async () => {
      dbg('effect sync customer_notes for cid=', cid);
      const { data, error } = await supabase
        .from('pelanggan')
        .select('catatan')
        .eq('id', cid)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn('Gagal ambil catatan pelanggan:', error);
        return;
      }

      setOrderFormData((prev: any) => ({
        ...prev,
        customer_notes: data?.catatan || '',
      }));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrderId, orderFormData.customer_id]);

  type PaymentDetailsFromModal = {
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
  };

  // const handleProcessPayment = async (
  //   detail: PaymentDetailsFromModal,
  //   options?: { skipPrint?: boolean }
  // ) => {
  //   dbg('handleProcessPayment detail=', detail, 'orderFormData=', orderFormData);
  //   try {
  //     if (orderFormData.customer_id) {
  //       await persistCustomerNotes();
  //     }

  //     const targetName = (orderFormData.customer_name || (orderFormData as any).customer_display_name || '').trim();
  //     const itemsText  = formatItemsForWA(orderFormData.items);

  //     // 🚫 Cegah kirim WA ulang kalau sudah pernah dikirim
  //     let shouldSendWA = true;
  //     if (loadOrderId) {
  //       const { data: existingOrder, error: fetchErr } = await supabase
  //         .from('orders')
  //         .select('wa_notified')
  //         .eq('id', loadOrderId)
  //         .maybeSingle();

  //       if (!fetchErr && existingOrder?.wa_notified) {
  //         dbg('Order sudah wa_notified = true → WA akan dilewati, tapi order tetap disimpan');
  //         shouldSendWA = false; // <-- penting
  //       }
  //     }

  //     const baseMsg = buildWaMessage({
  //       customerName: targetName,
  //       finalAmount: detail.final_amount,
  //       dpAmount: Number(detail.dp_amount || 0),
  //       paidAmount: Number(detail.paid_amount || 0),
  //       totalPaid: Number(detail.total_paid || 0),
  //       tempoActive: !!detail.tempo_active,
  //       tempoDate: detail.tempo_date,
  //       itemsText,
  //     });

  //     await ensureDesignerId();

  //     const status: 'paid' | 'pending' =
  //       detail?.payment_status ?? (detail.total_paid >= detail.final_amount ? 'paid' : 'pending');

  //     dbg('handleProcessPayment -> handleSaveOrder status=', status);
  //     await handleSaveOrder(status, detail, { ...(options || {}), suppressReadyPopup: true });

  //     // Ambil invoice terakhir (atau pakai loadOrderId)
  //     let invoice = '';
  //     let orderIdForFlag: string | undefined = loadOrderId;

  //     try {
  //       const q = supabase
  //         .from('orders')
  //         .select('id, invoice_number, created_at, final_amount, payment_status')
  //         .eq('kasir_id', currentUserId as string)
  //         .order('created_at', { ascending: false })
  //         .limit(1);

  //       const { data: last, error: lastErr } = await q;
  //       dbg('fetch last order by kasir -> err=', lastErr, 'data=', last);

  //       if (!orderIdForFlag && Array.isArray(last) && last[0]) {
  //         orderIdForFlag = String(last[0].id);
  //       }
  //       if (!lastErr && Array.isArray(last) && last[0]?.invoice_number) {
  //         invoice = String(last[0].invoice_number);
  //       }
  //     } catch (e) {
  //       console.warn('Gagal ambil invoice terbaru:', e);
  //     }

  //     const finalMsg = invoice ? `*Invoice:* ${invoice}\n${baseMsg}` : baseMsg;

  //     // ⛔️ Jika sudah wa_notified, SKIP bagian kirim WA seluruhnya
  //     if (!shouldSendWA) {
  //       dbg('Skip kirim WA karena wa_notified sudah TRUE');
  //       if (loadOrderId) {
  //         navigate('/dashboard/history-pending');
  //       } else {
  //         navigate('/dashboard/sales', { replace: true });
  //       }
  //       return; // <-- penting
  //     }

  //     // ===== Kirim WA hanya jika shouldSendWA = true =====
  //     let phoneRaw = (orderFormData.customer_phone || (orderFormData as any).customer_display_phone || '').trim();
  //     dbg('handleProcessPayment phoneRaw(before)=', phoneRaw);

  //     if (!phoneRaw) {
  //       // tidak ada nomor → buka prompt WA, kirim setelah user input
  //       dbg('open WA prompt because phone empty (shouldSendWA = true)');
  //       setWaPendingDetail({
  //         msg: finalMsg,
  //         navigateTo: loadOrderId ? 'history' : 'sales',
  //         orderId: orderIdForFlag,
  //       });
  //       setWaInput('08');
  //       setShowWaPrompt(true);
  //       return;
  //     }

  //     const normalized = normalizePhone(phoneRaw);
  //     try {
  //       await sendWhatsApp(normalized, finalMsg);
  //       if (orderIdForFlag) {
  //         await markOrderWaNotified(orderIdForFlag);
  //       } else {
  //         console.warn('[Sales] orderIdForFlag kosong, tidak bisa update wa_notified');
  //       }
  //     } catch (e) {
  //       console.warn('sendWhatsApp error', e);
  //     }

  //     if (loadOrderId) {
  //       navigate('/dashboard/history-pending');
  //     } else {
  //       navigate('/dashboard/sales', { replace: true });
  //     }
  //   } catch (err: any) {
  //     console.error(err);
  //     showError(err?.message || 'Gagal memproses pembayaran.');
  //   }
  // };

  const handleProcessPayment = async (
    detail: PaymentDetailsFromModal,
    options?: { skipPrint?: boolean } // boleh dibiarkan, tapi sudah tidak dipakai
  ) => {
    dbg('handleProcessPayment detail=', detail, 'orderFormData=', orderFormData);
    try {
      if (orderFormData.customer_id) {
        await persistCustomerNotes();
      }

      const targetName = (orderFormData.customer_name || (orderFormData as any).customer_display_name || '').trim();
      const itemsText  = formatItemsForWA(orderFormData.items);

      // 🚫 Cegah kirim WA ulang kalau sudah pernah dikirim
      let shouldSendWA = true;
      if (loadOrderId) {
        const { data: existingOrder, error: fetchErr } = await supabase
          .from('orders')
          .select('wa_notified')
          .eq('id', loadOrderId)
          .maybeSingle();

        if (!fetchErr && existingOrder?.wa_notified) {
          dbg('Order sudah wa_notified = true → WA akan dilewati, tapi order tetap disimpan');
          shouldSendWA = false;
        }
      }

      const baseMsg = buildWaMessage({
        customerName: targetName,
        finalAmount: detail.final_amount,
        dpAmount: Number(detail.dp_amount || 0),
        paidAmount: Number(detail.paid_amount || 0),
        totalPaid: Number(detail.total_paid || 0),
        tempoActive: !!detail.tempo_active,
        tempoDate: detail.tempo_date,
        itemsText,
      });

      await ensureDesignerId();

      const status: 'paid' | 'pending' =
        detail?.payment_status ?? (detail.total_paid >= detail.final_amount ? 'paid' : 'pending');

      dbg('handleProcessPayment -> handleSaveOrder status=', status);
      await handleSaveOrder(status, detail, { ...(options || {}), suppressReadyPopup: true });

      // ========= Ambil invoice & orderId =========
      let invoice = '';
      let orderIdForFlag: string | undefined = loadOrderId;

      try {
        const q = supabase
          .from('orders')
          .select('id, invoice_number, created_at, final_amount, payment_status')
          .eq('kasir_id', currentUserId as string)
          .order('created_at', { ascending: false })
          .limit(1);

        const { data: last, error: lastErr } = await q;
        dbg('fetch last order by kasir -> err=', lastErr, 'data=', last);

        if (!orderIdForFlag && Array.isArray(last) && last[0]) {
          orderIdForFlag = String(last[0].id);
        }
        if (!lastErr && Array.isArray(last) && last[0]?.invoice_number) {
          invoice = String(last[0].invoice_number);
        }
      } catch (e) {
        console.warn('Gagal ambil invoice terbaru:', e);
      }

      // === Set siap_cetak_at saat user klik "Bayar & Cetak Nota" ===
      try {
        if (orderIdForFlag) {
          await supabase
            .from('orders')
            .update({
              siap_cetak_at: new Date().toISOString(),
            })
            .eq('id', orderIdForFlag)
            .is('siap_cetak_at', null); // kalau mau hanya di-set sekali
        }
      } catch (e) {
        console.warn('Gagal update siap_cetak_at:', e);
      }

      const finalMsg = invoice ? `*Invoice:* ${invoice}\n${baseMsg}` : baseMsg;

      // ========= 🖨 CETAK NOTA via window.print() =========
      const primaryBank = (bankOptions && bankOptions.length > 0) ? bankOptions[0] : undefined;

      printReceiptWindow({
        invoiceNumber: invoice,
        customerName: targetName,
        items: orderFormData.items ?? [],
        finalAmount: detail.final_amount,
        dpAmount: detail.dp_amount,
        paidAmount: detail.paid_amount,
        totalPaid: detail.total_paid,
        tempoActive: !!detail.tempo_active,
        tempoDate: detail.tempo_date,
        company: {
          logoUrl: appSettings?.logo_url || '',
          companyName: appSettings?.nama_perusahaan || '',
          address: appSettings?.alamat || '',
          phone: appSettings?.telepon || '',
        },
        bank: primaryBank
          ? {
              nama_bank: primaryBank.nama_bank,
              rekening: primaryBank.rekening,
              nama_akun: primaryBank.nama_akun,
            }
          : undefined,
        kasirName,
      });

      // ========= WA LOGIC =========
      if (!shouldSendWA) {
        dbg('Skip kirim WA karena wa_notified sudah TRUE');
        if (loadOrderId) {
          navigate('/dashboard/history-pending');
        } else {
          navigate('/dashboard/sales', { replace: true });
        }
        return;
      }

      let phoneRaw = (orderFormData.customer_phone || (orderFormData as any).customer_display_phone || '').trim();
      dbg('handleProcessPayment phoneRaw(before)=', phoneRaw);

      if (!phoneRaw) {
        // tidak ada nomor → buka prompt WA, kirim setelah user input
        dbg('open WA prompt because phone empty (shouldSendWA = true)');
        setWaPendingDetail({
          msg: finalMsg,
          navigateTo: loadOrderId ? 'history' : 'sales',
          orderId: orderIdForFlag,
        });
        setWaInput('08');
        setShowWaPrompt(true);
        return;
      }

      const normalized = normalizePhone(phoneRaw);
      try {
        await sendWhatsApp(normalized, finalMsg);
        if (orderIdForFlag) {
          await markOrderWaNotified(orderIdForFlag);
        } else {
          console.warn('[Sales] orderIdForFlag kosong, tidak bisa update wa_notified');
        }
      } catch (e) {
        console.warn('sendWhatsApp error', e);
      }

      if (loadOrderId) {
        navigate('/dashboard/history-pending');
      } else {
        navigate('/dashboard/sales', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'Gagal memproses pembayaran.');
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data penjualan...</p>
      </div>
    );
  }

  if (errorData) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {errorData}</p>
        <button onClick={fetchAllSalesData} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  const effectiveOrderStatus = (orderFormData as any)?.order_status ?? 'new';

  dbg('render Sales: cid=', orderFormData.customer_id, 'cphone=', orderFormData.customer_phone, 'items=', orderFormData.items?.length);

  return (
    <div className="h-full w-full space-y-6 p-6 bg-gray-100 flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-900">Transaksi Penjualan</h1>
        {/* <PrinterStatusBadge /> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Left Column */}
        <div className="lg:col-span-1 flex flex-col space-y-6 overflow-y-auto">
          <CustomerForm
            formData={orderFormData}
            onFormChange={(e: any) => { dbg('CustomerForm.onFormChange name=', e?.target?.name, 'value=', e?.target?.value); handleFormChange(e); }}
            onSelectCustomerClick={() => { dbg('open SelectCustomerModal'); setShowSelectCustomerModal(true); }}
          />
          <ProductInputForm
            selectedProduct={selectedProduct}
            itemQuantity={itemQuantity}
            setItemQuantity={(v: any) => { dbg('setItemQuantity', v); setItemQuantity(v); }}
            itemNotes={itemNotes}
            setItemNotes={(v: any) => { dbg('setItemNotes', v); setItemNotes(v); }}
            itemDimensions={itemDimensions}
            setItemDimensions={(v: any) => { dbg('setItemDimensions', v); setItemDimensions(v); }}
            itemDiscount={itemDiscount}
            setItemDiscount={(v: any) => { dbg('setItemDiscount', v); setItemDiscount(v); }}
            onSelectProductClick={handleOpenSelectProductWithReload}
            onAddItemToOrder={() => { dbg('onAddItemToOrder'); handleAddItemToOrder(); }}
            onOpenProductDetailModal={handleOpenProductDetailModal}
          />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col space-y-6 overflow-y-auto">
          <OrderItemsTable
            items={orderFormData.items}
            designerOptions={designerOptions}
            onRemoveItem={(id: any) => { dbg('onRemoveItem', id); handleRemoveItem(id); }}
            onUpdateItemDesigner={(...a:any[])=>{ dbg('onUpdateItemDesigner args=', a); (handleUpdateItemDesigner as any)(...a); }}
            currentUserId={currentUserId}
            orderStatus={effectiveOrderStatus}
          />
          <OrderSummary
            totalAmount={orderFormData.total_amount}
            discountAmount={orderFormData.discount_amount}
            taxAmount={orderFormData.tax_amount}
            cartFinalAmount={orderFormData.final_amount}
            currentItemSubtotal={currentItemSubtotal}
            canPay={canPay}
            onSavePending={async () => {
              dbg('onSavePending click');
              if (!loadOrderId) {
                const canProceed = await maybeAskToSaveCustomer('pending');
                dbg('onSavePending canProceed=', canProceed);
                if (!canProceed) return;
              }
              if (orderFormData.customer_id) {
                await persistCustomerNotes();
              }
              await ensureDesignerId();

              await handleSaveOrder('pending');
              if (loadOrderId) {
                navigate('/dashboard/history-pending');
              } else {
                navigate('/dashboard/sales', { replace: true });
              }
            }}
            onOpenPaymentModal={handleOpenPaymentModal}
          />
        </div>
      </div>

      {/* Modals */}
      {showSelectCustomerModal && (
        <SelectCustomerModal
          onClose={() => { dbg('close SelectCustomerModal'); setShowSelectCustomerModal(false); }}
          onSelect={(c) => {
            dbg('SelectCustomerModal.onSelect c=', c);
            if (handleSelectCustomer) {
              handleSelectCustomer(c as any);
            }
            setOrderFormData((prev: any) => ({
              ...prev,
              customer_id: c.id,
              customer_name: c.nama_pelanggan || '',
              customer_phone: c.telepon || '',
              customer_address: c.alamat || '',
              customer_notes: c.catatan || ''
            }));
            setShowSelectCustomerModal(false);
          }}
          customerOptions={customerOptions}
        />
      )}

      {showSelectProductModal && (
        <SelectProductModal
          onClose={() => { dbg('close SelectProductModal'); setShowSelectProductModal(false); }}
          onSelect={(p) => { dbg('SelectProductModal.onSelect product=', p); handleSelectProduct(p); }}
          productOptions={productOptions}
        />
      )}

      {showProductDetailModal && selectedProduct && (
        <ProductDetailModal
          isOpen={showProductDetailModal}
          onClose={() => { dbg('close ProductDetailModal'); setShowProductDetailModal(false); }}
          product={selectedProduct}
          initialQuantity={itemQuantity}
          initialDimensions={itemDimensions}
          initialAdditionalOptions={itemAdditionalOptions}
          finishingOptions={finishingOptions}
          bahanOptions={bahanOptions}
          onSave={(...args: Parameters<typeof handleUpdateProductDetailsFromModal>) => {
            dbg('ProductDetailModal.onSave args=', args);
            handleUpdateProductDetailsFromModal(...args);
          }}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => { dbg('close PaymentModal'); setShowPaymentModal(false); }}
          finalAmount={orderFormData.final_amount}
          bankOptions={bankOptions}
          onProcessPayment={(...a:any[])=>{ dbg('PaymentModal.onProcessPayment args=', a); (handleProcessPayment as any)(...a); }}
          existingPayments={existingPayments}
        />
      )}

      {/* Modal input nomor WA jika kosong */}
      {showWaPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Nomor WhatsApp</h3>
            <p className="text-gray-700 mb-4">
              Nomor WhatsApp pelanggan belum ada. Masukkan nomor (contoh: 08xxxxxxxxxx).
            </p>

            <input
              type="tel"
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              value={waInput}
              onChange={(e) => { dbg('WA input change=', e.target.value); setWaInput(e.target.value); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => { dbg('WA prompt cancel'); setShowWaPrompt(false); setWaPendingDetail(null); }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={savingWa}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingWa || !waInput.trim()}
                onClick={async () => {
                  if (!waPendingDetail) return;
                  setSavingWa(true);
                  try {
                    const normalized = normalizePhone(waInput.trim());
                    console.log('[Sales] WA prompt SAVE click, normalized=', normalized, 'cid=', orderFormData.customer_id, 'loadOrderId=', loadOrderId);
                
                    // ======== (1) Simpan nomor ke DB / state seperti logic kamu sekarang ========
                    if (orderFormData.customer_id) {
                      const ok = await saveCustomerPhoneToDB(String(orderFormData.customer_id), normalized);
                      if (!ok) return; // kalau gagal simpan, jangan lanjut kirim WA
                      setOrderFormData((prev: any) => ({ ...prev, customer_phone: normalized }));
                    } else {
                      // (opsional) coba hydrate customer dari order kalau ini mode edit
                      // (kamu tadi sudah punya fetchOrderCustomerIfMissing, boleh dipakai di sini juga)
                      setOrderFormData((prev: any) => ({ ...prev, customer_phone: normalized }));
                    }
                
                    // ======== (2) Kirim WA ========
                    try {
                      await sendWhatsApp(normalized, waPendingDetail.msg);
                      console.log('[Sales] sendWhatsApp OK');
                
                      // ======== (3) ✅ Tandai order kalau ada orderId yang valid ========
                      if (waPendingDetail.orderId) {
                        await markOrderWaNotified(waPendingDetail.orderId);
                      }
                    } catch (e:any) {
                      console.error('[Sales] Gagal kirim WA:', e);
                      showError(`Gagal kirim WA: ${e?.message || e}`);
                      return; // ❌ gagal -> jangan update flag, dan jangan navigate
                    }
                
                    // ======== (4) Tutup modal & navigate ========
                    setShowWaPrompt(false);
                    const dest = waPendingDetail.navigateTo;
                    setWaPendingDetail(null);
                    if (dest === 'history') {
                      navigate('/dashboard/history-pending');
                    } else {
                      navigate('/dashboard/sales', { replace: true });
                    }
                  } finally {
                    setSavingWa(false);
                  }
                }}                
                className={`px-4 py-2 rounded-lg text-white ${savingWa ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {savingWa ? 'Menyimpan...' : 'Simpan & Kirim WA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveCustomerConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Konfirmasi</h3>
            <p className="text-gray-700 mb-6">Apakah ingin menyimpan data pembeli di database?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={async () => {
                  dbg('SaveCustomerConfirm: YA');
                  const ok = await saveCustomerNow();
                  dbg('SaveCustomerConfirm: result ok=', ok);
                  if (!ok) return;
                  if (postConfirmAction === 'pending') {
                    await ensureDesignerId();
                    await handleSaveOrder('pending');
                    if (loadOrderId) {
                      navigate('/dashboard/history-pending');
                    } else {
                      navigate('/dashboard/sales', { replace: true });
                    }
                  } else if (postConfirmAction === 'payment') {
                    await ensureDesignerId();
                    setShowPaymentModal(true);
                  }
                }}
                disabled={savingCustomer}
                className={`px-4 py-2 rounded-lg text-white ${savingCustomer ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Ya
              </button>
              <button
                type="button"
                onClick={async () => {
                  dbg('SaveCustomerConfirm: TIDAK');
                  setShowSaveCustomerConfirm(false);
                  if (postConfirmAction === 'pending') {
                    await ensureDesignerId();
                    await handleSaveOrder('pending');
                    if (loadOrderId) {
                      navigate('/dashboard/history-pending');
                    } else {
                      navigate('/dashboard/sales', { replace: true });
                    }
                  } else if (postConfirmAction === 'payment') {
                    await ensureDesignerId();
                    setShowPaymentModal(true);
                  }
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Tidak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
