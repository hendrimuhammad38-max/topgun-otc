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
  GAS_URL: 'GANTI_DENGAN_URL_WEB_APP_ANDA',

  // Batas waktu menunggu jawaban server (milidetik)
  TIMEOUT_MS: 60000,

  // Berapa kali permintaan diulang otomatis bila jaringan terputus
  MAX_RETRY: 2
};
