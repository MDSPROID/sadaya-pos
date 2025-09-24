export const isKasirOrSuperAdmin = (role?: string | null) =>
    role === 'Kasir' || role === 'Super Admin';
  