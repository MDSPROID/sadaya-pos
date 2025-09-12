import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import { useFormPersistence } from '../../hooks/useFormPersistence';

interface RoleOption {
  id: string;
  nama: string;
}

interface KaryawanItem {
  id: string;
  first_name: string;
  last_name: string;
  role_id: string | null;
  roles: { nama: string } | null;
  email?: string;
  password?: string;
}

const Karyawan: React.FC = () => {
  const [data, setData] = useState<KaryawanItem[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialKaryawanForm: Partial<KaryawanItem> = {
    first_name: '',
    last_name: '',
    role_id: '',
    email: '',
    password: '',
  };

  const [selectedItem, setSelectedItem, clearSelectedItem] = useFormPersistence<Partial<KaryawanItem>>({
    key: 'karyawanFormDraft',
    initialValue: initialKaryawanForm,
    enabled: modalMode === 'add',
  });

  // useEffect(() => {
  //   if (isDraftLoaded && modalMode === 'add') {
  //     showSuccess('Draft formulir Karyawan berhasil dimuat!');
  //   }
  // }, [isDraftLoaded, modalMode]);

  const fetchKaryawan = async () => {
    setLoading(true);
    setError(null);
    const { data: profilesList, error } = await supabase
      .from('profiles')
      .select('*, roles(nama)')
      .neq('roles.nama', 'Super Admin')
      .neq('roles.nama', 'User')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching karyawan:', error);
      showError('Gagal memuat data karyawan.');
      setError(error.message);
    } else {
      setData(profilesList || []);
    }
    setLoading(false);
  };

  const fetchRoleOptions = async () => {
    const { data: rolesList, error } = await supabase
      .from('roles')
      .select('id, nama')
      .neq('nama', 'Super Admin')
      .neq('nama', 'User')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error fetching role options:', error);
      showError('Gagal memuat opsi jabatan.');
    } else {
      setRoleOptions(rolesList || []);
    }
  };

  useEffect(() => {
    fetchKaryawan();
    fetchRoleOptions();
  }, []);

  const filteredData = data.filter(item =>
    (item.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (item.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (item.roles?.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

  const openModal = (mode: 'add' | 'edit' | 'view', item?: KaryawanItem) => {
    setModalMode(mode);
    if (mode === 'add') {
      setSelectedItem(initialKaryawanForm);
    } else {
      setSelectedItem(item || {});
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem({});
    clearSelectedItem();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSelectedItem(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = showLoading(modalMode === 'add' ? 'Menambah karyawan...' : 'Menyimpan perubahan...');

    if (modalMode === 'add') {
      const { email, password, first_name, last_name, role_id } = selectedItem;

      if (!email || !password || !first_name || !role_id) {
        showError('Email, Password, Nama Depan, dan Jabatan harus diisi.');
        dismissToast(toastId);
        return;
      }

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name,
            last_name,
            role_id,
          },
        },
      });

      if (authError) {
        showError('Gagal menambah karyawan: ' + authError.message);
      } else {
        showSuccess('Karyawan berhasil ditambahkan! Akun dibuat.');
        closeModal();
        fetchKaryawan();
      }
    } else if (modalMode === 'edit') {
      const { roles, email, password, ...itemToSave } = selectedItem;
      const { data: updatedKaryawan, error } = await supabase
        .from('profiles')
        .update(itemToSave)
        .eq('id', selectedItem.id)
        .select('*, roles(nama)')
        .single();

      if (error) {
        showError('Gagal menyimpan perubahan: ' + error.message);
      } else {
        setData(prev => prev.map(item => (item.id === updatedKaryawan.id ? updatedKaryawan : item)));
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
    const toastId = showLoading('Menghapus karyawan...');
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Gagal menghapus karyawan: ' + error.message);
    } else {
      setData(data.filter(item => item.id !== id));
      showSuccess('Karyawan berhasil dihapus!');
    }
    dismissToast(toastId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Memuat data karyawan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <p>Error: {error}</p>
        <button onClick={fetchKaryawan} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Master Karyawan</h1>
          <p className="text-gray-600">Kelola data karyawan</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Tambah Karyawan
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Cari karyawan..."
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
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-lg">
                  {item.first_name?.charAt(0) || ''}{item.last_name?.charAt(0) || ''}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{item.first_name} {item.last_name}</h3>
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
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 mb-3">
                  {item.roles?.nama || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {modalMode === 'add' ? 'Tambah Karyawan' :
                 modalMode === 'edit' ? 'Edit Karyawan' : 'Detail Karyawan'}
              </h3>
              
              <div className="space-y-4">
                {modalMode === 'add' && (
                  <>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={selectedItem?.email || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Kata Sandi
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={selectedItem?.password || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Depan
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={selectedItem?.first_name || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Belakang
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={selectedItem?.last_name || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label htmlFor="role_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Jabatan
                  </label>
                  <select
                    id="role_id"
                    name="role_id"
                    value={selectedItem?.role_id || ''}
                    onChange={handleChange}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    required
                  >
                    <option value="">Pilih Jabatan</option>
                    {roleOptions.map(role => (
                      <option key={role.id} value={role.id}>{role.nama}</option>
                    ))}
                  </select>
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

export default Karyawan;