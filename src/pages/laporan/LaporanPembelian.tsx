import React, { useState, useMemo, useEffect } from 'react';
import { usePurchaseReports } from '../../hooks/usePurchaseReports';
import PurchaseReportTable from '../../components/laporan/PurchaseReportTable';
import PurchaseReportDetailPanel from '../../components/laporan/PurchaseReportDetailPanel';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingBag, DollarSign, ReceiptText, Users } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import Pagination from '../../components/Pagination';
import { PurchaseReportItem } from '../../types/purchaseOrderTypes';

interface SupplierOption { id: string; name: string; }
interface RecordedByOption { id: string; name: string; }

const LaporanPembelian: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPurchaseItem, setSelectedPurchaseItem] = useState<PurchaseReportItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [sortColumn, setSortColumn] = useState<string>('order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedRecordedById, setSelectedRecordedById] = useState<string>('');

  const {
    data: allPurchaseData,
    summary,
    loading,
    error,
    fetchPurchaseData,
  } = usePurchaseReports({ startDate, endDate });

  // Reset ke halaman 1 saat filter/pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, paymentStatusFilter, paymentMethodFilter, selectedSupplierId, selectedRecordedById, startDate, endDate]);

  const filteredAndSortedData = useMemo(() => {
    const filteredByPaymentStatus = allPurchaseData.filter(item => {
      if (paymentStatusFilter === 'all') return true;
      return item.payment_status === paymentStatusFilter;
    });

    const filteredByPaymentMethod = filteredByPaymentStatus.filter(item => {
      if (paymentMethodFilter === 'all') return true;
      return item.payment_method === paymentMethodFilter;
    });

    const filteredBySupplier = filteredByPaymentMethod.filter(item => {
      if (!selectedSupplierId) return true;
      return item.supplier_id === selectedSupplierId;
    });

    const filteredByRecordedBy = filteredBySupplier.filter(item => {
      if (!selectedRecordedById) return true;
      return item.recorded_by_id === selectedRecordedById;
    });

    const s = searchTerm.toLowerCase();
    const filteredBySearch = filteredByRecordedBy.filter(item => {
      const supplierName = item.supplier_display_name || item.supplier?.nama || '';
      const supplierPhone = item.supplier_display_phone || item.supplier?.telepon || '';
      const recordedByName = item.profiles?.first_name || '';
      return (
        (item.invoice_number || '').toLowerCase().includes(s) ||
        supplierName.toLowerCase().includes(s) ||
        supplierPhone.toLowerCase().includes(s) ||
        (item.notes || '').toLowerCase().includes(s) ||
        recordedByName.toLowerCase().includes(s) ||
        (item.purchase_order_items && Array.isArray(item.purchase_order_items) && item.purchase_order_items.some((oi: any) => (oi.item_name || '').toLowerCase().includes(s)))
      );
    });

    const sortedData = [...filteredBySearch].sort((a, b) => {
      let compareValue = 0;
      if (sortColumn === 'order_date') {
        const dateA = new Date(a.order_date).getTime();
        const dateB = new Date(b.order_date).getTime();
        compareValue = dateA !== dateB ? (dateA - dateB) : (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      } else if (sortColumn === 'supplier') {
        compareValue = (a.supplier_display_name || a.supplier?.nama || '').toLowerCase()
          .localeCompare((b.supplier_display_name || b.supplier?.nama || '').toLowerCase());
      } else if (sortColumn === 'recorded_by') {
        compareValue = (a.profiles?.first_name || '').toLowerCase()
          .localeCompare((b.profiles?.first_name || '').toLowerCase());
      } else if (sortColumn === 'payment_status') {
        const order: Record<string, number> = { due: 1, paid: 2 };
        compareValue = (order[a.payment_status?.toLowerCase()] || 0) - (order[b.payment_status?.toLowerCase()] || 0);
      } else if (sortColumn === 'final_amount') {
        compareValue = a.final_amount - b.final_amount;
      } else if (sortColumn === 'invoice_number') {
        compareValue = (a.invoice_number || '').toLowerCase().localeCompare((b.invoice_number || '').toLowerCase());
      } else if (sortColumn === 'due_date') {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        compareValue = dateA - dateB;
      } else if (sortColumn === 'due_amount') {
        compareValue = a.due_amount - b.due_amount;
      }
      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sortedData;
  }, [allPurchaseData, searchTerm, paymentStatusFilter, paymentMethodFilter, selectedSupplierId, selectedRecordedById, sortColumn, sortDirection]);

  const supplierOptions: SupplierOption[] = useMemo(() => {
    const unique = new Map<string, string>();
    allPurchaseData.forEach(order => {
      const id = order.supplier_id;
      const name = order.supplier_display_name || order.supplier?.nama;
      if (id && name) unique.set(id, name);
    });
    return Array.from(unique, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPurchaseData]);
  
  const recordedByOptions: RecordedByOption[] = useMemo(() => {
    const unique = new Map<string, string>();
    allPurchaseData.forEach(order => {
      if (order.recorded_by_id) {
        const name = `${order.profiles?.first_name || ''} ${order.profiles?.last_name || ''}`.trim();
        if (name) unique.set(order.recorded_by_id, name);
      }
    });
    return Array.from(unique, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPurchaseData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const totalFilteredCount = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize);

  useEffect(() => {
    if (selectedPurchaseItem) {
      const updated = filteredAndSortedData.find(item => item.id === selectedPurchaseItem.id);
      setSelectedPurchaseItem(updated || null);
    }
  }, [filteredAndSortedData, selectedPurchaseItem]);

  const handlePrint = () => window.print();
  const handleRowClick = (item: PurchaseReportItem) => setSelectedPurchaseItem(item);

  const handleDeleteSelected = async () => {
    if (!selectedPurchaseItem) {
      showError('Pilih transaksi yang ingin dihapus terlebih dahulu.');
      return;
    }
    if (!confirm(`Yakin ingin menghapus transaksi dengan faktur ${selectedPurchaseItem.invoice_number || selectedPurchaseItem.id.substring(0, 8)}...?`)) return;

    const toastId = showLoading('Menghapus transaksi...');
    try {
      const { error: e1 } = await supabase.from('purchase_order_items').delete().eq('purchase_order_id', selectedPurchaseItem.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('purchase_orders').delete().eq('id', selectedPurchaseItem.id);
      if (e2) throw e2;

      showSuccess('Transaksi berhasil dihapus!');
      setSelectedPurchaseItem(null);
      fetchPurchaseData();
    } catch (err: any) {
      showError('Gagal menghapus transaksi: ' + err.message);
      console.error('Error deleting purchase order:', err);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleDeleteAllFiltered = async () => {
    if (filteredAndSortedData.length === 0) {
      showError('Tidak ada transaksi untuk dihapus berdasarkan filter saat ini.');
      return;
    }
    if (!confirm(`Yakin ingin menghapus SEMUA ${filteredAndSortedData.length} transaksi yang ditampilkan? Tindakan ini tidak dapat dibatalkan.`)) return;

    const toastId = showLoading('Menghapus semua transaksi yang difilter...');
    try {
      const ids = filteredAndSortedData.map(i => i.id);
      const { error: e1 } = await supabase.from('purchase_order_items').delete().in('purchase_order_id', ids);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('purchase_orders').delete().in('id', ids);
      if (e2) throw e2;

      showSuccess('Semua transaksi yang difiltered berhasil dihapus!');
      setSelectedPurchaseItem(null);
      fetchPurchaseData();
    } catch (err: any) {
      showError('Gagal menghapus semua transaksi: ' + err.message);
      console.error('Error deleting all filtered purchase orders:', err);
    } finally {
      dismissToast(toastId);
    }
  };

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleSort = (column: string) => {
    if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('asc'); }
  };

  const filteredSummary = useMemo(() => {
    const totalPurchaseAmount = filteredAndSortedData.reduce((sum, i) => sum + (i.final_amount || 0), 0);
    const totalPaidAmount     = filteredAndSortedData.reduce((sum, i) => sum + (i.paid_amount  || 0), 0);
    const totalDueAmount      = filteredAndSortedData.reduce((sum, i) => sum + (i.due_amount   || 0), 0);
    let transactionsToday = filteredAndSortedData.length;
    return { totalPurchaseAmount, totalPaidAmount, totalDueAmount, transactionsToday };
  }, [filteredAndSortedData]);

  /* ====== SELECTION (checkbox) ====== */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    setSelectedIds([]);
  }, [startDate, endDate, paymentStatusFilter, paymentMethodFilter, selectedSupplierId, selectedRecordedById, searchTerm, sortColumn, sortDirection, currentPage]);

  const toggleRow = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const allPageIds = useMemo(() => paginatedData.map(d => d.id), [paginatedData]);
  const allSelectedOnPage = allPageIds.length > 0 && allPageIds.every(id => selectedIds.includes(id));
  const someSelectedOnPage = allPageIds.some(id => selectedIds.includes(id)) && !allSelectedOnPage;

  const onToggleAllPage = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(prev => prev.filter(id => !allPageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allPageIds])));
    }
  };

  const handleDeleteSelectedIds = async () => {
    if (!selectedIds.length) {
      showError('Pilih data yang ingin dihapus.');
      return;
    }
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} transaksi terpilih?`)) return;

    const toastId = showLoading('Menghapus transaksi terpilih...');
    try {
      const { error: e1 } = await supabase.from('purchase_order_items').delete().in('purchase_order_id', selectedIds);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('purchase_orders').delete().in('id', selectedIds);
      if (e2) throw e2;

      showSuccess('Transaksi terpilih berhasil dihapus.');
      setSelectedIds([]);
      fetchPurchaseData();
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Gagal menghapus transaksi.');
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner error non-blocking */}
      {!!error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
          Error: {error} <button onClick={fetchPurchaseData} className="underline ml-2">Coba lagi</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Pembelian</h1>
          <p className="text-gray-600">Lihat dan cetak laporan pembelian.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-blue-100 p-3 rounded-lg">
            <ShoppingBag className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Pembelian (Periode Ini)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(filteredSummary.totalPurchaseAmount)}</p>
          </div>
        </div>
        <div className="bg-green-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-green-100 p-3 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Jumlah Terbayar (Periode Ini)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(filteredSummary.totalPaidAmount)}</p>
          </div>
        </div>
        <div className="bg-yellow-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-yellow-100 p-3 rounded-lg">
            <ReceiptText className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Jumlah Hutang (Periode Ini)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(filteredSummary.totalDueAmount)}</p>
          </div>
        </div>
        <div className="bg-purple-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-purple-100 p-3 rounded-lg">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Transaksi</p>
            <p className="text-2xl font-bold text-gray-900">{filteredSummary.transactionsToday}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <PurchaseReportTable
            loading={loading}
            data={paginatedData}
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            totalPurchaseAmount={filteredSummary.totalPurchaseAmount}
            onPrint={handlePrint}
            onRowClick={handleRowClick}
            selectedItemId={selectedPurchaseItem?.id || null}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            paymentStatusFilter={paymentStatusFilter}
            onPaymentStatusFilterChange={(e) => setPaymentStatusFilter(e.target.value)}
            paymentMethodFilter={paymentMethodFilter}
            onPaymentMethodChange={(e) => setPaymentMethodFilter(e.target.value)}
            supplierOptions={supplierOptions}
            selectedSupplierId={selectedSupplierId}
            onSupplierChange={(e) => setSelectedSupplierId(e.target.value)}
            recordedByOptions={recordedByOptions}
            selectedRecordedById={selectedRecordedById}
            onRecordedByChange={(e) => setSelectedRecordedById(e.target.value)}
            onDeleteSelected={handleDeleteSelected}
            onDeleteAllFiltered={handleDeleteAllFiltered}

            /* selection props */
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAllPage={onToggleAllPage}
            allSelectedOnPage={allSelectedOnPage}
            someSelectedOnPage={someSelectedOnPage}
            onDeleteSelectedIds={handleDeleteSelectedIds}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            totalItems={totalFilteredCount}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <PurchaseReportDetailPanel selectedItem={selectedPurchaseItem} />
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Cetak Format Lain</h3>
            <button className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
              Cetak Format B
            </button>
            <button className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
              Cetak Format C
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaporanPembelian;
