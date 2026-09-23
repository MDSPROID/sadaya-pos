import { supabase } from '../integrations/supabase/client';

/** Ambil angka urut di belakang nomor faktur, mis. 'INV0926-436' -> 436. */
const sequenceOf = (invoiceNumber: string | null | undefined): number => {
  const m = /-(\d+)\s*$/.exec(String(invoiceNumber ?? ''));
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Generates a unique invoice number based on a prefix and a date-based method.
 *
 * Periode (bulan/tahun) dibaca langsung dari POLA NOMOR FAKTUR-nya, bukan dari
 * rentang tanggal. Cara lama membandingkan `created_at` dengan rentang bertanda
 * 'Z' (UTC) padahal bulan/tahunnya dihitung dari waktu lokal (WIB = UTC+7),
 * sehingga tiap pergantian bulan rentangnya meleset dan urutan selalu balik
 * ke 1 — nomor faktur jadi kembar dan order gagal disimpan.
 *
 * @param refPrefix The prefix for the invoice number (e.g., 'INV', 'PO').
 * @param method The sequencing method ('bulan' for monthly, 'tahun' for yearly).
 * @param type The type of order ('sales' or 'purchase') to query the correct table.
 * @returns A promise that resolves to the generated invoice number.
 */
export const generateInvoiceNumber = async (refPrefix: string, method: 'bulan' | 'tahun', type: 'sales' | 'purchase'): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // '25' for 2025
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // '08' for August

  // 'bulan' -> MMYY (mis. '0926'), 'tahun' -> YY (mis. '26')
  const datePart = method === 'bulan' ? `${month}${year}` : year;
  const pattern = `${refPrefix}${datePart}-`;

  const tableName = type === 'sales' ? 'orders' : 'purchase_orders';

  // Ambil beberapa faktur terbaru pada periode yang sama (dikenali dari polanya),
  // lalu pakai urutan tertinggi. Tidak bergantung pada zona waktu sama sekali.
  const { data: rows, error } = await supabase
    .from(tableName)
    .select('invoice_number')
    .like('invoice_number', `${pattern}%`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  const maxSequence = (rows ?? []).reduce(
    (max: number, r: any) => Math.max(max, sequenceOf(r?.invoice_number)),
    0
  );

  const sequence = maxSequence + 1;
  const formattedSequence = sequence.toString().padStart(2, '0'); // '01', '02', ... '100'
  return `${pattern}${formattedSequence}`;
};

/** Naikkan angka urut satu nomor faktur, mis. 'INV0926-09' -> 'INV0926-10'. */
export const bumpInvoiceNumber = (invoiceNumber: string): string => {
  const m = /^(.*-)(\d+)\s*$/.exec(String(invoiceNumber ?? ''));
  if (!m) return invoiceNumber;
  const next = parseInt(m[2], 10) + 1;
  return `${m[1]}${next.toString().padStart(Math.max(2, m[2].length), '0')}`;
};

/** true kalau error Postgres-nya "duplicate key" pada kolom invoice_number. */
export const isDuplicateInvoiceError = (e: any): boolean =>
  e?.code === '23505' && String(e?.message ?? '').includes('invoice_number');

/**
 * Jalankan insert; kalau nomor faktur bentrok (dua kasir menyimpan bersamaan),
 * naikkan nomornya lalu coba lagi.
 */
export const insertWithUniqueInvoice = async <T>(
  invoiceNumber: string,
  insert: (invoice: string) => Promise<T>,
  maxAttempts = 5
): Promise<T> => {
  let invoice = invoiceNumber;
  for (let attempt = 1; ; attempt++) {
    try {
      return await insert(invoice);
    } catch (e: any) {
      if (attempt >= maxAttempts || !isDuplicateInvoiceError(e)) throw e;
      invoice = bumpInvoiceNumber(invoice);
    }
  }
};
