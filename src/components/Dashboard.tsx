import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

import StatusOrderProcess from '../pages/StatusOrderProcess';

// Import halaman Master Data
import Pelanggan from './master-data/Pelanggan';
import Level from './master-data/Level';
import Produk from './master-data/Produk';
import Bahan from './master-data/Bahan';
import Finishing from './master-data/Finishing';
import Kategori from './master-data/Kategori';
import Satuan from './master-data/Satuan';
import Karyawan from './master-data/Karyawan';
import Supplier from './master-data/Supplier';
import Pola from './master-data/Pola';
import Bank from './master-data/Bank';

// Import halaman Back Office
import KasMasuk from '../pages/KasMasuk';
import KasKeluar from '../pages/KasKeluar';
import BahanKeluar from '../pages/BahanKeluar';
import PinjamanKaryawan from '../pages/PinjamanKaryawan';
import Nota from '../pages/Nota';
import Poin from '../pages/Poin';
import PengaturanAplikasi from '../pages/PengaturanAplikasi';
import History from '../pages/History';
import Sales from '../pages/Sales';
import StatusOrder from '../pages/StatusOrder';
import HistoryPendingSales from '../pages/HistoryPendingSales';
import Pembelian from '../pages/Pembelian';
import HistoryPendingPurchases from '../pages/HistoryPendingPurchases';
import UserAkses from './master-data/UserAkses';

// Import halaman Laporan
import LaporanPenjualan from '../pages/laporan/LaporanPenjualan';
import LaporanPembelian from '../pages/laporan/LaporanPembelian';
import LaporanStok from '../pages/laporan/LaporanStok';
import LaporanProdukRusak from '../pages/laporan/LaporanProdukRusak';
import LaporanPemasukan from '../pages/laporan/LaporanPemasukan';
import LaporanPengeluaran from '../pages/laporan/LaporanPengeluaran';
import LaporanPinjaman from '../pages/laporan/LaporanPinjaman';
import LaporanNeraca from '../pages/laporan/LaporanNeraca';
import LaporanRekapKecepatan from '../pages/laporan/LaporanRekapKecepatan';

// Import Pengaturan
import ProfilePage from '../pages/ProfilePage';

// Import Header and HeaderNav
import Header from './Header';
import DashboardHome from './DashboardHome';

interface DashboardProps {
  user: any; // Sesuaikan dengan tipe profil pengguna Anda
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false); // State to control mobile nav overlay

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header
        user={user}
        onLogout={onLogout}
        onMenuToggle={() => setIsMobileNavOpen(true)}
        isMobileNavOpen={isMobileNavOpen} // Pass the state
        setIsMobileNavOpen={setIsMobileNavOpen} // Pass the setter
      />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
        <Routes>
          {/* Rute untuk halaman utama Dashboard */}
          <Route index element={<DashboardHome user={user} />} />

          {/* Rute untuk status order*/}
          <Route path="status-order" element={<ProtectedRoute require="Status Order.status_order"><StatusOrder /></ProtectedRoute>} />

          {/* Proses Cetak (lanjutkan transaksi dari Status Order) */}
          <Route path="status_order/process/:id" element={<ProtectedRoute require="Status Order.status_order"><StatusOrderProcess /></ProtectedRoute>} />

          {/* Opsional: alias dengan hyphen agar /dashboard/status-order tetap berfungsi */}
          <Route path="status-order" element={<ProtectedRoute require="Status Order.status_order"><StatusOrder /></ProtectedRoute>} />
          <Route path="status-order/process/:id" element={<ProtectedRoute require="Status Order.status_order"><StatusOrderProcess /></ProtectedRoute>} />

          {/* Rute untuk Penjualan */}
          <Route path="sales" element={<ProtectedRoute require="Main.sales"><Sales /></ProtectedRoute>} />
          
          {/* Rute untuk Pembelian */}
          <Route path="purchases" element={<ProtectedRoute require="Main.purchases"><Pembelian /></ProtectedRoute>} />
          {/* Rute untuk edit Pembelian */}
          {/* <Route path="purchases/:id/edit" element={<ProtectedRoute require="Main.purchases"><Pembelian /></ProtectedRoute>} /> */}

          {/* Rute untuk Back Office */}
          <Route path="back-office/kas_masuk" element={<ProtectedRoute require="Back Office.kas_masuk"><KasMasuk /></ProtectedRoute>} />
          <Route path="back-office/kas_keluar" element={<ProtectedRoute require="Back Office.kas_keluar"><KasKeluar /></ProtectedRoute>} />
          <Route path="back-office/bahan_keluar" element={<ProtectedRoute require="Back Office.bahan_keluar"><BahanKeluar /></ProtectedRoute>} />
          <Route path="back-office/pinjaman_karyawan" element={<ProtectedRoute require="Back Office.pinjaman_karyawan"><PinjamanKaryawan /></ProtectedRoute>} />
          <Route path="back-office/nota" element={<ProtectedRoute require="Back Office.nota"><Nota /></ProtectedRoute>} />
          <Route path="back-office/poin" element={<ProtectedRoute require="Back Office.poin"><Poin /></ProtectedRoute>} />
          <Route path="back-office/pengaturan_aplikasi" element={<ProtectedRoute require="Back Office.pengaturan_aplikasi"><PengaturanAplikasi /></ProtectedRoute>} />
          <Route path="back-office/history" element={<ProtectedRoute require="Back Office.history"><History /></ProtectedRoute>} />
          
          {/* Rute untuk History Pending (sekarang top-level) */}
          <Route path="history-pending" element={<ProtectedRoute require="Main.history-pending"><HistoryPendingSales /></ProtectedRoute>} />
          <Route path="history-pending-purchase" element={<ProtectedRoute require="Main.history-pending"><HistoryPendingPurchases /></ProtectedRoute>} />

          {/* Rute untuk Master Data */}
          <Route path="master-data/pelanggan" element={<ProtectedRoute require="Master.pelanggan"><Pelanggan /></ProtectedRoute>} />
          <Route path="master-data/level" element={<ProtectedRoute require="Master.level"><Level /></ProtectedRoute>} />
          <Route path="master-data/produk" element={<ProtectedRoute require="Master.produk"><Produk /></ProtectedRoute>} />
          <Route path="master-data/bahan" element={<ProtectedRoute require="Master.bahan"><Bahan /></ProtectedRoute>} />
          <Route path="master-data/finishing" element={<ProtectedRoute require="Master.finishing"><Finishing /></ProtectedRoute>} />
          <Route path="master-data/kategori" element={<ProtectedRoute require="Master.kategori"><Kategori /></ProtectedRoute>} />
          <Route path="master-data/satuan" element={<ProtectedRoute require="Master.satuan"><Satuan /></ProtectedRoute>} />
          <Route path="master-data/karyawan" element={<ProtectedRoute require="Master.karyawan"><Karyawan /></ProtectedRoute>} />
          <Route path="master-data/user-akses"element={ <ProtectedRoute require="Master.user_akses"><UserAkses /></ProtectedRoute> }/>
          <Route path="master-data/supplier" element={<ProtectedRoute require="Master.supplier"><Supplier /></ProtectedRoute>} />
          <Route path="master-data/pola" element={<ProtectedRoute require="Master.pola"><Pola /></ProtectedRoute>} />
          <Route path="master-data/bank" element={<ProtectedRoute require="Master.bank"><Bank /></ProtectedRoute>} />

          {/* Rute untuk Laporan */}
          <Route path="laporan/penjualan" element={<ProtectedRoute require="Laporan.penjualan"><LaporanPenjualan /></ProtectedRoute>} />
          <Route path="laporan/pembelian" element={<ProtectedRoute require="Laporan.pembelian"><LaporanPembelian /></ProtectedRoute>} />
          <Route path="laporan/stok" element={<ProtectedRoute require="Laporan.stok"><LaporanStok /></ProtectedRoute>} />
          <Route path="laporan/produk-rusak" element={<ProtectedRoute require="Laporan.produk_rusak"><LaporanProdukRusak /></ProtectedRoute>} />
          <Route path="laporan/pemasukan" element={<ProtectedRoute require="Laporan.pemasukan"><LaporanPemasukan /></ProtectedRoute>} />
          <Route path="laporan/pengeluaran" element={<ProtectedRoute require="Laporan.pengeluaran"><LaporanPengeluaran /></ProtectedRoute>} />
          <Route path="laporan/pinjaman" element={<ProtectedRoute require="Laporan.pinjaman"><LaporanPinjaman /></ProtectedRoute>} />
          <Route path="laporan/rekap-kecepatan"element={<ProtectedRoute require="Laporan.rekap_kecepatan"><LaporanRekapKecepatan /></ProtectedRoute>} />
          <Route path="laporan/neraca" element={<ProtectedRoute require="Laporan.neraca"><LaporanNeraca /></ProtectedRoute>} />

          {/* Rute untuk Pengaturan */}
          <Route path="pengaturan/profile_page" element={<ProtectedRoute require="Pengaturan.profile_page"><ProfilePage /></ProtectedRoute>} />

          {/* CATCH-ALL untuk semua /dashboard/... yang tidak valid */}
          <Route path="*" element={<Navigate to="/not-found" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;