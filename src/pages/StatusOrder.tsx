import React, { useRef, useState, useEffect } from 'react';
import StatusOrderTable from '../components/status-order/StatusOrderTable';
import { useStatusOrderData } from '../hooks/useStatusOrderData';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

/** =========================
 *  Sound Picker Utilities
 * ========================= */
type SoundOption = { label: string; url: string; builtin?: boolean };

const DEFAULT_SOUNDS: SoundOption[] = [
  { label: 'Notif 1', url: '/sounds/sound1.wav', builtin: true },
  { label: 'Notif 2', url: '/sounds/sound2.wav', builtin: true },
  { label: 'Notif 3', url: '/sounds/sound3.wav', builtin: true },
];

const LS_SOUND_URL_KEY = 'statusOrderSound';
const LS_SOUND_OPTIONS_KEY = 'statusOrderSoundOptions';

const loadSoundOptions = (): SoundOption[] => {
  try {
    const raw = localStorage.getItem(LS_SOUND_OPTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return DEFAULT_SOUNDS;
};

const saveSoundOptions = (opts: SoundOption[]) => {
  try {
    localStorage.setItem(LS_SOUND_OPTIONS_KEY, JSON.stringify(opts));
  } catch (_) {}
};

const getSavedSoundUrl = (): string | null => {
  return localStorage.getItem(LS_SOUND_URL_KEY);
};

const setSavedSoundUrl = (url: string | null) => {
  if (url && url.trim()) localStorage.setItem(LS_SOUND_URL_KEY, url.trim());
  else localStorage.removeItem(LS_SOUND_URL_KEY);
};

const findLabelForUrl = (options: SoundOption[], url: string | null) => {
  if (!url) return null;
  const found = options.find(o => o.url === url);
  return found?.label || null;
};

/** =========================
 *  Halaman Status Order
 * ========================= */
const StatusOrder: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [durationFilter, setDurationFilter] = useState('all');
  const typingTimer = useRef<number | null>(null);
  const navigate = useNavigate();

  const { data, loading, error, fetchStatusOrders, setData } = useStatusOrderData({
    durationFilter,
    searchTerm,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // filter ref (dipakai untuk realtime/polling callback)
  const filtersRef = useRef({ searchTerm: '', durationFilter: 'all' });
  useEffect(() => {
    filtersRef.current = { searchTerm, durationFilter };
  }, [searchTerm, durationFilter]);

  /* =======================
   *  Pencarian & Filter
   * ======================= */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      fetchStatusOrders({ searchTerm: value, durationFilter });
    }, 400);
  };

  const handleDurationFilterChange = (value: string) => {
    setDurationFilter(value);
    fetchStatusOrders({ searchTerm, durationFilter: value });
  };

  /* =======================
   *  Aksi baris
   * ======================= */
  const handleContinue = (orderId: string) => {
    // navigate('/dashboard/sales', { state: { loadOrderId: orderId } });
    navigate(`/dashboard/status-order/process/${orderId}`);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Yakin ingin menghapus transaksi yang siap cetak ini?')) return;

    const toastId = showLoading('Menghapus order...');
    try {
      const { data: deletedRows, error: delErr } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .select('id'); // penting untuk tahu baris terhapus (RLS-safe)

      if (delErr) throw delErr;

      const affected = Array.isArray(deletedRows) ? deletedRows.length : 0;
      if (affected === 0) {
        showError('Tidak bisa menghapus order. Anda mungkin tidak punya izin atau order tidak ditemukan.');
        return;
      }

      setData(prev => prev.filter(item => item.id !== orderId));
      setSelectedIds(prev => prev.filter(id => id !== orderId));
      showSuccess('Order berhasil dihapus.');
    } catch (err: any) {
      console.error(err);
      showError(err?.message || 'Gagal menghapus order.');
    } finally {
      dismissToast(toastId);
    }
  };

  const handleRekap = () => {
    showSuccess('Rekap Status Order diproses');
  };

  /* =======================
   *  AUDIO NOTIF (HTMLAudio)
   * ======================= */
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [soundReady, setSoundReady] = useState(false);

  const getSoundUrl = () => getSavedSoundUrl() || DEFAULT_SOUNDS[0].url;

  // Inisialisasi suara (user gesture)
  const initSound = async () => {
    try {
      const el = audioElRef.current;
      if (!el) return;

      el.src = getSoundUrl();
      el.load();
      // “Prime” agar autoplay allowed
      await el.play();
      await new Promise(r => setTimeout(r, 100));
      el.pause();
      el.currentTime = 0;
      setSoundReady(true);
      showSuccess('Notifikasi suara diaktifkan.');
    } catch (e) {
      console.warn('Init sound failed:', e);
      showError('Gagal mengaktifkan suara. Pastikan file audio bisa diakses.');
    }
  };

  const playNotifySound = async () => {
    try {
      const el = audioElRef.current;
      if (!el) return;
      el.currentTime = 0;
      await el.play();
    } catch (e) {
      console.warn('Play sound blocked:', e);
    }
  };

  // Ganti URL suara + re-init
  const applySoundUrl = async (url: string | null) => {
    setSavedSoundUrl(url);
    const el = audioElRef.current;
    if (el) {
      el.src = getSoundUrl();
      el.load();
    }
    // kalau sudah pernah di-allow, tidak perlu prime lagi, tapi aman untuk call ini:
    // setSoundReady(false);
    await initSound();
  };

  /* =====================================
   *  REALTIME + DEDUPE + POLLING FALLBACK
   * ===================================== */
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onChange = async (payload: any) => {
      const newRow = payload?.new;
      const oldRow = payload?.old;
      const id = (newRow?.id || oldRow?.id || '').toString();

      const becameReady =
        (payload.eventType === 'INSERT' && newRow?.ready_status === 'ready') ||
        (payload.eventType === 'UPDATE' &&
          newRow?.ready_status === 'ready' &&
          oldRow?.ready_status !== 'ready');

      const leftReady =
        (payload.eventType === 'DELETE' && oldRow?.ready_status === 'ready') ||
        (payload.eventType === 'UPDATE' &&
          oldRow?.ready_status === 'ready' &&
          newRow?.ready_status !== 'ready');

      if (becameReady) {
        const { searchTerm: s, durationFilter: d } = filtersRef.current;
        await fetchStatusOrders({ searchTerm: s, durationFilter: d });

        if (!notifiedIdsRef.current.has(id)) {
          notifiedIdsRef.current.add(id);
          if (notifiedIdsRef.current.size > 200) {
            const it = notifiedIdsRef.current.values();
            for (let i = 0; i < 50; i++) {
              const v = it.next();
              if (!v.done) notifiedIdsRef.current.delete(v.value);
            }
          }
          if (soundReady) await playNotifySound();
        }
      } else if (leftReady) {
        const { searchTerm: s, durationFilter: d } = filtersRef.current;
        await fetchStatusOrders({ searchTerm: s, durationFilter: d });
      }
    };

    const channel = supabase
      .channel('realtime-status-order')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, onChange)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, onChange)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, onChange)
      .subscribe();

    const pollId = window.setInterval(() => {
      const { searchTerm: s, durationFilter: d } = filtersRef.current;
      fetchStatusOrders({ searchTerm: s, durationFilter: d });
    }, 20000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(pollId);
    };
  }, [fetchStatusOrders, soundReady]);

  /* =======================
   *  SOUND PICKER (Modal)
   * ======================= */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [options, setOptions] = useState<SoundOption[]>(() => loadSoundOptions());
  const [selectedUrl, setSelectedUrl] = useState<string>(getSavedSoundUrl() || DEFAULT_SOUNDS[0].url);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    // kalau daftar kosong (mis config), reset default
    if (!options.length) {
      setOptions(DEFAULT_SOUNDS);
      saveSoundOptions(DEFAULT_SOUNDS);
    }
  }, [options.length]);

  const openPicker = () => {
    setOptions(loadSoundOptions());
    setSelectedUrl(getSavedSoundUrl() || DEFAULT_SOUNDS[0].url);
    setPickerOpen(true);
  };

  const closePicker = () => setPickerOpen(false);

  const handleAddOption = () => {
    const label = newLabel.trim();
    const url = newUrl.trim();
    if (!label || !url) {
      showError('Label dan URL harus diisi.');
      return;
    }
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (!['mp3', 'wav', 'ogg'].includes(ext)) {
      showError('Format suara harus .mp3 / .wav / .ogg');
      return;
    }
    const exists = options.some(o => o.url === url);
    if (exists) {
      showError('URL sudah ada di daftar.');
      return;
    }
    const next = [...options, { label, url, builtin: false }];
    setOptions(next);
    saveSoundOptions(next);
    setNewLabel('');
    setNewUrl('');
    showSuccess('Suara ditambahkan.');
  };

  const handleDeleteOption = (url: string) => {
    const opt = options.find(o => o.url === url);
    if (!opt) return;
    if (opt.builtin) {
      showError('Item default tidak bisa dihapus.');
      return;
    }
    const next = options.filter(o => o.url !== url);
    setOptions(next);
    saveSoundOptions(next);
    if (selectedUrl === url) {
      const fallback = getSavedSoundUrl() || DEFAULT_SOUNDS[0].url;
      setSelectedUrl(fallback);
    }
  };

  const handleResetDefault = () => {
    setOptions(DEFAULT_SOUNDS);
    saveSoundOptions(DEFAULT_SOUNDS);
    showSuccess('Daftar suara direset ke default.');
  };

  const handlePreview = async (url: string) => {
    try {
      const el = audioElRef.current;
      if (!el) return;
      el.src = url;
      el.load();
      await el.play();
    } catch (e) {
      console.warn('Preview failed:', e);
      showError('Gagal memutar preview. Cek file/URL. '+url);
    }
  };

  const handleUseSelected = async () => {
    await applySoundUrl(selectedUrl);
    setPickerOpen(false);
    const label = findLabelForUrl(options, selectedUrl) || selectedUrl;
    showSuccess(`Suara dipilih: ${label}`);
  };

  // ======= Bulk selection helpers =======
 const toggleSelect = (id: string) => {
  setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
 };
 const toggleSelectAll = (checked: boolean) => {
  if (!checked) { setSelectedIds([]); return; }
  setSelectedIds(data.map(d => d.id));
 };
 const bulkUpdate = async (toStatus: 'proses_cetak' | 'new') => {
  if (selectedIds.length === 0) return;
  const msg = toStatus === 'proses_cetak'
   ? `Set ${selectedIds.length} order ke PROSES CETAK?`
   : `Batalkan PROSES CETAK pada ${selectedIds.length} order?`;
 if (!confirm(msg)) return;
 const toastId = showLoading('Menyimpan perubahan...');
 try {
   const { data: updated, error: updErr } = await supabase
     .from('orders')
     .update({ order_status: toStatus })
     .in('id', selectedIds)
     .select('id');
   if (updErr) throw updErr;

   // refresh cepat secara lokal
   const setLocal = new Set((updated || []).map((r: any) => r.id));
   setData(prev => prev.map(row => setLocal.has(row.id) ? { ...row, order_status: toStatus } : row));
   showSuccess('Perubahan tersimpan.');
 } catch (e: any) {
   console.error(e);
   showError(e?.message || 'Gagal menyimpan perubahan.');
 } finally {
   dismissToast(toastId);
 }
 };

  /* ============ RENDER ============ */
  return (
    <div className="space-y-6">
      {/* Audio tersembunyi */}
      <audio ref={audioElRef} hidden preload="auto" />

      {/* HEADER BAR */}
      <div className="mb-4 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Status Order</h1>
          <p className="text-gray-600">Daftar order yang siap diproses (ready).</p>
        </div>

        <button
          type="button"
          onClick={initSound}
          className="ml-auto px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
          title="Klik sekali untuk mengaktifkan notifikasi suara"
        >
          Tes Notifikasi
        </button>
        <button
          type="button"
          onClick={openPicker}
          className="px-3 py-1.5 text-sm rounded-md bg-gray-200 hover:bg-gray-300"
          title="Pilih/ubah suara notifikasi"
        >
          Ubah Notifikasi
        </button>
      </div>

      {/* TABEL */}
      <StatusOrderTable
        data={data}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        durationFilter={durationFilter}
        onDurationFilterChange={handleDurationFilterChange}
        onRefresh={() => fetchStatusOrders({ searchTerm, durationFilter })}
        onContinue={handleContinue}
        onDelete={handleDelete}
        onRekap={handleRekap}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onBulkProcess={() => bulkUpdate('proses_cetak')}
        onBulkCancel={() => bulkUpdate('new')}
      />

      {/* SOUND PICKER MODAL */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Pilih Suara Notifikasi</h3>
              <button
                onClick={closePicker}
                className="px-2 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
              >
                Tutup
              </button>
            </div>

            {/* Daftar opsi */}
            <div className="max-h-64 overflow-auto border rounded-md divide-y">
              {options.map((opt) => (
                <div key={opt.url} className="flex items-center gap-3 p-3">
                  <input
                    type="radio"
                    name="sound"
                    className="h-4 w-4"
                    checked={selectedUrl === opt.url}
                    onChange={() => setSelectedUrl(opt.url)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.url}</div>
                  </div>
                  <button
                    onClick={() => handlePreview(opt.url)}
                    className="px-2 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Play
                  </button>
                  {!opt.builtin && (
                    <button
                      onClick={() => handleDeleteOption(opt.url)}
                      className="px-2 py-1 text-sm rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Tambah suara kustom */}
            <div className="mt-4 space-y-2">
              <div className="font-medium text-sm">Tambah Suara</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama/Label (mis. 'Chime Keras')"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <input
                  type="text"
                  placeholder="URL (mis. /sounds/chime.wav)"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="flex-[2] px-3 py-2 border rounded-md"
                />
                <button
                  onClick={handleAddOption}
                  className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Tambah
                </button>
              </div>
              <div className="text-xs text-gray-500">
                Tips: taruh file di <code>/public/sounds/</code> lalu isi URL-nya, contoh: <code>/sounds/namafile.wav</code>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={handleResetDefault}
                className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
              >
                Reset Default
              </button>
              <div className="space-x-2">
                <button
                  onClick={closePicker}
                  className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  onClick={handleUseSelected}
                  className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Gunakan
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default StatusOrder;
