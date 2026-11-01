/**
 * ============================================================
 * TOP GUN OTC — Konfigurasi Frontend
 * ============================================================
 * SATU-SATUNYA berkas yang perlu Anda ubah setelah deploy backend.
 *
 * Cara mengisi GAS_URL:
 *   1. Buka proyek Apps Script Anda.
 *   2. Deploy → New deployment → Web app
 *        - Execute as      : Me
 *        - Who has access  : Anyone
 *   3. Salin "Web app URL" (berakhiran /exec) dan tempel di bawah.
 *
 * PENTING: URL harus diakhiri /exec, BUKAN /dev.
 * ============================================================
 */
window.APP_CONFIG = {
  // ⬇️ GANTI baris ini dengan URL Web App Anda
  GAS_URL: 'https://script.google.com/macros/s/AKfycbypBdFgND3hPft2ew_fuymnEQwprK2IEh_7LQhp7xTspvOsEI527RpbzbNoRID0cTK_/exec',

  // Batas waktu menunggu jawaban server (milidetik)
  TIMEOUT_MS: 60000,

  // Berapa kali permintaan diulang otomatis bila jaringan terputus
  MAX_RETRY: 2
};
