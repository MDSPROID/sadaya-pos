import React, { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';
import { Printer } from 'lucide-react';

const Login: React.FC = () => {
  const [companyName, setCompanyName] = useState<string>('Sadaya Printing'); // fallback

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

          {/* CSS tambahan untuk menyembunyikan footer/link yang tersisa */}
          <style>{`
            /* Versi class lama/library lama */
            .sbui-auth .sbui-form__footer { display: none !important; }
            .sbui-auth a { display: none !important; }

            /* Versi class baru/library baru */
            .supabase-auth-ui_ui-auth div[class*="footer"] { display: none !important; }
            .supabase-auth-ui_ui-anchor { display: none !important; }
            .supabase-auth-ui_ui-divider { display: none !important; }
          `}</style>

          <div className="mt-8">
            <Auth
              supabaseClient={supabase}
              providers={[]}
              appearance={{
                theme: ThemeSupa,
                className: {
                  anchor: 'hidden',
                  divider: 'hidden',
                },
                variables: {
                  default: {
                    colors: {
                      brand: 'hsl(210 96% 40%)',
                      brandAccent: 'hsl(210 96% 30%)',
                    },
                  },
                },
              }}
              theme="light"
              view="sign_in"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
