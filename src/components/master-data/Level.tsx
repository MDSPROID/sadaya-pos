import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Eye, Shield } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';

interface RoleItem {
  id: string;
  nama: string;
  permissions: { [category: string]: { [key: string]: boolean } };
}

// Define the full structure of all possible permissions
const allPermissionsStructure = {
  "Main": {
    "dashboard": "Dashboard"
  },
  "Status Order": {
    "status-order": "Status Order"
  },
  "Master": {
    "produk": "Produk",
    "bahan": "Bahan",
    "finishing": "Finishing",
    "kategori": "Kategori",
    "satuan": "Satuan",
    "karyawan": "Karyawan",
    "pelanggan": "Pelanggan",
    "supplier": "Supplier",
    "pola": "Pola",
    "level": "Level (Role)",
    "bank": "Bank"
  },
  "Back Office": {
    "kas_masuk": "Kas Masuk",
    "kas_keluar": "Kas Keluar",
    "bahan_keluar": "Bahan Keluar",
    "pinjaman_karyawan": "Pinjaman Karyawan",
    "nota": "Nota",
    "poin": "Poin",
    "pengaturan_aplikasi": "Pengaturan Aplikasi",
    "history": "History"
  },
  "Laporan": {
    "penjualan": "Penjualan",
    "pembelian": "Pembelian",
    "stok": "Stok",
    "produk_rusak": "Produk Rusak",
    "pemasukan": "Pemasukan",
    "pengeluaran": "Pengeluaran",
    "pinjaman": "Pinjaman",
    "neraca": "Neraca"
  },
  "Pengaturan": { 
    "profile_page": "Profil"
  }
};

const Level: React.FC = () => {
  const [data, setData] = useState<RoleItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedItem, setSelectedItem] = useState<Partial<RoleItem>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<{ [category: string]: { [key: string]: boolean } }>({});

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    const { data: roleList, error } = await supabase
      .from('roles')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      showError('Gagal memuat data level (role).');
      setError(error.message);
    } else {
      setData(roleList || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredData = data.filter(item =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: RoleItem) => {
    setModalMode(mode);
    const initialPermissions = item?.permissions || {};
    const mergedPermissions: { [category: string]: { [key: string]: boolean } } = {};

    // Initialize all permissions to false, then merge existing ones
    for (const [category, categoryPermissions] of Object.entries(allPermissionsStructure)) {
      mergedPermissions[category] = {};
      for (const key in categoryPermissions) {
        mergedPermissions[category][key] = initialPermissions[category]?.[key] || false;
      }
    }

    setSelectedItem(item || { nama: '', permissions: {} });
    setCurrentPermissions(mergedPermissions);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem({});
    setCurrentPermissions({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSelectedItem(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (category: string, key: string, checked: boolean) => {
    setCurrentPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: checked,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah level...' : 'Menyimpan perubahan...');

    const itemToSave = {
      nama: selectedItem.nama,
      permissions: currentPermissions,
    };

    if (modalMode === 'add') {
      const { data: newRole, error } = await supabase
        .from('roles')
        .insert([itemToSave])
        .select()
        .single();

      if (error) {
        showError('Gagal menambah level: ' + error.message);
      } else {
        setData(prev => [...prev, newRole]);
        showSuccess('Level berhasil ditambahkan!');
        closeModal();
      }
    } else if (modalMode === 'edit') {
      const { data: updatedRole, error } = await supabase
        .from('roles')
        .update(itemToSave)
        .eq('id', selectedItem.id)
        .select()
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedRole.id ? updatedRole : item)));
        showSuccess('Perubahan berhasil disimpan!');
        closeModal();
      }
    }
    dismissToast(toastId);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data ini?')) {
      return;
    }
    const toastId = showLoading('Menghapus level...');
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus level: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Level berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data level...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchRoles} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Level (Role)</h1>
          <p className="text-gray-600">Kelola level akses pengguna</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Level
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari level..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{item.nama}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.nama === 'Super Admin' ? 'bg-red-100 text-red-800' :
                      item.nama === 'Admin' ? 'bg-blue-100 text-blue-800' :
                      item.nama === 'Operator' ? 'bg-green-100 text-green-800' :
                      item.nama === 'Kasir' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    } mt-1`}>
                      {item.nama}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openModal('view', item)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openModal('edit', item)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {Object.keys(item.permissions).map(category => 
                    Object.keys(item.permissions[category]).filter(key => item.permissions[category][key]).length
                  ).reduce((sum, count) => sum + count, 0)} izin aktif
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {modalMode === 'add' ? 'Tambah Level' :
                 modalMode === 'edit' ? 'Edit Level' : 'Detail Level'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="nama" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Level
                  </label>
                  <input
                    type="text"
                    id="nama"
                    name="nama"
                    value={selectedItem?.nama || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  />
                </div>
                
                {/* Permissions Section */}
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">Izin Akses Menu</h4>
                  <div className="space-y-4">
                    {Object.entries(allPermissionsStructure).map(([category, categoryPermissions]) => (
                      <div key={category} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">{category}</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(categoryPermissions).map(([key, label]) => (
                            <div key={key} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`${category}-${key}`}
                                name={`${category}-${key}`}
                                checked={currentPermissions[category]?.[key] || false}
                                onChange={(e) => handlePermissionChange(category, key, e.target.checked)}
                                disabled={modalMode === 'view'}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`${category}-${key}`} className="ml-2 block text-sm text-gray-900">
                                {label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {modalMode === 'view' ? 'Tutup' : 'Batal'}
                </button>
                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {modalMode === 'add' ? 'Tambah' : 'Simpan'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Level;