import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

interface DrilldownBannerProps {
  /** Nama baris di Laporan Neraca, mis. "Jumlah Piutang". */
  label: string;
  /** Nilai menurut Laporan Neraca. */
  neracaValue: number;
  /** Nilai pembanding di halaman ini. */
  pageValue: number;
  /** Nama angka pembanding di halaman ini, mis. "Kekurangan". */
  fieldLabel: string;
}

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

/**
 * Banner saat halaman dibuka dari Laporan Neraca: menunjuk langsung angka mana
 * yang harus dicocokkan, supaya admin tidak tertukar dengan angka lain di halaman.
 */
const DrilldownBanner: React.FC<DrilldownBannerProps> = ({ label, neracaValue, pageValue, fieldLabel }) => {
  const selisih = Math.round(pageValue) - Math.round(neracaValue);
  const cocok = Math.abs(selisih) <= 1; // toleransi pembulatan rupiah

  return (
    <div
      className={`no-print rounded-lg border p-3 sm:p-4 ${
        cocok ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {cocok ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-none mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-none mt-0.5" />
        )}
        <div className="flex-1 text-sm">
          <p className={cocok ? 'text-green-900' : 'text-amber-900'}>
            Ditelusuri dari <span className="font-semibold">Laporan Neraca — {label}</span>.
            Angka yang perlu dicocokkan di halaman ini adalah <span className="font-semibold">{fieldLabel}</span>.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="text-gray-700">
              Neraca: <span className="font-semibold text-gray-900">{rp(neracaValue)}</span>
            </span>
            <span className="text-gray-700">
              {fieldLabel} di sini: <span className="font-semibold text-gray-900">{rp(pageValue)}</span>
            </span>
            <span className={`font-semibold ${cocok ? 'text-green-700' : 'text-amber-700'}`}>
              {cocok ? 'Cocok' : `Selisih ${rp(Math.abs(selisih))}`}
            </span>
          </div>
          {!cocok && (
            <p className="mt-2 text-xs text-amber-900">
              Selisih biasanya muncul kalau filter di halaman ini diubah (mis. opsi "Sertakan order batal / belum ada pembayaran" dimatikan).
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="hidden sm:flex items-center text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap"
          title="Tutup tab ini dan kembali ke Laporan Neraca"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tutup tab
        </button>
      </div>
    </div>
  );
};

export default DrilldownBanner;
