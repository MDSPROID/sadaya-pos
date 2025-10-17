import React, { useRef, useState, useEffect } from 'react';
import StatusOrderTable from '../components/status-order/StatusOrderTable';
import { useStatusOrderData } from '../hooks/useStatusOrderData';
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

const StatusOrder: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(todayStr());
  const [endDate, setEndDate] = useState<string>(todayStr());
  const [statusFilter, setStatusFilter] =
    useState<'all' | 'new' | 'proses_cetak' | 'siap_ambil'>('all');

  const typingTimer = useRef<number | null>(null);
  const navigate = useNavigate();

  const { data, loading, error, fetchStatusOrders, setData } = useStatusOrderData({
    startDate,
    endDate,
    searchTerm,
    statusFilter,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // simpan filter terkini untuk realtime/polling
  const filtersRef = useRef({
    searchTerm: '',
    startDate: todayStr(),
    endDate: todayStr(),
    statusFilter: 'all' as 'all' | 'new' | 'proses_cetak' | 'siap_ambil',
  });
  useEffect(() => {
    filtersRef.current = { searchTerm, startDate, endDate, statusFilter };
  }, [searchTerm, startDate, endDate, statusFilter]);

  /* =======================
   *  Pencarian & Filter
   * ======================= */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      fetchStatusOrders({ searchTerm: value, startDate, endDate, statusFilter });
    }, 400);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    // jaga range valid
    const fixedEnd = endDate && endDate < value ? value : endDate;
    if (fixedEnd !== endDate) setEndDate(fixedEnd);
    fetchStatusOrders({ searchTerm, startDate: value, endDate: fixedEnd, statusFilter });
  };

  const handleEndDateChange = (value: string) => {
    // jaga range valid
    const fixedStart = startDate && value < startDate ? value : startDate;
    if (fixedStart !== startDate) setStartDate(fixedStart);
    setEndDate(value);
    fetchStatusOrders({ searchTerm, startDate: fixedStart, endDate: value, statusFilter });
  };

  const handleStatusFilterChange = (value: 'all' | 'new' | 'proses_cetak' | 'siap_ambil') => {
    setStatusFilter(value);
    fetchStatusOrders({ searchTerm, startDate, endDate, statusFilter: value });
  };

  /* =======================
   *  Aksi baris
   * ======================= */
  const handleContinue = (orderId: string) => {
    navigate(`/dashboard/status-order/process/${orderId}`);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Yakin ingin menghapus transaksi yang siap cetak ini?')) return;

    const toastId = showLoading('Menghapus order...');
    try {
      const { data: deletedRows, error: delErr } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .select('id');

      if (delErr) throw delErr;

      const affected = Array.isArray(deletedRows) ? deletedRows.length : 0;
      if (affected === 0) {
        showError('Tidak bisa menghapus order. Anda mungkin tidak punya izin atau order tidak ditemukan.');
        return;
      }

      setData(prev => prev.filter(item => item.id !== orderId));
      setSelectedIds(prev => prev.filter(id => id !== orderId));
      showSuccess('Order berhasil dihapus.');
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'Gagal menghapus order.');
    } finally {
      dismissToast(toastId);
    }
  };

  /* =======================
   *  BULK
   * ======================= */
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = (checked: boolean) => {
    if (!checked) { setSelectedIds([]); return; }
    setSelectedIds(data.map(d => d.id));
  };

  const bulkUpdate = async (toStatus: 'proses_cetak' | 'new') => {
    if (selectedIds.length === 0) return;
    const msg = toStatus === 'proses_cetak'
      ? `Set ${selectedIds.length} order ke PROSES CETAK?`
      : `Batalkan PROSES CETAK pada ${selectedIds.length} order (kembali SIAP CETAK)?`;
    if (!confirm(msg)) return;

    const toastId = showLoading('Menyimpan perubahan...');
    try {
      const { data: updated, error: updErr } = await supabase
        .from('orders')
        .update({ order_status: toStatus })
        .in('id', selectedIds)
        .select('id');
      if (updErr) throw updErr;

      const setLocal = new Set((updated || []).map((r: any) => r.id));
      setData(prev => prev.map(row => setLocal.has(row.id) ? { ...row, order_status: toStatus } : row));
      showSuccess('Perubahan tersimpan.');
    } catch (e: any) {
      console.error(e);
      showError(e?.message || 'Gagal menyimpan perubahan.');
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Status Order</h1>
        <p className="text-gray-600">Daftar order yang siap diproses (ready).</p>
      </div>

      <StatusOrderTable
        data={data}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onRefresh={() => fetchStatusOrders({ searchTerm, startDate, endDate, statusFilter })}
        onContinue={handleContinue}
        onDelete={handleDelete}
        onRekap={() => showSuccess('Rekap Status Order diproses')}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onBulkProcess={() => bulkUpdate('proses_cetak')}
        onBulkCancel={() => bulkUpdate('new')}
      />
    </div>
  );
};

export default StatusOrder;
