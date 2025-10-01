import React, { useEffect, useState } from 'react';
import { LogOut, Menu, Printer } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import HeaderNav from './HeaderNav';

interface HeaderProps {
  user: {
    first_name: string | null;
    last_name: string | null;
    role: string | null;
  } | null;
  onLogout: () => void;
  onMenuToggle: () => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (isOpen: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onMenuToggle, isMobileNavOpen, setIsMobileNavOpen }) => {
  const [companyName, setCompanyName] = useState<string>('Digital Printing'); // fallback

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
          // silent fallback
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <header className="bg-white shadow-sm p-4 flex items-center justify-between relative z-10">
      {/* Logo/Title */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Printer className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{companyName}</h1>
          <p className="text-sm text-gray-500">POS System</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 justify-center">
        <HeaderNav isMobileNavOpen={isMobileNavOpen} setIsMobileNavOpen={setIsMobileNavOpen} />
      </div>

      {/* User Info & Logout */}
      <div className="flex items-center space-x-4">
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900">
            Halo, {user?.first_name || 'Pengguna'}!
          </p>
          <p className="text-xs text-gray-500">{user?.role || 'Guest'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Keluar
        </button>
        {/* Mobile Menu Toggle */}
        <button onClick={onMenuToggle} className="lg:hidden p-2 text-gray-600 hover:text-gray-900">
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </header>
  );
};

export default Header;
