import React, { useState } from 'react';
import { useHistoryPendingSalesData } from '../hooks/useHistoryPendingSalesData';
import HistoryPendingSalesTable from '../components/back-office/HistoryPendingSalesTable';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const HistoryPendingSales: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [durationFilter, setDurationFilter] = useState('all'); // 'all', '1-7', '8-14', '>14'
  const navigate = useNavigate(); // Initialize useNavigate

  const {
    data,
    loading,
    error,
    fetchPendingSales,
    setData, // Expose setData for local updates after CRUD
  } = useHistoryPendingSalesData({ durationFilter, searchTerm });

  const handleContinue = (orderId: string) => {
    // Navigate to the sales page with the orderId in state
    navigate('/dashboard/sales', { state: { loadOrderId: orderId } });
    showSuccess(`Melanjutkan transaksi dengan ID: ${orderId}`);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Yakin ingin menghapus transaksi tertunda ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus transaksi tertunda...');
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      showError('Gagal menghapus transaksi tertunda: ' + error.message);
    } else {
      setData(prev => prev.filter(item => item.id !== orderId));
      showSuccess('Transaksi tertunda berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  const handleRekap = () => {
    // Placeholder for rekap action
    showSuccess('Melakukan rekap data penjualan tertunda.');
    console.log('Rekap pending sales data');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data riwayat penjualan tertunda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchPendingSales} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        durationFilter={durationFilter}
        onDurationFilterChange={(e) => setDurationFilter(e.target.value)}
        onRefresh={fetchPendingSales}
        onContinue={handleContinue}
        onDelete={handleDelete}
        onRekap={handleRekap}
      />
    </div>
  );
};

export default HistoryPendingSales;