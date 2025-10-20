import React, { useRef, useState } from 'react';
import { useHistoryPendingPurchasesData } from '../hooks/useHistoryPendingPurchasesData';
import HistoryPendingPurchasesTable from '../components/back-office/HistoryPendingPurchasesTable';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import PurchasePaymentModalPending from '../components/purchase/PurchasePaymentModalPending';
import PurchasePaymentsViewModalPending from '../components/purchase/PurchasePaymentsViewModalPending';

const todayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const HistoryPendingPurchases: React.FC = () => {
  const { profile } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(todayStr());
  const [endDate, setEndDate] = useState<string>(todayStr());
  const typingTimer = useRef<number | null>(null);
  const [viewPurchaseId, setViewPurchaseId] = useState<string | null>(null);
  const isSuperAdmin = profile?.role === 'Super Admin';

  const {
    data,
    loading,
    error,
    fetchPendingPurchases,
    setData,
  } = useHistoryPendingPurchasesData({ startDate, endDate, searchTerm: '' }); // jangan jadikan searchTerm dep hook

  // Modal state
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      fetchPendingPurchases({ searchTerm: newValue, startDate, endDate });
    }, 300);
  };

  const handleStartDateChange = async (value: string) => {
    const fixedEnd = endDate && endDate < value ? value : endDate;
    setStartDate(value);
    if (fixedEnd !== endDate) setEndDate(fixedEnd);
    await fetchPendingPurchases({ searchTerm, startDate: value, endDate: fixedEnd });
  };

  const handleEndDateChange = async (value: string) => {
    const fixedStart = startDate && value < startDate ? value : startDate;
    if (fixedStart !== startDate) setStartDate(fixedStart);
    setEndDate(value);
    await fetchPendingPurchases({ searchTerm, startDate: fixedStart, endDate: value });
  };

  const handleOpenPayment = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
  };

  const handleDelete = async (purchaseId: string) => {
    if (!confirm('Yakin ingin menghapus pembelian tertunda ini?')) return;
    const toastId = showLoading('Menghapus purchase order...');
    try {
      const { data: deleted, error: delErr } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', purchaseId)
        .select('id'); // agar tahu jumlah effected rows

      if (delErr) throw delErr;

      const affected = Array.isArray(deleted) ? deleted.length : 0;
      if (affected === 0) {
        showError('Tidak bisa menghapus. Mungkin tidak ada izin atau data tidak ditemukan.');
        return;
      }

      setData(prev => prev.filter(item => item.id !== purchaseId));
      showSuccess('Purchase order berhasil dihapus.');
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'Gagal menghapus purchase order.');
    } finally {
      dismissToast(toastId);
    }
  };

  const handleRefresh = () => fetchPendingPurchases({ searchTerm, startDate, endDate });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">History Pending Pembelian</h1>
          <p className="text-gray-600">Lihat dan kelola daftar pembelian (hutang) yang belum lunas.</p>
        </div>
      </div>

      <HistoryPendingPurchasesTable
        data={data}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onRefresh={handleRefresh}
        onOpenPayment={handleOpenPayment} 
        onDelete={handleDelete}
        onViewPayments={(id) => setViewPurchaseId(id)}
        error={error}
        showDelete={isSuperAdmin}
      />

      {/* Modal Pembayaran */}
      {selectedPurchaseId && (
        <PurchasePaymentModalPending
          purchaseId={selectedPurchaseId}
          onClose={() => setSelectedPurchaseId(null)}
          onPaid={() => {
            setSelectedPurchaseId(null);
            handleRefresh();
          }}
        />
      )}

      {/* ⬇️ Modal Riwayat Pembayaran (view) */}
      {viewPurchaseId && (
        <PurchasePaymentsViewModalPending
          purchaseId={viewPurchaseId}
          onClose={() => setViewPurchaseId(null)}
        />
      )}
    </div>
  );
};

export default HistoryPendingPurchases;
