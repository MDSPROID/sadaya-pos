import React, { useRef, useState } from 'react';
import HistoryPendingSalesTable from '../components/back-office/HistoryPendingSalesTable';
import { useStatusOrderData } from '../hooks/useStatusOrderData';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const StatusOrder: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [durationFilter, setDurationFilter] = useState('all');
  const typingTimer = useRef<number | null>(null);
  const navigate = useNavigate();

  const { data, loading, error, fetchStatusOrders, setData } = useStatusOrderData({
    durationFilter,
    searchTerm,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      fetchStatusOrders({ searchTerm: value, durationFilter });
    }, 400);
  };

  const handleDurationFilterChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const value = e.target.value;
    setDurationFilter(value);
    fetchStatusOrders({ searchTerm, durationFilter: value });
  };

  // Aksi tombol "Lanjut" di table — tetap arahkan ke Sales untuk edit (opsional)
  const handleContinue = (orderId: string) => {
    navigate('/dashboard/sales', { state: { loadOrderId: orderId } });
  };

  // Hapus order (opsional, sama seperti di history pending)
  const handleDelete = async (orderId: string) => {
    if (!confirm('Yakin ingin menghapus transaksi yang ready cetak ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus order...');
    try {
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

  const handleRekap = () => {
    showSuccess('Rekap Status Order diproses');
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Status Order</h1>
        <p className="text-gray-600 text-sm">Daftar order yang siap diproses (ready).</p>
      </div>
      <HistoryPendingSalesTable
        data={data}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        durationFilter={durationFilter}
        onDurationFilterChange={handleDurationFilterChange}
        onRefresh={() => fetchStatusOrders({ searchTerm, durationFilter })}
        onContinue={handleContinue}
        onDelete={handleDelete}
        onRekap={handleRekap}
      />
    </div>
  );
};

export default StatusOrder;