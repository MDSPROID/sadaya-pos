import React from 'react';
import { KasMasukItem } from '../../hooks/useKasMasukData';
import ReportTable, { ReportColumn } from './ReportTable';
import { formatPaymentMethod } from '../../utils/formatters';

interface PemasukanTableProps {
  data: KasMasukItem[];
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  methodFilter: string;
  setMethodFilter: (v: string) => void;
  totalJumlah: number;
  loading?: boolean;
  error: string | null;
  onFetchData: () => void;
  selectedIds: string[];
  onToggleRow: (id: string) => void;
  onToggleAllPage: (checked: boolean) => void;
}

const rp = (n: number) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const namaOf = (p: { first_name: string; last_name: string } | null) =>
  p ? `${p.first_name} ${p.last_name || ''}`.trim() : 'N/A';

const metodeOf = (i: { payment_method?: string | null; bank?: { nama_bank: string } | null }) =>
  `${formatPaymentMethod(i.payment_method)}${i.bank?.nama_bank ? ` (${i.bank.nama_bank})` : ''}`;

const jamOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const columns: ReportColumn<KasMasukItem>[] = [
  {
    key: 'tanggal',
    header: 'Tanggal',
    cell: i => new Date(i.tanggal).toLocaleDateString('id-ID'),
    excel: i => new Date(i.tanggal).toLocaleDateString('id-ID'),
    width: 14,
  },
  { key: 'jam', header: 'Jam', cell: i => jamOf(i.created_at), excel: i => jamOf(i.created_at), width: 10 },
  {
    key: 'nama',
    header: 'Nama Pemasukan',
    cell: i => <span className="font-medium text-gray-900">{i.nama_pemasukan}</span>,
    excel: i => i.nama_pemasukan,
    width: 28,
  },
  { key: 'keterangan', header: 'Keterangan', cell: i => i.keterangan || '-', excel: i => i.keterangan || '', width: 36, wrap: true },
  { key: 'petugas', header: 'Petugas', cell: i => namaOf(i.profiles), excel: i => namaOf(i.profiles), width: 22 },
  {
    key: 'metode',
    header: 'Metode',
    cell: i => metodeOf(i),
    excel: i => metodeOf(i),
    width: 20,
  },
  { key: 'jumlah', header: 'Jumlah', cell: i => rp(i.jumlah), excel: i => Number(i.jumlah ?? 0), width: 18 },
];

const PemasukanTable: React.FC<PemasukanTableProps> = ({
  data,
  searchTerm,
  onSearchChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  methodFilter,
  setMethodFilter,
  totalJumlah,
  loading = false,
  error,
  onFetchData,
  selectedIds,
  onToggleRow,
  onToggleAllPage,
}) => {
  const inputCls =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  const dateFilters = (
    <>
      <div>
        <label htmlFor="startDate" className={labelCls}>Dari</label>
        <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor="endDate" className={labelCls}>Sampai</label>
        <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor="methodFilter" className={labelCls}>Metode</label>
        <select id="methodFilter" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className={inputCls}>
          <option value="all">Semua Metode</option>
          <option value="cash">Tunai</option>
          <option value="bank_transfer">Transfer Bank</option>
        </select>
      </div>
    </>
  );

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');

  return (
    <ReportTable
      title="Laporan Pemasukan"
      data={data}
      allData={data}          /* halaman ini tidak dipaginasi: tabel = seluruh data */
      getId={(i) => i.id}
      columns={columns}
      searchPlaceholder="Cari nama pemasukan, keterangan, atau petugas..."
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      loading={loading}
      error={error}
      onFetchData={onFetchData}
      selectedIds={selectedIds}
      onToggleRow={onToggleRow}
      onToggleAllPage={onToggleAllPage}
      emptyText="Tidak ada data pemasukan."
      fileBaseName="laporan-pemasukan"
      extraFilters={dateFilters}
      summary={`Total: ${rp(totalJumlah)}`}
      meta={[
        { k: 'Periode', v: `${fmtDate(startDate)} s/d ${fmtDate(endDate)}` },
        { k: 'Metode', v: methodFilter === 'all' ? 'Semua Metode' : formatPaymentMethod(methodFilter) },
      ]}
    />
  );
};

export default PemasukanTable;
