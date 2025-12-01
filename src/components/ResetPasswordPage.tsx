// src/pages/ResetPasswordPage.tsx
import React, { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError, showSuccess } from '../utils/toast';
import { useNavigate } from 'react-router-dom';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      showError('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirm) {
      showError('Konfirmasi password tidak sama.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      console.error('reset password error', error);
      showError(error.message || 'Gagal mengubah password.');
      return;
    }

    showSuccess('Password berhasil diubah. Silakan login kembali.');
    navigate('/login'); // arahkan ke halaman login
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Atur Ulang Password
        </h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Silakan masukkan password baru Anda.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Baru
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konfirmasi Password
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white font-semibold ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
