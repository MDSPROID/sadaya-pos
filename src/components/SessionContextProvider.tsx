import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';

interface RoleDetails {
  nama: string;
  permissions: { [category: string]: { [key: string]: boolean } };
}

interface UserProfileDataFromDB {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
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
    const fetchAndSetProfile = async (currentSession: Session | null) => {
      if (currentSession) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, roles(nama, permissions)')
          .eq('id', currentSession.user.id)
          .single<UserProfileDataFromDB>();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setProfile(null);
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
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      fetchAndSetProfile(initialSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setLoading(true);
      setSession(newSession);
      fetchAndSetProfile(newSession);
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