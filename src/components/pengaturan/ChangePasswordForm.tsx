import React, { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';

const ChangePasswordForm: React.FC = () => {
  // Removed 'currentPassword' as it's not used in the form or Supabase call
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmNewPassword) {
      showError('Kata sandi baru dan konfirmasi kata sandi tidak boleh kosong.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showError('Kata sandi baru dan konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (newPassword.length < 6) {
      showError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    setLoading(true);
    const toastId = showLoading('Mengganti kata sandi...');

    try {
      // Supabase's updateUser does not require the old password for authenticated users.
      // It relies on the current session's authentication.
      const { error } = await supabase.auth.updateUser({ // Removed 'data' from destructuring
        password: newPassword,
      });

      if (error) {
        // Specific error handling for common Supabase auth errors
        if (error.message.includes('Password is too weak')) {
          showError('Kata sandi terlalu lemah. Gunakan kombinasi huruf, angka, dan simbol.');
        } else {
          showError('Gagal mengganti kata sandi: ' + error.message);
        }
      } else {
        showSuccess('Kata sandi berhasil diganti!');
        // setCurrentPassword(''); // No longer needed
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      showError('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
      dismissToast(toastId);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ganti Kata Sandi</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Supabase's updateUser does not require current password for authenticated users.
            However, if you want to enforce it for UX/security, you'd need a custom Edge Function
            or a server-side check. For now, we'll omit it from the form.
        */}
        {/* <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Kata Sandi Saat Ini
          </label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div> */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Kata Sandi Baru
          </label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Konfirmasi Kata Sandi Baru
          </label>
          <input
            type="password"
            id="confirmNewPassword"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Ganti Kata Sandi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordForm;