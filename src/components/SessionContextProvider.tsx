import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

interface RoleDetails {
  nama: string;
  permissions: { [category: string]: { [key: string]: boolean } };
}

interface UserProfileDataFromDB {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  deleted_at: string | null;
  roles: RoleDetails | null;
}

interface SessionContextType {
  session: Session | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: string | null;
    permissions: { [category: string]: { [key: string]: boolean } } | null;
  } | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SessionContextType['profile']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dipakai untuk menghindari fetch profile berulang saat Supabase
    // mengirim ulang event auth (mis. TOKEN_REFRESHED) untuk user yang sama.
    const lastFetchedUserIdRef = { current: null as string | null };

    const fetchAndSetProfile = async (currentSession: Session | null) => {
      if (currentSession) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, deleted_at, roles(nama, permissions)')
          .eq('id', currentSession.user.id)
          .single<UserProfileDataFromDB>();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setProfile(null);
        } else if (profileData?.deleted_at) {
          // Akun sudah dihapus (soft delete) dari Master User Akses -> paksa keluar
          showError('Akun Anda sudah dihapus. Hubungi admin.');
          setProfile(null);
          await supabase.auth.signOut();
        } else {
          setProfile({
            first_name: profileData?.first_name || null,
            last_name: profileData?.last_name || null,
            avatar_url: profileData?.avatar_url || null,
            role: profileData?.roles?.nama || null,
            permissions: profileData?.roles?.permissions || null
          });
        }
      } else {
        setProfile(null);
      }
      lastFetchedUserIdRef.current = currentSession?.user.id ?? null;
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      fetchAndSetProfile(initialSession).finally(() => setLoading(false));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const newUserId = newSession?.user.id ?? null;
      const isUserChange = newUserId !== lastFetchedUserIdRef.current;

      setSession(newSession);

      if (isUserChange) {
        // Transisi user sesungguhnya (login/logout/ganti akun): profile lama
        // sudah tidak valid, jadi tampilkan loading sampai profile baru siap
        // agar ProtectedRoute tidak sempat mengecek permission dengan profile lama/null.
        setLoading(true);
        fetchAndSetProfile(newSession).finally(() => setLoading(false));
      }
      // Kalau user-nya sama (mis. event TOKEN_REFRESHED saat tab kembali fokus),
      // tidak perlu setLoading/fetch ulang - session di atas sudah cukup diperbarui
      // tanpa mem-blok/reset tampilan halaman.
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, profile, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};