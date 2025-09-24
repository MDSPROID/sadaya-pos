import { 
  LayoutDashboard, Users, BarChart, ShoppingCart, Package, DollarSign, TrendingUp, Scale, Handshake, FileText,
  Layers, Sparkles, FolderOpen, Ruler, UserCheck, Truck, Grid3X3, Shield, CreditCard,
  ArrowDownCircle, ArrowUpCircle, PackageMinus, History as HistoryIcon, ReceiptText, Star, Settings, User,
  Clock, ShoppingBag // Import ShoppingBag icon for Pembelian
} from 'lucide-react';

export interface SidebarMenuItem {
  name: string;
  path?: string;
  icon?: React.ElementType;
  children?: SidebarMenuItem[];
  allowedRoles?: string[]; // Tambahkan properti ini untuk kontrol akses
}

const sidebarConfig: SidebarMenuItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard', // Path updated to /dashboard
    icon: LayoutDashboard,
    allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'], // Contoh peran yang diizinkan
  },
  {
    name: 'Status Order',
    path: '/dashboard/status_order', 
    icon: Clock,
    allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'], 
  },
  {
    name: 'Master Data',
    icon: Users,
    allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'], // Roles that can see Master Data section
    children: [
      {
        name: 'Produk',
        path: '/dashboard/master-data/produk',
        icon: Package,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Bahan',
        path: '/dashboard/master-data/bahan',
        icon: Layers,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Finishing',
        path: '/dashboard/master-data/finishing',
        icon: Sparkles,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Kategori',
        path: '/dashboard/master-data/kategori',
        icon: FolderOpen,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Satuan',
        path: '/dashboard/master-data/satuan',
        icon: Ruler,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Karyawan',
        path: '/dashboard/master-data/karyawan',
        icon: Users,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Pelanggan',
        path: '/dashboard/master-data/pelanggan',
        icon: UserCheck,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Supplier',
        path: '/dashboard/master-data/supplier',
        icon: Truck,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Pola',
        path: '/dashboard/master-data/pola',
        icon: Grid3X3,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Level (Role)',
        path: '/dashboard/master-data/level',
        icon: Shield,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Bank',
        path: '/dashboard/master-data/bank',
        icon: CreditCard,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
    ],
  },
  {
    name: 'Back Office',
    icon: HistoryIcon, // Using HistoryIcon for Back Office main menu
    allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
    children: [
      {
        name: 'Kas Masuk',
        path: '/dashboard/back-office/kas_masuk',
        icon: ArrowDownCircle,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Kas Keluar',
        path: '/dashboard/back-office/kas_keluar',
        icon: ArrowUpCircle,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Bahan Keluar',
        path: '/dashboard/back-office/bahan_keluar',
        icon: PackageMinus,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Pinjaman Karyawan',
        path: '/dashboard/back-office/pinjaman_karyawan',
        icon: Handshake,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Nota',
        path: '/dashboard/back-office/nota',
        icon: ReceiptText,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Poin',
        path: '/dashboard/back-office/poin',
        icon: Star,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Pengaturan Aplikasi',
        path: '/dashboard/back-office/pengaturan_aplikasi',
        icon: Settings,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'History',
        path: '/dashboard/back-office/history',
        icon: HistoryIcon,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
    ],
  },
  {
    name: 'Laporan',
    icon: BarChart,
    allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'], // Hanya Super Admin yang bisa melihat menu Laporan
    children: [
      {
        name: 'Penjualan',
        path: '/dashboard/laporan/penjualan',
        icon: ShoppingCart,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Pembelian',
        path: '/dashboard/laporan/pembelian',
        icon: Package,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Stok',
        path: '/dashboard/laporan/stok',
        icon: Scale,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Produk Rusak',
        path: '/dashboard/laporan/produk-rusak',
        icon: FileText,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Pemasukan',
        path: '/dashboard/laporan/pemasukan',
        icon: DollarSign,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Pengeluaran',
        path: '/dashboard/laporan/pengeluaran',
        icon: TrendingUp,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Pinjaman',
        path: '/dashboard/laporan/pinjaman',
        icon: Handshake,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
      {
        name: 'Neraca',
        path: '/dashboard/laporan/neraca',
        icon: Scale,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
    ],
  },
  {
    name: 'Pengaturan',
    icon: Settings,
    allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
    children: [
      {
        name: 'Profil',
        path: '/dashboard/pengaturan/profile_page',
        icon: User,
        allowedRoles: ['Super Admin', 'Admin', 'Kasir', 'Operator', 'Designer', 'Finishing'],
      },
    ],
  },
];

export default sidebarConfig;