import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Printer, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { SalesItem, PendingOrderItem } from '../../types/orderTypes';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../integrations/supabase/client';
import SearchableSelect from './SearchableSelect';

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
    const jsonPart = str.startsWith(prefix) ? str.slice(prefix.length).trim() : str;
    const parsed = JSON.parse(jsonPart);
    if (typeof parsed?.dp_amount === 'number') return parsed.dp_amount || 0;
    if (typeof parsed?.PaymentDetails?.dp_amount === 'number') return parsed.PaymentDetails.dp_amount || 0;
    return 0;
  } catch {
    return 0;
  }
};

const nameFromProfile = (p: any) => {
  if (!p) return '';
  const fn = String(p.first_name ?? '').trim();
  const ln = String(p.last_name ?? '').trim();
  return [fn, ln].filter(Boolean).join(' ').trim();
};

type CombinedSalesItem = SalesItem | PendingOrderItem;

type IdName = { id: string; name: string };

interface SalesTableProps {
  data: CombinedSalesItem[];
  /** Seluruh data hasil filter (tanpa pagination) — dipakai khusus untuk cetak. */
  printData?: CombinedSalesItem[];
  /**
   * Seluruh data periode ini SEBELUM filter dropdown/pencarian diterapkan.
   * Dipakai untuk mengisi opsi dropdown (customer/kasir/designer/operator/finishing)
   * agar opsinya selalu sesuai data yang ada, tanpa duplikat.
   */
  optionsData?: CombinedSalesItem[];
  /** Offset penomoran baris di layar agar lanjut antar halaman, mis. (currentPage-1)*pageSize. */
  numberOffset?: number;
  /** Tombol aksi (mis. cetak tanda terima / hapus) yang ditampilkan tepat di atas tabel. */
  toolbar?: React.ReactNode;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  totalSalesAmount: number;
  onPrint: () => void;
  onRowClick: (item: CombinedSalesItem) => void;
  selectedItemId: string | null;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  paymentStatusFilter: string;
  onPaymentStatusFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedPaymentMethod: string;
  onPaymentMethodChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;

  selectedCustomerId: string; // value = customer_id
  onCustomerChange: (customerId: string) => void;

  selectedKasirId: string;
  onKasirChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedDesignerId: string;
  onDesignerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedOperatorId: string;
  onOperatorChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedFinishingId: string;
  onFinishingChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;

  isRefreshing?: boolean;

  /* === tambahan untuk checkbox selection (opsional agar backward compatible) === */
  selectedIds?: string[];
  onToggleRow?: (id: string) => void;
  onToggleAllPage?: (checked: boolean) => void;
  allSelectedOnPage?: boolean;
  someSelectedOnPage?: boolean;
}

const displayName = (p: { first_name?: string | null; last_name?: string | null }) => {
  const fn = String(p.first_name ?? '').trim();
  const ln = String(p.last_name ?? '').trim();
  const nm = [fn, ln].filter(Boolean).join(' ').trim();
  return nm || '-';
};

const SalesTable: React.FC<SalesTableProps> = ({
  data,
  printData,
  optionsData,
  numberOffset = 0,
  toolbar,
  searchTerm,
  onSearchChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  totalSalesAmount,
  onPrint,
  onRowClick,
  selectedItemId,
  sortColumn,
  sortDirection,
  onSort,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  selectedPaymentMethod,
  onPaymentMethodChange,
  selectedCustomerId,
  onCustomerChange,

  selectedKasirId,
  onKasirChange,
  selectedDesignerId,
  onDesignerChange,
  selectedOperatorId,
  onOperatorChange,
  selectedFinishingId,
  onFinishingChange,

  isRefreshing = false,

  /* selection (opsional) */
  selectedIds,
  onToggleRow,
  onToggleAllPage,
  allSelectedOnPage,
  someSelectedOnPage,
}) => {

  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
    }
    return null;
  };

  const formatPaymentMethod = (method: string | null | undefined) => {
    if (!method) return 'N/A';
    return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // ===== A) Cache profile =====
  type ProfileName = { first_name: string | null; last_name: string | null };
  const [profileCache, setProfileCache] = useState<Record<string, ProfileName>>({});

  useEffect(() => {
    // Kumpulkan id petugas dari semua sumber (halaman aktif, data cetak, data opsi dropdown)
    // supaya nama selalu bisa di-resolve, termasuk untuk baris di luar halaman aktif.
    const sourceForProfiles: any[] = [
      ...data,
      ...(printData ?? []),
      ...(optionsData ?? []),
    ];
    const ids = new Set<string>();
    sourceForProfiles.forEach((item: any) => {
      ['kasir_id', 'designer_id', 'operator_id', 'finishing_id'].forEach((key) => {
        const val = item?.[key];
        if (val) ids.add(String(val));
      });
      const items = Array.isArray((item as any)?.order_items) ? (item as any).order_items : [];
      items.forEach((it: any) => {
        ['designer_id', 'operator_id', 'finishing_id'].forEach((key) => {
          const val = it?.[key];
          if (val) ids.add(String(val));
        });
      });
    });

    const idsToFetch = Array.from(ids).filter(id => !profileCache[id]);
    if (idsToFetch.length === 0) return;

    (async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', idsToFetch);

      if (error) {
        console.error('profiles lookup error:', error);
        return;
      }
      const next = { ...profileCache };
      (profiles || []).forEach((p: any) => {
        next[String(p.id)] = { first_name: p.first_name ?? null, last_name: p.last_name ?? null };
      });
      setProfileCache(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, printData, optionsData]);

  const getNameFromProfilesById = (id?: string | null) => {
    if (!id) return '';
    const rec = profileCache[String(id)];
    if (!rec) return '';
    return displayName(rec);
  };

  // ===== C) Nama petugas tampilan =====
  const computePetugasNames = (item: any) => {
    const ensureArray = (v: any) => (Array.isArray(v) ? v : []);

    // ambil nama dari profileCache berdasarkan id
    const nameById = (rawId: any): string => {
      if (rawId === null || rawId === undefined || rawId === '') return '';
      const id = String(rawId);
      const n = getNameFromProfilesById(id);
      return n ? n.trim() : '';
    };

    const joinOrDash = (names: string[]): string => {
      const cleaned = names
        .map((s) => (s || '').toString().trim())
        .filter(Boolean);
      const uniq = Array.from(new Set(cleaned));
      return uniq.length ? uniq.join(', ') : '-';
    };

    // === DESIGNER: hanya dari order_items.designer_id (bisa lebih dari 1) ===
    const designerIds = new Set<string>();
    ensureArray((item as any).order_items).forEach((it: any) => {
      if (it?.designer_id) {
        designerIds.add(String(it.designer_id));
      }
    });

    const designerNames: string[] = [];
    designerIds.forEach((id) => {
      const nm = nameById(id);
      if (nm) designerNames.push(nm);
    });
    const designer = joinOrDash(designerNames);

    // === KASIR: dari orders.kasir_id ===
    const kasirName = nameById(item?.kasir_id) || nameFromProfile(item?.profiles);
    const kasir = kasirName && kasirName.trim() ? kasirName.trim() : '-';

    // === OPERATOR: dari orders.operator_id ===
    const operatorName = nameById(item?.operator_id);
    const operator = operatorName && operatorName.trim() ? operatorName.trim() : '-';

    // === FINISHING: dari orders.finishing_id ===
    const finishingName = nameById(item?.finishing_id);
    const finishing = finishingName && finishingName.trim() ? finishingName.trim() : '-';

    return { designer, kasir, operator, finishing };
  };

  // ===== C.1) Helper untuk kapitalisasi & render petugas (adopsi dari StatusOrder) =====
  const ucfirst = (s?: string | null): string => {
    const str = (s ?? '').toString().trim();
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const renderPetugas = (item: any) => {
    const p = computePetugasNames(item);

    const rows: Array<[string, string]> = [
      ['Designer', p.designer],
      ['Kasir', p.kasir],
      ['Operator', p.operator],
      ['Finishing', p.finishing],
    ];

    return (
      <div className="whitespace-pre-line break-words">
        {rows.map(([label, val]) => (
          <div key={label}>
            <span className="text-gray-500">{label}: </span>
            <span className="text-gray-900">
              {val && val.toString().trim() ? val : '-'}
            </span>
          </div>
        ))}
      </div>
    );
  };
  
  // ===== D) CUSTOMER (label & id) =====
  const extractCustomerLabel = (it: any): string => {
    return (it.customer_display_name ? it.customer_display_name.charAt(0).toUpperCase() + it.customer_display_name.slice(1) : '') || it?.pelanggan?.[0]?.nama_pelanggan || 'Umum';
  };
  const extractCustomerId = (it: any): string | null => {
    const raw = it?.customer_id;
    return raw != null && raw !== '' ? String(raw) : null;
  };

  // ===== E) Data tanpa filter customer =====
  const anyOrderItemMatch = (arr: any[] | undefined, key: string, uuid: string) =>
    Array.isArray(arr) && arr.some((x) => String(x?.[key] ?? '') === uuid);

  type FilterDim = 'customer' | 'kasir' | 'designer' | 'operator' | 'finishing';

  // Predikat filter baris — dipakai bersama untuk data layar (paginated), data cetak,
  // dan opsi dropdown. `except` = dimensi yang TIDAK diterapkan (agar opsi dropdown
  // suatu dimensi tetap menampilkan alternatif lain, bukan cuma yang sedang dipilih).
  const passesRowFilters = (it: any, except?: FilterDim): boolean => {
    if (
      !(
        it.payment_status === 'paid' ||
        (it.payment_status === 'pending' && it.payment_method !== null && it.payment_method !== '')
      )
    ) return false;

    if (paymentStatusFilter !== 'all' && it.payment_status !== paymentStatusFilter) return false;
    if (selectedPaymentMethod !== 'all' && (it.payment_method ?? '') !== selectedPaymentMethod) return false;

    if (except !== 'customer' && selectedCustomerId) {
      if (String(extractCustomerId(it) ?? '') !== String(selectedCustomerId).trim()) return false;
    }

    if (except !== 'kasir' && selectedKasirId && String(it.kasir_id ?? '') !== selectedKasirId) return false;

    if (except !== 'designer' && selectedDesignerId) {
      const matchTop = String(it.designer_id ?? '') === selectedDesignerId;
      const matchItems = anyOrderItemMatch(it.order_items, 'designer_id', selectedDesignerId);
      if (!matchTop && !matchItems) return false;
    }

    if (except !== 'operator' && selectedOperatorId) {
      const matchTop = String(it.operator_id ?? '') === selectedOperatorId;
      const matchItems = anyOrderItemMatch(it.order_items, 'operator_id', selectedOperatorId);
      if (!matchTop && !matchItems) return false;
    }

    if (except !== 'finishing' && selectedFinishingId) {
      const matchTop = String(it.finishing_id ?? '') === selectedFinishingId;
      const matchItems = anyOrderItemMatch(it.order_items, 'finishing_id', selectedFinishingId);
      if (!matchTop && !matchItems) return false;
    }

    if (searchTerm?.trim()) {
      const p = computePetugasNames(it);
      const q = searchTerm.trim().toLocaleLowerCase();
      const hay = [
        it.invoice_number,
        it.customer_display_name,
        it.customer_display_phone,
        p.kasir, p.designer, p.operator, p.finishing,
      ].filter(Boolean).join(' | ').toLocaleLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  };

  const filterDeps = [
    searchTerm,
    paymentStatusFilter,
    selectedPaymentMethod,
    selectedCustomerId,
    selectedKasirId,
    selectedDesignerId,
    selectedOperatorId,
    selectedFinishingId,
    profileCache, // nama petugas dipakai di pencarian
  ];

  // Data layar (halaman aktif)
  const filteredData = useMemo(
    () => data.filter((it: any) => passesRowFilters(it)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, ...filterDeps]
  );

  // Versi filteredData dari SELURUH hasil filter (tanpa pagination) — dipakai di tabel khusus cetak
  const printFilteredData = useMemo(
    () => (printData ?? []).filter((it: any) => passesRowFilters(it)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [printData, ...filterDeps]
  );

  // ===== F) Opsi dropdown dari data (tanpa duplikat) =====
  // Setiap dimensi dibangun dari data yang sudah lolos SEMUA filter lain (kecuali dimensi itu sendiri),
  // jadi opsinya selalu sesuai data yang ada di tabel, tapi tetap bisa ganti pilihan tanpa reset dulu.
  const optionsSource: any[] = optionsData ?? printData ?? data;

  const buildOptions = (dim: FilterDim, collect: (it: any, add: (id: string, name: string) => void) => void): IdName[] => {
    const uniq = new Map<string, string>();
    const add = (id: string, name: string) => {
      if (!id) return;
      if (!uniq.has(id)) uniq.set(id, name);
    };
    optionsSource.forEach((it) => {
      if (!passesRowFilters(it, dim)) return;
      collect(it, add);
    });
    return Array.from(uniq, ([id, name]) => ({ id, name: name || id }))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  };

  const petugasName = (id: any) => getNameFromProfilesById(id ? String(id) : null);

  const customerOptions = useMemo(
    () => buildOptions('customer', (it, add) => {
      const cid = extractCustomerId(it);
      if (cid) add(cid, (extractCustomerLabel(it) || '').trim());
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsSource, ...filterDeps]
  );

  const kasirOptions = useMemo(
    () => buildOptions('kasir', (it, add) => {
      if (it.kasir_id) add(String(it.kasir_id), petugasName(it.kasir_id) || nameFromProfile(it.profiles));
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsSource, ...filterDeps]
  );

  const designerOptions = useMemo(
    () => buildOptions('designer', (it, add) => {
      if (it.designer_id) add(String(it.designer_id), petugasName(it.designer_id));
      (Array.isArray(it.order_items) ? it.order_items : []).forEach((oi: any) => {
        if (oi?.designer_id) add(String(oi.designer_id), petugasName(oi.designer_id));
      });
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsSource, ...filterDeps]
  );

  const operatorOptions = useMemo(
    () => buildOptions('operator', (it, add) => {
      if (it.operator_id) add(String(it.operator_id), petugasName(it.operator_id));
      (Array.isArray(it.order_items) ? it.order_items : []).forEach((oi: any) => {
        if (oi?.operator_id) add(String(oi.operator_id), petugasName(oi.operator_id));
      });
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsSource, ...filterDeps]
  );

  const finishingOptions = useMemo(
    () => buildOptions('finishing', (it, add) => {
      if (it.finishing_id) add(String(it.finishing_id), petugasName(it.finishing_id));
      (Array.isArray(it.order_items) ? it.order_items : []).forEach((oi: any) => {
        if (oi?.finishing_id) add(String(oi.finishing_id), petugasName(oi.finishing_id));
      });
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsSource, ...filterDeps]
  );

  // Kalau ada baris dicentang, yang dicetak hanya baris terpilih; kalau tidak, semua hasil filter
  const hasSelection = (selectedIds?.length ?? 0) > 0;
  const rowsToPrint = useMemo(() => {
    if (!hasSelection) return printFilteredData;
    const set = new Set(selectedIds);
    return printFilteredData.filter((it: any) => set.has(it.id));
  }, [printFilteredData, selectedIds, hasSelection]);

  // ===== H) Hitung dibayar & kekurangan =====
  const computePaidAndRemaining = (item: any) => {
    const finalAmount = Number(item.final_amount || 0);
    if (item.payment_status === 'paid') {
      return { paid: finalAmount, remaining: 0 };
    }
    const eligible = item.payment_status === 'pending' && item.payment_method !== null && item.payment_method !== '';
    const dpAmount = eligible ? getDpFromNotes((item as any).notes) : 0;
    const paid = Math.min(finalAmount, Number(dpAmount || 0));
    const remaining = Math.max(0, finalAmount - paid);
    return { paid, remaining };
  };

  const fmtIDR0 = (n: number) =>
    n.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

  // Sel data satu baris (tanpa kolom checkbox) — dipakai bersama oleh tabel layar & tabel cetak
  const renderDataCells = (item: CombinedSalesItem, index: number) => {
    const finalAmount = Number((item as any).final_amount || 0);
    const { paid, remaining } = computePaidAndRemaining(item as any);

    return (
      <>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {new Date((item as any).order_date).toLocaleDateString('id-ID')}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {(item as any).invoice_number || 'N/A'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            {extractCustomerLabel(item)}
          </div>
          <div className="text-xs text-gray-500">
            {(item as any).customer_display_phone || (item as any)?.pelanggan?.[0]?.telepon || '-'}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap align-top text-sm text-gray-900">
          {renderPetugas(item)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {fmtIDR0(finalAmount)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {fmtIDR0(paid)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center gap-2">
            <span>{fmtIDR0(remaining)}</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              (item as any).payment_status === 'paid'
                ? 'bg-green-100 text-green-800'
                : (item as any).payment_status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {(item as any).payment_status === 'paid' ? 'Lunas' : (item as any).payment_status === 'pending' ? 'Belum Lunas' : 'Batal'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {formatPaymentMethod((item as any).payment_method)}
        </td>
      </>
    );
  };

  // ===== Label filter aktif untuk area print =====
  const labelFromOptions = (id: string, options: IdName[]) => {
    if (!id) return '';
    return options.find(o => o.id === id)?.name || petugasName(id) || '-';
  };

  const activeFilter = useMemo(() => {
    const items: { k: string; v: string }[] = [];

    items.push({ k: 'Periode', v: `${startDate || '-'} s/d ${endDate || '-'}` });

    items.push({
      k: 'Status',
      v: (paymentStatusFilter === 'all')
        ? 'Semua Status'
        : (paymentStatusFilter === 'paid' ? 'Lunas' : 'Belum Lunas')
    });

    items.push({
      k: 'Metode',
      v: (selectedPaymentMethod === 'all')
        ? 'Semua Metode'
        : selectedPaymentMethod.replace(/_/g, ' ')
    });

    items.push({ k: 'Customer', v: selectedCustomerId ? labelFromOptions(selectedCustomerId, customerOptions) : 'Semua Customer' });
    items.push({ k: 'Kasir', v: selectedKasirId ? labelFromOptions(selectedKasirId, kasirOptions) : 'Semua Kasir' });
    items.push({ k: 'Designer', v: selectedDesignerId ? labelFromOptions(selectedDesignerId, designerOptions) : 'Semua Designer' });
    items.push({ k: 'Operator', v: selectedOperatorId ? labelFromOptions(selectedOperatorId, operatorOptions) : 'Semua Operator' });
    items.push({ k: 'Finishing', v: selectedFinishingId ? labelFromOptions(selectedFinishingId, finishingOptions) : 'Semua Finishing' });

    items.push({
      k: 'Pencarian',
      v: (searchTerm?.trim() ? `"${searchTerm.trim()}"` : '-')
    });

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    startDate, endDate,
    paymentStatusFilter, selectedPaymentMethod,
    selectedCustomerId, selectedKasirId, selectedDesignerId, selectedOperatorId, selectedFinishingId,
    customerOptions, kasirOptions, designerOptions, operatorOptions, finishingOptions,
    profileCache, searchTerm
  ]);

  // ====== Checkbox master indeterminate (kalau selection props ada) ======
  const masterRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!masterRef.current) return;
    masterRef.current.indeterminate = !!someSelectedOnPage && !allSelectedOnPage;
  }, [someSelectedOnPage, allSelectedOnPage]);

  // ===== UI =====
  return (
    <div className="space-y-6">

      {/* TOP CONTROLS (no-print) */}
      <div className="no-print bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari penjualan (faktur, pelanggan, kasir/designer/operator/finishing)..."
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="startDate" className="text-sm font-medium text-gray-700">Dari:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="endDate" className="text-sm font-medium text-gray-700">Sampai:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
      </div>

      {/* FILTER BAR — ROW 1 (no-print) */}
      <div className="no-print bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="paymentStatusFilter" className="text-sm font-medium text-gray-700">Status Pembayaran:</label>
          <select
            id="paymentStatusFilter"
            value={paymentStatusFilter}
            onChange={onPaymentStatusFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="all">Semua Status</option>
            <option value="paid">Lunas</option>
            <option value="pending">Belum Lunas</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="paymentMethodFilter" className="text-sm font-medium text-gray-700">Metode:</label>
          <select
            id="paymentMethodFilter"
            value={selectedPaymentMethod}
            onChange={onPaymentMethodChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="all">Semua Metode</option>
            <option value="cash">Tunai</option>
            <option value="bank_transfer">Transfer Bank</option>
          </select>
        </div>

        {/* CUSTOMER FILTER — value = order.customer_id, bisa diketik untuk mencari */}
        <div className="flex items-center gap-2">
          <label htmlFor="customerFilter" className="text-sm font-medium text-gray-700">Customer:</label>
          <SearchableSelect
            id="customerFilter"
            options={customerOptions}
            value={selectedCustomerId}
            onChange={onCustomerChange}
            allLabel="Semua Customer"
            placeholder="Ketik nama customer..."
          />
        </div>
      </div>

      {/* FILTER BAR — ROW 2 (no-print) */}
      <div className="no-print bg-white rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="flex items-center gap-2">
          <label htmlFor="kasirFilter" className="text-sm font-medium text-gray-700">Kasir:</label>
          <select
            id="kasirFilter"
            value={selectedKasirId || ''}
            onChange={onKasirChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Kasir</option>
            {kasirOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="designerFilter" className="text-sm font-medium text-gray-700">Designer:</label>
          <select
            id="designerFilter"
            value={selectedDesignerId || ''}
            onChange={onDesignerChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Designer</option>
            {designerOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="operatorFilter" className="text-sm font-medium text-gray-700">Operator:</label>
          <select
            id="operatorFilter"
            value={selectedOperatorId || ''}
            onChange={onOperatorChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Operator</option>
            {operatorOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="finishingFilter" className="text-sm font-medium text-gray-700">Finishing:</label>
          <select
            id="finishingFilter"
            value={selectedFinishingId || ''}
            onChange={onFinishingChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Finishing</option>
            {finishingOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        <div className="md:justify-self-end">
          <button
            onClick={onPrint}
            className="no-print w-full md:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Printer className="h-5 w-5 mr-2" />
            {hasSelection ? `Cetak Data yang Dipilih (${selectedIds!.length})` : 'Cetak'}
          </button>
        </div>

        {isRefreshing && (
          <div className="no-print col-span-1 md:col-span-5 flex justify-center pt-1">
            <span className="inline-flex items-center text-xs text-gray-500" aria-live="polite" aria-busy="true">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Memperbarui data…
            </span>
          </div>
        )}
      </div>

      {/* TOTAL (no-print) */}
      <div className="no-print bg-white rounded-lg shadow-sm p-6 text-right">
        <h2 className="text-xl font-bold text-gray-900">
          Total Penjualan: {formatCurrency(totalSalesAmount)}
        </h2>
      </div>

      {toolbar && <div className="no-print">{toolbar}</div>}

      {/* ====== AREA KHUSUS CETAK ====== */}
      <div id="purchase-print-area" className="print-only-block">
        {/* Header & Ringkasan filter (print only) */}
        <div className="print-only print-header">
          <div className="print-title">Laporan Penjualan</div>
          <div className="print-divider" />
          <div className="print-filter-grid">
            {activeFilter.map((it, idx) => (
              <div className="print-filter-row" key={idx}>
                <div className="print-k">{it.k}</div>
                <div className="print-v">{it.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TABLE (layar, per-halaman) — disembunyikan saat print */}
        <div className="no-print bg-white rounded-lg shadow-sm overflow-x-auto print-table-wrap">
          <table className="min-w-full divide-y divide-gray-200 print-w-full">
            <thead className="bg-gray-50">
              <tr>
                {/* Checkbox kolom — hanya tampil di layar (bukan print) */}
                {typeof selectedIds !== 'undefined' && (
                  <th className="no-print px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      ref={masterRef}
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!!allSelectedOnPage}
                      onChange={(e) => onToggleAllPage?.(e.target.checked)}
                      aria-checked={someSelectedOnPage ? 'mixed' : allSelectedOnPage ? 'true' : 'false'}
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('order_date')}>
                  <div className="flex items-center">Tanggal {renderSortIcon('order_date')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('invoice_number')}>
                  <div className="flex items-center">Faktur {renderSortIcon('invoice_number')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('customer')}>
                  <div className="flex items-center">Pelanggan {renderSortIcon('customer')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('cashier')}>
                  <div className="flex items-center">Petugas {renderSortIcon('cashier')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('final_amount')}>
                  <div className="flex items-center">Jumlah Total {renderSortIcon('final_amount')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibayar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kekurangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('payment_status')}>
                  <div className="flex items-center">Status Pembayaran {renderSortIcon('payment_status')}</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode Pembayaran</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={typeof selectedIds !== 'undefined' ? 11 : 10} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Tidak ada data penjualan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const isChecked = selectedIds?.includes(item.id) ?? false;

                  return (
                    <tr
                      key={item.id}
                      className={`cursor-pointer hover:bg-gray-50 avoid-break ${selectedItemId === item.id ? 'bg-blue-50' : ''}`}
                      onClick={() => onRowClick(item)}>

                      {/* Checkbox per baris — hanya di layar */}
                      {typeof selectedIds !== 'undefined' && (
                        <td className="no-print px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              onToggleRow?.(item.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                      )}

                      {renderDataCells(item, numberOffset + index)}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* TABLE (cetak, SELURUH hasil filter — bukan per halaman) — hanya tampil saat print */}
        <div className="print-only bg-white rounded-lg shadow-sm overflow-x-auto print-table-wrap">
          <table className="min-w-full divide-y divide-gray-200 print-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faktur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Petugas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibayar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kekurangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Pembayaran</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode Pembayaran</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rowsToPrint.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Tidak ada data penjualan.
                  </td>
                </tr>
              ) : (
                rowsToPrint.map((item, index) => (
                  <tr key={item.id} className="avoid-break">
                    {renderDataCells(item, index)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ====== /AREA KHUSUS CETAK ====== */}
    </div>
  );
};

export default SalesTable;
