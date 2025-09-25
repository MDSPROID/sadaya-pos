// src/pages/StatusOrderProcess.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import { showError, showLoading, showSuccess, dismissToast } from '../utils/toast';

type AdditionalOption = {
  id: string;
  name: string;
  cost: number;
  quantity: number;
  selected?: boolean;
};

type ItemDimensions = {
  panjang?: number;
  lebar?: number;
  satuan?: string;
  tebal_bahan_id?: string;
  tebal_bahan_nama?: string;
  additional_options?: AdditionalOption[];
} | null;

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  subtotal_per_item: number;
  notes_per_item: string | null;
  dimensions?: ItemDimensions;
};

type OrderRow = {
  id: string;
  created_at: string;
  order_date: string;
  pickup_date: string | null;
  invoice_number: string | null;
  customer_id: string | null;
  customer_display_name: string | null;
  customer_display_phone: string | null;
  kasir_id: string | null;
  operator_id: string | null;
  designer_id: string | null;
  finishing_id: string | null;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  payment_status: 'pending' | 'paid';
  order_status: string; // 'new' | 'proses_cetak' | 'siap_ambil'
  notes: string | null;
  priority: string;
  ready_status: 'ready' | 'not_ready';
  order_items: OrderItem[];
};

const formatRupiah = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const ucfirst = (s?: string | null) => {
  const str = (s ?? '').toString().trim();
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
};

// Render teks "Ukuran" persis gaya di OrderItemTable.tsx
const renderUkuran = (dims?: ItemDimensions) => {
  if (!dims) return '-';
  const p = dims.panjang ?? '';
  const l = dims.lebar ?? '';
  const satuan = dims.satuan ?? '';
  const ukuranUtama =
    (p || l || satuan)
      ? `${p || 0}x${l || 0} ${satuan}`.trim()
      : '';

  const tebal = dims.tebal_bahan_nama ? ` (${dims.tebal_bahan_nama})` : '';

  const tambahan =
    dims.additional_options && dims.additional_options.length > 0
      ? (
        <div className="text-xs text-gray-600 mt-1">
          {dims.additional_options.map(opt => `${opt.name} (${opt.quantity})`).join(', ')}
        </div>
      )
      : null;

  const isi = (ukuranUtama || tebal) ? `${ukuranUtama}${tebal}` : '-';

  return (
    <>
      {isi}
      {tambahan}
    </>
  );
};

const StatusOrderProcess: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const { profile, session } = useSession();
  const currentUserId = session?.user?.id || null;
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<OrderRow | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchOne = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, order_date, pickup_date, invoice_number,
          customer_id, customer_display_name, customer_display_phone,
          kasir_id, operator_id, designer_id, finishing_id,
          total_amount, discount_amount, tax_amount, final_amount,
          payment_status, order_status, notes, priority, ready_status,
          order_items:order_items(
            id, product_id, product_name, quantity, unit_price,
            discount_per_item, subtotal_per_item, notes_per_item,
            dimensions
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error(error);
        showError('Gagal memuat transaksi.');
      }
      setOrder(data as any);
      setLoading(false);
    };
    fetchOne();
    return () => { mounted = false; };
  }, [id]);

  const isProsesCetak = useMemo(() => order?.order_status === 'proses_cetak', [order?.order_status]);
  const isSiapAmbil  = useMemo(() => order?.order_status === 'siap_ambil',   [order?.order_status]);

  const rollbackToProsesCetak = async () => {
    if (!order) return;
    const ok = confirm('Kembalikan status ke PROSES CETAK?');
    if (!ok) return;
  
    const toastId = showLoading('Menyimpan...');
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('orders')
        .update({ order_status: 'proses_cetak' })
        .eq('id', order.id)
        .select('id, order_status')
        .maybeSingle();
  
      if (error) throw error;
  
      setOrder(prev => prev ? { ...prev, order_status: data?.order_status || 'proses_cetak' } : prev);
      showSuccess('Status dikembalikan ke PROSES CETAK.');
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Gagal rollback status.');
    } finally {
      dismissToast(toastId);
      setSaving(false);
    }
  };

  const toggleProsesCetak = async () => {
    if (!order) return;
    const next = isProsesCetak ? 'new' : 'proses_cetak';

    const ok = confirm(
      isProsesCetak
        ? 'Batalkan PROSES CETAK untuk order ini?'
        : 'Mulai PROSES CETAK untuk order ini?'
    );
    if (!ok) return;

    const toastId = showLoading('Menyimpan...');
    try {
      setSaving(true);

      // saat mulai PROSES CETAK, set operator_id = user login
      const updates: Partial<OrderRow> = { order_status: next };
      if (!isProsesCetak && currentUserId) {
        updates.operator_id = currentUserId;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', order.id)
        .select('id, order_status, operator_id')
        .maybeSingle();

      if (error) throw error;

      setOrder(prev => prev
        ? { ...prev,
            order_status: data?.order_status || next,
            operator_id: data?.operator_id ?? prev.operator_id
          }
        : prev
      );

      showSuccess(isProsesCetak ? 'Proses cetak dibatalkan.' : 'Order masuk PROSES CETAK.');
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Gagal mengubah status cetak.');
    } finally {
      dismissToast(toastId);
      setSaving(false);
    }
  };

  // 🔔 Tombol baru: tandai "Siap Ambil" (hanya saat proses_cetak)
  const setSiapAmbil = async () => {
    if (!order) return;
    const ok = confirm('Tandai order sebagai SIAP AMBIL?');
    if (!ok) return;

    const toastId = showLoading('Menyimpan...');
    try {
      setSaving(true);

      const updates: Partial<OrderRow> = { order_status: 'siap_ambil' };
      if (currentUserId) {
        updates.finishing_id = currentUserId;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', order.id)
        .select('id, order_status, finishing_id')
        .maybeSingle();

      if (error) throw error;

      setOrder(prev => prev
        ? { ...prev,
            order_status: data?.order_status || 'siap_ambil',
            finishing_id: data?.finishing_id ?? prev.finishing_id
          }
        : prev
      );

      showSuccess('Order ditandai SIAP AMBIL.');
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Gagal mengubah status menjadi siap ambil.');
    } finally {
      dismissToast(toastId);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-700">Memuat…</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-red-600 font-medium">Transaksi tidak ditemukan.</div>
        <Link to="/dashboard/status_order" className="text-blue-600 hover:underline">← Kembali ke Status Order</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {order.invoice_number || order.id}
          </h1>
          <div className="text-sm text-gray-600">
            {ucfirst(order.customer_display_name) || 'Umum'} • {order.customer_display_phone || '-'}
          </div>
          <div className="text-sm text-gray-600">
            Tanggal : {new Date(order.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="text-sm text-gray-600">
            Status Order :
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2
                ${order.order_status === "new" ? "bg-yellow-100 text-yellow-800" :
                  order.order_status === "proses_cetak" ? "bg-blue-100 text-blue-800" :
                  "bg-green-100 text-green-800"
                }
              `}
            >
              {order.order_status === "new" ? "Siap Cetak" :
                order.order_status === "proses_cetak" ? "Proses Cetak" :
                "Siap Ambil"
              }
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/status_order"
            className="px-3 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            ← Kembali
          </Link>

          {isSiapAmbil ? (
            // Saat SIAP AMBIL → hanya Kembali & Rollback
            <button
              type="button"
              onClick={rollbackToProsesCetak}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
              title="Kembalikan ke PROSES CETAK"
            >
              Rollback ke Proses Cetak
            </button>
          ) : isProsesCetak ? (
            // Saat PROSES CETAK → Batalkan & Siap Ambil
            <>
              <button
                type="button"
                onClick={toggleProsesCetak}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                title="Batalkan proses cetak (kembali NEW)"
              >
                Batalkan Proses Cetak
              </button>
              <button
                type="button"
                onClick={setSiapAmbil}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
                title="Tandai order sebagai SIAP AMBIL"
              >
                Siap Ambil
              </button>
            </>
          ) : (
            // Saat NEW → Proses Cetak
            <button
              type="button"
              onClick={toggleProsesCetak}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
              title="Mulai PROSES CETAK"
            >
              Proses Cetak
            </button>
          )}
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Subtotal</div>
          <div className="text-lg font-semibold">{formatRupiah(order.total_amount)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Diskon + Pajak</div>
          <div className="text-lg font-semibold">
            {formatRupiah((order.discount_amount || 0) + (order.tax_amount || 0))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Akhir</div>
          <div className="text-lg font-semibold">{formatRupiah(order.final_amount || order.total_amount)}</div>
        </div>
      </div>

      {/* Items — mengikuti OrderItemTable.tsx, namun hanya: No, Produk, Ukuran, Qty, Keterangan */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex-shrink-0">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Daftar Item Pesanan</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ukuran</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{idx + 1}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{ucfirst(it.product_name) || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {renderUkuran(it.dimensions)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{it.quantity ?? 0}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{(it.notes_per_item || '-')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-center text-sm text-gray-500">
                    Belum ada item dalam pesanan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Catatan */}
      <div className="hidden bg-white rounded-lg shadow p-4">
        <div className="text-sm text-gray-500 mb-1">Catatan</div>
        <div className="text-sm text-gray-800 whitespace-pre-line">{order.notes || '-'}</div>
      </div>
    </div>
  );
};

export default StatusOrderProcess;
