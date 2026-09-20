-- ============================================================================
-- Reset password user langsung dari aplikasi (tanpa email).
-- Jalankan sekali di Supabase Dashboard -> SQL Editor (project production).
--
-- Keamanan:
--  - Hanya bisa dipanggil user yang sudah login (authenticated).
--  - Di dalam fungsi dicek lagi: pemanggil harus role "Super Admin" atau
--    punya permission Master.user_akses = true (sama seperti akses menu ini).
--  - Password di-hash dengan bcrypt (pgcrypto), sama seperti yang dipakai Supabase Auth.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_set_user_password(
  target_user_id uuid,
  new_password   text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  caller_role_name text;
  caller_perms     jsonb;
  allowed          boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Harus login.';
  end if;

  select r.nama, r.permissions
    into caller_role_name, caller_perms
  from public.profiles p
  left join public.roles r on r.id = p.role_id
  where p.id = auth.uid();

  if caller_role_name = 'Super Admin' then
    allowed := true;
  elsif coalesce((caller_perms -> 'Master' ->> 'user_akses')::boolean, false) then
    allowed := true;
  end if;

  if not allowed then
    raise exception 'Anda tidak memiliki izin untuk mereset password user.';
  end if;

  if new_password is null or length(new_password) < 6 then
    raise exception 'Password minimal 6 karakter.';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at         = now()
   where id = target_user_id;

  if not found then
    raise exception 'User tidak ditemukan.';
  end if;
end;
$$;

revoke all on function public.admin_set_user_password(uuid, text) from public;
grant execute on function public.admin_set_user_password(uuid, text) to authenticated;
