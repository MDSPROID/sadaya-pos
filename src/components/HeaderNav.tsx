import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, LogOut, X } from 'lucide-react';
import sidebarConfig, { SidebarMenuItem } from '../config/sidebar';
import { useSession } from './SessionContextProvider';
import { supabase } from '../integrations/supabase/client'; // For logout in mobile menu

interface HeaderNavProps {
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (isOpen: boolean) => void;
}

const HeaderNav: React.FC<HeaderNavProps> = ({ isMobileNavOpen, setIsMobileNavOpen }) => {
  const { profile } = useSession();
  const navigate = useNavigate();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [activeMenu, setActiveMenu] = useState(window.location.pathname);

  useEffect(() => {
    setActiveMenu(window.location.pathname);
  }, [window.location.pathname]);

  const hasPermission = (item: SidebarMenuItem): boolean => {
    if (profile?.role === 'Super Admin') return true;

    if (item.allowedRoles && profile?.role) {
      if (!item.allowedRoles.includes(profile.role)) {
        return false;
      }
    }

    if (item.path) {
      const pathParts = item.path.split('/');
      const categoryMap: Record<string, string> = {
        'sales': 'Transaksi',
        'master-data': 'Master',
        'back-office': 'Back Office',
        'laporan': 'Laporan',
        'pengaturan': 'Pengaturan',
        'dashboard': 'Main',
        'history-pending': 'Transaksi',
        'purchases': 'Transaksi'
      };
      const categoryKey = pathParts[2] || pathParts[1];
      const category = categoryMap[categoryKey] || '';
      const key = pathParts[3] || pathParts[1];

      if (category && key) {
        return profile?.permissions?.[category]?.[key] === true;
      }
    }
    
    if (item.children) {
      return item.children.some(child => hasPermission(child));
    }

    return false;
  };

  const toggleSubmenu = (categoryName: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileNavOpen(false); // Close mobile menu on navigation
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileNavOpen(false); // Close mobile menu
  };

  const renderMenuItem = (item: SidebarMenuItem, isMobile: boolean = false) => {
    const Icon = item.icon;
    const ValidIcon = Icon as React.ElementType;
    const isActive = activeMenu === item.path;

    if (!hasPermission(item)) {
      return null;
    }

    if (item.children) {
      const accessibleChildren = item.children.filter(child => hasPermission(child));
      if (accessibleChildren.length === 0) return null;

      const isOpen = openSubmenus[item.name];
      const isParentActiveByChild = accessibleChildren.some(child => activeMenu.startsWith(child.path || ''));

      return (
        <div key={item.name} className={isMobile ? 'w-full' : 'relative group'}>
          <button
            onClick={() => isMobile && toggleSubmenu(item.name)} // Only toggle on click for mobile
            className={`
              flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors
              ${isMobile ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-700 hover:text-blue-600'}
              ${isParentActiveByChild ? 'font-semibold text-blue-600' : ''}
            `}
          >
            <span className="flex items-center">
              {ValidIcon && <ValidIcon className="mr-2 h-5 w-5" />}
              {item.name}
            </span>
            {isMobile ? (isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronDown className="h-4 w-4" />}
          </button>
          {/* Dropdown content */}
          <div className={`
            ${isMobile ? (isOpen ? 'block pl-4 mt-1 space-y-1' : 'hidden') : 'absolute hidden group-hover:block bg-white shadow-lg rounded-lg py-2 w-48 z-50'}
          `}>
            {accessibleChildren.map(child => {
              const ChildIcon = child.icon;
              const ValidChildIcon = ChildIcon as React.ElementType;
              const isChildActive = activeMenu === child.path;
              return (
                <Link
                  key={child.path}
                  to={child.path || '#'}
                  onClick={() => handleNavigation(child.path || '#')}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    ${isChildActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  {ValidChildIcon && <ValidChildIcon className="mr-2 h-5 w-5" />}
                  {child.name}
                </Link>
              );
            })}
          </div>
        </div>
      );
    } else {
      return (
        <Link
          key={item.path}
          to={item.path || '#'}
          onClick={() => handleNavigation(item.path || '#')}
          className={`
            flex items-center px-3 py-2 rounded-lg transition-colors
            ${isMobile ? 'w-full text-gray-700 hover:bg-gray-100' : 'text-gray-700 hover:text-blue-600'}
            ${isActive ? 'font-semibold text-blue-600' : ''}
          `}
        >
          {ValidIcon && <ValidIcon className="mr-2 h-5 w-5" />}
          {item.name}
        </Link>
      );
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex flex-1 justify-center items-center space-x-4">
        {sidebarConfig.map(item => renderMenuItem(item))}
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 bg-white z-[1000] flex flex-col"> {/* Changed z-index to z-[1000] */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">Menu</h2>
            <button onClick={() => setIsMobileNavOpen(false)} className="p-2 text-gray-600 hover:text-gray-900">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sidebarConfig.map(item => renderMenuItem(item, true))}
          </nav>
          {/* Mobile Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Keluar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderNav;