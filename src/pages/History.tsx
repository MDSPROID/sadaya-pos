import React, { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { useActivityLogsData, ActivityLogItem } from '../hooks/useActivityLogsData';
import ActivityLogsTable from '../components/laporan/ActivityLogsTable';

const History: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<ActivityLogItem | null>(null);

  const {
    data,
    loading,
    error,
    fetchActivityLogs,
    setData, // To update local state after CRUD operations
  } = useActivityLogsData({ startDate, endDate });

  const filteredData = data.filter(item =>
    item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.details ? JSON.stringify(item.details).toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
    item.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDetailModal = (item: ActivityLogItem) => {
    setSelectedLogDetail(item);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedLogDetail(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus riwayat ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus riwayat...');
    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus riwayat: ' + error.message);
    } else {
      setData(prev => prev.filter(item => item.id !== id));
      showSuccess('Riwayat berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  const handleDeleteAll = async () => {
    if (!confirm('Yakin ingin menghapus SEMUA riwayat yang ditampilkan? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }
    const toastId = showLoading('Menghapus semua riwayat...');
    const idsToDelete = filteredData.map(item => item.id);

    if (idsToDelete.length === 0) {
      showError('Tidak ada riwayat untuk dihapus.');
      dismissToast(toastId);
      return;
    }

    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      showError('Gagal menghapus semua riwayat: ' + error.message);
    } else {
      setData([]);
      showSuccess('Semua riwayat berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data riwayat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={() => fetchActivityLogs()} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">History Transaksi & Aktivitas</h1>
          <p className="text-gray-600">Lihat riwayat lengkap semua transaksi dan aktivitas sistem.</p>
        </div>
      </div>

      <ActivityLogsTable
        data={filteredData}
        searchTerm={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onOpenModal={handleOpenDetailModal}
        onDelete={handleDelete}
        onDeleteAll={handleDeleteAll}
      />

      {/* Detail Modal */}
      {showDetailModal && selectedLogDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">Detail Riwayat Aktivitas</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-medium">Tanggal & Waktu:</p>
                <p>{new Date(selectedLogDetail.created_at).toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="font-medium">Pengguna:</p>
                <p>
                  {selectedLogDetail.profiles ? `${selectedLogDetail.profiles.first_name} ${selectedLogDetail.profiles.last_name || ''}` : 'N/A'}
                  {selectedLogDetail.profiles?.roles?.nama && (
                    <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {selectedLogDetail.profiles.roles.nama}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="font-medium">Aksi:</p>
                <p>{selectedLogDetail.action}</p>
              </div>
              <div>
                <p className="font-medium">Detail:</p>
                <pre className="bg-gray-100 p-2 rounded-md overflow-x-auto text-xs">
                  {selectedLogDetail.details ? JSON.stringify(selectedLogDetail.details, null, 2) : '-'}
                </pre>
              </div>
              <div>
                <p className="font-medium">IP Address:</p>
                <p>{selectedLogDetail.ip_address || '-'}</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={handleCloseDetailModal}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;