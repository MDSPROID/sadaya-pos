const escpos = require('escpos');
const USB = require('escpos-usb'); // Mengimpor konstruktor USB secara langsung

// --- KONFIGURASI PRINTER ANDA DI SINI ---
// Pilih salah satu konfigurasi di bawah ini sesuai dengan jenis koneksi printer Anda.

// 1. Untuk Printer USB (Paling Umum untuk POS):
//    Anda mungkin perlu mencari Vendor ID (VID) dan Product ID (PID) printer Anda.
//    Di Windows, Anda bisa menemukannya di Device Manager (Properties > Details > Hardware Ids).
//    Contoh: const device = new USB(0x04b8, 0x0202); // Ganti dengan VID dan PID printer Anda
const device = new USB(); // Menggunakan konstruktor USB yang diimpor langsung

// 2. Untuk Printer Serial (COM Port):
//    // const Serial = require('escpos-serialport'); // Anda perlu menginstal 'escpos-serialport' jika menggunakan ini
//    // const device = new Serial('/dev/ttyS0'); // Untuk Linux/macOS
//    // const device = new Serial('COM1');      // Untuk Windows, ganti COM1 dengan port yang benar

// 3. Untuk Printer Jaringan (Ethernet):
//    // const Network = require('escpos-network'); // Anda perlu menginstal 'escpos-network' jika menggunakan ini
//    // const device = new Network('192.168.1.100', 9100); // Ganti IP dan Port printer Anda

// --- AKHIR KONFIGURASI ---

const printer = new escpos.Printer(device);

console.log('Mencoba terhubung ke printer...');

device.open(function(error){
  if (error) {
    console.error('Gagal terhubung ke printer:', error);
    console.error('Pastikan printer terhubung, menyala, dan driver terinstal dengan benar.');
    console.error('Jika menggunakan USB, coba jalankan sebagai administrator atau periksa VID/PID.');
    console.error('Jika menggunakan Network, pastikan IP dan port benar serta tidak ada firewall.');
    console.error('Untuk Windows USB, pastikan Anda telah menginstal driver WinUSB menggunakan Zadig.');
    return;
  }

  console.log('Koneksi printer berhasil dibuka. Mencetak nota uji...');

  printer
  .encode('UTF-8') // Mengatur encoding
  .align('CT')     // Tengah
  .text('--- NOTA UJI POS DIGITAL PRINT ---')
  .text('----------------------------------')
  .align('LT')     // Kiri
  .text('Tanggal: ' + new Date().toLocaleString())
  .text('----------------------------------')
  .text('Item 1        Rp 10.000 x 1')
  .text('Item 2        Rp 20.000 x 2')
  .text('----------------------------------')
  .align('RT')     // Kanan
  .text('Total: Rp 50.000')
  .align('CT')     // Tengah
  .text('----------------------------------')
  .text('Terima Kasih!')
  .text('Kunjungi Kami Kembali')
  .text('----------------------------------')
  .feed(3)         // Memberi jarak 3 baris
  .cut()           // Memotong kertas
  .close();        // Menutup koneksi printer

  console.log('Perintah cetak dikirim. Periksa printer Anda.');
});