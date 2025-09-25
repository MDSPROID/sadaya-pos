import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { showError, showLoading, showSuccess, dismissToast } from '../utils/toast';

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  subtotal_per_item: number;
  notes_per_item: string | null;
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
  order_status: string; // 'new' | 'proses_cetak' | ...
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

const StatusOrderProcess: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
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
            discount_per_item, subtotal_per_item, notes_per_item
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

  const toggleProsesCetak = async () => {
    if (!order) return;
    const next = isProsesCetak ? 'new' : 'proses_cetak';

    // konfirmasi saat memulai proses cetak
    if (!isProsesCetak) {
      const ok = confirm('Mulai PROSES CETAK untuk order ini?');
      if (!ok) return;
    } else {
      const ok = confirm('Batalkan PROSES CETAK untuk order ini?');
      if (!ok) return;
    }

    const toastId = showLoading('Menyimpan...');
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('orders')
        .update({ order_status: next })
        .eq('id', order.id)
        .select('id, order_status')
        .maybeSingle();

      if (error) throw error;

      setOrder(prev => prev ? { ...prev, order_status: data?.order_status || next } : prev);
      showSuccess(isProsesCetak ? 'Proses cetak dibatalkan.' : 'Order masuk PROSES CETAK.');
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Gagal mengubah status cetak.');
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
            Tanggal: {new Date(order.order_date).toLocaleDateString('id-ID')} • Ready: {order.ready_status}
          </div>
          <div className="text-sm text-gray-600">
            Status Order: <span className="font-medium">{order.order_status || '-'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/status_order"
            className="px-3 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            ← Kembali
          </Link>
          <button
            type="button"
            onClick={toggleProsesCetak}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-white ${
              isProsesCetak ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } disabled:opacity-60`}
          >
            {isProsesCetak ? 'BATALKAN PROSES CETAK' : 'PROSES CETAK'}
          </button>
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

      {/* Items */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-medium text-gray-700">Item Pesanan</div>
        <div className="relative overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Produk', 'Qty', 'Harga', 'Diskon', 'Subtotal', 'Catatan'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.order_items?.map(it => (
                <tr key={it.id}>
                  <td className="px-4 py-2 text-sm">{it.product_name || '-'}</td>
                  <td className="px-4 py-2 text-sm">{it.quantity}</td>
                  <td className="px-4 py-2 text-sm">{formatRupiah(it.unit_price)}</td>
                  <td className="px-4 py-2 text-sm">{formatRupiah(it.discount_per_item)}</td>
                  <td className="px-4 py-2 text-sm">{formatRupiah(it.subtotal_per_item)}</td>
                  <td className="px-4 py-2 text-sm">{it.notes_per_item || '-'}</td>
                </tr>
              ))}
              {(!order.order_items || order.order_items.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">Tidak ada item.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Catatan */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-sm text-gray-500 mb-1">Catatan</div>
        <div className="text-sm text-gray-800 whitespace-pre-line">{order.notes || '-'}</div>
      </div>
    </div>
  );
};

export default StatusOrderProcess;
