import React from 'react';
import { ProdukStockItem } from '../../hooks/useProdukStockData';
import { formatCurrency } from '../../utils/formatters';
import ReportTable, { ReportColumn } from './ReportTable';

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
}

const stokBadge = (stok: number) => (
  <span
    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
      stok > 50 ? 'bg-green-100 text-green-800' : stok > 20 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
    }`}
  >
    {stok}
  </span>
);

const columns: ReportColumn<ProdukStockItem>[] = [
  { key: 'id', header: 'Kode Produk', cell: p => p.id, excel: p => p.id, width: 16 },
  { key: 'nama', header: 'Nama', cell: p => p.nama_produk, excel: p => p.nama_produk, width: 32 },
  { key: 'kategori', header: 'Kategori', cell: p => p.kategori?.nama || 'N/A', excel: p => p.kategori?.nama || '', width: 20 },
  { key: 'satuan', header: 'Satuan', cell: p => p.satuan?.nama || 'N/A', excel: p => p.satuan?.nama || '', width: 14 },
  {
    key: 'stok',
    header: 'Stok',
    cell: p => stokBadge(p.stok),
    printCell: p => p.stok,
    excel: p => Number(p.stok ?? 0),
    width: 10,
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
