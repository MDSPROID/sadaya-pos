import React from 'react';
import { ProdukStockItem } from '../../hooks/useProdukStockData';
import { formatCurrency } from '../../utils/formatters';
import ReportTable, { ReportColumn } from './ReportTable';
import StokBadge, { StokPeringatan, statusStok } from './StokBadge';

interface ProdukStockTableProps {
  data: ProdukStockItem[];
  allData: ProdukStockItem[];
  loadingAll?: boolean;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
  error: string | null;
  onFetchData: () => void;
  numberOffset?: number;
  selectedIds: string[];
  onToggleRow: (id: string) => void;
  onToggleAllPage: (checked: boolean) => void;
  /** Kontrol filter tambahan yang ditaruh di baris filter ReportTable. */
  extraFilters?: React.ReactNode;
}

const columns: ReportColumn<ProdukStockItem>[] = [
  { key: 'id', header: 'Kode Produk', cell: p => p.id, excel: p => p.id, width: 16 },
  { key: 'nama', header: 'Nama', cell: p => p.nama_produk, excel: p => p.nama_produk, width: 32 },
  { key: 'kategori', header: 'Kategori', cell: p => p.kategori?.nama || 'N/A', excel: p => p.kategori?.nama || '', width: 20 },
  { key: 'satuan', header: 'Satuan', cell: p => p.satuan?.nama || 'N/A', excel: p => p.satuan?.nama || '', width: 14 },
  {
    key: 'stok',
    header: 'Stok',
    cell: p => <StokBadge stok={p.stok} stokMinimum={p.stok_minimum} />,
    printCell: p => p.stok,
    excel: p => Number(p.stok ?? 0),
    width: 10,
  },
  {
    key: 'stok_minimum',
    header: 'Stok Min.',
    cell: p => <StokPeringatan stok={p.stok} stokMinimum={p.stok_minimum} />,
    printCell: p => {
      const st = statusStok(p.stok, p.stok_minimum);
      const ket = st === 'habis' ? ' (Habis)' : st === 'menipis' ? ' (Perlu dipesan)' : '';
      return `${Number(p.stok_minimum ?? 0).toLocaleString('id-ID')}${ket}`;
    },
    excel: p => Number(p.stok_minimum ?? 0),
    width: 16,
  },
  { key: 'harga_pokok', header: 'Harga Pokok', cell: p => formatCurrency(p.harga_pokok), excel: p => Number(p.harga_pokok ?? 0), width: 16 },
  { key: 'harga_jual', header: 'Harga Jual', cell: p => formatCurrency(p.harga_jual_umum), excel: p => Number(p.harga_jual_umum ?? 0), width: 16 },
];

const ProdukStockTable: React.FC<ProdukStockTableProps> = (props) => (
  <ReportTable
    title="Laporan Stok Produk"
    columns={columns}
    getId={(p) => p.id}
    searchPlaceholder="Cari produk (kode, nama, kategori)..."
    emptyText="Tidak ada data stok produk."
    fileBaseName="laporan-stok-produk"
    {...props}
  />
);

export default ProdukStockTable;
