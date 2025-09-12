import React, { useState, useMemo, useEffect } from 'react';
import { useSalesReports } from '../../hooks/useSalesReports';
import SalesDetailPanel from '../../components/laporan/SalesDetailPanel';
import { formatCurrency } from '../../utils/formatters';
import { CalendarDays, DollarSign, ReceiptText, Users, Trash2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import Pagination from '../../components/Pagination';
// import { useHistoryPendingSalesData } from '../../hooks/useHistoryPendingSalesData'; // Removed
import SalesTable from '../../components/laporan/SalesTable';
import { SalesItem, PendingOrderItem } from '../../types/orderTypes';

type CombinedSalesItem = SalesItem | PendingOrderItem;

const LaporanPenjualan: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSalesItem, setSelectedSalesItem] = useState<CombinedSalesItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // State untuk sortir
  const [sortColumn, setSortColumn] = useState<string>('order_date'); // Default sort by order_date
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default descending

  // State untuk filter status pembayaran
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all'); // 'all', 'paid', 'pending'

  // State untuk filter metode pembayaran
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all'); // 'all', 'cash', 'bank_transfer'

  // State untuk filter kasir dan pelanggan
  const [selectedKasirId, setSelectedKasirId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const {
    data: allSalesData, // Renamed from paidSalesData to reflect it contains all sales
    summary,
    loading: loadingSales, // Renamed from loadingPaidSales
    error: errorSales, // Renamed from errorPaidSales
    fetchSalesData,
  } = useSalesReports({ startDate, endDate });

  // Removed useHistoryPendingSalesData as allSalesData now includes pending
  // const {
  //   data: pendingSalesData,
  //   loading: loadingPendingSales,
  //   error: errorPendingSales,
  //   fetchPendingSales,
  // } = useHistoryPendingSalesData({
  //   durationFilter: 'all',
  //   searchTerm: '',
  // });

  const filteredAndSortedData = useMemo(() => {
    const filteredByPaymentStatus = allSalesData.filter(item => {
      if (paymentStatusFilter === 'all') return true;
      return item.payment_status === paymentStatusFilter;
    });

    const filteredByPaymentMethod = filteredByPaymentStatus.filter(item => {
      if (selectedPaymentMethod === 'all') return true;
      return item.payment_method === selectedPaymentMethod;
    });

    const filteredByKasir = filteredByPaymentMethod.filter(item => {
      if (!selectedKasirId) return true;
      return item.kasir_id === selectedKasirId;
    });

    const filteredByCustomer = filteredByKasir.filter(item => {
      if (!selectedCustomerId) return true;
      return item.customer_id === selectedCustomerId;
    });

    const filteredBySearch = filteredByCustomer.filter(item => {
      const customerName = item.customer_display_name || item.pelanggan?.[0]?.nama_pelanggan || '';
      const customerPhone = item.customer_display_phone || item.pelanggan?.[0]?.telepon || '';
      const kasirName = item.profiles?.first_name || ''; 
      
      return (
        (item.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kasirName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.order_items && Array.isArray(item.order_items) && item.order_items.some((oi: any) => oi.product_name.toLowerCase().includes(searchTerm.toLowerCase())))
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
      } else if (sortColumn === 'customer') {
        const nameA = (a.customer_display_name || a.pelanggan?.[0]?.nama_pelanggan || '').toLowerCase();
        const nameB = (b.customer_display_name || b.pelanggan?.[0]?.nama_pelanggan || '').toLowerCase();
        compareValue = nameA.localeCompare(nameB);
      } else if (sortColumn === 'cashier') {
        const cashierA = (a.profiles?.first_name || '').toLowerCase();
        const cashierB = (b.profiles?.first_name || '').toLowerCase();
        compareValue = cashierA.localeCompare(cashierB);
      } else if (sortColumn === 'payment_status') {
        const statusA = a.payment_status.toLowerCase();
        const statusB = b.payment_status.toLowerCase();
        // Custom order: pending, paid, cancelled
        const order = { 'pending': 1, 'paid': 2, 'cancelled': 3 };
        compareValue = (order[statusA as keyof typeof order] || 0) - (order[statusB as keyof typeof order] || 0);
      } else if (sortColumn === 'final_amount') {
        compareValue = a.final_amount - b.final_amount;
      } else if (sortColumn === 'invoice_number') {
        const invA = (a.invoice_number || '').toLowerCase();
        const invB = (b.invoice_number || '').toLowerCase();
        compareValue = invA.localeCompare(invB);
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sortedData;
  }, [allSalesData, searchTerm, paymentStatusFilter, selectedPaymentMethod, selectedKasirId, selectedCustomerId, sortColumn, sortDirection]);

  // Menghasilkan opsi kasir dari data yang sudah ada
  const kasirOptions = useMemo(() => {
    const uniqueKasirs = new Map<string, string>();
    filteredAndSortedData.forEach(order => { // Use filteredAndSortedData
      if (order.kasir_id && order.profiles?.first_name) {
        uniqueKasirs.set(order.kasir_id, `${order.profiles.first_name} ${order.profiles.last_name || ''}`);
      }
    });
    return Array.from(uniqueKasirs, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredAndSortedData]);

  // Menghasilkan opsi pelanggan dari data yang sudah ada
  const customerOptions = useMemo(() => {
    const uniqueCustomers = new Map<string, string>();
    filteredAndSortedData.forEach(order => { // Use filteredAndSortedData
      const customerId = order.customer_id;
      const customerName = order.customer_display_name || order.pelanggan?.[0]?.nama_pelanggan;
      if (customerId && customerName) {
        uniqueCustomers.set(customerId, customerName);
      }
    });
    return Array.from(uniqueCustomers, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredAndSortedData]);


  const paginatedCombinedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const totalCombinedCount = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalCombinedCount / pageSize);

  // Calculate total sales amount for ALL filtered data (not just paginated)
  const totalSalesAmountForFilteredData = useMemo(() => {
    return filteredAndSortedData.reduce((sum, item) => sum + item.final_amount, 0);
  }, [filteredAndSortedData]);

  useEffect(() => {
    if (selectedSalesItem) {
      const updatedItem = filteredAndSortedData.find(item => item.id === selectedSalesItem.id);
      setSelectedSalesItem(updatedItem || null);
    }
  }, [filteredAndSortedData, selectedSalesItem]);

  const handlePrint = () => {
    window.print();
  };

  const handleRowClick = (item: CombinedSalesItem) => {
    setSelectedSalesItem(item);
  };

  const handleDeleteSelected = async () => {
    if (!selectedSalesItem) {
      showError('Pilih transaksi yang ingin dihapus terlebih dahulu.');
      return;
    }
    if (!confirm(`Yakin ingin menghapus transaksi dengan faktur ${selectedSalesItem.invoice_number || selectedSalesItem.id.substring(0, 8)}...?`)) {
      return;
    }

    const toastId = showLoading('Menghapus transaksi...');
    try {
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', selectedSalesItem.id);

      if (deleteItemsError) throw deleteItemsError;

      const { error: deleteOrderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', selectedSalesItem.id);

      if (deleteOrderError) throw deleteOrderError;

      showSuccess('Transaksi berhasil dihapus!');
      setSelectedSalesItem(null);
      fetchSalesData();
      // fetchPendingSales(); // Removed
    } catch (err: any) {
      showError('Gagal menghapus transaksi: ' + err.message);
      console.error('Error deleting sales order:', err);
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
        .from('order_items')
        .delete()
        .in('order_id', orderIdsToDelete);

      if (deleteItemsError) throw deleteItemsError;

      const { error: deleteOrdersError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIdsToDelete);

      if (deleteOrdersError) throw deleteOrdersError;

      showSuccess('Semua transaksi yang difiltered berhasil dihapus!');
      setSelectedSalesItem(null);
      fetchSalesData();
      // fetchPendingSales(); // Removed
    } catch (err: any) {
      showError('Gagal menghapus semua transaksi: ' + err.message);
      console.error('Error deleting all filtered sales orders:', err);
    } finally {
      dismissToast(toastId);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Fungsi untuk menangani sortir kolom
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc'); // Default ke ascending saat mengganti kolom
    }
  };

  if (loadingSales) { // Only check loadingSales
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat laporan penjualan...</p>
      </div>
    );
  }

  if (errorSales) { // Only check errorSales
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {errorSales}</p>
        <button onClick={() => { fetchSalesData(); }} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan</h1>
          <p className="text-gray-600">Lihat dan cetak laporan penjualan yang berhasil.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-blue-100 p-3 rounded-lg">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Omset (Periode Ini)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.omset)}</p>
          </div>
        </div>
        <div className="bg-green-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-green-100 p-3 rounded-lg">
            <ReceiptText className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Laba (Periode Ini)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.laba)}</p>
          </div>
        </div>
        <div className="bg-yellow-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-yellow-100 p-3 rounded-lg">
            <Users className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Piutang (Total)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.piutang)}</p>
          </div>
        </div>
        <div className="bg-purple-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-purple-100 p-3 rounded-lg">
            <CalendarDays className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Transaksi Hari Ini</p>
            <p className="text-2xl font-bold text-gray-900">{summary.transactionsToday}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <SalesTable
            data={paginatedCombinedData}
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            totalSalesAmount={totalSalesAmountForFilteredData}
            onPrint={handlePrint}
            onRowClick={handleRowClick}
            selectedItemId={selectedSalesItem?.id || null}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            paymentStatusFilter={paymentStatusFilter}
            onPaymentStatusFilterChange={(e) => setPaymentStatusFilter(e.target.value)}
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodChange={(e) => setSelectedPaymentMethod(e.target.value)}
            kasirOptions={kasirOptions}
            selectedKasirId={selectedKasirId}
            onKasirChange={(e) => setSelectedKasirId(e.target.value)}
            customerOptions={customerOptions}
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={(e) => setSelectedCustomerId(e.target.value)}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            totalItems={totalCombinedCount}
          />
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleDeleteSelected}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Hapus Transaksi
            </button>
            <button
              onClick={handleDeleteAllFiltered}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Hapus Semua (Filter)
            </button>
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <SalesDetailPanel selectedItem={selectedSalesItem} />
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

export default LaporanPenjualan;