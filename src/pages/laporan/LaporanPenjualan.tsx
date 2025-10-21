import React, { useState, useMemo, useEffect } from 'react';
import { useSalesReports } from '../../hooks/useSalesReports';
import SalesDetailPanel from '../../components/laporan/SalesDetailPanel';
import { formatCurrency } from '../../utils/formatters';
import { CalendarDays, DollarSign, Users, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import Pagination from '../../components/Pagination';
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

  // Sort
  const [sortColumn, setSortColumn] = useState<string>('order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedKasirId, setSelectedKasirId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  const [selectedFinishingId, setSelectedFinishingId] = useState<string>('');

  const {
    data: allSalesData,
    loading: loadingSales,
    error: errorSales,
    fetchSalesData,
  } = useSalesReports({ startDate, endDate });

  // === Loader awareness: bedakan initial vs refetch ===
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [snapshotData, setSnapshotData] = useState<CombinedSalesItem[]>([]);

  useEffect(() => {
    if (!loadingSales) {
      setHasLoadedOnce(true);
      setSnapshotData(allSalesData);
    }
  }, [loadingSales, allSalesData]);

  const showInitialLoader = !hasLoadedOnce && loadingSales;
  const isRefreshing = hasLoadedOnce && loadingSales;

  // === Tanggal change: reset page + clear selection; refetch via effect ===
  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    setCurrentPage(1);
    setSelectedSalesItem(null);
  };
  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    setCurrentPage(1);
    setSelectedSalesItem(null);
  };

  // Refetch ketika tanggal berubah (SPA)
  useEffect(() => {
    fetchSalesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // Gunakan snapshot saat refetch agar UI tidak kosong
  const effectiveData: CombinedSalesItem[] = useMemo(() => {
    if (hasLoadedOnce && loadingSales) return snapshotData;
    return allSalesData;
  }, [hasLoadedOnce, loadingSales, snapshotData, allSalesData]);

  // --- Helpers: extract IDs dari order/order_items ---
  const extractDesignerIdsFromOrder = (order: any): { id: string; name: string }[] => {
    const out = new Map<string, string>();
    const directId = order?.designer_id || order?.designerId;
    const directName =
      order?.designer_name ||
      order?.designerName ||
      order?.designer?.name ||
      (order?.designer?.first_name
        ? `${order.designer.first_name}${order?.designer?.last_name ? ` ${order.designer.last_name}` : ''}`
        : '');
    if (directId) out.set(String(directId), String(directName || directId));

    const items = Array.isArray(order?.order_items) ? order.order_items : [];
    items.forEach((it: any) => {
      const id = it?.designer_id || it?.designerId || it?.designer?.id;
      const name =
        it?.designer_name ||
        it?.designerName ||
        it?.designer?.name ||
        (it?.designer?.first_name
          ? `${it.designer.first_name}${it?.designer?.last_name ? ` ${it.designer.last_name}` : ''}`
          : '');
      if (id) out.set(String(id), String(name || id));
    });
    return Array.from(out, ([id, name]) => ({ id, name }));
  };

  const extractOperatorIdsFromOrder = (order: any): { id: string; name: string }[] => {
    const out = new Map<string, string>();
    const directId = order?.operator_id || order?.operatorId;
    const directName =
      order?.operator_name ||
      order?.operatorName ||
      order?.operator?.name ||
      (order?.operator?.first_name
        ? `${order.operator.first_name}${order?.operator?.last_name ? ` ${order.operator.last_name}` : ''}`
        : '');
    if (directId) out.set(String(directId), String(directName || directId));

    const items = Array.isArray(order?.order_items) ? order.order_items : [];
    items.forEach((it: any) => {
      const id = it?.operator_id || it?.operatorId || it?.operator?.id;
      const name =
        it?.operator_name ||
        it?.operatorName ||
        it?.operator?.name ||
        (it?.operator?.first_name
          ? `${it.operator.first_name}${it?.operator?.last_name ? ` ${it.operator.last_name}` : ''}`
          : '');
      if (id) out.set(String(id), String(name || id));
    });
    return Array.from(out, ([id, name]) => ({ id, name }));
  };

  const extractFinishingIdsFromOrder = (order: any): { id: string; name: string }[] => {
    const out = new Map<string, string>();
    const items = Array.isArray(order?.order_items) ? order.order_items : [];
    items.forEach((it: any) => {
      const opts = it?.dimensions?.additional_options;
      if (Array.isArray(opts)) {
        opts.forEach((op: any) => {
          const isFinishing =
            op?.type === 'finishing' ||
            op?.category === 'finishing' ||
            /finishing/i.test(String(op?.name || op?.label || ''));
          if (isFinishing) {
            const id = op?.id || op?.value || op?.code || op?.slug || String(op?.name || op?.label || 'finishing');
            const label = op?.label || op?.name || op?.text || String(id);
            out.set(String(id), String(label));
          }
        });
      }
      const fid = it?.finishing_id || it?.finishingId;
      const fname = it?.finishing_name || it?.finishingName;
      if (fid) out.set(String(fid), String(fname || fid));
    });
    const ofid = order?.finishing_id || order?.finishingId;
    const ofname = order?.finishing_name || order?.finishingName;
    if (ofid) out.set(String(ofid), String(ofname || ofid));
    return Array.from(out, ([id, name]) => ({ id, name }));
  };

  // --- Pipeline filter + sort (client-side) ---
  const filteredAndSortedData = useMemo(() => {
    const filteredByPaymentStatus = effectiveData.filter(item => {
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

    const filteredByDesigner = filteredByCustomer.filter(order => {
      if (!selectedDesignerId) return true;
      const candidates = extractDesignerIdsFromOrder(order).map(x => x.id);
      return candidates.includes(selectedDesignerId);
    });

    const filteredByOperator = filteredByDesigner.filter(order => {
      if (!selectedOperatorId) return true;
      const candidates = extractOperatorIdsFromOrder(order).map(x => x.id);
      return candidates.includes(selectedOperatorId);
    });

    const filteredByFinishing = filteredByOperator.filter(order => {
      if (!selectedFinishingId) return true;
      const candidates = extractFinishingIdsFromOrder(order).map(x => x.id);
      return candidates.includes(selectedFinishingId);
    });

    const filteredBySearch = filteredByFinishing.filter(item => {
      const customerName = item.customer_display_name || item.pelanggan?.[0]?.nama_pelanggan || '';
      const customerPhone = item.customer_display_phone || item.pelanggan?.[0]?.telepon || '';
      const kasirName = item.profiles?.first_name || '';

      return (
        (item.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kasirName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.order_items &&
          Array.isArray(item.order_items) &&
          item.order_items.some((oi: any) =>
            String(oi.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
          ))
      );
    });

    const sortedData = [...filteredBySearch].sort((a, b) => {
      let compareValue = 0;

      if (sortColumn === 'order_date') {
        const dateA = new Date(a.order_date).getTime();
        const dateB = new Date(b.order_date).getTime();
        compareValue =
          dateA !== dateB
            ? dateA - dateB
            : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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
        const order = { pending: 1, paid: 2, cancelled: 3 };
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
  }, [
    effectiveData,
    searchTerm,
    paymentStatusFilter,
    selectedPaymentMethod,
    selectedKasirId,
    selectedCustomerId,
    selectedDesignerId,
    selectedOperatorId,
    selectedFinishingId,
    sortColumn,
    sortDirection,
  ]);

  // --- Options dari data terfilter ---
  const kasirOptions = useMemo(() => {
    const uniqueKasirs = new Map<string, string>();
    filteredAndSortedData.forEach(order => {
      if (order.kasir_id && order.profiles?.first_name) {
        uniqueKasirs.set(
          order.kasir_id,
          `${order.profiles.first_name} ${order.profiles.last_name || ''}`.trim()
        );
      }
    });
    return Array.from(uniqueKasirs, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [filteredAndSortedData]);

  const customerOptions = useMemo(() => {
    const uniqueCustomers = new Map<string, string>();
    filteredAndSortedData.forEach(order => {
      const customerId = order.customer_id;
      const customerName =
        order.customer_display_name || order.pelanggan?.[0]?.nama_pelanggan;
      if (customerId && customerName) uniqueCustomers.set(customerId, customerName);
    });
    return Array.from(uniqueCustomers, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [filteredAndSortedData]);

  const designerOptions = useMemo(() => {
    const map = new Map<string, string>();
    filteredAndSortedData.forEach(order => {
      extractDesignerIdsFromOrder(order).forEach(({ id, name }) => {
        if (id) map.set(id, name || id);
      });
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [filteredAndSortedData]);

  const operatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    filteredAndSortedData.forEach(order => {
      extractOperatorIdsFromOrder(order).forEach(({ id, name }) => {
        if (id) map.set(id, name || id);
      });
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [filteredAndSortedData]);

  const finishingOptions = useMemo(() => {
    const map = new Map<string, string>();
    filteredAndSortedData.forEach(order => {
      extractFinishingIdsFromOrder(order).forEach(({ id, name }) => {
        if (id) map.set(id, name || id);
      });
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [filteredAndSortedData]);

  // --- Pagination (client-side) ---  (HANYA SEKALI)
  const paginatedCombinedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const totalCombinedCount = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalCombinedCount / pageSize);

  // --- Total penjualan (terfilter) --- (HANYA SEKALI)
  const totalSalesAmountForFilteredData = useMemo(() => {
    return filteredAndSortedData.reduce((sum, item) => sum + item.final_amount, 0);
  }, [filteredAndSortedData]);

  // --- helper parse dp_amount dari kolom notes ---
  const getDpFromNotes = (notes: any): number => {
    try {
      if (!notes) return 0;
      if (typeof notes === 'object' && notes !== null) {
        if (typeof notes.dp_amount === 'number') return notes.dp_amount || 0;
        if (typeof (notes as any).PaymentDetails?.dp_amount === 'number')
          return (notes as any).PaymentDetails.dp_amount || 0;
      }
      const str = String(notes).trim();
      const prefix = 'Payment Details:';
      let jsonPart = str.startsWith(prefix) ? str.slice(prefix.length).trim() : str;
      const parsed = JSON.parse(jsonPart);
      if (typeof parsed?.dp_amount === 'number') return parsed.dp_amount || 0;
      if (typeof parsed?.PaymentDetails?.dp_amount === 'number')
        return parsed.PaymentDetails.dp_amount || 0;
      return 0;
    } catch {
      return 0;
    }
  };

  // --- Ringkasan (terfilter, client-side) ---
  const filteredSummary = useMemo(() => {
    let omset = 0;
    let piutang = 0;
    let transactionsToday = filteredAndSortedData.length;

    filteredAndSortedData.forEach((it: any) => {
      if (it.payment_status === 'paid') {
        omset += Number(it.final_amount || 0);
      }
      if (it.payment_status === 'pending' && it.payment_method !== null && it.payment_method !== '') {
        const finalAmount = Number(it.final_amount || 0);
        const dpAmount = getDpFromNotes(it.notes);
        const remaining = Math.max(0, finalAmount - Number(dpAmount || 0));
        piutang += remaining;
        if (dpAmount > 0) omset += dpAmount;
      }
    });

    return { omset, piutang, transactionsToday };
  }, [filteredAndSortedData]);

  // --- Sync selected row ---
  useEffect(() => {
    if (selectedSalesItem) {
      const updatedItem = filteredAndSortedData.find(item => item.id === selectedSalesItem.id);
      setSelectedSalesItem(updatedItem || null);
    }
  }, [filteredAndSortedData, selectedSalesItem]);

  const handlePrint = () => window.print();
  const handleRowClick = (item: CombinedSalesItem) => setSelectedSalesItem(item);

  // === SELECTION (checkbox) ===
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => setSelectedIds([]), [startDate, endDate, paymentStatusFilter, selectedPaymentMethod]);

  const toggleRow = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const allPageIds = useMemo(() => paginatedCombinedData.map(d => d.id), [paginatedCombinedData]);
  const allSelectedOnPage = allPageIds.length > 0 && allPageIds.every(id => selectedIds.includes(id));
  const someSelectedOnPage = allPageIds.some(id => selectedIds.includes(id)) && !allSelectedOnPage;
  const toggleAllOnPage = (checked: boolean) => {
    if (!checked) setSelectedIds(prev => prev.filter(id => !allPageIds.includes(id)));
    else setSelectedIds(prev => Array.from(new Set([...prev, ...allPageIds])));
  };

  const handleDeleteSelectedIds = async () => {
    if (!selectedIds.length) {
      showError('Pilih data yang ingin dihapus.');
      return;
    }
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} transaksi terpilih?`)) return;

    const toastId = showLoading('Menghapus transaksi terpilih...');
    try {
      const { error: delItemsErr } = await supabase.from('order_items').delete().in('order_id', selectedIds);
      if (delItemsErr) throw delItemsErr;
      const { error: delOrdersErr } = await supabase.from('orders').delete().in('id', selectedIds);
      if (delOrdersErr) throw delOrdersErr;

      showSuccess('Transaksi terpilih berhasil dihapus.');
      setSelectedIds([]);
      fetchSalesData();
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Gagal menghapus transaksi.');
    } finally {
      dismissToast(toastId);
    }
  };

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleSort = (column: string) => {
    if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Loader full page hanya saat load awal
  if (showInitialLoader) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat laporan penjualan...</p>
      </div>
    );
  }

  if (errorSales) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {errorSales}</p>
        <button
          onClick={() => {
            fetchSalesData();
          }}
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
          <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan</h1>
          <p className="text-gray-600">Lihat dan cetak laporan penjualan yang berhasil.</p>
        </div>

        {/* Mini loader saat refetch */}
        {isRefreshing && (
          <div className="flex items-center text-sm text-gray-500">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Memperbarui data…
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <SalesTable
            data={paginatedCombinedData}
            searchTerm={searchTerm}
            onSearchChange={(e) => setSearchTerm(e.target.value)}
            startDate={startDate}
            setStartDate={handleStartDateChange}
            endDate={endDate}
            setEndDate={handleEndDateChange}
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
            designerOptions={designerOptions}
            selectedDesignerId={selectedDesignerId}
            onDesignerChange={(e) => setSelectedDesignerId(e.target.value)}
            operatorOptions={operatorOptions}
            selectedOperatorId={selectedOperatorId}
            onOperatorChange={(e) => setSelectedOperatorId(e.target.value)}
            finishingOptions={finishingOptions}
            selectedFinishingId={selectedFinishingId}
            onFinishingChange={(e) => setSelectedFinishingId(e.target.value)}
            isRefreshing={isRefreshing} // ⬅️ mini loader di dalam tabel

            /* === NEW: props untuk checkbox selection === */
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAllPage={toggleAllOnPage}
            allSelectedOnPage={allSelectedOnPage}
            someSelectedOnPage={someSelectedOnPage}
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
              onClick={handleDeleteSelectedIds}
              disabled={!selectedIds.length}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Hapus Terpilih ({selectedIds.length})
            </button>
            <button
              onClick={handleDeleteSelectedIds}
              disabled={!selectedIds.length}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
