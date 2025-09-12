import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';
import { Printer } from 'lucide-react';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Printer className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sadaya Printing</h2>
            <p className="text-gray-600">Masuk ke sistem</p>
          </div>

          <div className="mt-8">
            <Auth
              supabaseClient={supabase}
              providers={[]} // No third-party providers unless specified
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'hsl(210 96% 40%)', // blue-600
                      brandAccent: 'hsl(210 96% 30%)', // blue-700
                    },
                  },
                },
              }}
              theme="light"
              // redirectTo={window.location.origin + '/dashboard'} // Hapus properti ini
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;