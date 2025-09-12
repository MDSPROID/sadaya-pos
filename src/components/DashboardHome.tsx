import React from 'react';
import { Package, Users, UserCheck, Truck } from 'lucide-react';
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/dashboard/master-data/produk')}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">Tambah Produk Baru</div>
              <div className="text-sm text-gray-500">Kelola inventori produk digital printing</div>
            </button>
            <button 
              onClick={() => navigate('/dashboard/master-data/karyawan')}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">Daftar Karyawan</div>
              <div className="text-sm text-gray-500">Tambah atau edit data karyawan</div>
            </button>
            <button 
              onClick={() => navigate('/dashboard/master-data/pelanggan')}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">Kelola Pelanggan</div>
              <div className="text-sm text-gray-500">Update informasi pelanggan</div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
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
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;