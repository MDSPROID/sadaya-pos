import React, { useEffect, useMemo, useState } from 'react';
import { Search, Printer, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { SalesItem, PendingOrderItem } from '../../types/orderTypes';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../integrations/supabase/client';

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

interface CustomerOption { id: string; name: string; }

interface SalesTableProps {
  data: CombinedSalesItem[];
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

  customerOptions: CustomerOption[];
  selectedCustomerId: string; // value = customer_id
  onCustomerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;

  kasirOptions?: { id: string; name: string }[];
  selectedKasirId: string;
  onKasirChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  designerOptions?: { id: string; name: string }[];
  selectedDesignerId: string;
  onDesignerChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  operatorOptions?: { id: string; name: string }[];
  selectedOperatorId: string;
  onOperatorChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  finishingOptions?: { id: string; name: string }[];
  selectedFinishingId: string;
  onFinishingChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;

  isRefreshing?: boolean;
}

type ProfileRow = { id: string; first_name: string | null; last_name: string | null; role_id: string };

const ROLE_MATCHERS = {
  kasir: ['kasir'],
  designer: ['designer'],
  operator: ['operator'],
  finishing: ['finishing'],
};

const displayName = (p: { first_name?: string | null; last_name?: string | null }) => {
  const fn = String(p.first_name ?? '').trim();
  const ln = String(p.last_name ?? '').trim();
  const nm = [fn, ln].filter(Boolean).join(' ').trim();
  return nm || '-';
};

const SalesTable: React.FC<SalesTableProps> = ({
  data,
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
  customerOptions,
  selectedCustomerId,
  onCustomerChange,

  kasirOptions: kasirOptionsFromParent,
  selectedKasirId,
  onKasirChange,
  designerOptions: designerOptionsFromParent,
  selectedDesignerId,
  onDesignerChange,
  operatorOptions: operatorOptionsFromParent,
  selectedOperatorId,
  onOperatorChange,
  finishingOptions: finishingOptionsFromParent,
  selectedFinishingId,
  onFinishingChange,

  isRefreshing = false,
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
    const ids = new Set<string>();
    data.forEach((item: any) => {
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
  }, [data]);

  const getNameFromProfilesById = (id?: string | null) => {
    if (!id) return '';
    const rec = profileCache[String(id)];
    if (!rec) return '';
    return displayName(rec);
  };

  // ===== B) Dropdown petugas (roles → profiles) =====
  type LabeledId = { id: string; label: string };

  const [roleOptions, setRoleOptions] = useState<{
    kasir: LabeledId[];
    designer: LabeledId[];
    operator: LabeledId[];
    finishing: LabeledId[];
  }>({ kasir: [], designer: [], operator: [], finishing: [] });

  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingRoles(true);
      try {
        const { data: roles, error: roleErr } = await supabase
          .from('roles')
          .select('id, nama');
        if (roleErr) throw roleErr;

        const findRoleIds = (aliases: string[]) => {
          const lowers = aliases.map(a => a.toLowerCase());
          const matched = (roles as any[]).filter(r => {
            const nm = (r.nama ?? '').toLowerCase();
            return lowers.includes(nm);
          });
          return matched.map(m => m.id);
        };

        const kasirRoleIds = findRoleIds(ROLE_MATCHERS.kasir);
        const designerRoleIds = findRoleIds(ROLE_MATCHERS.designer);
        const operatorRoleIds = findRoleIds(ROLE_MATCHERS.operator);
        const finishingRoleIds = findRoleIds(ROLE_MATCHERS.finishing);

        const allRoleIds = [
          ...kasirRoleIds,
          ...designerRoleIds,
          ...operatorRoleIds,
          ...finishingRoleIds,
        ];
        const uniqRoleIds = Array.from(new Set(allRoleIds));
        let profilesByRole: ProfileRow[] = [];
        if (uniqRoleIds.length > 0) {
          const { data: profs, error: profErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, role_id')
            .in('role_id', uniqRoleIds)
            .eq('is_active', true);
          if (profErr) throw profErr;
          profilesByRole = (profs || []) as ProfileRow[];
        }

        const toLabeled = (rows: ProfileRow[]) =>
          rows
            .map((p) => ({ id: p.id, label: displayName(p) || p.id.slice(0, 8) }))
            .sort((a, b) => a.label.localeCompare(b.label, 'id'));

        const next = {
          kasir: toLabeled(profilesByRole.filter(p => kasirRoleIds.includes(p.role_id))),
          designer: toLabeled(profilesByRole.filter(p => designerRoleIds.includes(p.role_id))),
          operator: toLabeled(profilesByRole.filter(p => operatorRoleIds.includes(p.role_id))),
          finishing: toLabeled(profilesByRole.filter(p => finishingRoleIds.includes(p.role_id))),
        };

        if (!cancelled) setRoleOptions(next);
      } catch (e) {
        console.error('fetch roles/profiles error:', e);
        if (!cancelled) {
          setRoleOptions({ kasir: [], designer: [], operator: [], finishing: [] });
        }
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []); // load sekali

  // ===== C) Nama petugas tampilan =====
  const computePetugasNames = (item: any) => {
    const designerName =
      String(item?.designer_name ?? '').trim() ||
      getNameFromProfilesById(item?.designer_id) ||
      '';

    const operatorName =
      String(item?.operator_name ?? '').trim() ||
      getNameFromProfilesById(item?.operator_id) ||
      '';

    const finishingName =
      String(item?.finishing_name ?? '').trim() ||
      getNameFromProfilesById(item?.finishing_id) ||
      '';

    let kasirName =
      String(item?.kasir_name ?? '').trim() ||
      getNameFromProfilesById(item?.kasir_id) ||
      '';
    if (!kasirName && item?.profiles) {
      const fromProfiles = nameFromProfile(item.profiles);
      if (fromProfiles) kasirName = fromProfiles;
    }

    const dashIfEmpty = (v: string) => (v && v.trim() ? v.trim() : '-');

    return {
      designer: dashIfEmpty(designerName),
      operator: dashIfEmpty(operatorName),
      finishing: dashIfEmpty(finishingName),
      kasir: dashIfEmpty(kasirName),
    };
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

  const baseDataNoCustomerFilter = useMemo(() => {
    return data
      .filter(
        (it: any) =>
          it.payment_status === 'paid' ||
          (it.payment_status === 'pending' && it.payment_method !== null && it.payment_method !== '')
      )
      .filter((it: any) => {
        if (paymentStatusFilter !== 'all' && it.payment_status !== paymentStatusFilter) return false;
        if (selectedPaymentMethod !== 'all' && (it.payment_method ?? '') !== selectedPaymentMethod) return false;

        if (selectedKasirId && String(it.kasir_id ?? '') !== selectedKasirId) return false;

        if (selectedDesignerId) {
          const matchTop = String(it.designer_id ?? '') === selectedDesignerId;
          const matchItems = anyOrderItemMatch(it.order_items, 'designer_id', selectedDesignerId);
          if (!matchTop && !matchItems) return false;
        }

        if (selectedOperatorId) {
          const matchTop = String(it.operator_id ?? '') === selectedOperatorId;
          const matchItems = anyOrderItemMatch(it.order_items, 'operator_id', selectedOperatorId);
          if (!matchTop && !matchItems) return false;
        }

        if (selectedFinishingId) {
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
      });
  }, [
    data,
    searchTerm,
    paymentStatusFilter,
    selectedPaymentMethod,
    selectedKasirId,
    selectedDesignerId,
    selectedOperatorId,
    selectedFinishingId,
  ]);

  // ===== F) Opsi customer (hanya yang ada customer_id) =====
  type CustomerOptionLocal = { id: string; name: string };
  const [dynamicCustomerOptions, setDynamicCustomerOptions] = useState<CustomerOptionLocal[]>([]);

  useEffect(() => {
    if ((selectedCustomerId ?? '') === '') {
      const uniq = new Map<string, CustomerOptionLocal>();
      for (const it of baseDataNoCustomerFilter as any[]) {
        const cid = extractCustomerId(it);
        if (!cid) continue;
        const label = (extractCustomerLabel(it) || '').trim() || cid;
        if (!uniq.has(cid)) {
          uniq.set(cid, { id: cid, name: label });
        }
      }
      const arr = Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
      setDynamicCustomerOptions(arr);
    }
  }, [baseDataNoCustomerFilter, selectedCustomerId]);

  // ===== G) Terapkan filter customer =====
  const filteredData = useMemo(() => {
    const sel = String(selectedCustomerId ?? '').trim();
    if (!sel) return baseDataNoCustomerFilter;
    return baseDataNoCustomerFilter.filter((it: any) => String(extractCustomerId(it) ?? '') === sel);
  }, [baseDataNoCustomerFilter, selectedCustomerId]);

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

  // ===== Label filter aktif untuk area print =====
  const findLabelById = (
    id: string,
    source?: { id: string; name: string }[],
    fallback?: { id: string; label: string }[],
    profileCacheMap?: Record<string, { first_name: string | null; last_name: string | null }>
  ) => {
    if (!id) return '';

    const isUuidLike = (s?: string) =>
      !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

    // 1) roleOptions (fallback param) — prioritas utama
    const fromRole = fallback?.find(x => x.id === id)?.label?.trim();
    if (fromRole && !isUuidLike(fromRole)) return fromRole;

    // 2) profileCache — nama lengkap
    const rec = profileCacheMap?.[id];
    if (rec) {
      const fn = String(rec.first_name ?? '').trim();
      const ln = String(rec.last_name ?? '').trim();
      const nm = [fn, ln].filter(Boolean).join(' ').trim();
      if (nm && !isUuidLike(nm)) return nm;
    }

    // 3) sumber parent — hanya jika bukan UUID/ID mentah
    const fromParent = source?.find(x => x.id === id)?.name?.trim();
    if (fromParent && !isUuidLike(fromParent) && fromParent !== id) return fromParent;

    // 4) terakhir: jangan tampilkan UUID
    return '-';
  };

  const activeFilter = useMemo(() => {
    const items: { k: string; v: string }[] = [];

    // Periode
    items.push({ k: 'Periode', v: `${startDate || '-'} s/d ${endDate || '-'}` });

    // Status
    items.push({
      k: 'Status',
      v: (paymentStatusFilter === 'all')
        ? 'Semua Status'
        : (paymentStatusFilter === 'paid' ? 'Lunas' : 'Belum Lunas')
    });

    // Metode
    items.push({
      k: 'Metode',
      v: (selectedPaymentMethod === 'all')
        ? 'Semua Metode'
        : selectedPaymentMethod.replace(/_/g, ' ')
    });

    // Customer — selalu tampil
    {
      let v = 'Semua Customer';
      if (selectedCustomerId) {
        v =
          dynamicCustomerOptions.find(c => c.id === selectedCustomerId)?.name
          || customerOptions.find(c => c.id === selectedCustomerId)?.name
          || '-'; // jangan pernah tampilkan UUID
      }
      items.push({ k: 'Customer', v });
    }

    // Kasir — selalu tampil
    {
      let v = 'Semua Kasir';
      if (selectedKasirId) {
        v = findLabelById(
          selectedKasirId,
          kasirOptionsFromParent,
          roleOptions.kasir,
          profileCache
        );
      }
      items.push({ k: 'Kasir', v });
    }

    // Designer — selalu tampil
    {
      let v = 'Semua Designer';
      if (selectedDesignerId) {
        v = findLabelById(
          selectedDesignerId,
          designerOptionsFromParent,
          roleOptions.designer,
          profileCache
        );
      }
      items.push({ k: 'Designer', v });
    }

    // Operator — selalu tampil
    {
      let v = 'Semua Operator';
      if (selectedOperatorId) {
        v = findLabelById(
          selectedOperatorId,
          operatorOptionsFromParent,
          roleOptions.operator,
          profileCache
        );
      }
      items.push({ k: 'Operator', v });
    }

    // Finishing — selalu tampil
    {
      let v = 'Semua Finishing';
      if (selectedFinishingId) {
        v = findLabelById(
          selectedFinishingId,
          finishingOptionsFromParent,
          roleOptions.finishing,
          profileCache
        );
      }
      items.push({ k: 'Finishing', v });
    }

    // Pencarian — selalu tampil
    items.push({
      k: 'Pencarian',
      v: (searchTerm?.trim() ? `"${searchTerm.trim()}"` : '-')
    });

    return items;
  }, [
    startDate, endDate,
    paymentStatusFilter, selectedPaymentMethod,
    selectedCustomerId, dynamicCustomerOptions, customerOptions,
    selectedKasirId, selectedDesignerId, selectedOperatorId, selectedFinishingId,
    kasirOptionsFromParent, designerOptionsFromParent, operatorOptionsFromParent, finishingOptionsFromParent,
    roleOptions, profileCache, searchTerm
  ]);

  const resolveLabel = (
    id: string,
    provided?: { id: string; name?: string }[],
    fallback?: { id: string; label: string }[]
  ) => {
    if (!id) return '';
    const fromProvided = provided?.find(x => x.id === id)?.name?.trim();
    if (fromProvided) return fromProvided;
    const fromFallback = fallback?.find(x => x.id === id)?.label?.trim();
    if (fromFallback) return fromFallback;
    return id; // terakhir banget, kalau dua-duanya tidak ada
  };

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

        {/* CUSTOMER FILTER — value = order.customer_id */}
        <div className="flex items-center gap-2">
          <label htmlFor="customerFilter" className="text-sm font-medium text-gray-700">Customer:</label>
          <select
            id="customerFilter"
            value={selectedCustomerId}
            onChange={onCustomerChange}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">Semua Customer</option>
            {dynamicCustomerOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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
            disabled={loadingRoles}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">{loadingRoles ? 'Memuat...' : 'Semua Kasir'}</option>
            {roleOptions.kasir.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="designerFilter" className="text-sm font-medium text-gray-700">Designer:</label>
          <select
            id="designerFilter"
            value={selectedDesignerId || ''}
            onChange={onDesignerChange}
            // disabled={loadingRoles && !(designerOptionsFromParent?.length)}
            disabled={loadingRoles}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">{(loadingRoles && !(designerOptionsFromParent?.length)) ? 'Memuat...' : 'Semua Designer'}</option>
            {roleOptions.designer.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="operatorFilter" className="text-sm font-medium text-gray-700">Operator:</label>
          <select
            id="operatorFilter"
            value={selectedOperatorId || ''}
            onChange={onOperatorChange}
            // disabled={loadingRoles && !(operatorOptionsFromParent?.length)}
            disabled={loadingRoles}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">{(loadingRoles && !(operatorOptionsFromParent?.length)) ? 'Memuat...' : 'Semua Operator'}</option>
            {roleOptions.operator.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="finishingFilter" className="text-sm font-medium text-gray-700">Finishing:</label>
          <select
            id="finishingFilter"
            value={selectedFinishingId || ''}
            onChange={onFinishingChange}
            // disabled={loadingRoles && !(finishingOptionsFromParent?.length)}
            disabled={loadingRoles}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">{(loadingRoles && !(finishingOptionsFromParent?.length)) ? 'Memuat...' : 'Semua Finishing'}</option>
            {roleOptions.finishing.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="md:justify-self-end">
          <button
            onClick={onPrint}
            className="no-print w-full md:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Printer className="h-5 w-5 mr-2" />
            Cetak
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

      {/* ====== AREA KHUSUS CETAK ====== */}
      <div id="purchase-print-area" className="print-only-block">
        {/* Header & Ringkasan filter (print only) */}
        <div className="print-only print-header">
          <div className="print-title">Laporan Penjualan</div>
          {/* garis pemisah tipis */}
          <div className="print-divider" />

          {/* grid filter */}
          <div className="print-filter-grid">
            {activeFilter.map((it, idx) => (
              <div className="print-filter-row" key={idx}>
                <div className="print-k">{it.k}</div>
                <div className="print-v">{it.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TABLE (no scroll saat print) */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto print-table-wrap">
          <table className="min-w-full divide-y divide-gray-200 print-w-full">
            <thead className="bg-gray-50">
              <tr>
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
                  <td colSpan={10} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Tidak ada data penjualan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const finalAmount = Number(item.final_amount || 0);
                  const { paid, remaining } = computePaidAndRemaining(item as any);

                  return (
                    <tr
                      key={item.id}
                      className={`cursor-pointer hover:bg-gray-50 avoid-break ${selectedItemId === item.id ? 'bg-blue-50' : ''}`}
                      onClick={() => onRowClick(item)}>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.order_date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.invoice_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {extractCustomerLabel(item)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.customer_display_phone || (item as any)?.pelanggan?.[0]?.telepon || '-'}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const p = { ...computePetugasNames(item) };
                          return (
                            <div className="whitespace-pre-line break-words">
                              {[
                                ['Designer', p.designer],
                                ['Kasir', p.kasir],
                                ['Operator', p.operator],
                                ['Finishing', p.finishing],
                              ].map(([label, val]) => (
                                <div key={String(label)}>
                                  <span className="text-gray-500">{label}: </span>
                                  <span className="text-gray-900">{val}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
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
                            item.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : item.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.payment_status === 'paid' ? 'Lunas' : item.payment_status === 'pending' ? 'Belum Lunas' : 'Batal'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPaymentMethod((item as any).payment_method)}
                      </td>
                    </tr>
                  );
                })
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
