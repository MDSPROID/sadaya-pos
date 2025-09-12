import { showError, showSuccess } from './toast';

const PRINT_AGENT_URL = 'http://localhost:8080/print-nota'; // URL agen lokal Anda

interface NotaItem {
  nama: string;
  qty: number;
  unit_price: number; // Tambahkan unit_price
  subtotal: number;
  keterangan?: string;
  dimensions?: { panjang?: number; lebar?: number; satuan?: string; tebal_bahan_id?: string; tebal_bahan_nama?: string; additional_options?: any[] } | null; // Tambahkan dimensi
}

interface NotaData {
  tanggal: string;
  pelanggan: string;
  items: NotaItem[];
  total: number;
  invoice_number: string; // Tambahkan invoice_number
  kasir_id: string; // Tambahkan kasir_id
  payment_status: string; // Tambahkan payment_status
  paid_amount: number; // Tambahkan paid_amount
  dp_amount: number; // Tambahkan dp_amount
  change_amount: number; // Tambahkan change_amount
  payment_method: 'cash' | 'bank_transfer'; // Tambahkan payment_method
  bank_name: string | null; // Tambahkan bank_name
}

export const sendPrintRequest = async (notaData: NotaData) => {
  try {
    const response = await fetch(PRINT_AGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notaData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Gagal mengirim permintaan cetak ke agen lokal.');
    }

    const result = await response.json();
    showSuccess(result.message || 'Perintah cetak berhasil dikirim ke printer!');

  } catch (error: any) {
    showError('Gagal mencetak nota: ' + error.message + '. Pastikan agen pencetak lokal berjalan.');
    console.error('Error sending print request to local agent:', error);
  }
};