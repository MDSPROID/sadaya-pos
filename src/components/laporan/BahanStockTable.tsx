import React from 'react';
import { BahanStockItem } from '../../hooks/useBahanStockData';
import { formatCurrency } from '../../utils/formatters';
import ReportTable, { ReportColumn } from './ReportTable';
import StokBadge, { StokPeringatan, statusStok } from './StokBadge';

interface BahanStockTableProps {
  data: BahanStockItem[];
  allData: BahanStockItem[];
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

const columns: ReportColumn<BahanStockItem>[] = [
  { key: 'id', header: 'Kode Bahan', cell: b => b.id, excel: b => b.id, width: 16 },
  { key: 'nama', header: 'Nama', cell: b => b.nama, excel: b => b.nama, width: 30 },
  { key: 'satuan', header: 'Satuan', cell: b => b.satuan?.nama || 'N/A', excel: b => b.satuan?.nama || '', width: 14 },
  { key: 'isi', header: 'Isi', cell: b => b.isi, excel: b => Number(b.isi ?? 0), width: 10 },
  { key: 'harga_beli', header: 'Harga Beli', cell: b => formatCurrency(b.harga_beli), excel: b => Number(b.harga_beli ?? 0), width: 16 },
  { key: 'supplier', header: 'Supplier', cell: b => b.supplier?.nama || 'N/A', excel: b => b.supplier?.nama || '', width: 24 },
  {
    key: 'stok',
    header: 'Stok',
    cell: b => <StokBadge stok={b.stok} stokMinimum={b.stok_minimum} />,
    printCell: b => b.stok,
    excel: b => Number(b.stok ?? 0),
    width: 10,
  },
  {
    key: 'stok_minimum',
    header: 'Stok Min.',
    cell: b => <StokPeringatan stok={b.stok} stokMinimum={b.stok_minimum} />,
    printCell: b => {
      const st = statusStok(b.stok, b.stok_minimum);
      const ket = st === 'habis' ? ' (Habis)' : st === 'menipis' ? ' (Perlu dipesan)' : '';
      return `${Number(b.stok_minimum ?? 0).toLocaleString('id-ID')}${ket}`;
    },
    excel: b => Number(b.stok_minimum ?? 0),
    width: 16,
  },
];

const BahanStockTable: React.FC<BahanStockTableProps> = (props) => (
  <ReportTable
    title="Laporan Stok Bahan Baku"
    columns={columns}
    getId={(b) => b.id}
    searchPlaceholder="Cari bahan (kode, nama, satuan, supplier)..."
    emptyText="Tidak ada data stok bahan."
    fileBaseName="laporan-stok-bahan"
    {...props}
  />
);

export default BahanStockTable;
