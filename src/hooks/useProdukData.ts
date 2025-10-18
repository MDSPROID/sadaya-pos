import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { showError } from '../utils/toast';

export interface KategoriOption {
  id: string;
  nama: string;
}

export interface SatuanOption {
  id: string;
  nama: string;
}

export interface BahanOption {
  id: string;
  nama: string;
  stok?: number
}

export interface MesinOption {
  id: string;
  nama: string;
}

export interface JenisMemberOption {
  id: string;
  nama: string;
}

export interface GrosirTier {
  qty: number;
  price: number;
}

export interface GrosirPrices {
  satuan1: {
    active: boolean;
    tiers: GrosirTier[];
  };
  satuan2: {
    active: boolean;
    tiers: GrosirTier[];
  };
}

export interface MemberPrice {
  jenis_member_id: string;
  jenis_member_nama: string;
  price: number;
}

export interface ProdukItem {
  id: string;
  nama_produk: string;
  kategori_id: string | null;
  kategori: { nama: string } | null;
  satuan_id: string | null;
  satuan: { nama: string } | null;
  bahan_id: string | null;
  bahan: { nama: string; stok: number } | null;
  quantity_bahan: number;
  use_mesin: boolean;
  mesin_details: string;
  mesin_id: string | null;
  mesin: { nama: string } | null;
  harga_pokok: number;
  harga_jual_umum: number;
  harga_jual_khusus: number;
  stok: number;
  barcode_1: string;
  barcode_2: string;
  keterangan: string;
  diskon_persen: number;
  template_order: string;
  grosir_prices: GrosirPrices;
  member_prices: MemberPrice[];
}

export const defaultGrosirPrices: GrosirPrices = {
  satuan1: {
    active: false,
    tiers: [{ qty: 1, price: 0 }, { qty: 0, price: 0 }, { qty: 0, price: 0 }],
  },
  satuan2: {
    active: false,
    tiers: [{ qty: 1, price: 0 }, { qty: 0, price: 0 }, { qty: 0, price: 0 }],
  },
};

interface UseProdukDataProps {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
}

export const useProdukData = ({ searchTerm, currentPage, pageSize }: UseProdukDataProps) => {
  const [data, setData] = useState<ProdukItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [kategoriOptions, setKategoriOptions] = useState<KategoriOption[]>([]);
  const [satuanOptions, setSatuanOptions] = useState<SatuanOption[]>([]);
  const [bahanOptions, setBahanOptions] = useState<BahanOption[]>([]);
  const [mesinOptions, setMesinOptions] = useState<MesinOption[]>([]);
  const [jenisMemberOptions, setJenisMemberOptions] = useState<JenisMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduk = useCallback(async () => {
    setLoading(true);
    setError(null);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('produk')
      .select('*, kategori(nama), satuan(nama), bahan(nama, stok), mesin(nama)', { count: 'exact' })
      .order('nama_produk', { ascending: true });

    if (searchTerm && searchTerm.trim() !== '') {
      const searchPattern = `%${searchTerm.trim()}%`;
      query = query.ilike('nama_produk', searchPattern);
    }

    query = query.range(from, to);

    const { data: produkList, error, count } = await query;

    if (error) {
      console.error('Error fetching produk:', error);
      showError('Gagal memuat data produk.');
      setError(error.message);
    } else {
      const formattedProdukList = (produkList || []).map(p => ({
        ...p,
        grosir_prices: p.grosir_prices || defaultGrosirPrices,
        member_prices: p.member_prices || [],
        kategori: p.kategori || null,
        satuan: p.satuan || null,
        bahan: p.bahan || null,
        mesin: p.mesin || null,
      }));
      setData(formattedProdukList);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [currentPage, pageSize, searchTerm]);

  const fetchKategoriOptions = useCallback(async () => {
    const { data: kategoriList, error } = await supabase
      .from('kategori')
      .select('id, nama')
      .order('nama', { ascending: true });
    if (error) {
      console.error('Error fetching kategori options:', error);
      showError('Gagal memuat opsi kategori.');
    } else {
      setKategoriOptions(kategoriList || []);
    }
  }, []);

  const fetchSatuanOptions = useCallback(async () => {
    const { data: satuanList, error } = await supabase
      .from('satuan')
      .select('id, nama')
      .order('nama', { ascending: true });
    if (error) {
      console.error('Error fetching satuan options:', error);
      showError('Gagal memuat opsi satuan.');
    } else {
      setSatuanOptions(satuanList || []);
    }
  }, []);

  const fetchBahanOptions = useCallback(async () => {
    const { data: bahanList, error } = await supabase
      .from('bahan')
      .select('id, nama, stok')
      .order('nama', { ascending: true });
    if (error) {
      console.error('Error fetching bahan options:', error);
      showError('Gagal memuat opsi bahan.');
    } else {
      setBahanOptions(bahanList || []);
    }
  }, []);

  const fetchMesinOptions = useCallback(async () => {
    const { data: mesinList, error } = await supabase
      .from('mesin')
      .select('id, nama')
      .order('nama', { ascending: true });
    if (error) {
      console.error('Error fetching mesin options:', error);
      showError('Gagal memuat opsi mesin.');
    } else {
      setMesinOptions(mesinList || []);
    }
  }, []);

  const fetchJenisMemberOptions = useCallback(async () => {
    const { data: jenisList, error } = await supabase
      .from('jenis_member')
      .select('id, nama')
      .order('nama', { ascending: true });
    if (error) {
      console.error('Error fetching jenis member options:', error);
      showError('Gagal memuat opsi jenis member.');
    } else {
      setJenisMemberOptions(jenisList || []);
    }
  }, []);

  useEffect(() => {
    fetchProduk();
    fetchKategoriOptions();
    fetchSatuanOptions();
    fetchBahanOptions();
    fetchMesinOptions();
    fetchJenisMemberOptions();
  }, [fetchProduk, fetchKategoriOptions, fetchSatuanOptions, fetchBahanOptions, fetchMesinOptions, fetchJenisMemberOptions]);

  return {
    data,
    setData,
    totalCount,
    kategoriOptions,
    fetchKategoriOptions,
    satuanOptions,
    fetchSatuanOptions,
    bahanOptions,
    fetchBahanOptions,
    mesinOptions,
    fetchMesinOptions,
    jenisMemberOptions,
    fetchJenisMemberOptions,
    loading,
    error,
    fetchProduk,
  };
};