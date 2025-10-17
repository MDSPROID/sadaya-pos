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
      />
    </div>
  );
};

export default HistoryPendingSales;
