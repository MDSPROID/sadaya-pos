import { SalesItem, PendingOrderItem } from '../types/orderTypes';

export type ReportOrder = SalesItem | PendingOrderItem;
export type IdName = { id: string; name: string };
export type StaffDim = 'customer' | 'kasir' | 'designer' | 'operator' | 'finishing';

export interface SalesReportFilters {
  searchTerm: string;
  paymentStatusFilter: string;    // 'all' | 'paid' | 'pending'
  selectedPaymentMethod: string;  // 'all' | 'cash' | 'bank_transfer'
  selectedCustomerId: string;
  selectedKasirId: string;
  selectedDesignerId: string;
  selectedOperatorId: string;
  selectedFinishingId: string;
}

const nameFromProfile = (p: any) =>
  p ? [p.first_name, p.last_name].map((s: any) => String(s ?? '').trim()).filter(Boolean).join(' ') : '';

/** Id staff yang dipakai tampilan/filter: kasir & operator & finishing dari order, designer dari item. */
export const collectStaffIds = (orders: ReportOrder[]): string[] => {
  const ids = new Set<string>();
  orders.forEach((o: any) => {
    [o.kasir_id, o.operator_id, o.finishing_id].forEach((id) => { if (id) ids.add(String(id)); });
    (Array.isArray(o.order_items) ? o.order_items : []).forEach((it: any) => {
      if (it?.designer_id) ids.add(String(it.designer_id));
    });
  });
  return Array.from(ids);
};

/** Nama staff seperti yang ditampilkan di kolom Petugas. Satu sumber untuk tabel, filter, dan dropdown. */
export const petugasOf = (o: any, nameById: Record<string, string>) => {
  const n = (id: any) => (id ? (nameById[String(id)] || '').trim() : '');
  const designerIds = Array.from(new Set(
    (Array.isArray(o.order_items) ? o.order_items : [])
      .map((it: any) => it?.designer_id)
      .filter(Boolean)
      .map(String)
  )) as string[];
  const designers = designerIds.map(id => ({ id, name: n(id) })).filter(d => d.name);
  return {
    kasir: n(o.kasir_id) || nameFromProfile(o.profiles),
    designers,                     // bisa lebih dari satu (per item)
    operator: n(o.operator_id),
    finishing: n(o.finishing_id),
  };
};

export const customerLabelOf = (o: any): string =>
  (o.customer_display_name
    ? o.customer_display_name.charAt(0).toUpperCase() + o.customer_display_name.slice(1)
    : '') || o?.pelanggan?.[0]?.nama_pelanggan || 'Umum';

export const customerIdOf = (o: any): string | null => {
  const raw = o?.customer_id;
  return raw != null && raw !== '' ? String(raw) : null;
};

/**
 * Predikat filter laporan penjualan. `except` = dimensi yang tidak diterapkan
 * (untuk membangun opsi dropdown suatu dimensi tanpa "mengunci" ke pilihan saat ini).
 */
export const makeOrderFilter = (f: SalesReportFilters, nameById: Record<string, string>) => {
  const term = f.searchTerm.trim().toLowerCase();
  const hasItemDesigner = (o: any, id: string) =>
    Array.isArray(o.order_items) && o.order_items.some((it: any) => String(it?.designer_id ?? '') === id);

  return (o: any, except?: StaffDim): boolean => {
    if (f.paymentStatusFilter !== 'all' && o.payment_status !== f.paymentStatusFilter) return false;
    if (f.selectedPaymentMethod !== 'all' && (o.payment_method ?? '') !== f.selectedPaymentMethod) return false;

    if (except !== 'customer' && f.selectedCustomerId && String(customerIdOf(o) ?? '') !== f.selectedCustomerId) return false;
    if (except !== 'kasir' && f.selectedKasirId && String(o.kasir_id ?? '') !== f.selectedKasirId) return false;
    if (except !== 'designer' && f.selectedDesignerId && !hasItemDesigner(o, f.selectedDesignerId)) return false;
    if (except !== 'operator' && f.selectedOperatorId && String(o.operator_id ?? '') !== f.selectedOperatorId) return false;
    if (except !== 'finishing' && f.selectedFinishingId && String(o.finishing_id ?? '') !== f.selectedFinishingId) return false;

    if (!term) return true;
    const p = petugasOf(o, nameById);
    const hay = [
      o.invoice_number,
      o.customer_display_name,
      o?.pelanggan?.[0]?.nama_pelanggan,
      o.customer_display_phone,
      o?.pelanggan?.[0]?.telepon,
      o.notes,
      p.kasir, p.operator, p.finishing,
      ...p.designers.map(d => d.name),
      ...(Array.isArray(o.order_items) ? o.order_items.map((it: any) => it?.product_name) : []),
    ].filter(Boolean).join(' | ').toLowerCase();
    return hay.includes(term);
  };
};

/** Opsi dropdown per dimensi dari data yang lolos semua filter lain (kecuali dimensinya sendiri), tanpa duplikat. */
export const buildStaffOptions = (
  orders: ReportOrder[],
  passes: (o: any, except?: StaffDim) => boolean,
  nameById: Record<string, string>
): Record<StaffDim, IdName[]> => {
  const maps: Record<StaffDim, Map<string, string>> = {
    customer: new Map(), kasir: new Map(), designer: new Map(), operator: new Map(), finishing: new Map(),
  };
  const add = (dim: StaffDim, id: any, name: string) => {
    if (!id) return;
    const key = String(id);
    if (!maps[dim].has(key)) maps[dim].set(key, name || key);
  };

  orders.forEach((o: any) => {
    const p = petugasOf(o, nameById);
    if (passes(o, 'customer')) { const cid = customerIdOf(o); if (cid) add('customer', cid, customerLabelOf(o)); }
    if (passes(o, 'kasir'))     add('kasir', o.kasir_id, p.kasir);
    if (passes(o, 'operator'))  add('operator', o.operator_id, p.operator);
    if (passes(o, 'finishing')) add('finishing', o.finishing_id, p.finishing);
    if (passes(o, 'designer'))  p.designers.forEach(d => add('designer', d.id, d.name));
  });

  const toList = (m: Map<string, string>): IdName[] =>
    Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'id'));

  return {
    customer: toList(maps.customer),
    kasir: toList(maps.kasir),
    designer: toList(maps.designer),
    operator: toList(maps.operator),
    finishing: toList(maps.finishing),
  };
};
