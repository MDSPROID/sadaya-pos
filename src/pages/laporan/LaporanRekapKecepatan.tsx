import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Gauge, Zap } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';

type SpeedRow = {
  id: string;
  invoice_number: string | null;
  customer_display_name: string | null;
  order_date: string;
  siap_cetak_at: string | null;
  proses_cetak_at: string | null;
  siap_ambil_at: string | null;
  duration_minutes: number;
};

const toDate = (val: string | null | undefined): Date | null => {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

/**
 * Hitung waktu mulai & selesai produksi:
 * - mulai  : utama dari siap_cetak_at, fallback ke proses_cetak_at (kalau siap_cetak_at belum ke-set)
 * - selesai: dari siap_ambil_at
 */
const resolveTimes = (row: any): { start: Date | null; end: Date | null } => {
  const start =
    toDate(row.siap_cetak_at) ||
    toDate(row.proses_cetak_at) ||
    null; // kalau dua-duanya null kita anggap tidak valid

  const end =
    toDate(row.siap_ambil_at) ||
    null;

  return { start, end };
};

const diffInMinutes = (start: Date | null, end: Date | null): number => {
  if (!start || !end) return 0;
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(ms / 60000);
};

type Mode = 'all' | 'fastest' | 'slowest' | 'average';

const LaporanRekapKecepatan: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<Mode>('average');
  const [data, setData] = useState<SpeedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ambil hanya order yg sudah SIAP AMBIL (ready_status = 'ready' & punya siap_ambil_at)
        const { data: rows, error: qErr } = await supabase
          .from('orders')
          .select(`
            id,
            order_date,
            invoice_number,
            customer_display_name,
            siap_cetak_at,
            proses_cetak_at,
            siap_ambil_at,
            ready_status
          `)
          .gte('order_date', startDate)
          .lte('order_date', endDate)
          .eq('ready_status', 'ready');

        if (qErr) throw qErr;

        const mapped: SpeedRow[] = (rows || [])
          .map((row: any) => {
            const { start, end } = resolveTimes(row);
            const dur = diffInMinutes(start, end);

            return {
              id: row.id,
              invoice_number: row.invoice_number ?? null,
              customer_display_name: row.customer_display_name ?? null,
              order_date: row.order_date,
              siap_cetak_at: row.siap_cetak_at,
              proses_cetak_at: row.proses_cetak_at,
              siap_ambil_at: row.siap_ambil_at,
              duration_minutes: dur,
            };
          })
          // buang data yg belum lengkap / durasi 0 / minus
          .filter(r => r.duration_minutes > 0);

        setData(mapped);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Gagal memuat rekap kecepatan.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const stats = useMemo(() => {
    if (!data.length) {
      return {
        average: 0,
        fastest: null as SpeedRow | null,
        slowest: null as SpeedRow | null,
      };
    }

    let total = 0;
    let fastest: SpeedRow | null = null;
    let slowest: SpeedRow | null = null;

    data.forEach(row => {
      const d = row.duration_minutes;
      total += d;
      if (!fastest || d < fastest.duration_minutes) fastest = row;
      if (!slowest || d > slowest.duration_minutes) slowest = row;
    });

    return {
      average: Math.round(total / data.length),
      fastest,
      slowest,
    };
  }, [data]);

  const filteredData = useMemo(() => {
    if (mode === 'all') return data;
    if (mode === 'fastest' && stats.fastest) return [stats.fastest];
    if (mode === 'slowest' && stats.slowest) return [stats.slowest];
    if (mode === 'average') return data; // rata2: tampil semua, yang penting card di atas
    return data;
  }, [data, mode, stats.fastest, stats.slowest]);

  if (loading && !data.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat rekap kecepatan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rekap Kecepatan Produksi</h1>
          <p className="text-gray-600 text-sm">
            Durasi dari <span className="font-semibold">siap cetak</span> ke{' '}
            <span className="font-semibold">siap ambil</span> per order (dalam menit).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Dari:</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sampai:</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Jenis:</label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value as Mode)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="average">Rata-rata</option>
              <option value="fastest">Tercepat</option>
              <option value="slowest">Terlama</option>
              <option value="all">Semua Data</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Gauge className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Rata-rata Kecepatan</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.average} menit
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Dari {data.length} order dalam periode terpilih.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-green-100 p-3 rounded-lg">
            <Zap className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Order Tercepat</p>
            {stats.fastest ? (
              <>
                <p className="text-xl font-bold text-gray-900">
                  {stats.fastest.duration_minutes} menit
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Faktur {stats.fastest.invoice_number || stats.fastest.id.slice(0, 8)}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Belum ada data.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-red-100 p-3 rounded-lg">
            <Clock className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Order Terlama</p>
            {stats.slowest ? (
              <>
                <p className="text-xl font-bold text-gray-900">
                  {stats.slowest.duration_minutes} menit
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Faktur {stats.slowest.invoice_number || stats.slowest.id.slice(0, 8)}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Belum ada data.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabel detail */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faktur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siap Cetak</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siap Ambil</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Durasi (menit)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!filteredData.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                  Tidak ada data untuk periode ini.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.invoice_number || row.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.customer_display_name || 'Umum'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.order_date
                      ? new Date(row.order_date).toLocaleDateString('id-ID')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.siap_cetak_at
                      ? new Date(row.siap_cetak_at).toLocaleString('id-ID')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.siap_ambil_at
                      ? new Date(row.siap_ambil_at).toLocaleString('id-ID')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                    {row.duration_minutes}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LaporanRekapKecepatan;
