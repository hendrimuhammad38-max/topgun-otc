# TOP GUN OTC — Frontend

Aplikasi ujian sertifikasi operator alat berat. Berkas ini adalah **frontend statis**
(HTML/CSS/JS murni) yang dipasang di GitHub Pages. Datanya diambil dari backend
Google Apps Script lewat `fetch()`.

## Isi

| Berkas | Keterangan |
|---|---|
| `index.html` | Halaman aplikasi (satu halaman / SPA) |
| `css/style.css` | Tampilan Soft UI / Neumorphism |
| `js/config.js` | **Satu-satunya berkas yang perlu diubah** — isi `GAS_URL` |
| `js/api.js` | Penghubung ke backend Apps Script |
| `js/app.js` | Logika aplikasi |

## Sebelum dipakai

Buka `js/config.js`, ganti `GANTI_DENGAN_URL_WEB_APP_ANDA` dengan URL Web App
Apps Script Anda (yang berakhiran `/exec`), lalu simpan dan push ulang.
