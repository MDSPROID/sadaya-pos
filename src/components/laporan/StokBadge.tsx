import React from 'react';

export type StokStatus = 'habis' | 'menipis' | 'aman' | 'tidak_dipantau';

/**
 * Status stok satu barang terhadap batas minimumnya.
 *
 * Sebelumnya warna badge memakai ambang tetap (>50 hijau, >20 kuning) untuk semua
 * barang. Itu tidak masuk akal di percetakan: banner dihitung meter, sedangkan
 * mug dihitung biji — angka 20 berarti sangat berbeda. Sekarang batasnya diisi
 * per barang lewat kolom "Stok Minimum".
 */
export const statusStok = (stok: number, stokMinimum: number): StokStatus => {
  const s = Number(stok ?? 0);
  const min = Number(stokMinimum ?? 0);
  if (s <= 0) return 'habis';
  if (min <= 0) return 'tidak_dipantau';
  return s <= min ? 'menipis' : 'aman';
};

export const perluDipesan = (stok: number, stokMinimum: number) => {
  const st = statusStok(stok, stokMinimum);
  return st === 'habis' || st === 'menipis';
};

const GAYA: Record<StokStatus, string> = {
  habis: 'bg-red-100 text-red-800',
  menipis: 'bg-amber-100 text-amber-800',
  aman: 'bg-green-100 text-green-800',
  tidak_dipantau: 'bg-gray-100 text-gray-700',
};

const JUDUL: Record<StokStatus, string> = {
  habis: 'Stok habis',
  menipis: 'Stok sudah di bawah / sama dengan batas minimum',
  aman: 'Stok masih di atas batas minimum',
  tidak_dipantau: 'Batas minimum belum diisi, jadi tidak dipantau',
};

/** Angka stok dengan warna sesuai batas minimum barang itu sendiri. */
const StokBadge: React.FC<{ stok: number; stokMinimum: number }> = ({ stok, stokMinimum }) => {
  const st = statusStok(stok, stokMinimum);
  return (
    <span
      title={JUDUL[st]}
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${GAYA[st]}`}
    >
      {Number(stok ?? 0).toLocaleString('id-ID')}
    </span>
  );
};

/** Label kecil "Perlu dipesan" / "Habis" di kolom batas minimum. */
export const StokPeringatan: React.FC<{ stok: number; stokMinimum: number }> = ({ stok, stokMinimum }) => {
  const st = statusStok(stok, stokMinimum);
  if (st === 'aman' || st === 'tidak_dipantau') {
    return <span className="text-gray-500">{Number(stokMinimum ?? 0).toLocaleString('id-ID')}</span>;
  }
  return (
    <span className="whitespace-nowrap">
      <span className="text-gray-500">{Number(stokMinimum ?? 0).toLocaleString('id-ID')}</span>
      <span className={`ml-2 text-xs font-semibold ${st === 'habis' ? 'text-red-700' : 'text-amber-700'}`}>
        {st === 'habis' ? 'Habis' : 'Perlu dipesan'}
      </span>
    </span>
  );
};

export default StokBadge;
