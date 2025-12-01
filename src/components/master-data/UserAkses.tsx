import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, RefreshCw, Shield, Mail } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import { indoAuthError } from '../../utils/translateAuthError';

interface RoleOption {
  id: string;
  nama: string;
}

interface UserAccessItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role_id: string | null;
  roles: { nama: string } | null;
  is_active: boolean | null;
}

interface EmployeeOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role_id: string | null;
  role_name: string | null;
  is_active: boolean | null;
}

const UserAkses: React.FC = () => {
    const [data, setData] = useState<UserAccessItem[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    const [form, setForm] = useState<{
        profile_id: string;
        password: string;
        is_active: string;
        }>({
        profile_id: '',
        password: '',
        is_active: 'true',
    });

    const resetForm = () =>
    setForm({
        profile_id: '',
        password: '',
        is_active: 'true',
    });

    const selectedEmployee = useMemo(
        () => employees.find(e => e.id === form.profile_id) || null,
        [employees, form.profile_id]
    );

    // === Load data user akses (profiles + roles) ===
    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        const { data: profilesList, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, is_active, role_id, roles(nama)')
        .neq('roles.nama', 'User') // kalau mau semua role, hapus baris ini
        .order('first_name', { ascending: true });

        if (error) {
            console.error('Error fetching user akses:', error);
            showError('Gagal memuat data user akses.');
            setError(error.message);
        } else {
            const normalizedUsers: UserAccessItem[] = (profilesList || []).map((r: any) => ({
                id: r.id,
                first_name: r.first_name,
                last_name: r.last_name,
                email: r.email ?? null,
                is_active: r.is_active,
                role_id: r.role_id,
                roles: Array.isArray(r.roles) ? (r.roles[0] ?? null) : (r.roles ?? null),
            }));

            const employeeOpts: EmployeeOption[] = (profilesList || []).map((r: any) => ({
                id: r.id,
                first_name: r.first_name,
                last_name: r.last_name,
                email: r.email ?? null,
                role_id: r.role_id ?? null,
                role_name: Array.isArray(r.roles) ? (r.roles[0]?.nama ?? null) : (r.roles?.nama ?? null),
                is_active: r.is_active,
            }));

            setData(normalizedUsers);
            setEmployees(employeeOpts);
        }
        setLoading(false);
    };

    // === Load pilihan role ===
    const fetchRoleOptions = async () => {
        const { data: rolesList, error } = await supabase
        .from('roles')
        .select('id, nama')
        .neq('nama', 'User')
        .order('nama', { ascending: true });

        if (error) {
        console.error('Error fetching roles:', error);
        showError('Gagal memuat daftar role.');
        } else {
        setRoleOptions(rolesList || []);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchRoleOptions();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    // === Tambah user akses baru (buat akun ke Supabase Auth) ===
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        const { profile_id, password, is_active } = form;
        const toastId = showLoading('Membuat user akses...');

        if (!profile_id || !password) {
            showError('Karyawan dan Password wajib diisi.');
            dismissToast(toastId);
            return;
        }

        const emp = employees.find(e => e.id === profile_id);

        if (!emp) {
            showError('Data karyawan tidak ditemukan.');
            dismissToast(toastId);
            return;
        }

        if (!emp.email) {
            showError('Email karyawan belum diisi. Silakan isi dulu di Master Data Karyawan.');
            dismissToast(toastId);
            return;
        }

        if (!emp.role_id) {
            showError('Role karyawan belum diatur. Silakan atur dulu di Master Data Karyawan / Level.');
            dismissToast(toastId);
            return;
        }

        const email = emp.email;
        const first_name = emp.first_name || '';
        const last_name = emp.last_name || '';
        const role_id = emp.role_id;

        // === CEK: karyawan tidak boleh punya lebih dari 1 akun (berdasarkan email) ===
        const already = data.some(
            u => u.email && u.email.toLowerCase() === email.toLowerCase()
        );
        if (already) {
            showError('Karyawan ini sudah memiliki akun akses (email sudah terdaftar).');
            dismissToast(toastId);
            return;
        }

        try {
            // 1) Buat user di Supabase Auth
            const { data: signUpRes, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                first_name,
                last_name,
                },
            },
            });

            if (authError) {
            showError(indoAuthError(authError));
            return;
            }

            const userId = signUpRes?.user?.id;
            if (!userId) {
            showError('Gagal membuat user akses: ID user tidak ditemukan.');
            return;
            }

            // 2) Update profil di tabel profiles untuk user baru
            const { error: profileError } = await supabase
            .from('profiles')
            .update({
                first_name,
                last_name,
                email,
                role_id,
                is_active: is_active === 'true',
            })
            .eq('id', userId);

            if (profileError) {
            console.error(profileError);
            showError('User dibuat, tapi gagal menyimpan data profil.');
            return;
            }

            showSuccess('User akses berhasil dibuat!');
            resetForm();
            setShowModal(false);
            fetchUsers();
        } catch (err: any) {
            console.error(err);
            showError(err.message || 'Terjadi kesalahan saat membuat user akses.');
        } finally {
            dismissToast(toastId);
        }
    };

    // === Aktif / nonaktifkan akses (ubah profiles.is_active) ===
    const handleToggleActive = async (user: UserAccessItem) => {
        const newVal = !(user.is_active ?? true);
        const confirmMsg = newVal
        ? `Aktifkan akses untuk ${user.first_name || ''} ${user.last_name || ''}?`
        : `Nonaktifkan akses untuk ${user.first_name || ''} ${user.last_name || ''}?`;

        if (!confirm(confirmMsg)) return;

        const toastId = showLoading('Menyimpan perubahan status akses...');

        try {
        const { data: updated, error } = await supabase
            .from('profiles')
            .update({ is_active: newVal })
            .eq('id', user.id)
            .select('id, first_name, last_name, email, is_active, role_id, roles(nama)')
            .single();

        if (error) {
            showError('Gagal mengubah status akses: ' + error.message);
            return;
        }

        // 🔧 NORMALISASI roles untuk hasil update
        const normalized: UserAccessItem = {
            id: updated.id,
            first_name: updated.first_name,
            last_name: updated.last_name,
            email: updated.email,
            is_active: updated.is_active,
            role_id: updated.role_id,
            roles: Array.isArray(updated.roles) ? (updated.roles[0] ?? null) : (updated.roles ?? null),
        };

        setData(prev =>
            prev.map(row => (row.id === normalized.id ? normalized : row))
        );
        
        showSuccess('Status akses berhasil diperbarui.');
        } catch (err: any) {
        console.error(err);
        showError(err.message || 'Terjadi kesalahan saat mengubah status akses.');
        } finally {
        dismissToast(toastId);
        }
    };

    // === Kirim email reset password ===
    const handleResetPassword = async (user: UserAccessItem) => {
        if (!user.email) {
        showError('User ini belum memiliki email login.');
        return;
        }

        const ok = confirm(
        `Kirim email reset password ke ${user.email}?\n\nPastikan pengaturan SMTP sudah benar.`
        );
        if (!ok) return;

        const toastId = showLoading('Mengirim email reset password...');

        try {
        const { error } = 
        await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: 'https://sadayaprinting.com/auth/reset-password',
        });
        if (error) {
            showError('Gagal mengirim email reset password: ' + error.message);
            return;
        }
        showSuccess('Email reset password telah dikirim.');
        } catch (err: any) {
        console.error(err);
        showError(err.message || 'Terjadi kesalahan saat mengirim reset password.');
        } finally {
        dismissToast(toastId);
        }
    };

    // === Filter pencarian ===
    const filtered = data.filter(item => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        const name = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
        const email = (item.email || '').toLowerCase();
        const role = (item.roles?.nama || '').toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q);
    });

    if (loading && !data.length) {
        return (
        <div className="flex justify-center items-center h-64">
            <p className="text-gray-600">Memuat data user akses...</p>
        </div>
        );
    }

    if (error && !data.length) {
        return (
        <div className="text-center p-4 text-red-600">
            <p>Error: {error}</p>
            <button
            onClick={fetchUsers}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
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
          <h1 className="text-2xl font-bold text-gray-900">Master User Akses</h1>
          <p className="text-gray-600">Kelola akun login untuk karyawan.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Tambah User Akses
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Cari nama, email, atau role..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                  Tidak ada data user akses.
                </td>
              </tr>
            ) : (
              filtered.map((user, idx) => {
                const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || '-';
                const statusActive = user.is_active ?? true;
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {user.email || <span className="italic text-gray-400">Belum diisi</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.roles?.nama || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          statusActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {statusActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => handleToggleActive(user)}
                            className={
                              `px-2 py-1 text-xs rounded font-medium transition-colors ` +
                              (statusActive
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                              )
                            }
                          >
                            {statusActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="px-2 py-1 text-xs border border-blue-500 text-blue-600 rounded hover:bg-blue-50 flex items-center gap-1"
                        >
                          <Shield className="h-3 w-3" />
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah User */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Tambah User Akses</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
                {/* Pilih karyawan */}
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Karyawan *
                </label>
                <select
                    name="profile_id"
                    value={form.profile_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                >
                    <option value="">Pilih Karyawan</option>
                    {employees.map(emp => {
                    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '(Tanpa Nama)';
                    return (
                        <option key={emp.id} value={emp.id}>
                        {name} {emp.role_name ? `- ${emp.role_name}` : ''}
                        </option>
                    );
                    })}
                </select>

                {selectedEmployee && (
                    <div className="mt-3 text-xs text-gray-600 border border-gray-200 rounded-md p-2 bg-gray-50 space-y-1">
                    <div>
                        <span className="font-medium">Nama:</span>{' '}
                        {`${selectedEmployee.first_name || ''} ${selectedEmployee.last_name || ''}`.trim() || '-'}
                    </div>
                    <div>
                        <span className="font-medium">Email:</span>{' '}
                        {selectedEmployee.email || (
                        <span className="text-red-500">
                            belum diisi (lengkapi di Master Data Karyawan)
                        </span>
                        )}
                    </div>
                    <div>
                        <span className="font-medium">Role:</span>{' '}
                        {selectedEmployee.role_name || '-'}
                    </div>
                    </div>
                )}
                </div>

                {/* Password */}
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Awal *
                </label>
                <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                />
                <p className="mt-1 text-xs text-gray-500">
                    User dapat mengubah password sendiri melalui fitur lupa password.
                </p>
                </div>

                {/* Status akses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status Akses
                    </label>
                    <select
                    name="is_active"
                    value={form.is_active}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                    </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Simpan User
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
};

export default UserAkses;
