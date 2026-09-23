import React, { useState, useMemo, useEffect } from 'react';
import { useSalesReports } from '../../hooks/useSalesReports';
import SalesDetailPanel from '../../components/laporan/SalesDetailPanel';
import { formatCurrency } from '../../utils/formatters';
import { CalendarDays, DollarSign, Users, Trash2, Loader2, FileCheck2 } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import Pagination from '../../components/Pagination';
import SalesTable from '../../components/laporan/SalesTable';
import { SalesItem, PendingOrderItem } from '../../types/orderTypes';
import { useSession } from '../../components/SessionContextProvider';
import { useProfileNames } from '../../hooks/useProfileNames';
import { collectStaffIds, makeOrderFilter, buildStaffOptions, SalesReportFilters, sumPaidAndRemaining } from '../../utils/salesReportFilters';
import { fetchCompanyInfo, printTandaTerimaWindow, TandaTerimaRow } from '../../utils/printTandaTerima';
import { useLocation } from 'react-router-dom';
import { readReportParams } from '../../utils/reportQueryParams';
import DrilldownBanner from '../../components/laporan/DrilldownBanner';

type CombinedSalesItem = SalesItem | PendingOrderItem;

const LaporanPenjualan: React.FC = () => {
  const { profile } = useSession();

  // Filter awal bisa datang dari URL (dipakai saat menelusuri angka di Laporan Neraca)
  const qp = readReportParams(useLocation().search);

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(qp.start ?? new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(qp.end ?? new Date().toISOString().split('T')[0]);
  const [selectedSalesItem, setSelectedSalesItem] = useState<CombinedSalesItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Sort
  const [sortColumn, setSortColumn] = useState<string>('order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filters
  // Default laporan hanya menampilkan order yang sudah jadi transaksi. Dibuka dari
  // Laporan Neraca (include=all) berarti semua order ikut, agar angkanya bisa dicocokkan.
  const [includeAllOrders, setIncludeAllOrders] = useState<boolean>(qp.include === 'all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(qp.status ?? 'all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(qp.method ?? 'all');
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

  // Reset ke halaman 1 saat filter/pencarian berubah agar hasil filter tidak "kosong" di halaman lanjutan
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, paymentStatusFilter, selectedPaymentMethod, selectedKasirId, selectedCustomerId, selectedDesignerId, selectedOperatorId, selectedFinishingId, includeAllOrders]);

  // Gunakan snapshot saat refetch agar UI tidak kosong
  const effectiveData: CombinedSalesItem[] = useMemo(() => {
    if (hasLoadedOnce && loadingSales) return snapshotData;
    return allSalesData;
  }, [hasLoadedOnce, loadingSales, snapshotData, allSalesData]);

  const reportableData = useMemo(
    () =>
      includeAllOrders
        ? effectiveData
        : effectiveData.filter(
            (item: any) =>
              item.payment_status === 'paid' ||
              (item.payment_status === 'pending' && item.payment_method !== null && item.payment_method !== '')
          ),
    [effectiveData, includeAllOrders]
  );

  // --- Nama staff (kasir/operator/finishing dari order, designer dari item) ---
  const staffIds = useMemo(() => collectStaffIds(reportableData), [reportableData]);
  const nameById = useProfileNames(staffIds);

  // --- Satu aturan filter untuk tabel, cetak, dan opsi dropdown ---
  const filters: SalesReportFilters = {
    searchTerm,
    paymentStatusFilter,
    selectedPaymentMethod,
    selectedCustomerId,
    selectedKasirId,
    selectedDesignerId,
    selectedOperatorId,
    selectedFinishingId,
  };
  const passes = useMemo(
    () => makeOrderFilter(filters, nameById),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchTerm, paymentStatusFilter, selectedPaymentMethod, selectedCustomerId, selectedKasirId, selectedDesignerId, selectedOperatorId, selectedFinishingId, nameById]
  );

  // Opsi dropdown: dari data yang lolos semua filter lain (kecuali dimensinya sendiri), tanpa duplikat
  const staffOptions = useMemo(
    () => buildStaffOptions(reportableData, passes, nameById),
    [reportableData, passes, nameById]
  );

  // --- Pipeline filter + sort (client-side) ---
  const filteredAndSortedData = useMemo(() => {
    const filteredBySearch = reportableData.filter((o) => passes(o));

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
  }, [reportableData, passes, sortColumn, sortDirection]);

  // Angka pembanding bila halaman dibuka dari Laporan Neraca
  const { totalDibayar, totalKekurangan } = useMemo(
    () => sumPaidAndRemaining(filteredAndSortedData),
    [filteredAndSortedData]
  );
  const totalPenjualan = useMemo(
    () => filteredAndSortedData.reduce((sum, it: any) => sum + Number(it.final_amount || 0), 0),
    [filteredAndSortedData]
  );
  const bandingLabel = qp.focus === 'dibayar' ? 'Dibayar' : qp.focus === 'kekurangan' ? 'Kekurangan' : 'Total Penjualan';
  const bandingValue = qp.focus === 'dibayar' ? totalDibayar : qp.focus === 'kekurangan' ? totalKekurangan : totalPenjualan;

  // --- Pagination (client-side) ---
  const paginatedCombinedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, pageSize]);

  const totalCombinedCount = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalCombinedCount / pageSize);

  // --- Total penjualan (terfilter) ---
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
  // filteredAndSortedData sudah hanya berisi order yang reportable ('paid' atau
  // 'pending' dengan metode pembayaran terisi), jadi transactionsToday = jumlahnya.
  const filteredSummary = useMemo(() => {
    let omset = 0;
    let piutang = 0;
    const transactionsToday = filteredAndSortedData.length;

    filteredAndSortedData.forEach((it: any) => {
      if (it.payment_status === 'paid') {
        omset += Number(it.final_amount || 0);
      } else {
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

  // === CETAK TANDA TERIMA (untuk baris yang dicentang, bisa lintas halaman) ===
  const [printingTandaTerima, setPrintingTandaTerima] = useState(false);
  const handlePrintTandaTerima = async () => {
    if (!selectedIds.length) {
      showError('Centang dulu transaksi yang ingin dicetak tanda terimanya.');
      return;
    }
    const selectedSet = new Set(selectedIds);
    const selectedOrders = filteredAndSortedData.filter(o => selectedSet.has(o.id));
    if (!selectedOrders.length) {
      showError('Transaksi terpilih tidak ditemukan pada data saat ini.');
      return;
    }

    setPrintingTandaTerima(true);
    try {
      const company = await fetchCompanyInfo();
      const rows: TandaTerimaRow[] = selectedOrders.map((o: any) => {
        const finalAmount = Number(o.final_amount || 0);
        const paid = o.payment_status === 'paid'
          ? finalAmount
          : Math.min(finalAmount, Number(getDpFromNotes(o.notes) || 0));
        return {
          invoice_number: o.invoice_number,
          order_date: o.order_date,
          pickup_date: o.pickup_date,
          customer_name: o.customer_display_name || o.pelanggan?.[0]?.nama_pelanggan || 'Umum',
          customer_phone: o.customer_display_phone || o.pelanggan?.[0]?.telepon || '',
          items: (Array.isArray(o.order_items) ? o.order_items : []).map((it: any) => ({
            product_name: it.product_name || '-',
            quantity: Number(it.quantity || 0),
            dimensions: it.dimensions,
          })),
          final_amount: finalAmount,
          paid,
          remaining: Math.max(0, finalAmount - paid),
          payment_status: o.payment_status,
        };
      });
      const handedOverBy = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
      printTandaTerimaWindow({ rows, company, handedOverBy });
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'Gagal menyiapkan tanda terima.');
    } finally {
      setPrintingTandaTerima(false);
    }
  };

  const selectionActions = (
    <div className="flex flex-wrap justify-end gap-3">
      {selectedIds.length > 0 && (
        <button
          onClick={handlePrintTandaTerima}
          disabled={printingTandaTerima}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FileCheck2 className="h-5 w-5 mr-2" />
          Cetak Tanda Terima ({selectedIds.length})
        </button>
      )}
      <button
        onClick={handleDeleteSelectedIds}
        disabled={!selectedIds.length}
        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        <Trash2 className="h-5 w-5 mr-2" />
        Hapus Terpilih ({selectedIds.length})
      </button>
    </div>
  );

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

      {qp.from === 'neraca' && qp.label && typeof qp.value === 'number' && (
        <DrilldownBanner
          label={qp.label}
          neracaValue={qp.value}
          pageValue={bandingValue}
          fieldLabel={bandingLabel}
        />
      )}

      {/* KARTU RINGKASAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-blue-100 p-3 rounded-lg">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Omset (Periode Ini)</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalSalesAmountForFilteredData)}
            </p>
          </div>
        </div>

        <div className="bg-yellow-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-yellow-100 p-3 rounded-lg">
            <Users className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Piutang (Total)</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(filteredSummary.piutang)}
            </p>
          </div>
        </div>

        <div className="bg-purple-100 rounded-lg shadow-sm p-6 flex items-center">
          <div className="bg-purple-100 p-3 rounded-lg">
            <CalendarDays className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Transaksi</p>
            <p className="text-2xl font-bold text-gray-900">
              {filteredSummary.transactionsToday}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <SalesTable
            data={paginatedCombinedData}
            printData={filteredAndSortedData}
            nameById={nameById}
            customerOptions={staffOptions.customer}
            kasirOptions={staffOptions.kasir}
            designerOptions={staffOptions.designer}
            operatorOptions={staffOptions.operator}
            finishingOptions={staffOptions.finishing}
            numberOffset={(currentPage - 1) * pageSize}
            toolbar={selectionActions}
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
            selectedKasirId={selectedKasirId}
            onKasirChange={(e) => setSelectedKasirId(e.target.value)}
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={setSelectedCustomerId}
            selectedDesignerId={selectedDesignerId}
            onDesignerChange={(e) => setSelectedDesignerId(e.target.value)}
            selectedOperatorId={selectedOperatorId}
            onOperatorChange={(e) => setSelectedOperatorId(e.target.value)}
            includeAllOrders={includeAllOrders}
            onIncludeAllOrdersChange={setIncludeAllOrders}
            selectedFinishingId={selectedFinishingId}
            onFinishingChange={(e) => setSelectedFinishingId(e.target.value)}
            isRefreshing={isRefreshing}

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
          <div className="mt-2">{selectionActions}</div>
        </div>
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <SalesDetailPanel selectedItem={selectedSalesItem} />
        </div>
      </div>
    </div>
  );
};

export default LaporanPenjualan;