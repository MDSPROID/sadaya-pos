import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
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
import HistoryPendingSales from '../pages/HistoryPendingSales';
import Pembelian from '../pages/Pembelian';

// Import halaman Laporan
import LaporanPenjualan from '../pages/laporan/LaporanPenjualan';
import LaporanPembelian from '../pages/laporan/LaporanPembelian';
import LaporanStok from '../pages/laporan/LaporanStok';
import LaporanProdukRusak from '../pages/laporan/LaporanProdukRusak';
import LaporanPemasukan from '../pages/laporan/LaporanPemasukan';
import LaporanPengeluaran from '../pages/laporan/LaporanPengeluaran';
import LaporanPinjaman from '../pages/laporan/LaporanPinjaman';
import LaporanNeraca from '../pages/laporan/LaporanNeraca';

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

          {/* Rute untuk Penjualan */}
          <Route path="sales" element={<Sales />} />
          
          {/* Rute untuk Pembelian */}
          <Route path="purchases" element={<Pembelian />} />

          {/* Rute untuk Back Office */}
          <Route path="back-office/kas_masuk" element={<KasMasuk />} />
          <Route path="back-office/kas_keluar" element={<KasKeluar />} />
          <Route path="back-office/bahan_keluar" element={<BahanKeluar />} />
          <Route path="back-office/pinjaman_karyawan" element={<PinjamanKaryawan />} />
          <Route path="back-office/nota" element={<Nota />} />
          <Route path="back-office/poin" element={<Poin />} />
          <Route path="back-office/pengaturan_aplikasi" element={<PengaturanAplikasi />} />
          <Route path="back-office/history" element={<History />} />
          
          {/* Rute untuk History Pending (sekarang top-level) */}
          <Route path="history-pending" element={<HistoryPendingSales />} />

          {/* Rute untuk Master Data */}
          <Route path="master-data/pelanggan" element={<Pelanggan />} />
          <Route path="master-data/level" element={<Level />} />
          <Route path="master-data/produk" element={<Produk />} />
          <Route path="master-data/bahan" element={<Bahan />} />
          <Route path="master-data/finishing" element={<Finishing />} />
          <Route path="master-data/kategori" element={<Kategori />} />
          <Route path="master-data/satuan" element={<Satuan />} />
          <Route path="master-data/karyawan" element={<Karyawan />} />
          <Route path="master-data/supplier" element={<Supplier />} />
          <Route path="master-data/pola" element={<Pola />} />
          <Route path="master-data/bank" element={<Bank />} />

          {/* Rute untuk Laporan */}
          <Route path="laporan/penjualan" element={<LaporanPenjualan />} />
          <Route path="laporan/pembelian" element={<LaporanPembelian />} />
          <Route path="laporan/stok" element={<LaporanStok />} />
          <Route path="laporan/produk-rusak" element={<LaporanProdukRusak />} />
          <Route path="laporan/pemasukan" element={<LaporanPemasukan />} />
          <Route path="laporan/pengeluaran" element={<LaporanPengeluaran />} />
          <Route path="laporan/pinjaman" element={<LaporanPinjaman />} />
          <Route path="laporan/neraca" element={<LaporanNeraca />} />

          {/* Rute untuk Pengaturan */}
          <Route path="pengaturan/profile_page" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;