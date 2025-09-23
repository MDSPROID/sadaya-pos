// Hitung "Durasi Tunggu" konsisten di semua halaman

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse "YYYY-MM-DD" sebagai tanggal lokal (bukan UTC). */
export const parseLocalYMD = (ymd?: string | null): Date | null => {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/** Ambil tanggal dasar untuk perhitungan: order_date jika ada, else created_at. */
export const getBaseOrderDate = (row: { order_date?: string | null; created_at?: string }) => {
  return parseLocalYMD(row.order_date) ?? new Date(row.created_at as string);
};

/** Durasi tunggu dalam hari (dibulatkan ke bawah, min 0). */
export const calcDurasiTunggu = (
  row: { order_date?: string | null; created_at?: string },
  nowMs: number = Date.now()
): number => {
  const base = getBaseOrderDate(row);
  return Math.max(0, Math.floor((nowMs - base.getTime()) / DAY_MS));
};
