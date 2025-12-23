import React, { useRef } from 'react';
import html2canvas from 'html2canvas';

type NotaItem = {
  product_name?: string;
  nama_produk?: string;
  nama?: string;
  quantity?: number;
  qty?: number;
  subtotal_per_item?: number;
  subtotal?: number;
  dimensions?: {
    panjang?: number;
    lebar?: number;
    satuan?: string;
    tebal_bahan_nama?: string;
    additional_options?: {
      name: string;
      quantity: number;
    }[];
  } | null;
};

type NotaPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber?: string;
  customerName?: string;
  customerPhone?: string;
  items: NotaItem[];
  finalAmount: number;
  dpAmount?: number;
  paidAmount?: number;
  totalPaid?: number;
  tempoActive?: boolean;
  tempoDate?: string;
  bank?: {
    nama_bank?: string;
    rekening?: string;
    nama_akun?: string;
  };
  company?: {
    logoUrl?: string;
    companyName?: string;
    address?: string;
    phone?: string;
  };
  kasirName?: string;
};

const formatRupiah = (n: number) =>
  `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const formatRupiahNonSymbol = (n: number) =>
  `${Number(n || 0).toLocaleString('id-ID')}`;

const NotaPreviewModal: React.FC<NotaPreviewModalProps> = ({
  isOpen,
  onClose,
  invoiceNumber,
  customerName,
  customerPhone,
  items,
  finalAmount,
  dpAmount = 0,
  paidAmount = 0,
  totalPaid = 0,
  tempoActive = false,
  tempoDate,
  bank,
  company,
  kasirName,
}) => {
  const notaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const telpDisplay = (() => {
    if (!customerPhone) return '-';
    if (customerPhone.startsWith('62') && customerPhone.length > 2) {
      return '0' + customerPhone.slice(2);
    }
    return customerPhone;
  })();

  const handleSaveAsImage = async () => {
    if (!notaRef.current) return;

    const el = notaRef.current;
    const canvas = await html2canvas(el, {
      scale: 2, // biar lebih tajam
      useCORS: true,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `nota-${invoiceNumber || 'order'}.png`;
    link.click();
  };

  console.log(invoiceNumber);

  const now = new Date();
  const tgl = now.toLocaleDateString('id-ID');
  const jam = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // total yang sudah dibayar (DP + pelunasan), kalau ada totalPaid dari DB, pakai itu
  const totalTerbayar =
    Number(totalPaid || 0) > 0
      ? Number(totalPaid || 0)
      : Number(dpAmount || 0) + Number(paidAmount || 0);

  const sisa = Math.max(Number(finalAmount || 0) - totalTerbayar, 0);
  const kembali = Math.max(totalTerbayar - Number(finalAmount || 0), 0);
  const status = sisa <= 0 ? 'LUNAS' : 'BELUM LUNAS';

  const bankLine1 =
    bank && (bank.nama_bank || bank.nama_akun)
      ? `${bank.nama_bank || ''}${bank.nama_akun ? ` A/N ${bank.nama_akun}` : ''}`
      : '';
  const bankLine2 = bank?.rekening || '';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col">
        {/* Header modal */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Preview Nota</h2>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Area nota yang akan di-capture */}
        <div
          ref={notaRef}
          className="p-4 bg-white text-gray-900 max-h-[70vh] overflow-auto"
        >
          {/* Header perusahaan */}
          <div className="text-center mb-3">
            {company?.logoUrl && (
              <img
                src={company.logoUrl}
                alt="Logo"
                className="mx-auto mb-2 max-h-16 object-contain"
              />
            )}
            <div className="font-bold text-base">
              {company?.companyName || 'Nama Perusahaan'}
            </div>
            {company?.address && (
              <div className="text-xs">{company.address}</div>
            )}
            {company?.phone && <div className="text-xs">{company.phone}</div>}
          </div>

          <div className="border-t border-dashed my-2" />

          {/* Info Nota */}
          <div className="text-xs mb-2">
            <div className="flex justify-between">
              <div>
                <div>
                  <span className="inline-block w-16">Nota</span>
                  <span>: {invoiceNumber || '-'}</span>
                </div>
                <div>
                  <span className="inline-block w-16">Customer</span>
                  <span>: {customerName || '-'}</span>
                </div>
                <div>
                  <span className="inline-block w-16">Telp/HP</span>
                  <span>: {telpDisplay}</span>
                </div>
              </div>
              <div className="text-left">
                <div>
                  <span className="inline-block w-16">Tanggal</span>
                  <span>: {tgl}</span>
                </div>
                <div>
                  <span className="inline-block w-16">Jam</span>
                  <span>: {jam}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-dashed my-2" />

          {/* Tabel item */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Nama</th>
                <th className="text-right py-1">Harga</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                items.map((it, idx) => {
                  const name =
                    it.product_name ||
                    it.nama_produk ||
                    it.nama ||
                    `Item ${idx + 1}`;

                  const qty = Number(it.quantity ?? it.qty ?? 0);
                  let subtotal = Number(
                    it.subtotal_per_item ?? it.subtotal ?? 0
                  );
                  if (!Number.isFinite(subtotal)) subtotal = 0;
                  const harga = qty > 0 ? subtotal / qty : 0;

                  // --- Hitung string ukuran dari dimensions ---
                  const dims = (it as any).dimensions || null;

                  let ukuranMain = '';
                  if (dims) {
                    const p = dims.panjang ?? '';
                    const l = dims.lebar ?? '';
                    const satuan = dims.satuan ?? '';

                    let base = '';
                    if (p && l) base = `${p}x${l}`;
                    else base = p || l || '';

                    if (satuan) {
                      base = base ? `${base} ${satuan}` : satuan;
                    }

                    const parts: string[] = [];
                    if (base) parts.push(base);
                    if (dims.tebal_bahan_nama) {
                      parts.push(`(${dims.tebal_bahan_nama})`);
                    }

                    ukuranMain = parts.join(' ');
                  }

                  let additionalText = '';
                  if (dims?.additional_options && Array.isArray(dims.additional_options) && dims.additional_options.length > 0) {
                    additionalText = dims.additional_options
                      .map((opt: any) => `${opt.name} (${opt.quantity})`)
                      .join(', ');
                  }

                  const ukuranStr = [ukuranMain, additionalText].filter(Boolean).join(' | ');

                  return (
                    <tr key={idx}>
                      <td className="py-1 pr-1 align-top">
                        <div>{name}</div>
                        {ukuranStr && (
                          <div className="text-[10px] text-gray-500">
                            {ukuranStr}
                          </div>
                        )}
                      </td>
                      <td className="py-1 text-right align-top">
                        {formatRupiahNonSymbol(harga)}
                      </td>
                      <td className="py-1 text-center align-top">{qty}</td>
                      <td className="py-1 text-right align-top">
                        {formatRupiahNonSymbol(subtotal)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-2 text-gray-500">
                    Belum ada item
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="border-t border-dashed my-2" />

          {/* Total + Sisa/Bayar/Kembali */}
          <div className="flex justify-between text-sm font-semibold">
            <span>Grand Total</span>
            <span>{formatRupiah(finalAmount)}</span>
          </div>

          <div className="mt-2 text-xs">
            <div className="flex justify-between">
              <span>Sisa</span>
              <span>{formatRupiah(sisa)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bayar</span>
              <span>{formatRupiah(paidAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kembali</span>
              <span>{formatRupiah(kembali)}</span>
            </div>
          </div>

          {tempoActive && tempoDate && (
            <div className="mt-2 text-xs">
              Tempo: {new Date(tempoDate).toLocaleDateString('id-ID')}
            </div>
          )}

          <div className="mt-4 text-xs flex justify-between">
            <span>Status: {status}</span>
            <span>Petugas: {kasirName || '-'}</span>
          </div>

          {(bankLine1 || bankLine2) && (
            <div className="mt-3 text-xs text-center">
              <div>Transfer ke:</div>
              {bankLine1 && <div>{bankLine1}</div>}
              {bankLine2 && <div>{bankLine2}</div>}
            </div>
          )}
          
        </div>

        {/* Footer aksi */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            Tutup
          </button>
          <button
            onClick={handleSaveAsImage}
            className="px-3 py-1.5 rounded bg-blue-600 text-sm text-white hover:bg-blue-700"
          >
            Simpan sebagai gambar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotaPreviewModal;
