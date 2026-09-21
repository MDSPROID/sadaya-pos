-- ============================================================================
-- Login dengan USERNAME (email tetap disimpan sebagai data).
-- Jalankan sekali di Supabase Dashboard -> SQL Editor (project production).
--
-- Cara kerja: halaman login memanggil get_login_email(username) untuk
-- menukar username -> email, lalu login ke Supabase Auth memakai email itu
-- di belakang layar. User tidak perlu tahu emailnya.
-- ============================================================================

-- 1) Kolom username di profiles (kosong dulu, diisi admin lewat Master Karyawan)
alter table public.profiles
  add column if not exists username text;

-- Unik tanpa membedakan huruf besar/kecil (null boleh berkali-kali)
create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

-- Format: 3-30 karakter, huruf kecil/angka/titik/underscore/strip
alter table public.profiles
  drop constraint if exists profiles_username_format_chk;
alter table public.profiles
  add constraint profiles_username_format_chk
  check (username is null or username ~ '^[a-z0-9._-]{3,30}$');

-- 2) Fungsi tukar username -> email (dipanggil SEBELUM login, jadi boleh oleh anon)
--    Hanya mengembalikan email untuk akun yang aktif dan belum dihapus.
create or replace function public.get_login_email(p_username text)
returns text
language sql
security definer
stable
set search_path = public, auth
as $$
  select coalesce(p.email, u.email)
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(trim(p_username))
    and p.deleted_at is null
    and coalesce(p.is_active, true) = true
  limit 1;
$$;

revoke all on function public.get_login_email(text) from public;
grant execute on function public.get_login_email(text) to anon, authenticated;
