// utils/translateAuthError.ts
import type { AuthError } from '@supabase/supabase-js';

export function indoAuthError(err: unknown): string {
  const e = err as Partial<AuthError> & { status?: number; message?: string };
  const msg = (e?.message || '').toLowerCase();

  // Pola umum dari GoTrue / Supabase Auth
  if (msg.includes('user already registered') || msg.includes('already registered')) {
    return 'Gagal menambah karyawan: email sudah terdaftar.';
  }
  if (msg.includes('invalid email')) {
    return 'Gagal menambah karyawan: format email tidak valid.';
  }
  if (msg.includes('password should be at least')) {
    // contoh asli: "Password should be at least 6 characters"
    const angka = msg.match(/\d+/)?.[0];
    return `Gagal menambah karyawan: kata sandi minimal ${angka ?? 'beberapa'} karakter.`;
  }
  if (msg.includes('password too weak') || msg.includes('weak password')) {
    return 'Gagal menambah karyawan: kata sandi terlalu lemah.';
  }
  if (msg.includes('signup is disabled') || msg.includes('signups not allowed')) {
    return 'Gagal menambah karyawan: pendaftaran akun sedang dinonaktifkan.';
  }
  if (msg.includes('rate limit') || e.status === 429) {
    return 'Gagal menambah karyawan: terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  }
  if (msg.includes('invalid api key') || msg.includes('invalid jwt')) {
    return 'Gagal menambah karyawan: sesi tidak valid. Silakan masuk ulang.';
  }
  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return 'Gagal menambah karyawan: email belum terverifikasi.';
  }
  if (e.status === 400) {
    return 'Gagal menambah karyawan: data yang dikirim tidak valid.';
  }
  if (e.status === 401) {
    return 'Gagal menambah karyawan: tidak berizin. Silakan masuk ulang.';
  }
  if (e.status === 422) {
    return 'Gagal menambah karyawan: data tidak dapat diproses (periksa isian Anda).';
  }
  if (e.status && e.status >= 500) {
    return 'Gagal menambah karyawan: kesalahan server. Coba lagi nanti.';
  }

  // Fallback: tampilkan pesan asli kalau ada
  return `${e?.message}`;
}
