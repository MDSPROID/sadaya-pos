// src/pages/ResetPasswordPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError, showSuccess } from '../utils/toast';
import { useNavigate } from 'react-router-dom';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // STEP 1 — Ambil recovery session dari URL hash Supabase
  useEffect(() => {
    const handleRecovery = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        console.log("exchangeCodeForSession:", data, error);

        if (error) {
          showError("Token reset tidak valid atau sudah kedaluwarsa.");
        }
      }
    };
    handleRecovery();
  }, []);

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

    // STEP 2 — Update password DARAHUS setelah recovery session aktif
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      console.error("Update password error:", error);
      showError("Gagal mengubah password: " + error.message);
      return;
    }

    showSuccess("Password berhasil diperbarui. Silakan login kembali.");

    // beri waktu toast tampil sebentar
    setTimeout(() => {
      navigate('/login');
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Atur Ulang Password</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Silakan masukkan password baru Anda.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Password Baru</label>
            <input
              type="password"
              className="w-full border px-3 py-2 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Konfirmasi Password</label>
            <input
              type="password"
              className="w-full border px-3 py-2 rounded"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white font-semibold ${
              loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
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
