/**
 * ============================================================
 * TOP GUN OTC — Lapisan Komunikasi ke Backend (REST / fetch)
 * ============================================================
 * Frontend ini berkas statis (GitHub Pages) dan backend-nya Google Apps
 * Script. Semua komunikasi lewat fetch() ke satu URL /exec.
 *
 * CATATAN TEKNIS PENTING (jangan diubah):
 * Header POST sengaja memakai 'text/plain;charset=utf-8'. Bila memakai
 * 'application/json', peramban mengirim permintaan OPTIONS (preflight CORS)
 * lebih dulu — dan Apps Script tidak bisa menjawab OPTIONS, sehingga semua
 * permintaan gagal. Isi badan tetap JSON; backend membacanya dengan
 * JSON.parse(e.postData.contents).
 * ============================================================
 */
(function () {
  'use strict';

  const CFG = window.APP_CONFIG || {};

  /**
   * Urutan argumen posisional → nama parameter yang dikirim ke backend.
   * Ini membuat seluruh pemanggilan di app.js tetap seperti semula:
   *   api('loginPeserta', id, nama)  →  { action:'loginPeserta', data:{ id, nama } }
   *   api('mulaiTes', token, kat)    →  { action:'mulaiTes', token, data:{ kategoriAlat:kat } }
   */
  const ARGS = {
    ping: [],
    getPublicConfig: [],
    loginPeserta: ['id', 'nama'],
    loginAdmin: ['username', 'password'],
    logout: [],
    getKategoriInfo: [],
    mulaiTes: ['kategoriAlat'],
    simpanDraft: ['sesiId', 'jawaban', 'pelanggaran'],
    kirimJawaban: ['sesiId', 'jawaban', 'pelanggaran', 'alasan'],
    getDashboard: ['filter'],
    getHasil: [],
    getPeserta: [],
    getBankSoal: [],
    saveSoal: ['soal'],
    setStatusSoal: ['id', 'status'],
    deleteSoal: ['id'],
    importSoal: ['rows'],
    savePeserta: ['peserta', 'isNew'],
    deletePeserta: ['id'],
    importPeserta: ['rows'],
    getEsaiDetail: ['hasilId'],
    simpanNilaiEsai: ['hasilId', 'daftar', 'final'],
    getPengaturan: [],
    savePengaturan: ['pengaturan'],
    uploadGambar: ['base64', 'nama', 'mime'],
    uploadBrand: ['kind', 'base64', 'nama', 'mime'],
    hapusBrand: ['kind'],
    uploadThumbKategori: ['kategori', 'base64', 'nama', 'mime'],
    hapusThumbKategori: ['kategori'],
    getAkun: [],
    saveAkun: ['akun'],
    deleteAkun: ['id'],
    sinkronkanSpreadsheet: [],
    getSpreadsheetInfo: []
  };

  /** Aksi yang tidak memerlukan token (argumen pertama BUKAN token). */
  const PUBLIK = { ping: 1, getPublicConfig: 1, loginPeserta: 1, loginAdmin: 1 };

  function cekUrl() {
    const u = String(CFG.GAS_URL || '').trim();
    if (!u || u.indexOf('GANTI_DENGAN') === 0)
      throw new Error('GAS_URL belum diisi. Buka berkas js/config.js dan tempel URL Web App Apps Script Anda (yang berakhiran /exec).');
    if (!/^https?:\/\//i.test(u))
      throw new Error('GAS_URL harus dimulai dengan https:// — periksa kembali isi js/config.js.');
    if (/script\.google\.com/i.test(u)) {
      if (/\/dev\/?$/.test(u))
        throw new Error('GAS_URL masih memakai URL /dev (khusus pemilik skrip). Pakai URL yang berakhiran /exec dari Deploy → New deployment.');
      if (!/\/exec\/?$/.test(u))
        throw new Error('GAS_URL harus berakhiran /exec. Salin ulang "Web app URL" dari halaman Deploy di Apps Script.');
    }
    return u;
  }

  function susunMuatan(action, args) {
    const nama = ARGS[action];
    if (!nama) throw new Error('Aksi "' + action + '" belum terdaftar di js/api.js.');
    let token = '', mulai = 0;
    if (!PUBLIK[action]) { token = args[0] || ''; mulai = 1; }
    const data = {};
    nama.forEach(function (k, i) {
      const v = args[mulai + i];
      if (v !== undefined) data[k] = v;
    });
    return { action: action, token: token, data: data };
  }

  function timeoutSignal(ms) {
    if (typeof AbortController === 'undefined') return null;
    const c = new AbortController();
    setTimeout(function () { c.abort(); }, ms);
    return c;
  }

  /**
   * Panggilan server berbasis Promise. Resolve = seluruh response
   * {success, data, message} — sama seperti versi sebelumnya, sehingga
   * seluruh kode di app.js tidak perlu berubah.
   */
  window.api = function api(action, ...args) {
    const url = cekUrl();
    const muatan = susunMuatan(action, args);
    const batas = Number(CFG.TIMEOUT_MS || 60000);
    const maxUlang = Number(CFG.MAX_RETRY || 2);

    // Aksi baca-saja boleh diulang otomatis; aksi tulis TIDAK (agar tidak dobel).
    const bolehUlang = /^(ping|get|diagnosa)/.test(action);

    function sekali(sisaUlang) {
      const ctrl = timeoutSignal(batas);
      return fetch(url, {
        method: 'POST',
        // text/plain = tanpa preflight CORS (lihat catatan di atas)
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(muatan),
        redirect: 'follow',
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (resp) {
        if (!resp.ok) throw new Error('Server menjawab dengan kode ' + resp.status + '. Pastikan deployment Web App diatur "Anyone" dan URL /exec sudah benar.');
        return resp.text();
      }).then(function (teks) {
        let res;
        try { res = JSON.parse(teks); }
        catch (e) {
          if (/<html|Google Apps Script|accounts\.google\.com/i.test(teks))
            throw new Error('Server mengembalikan halaman login, bukan data. Pada Deploy → Web app, atur "Who has access" menjadi Anyone, lalu buat New version.');
          throw new Error('Jawaban server tidak dapat dibaca. Pastikan backend memakai ContentService (JSON), bukan HtmlService.');
        }
        if (res && res.success) return res;
        const err = new Error((res && res.message) || 'Terjadi kesalahan pada server.');
        err.code = res && res.code;
        if (err.code === 'SESI_BERAKHIR' && typeof handleSessionExpired === 'function') handleSessionExpired();
        throw err;
      }).catch(function (e) {
        const jaringan = (e && (e.name === 'AbortError' || e.name === 'TypeError' || /Failed to fetch|NetworkError|Load failed/i.test(e.message || '')));
        if (jaringan && bolehUlang && sisaUlang > 0) {
          return new Promise(function (r) { setTimeout(r, 1200); }).then(function () { return sekali(sisaUlang - 1); });
        }
        if (e && e.name === 'AbortError')
          throw new Error('Server tidak merespons dalam ' + Math.round(batas / 1000) + ' detik. Periksa koneksi internet lalu coba lagi.');
        if (jaringan)
          throw new Error('Koneksi ke server gagal. Periksa internet Anda, lalu pastikan URL di js/config.js benar dan deployment Web App dapat diakses "Anyone".');
        throw e;
      });
    }
    return sekali(bolehUlang ? maxUlang : 0);
  };

  /** Uji koneksi cepat ke backend (dipakai saat aplikasi pertama dibuka). */
  window.apiPing = function () {
    return fetch(cekUrl() + '?action=ping', { method: 'GET', redirect: 'follow' })
      .then(function (r) { return r.json(); });
  };
})();
