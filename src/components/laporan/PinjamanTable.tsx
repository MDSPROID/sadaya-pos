import React from 'react';
import { PinjamanKaryawanItem } from '../../hooks/usePinjamanKaryawanData';
import ReportTable, { ReportColumn } from './ReportTable';

interface PinjamanTableProps {
  data: PinjamanKaryawanItem[];
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  totalPiutang: number;
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

const statusLabel = (status: string) =>
  status === 'active' ? 'Aktif' : status === 'completed' ? 'Lunas' : 'Macet';

const columns: ReportColumn<PinjamanKaryawanItem>[] = [
  {
    key: 'tanggal',
    header: 'Tanggal Pinjam',
    cell: i => new Date(i.tanggal_pinjam).toLocaleDateString('id-ID'),
    excel: i => new Date(i.tanggal_pinjam).toLocaleDateString('id-ID'),
    width: 16,
  },
  {
    key: 'karyawan',
    header: 'Nama Karyawan',
    cell: i => <span className="font-medium text-gray-900">{namaOf(i.profiles_karyawan)}</span>,
    excel: i => namaOf(i.profiles_karyawan),
    width: 24,
  },
  {
    key: 'jumlah',
    header: 'Jumlah Pinjaman',
    cell: i => rp(i.jumlah_pinjaman),
    excel: i => Number(i.jumlah_pinjaman ?? 0),
    width: 18,
  },
  {
    key: 'sisa',
    header: 'Sisa Pinjaman',
    cell: i => rp(i.sisa_pinjaman),
    excel: i => Number(i.sisa_pinjaman ?? 0),
    width: 18,
  },
  {
    key: 'status',
    header: 'Status',
    cell: i => (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          i.status === 'active'
            ? 'bg-yellow-100 text-yellow-800'
            : i.status === 'completed'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {statusLabel(i.status)}
      </span>
    ),
    printCell: i => statusLabel(i.status),
    excel: i => statusLabel(i.status),
    width: 12,
  },
  {
    key: 'keterangan',
    header: 'Keterangan',
    cell: i => i.keterangan || '-',
    excel: i => i.keterangan || '',
    width: 36,
    wrap: true,
  },
  {
    key: 'dicatat',
    header: 'Dicatat Oleh',
    cell: i => namaOf(i.profiles_dicatat_oleh),
    excel: i => namaOf(i.profiles_dicatat_oleh),
    width: 22,
  },
];

const PinjamanTable: React.FC<PinjamanTableProps> = ({
  data,
  searchTerm,
  onSearchChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  totalPiutang,
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
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="endDate" className={labelCls}>Sampai</label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={inputCls}
        />
      </div>
    </>
  );

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');

  return (
    <ReportTable
      title="Laporan Pinjaman Karyawan"
      data={data}
      allData={data}          /* halaman ini tidak dipaginasi: tabel = seluruh data */
      getId={(i) => i.id}
      columns={columns}
      searchPlaceholder="Cari nama karyawan atau keterangan..."
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      loading={loading}
      error={error}
      onFetchData={onFetchData}
      selectedIds={selectedIds}
      onToggleRow={onToggleRow}
      onToggleAllPage={onToggleAllPage}
      emptyText="Tidak ada data pinjaman karyawan."
      fileBaseName="laporan-pinjaman"
      extraFilters={dateFilters}
      summary={`Piutang: ${rp(totalPiutang)}`}
      meta={[{ k: 'Periode', v: `${fmtDate(startDate)} s/d ${fmtDate(endDate)}` }]}
    />
  );
};

export default PinjamanTable;
