import React from 'react';
import { Package, Users, ShoppingCart, History, UserCheck, Truck } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useActivityLogsData } from '../hooks/useActivityLogsData';
import { useNavigate } from 'react-router-dom';

interface DashboardHomeProps {
  user: {
    first_name: string | null;
    last_name: string | null;
    role: string | null;
  } | null;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ user }) => {
  const { stats, loading: loadingStats, error: errorStats } = useDashboardStats();
  const { data: recentActivities, loading: loadingActivities, error: errorActivities } = useActivityLogsData({ limit: 3 });
  const navigate = useNavigate();

  const statsCards = [
    { title: 'Total Produk', value: stats.totalProduk, icon: Package, color: 'bg-blue-500' },
    { title: 'Karyawan Aktif', value: stats.karyawanAktif, icon: Users, color: 'bg-green-500' },
    { title: 'Pelanggan', value: stats.totalPelanggan, icon: UserCheck, color: 'bg-purple-500' },
    { title: 'Supplier', value: stats.totalSupplier, icon: Truck, color: 'bg-orange-500' },
  ];

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} detik yang lalu`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari yang lalu`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} bulan yang lalu`;
    const years = Math.floor(months / 12);
    return `${years} tahun yang lalu`;
  };

  if (loadingStats || loadingActivities) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data dashboard...</p>
      </div>
    );
  }

  if (errorStats || errorActivities) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error memuat dashboard:</p>
        {errorStats && <p>{errorStats}</p>}
        {errorActivities && <p>{errorActivities}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Selamat datang, {user?.first_name || 'Administrator'}!
        </h1>
        <p className="text-gray-600">
          Kelola data master untuk sistem POS Digital Printing Anda.
        </p>
      </div>

      {/* Stats Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div> */}

      {/* Quick Actions */}
      <div className="grid grid-cols-1">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Penjualan Baru */}
          <button
            onClick={() => navigate("/dashboard/sales")}
            className="flex flex-col items-center justify-center gap-2 w-full p-6 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-center"
          >
            <ShoppingCart className="w-8 h-8 text-indigo-600" />
            <div>
              <div className="font-medium text-gray-900">Penjualan Baru</div>
              <div className="text-sm text-gray-500">
                Tambahkan penjualan baru
              </div>
            </div>
          </button>

          {/* Pembelian */}
          <button
            onClick={() => navigate("/dashboard/purchases")}
            className="flex flex-col items-center justify-center gap-2 w-full p-6 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-center"
          >
            <Truck className="w-8 h-8 text-green-600" />
            <div>
              <div className="font-medium text-gray-900">Pembelian</div>
              <div className="text-sm text-gray-500">
                Pembelian dari vendor / supplier
              </div>
            </div>
          </button>

          {/* History Pending */}
          <button
            onClick={() => navigate("/dashboard/history-pending")}
            className="flex flex-col items-center justify-center gap-2 w-full p-6 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-center"
          >
            <History className="w-8 h-8 text-orange-600" />
            <div>
              <div className="font-medium text-gray-900">History Pending</div>
              <div className="text-sm text-gray-500">
                Informasi transaksi pending
              </div>
            </div>
          </button>
        </div>
      </div>

        {/* <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h3>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{activity.action}</div>
                    <div className="text-sm text-gray-500">{formatTimeAgo(activity.created_at)}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Tidak ada aktivitas terbaru.</p>
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default DashboardHome;