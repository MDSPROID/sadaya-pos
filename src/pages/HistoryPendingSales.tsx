import React, { useRef, useState } from 'react';
import { useHistoryPendingSalesData } from '../hooks/useHistoryPendingSalesData';
import HistoryPendingSalesTable from '../components/back-office/HistoryPendingSalesTable';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const HistoryPendingSales: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [durationFilter, setDurationFilter] = useState('all'); // 'all', '1-7', '8-14', '>14'
  const typingTimer = useRef<number | null>(null);
  const navigate = useNavigate();

  const {
    data,
    loading,
    error,
    fetchPendingSales,
    setData,
  } = useHistoryPendingSalesData({ durationFilter, searchTerm: '' }); // <- jangan jadikan searchTerm sebagai dep hook

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    // debounce agar tidak spam query
    if (typingTimer.current) {
      window.clearTimeout(typingTimer.current);
    }
    typingTimer.current = window.setTimeout(() => {
      fetchPendingSales({ searchTerm: newValue, durationFilter });
    }, 300);
  };

  const handleDurationFilterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setDurationFilter(newValue);
    await fetchPendingSales({ searchTerm, durationFilter: newValue });
  };

  const handleContinue = (orderId: string) => {
    navigate('/dashboard/sales', { state: { loadOrderId: orderId } });
    showSuccess(`Melanjutkan transaksi dengan ID: ${orderId}`);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Yakin ingin menghapus transaksi tertunda ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus transaksi tertunda...');
    const { error: delErr } = await supabase.from('orders').delete().eq('id', orderId);

    if (delErr) {
      showError('Gagal menghapus transaksi tertunda: ' + delErr.message);
    } else {
      setData(prev => prev.filter(item => item.id !== orderId));
      showSuccess('Transaksi tertunda berhasil dihapus!');
    }
    dismissToast(toastId);
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
          onClick={() => fetchPendingSales({ searchTerm, durationFilter })}
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
        durationFilter={durationFilter}
        onDurationFilterChange={handleDurationFilterChange}
        onRefresh={() => fetchPendingSales({ searchTerm, durationFilter })}
        onContinue={handleContinue}
        onDelete={handleDelete}
        onRekap={handleRekap}
      />
    </div>
  );
};

export default HistoryPendingSales;
