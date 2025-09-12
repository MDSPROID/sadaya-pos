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

interface SupplierOption {
  id: string;
  name: string;
}

interface RecordedByOption {
  id: string;
  name: string;
}

const LaporanPembelian: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPurchaseItem, setSelectedPurchaseItem] = useState<PurchaseReportItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // State for sorting
  const [sortColumn, setSortColumn] = useState<string>('order_date'); // Default sort by order_date
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default descending

  // State for payment status filter
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all'); // 'all', 'paid', 'due'

  // State for payment method filter
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all'); // 'all', 'cash', 'bank_transfer'

  // State for supplier and recorded by filters
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedRecordedById, setSelectedRecordedById] = useState<string>('');

  const {
    data: allPurchaseData,
    summary,
    loading,
    error,
    fetchPurchaseData,
  } = usePurchaseReports({ startDate, endDate });

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

    const filteredBySearch = filteredByRecordedBy.filter(item => {
      const supplierName = item.supplier_display_name || item.supplier?.nama || '';
      const supplierPhone = item.supplier_display_phone || item.supplier?.telepon || '';
      const recordedByName = item.profiles?.first_name || '';
      
      return (
        (item.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplierPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recordedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.purchase_order_items && Array.isArray(item.purchase_order_items) && item.purchase_order_items.some((oi: any) => oi.item_name.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    });

    // Apply sorting
    const sortedData = [...filteredBySearch].sort((a, b) => {
      let compareValue = 0;

      if (sortColumn === 'order_date') {
        const dateA = new Date(a.order_date).getTime();
        const dateB = new Date(b.order_date).getTime();
        if (dateA !== dateB) {
          compareValue = dateA - dateB;
        } else {
          // If dates are the same, sort by created_at
          compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
      } else if (sortColumn === 'supplier') {
        const nameA = (a.supplier_display_name || a.supplier?.nama || '').toLowerCase();
        const nameB = (b.supplier_display_name || b.supplier?.nama || '').toLowerCase();
        compareValue = nameA.localeCompare(nameB);
      } else if (sortColumn === 'recorded_by') {
        const recordedByA = (a.profiles?.first_name || '').toLowerCase();
        const recordedByB = (b.profiles?.first_name || '').toLowerCase();
        compareValue = recordedByA.localeCompare(recordedByB);
      } else if (sortColumn === 'payment_status') {
        const statusA = a.payment_status.toLowerCase();
        const statusB = b.payment_status.toLowerCase();
        // Custom order: due, paid
        const order = { 'due': 1, 'paid': 2 };
        compareValue = (order[statusA as keyof typeof order] || 0) - (order[statusB as keyof typeof order] || 0);
      } else if (sortColumn === 'final_amount') {
        compareValue = a.final_amount - b.final_amount;
      } else if (sortColumn === 'invoice_number') {
        const invA = (a.invoice_number || '').toLowerCase();
        const invB = (b.invoice_number || '').toLowerCase();
        compareValue = invA.localeCompare(invB);
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

  // Generate supplier options from existing data
  const supplierOptions: SupplierOption[] = useMemo(() => {
    const uniqueSuppliers = new Map<string, string>();
    filteredAndSortedData.forEach(order => {
      const supplierId = order.supplier_id;
      const supplierName = order.supplier_display_name || order.supplier?.nama;
      if (supplierId && supplierName) {
        uniqueSuppliers.set(supplierId, supplierName);
      }
    });
    return Array.from(uniqueSuppliers, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredAndSortedData]);

  // Generate recorded by options from existing data
  const recordedByOptions: RecordedByOption[] = useMemo(() => {
    const uniqueUsers = new Map<string, string>();
    filteredAndSortedData.forEach(order => {
      if (order.recorded_by_id && order.profiles?.first_name) {
        uniqueUsers.set(order.recorded_by_id, `${order.profiles.first_name} ${order.profiles.last_name || ''}`);
      }
    });
    return Array.from(uniqueUsers, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredAndSortedData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const totalFilteredCount = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize);

  useEffect(() => {
    if (selectedPurchaseItem) {
      const updatedItem = filteredAndSortedData.find(item => item.id === selectedPurchaseItem.id);
      setSelectedPurchaseItem(updatedItem || null);
    }
  }, [filteredAndSortedData, selectedPurchaseItem]);

  const handlePrint = () => {
    window.print();
  };

  const handleRowClick = (item: PurchaseReportItem) => {
    setSelectedPurchaseItem(item);
  };

  const handleDeleteSelected = async () => {
    if (!selectedPurchaseItem) {
      showError('Pilih transaksi yang ingin dihapus terlebih dahulu.');
      return;
    }
    if (!confirm(`Yakin ingin menghapus transaksi dengan faktur ${selectedPurchaseItem.invoice_number || selectedPurchaseItem.id.substring(0, 8)}...?`)) {
      return;
    }

    const toastId = showLoading('Menghapus transaksi...');
    try {
      const { error: deleteItemsError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', selectedPurchaseItem.id);

      if (deleteItemsError) throw deleteItemsError;

      const { error: deleteOrderError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', selectedPurchaseItem.id);

      if (deleteOrderError) throw deleteOrderError;

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
    if (!confirm(`Yakin ingin menghapus SEMUA ${filteredAndSortedData.length} transaksi yang ditampilkan? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    const toastId = showLoading('Menghapus semua transaksi yang difilter...');
    try {
      const orderIdsToDelete = filteredAndSortedData.map(item => item.id);

      const { error: deleteItemsError } = await supabase
        .from('purchase_order_items')
        .delete()
        .in('purchase_order_id', orderIdsToDelete);

      if (deleteItemsError) throw deleteItemsError;

      const { error: deleteOrdersError } = await supabase
        .from('purchase_orders')
        .delete()
        .in('id', orderIdsToDelete);

      if (deleteOrdersError) throw deleteOrdersError;

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat laporan pembelian...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchPurchaseData} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalPurchaseAmount)}</p>
          </div>
        </div>
        <div className="bg-green-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-green-100 p-3 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Jumlah Terbayar (Periode Ini)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalPaidAmount)}</p>
          </div>
        </div>
        <div className="bg-yellow-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-yellow-100 p-3 rounded-lg">
            <ReceiptText className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Jumlah Hutang (Periode Ini)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalDueAmount)}</p>
          </div>
        </div>
        <div className="bg-purple-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-purple-100 p-3 rounded-lg">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Transaksi Hari Ini</p>
            <p className="text-2xl font-bold text-gray-900">{summary.transactionsToday}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <PurchaseReportTable
            data={paginatedData}
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            totalPurchaseAmount={summary.totalPurchaseAmount}
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