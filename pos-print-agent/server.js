// server.js
const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
const USB = require('escpos-usb');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = 8080;

// ===== Supabase =====
const SUPABASE_URL = 'https://cyhrvgyxldfghfqsasca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHJ2Z3l4bGRmZ2hmcXNhc2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDY3NTMsImV4cCI6MjA2OTI4Mjc1M30.q9yh7W-8mPi-a7mMA7FVapo8VfZe_CaS9l3B2rRi3oI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Middleware =====
app.use(cors({ origin: '*', methods: ['POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

// ===== USB Device =====
const device = new USB();

// ===== Utils =====
function formatLine(leftText, rightText, totalWidth = 42) {
  const leftLen = leftText.length;
  const rightLen = rightText.length;
  const padding = totalWidth - leftLen - rightLen;
  if (padding < 0) {
    const truncateLen = totalWidth - rightLen - 3;
    return leftText.substring(0, Math.max(0, truncateLen)) + '...' + rightText;
  }
  return leftText + ' '.repeat(padding) + rightText;
}
function formatNumberWithThousandsSeparator(num) {
  const roundedNum = Math.round(Number(num) || 0);
  let s = String(roundedNum);
  let out = '', c = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    out = s[i] + out;
    c++;
    if (c % 3 === 0 && i !== 0) out = '.' + out;
  }
  return out;
}
const formatCurrencyValue = (amount) => `Rp ${formatNumberWithThousandsSeparator(amount)}`;
const formatNumericValue  = (amount) => formatNumberWithThousandsSeparator(amount);

// ===== Logo path (58mm = 384px) =====
const LOCAL_LOGO_PATH = path.join(__dirname, 'assets', 'logo_sadaya_bw_384px.png');

// ===== Cetak logo (mode paling kompatibel) =====
function printImageLogo(printer) {
  return new Promise((resolve, reject) => {
    escpos.Image.load(
      LOCAL_LOGO_PATH,
      (image) => {
        try {
          // Init & center
          if (typeof printer.hw === 'function') printer.hw('init');
          printer.align('CT').feed(1);

          // 1) Gunakan ESC * (bit-image) 24-dot, paling kompatibel
          // Pilihan lain yang bisa dicoba: 'd24' (lebih padat), 's8'
          printer.image(image, 's24');

          printer.feed(1);
          resolve();
        } catch (e1) {
          try {
            // 2) Fallback ke raster kalau device support GS v 0
            if (typeof printer.hw === 'function') printer.hw('init');
            printer.align('CT');
            printer.raster(image, 's8');
            printer.feed(1);
            resolve();
          } catch (e2) {
            reject(e2);
          }
        }
      },
      (err) => reject(err)
    );
  });
}

// ===== Cetak Nota =====
const printReceipt = async (notaData, callback) => {
  let printer;
  try {
    const { data: appSettings }  = await supabase.from('app_settings').select('*').single();
    const { data: notaSettings } = await supabase.from('nota_settings').select('footer_penjualan').single();

    // Kasir
    let kasirName = 'N/A';
    if (notaData.kasir_id) {
      const { data: kasirProfile } = await supabase
        .from('profiles').select('first_name, last_name')
        .eq('id', notaData.kasir_id).single();
      if (kasirProfile) kasirName = `${kasirProfile.first_name || ''} ${kasirProfile.last_name || ''}`.trim();
    }

    const dt = new Date(notaData.tanggal);
    const formattedDate = dt.toLocaleDateString('id-ID');
    const formattedTime = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    device.open(async (error) => {
      if (error) {
        console.error('Error opening printer device:', error);
        return callback(error);
      }

      printer = new escpos.Printer(device);

      try {
        // ===== Header: Logo =====
        await printImageLogo(printer);

        // ===== Header: Info toko =====
        if (typeof printer.hw === 'function') printer.hw('init');
        printer.align('CT').feed(0);
        printer.size(2, 2).style('B');
        printer.text(appSettings?.nama_perusahaan || 'SADAYA DIGITAL PRINTING');
        printer.style('NORMAL').size(1, 1);
        printer.text(appSettings?.alamat || 'Jl. Kutisari No 24 Surabaya');
        printer.text(`Telp: ${appSettings?.telepon || '+62 821-3132-2286'}`);
        printer.text('----------------------------------');
        printer.size(0, 0);

        // ===== Detail transaksi =====
        printer.align('LT');
        printer.text(`Nota      : ${notaData.invoice_number || 'N/A'}`);
        printer.text(`Telp/HP   : ${notaData.customer_phone || '0'}`);
        printer.text(`Customer  : ${notaData.customer_name || 'UMUM'}`);
        printer.text(`Tanggal   : ${formattedDate}`);
        printer.text(`Jam       : ${formattedTime}`);
        printer.text('----------------------------------');

        // ===== Item list =====
        printer.text(formatLine('Nama Produk', 'Harga   Qty   Subtotal', 42));
        printer.text('----------------------------------');
        (notaData.items || []).forEach(item => {
          const productName = (item.nama || '').substring(0, 16).padEnd(16);
          const price    = formatNumericValue(item.unit_price).padStart(8);
          const qty      = String(item.qty).padStart(4);
          const subtotal = formatNumericValue(item.subtotal).padStart(12);
          printer.text(`${productName}${price}${qty}${subtotal}`);
          if (item.dimensions?.panjang && item.dimensions?.lebar) {
            printer.text(`  Size: ${item.dimensions.panjang}x${item.dimensions.lebar} ${item.dimensions.satuan || ''}`);
          }
          if (item.keterangan) printer.text(`  (${item.keterangan})`);
        });

        printer.text('----------------------------------');

        // ===== Total =====
        printer.align('LT');
        printer.text(`Grand Total : ${formatCurrencyValue(notaData.total)}`);
        printer.text(`Bayar       : ${formatCurrencyValue(notaData.paid_amount)}`);
        printer.text(`Kembali     : ${formatCurrencyValue(notaData.change_amount)}`);
        printer.text('----------------------------------');

        // ===== Pembayaran =====
        printer.text(`Pembayaran ke: 1 ${notaData.payment_status === 'paid' ? 'Lunas' : 'Pending'}`);
        printer.text(`Petugas: ${kasirName}`);
        if (notaData.payment_method === 'bank_transfer' && notaData.bank_name) {
          printer.text(`TF ke: ${notaData.bank_name}`);
        } else if (notaData.payment_method === 'cash') {
          printer.text('Metode: Tunai');
        }

        // ===== Footer =====
        printer.align('CT');
        printer.text('----------------------------------');
        if (notaSettings?.footer_penjualan) {
          notaSettings.footer_penjualan.split('\n').forEach(line => printer.text(line));
        } else {
          printer.text('Terima Kasih!');
          printer.text('DIGITAL PRINTING & ADVERTISING');
        }
        printer.text('----------------------------------');

        printer.feed(3).cut().close();
        callback(null);
      } catch (err) {
        console.error('Error during print commands:', err);
        callback(err);
      }
    });
  } catch (err) {
    console.error('Error fetching settings or initial setup:', err);
    callback(err);
  }
};

// ===== API =====
app.post('/print-nota', (req, res) => {
  const notaData = req.body;
  if (!notaData?.items || !Array.isArray(notaData.items)) {
    return res.status(400).json({ success: false, message: 'Invalid nota data. "items" array is required.' });
  }
  printReceipt(notaData, (error) => {
    if (error) return res.status(500).json({ success: false, message: 'Print failed', error: error.message });
    res.json({ success: true, message: 'Receipt printed successfully!' });
  });
});

app.get('/', (_, res) => {
  res.send('<h1>🖨️ POS Print Agent is Running!</h1><p>Ready to print receipts.</p><code>POST /print-nota</code>');
});

app.get('/health', (_, res) => {
  const available = !!tryCreateUsbDevice();
  res.json({ ok: true, printerAvailable: available });
});

app.listen(PORT, () => console.log(`✅ POS Print Agent listening on port ${PORT}`));
