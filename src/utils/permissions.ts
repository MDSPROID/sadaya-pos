// Samakan dengan bentuk profile dari useSession()
export type UserProfile = {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
    // JSON bertingkat: kategori → item → boolean
    permissions?: Record<string, boolean | Record<string, boolean>> | null;
    // Kalau suatu saat ada id, tetap aman:
    id?: string | null;
    // Izinkan properti lain agar fleksibel
    [k: string]: any;
  };
  
  const SUPER_ROLES = new Set(['Super Admin']); // tambah role lain jika perlu bypass
  
  export function hasPermissionPath(
    profile: UserProfile | null | undefined,
    path: string | string[]
  ): boolean {
    if (!profile) return false;
  
    if (profile.role && SUPER_ROLES.has(profile.role)) return true;
  
    const perms = (profile.permissions ?? {}) as Record<string, any>;
    const parts = Array.isArray(path) ? path : path.split('.');
  
    let node: any = perms;
    for (const key of parts) {
      if (
        !node ||
        typeof node !== 'object' ||
        !Object.prototype.hasOwnProperty.call(node, key)
      ) {
        return false;
      }
      node = node[key];
    }
  
    // nilai leaf harus true
    return node === true;
  }
  