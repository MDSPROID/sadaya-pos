import React, { useRef, useState, useEffect } from 'react';
import StatusOrderTable from '../components/status-order/StatusOrderTable';
import { useStatusOrderData } from '../hooks/useStatusOrderData';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type SoundOption = { label: string; url: string; builtin?: boolean };

const base = (import.meta as any)?.env?.BASE_URL || '/';
const withBase = (p: string) =>
  (base.endsWith('/') ? base.slice(0, -1) : base) + p;

const DEFAULT_SOUNDS: SoundOption[] = [
  { label: 'Notif 1', url: withBase('/sounds/sound1.mp3'), builtin: true },
  { label: 'Notif 2', url: withBase('/sounds/sound2.mp3'), builtin: true },
  { label: 'Notif 3', url: withBase('/sounds/sound3.mp3'), builtin: true },
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

const todayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/* ====== Web AudioContext global (boleh di luar komponen) ====== */
let globalAudioCtx: AudioContext | null = null;
let globalAudioBuffer: AudioBuffer | null = null;
let globalKeepAliveSrc: OscillatorNode | null = null;
let globalKeepAliveGain: GainNode | null = null;
let globalKeepAliveTimer: number | null = null;

async function loadAudioBuffer(url: string) {
  if (!globalAudioCtx) globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const res = await fetch(url, { cache: 'force-cache' });
  const arrBuf = await res.arrayBuffer();
  return await globalAudioCtx.decodeAudioData(arrBuf);
}

function startKeepAlive() {
  if (!globalAudioCtx) return;
  if (globalKeepAliveSrc && globalKeepAliveGain) return;

  const ctx = globalAudioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.000001; // hampir senyap
  osc.frequency.value = 20;
  osc.connect(gain).connect(ctx.destination);
  osc.start();

  globalKeepAliveSrc = osc;
  globalKeepAliveGain = gain;

  if (globalKeepAliveTimer) window.clearInterval(globalKeepAliveTimer);
  globalKeepAliveTimer = window.setInterval(async () => {
    try { if (ctx.state !== 'running') await ctx.resume(); } catch {}
  }, 25000);
}

function stopKeepAlive() {
  if (globalKeepAliveTimer) { window.clearInterval(globalKeepAliveTimer); globalKeepAliveTimer = null; }
  try { globalKeepAliveSrc?.stop(); } catch {}
  try { globalKeepAliveSrc?.disconnect(); } catch {}
  try { globalKeepAliveGain?.disconnect(); } catch {}
  globalKeepAliveSrc = null;
  globalKeepAliveGain = null;
}

async function ensureAudioRunning() {
  if (!globalAudioCtx) return;
  if (globalAudioCtx.state !== 'running') {
    try { await globalAudioCtx.resume(); } catch {}
  }
}

async function playGlobalBuffer() {
  if (!globalAudioCtx || !globalAudioBuffer) return;
  const src = globalAudioCtx.createBufferSource();
  src.buffer = globalAudioBuffer;
  src.connect(globalAudioCtx.destination);
  src.start(0);
}

/* ========================= Komponen ========================= */
const StatusOrder: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>(todayStr());
  const [endDate, setEndDate] = useState<string>(todayStr());
  const [statusFilter, setStatusFilter] =
    useState<'all' | 'new' | 'proses_cetak' | 'siap_ambil'>('all');

  const typingTimer = useRef<number | null>(null);
  const navigate = useNavigate();

  const { data, loading, error, fetchStatusOrders, setData } = useStatusOrderData({
    startDate,
    endDate,
    searchTerm,
    statusFilter,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /* ===================== Suara Notifikasi ===================== */
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [soundReady, setSoundReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [options, setOptions] = useState<SoundOption[]>(() => loadSoundOptions());
  const [selectedUrl, setSelectedUrl] = useState<string>(getSavedSoundUrl() || DEFAULT_SOUNDS[0].url);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // guard agar listener visibility tidak didaftarkan berulang
  const visListenerAddedRef = useRef(false);
  // penahan bunyi dari efek [data] (pakai timestamp, tidak tergantung setTimeout)
  const suppressUntilRef = useRef<number>(0);
  // throttle sederhana
  const lastSoundAtRef = useRef<number>(0);

  const getSoundUrl = () => getSavedSoundUrl() || DEFAULT_SOUNDS[0].url;

  const initSound = async () => {
    try {
      const url = getSoundUrl();
      if (!globalAudioCtx) globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      globalAudioBuffer = await loadAudioBuffer(url);
      await globalAudioCtx.resume();

      startKeepAlive();

      const onVis = async () => { await ensureAudioRunning(); };
      if (!visListenerAddedRef.current) {
        document.addEventListener('visibilitychange', onVis, { passive: true });
        visListenerAddedRef.current = true;
      }

      setSoundReady(true);
      showSuccess('Tes notifikasi suara aktif. Akan bunyi meski tab tidak aktif.');
    } catch (e) {
      console.warn('Init sound failed:', e);
      showError('Gagal mengaktifkan suara. Pastikan file audio bisa diakses.');
    }
  };

  const safePlayNotify = async () => {
    try {
      const now = Date.now();
      if (now - lastSoundAtRef.current < 500) return; // throttle 0.5s
      if (!soundReady) {
        // setelah unlock pertama, init ulang aman dipanggil
        await initSound();
      }
      await ensureAudioRunning();
      await playGlobalBuffer();
      lastSoundAtRef.current = now;
    } catch (e) {
      console.warn('safePlayNotify failed', e);
    }
  };

  const playNotifySound = async () => {
    try {
      await ensureAudioRunning();
      await playGlobalBuffer();
      lastSoundAtRef.current = Date.now();
    } catch (e) {
      console.warn('Play sound blocked:', e);
    }
  };

  const applySoundUrl = async (url: string | null) => {
    setSavedSoundUrl(url);
    await initSound(); // reload buffer + resume + keepAlive
  };

  useEffect(() => {
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
      showError('Gagal memutar preview. Cek file/URL. ' + url);
    }
  };

  const handleUseSelected = async () => {
    await applySoundUrl(selectedUrl);
    setPickerOpen(false);
    const label = findLabelForUrl(options, selectedUrl) || selectedUrl;
    showSuccess(`Suara dipilih: ${label}`);
  };

  /* ============== FILTER STATE utk realtime/polling ============== */
  const filtersRef = useRef({
    searchTerm: '',
    startDate: todayStr(),
    endDate: todayStr(),
    statusFilter: 'all' as 'all' | 'new' | 'proses_cetak' | 'siap_ambil',
  });
  useEffect(() => {
    filtersRef.current = { searchTerm, startDate, endDate, statusFilter };
  }, [searchTerm, startDate, endDate, statusFilter]);

  /* ======================= Pencarian & Filter ======================= */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      fetchStatusOrders({ searchTerm: value, startDate, endDate, statusFilter });
    }, 400);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    const fixedEnd = endDate && endDate < value ? value : endDate;
    if (fixedEnd !== endDate) setEndDate(fixedEnd);
    fetchStatusOrders({ searchTerm, startDate: value, endDate: fixedEnd, statusFilter });
  };

  const handleEndDateChange = (value: string) => {
    const fixedStart = startDate && value < startDate ? value : startDate;
    if (fixedStart !== startDate) setStartDate(fixedStart);
    setEndDate(value);
    fetchStatusOrders({ searchTerm, startDate: fixedStart, endDate: value, statusFilter });
  };

  const handleStatusFilterChange = (value: 'all' | 'new' | 'proses_cetak' | 'siap_ambil') => {
    setStatusFilter(value);
    fetchStatusOrders({ searchTerm, startDate, endDate, statusFilter: value });
  };

  /* ============================ Aksi baris ============================ */
  const handleContinue = (orderId: string) => {
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
        .select('id');

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

  /* ============================== BULK ============================== */
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
      : `Batalkan PROSES CETAK pada ${selectedIds.length} order (kembali SIAP CETAK)?`;
    if (!confirm(msg)) return;

    const toastId = showLoading('Menyimpan perubahan...');
    try {
      const { data: updated, error: updErr } = await supabase
        .from('orders')
        .update({ order_status: toStatus })
        .in('id', selectedIds)
        .select('id');
      if (updErr) throw updErr;

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

  /* ============ DETEKSI ID BARU SAAT DATA BERUBAH (fallback beep) ============ */
  const prevIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedRef = useRef(false);

  // auto-unlock audio via gesture pertama (kalau user belum klik "Tes Notifikasi")
  useEffect(() => {
    if (soundReady) return;
    const handler = () => { initSound().catch(() => {}); };
    window.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [soundReady]);

  // watchdog resume AudioContext tiap 15 detik (ringan)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (globalAudioCtx && globalAudioCtx.state !== 'running') {
        globalAudioCtx.resume().catch(() => {});
      }
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const currIds = new Set((data || []).map(d => d.id));
    const prevIds = prevIdsRef.current;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevIdsRef.current = currIds;
      return;
    }

    let hasNew = false;
    for (const id of currIds) {
      if (!prevIds.has(id)) { hasNew = true; break; }
    }

    prevIdsRef.current = currIds;

    // hormati suppress berbasis waktu (agar tidak double-beep setelah refresh dari Realtime)
    const nowPerf = performance.now();
    if (hasNew && soundReady && nowPerf >= suppressUntilRef.current) {
      playNotifySound();
    }
  }, [data, soundReady]);

  /* =========================== REALTIME + POLLING =========================== */
  useEffect(() => {
    const refresh = async () => {
      const { searchTerm: s, startDate: sd, endDate: ed, statusFilter: st } = filtersRef.current;
      await fetchStatusOrders({ searchTerm: s, startDate: sd, endDate: ed, statusFilter: st });
    };

    const channel = supabase
      .channel('realtime-status-order')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async () => {
        // set suppress selama 2 detik (pakai timestamp, tidak bergantung setTimeout)
        suppressUntilRef.current = performance.now() + 2000;
        await ensureAudioRunning();
        await safePlayNotify(); // bunyi cepat
        await refresh();        // sinkronkan data table
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, async () => {
        await ensureAudioRunning();
        await refresh();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, async () => {
        await ensureAudioRunning();
        await refresh();
      })
      .subscribe();

    // polling sebagai jaring pengaman
    const pollId = window.setInterval(() => {
      refresh();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(pollId);
    };
  }, [fetchStatusOrders]);

  /* ================================ RENDER ================================ */
  return (
    <div className="space-y-6">
      {/* Audio element */}
      <audio ref={audioElRef} hidden preload="auto" playsInline />

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

      <StatusOrderTable
        data={data}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onRefresh={() => fetchStatusOrders({ searchTerm, startDate, endDate, statusFilter })}
        onContinue={handleContinue}
        onDelete={handleDelete}
        onRekap={() => showSuccess('Rekap Status Order diproses')}
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
            </div>

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

            <div className="hidden mt-4 space-y-2">
              {/* form tambah suara (opsional) */}
              {/* <input value={newLabel} onChange={(e)=>setNewLabel(e.target.value)} />
                  <input value={newUrl} onChange={(e)=>setNewUrl(e.target.value)} />
                  <button onClick={handleAddOption}>Tambah</button> */}
            </div>

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
