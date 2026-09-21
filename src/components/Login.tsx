import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Printer, Eye, EyeOff, Loader2 } from 'lucide-react';

const loginErrorMessage = (err: { message?: string; status?: number } | null): string => {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Username/email atau password salah.';
  if (msg.includes('email not confirmed')) return 'Email akun belum terverifikasi. Hubungi admin.';
  if (msg.includes('rate limit') || err?.status === 429) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Tidak bisa terhubung ke server. Periksa koneksi internet.';
  return err?.message || 'Gagal masuk. Coba lagi.';
};

const Login: React.FC = () => {
  const [companyName, setCompanyName] = useState<string>('Digital Printing'); // fallback
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchCompanyName = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('nama_perusahaan')
          .limit(1)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.warn('fetch app_settings error:', error.message);
          return;
        }
        if (data?.nama_perusahaan) {
          setCompanyName(String(data.nama_perusahaan));
        }
      } catch (e: any) {
        console.warn('fetch app_settings exception:', e?.message);
      }
    };

    fetchCompanyName();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const id = identifier.trim();
    if (!id || !password) {
      setErrorMsg('Username dan password wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      let email = id;

      // Bukan email -> anggap username, tukar ke email lewat RPC (akun aktif & belum dihapus saja)
      if (!id.includes('@')) {
        const { data, error } = await supabase.rpc('get_login_email', { p_username: id.toLowerCase() });
        if (error) {
          const notReady = /could not find the function|schema cache/i.test(error.message);
          setErrorMsg(
            notReady
              ? 'Login dengan username belum aktif di server. Masuk dengan email dulu, atau hubungi admin.'
              : loginErrorMessage(error)
          );
          return;
        }
        if (!data) {
          setErrorMsg('Username/email atau password salah.');
          return;
        }
        email = String(data);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setErrorMsg(loginErrorMessage(signInError));
        return;
      }
      // Sukses: SessionContextProvider menangkap event SIGNED_IN dan ProtectedRoute mengarahkan ke dashboard.
    } catch (err: any) {
      setErrorMsg(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Printer className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{companyName}</h2>
            <p className="text-gray-600">Masuk ke sistem</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="login-identifier" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
