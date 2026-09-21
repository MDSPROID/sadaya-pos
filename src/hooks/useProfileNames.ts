import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

// Cache modul: nama profil jarang berubah, tidak perlu di-fetch ulang tiap halaman/navigasi
const nameCache: Record<string, string> = {};

const joinName = (p: { first_name?: string | null; last_name?: string | null }) =>
  [p.first_name, p.last_name].map(s => String(s ?? '').trim()).filter(Boolean).join(' ');

/** Peta id profil -> nama lengkap untuk kumpulan id (di-fetch sekali per id, per-chunk 200). */
export const useProfileNames = (ids: string[]) => {
  const [version, setVersion] = useState(0);
  const key = useMemo(() => Array.from(new Set(ids.filter(Boolean))).sort().join(','), [ids]);

  useEffect(() => {
    const missing = key ? key.split(',').filter(id => !(id in nameCache)) : [];
    if (missing.length === 0) return;
    let cancelled = false;

    (async () => {
      for (let i = 0; i < missing.length; i += 200) {
        const chunk = missing.slice(i, i + 200);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', chunk);
        if (error) {
          console.error('profiles lookup error:', error);
          continue;
        }
        (data || []).forEach((p: any) => { nameCache[String(p.id)] = joinName(p); });
        // id yang tidak ditemukan tetap ditandai agar tidak di-fetch berulang
        chunk.forEach(id => { if (!(id in nameCache)) nameCache[id] = ''; });
      }
      if (!cancelled) setVersion(v => v + 1);
    })();

    return () => { cancelled = true; };
  }, [key]);

  return useMemo(() => {
    const out: Record<string, string> = {};
    if (key) key.split(',').forEach(id => { out[id] = nameCache[id] ?? ''; });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);
};
