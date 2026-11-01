/**
 * ============================================================
 * TOP GUN OTC — Frontend (JavaScript.html)
 * SPA: semua section dimuat sekali; navigasi 0ms via navigateTo().
 * Token sesi hanya di memori (tidak di URL); aman untuk iframe.
 * ============================================================
 */

// ════════ BAGIAN 1: STATE, UTILITAS ════════
const S = {
  token: null, role: null, profil: null,
  cfg: { appName: 'TOP GUN OTC', logoId: '', bannerId: '' },
  meta: { kategoriAlat: [], departemen: [], crew: [], kategoriPeserta: [] },
  data: { soal: null, peserta: null, hasil: null, akun: null },
  dash: null, section: null, thumbs: {}
};
const ICON_ALAT = { 'Dump Truck': 'bi-truck-flatbed', 'ADT': 'bi-truck', 'Grader': 'bi-sign-merge-right', 'Dozer': 'bi-bounding-box-circles', 'Digger': 'bi-tools', 'Drill': 'bi-hammer', 'Water Management': 'bi-droplet-half', 'Loader': 'bi-box-seam' };
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const PER_PAGE = 10;
let charts = {};
let soalPage = 1, pesertaPage = 1, hasilPage = 1, esaiPage = 1;
let hasilSort = { key: 'WaktuSelesai', dir: -1 };

const gId = id => document.getElementById(id);
const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const show = (id, on = true) => gId(id).classList.toggle('hidden', !on);
const driveImg = (id, w = 1000) => id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + w : '';
const fmtNum = n => (n === null || n === undefined || n === '') ? '–' : String(Math.round(Number(n) * 10) / 10);
const fmtTgl = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? (+m[3]) + ' ' + BULAN[+m[2] - 1] + ' ' + m[1] : (s || '–'); };
const pad2 = n => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage diblokir: abaikan */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
};
const timers = {};
function debounce(key, fn, ms = 250) { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); }

// Fungsi api() ada di js/api.js (memanggil backend GAS lewat fetch).

async function withBusy(btn, fn) {
  const html = btn.innerHTML, was = btn.disabled;
  btn.disabled = true; btn.innerHTML = '<span class="spinner-inline"></span> Memproses…';
  try { return await fn(); } finally { btn.disabled = was; btn.innerHTML = html; }
}
function toast(title, msg, type = 'info') {
  const el = gId('appToast');
  gId('toastTitle').textContent = title; gId('toastBody').textContent = msg;
  el.className = 'toast t-' + type;
  gId('toastIcon').className = 'bi me-2 ' + ({ success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill', warning: 'bi-exclamation-triangle-fill' }[type] || 'bi-bell');
  if (typeof bootstrap === 'undefined') { el.classList.add('show'); clearTimeout(timers.toastFallback); timers.toastFallback = setTimeout(() => el.classList.remove('show'), 4500); return; }
  bootstrap.Toast.getOrCreateInstance(el, { delay: 4500 }).show();
}
// Modal: memakai Bootstrap; bila pustakanya tidak termuat, pakai cadangan sederhana agar aplikasi tetap bisa dipakai.
const modal = id => (typeof bootstrap !== 'undefined') ? bootstrap.Modal.getOrCreateInstance(gId(id)) : {
  show() { const el = gId(id); el.style.display = 'block'; el.classList.add('show'); },
  hide() { const el = gId(id); el.classList.remove('show'); el.style.display = 'none'; }
};
function setErr(id, msg) {
  const el = gId(id); el.innerHTML = msg ? '<i class="bi bi-exclamation-circle"></i> ' + esc(msg) : ''; el.classList.toggle('hidden', !msg);
  if (msg) { retrigger(el, 'shake'); if (id === 'errPeserta' || id === 'errAdmin') retrigger(document.querySelector('#viewAuth .neu-card'), 'shake'); }
}
function retrigger(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function markFresh(id) { const el = gId(id); if (!el) return; retrigger(el, 'fresh'); setTimeout(() => el.classList.remove('fresh'), 1400); }
/** Animasi hitung naik untuk angka KPI (dimatikan bila pengguna memilih reduced motion). */
function countUp(root) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  (root || document).querySelectorAll('.cu').forEach(el => {
    const to = parseFloat(el.dataset.to), suf = el.dataset.suf || '', dec = (el.dataset.to.split('.')[1] || '').length;
    if (!isFinite(to)) return;
    const t0 = performance.now(), dur = 900;
    const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toFixed(dec) + suf; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
// Efek riak pada tombol
document.addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('.btn-neu'); if (!b || b.disabled || b.classList.contains('disabled')) return;
  const r = document.createElement('span'), rect = b.getBoundingClientRect(), d = Math.max(rect.width, rect.height);
  r.className = 'ripple'; r.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - rect.left - d / 2) + 'px;top:' + (e.clientY - rect.top - d / 2) + 'px';
  b.appendChild(r); setTimeout(() => r.remove(), 650);
});
function confirmBox(title, bodyHtml, okLabel, onOk, danger) {
  gId('mcTitle').textContent = title; gId('mcBody').innerHTML = bodyHtml;
  const ok = gId('mcOk'); ok.textContent = okLabel || 'Ya, lanjut';
  ok.className = 'btn-neu ' + (danger ? 'danger' : 'primary');
  ok.onclick = async () => { modal('mdlConfirm').hide(); await onOk(); };
  modal('mdlConfirm').show();
}
function showImage(url, downloadable) {
  gId('miImg').src = url;
  const a = gId('miDownload'); a.classList.toggle('hidden', !downloadable); if (downloadable) a.href = url;
  modal('mdlImage').show();
}
function fillSelect(id, items, allLabel) {
  const el = gId(id);
  el.innerHTML = (allLabel ? '<option value="">' + esc(allLabel) + '</option>' : '') + items.map(i => '<option value="' + esc(i) + '">' + esc(i) + '</option>').join('');
}
function downloadFile(name, text, mime) {
  const blob = new Blob(['\ufeff' + text], { type: mime || 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}
const csvCell = v => { let s = String(v === null || v === undefined ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
function parseCSV(text) {
  const first = text.split(/\r?\n/)[0] || '';
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  text = text.replace(/^\ufeff/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ base64: String(r.result).split(',')[1], dataUrl: r.result });
    r.onerror = () => reject(new Error('Gagal membaca berkas.'));
    r.readAsDataURL(file);
  });
}
function checkImageFile(file) {
  if (!file) throw new Error('Pilih berkas gambar terlebih dahulu.');
  if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].indexOf(file.type) < 0) throw new Error('Format harus PNG, JPG, WEBP, atau GIF.');
  if (file.size > 4 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 4 MB.');
}

// Pagination generik
const pagerCb = {};
function renderPager(elId, total, page, cb) {
  pagerCb[elId] = cb;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = total ? (page - 1) * PER_PAGE + 1 : 0, to = Math.min(total, page * PER_PAGE);
  let btns = '';
  const start = Math.max(1, Math.min(page - 2, pages - 4)), end = Math.min(pages, start + 4);
  for (let p = start; p <= end; p++) btns += '<button type="button" class="' + (p === page ? 'active' : '') + '" onclick="pagerGo(\'' + elId + '\',' + p + ')" aria-label="Halaman ' + p + '">' + p + '</button>';
  gId(elId).innerHTML = '<span>Menampilkan ' + from + '–' + to + ' dari ' + total + ' data</span><div class="pages"><button type="button" ' + (page <= 1 ? 'disabled' : '') + ' onclick="pagerGo(\'' + elId + '\',' + (page - 1) + ')" aria-label="Sebelumnya"><i class="bi bi-chevron-left"></i></button>' + btns + '<button type="button" ' + (page >= pages ? 'disabled' : '') + ' onclick="pagerGo(\'' + elId + '\',' + (page + 1) + ')" aria-label="Berikutnya"><i class="bi bi-chevron-right"></i></button></div>';
}
function pagerGo(elId, p) { pagerCb[elId](p); }
const emptyHtml = (icon, msg) => '<div class="empty-state"><i class="bi ' + icon + '"></i><div>' + msg + '</div></div>';
const skeletonHtml = (n = 5) => Array.from({ length: n }, () => '<div class="skeleton mb-2" style="height:44px"></div>').join('');
function paginate(arr, page) { return arr.slice((page - 1) * PER_PAGE, page * PER_PAGE); }
function scoreClass(v, lulus) { if (v === null || v === undefined || v === '') return ''; return v >= lulus ? 'good' : (v >= lulus - 15 ? 'mid' : 'low'); }
function scoreHtml(v, lulus) { return v === null || v === undefined || v === '' ? '<span class="text-muted-2">–</span>' : '<span class="score ' + scoreClass(v, lulus) + '">' + fmtNum(v) + '</span>'; }
function statusPill(s) { return '<span class="pill ' + (s === 'Selesai' ? 'ok' : 'bad') + '">' + esc(s) + '</span>'; }
function esaiPill(s) {
  const m = { 'Belum dinilai': ['warn', 'Belum dinilai'], 'Draft': ['info', 'Draf'], 'Sudah dinilai': ['ok', 'Sudah dinilai'], 'Tanpa esai': ['neutral', 'Tanpa esai'] }[s] || ['neutral', s || '–'];
  return '<span class="pill ' + m[0] + '">' + esc(m[1]) + '</span>';
}
const katPill = k => '<span class="pill ' + (k === 'KPC' ? 'warn' : 'info') + '">' + esc(k) + '</span>';

// ════════ BAGIAN 2: TEMA & BRANDING ════════
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  gId('darkToggle').checked = t === 'dark';
  const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', t === 'dark' ? '#1B2433' : '#E4EAF2');
}
/** Tinggi layar yang benar-benar terlihat (mengatasi bar alamat ponsel & iframe): dipakai sebagai min-height seluruh halaman. */
function setAppHeight() { document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px'); }
setAppHeight();
['resize', 'orientationchange'].forEach(ev => window.addEventListener(ev, setAppHeight));
if (window.visualViewport) window.visualViewport.addEventListener('resize', setAppHeight);
document.addEventListener('fullscreenchange', () => setTimeout(setAppHeight, 80));
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next); store.set('otc_theme', next);
  if (S.section === 'dashboard' && S.dash) renderDashboard(S.dash);
  if (S.section === 'hasil' && S.data.hasil) renderHasilTable();
}
function chartColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const cs = getComputedStyle(document.documentElement);
  return { text: cs.getPropertyValue('--chart-text').trim(), grid: cs.getPropertyValue('--chart-grid').trim(), palette: dark ? ['#6C9BDB', '#F5A623', '#8FB5E5', '#B6C2D6', '#4F7FC0', '#D99A2B', '#A9C6EC', '#8895AB'] : ['#1E3A5F', '#F5A623', '#5B8DB8', '#94A3B8', '#2D486D', '#C98512', '#7FA6CF', '#6B7C93'] };
}
function makeChart(id, config) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  const el = gId(id); if (!el) return;
  if (typeof Chart === 'undefined') { el.parentNode.innerHTML = emptyHtml('bi-wifi-off', 'Pustaka grafik tidak termuat. Periksa koneksi internet.'); return; }
  const c = chartColors();
  Chart.defaults.font.family = "'Inter', sans-serif"; Chart.defaults.color = c.text;
  charts[id] = new Chart(el, config);
}
function applyBranding() {
  document.title = S.cfg.appName;
  document.querySelectorAll('.appNameText').forEach(e => e.textContent = S.cfg.appName);
  document.querySelectorAll('.brandLogo').forEach(e => {
    e.innerHTML = S.cfg.logoId ? '<img src="' + driveImg(S.cfg.logoId, 200) + '" alt="Logo" onerror="this.replaceWith(Object.assign(document.createElement(\'i\'),{className:\'bi bi-shield-check\'}))">' : '<i class="bi bi-shield-check"></i>';
  });
  const fallback = '<div class="fallback"><i class="bi bi-shield-check"></i> <span>' + esc(S.cfg.appName) + '</span></div>';
  const bannerHtml = S.cfg.bannerId ? '<img src="' + driveImg(S.cfg.bannerId, 1200) + '" alt="Banner" onerror="this.parentNode.innerHTML=this.dataset.fb" data-fb="' + esc(fallback) + '">' : fallback;
  gId('authBanner').innerHTML = bannerHtml;
  const bp = gId('bannerPrev'); if (bp) bp.innerHTML = bannerHtml;
}

// ════════ BAGIAN 3: INISIALISASI & AUTENTIKASI ════════
function showView(v) {
  ['Auth', 'Peserta', 'Panel'].forEach(n => show('view' + n, n.toLowerCase() === v));
  retrigger(gId('view' + v.charAt(0).toUpperCase() + v.slice(1)), 'view-enter'); window.scrollTo(0, 0);
}

async function bootApp() {
  applyTheme(store.get('otc_theme') || 'light');
  try {
    const res = await api('getPublicConfig');
    S.cfg = { appName: res.data.appName, logoId: res.data.logoId, bannerId: res.data.bannerId };
    S.meta = { kategoriAlat: res.data.kategoriAlat, departemen: res.data.departemen, crew: res.data.crew, kategoriPeserta: res.data.kategoriPeserta };
  } catch (e) { toast('Peringatan', 'Gagal memuat konfigurasi: ' + e.message, 'warning'); }
  applyBranding(); showView('auth');
  const ov = gId('loadingOverlay'); ov.style.opacity = '0'; setTimeout(() => ov.classList.add('hidden'), 300);
  gId('pId').focus();
}

function switchAuthTab(tab) {
  const p = tab === 'peserta';
  gId('tabPeserta').classList.toggle('active', p); gId('tabAdmin').classList.toggle('active', !p);
  show('formPeserta', p); show('formAdmin', !p); setErr('errPeserta', ''); setErr('errAdmin', '');
  retrigger(gId(p ? 'formPeserta' : 'formAdmin'), 'reveal-group');
}
async function handleLoginPeserta(ev) {
  ev.preventDefault(); setErr('errPeserta', '');
  const id = gId('pId').value.trim(), nama = gId('pNama').value.trim();
  if (!id || !nama) return setErr('errPeserta', 'ID dan nama lengkap wajib diisi.');
  try {
    const res = await withBusy(gId('btnLoginPeserta'), () => api('loginPeserta', id, nama));
    S.token = res.data.token; S.role = 'peserta'; S.profil = res.data.profil;
    Exam.resumeKategori = res.data.sesiBerjalan;
    gId('pNama').value = '';
    enterPeserta();
  } catch (e) { setErr('errPeserta', e.message); }
}
async function handleLoginAdmin(ev) {
  ev.preventDefault(); setErr('errAdmin', '');
  const u = gId('aUser').value.trim(), p = gId('aPass').value;
  if (!u || !p) return setErr('errAdmin', 'Username dan password wajib diisi.');
  try {
    const res = await withBusy(gId('btnLoginAdmin'), () => api('loginAdmin', u, p));
    S.token = res.data.token; S.role = res.data.role; S.profil = res.data.profil;
    gId('aPass').value = '';
    enterPanel();
  } catch (e) { setErr('errAdmin', e.message); }
}
function confirmLogout() {
  confirmBox('Keluar dari aplikasi?', 'Sesi Anda akan diakhiri.', 'Keluar', () => doLogout(), true);
}
function resetClientState() {
  if (typeof disarmAntiCheat === 'function') disarmAntiCheat();
  if (typeof stopExamTimers === 'function') stopExamTimers();
  Object.values(charts).forEach(c => c.destroy()); charts = {};
  S.token = null; S.role = null; S.profil = null; S.dash = null; S.section = null;
  S.data = { soal: null, peserta: null, hasil: null, akun: null };
  Exam.active = false; Exam.data = null; Exam.resumeKategori = null; Exam.kategori = null;
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { });
  closeSidebar(); closeDrawer();
}
function doLogout() {
  const t = S.token; if (t) api('logout', t).catch(() => { });
  resetClientState(); switchAuthTab('peserta'); showView('auth');
}
function handleSessionExpired() {
  if (!S.token) return;
  if (Exam.active) { toast('Sesi berakhir', 'Sesi login habis. Jawaban Anda tetap tersimpan di perangkat; hubungi pengawas.', 'danger'); return; }
  resetClientState(); switchAuthTab('peserta'); showView('auth');
  toast('Sesi berakhir', 'Silakan login kembali.', 'warning');
}

// ════════ BAGIAN 4: PANEL ADMIN / INSTRUKTUR (SPA) ════════
const MENU = {
  admin: [['dashboard', 'bi-speedometer2', 'Dashboard'], ['banksoal', 'bi-journal-text', 'Bank Soal'], ['peserta', 'bi-people', 'Peserta'], ['esai', 'bi-pencil-square', 'Penilaian Esai'], ['hasil', 'bi-clipboard-data', 'Hasil Tes'], ['pengaturan', 'bi-gear', 'Pengaturan']],
  instruktur: [['dashboard', 'bi-speedometer2', 'Dashboard'], ['peserta', 'bi-people', 'Peserta'], ['hasil', 'bi-clipboard-data', 'Hasil Tes']]
};
const TITLES = { dashboard: 'Dashboard', banksoal: 'Bank Soal', soalform: 'Bank Soal', peserta: 'Peserta', esai: 'Penilaian Esai', esaidetail: 'Penilaian Esai', hasil: 'Hasil Tes', pengaturan: 'Pengaturan' };
const PARENT = { soalform: 'banksoal', esaidetail: 'esai' };

function enterPanel() {
  showView('panel');
  const isAdmin = S.role === 'admin';
  gId('sideRole').textContent = isAdmin ? 'Admin' : 'Instruktur';
  gId('panelUserName').textContent = S.profil.nama; gId('panelUserRole').textContent = S.profil.peran;
  document.querySelectorAll('.admin-only').forEach(e => e.classList.toggle('hidden', !isAdmin));
  gId('sideNav').innerHTML = MENU[S.role].map(m => '<li><a href="javascript:void(0)" data-section="' + m[0] + '" onclick="navigateTo(\'' + m[0] + '\')"><i class="bi ' + m[1] + '"></i><span>' + m[2] + '</span>' + (m[0] === 'esai' ? '<span class="badge-count hidden" id="esaiBadge">0</span>' : '') + '</a></li>').join('');
  const sel = (id, arr, label) => fillSelect(id, arr, label);
  sel('fsKategori', S.meta.kategoriAlat, 'Semua kategori alat'); sel('sKategori', S.meta.kategoriAlat);
  sel('fpKategori', S.meta.kategoriPeserta, 'Semua kategori'); sel('fpDept', S.meta.departemen, 'Semua departemen'); sel('fpCrew', S.meta.crew, 'Semua crew');
  sel('fhKategori', S.meta.kategoriPeserta, 'Semua kategori'); sel('fhDept', S.meta.departemen, 'Semua departemen'); sel('fhCrew', S.meta.crew, 'Semua crew'); sel('fhAlat', S.meta.kategoriAlat, 'Semua alat');
  sel('feAlat', S.meta.kategoriAlat, 'Semua kategori alat');
  sel('mpKategori', S.meta.kategoriPeserta); sel('mpDept', S.meta.departemen); sel('mpCrew', S.meta.crew);
  navigateTo('dashboard');
  if (isAdmin) {
    loadHasil(false, true);
    api('getSpreadsheetInfo', S.token).then(r => ['lnkSheetSoal', 'lnkSheetPeserta'].forEach(id => { const a = gId(id); a.href = r.data.url; a.classList.remove('hidden'); })).catch(() => { });
  }
}
function navigateTo(id) {
  const allowed = MENU[S.role].map(m => m[0]).concat(Object.keys(PARENT));
  if (allowed.indexOf(id) < 0) return;
  if ((id === 'soalform' || id === 'esaidetail') && S.role !== 'admin') return;
  document.querySelectorAll('#viewPanel .content-section').forEach(s => s.classList.remove('active'));
  gId('section-' + id).classList.add('active');
  S.section = id;
  const active = PARENT[id] || id;
  document.querySelectorAll('#sideNav a').forEach(a => a.classList.toggle('active', a.dataset.section === active));
  gId('panelTitle').textContent = TITLES[id] || '';
  closeSidebar(); window.scrollTo(0, 0);
  const loaders = { dashboard: () => loadDashboard(false), banksoal: () => loadSoal(false), peserta: () => loadPeserta(false), hasil: () => loadHasil(false), esai: () => loadHasil(false), pengaturan: loadPengaturan };
  if (loaders[id]) loaders[id]();
}
function toggleSidebar() { gId('sidebar').classList.toggle('show'); gId('sideOverlay').classList.toggle('show'); }
function closeSidebar() { gId('sidebar').classList.remove('show'); gId('sideOverlay').classList.remove('show'); }

// ── Dashboard ──
function resetDashFilter() { gId('dDari').value = ''; gId('dSampai').value = ''; loadDashboard(true); }
async function loadDashboard(force) {
  if (S.dash && !force) { renderDashboard(S.dash); return; }
  gId('dashBody').innerHTML = '<div class="row g-3">' + Array.from({ length: 6 }, () => '<div class="col-6 col-xl-2"><div class="skeleton" style="height:110px"></div></div>').join('') + '</div><div class="skeleton mt-3" style="height:280px"></div>';
  try {
    const res = await api('getDashboard', S.token, { dari: gId('dDari').value, sampai: gId('dSampai').value });
    S.dash = res.data; renderDashboard(S.dash);
  } catch (e) { gId('dashBody').innerHTML = emptyHtml('bi-exclamation-triangle', esc(e.message)); }
}
function statCard(label, icon, value, unit, cls) {
  const m = /^(\d+(?:\.\d+)?)(%?)$/.exec(String(value));
  const v = m ? '<span class="cu" data-to="' + m[1] + '" data-suf="' + m[2] + '">' + value + '</span>' : value;
  return '<div class="col-6 col-md-4 col-xl-2"><div class="neu-card sm stat ' + (cls || '') + '"><div class="label"><span>' + label + '</span><span class="ico"><i class="bi ' + icon + '"></i></span></div><div class="value">' + v + (unit ? '<small>' + unit + '</small>' : '') + '</div></div></div>';
}
function renderDashboard(d) {
  const chartCard = (id, title, col) => '<div class="col-lg-' + (col || 6) + '"><div class="neu-card h-100"><h3 class="mb-2">' + title + '</h3><div class="chart-box"><canvas id="' + id + '"></canvas></div></div></div>';
  gId('dashBody').innerHTML =
    '<div class="row g-3 mb-3 stagger">' +
    statCard('Total Peserta', 'bi-people', d.totalPeserta, '', '') + statCard('Sudah Tes', 'bi-check2-square', d.sudahTes, '', '') +
    statCard('Rata-rata Nilai', 'bi-speedometer', fmtNum(d.rataRata), '/100', '') + statCard('Nilai Tertinggi', 'bi-trophy', fmtNum(d.tertinggi), '', '') +
    statCard('Tingkat Lulus', 'bi-patch-check', d.tingkatLulus + '%', '', '') + statCard('Esai Belum Dinilai', 'bi-hourglass-split', d.esaiBelumDinilai, '', d.esaiBelumDinilai ? 'warn' : '') + '</div>' +
    '<div class="row g-3 mb-3 stagger">' + chartCard('chDept', 'Rata-rata Nilai per Departemen') + chartCard('chCrew', 'Rata-rata Nilai per Crew') + chartCard('chKat', 'Kontraktor vs KPC (jumlah peserta)') + chartCard('chTren', 'Tren Nilai per Tanggal Tes') + chartCard('chAlat', 'Rata-rata Nilai per Kategori Alat', 12) + '</div>' +
    '<div class="row g-3 mb-3"><div class="col-lg-5"><div class="insight h-100"><h3><i class="bi bi-lightbulb"></i> Analisis Otomatis</h3><ul>' + d.insights.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></div></div>' +
    '<div class="col-lg-7"><div class="neu-card h-100"><div class="d-flex justify-content-between align-items-center mb-2"><h3>Hasil Terbaru</h3><a href="javascript:void(0)" onclick="navigateTo(\'hasil\')">Lihat semua</a></div><div id="recentBox">' + skeletonHtml(4) + '</div></div></div></div>';
  countUp(gId('dashBody'));
  const c = chartColors(), P = c.palette;
  const barOpts = (horizontal) => ({ responsive: true, maintainAspectRatio: false, indexAxis: horizontal ? 'y' : 'x', plugins: { legend: { display: false } }, scales: { x: { grid: { color: c.grid }, ticks: { color: c.text } }, y: { beginAtZero: true, max: horizontal ? undefined : 100, grid: { color: c.grid }, ticks: { color: c.text } } } });
  const bar = (id, arr, horizontal) => {
    if (!arr.length) { gId(id).parentNode.innerHTML = emptyHtml('bi-bar-chart', 'Belum ada nilai akhir'); return; }
    makeChart(id, { type: 'bar', data: { labels: arr.map(a => a.label), datasets: [{ label: 'Rata-rata', data: arr.map(a => a.rata), backgroundColor: P[0], borderRadius: 8 }] }, options: barOpts(horizontal) });
  };
  bar('chDept', d.perDepartemen); bar('chCrew', d.perCrew); bar('chAlat', d.perKategoriAlat, true);
  const kt = d.pesertaPerKategori;
  if (!kt.some(k => k.jumlah)) gId('chKat').parentNode.innerHTML = emptyHtml('bi-pie-chart', 'Belum ada peserta yang selesai');
  else makeChart('chKat', { type: 'doughnut', data: { labels: kt.map(k => k.label), datasets: [{ data: kt.map(k => k.jumlah), backgroundColor: [P[0], P[1]], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: c.text } } } } });
  if (!d.tren.length) gId('chTren').parentNode.innerHTML = emptyHtml('bi-graph-up', 'Belum ada tren');
  else makeChart('chTren', { type: 'line', data: { labels: d.tren.map(t => fmtTgl(t.label)), datasets: [{ label: 'Rata-rata', data: d.tren.map(t => t.rata), borderColor: P[1], backgroundColor: P[1], tension: .3, pointRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: c.grid }, ticks: { color: c.text } }, y: { beginAtZero: true, max: 100, grid: { color: c.grid }, ticks: { color: c.text } } } } });
  ensureHasil().then(() => {
    const box = gId('recentBox'); if (!box) return;
    const rows = S.data.hasil.rows.slice(0, 5);
    box.innerHTML = rows.length ? '<div class="table-wrap"><table class="neu-table" style="min-width:420px"><thead><tr><th>Nama</th><th>Departemen</th><th>Nilai</th><th>Status</th></tr></thead><tbody>' + rows.map(r => '<tr><td><b>' + esc(r.Nama) + '</b><div class="cell-sub">' + esc(r.PesertaID) + '</div></td><td>' + esc(r.Departemen) + '</td><td>' + scoreHtml(r.NilaiAkhir !== null ? r.NilaiAkhir : r.NilaiPG, S.data.hasil.nilaiLulus) + (r.NilaiAkhir === null ? ' <span class="cell-sub">(PG)</span>' : '') + '</td><td>' + statusPill(r.Status) + '</td></tr>').join('') + '</tbody></table></div>' : emptyHtml('bi-inbox', 'Belum ada hasil tes');
  }).catch(() => { const b = gId('recentBox'); if (b) b.innerHTML = emptyHtml('bi-inbox', 'Tidak dapat memuat hasil'); });
}

// ── Bank Soal ──
async function loadSoal(force) {
  if (S.data.soal && !force) return renderSoalTable();
  gId('soalTable').innerHTML = skeletonHtml();
  try { S.data.soal = (await api('getBankSoal', S.token)).data; renderSoalTable(); markFresh('soalTable'); }
  catch (e) { gId('soalTable').innerHTML = emptyHtml('bi-exclamation-triangle', esc(e.message)); }
}
function renderSoalTable() {
  const q = gId('fsSearch').value.trim().toLowerCase(), k = gId('fsKategori').value, t = gId('fsTipe').value, st = gId('fsStatus').value;
  const rows = (S.data.soal || []).filter(r => (!k || r.KategoriAlat === k) && (!t || r.Tipe === t) && (!st || r.Status === st) && (!q || (r.Pertanyaan + ' ' + r.ID).toLowerCase().includes(q)));
  const maxP = Math.max(1, Math.ceil(rows.length / PER_PAGE)); if (soalPage > maxP) soalPage = maxP;
  const page = paginate(rows, soalPage);
  gId('soalTable').innerHTML = rows.length ? '<div class="table-wrap"><table class="neu-table"><thead><tr><th>ID</th><th>Kategori alat</th><th>Tipe</th><th>Pertanyaan</th><th>Gambar</th><th>Kunci</th><th>Status</th><th class="num">Aksi</th></tr></thead><tbody>' +
    page.map(r => '<tr><td class="cell-sub">' + esc(r.ID) + '</td><td>' + esc(r.KategoriAlat) + '</td><td><span class="pill ' + (r.Tipe === 'Esai' ? 'amber' : 'neutral') + '">' + esc(r.Tipe) + '</span></td><td style="max-width:360px">' + esc(String(r.Pertanyaan).length > 110 ? String(r.Pertanyaan).slice(0, 110) + '…' : r.Pertanyaan) + '</td><td>' + (r.GambarId ? '<img class="img-thumb" src="' + driveImg(r.GambarId, 120) + '" alt="Gambar soal" onclick="showImage(\'' + driveImg(r.GambarId, 1200) + '\')">' : '<span class="text-muted-2">–</span>') + '</td><td><b>' + esc(r.Kunci || '–') + '</b></td><td><label class="neu-switch"><input type="checkbox" ' + (r.Status === 'Aktif' ? 'checked' : '') + ' onchange="toggleSoalStatus(\'' + esc(r.ID) + '\',this)" aria-label="Status aktif soal ' + esc(r.ID) + '"><span class="track"></span></label></td><td><div class="row-actions"><button class="btn-neu icon sm" type="button" onclick="openSoalForm(\'' + esc(r.ID) + '\')" aria-label="Ubah soal"><i class="bi bi-pencil"></i></button><button class="btn-neu icon sm danger" type="button" onclick="deleteSoalConfirm(\'' + esc(r.ID) + '\')" aria-label="Hapus soal"><i class="bi bi-trash"></i></button></div></td></tr>').join('') + '</tbody></table></div>' : emptyHtml('bi-journal-x', 'Belum ada soal yang cocok. Klik “Tambah Soal” atau “Impor CSV”.');
  renderPager('soalPager', rows.length, soalPage, p => { soalPage = p; renderSoalTable(); });
}
async function toggleSoalStatus(id, input) {
  const row = S.data.soal.find(r => r.ID === id); const newStatus = input.checked ? 'Aktif' : 'Nonaktif';
  row.Status = newStatus;  // optimistic UI
  try { await api('setStatusSoal', S.token, id, newStatus); toast('Berhasil', 'Soal ' + id + ' ' + newStatus.toLowerCase() + '.', 'success'); }
  catch (e) { row.Status = newStatus === 'Aktif' ? 'Nonaktif' : 'Aktif'; input.checked = row.Status === 'Aktif'; toast('Gagal', e.message, 'danger'); }
}
function deleteSoalConfirm(id) {
  confirmBox('Hapus soal?', 'Soal <b>' + esc(id) + '</b> akan dihapus permanen. Disarankan menonaktifkan soal agar riwayat penilaian esai tetap utuh.', 'Hapus', async () => {
    try { await api('deleteSoal', S.token, id); S.data.soal = S.data.soal.filter(r => r.ID !== id); renderSoalTable(); toast('Berhasil', 'Soal dihapus.', 'success'); }
    catch (e) { toast('Gagal', e.message, 'danger'); }
  }, true);
}

// ── Form Soal ──
const SF = { tipe: 'Pilihan Ganda', kunci: '', gambarId: '', pending: null };
function setTipe(t) {
  SF.tipe = t;
  gId('segPG').classList.toggle('active', t === 'Pilihan Ganda'); gId('segEsai').classList.toggle('active', t === 'Esai');
  show('optSection', t === 'Pilihan Ganda'); renderSoalPreview();
}
function setKunci(k) { SF.kunci = k; document.querySelectorAll('#optSection .letter').forEach(b => b.classList.toggle('key', b.dataset.k === k)); renderSoalPreview(); }
function renderDrop() {
  const src = SF.pending ? SF.pending.dataUrl : (SF.gambarId ? driveImg(SF.gambarId, 600) : '');
  gId('sDropInner').innerHTML = src ? '<img src="' + src + '" alt="Pratinjau gambar">' : '<i class="bi bi-cloud-arrow-up fs-2"></i><div>Klik untuk memilih gambar (PNG/JPG/WEBP, maks 4 MB)</div>';
  show('btnHapusGambar', !!src);
}
async function onSoalImage(input) {
  const f = input.files[0]; input.value = '';
  try { checkImageFile(f); SF.pending = { ...(await readFileAsBase64(f)), name: f.name, mime: f.type }; renderDrop(); renderSoalPreview(); }
  catch (e) { toast('Peringatan', e.message, 'warning'); }
}
function clearSoalImage() { SF.pending = null; SF.gambarId = ''; renderDrop(); renderSoalPreview(); }
function openSoalForm(id) {
  const r = id ? S.data.soal.find(x => x.ID === id) : null;
  SF.pending = null; setErr('errSoal', '');
  gId('soalFormTitle').textContent = r ? 'Ubah Soal' : 'Buat Soal'; gId('sId').value = r ? r.ID : '';
  gId('sKategori').value = r ? r.KategoriAlat : S.meta.kategoriAlat[0];
  gId('sPertanyaan').value = r ? r.Pertanyaan : '';
  ['A', 'B', 'C', 'D'].forEach(k => gId('sOpsi' + k).value = r ? (r['Opsi' + k] || '') : '');
  gId('sStatus').checked = r ? r.Status === 'Aktif' : true;
  SF.gambarId = r ? (r.GambarId || '') : ''; SF.kunci = r ? (r.Kunci || '') : '';
  setTipe(r ? r.Tipe : 'Pilihan Ganda'); setKunci(SF.kunci); renderDrop(); navigateTo('soalform');
}
function renderSoalPreview() {
  const img = SF.pending ? SF.pending.dataUrl : (SF.gambarId ? driveImg(SF.gambarId, 800) : '');
  const letters = ['A', 'B', 'C', 'D'];
  const body = SF.tipe === 'Esai'
    ? '<div class="essay-box"><div class="neu-textarea" style="min-height:120px;color:var(--muted)">Peserta menulis jawaban esai di sini…</div></div>'
    : '<div class="opt-list">' + letters.map(k => '<div class="opt' + (SF.kunci === k ? ' selected' : '') + '"><span class="letter">' + k + '</span><span>' + (esc(gId('sOpsi' + k).value) || '<span class="text-muted-2">Opsi ' + k + '</span>') + '</span></div>').join('') + '</div>';
  gId('soalPreview').innerHTML = '<div class="q-head"><span class="pill ' + (SF.tipe === 'Esai' ? 'amber' : 'navy') + '">' + (SF.tipe === 'Esai' ? 'ESAI' : 'PILIHAN GANDA') + '</span><span class="pill neutral">' + esc(gId('sKategori').value) + '</span></div><div class="q-text" style="font-size:16px;line-height:26px">' + (esc(gId('sPertanyaan').value) || '<span class="text-muted-2">Teks pertanyaan akan tampil di sini…</span>') + '</div>' + (img ? '<div class="q-img"><img src="' + img + '" alt="Gambar soal"></div>' : '') + body;
}
async function saveSoalForm() {
  setErr('errSoal', '');
  const o = { ID: gId('sId').value, KategoriAlat: gId('sKategori').value, Tipe: SF.tipe, Pertanyaan: gId('sPertanyaan').value, GambarId: SF.gambarId, Kunci: SF.kunci, Status: gId('sStatus').checked ? 'Aktif' : 'Nonaktif' };
  ['A', 'B', 'C', 'D'].forEach(k => o['Opsi' + k] = gId('sOpsi' + k).value);
  if (!o.Pertanyaan.trim()) return setErr('errSoal', 'Teks pertanyaan wajib diisi.');
  if (o.Tipe === 'Pilihan Ganda') {
    for (const k of ['A', 'B', 'C', 'D']) if (!o['Opsi' + k].trim()) return setErr('errSoal', 'Opsi ' + k + ' wajib diisi.');
    if (!o.Kunci) return setErr('errSoal', 'Tandai kunci jawaban dengan mengklik salah satu huruf.');
  }
  try {
    await withBusy(gId('btnSimpanSoal'), async () => {
      if (SF.pending) { const up = await api('uploadGambar', S.token, SF.pending.base64, SF.pending.name, SF.pending.mime); o.GambarId = up.data.fileId; }
      const res = await api('saveSoal', S.token, o);
      toast('Berhasil', res.message, 'success');
    });
    S.data.soal = null; navigateTo('banksoal');
  } catch (e) { setErr('errSoal', e.message); }
}

// ── Impor CSV (peserta & soal) ──
const IMPORT = {
  peserta: { title: 'Impor Peserta', headers: ['ID', 'Nama', 'Kategori', 'Departemen', 'Crew', 'TanggalTes'], help: 'Kolom: <b>ID, Nama, Kategori</b> (Kontraktor/KPC), <b>Departemen</b>, <b>Crew</b> (A/B/C), <b>TanggalTes</b> (YYYY-MM-DD). ID yang sudah ada dilewati.', sample: ['OPR-9001', 'Contoh Peserta', 'KPC', 'Jupiter', 'A', todayISO()], fn: 'importPeserta' },
  soal: { title: 'Impor Soal', headers: ['KategoriAlat', 'Tipe', 'Pertanyaan', 'OpsiA', 'OpsiB', 'OpsiC', 'OpsiD', 'Kunci'], help: 'Kolom: <b>KategoriAlat</b>, <b>Tipe</b> (Pilihan Ganda/Esai), <b>Pertanyaan</b>, <b>OpsiA–OpsiD</b> dan <b>Kunci</b> (A–D) khusus pilihan ganda. Kosongkan opsi/kunci untuk esai. Maks. 500 baris.', sample: ['Dump Truck', 'Pilihan Ganda', 'Contoh pertanyaan?', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'B'], fn: 'importSoal' }
};
let importKind = null, importRows = [];
function openImport(kind) {
  importKind = kind; importRows = [];
  gId('miTitle').textContent = IMPORT[kind].title; gId('miHelp').innerHTML = IMPORT[kind].help;
  gId('miText').value = ''; gId('miFile').value = ''; gId('miPreview').innerHTML = ''; gId('miSubmit').disabled = true;
  modal('mdlImport').show();
}
function downloadTemplate() { const c = IMPORT[importKind]; downloadFile('templat_' + importKind + '.csv', c.headers.map(csvCell).join(',') + '\n' + c.sample.map(csvCell).join(',') + '\n'); }
function onImportFile(input) {
  const f = input.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => { gId('miText').value = r.result; previewImport(); }; r.readAsText(f);
}
function previewImport() {
  const cfg = IMPORT[importKind], rows = parseCSV(gId('miText').value);
  importRows = []; gId('miSubmit').disabled = true;
  if (rows.length < 2) { gId('miPreview').innerHTML = rows.length ? '<div class="field-error">Tidak ada baris data di bawah header.</div>' : ''; return; }
  const head = rows[0].map(h => h.trim());
  const missing = cfg.headers.filter(h => head.indexOf(h) < 0);
  if (missing.length) { gId('miPreview').innerHTML = '<div class="field-error"><i class="bi bi-exclamation-circle"></i> Header kurang: ' + esc(missing.join(', ')) + '</div>'; return; }
  importRows = rows.slice(1).map(r => { const o = {}; head.forEach((h, i) => o[h] = (r[i] || '').trim()); return o; });
  gId('miPreview').innerHTML = '<div class="pill ok mb-2">' + importRows.length + ' baris siap diimpor</div><div class="table-wrap"><table class="neu-table" style="min-width:480px"><thead><tr>' + cfg.headers.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + importRows.slice(0, 5).map(o => '<tr>' + cfg.headers.map(h => '<td>' + esc(String(o[h]).slice(0, 60)) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  gId('miSubmit').disabled = false;
}
async function submitImport() {
  try {
    const res = await withBusy(gId('miSubmit'), () => api(IMPORT[importKind].fn, S.token, importRows));
    const d = res.data;
    if (d.gagal) toast('Impor sebagian', d.ditambah + ' berhasil, ' + d.gagal + ' gagal. Contoh: baris ' + d.errors[0].baris + ' — ' + d.errors[0].pesan, 'warning');
    else toast('Berhasil', res.message, 'success');
    modal('mdlImport').hide();
    if (importKind === 'soal') { S.data.soal = null; loadSoal(true); } else { S.data.peserta = null; loadPeserta(true); }
  } catch (e) { toast('Gagal', e.message, 'danger'); }
}

// ── Sinkronisasi data yang diketik langsung di Google Sheets ──
async function syncSpreadsheet(btn) {
  try {
    const res = await withBusy(btn, () => api('sinkronkanSpreadsheet', S.token));
    S.data.soal = null; S.data.peserta = null; S.dash = null;
    showSyncReport(res.data);
    if (S.section === 'banksoal') loadSoal(true);
    if (S.section === 'peserta') loadPeserta(true);
  } catch (e) { toast('Gagal sinkronisasi', e.message, 'danger'); }
}
function showSyncReport(d) {
  const per = d.soal.perKategori, probs = d.peserta.problems.concat(d.soal.problems);
  gId('syncBody').innerHTML =
    '<div class="row g-3 mb-3"><div class="col-md-4"><div class="neu-card sm stat"><div class="label"><span>Peserta terbaca</span></div><div class="value">' + d.peserta.total + '</div><div class="caption">' + d.peserta.perbaikan + ' baris dirapikan otomatis</div></div></div>' +
    '<div class="col-md-4"><div class="neu-card sm stat"><div class="label"><span>Soal terbaca</span></div><div class="value">' + d.soal.total + '</div><div class="caption">' + d.soal.idBaru + ' ID baru dibuat otomatis</div></div></div>' +
    '<div class="col-md-4"><div class="neu-card sm stat ' + (probs.length ? 'warn' : '') + '"><div class="label"><span>Perlu diperiksa</span></div><div class="value">' + probs.length + '</div><div class="caption">baris dilewati / bermasalah</div></div></div></div>' +
    '<h3 class="mb-2">Soal per kategori</h3><div class="table-wrap mb-3"><table class="neu-table" style="min-width:420px"><thead><tr><th>Kategori alat</th><th class="num">Pilihan ganda</th><th class="num">Esai</th><th class="num">Aktif</th></tr></thead><tbody>' +
    Object.keys(per).map(k => '<tr><td>' + esc(k) + '</td><td class="num">' + per[k].pg + '</td><td class="num">' + per[k].esai + '</td><td class="num">' + per[k].aktif + '</td></tr>').join('') + '</tbody></table></div>' +
    (probs.length ? '<h3 class="mb-2">Baris yang perlu diperbaiki di Spreadsheet</h3><ul class="mb-0">' + probs.map(p => '<li><b>' + esc(p.sheet) + '</b>, baris ' + p.baris + ': ' + esc(p.pesan) + '</li>').join('') + '</ul>' : '<div class="pill ok"><i class="bi bi-check-circle"></i> Semua baris valid</div>');
  modal('mdlSync').show();
}

// ── Peserta ──
async function ensureHasil(force) { if (!S.data.hasil || force) S.data.hasil = (await api('getHasil', S.token)).data; return S.data.hasil; }
async function loadPeserta(force) {
  if (S.data.peserta && !force) return renderPesertaTable();
  gId('pesertaTable').innerHTML = skeletonHtml();
  try { S.data.peserta = (await api('getPeserta', S.token)).data; renderPesertaTable(); markFresh('pesertaTable'); ensureHasil().then(renderPesertaTable).catch(() => { }); }
  catch (e) { gId('pesertaTable').innerHTML = emptyHtml('bi-exclamation-triangle', esc(e.message)); }
}
function lastScoreMap() {
  const m = {}; if (!S.data.hasil) return m;
  S.data.hasil.rows.forEach(r => { if (!m[r.PesertaID]) m[r.PesertaID] = r; });
  return m;
}
function renderPesertaTable() {
  const q = gId('fpSearch').value.trim().toLowerCase(), k = gId('fpKategori').value, d = gId('fpDept').value, c = gId('fpCrew').value, t = gId('fpTanggal').value;
  const rows = (S.data.peserta || []).filter(r => (!k || r.Kategori === k) && (!d || r.Departemen === d) && (!c || r.Crew === c) && (!t || r.TanggalTes === t) && (!q || (r.Nama + ' ' + r.ID).toLowerCase().includes(q)));
  const maxP = Math.max(1, Math.ceil(rows.length / PER_PAGE)); if (pesertaPage > maxP) pesertaPage = maxP;
  const last = lastScoreMap(), lulus = S.data.hasil ? S.data.hasil.nilaiLulus : 75, admin = S.role === 'admin';
  gId('pesertaTable').innerHTML = rows.length ? '<div class="table-wrap"><table class="neu-table"><thead><tr><th>ID</th><th>Nama</th><th>Kategori</th><th>Departemen</th><th>Crew</th><th>Tanggal tes</th><th>Nilai terakhir</th><th class="num">Aksi</th></tr></thead><tbody>' +
    paginate(rows, pesertaPage).map(r => { const l = last[r.ID]; return '<tr><td><b>' + esc(r.ID) + '</b></td><td>' + esc(r.Nama) + '</td><td>' + katPill(r.Kategori) + '</td><td>' + esc(r.Departemen) + '</td><td><span class="pill neutral">' + esc(r.Crew) + '</span></td><td>' + fmtTgl(r.TanggalTes) + '</td><td>' + (l ? scoreHtml(l.NilaiAkhir !== null ? l.NilaiAkhir : l.NilaiPG, lulus) + (l.NilaiAkhir === null ? ' <span class="cell-sub">(PG)</span>' : '') : '<span class="text-muted-2">–</span>') + '</td><td><div class="row-actions"><button class="btn-neu icon sm" type="button" onclick="showPesertaDetail(\'' + esc(r.ID) + '\')" aria-label="Detail peserta"><i class="bi bi-eye"></i></button>' + (admin ? '<button class="btn-neu icon sm" type="button" onclick="openPesertaModal(\'' + esc(r.ID) + '\')" aria-label="Ubah peserta"><i class="bi bi-pencil"></i></button><button class="btn-neu icon sm danger" type="button" onclick="deletePesertaConfirm(\'' + esc(r.ID) + '\')" aria-label="Hapus peserta"><i class="bi bi-trash"></i></button>' : '') + '</div></td></tr>'; }).join('') + '</tbody></table></div>' : emptyHtml('bi-person-x', 'Tidak ada peserta yang cocok.');
  renderPager('pesertaPager', rows.length, pesertaPage, p => { pesertaPage = p; renderPesertaTable(); });
}
let pesertaEditId = null;
function openPesertaModal(id) {
  const r = id ? S.data.peserta.find(x => x.ID === id) : null; pesertaEditId = id || null; setErr('errPeserta2', '');
  gId('mpTitle').textContent = r ? 'Ubah Peserta' : 'Tambah Peserta';
  gId('mpId').value = r ? r.ID : ''; gId('mpId').disabled = !!r; gId('mpNama').value = r ? r.Nama : '';
  gId('mpKategori').value = r ? r.Kategori : S.meta.kategoriPeserta[0]; gId('mpDept').value = r ? r.Departemen : S.meta.departemen[0];
  gId('mpCrew').value = r ? r.Crew : S.meta.crew[0]; gId('mpTanggal').value = r ? r.TanggalTes : todayISO();
  modal('mdlPeserta').show();
}
async function savePesertaModal() {
  const p = { ID: gId('mpId').value.trim(), Nama: gId('mpNama').value.trim(), Kategori: gId('mpKategori').value, Departemen: gId('mpDept').value, Crew: gId('mpCrew').value, TanggalTes: gId('mpTanggal').value };
  if (!p.ID || !p.Nama || !p.TanggalTes) return setErr('errPeserta2', 'ID, nama, dan tanggal tes wajib diisi.');
  try {
    const res = await withBusy(gId('mpSave'), () => api('savePeserta', S.token, p, !pesertaEditId));
    toast('Berhasil', res.message, 'success'); modal('mdlPeserta').hide(); S.data.peserta = null; loadPeserta(true);
  } catch (e) { setErr('errPeserta2', e.message); }
}
function deletePesertaConfirm(id) {
  confirmBox('Hapus peserta?', 'Peserta <b>' + esc(id) + '</b> akan dihapus. Riwayat hasil tetap tersimpan.', 'Hapus', async () => {
    try { await api('deletePeserta', S.token, id); S.data.peserta = S.data.peserta.filter(r => r.ID !== id); renderPesertaTable(); toast('Berhasil', 'Peserta dihapus.', 'success'); }
    catch (e) { toast('Gagal', e.message, 'danger'); }
  }, true);
}
async function showPesertaDetail(id) {
  const p = S.data.peserta.find(r => r.ID === id); if (!p) return;
  gId('mdBody').innerHTML = skeletonHtml(3); modal('mdlDetail').show();
  try {
    const h = await ensureHasil(); const rows = h.rows.filter(r => r.PesertaID === id);
    gId('mdBody').innerHTML = '<div class="neu-card sm mb-3"><div class="kv"><div><div class="k">Nama</div><div class="v">' + esc(p.Nama) + '</div></div><div><div class="k">ID</div><div class="v">' + esc(p.ID) + '</div></div><div><div class="k">Kategori</div><div class="v">' + katPill(p.Kategori) + '</div></div><div><div class="k">Departemen / Crew</div><div class="v">' + esc(p.Departemen) + ' · Crew ' + esc(p.Crew) + '</div></div><div><div class="k">Tanggal tes</div><div class="v">' + fmtTgl(p.TanggalTes) + '</div></div></div></div><h3 class="mb-2">Riwayat Tes</h3>' +
      (rows.length ? '<div class="table-wrap"><table class="neu-table" style="min-width:520px"><thead><tr><th>Tanggal</th><th>Alat</th><th>Nilai PG</th><th>Nilai Esai</th><th>Nilai Akhir</th><th>Pelanggaran</th><th>Status</th></tr></thead><tbody>' + rows.map(r => '<tr><td>' + fmtTgl(r.TanggalTes) + '</td><td>' + esc(r.KategoriAlat) + '</td><td>' + scoreHtml(r.NilaiPG, h.nilaiLulus) + '</td><td>' + scoreHtml(r.NilaiEsai, h.nilaiLulus) + '</td><td>' + (r.NilaiAkhir === null ? esaiPill(r.StatusEsai) : scoreHtml(r.NilaiAkhir, h.nilaiLulus)) + '</td><td>' + esc(r.Pelanggaran) + '</td><td>' + statusPill(r.Status) + '</td></tr>').join('') + '</tbody></table></div>' : emptyHtml('bi-clipboard', 'Belum ada riwayat tes.'));
  } catch (e) { gId('mdBody').innerHTML = emptyHtml('bi-exclamation-triangle', esc(e.message)); }
}

// ── Hasil ──
async function loadHasil(force, quiet) {
  if (S.data.hasil && !force) { afterHasilLoaded(); return; }
  if (!quiet && S.section === 'hasil') gId('hasilTable').innerHTML = skeletonHtml();
  if (!quiet && S.section === 'esai') gId('esaiTable').innerHTML = skeletonHtml();
  try { S.data.hasil = (await api('getHasil', S.token)).data; afterHasilLoaded(); }
  catch (e) { if (!quiet) { const id = S.section === 'esai' ? 'esaiTable' : 'hasilTable'; if (gId(id)) gId(id).innerHTML = emptyHtml('bi-exclamation-triangle', esc(e.message)); } }
}
function afterHasilLoaded() {
  updateEsaiBadge();
  if (S.section === 'hasil') { renderHasilTable(); markFresh('hasilTable'); }
  if (S.section === 'esai') { renderEsaiKpi(); renderEsaiTable(); markFresh('esaiTable'); }
}
function filteredHasil() {
  const q = gId('fhSearch').value.trim().toLowerCase(), kat = gId('fhKategori').value, d = gId('fhDept').value, c = gId('fhCrew').value, a = gId('fhAlat').value, from = gId('fhDari').value, to = gId('fhSampai').value;
  const rows = S.data.hasil.rows.filter(r => (!kat || r.Kategori === kat) && (!d || r.Departemen === d) && (!c || r.Crew === c) && (!a || r.KategoriAlat === a) && (!from || r.TanggalTes >= from) && (!to || r.TanggalTes <= to) && (!q || (r.Nama + ' ' + r.PesertaID).toLowerCase().includes(q)));
  const k = hasilSort.key, dir = hasilSort.dir;
  return rows.sort((x, y) => { const a1 = x[k] === null ? -Infinity : x[k], b1 = y[k] === null ? -Infinity : y[k]; return (a1 > b1 ? 1 : a1 < b1 ? -1 : 0) * dir; });
}
function sortHasil(key) { hasilSort = { key, dir: hasilSort.key === key ? -hasilSort.dir : -1 }; renderHasilTable(); }
function renderHasilTable() {
  if (!S.data.hasil) return;
  const lulus = S.data.hasil.nilaiLulus, rows = filteredHasil();
  const maxP = Math.max(1, Math.ceil(rows.length / PER_PAGE)); if (hasilPage > maxP) hasilPage = maxP;
  const vals = rows.filter(r => r.NilaiAkhir !== null).map(r => r.NilaiAkhir);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  gId('hasilSummary').innerHTML = [['Rata-rata', 'bi-speedometer', avg === null ? '–' : fmtNum(avg)], ['Tertinggi', 'bi-arrow-up-circle', vals.length ? fmtNum(Math.max(...vals)) : '–'], ['Terendah', 'bi-arrow-down-circle', vals.length ? fmtNum(Math.min(...vals)) : '–'], ['Jumlah Peserta', 'bi-people', rows.length]].map(s => statCard(s[0], s[1], s[2], '', '').replace('col-6 col-md-4 col-xl-2', 'col-6 col-lg-3')).join('');
  const bins = Array(10).fill(0); vals.forEach(v => bins[Math.min(9, Math.floor(v / 10))]++);
  const c = chartColors();
  makeChart('chartDist', { type: 'bar', data: { labels: bins.map((_, i) => (i * 10) + '–' + (i === 9 ? 100 : i * 10 + 9)), datasets: [{ label: 'Peserta', data: bins, backgroundColor: bins.map((_, i) => i * 10 >= lulus ? c.palette[0] : c.palette[1]), borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: c.text } }, y: { beginAtZero: true, ticks: { precision: 0, color: c.text }, grid: { color: c.grid } } } } });
  const th = (key, label, num) => '<th class="sortable' + (num ? ' num' : '') + '" onclick="sortHasil(\'' + key + '\')" aria-sort="' + (hasilSort.key === key ? (hasilSort.dir > 0 ? 'ascending' : 'descending') : 'none') + '">' + label + (hasilSort.key === key ? (hasilSort.dir > 0 ? ' ▲' : ' ▼') : '') + '</th>';
  gId('hasilTable').innerHTML = rows.length ? '<div class="table-wrap"><table class="neu-table" style="min-width:1000px"><thead><tr>' + th('Nama', 'Nama') + th('Kategori', 'Kategori') + th('Departemen', 'Dept / Crew') + th('KategoriAlat', 'Alat') + th('TanggalTes', 'Tanggal tes') + th('NilaiPG', 'Nilai PG', 1) + th('NilaiEsai', 'Nilai esai', 1) + th('NilaiAkhir', 'Nilai akhir', 1) + th('Pelanggaran', 'Pelanggaran', 1) + th('Status', 'Status') + '</tr></thead><tbody>' +
    paginate(rows, hasilPage).map(r => '<tr><td><b>' + esc(r.Nama) + '</b><div class="cell-sub">' + esc(r.PesertaID) + '</div></td><td>' + katPill(r.Kategori) + '</td><td>' + esc(r.Departemen) + '<div class="cell-sub">Crew ' + esc(r.Crew) + '</div></td><td>' + esc(r.KategoriAlat) + '</td><td>' + fmtTgl(r.TanggalTes) + '</td><td class="num">' + scoreHtml(r.NilaiPG, lulus) + '</td><td class="num">' + scoreHtml(r.NilaiEsai, lulus) + '</td><td class="num">' + (r.NilaiAkhir === null ? esaiPill(r.StatusEsai === 'Tanpa esai' ? 'Tanpa esai' : 'Belum dinilai').replace('Belum dinilai', 'Menunggu penilaian') : scoreHtml(r.NilaiAkhir, lulus)) + '</td><td class="num"><span class="pill ' + (r.Pelanggaran >= 3 ? 'bad' : r.Pelanggaran > 0 ? 'warn' : 'neutral') + '">' + esc(r.Pelanggaran) + '</span></td><td>' + statusPill(r.Status) + '</td></tr>').join('') + '</tbody></table></div>' : emptyHtml('bi-clipboard-x', 'Belum ada hasil yang cocok dengan filter.');
  renderPager('hasilPager', rows.length, hasilPage, p => { hasilPage = p; renderHasilTable(); });
}
function exportHasilCSV() {
  if (!S.data.hasil) return toast('Peringatan', 'Data hasil belum dimuat.', 'warning');
  const rows = filteredHasil(); if (!rows.length) return toast('Peringatan', 'Tidak ada data untuk diekspor.', 'warning');
  const head = ['ID Peserta', 'Nama', 'Kategori', 'Departemen', 'Crew', 'Kategori Alat', 'Tanggal Tes', 'Nilai PG', 'Benar', 'Salah', 'Nilai Esai', 'Status Esai', 'Nilai Akhir', 'Pelanggaran', 'Status'];
  const lines = [head.map(csvCell).join(',')].concat(rows.map(r => [r.PesertaID, r.Nama, r.Kategori, r.Departemen, r.Crew, r.KategoriAlat, r.TanggalTes, r.NilaiPG, r.JumlahBenar, r.JumlahSalah, r.NilaiEsai, r.StatusEsai, r.NilaiAkhir, r.Pelanggaran, r.Status].map(csvCell).join(',')));
  downloadFile('hasil_tes_' + todayISO() + '.csv', lines.join('\n') + '\n');
  toast('Berhasil', rows.length + ' baris diekspor.', 'success');
}

// ── Penilaian Esai ──
const hasEsai = r => r.StatusEsai && r.StatusEsai !== 'Tanpa esai';
const esaiPending = r => r.StatusEsai === 'Belum dinilai' || r.StatusEsai === 'Draft';
function updateEsaiBadge() {
  const b = gId('esaiBadge'); if (!b || !S.data.hasil) return;
  const n = S.data.hasil.rows.filter(esaiPending).length; b.textContent = n; b.classList.toggle('hidden', n === 0);
}
function renderEsaiKpi() {
  const rows = S.data.hasil.rows.filter(hasEsai), done = rows.filter(r => r.StatusEsai === 'Sudah dinilai'), pend = rows.filter(esaiPending);
  const avg = done.length ? done.reduce((a, r) => a + (r.NilaiEsai || 0), 0) / done.length : null;
  gId('esaiKpi').classList.add('stagger');
  gId('esaiKpi').innerHTML = [['Total Esai Masuk', 'bi-file-earmark-text', rows.length, '', ''], ['Belum Dinilai', 'bi-hourglass-split', pend.length, '', pend.length ? 'warn' : ''], ['Sudah Dinilai', 'bi-check2-circle', done.length, '', ''], ['Rata-rata Skor Esai', 'bi-speedometer', fmtNum(avg), '/100', '']].map(s => statCard(s[0], s[1], s[2], s[3], s[4]).replace('col-6 col-md-4 col-xl-2', 'col-6 col-lg-3')).join('');
  countUp(gId('esaiKpi'));
}
function renderEsaiTable() {
  if (!S.data.hasil) return;
  const q = gId('feSearch').value.trim().toLowerCase(), a = gId('feAlat').value, st = gId('feStatus').value;
  const rows = S.data.hasil.rows.filter(r => hasEsai(r) && (!a || r.KategoriAlat === a) && (!st || (st === 'pending' ? esaiPending(r) : r.StatusEsai === 'Sudah dinilai')) && (!q || (r.Nama + ' ' + r.PesertaID).toLowerCase().includes(q)));
  const maxP = Math.max(1, Math.ceil(rows.length / PER_PAGE)); if (esaiPage > maxP) esaiPage = maxP;
  const lulus = S.data.hasil.nilaiLulus;
  gId('esaiTable').innerHTML = rows.length ? '<div class="table-wrap"><table class="neu-table" style="min-width:760px"><thead><tr><th>Peserta</th><th>Kategori alat</th><th>Tanggal tes</th><th class="num">Nilai PG</th><th>Status esai</th><th class="num">Aksi</th></tr></thead><tbody>' +
    paginate(rows, esaiPage).map(r => '<tr><td><b>' + esc(r.Nama) + '</b><div class="cell-sub">' + esc(r.PesertaID) + ' · ' + esc(r.Departemen) + ' · Crew ' + esc(r.Crew) + '</div></td><td>' + esc(r.KategoriAlat) + '</td><td>' + fmtTgl(r.TanggalTes) + '</td><td class="num">' + scoreHtml(r.NilaiPG, lulus) + '</td><td>' + esaiPill(r.StatusEsai) + (r.StatusEsai === 'Sudah dinilai' ? ' <span class="cell-sub">(' + fmtNum(r.NilaiEsai) + ')</span>' : '') + '</td><td><div class="row-actions"><button class="btn-neu sm ' + (r.StatusEsai === 'Sudah dinilai' ? '' : 'accent') + '" type="button" onclick="openEsaiDetail(\'' + esc(r.ID) + '\')">' + (r.StatusEsai === 'Sudah dinilai' ? 'Review nilai' : r.StatusEsai === 'Draft' ? 'Lanjutkan' : 'Nilai sekarang') + ' <i class="bi bi-arrow-right"></i></button></div></td></tr>').join('') + '</tbody></table></div>' : emptyHtml('bi-check2-all', st === 'pending' ? 'Tidak ada esai yang menunggu penilaian.' : 'Tidak ada data yang cocok.');
  renderPager('esaiPager', rows.length, esaiPage, p => { esaiPage = p; renderEsaiTable(); });
}

const ED = { data: null, idx: 0, vals: {} };
async function openEsaiDetail(hasilId) {
  navigateTo('esaidetail'); gId('edBody').innerHTML = skeletonHtml(6); gId('edSub').textContent = '';
  try {
    const res = await api('getEsaiDetail', S.token, hasilId); ED.data = res.data; ED.idx = 0; ED.vals = {};
    ED.data.esai.forEach(e => ED.vals[e.id] = { nilai: e.nilai === null ? '' : e.nilai, catatan: e.catatan || '' });
    renderEsaiDetail();
  } catch (e) { gId('edBody').innerHTML = emptyHtml('bi-exclamation-triangle', esc(e.message)); }
}
function renderEsaiDetail() {
  const d = ED.data, h = d.hasil; gId('edSub').textContent = h.nama + ' · ' + h.pesertaId;
  if (!d.esai.length) { gId('edBody').innerHTML = '<div class="neu-card">' + emptyHtml('bi-inbox', 'Peserta ini tidak memiliki jawaban esai.') + '</div>'; return; }
  const e = d.esai[ED.idx], v = ED.vals[e.id], readonly = h.statusEsai === 'Sudah dinilai';
  gId('edBody').innerHTML =
    '<div class="neu-card sm mb-3 d-flex flex-wrap gap-3 align-items-center justify-content-between"><div class="d-flex gap-2 flex-wrap align-items-center"><span class="pill navy"><i class="bi ' + (ICON_ALAT[h.kategoriAlat] || 'bi-gear') + '"></i> ' + esc(h.kategoriAlat) + '</span>' + katPill(h.kategori) + '<span class="pill neutral">' + esc(h.departemen) + ' · Crew ' + esc(h.crew) + '</span><span class="pill neutral">' + fmtTgl(h.tanggal) + '</span><span class="pill ' + (h.pelanggaran ? 'warn' : 'neutral') + '">Pelanggaran: ' + esc(h.pelanggaran) + '</span></div><div class="esai-tabs" role="tablist">' + d.esai.map((x, i) => '<button type="button" class="' + (i === ED.idx ? 'active' : '') + '" onclick="edGo(' + i + ')">Esai ' + (i + 1) + (ED.vals[x.id].nilai !== '' ? ' ✓' : '') + '</button>').join('') + '</div></div>' +
    '<div class="split"><div class="neu-card"><div class="caption mb-1">PERTANYAAN ' + (ED.idx + 1) + ' DARI ' + d.esai.length + '</div><div class="q-text" style="font-size:16px;line-height:26px;user-select:text">' + esc(e.pertanyaan) + '</div>' + (e.gambarId ? '<div class="q-img" onclick="showImage(\'' + driveImg(e.gambarId, 1400) + '\')"><img src="' + driveImg(e.gambarId, 900) + '" alt="Gambar soal"></div>' : '') + '<div class="field-label mt-4">Jawaban peserta <span class="caption">(hanya baca)</span></div><div class="answer-view">' + (e.jawaban ? esc(e.jawaban) : '<span class="text-muted-2">Peserta tidak menjawab soal ini.</span>') + '</div>' + (e.jawaban ? '<div class="caption mt-1">' + e.jawaban.length + ' karakter</div>' : '') + '</div>' +
    '<div class="neu-card"><h3 class="mb-3">Panel Penilai</h3><label class="field-label" for="edNilai">Nilai butir ini (0–100)</label><input type="number" min="0" max="100" step="0.5" class="neu-input score-input" id="edNilai" value="' + esc(v.nilai) + '" oninput="edInput()" ' + (readonly ? 'disabled' : '') + '>' +
    (readonly ? '' : '<div class="quick-scores">' + [0, 50, 60, 75, 85, 100].map(n => '<button type="button" class="btn-neu sm" onclick="edQuick(' + n + ')">' + n + '</button>').join('') + '</div>') +
    '<label class="field-label mt-3" for="edCatatan">Catatan penilai</label><textarea class="neu-textarea" id="edCatatan" maxlength="1000" oninput="edInput()" ' + (readonly ? 'disabled' : '') + '>' + esc(v.catatan) + '</textarea>' +
    '<div class="neu-inset p-3 mt-3" id="edSummary"></div>' +
    '<div class="d-flex justify-content-between mt-3"><button class="btn-neu sm" type="button" ' + (ED.idx === 0 ? 'disabled' : '') + ' onclick="edGo(' + (ED.idx - 1) + ')"><i class="bi bi-chevron-left"></i> Butir sebelumnya</button><button class="btn-neu sm" type="button" ' + (ED.idx >= d.esai.length - 1 ? 'disabled' : '') + ' onclick="edGo(' + (ED.idx + 1) + ')">Butir berikutnya <i class="bi bi-chevron-right"></i></button></div></div></div>' +
    (readonly ? '<div class="neu-card sm mt-3 pill ok" style="display:block"><i class="bi bi-lock"></i> Esai ini sudah ditandai selesai dinilai (nilai esai ' + fmtNum(h.nilaiEsai) + ', nilai akhir ' + fmtNum(h.nilaiAkhir) + ').</div>' : '<div class="sticky-actions"><button class="btn-neu" type="button" id="btnEdDraft" onclick="saveEsai(false)"><i class="bi bi-save"></i> Simpan Draf</button><button class="btn-neu primary" type="button" id="btnEdFinal" onclick="saveEsai(true)"><i class="bi bi-check2-circle"></i> Simpan &amp; Tandai Selesai Dinilai</button></div>');
  updateEdSummary();
}
function edGo(i) { edCommit(); ED.idx = Math.max(0, Math.min(ED.data.esai.length - 1, i)); renderEsaiDetail(); }
function edCommit() { const e = ED.data.esai[ED.idx], n = gId('edNilai'), c = gId('edCatatan'); if (e && n && !n.disabled) ED.vals[e.id] = { nilai: n.value === '' ? '' : Number(n.value), catatan: c.value }; }
function edInput() { edCommit(); updateEdSummary(); }
function edQuick(n) { gId('edNilai').value = n; edInput(); }
function updateEdSummary() {
  const d = ED.data, all = d.esai.map(e => ED.vals[e.id].nilai), filled = all.filter(v => v !== '' && !isNaN(v)).map(Number);
  const done = filled.length === all.length, avg = filled.length ? filled.reduce((a, b) => a + b, 0) / filled.length : null;
  const akhir = done && d.hasil.nilaiPG !== null ? d.hasil.nilaiPG * (100 - d.bobotEsai) / 100 + avg * d.bobotEsai / 100 : null;
  gId('edSummary').innerHTML = '<div class="d-flex justify-content-between"><span>Butir terisi</span><b>' + filled.length + ' / ' + all.length + '</b></div><div class="d-flex justify-content-between"><span>Nilai PG</span><b>' + fmtNum(d.hasil.nilaiPG) + '</b></div><div class="d-flex justify-content-between"><span>Rata-rata esai</span><b>' + fmtNum(avg) + '</b></div><div class="d-flex justify-content-between"><span>Estimasi nilai akhir (bobot esai ' + d.bobotEsai + '%)</span><b>' + (akhir === null ? '–' : fmtNum(akhir)) + '</b></div>' + (akhir === null ? '' : '<div class="mt-2"><span class="pill ' + (akhir >= d.nilaiLulus ? 'ok' : 'bad') + '">' + (akhir >= d.nilaiLulus ? 'Memenuhi batas lulus (' + d.nilaiLulus + ')' : 'Di bawah batas lulus (' + d.nilaiLulus + ')') + '</span></div>');
}
async function saveEsai(final) {
  edCommit();
  const d = ED.data, list = d.esai.map(e => ({ id: e.id, nilai: ED.vals[e.id].nilai, catatan: ED.vals[e.id].catatan }));
  if (list.some(x => x.nilai !== '' && (isNaN(x.nilai) || x.nilai < 0 || x.nilai > 100))) return toast('Peringatan', 'Nilai harus angka 0 sampai 100.', 'warning');
  if (final && list.some(x => x.nilai === '')) return toast('Peringatan', 'Semua butir esai wajib diberi nilai sebelum ditandai selesai.', 'warning');
  const run = async () => {
    try {
      const res = await withBusy(gId(final ? 'btnEdFinal' : 'btnEdDraft'), () => api('simpanNilaiEsai', S.token, d.hasil.id, list, final));
      toast('Berhasil', res.message, 'success');
      S.data.hasil = null; S.dash = null; await loadHasil(true, true);
      if (final) navigateTo('esai'); else { ED.data.hasil.statusEsai = 'Draft'; }
    } catch (e) { toast('Gagal', e.message, 'danger'); }
  };
  if (final) confirmBox('Tandai selesai dinilai?', 'Nilai akhir peserta akan dihitung dan tidak dapat diubah dari halaman ini setelahnya.', 'Ya, simpan', run); else run();
}

// ── Pengaturan & Akun ──
async function loadPengaturan() {
  try {
    const d = (await api('getPengaturan', S.token)).data;
    gId('setNama').value = d.appName; gId('setDurasi').value = d.durasiMenit; gId('setBatas').value = d.batasPelanggaran; gId('setPG').value = d.jumlahPG;
    gId('setEsai').value = d.jumlahEsai; gId('setBobot').value = d.bobotEsai; gId('setLulus').value = d.nilaiLulus;
    S.cfg.logoId = d.logoId; S.cfg.bannerId = d.bannerId; renderBrandPreview();
    S.thumbs = d.thumbs || {}; renderThumbGrid();
  } catch (e) { toast('Gagal', e.message, 'danger'); }
  loadAkun();
}
function renderBrandPreview() {
  const lp = gId('logoPrev'); lp.src = driveImg(S.cfg.logoId, 300); lp.classList.toggle('hidden', !S.cfg.logoId); gId('logoEmpty').classList.toggle('hidden', !!S.cfg.logoId);
  applyBranding();
}
async function savePengaturanForm() {
  setErr('errSet', '');
  const o = { appName: gId('setNama').value, durasiMenit: gId('setDurasi').value, batasPelanggaran: gId('setBatas').value, jumlahPG: gId('setPG').value, jumlahEsai: gId('setEsai').value, bobotEsai: gId('setBobot').value, nilaiLulus: gId('setLulus').value };
  try {
    const res = await withBusy(gId('btnSimpanSet'), () => api('savePengaturan', S.token, o));
    S.cfg.appName = o.appName.trim(); applyBranding(); toast('Berhasil', res.message, 'success');
  } catch (e) { setErr('errSet', e.message); }
}
async function uploadBrandFile(kind, input) {
  const f = input.files[0]; input.value = '';
  try {
    checkImageFile(f); const b = await readFileAsBase64(f);
    const res = await api('uploadBrand', S.token, kind, b.base64, f.name, f.type);
    S.cfg[kind === 'logo' ? 'logoId' : 'bannerId'] = res.data.fileId; renderBrandPreview(); toast('Berhasil', res.message, 'success');
  } catch (e) { toast('Gagal', e.message, 'danger'); }
}
function removeBrand(kind) {
  confirmBox('Hapus ' + (kind === 'logo' ? 'logo' : 'banner') + '?', 'Tampilan akan kembali ke bawaan.', 'Hapus', async () => {
    try { await api('hapusBrand', S.token, kind); S.cfg[kind === 'logo' ? 'logoId' : 'bannerId'] = ''; renderBrandPreview(); toast('Berhasil', 'Berhasil dihapus.', 'success'); }
    catch (e) { toast('Gagal', e.message, 'danger'); }
  }, true);
}
// ── Thumbnail per kategori alat berat ──
let thumbPick = null;
function renderThumbGrid() {
  gId('thumbGrid').innerHTML = S.meta.kategoriAlat.map((k, i) => {
    const id = (S.thumbs || {})[k];
    return '<div class="thumb-tile"><div class="thumb-prev">' + (id ? '<img src="' + driveImg(id, 300) + '" alt="Thumbnail ' + esc(k) + '">' : '<i class="bi ' + (ICON_ALAT[k] || 'bi-gear') + '"></i>') + '</div><div class="thumb-name">' + esc(k) + '</div><div class="d-flex gap-2 justify-content-center"><button class="btn-neu sm" type="button" onclick="pickThumb(' + i + ')"><i class="bi bi-upload"></i> Ganti</button><button class="btn-neu sm danger icon" type="button" ' + (id ? '' : 'disabled') + ' onclick="removeThumb(' + i + ')" aria-label="Hapus thumbnail ' + esc(k) + '"><i class="bi bi-trash"></i></button></div></div>';
  }).join('');
}
function pickThumb(i) { thumbPick = S.meta.kategoriAlat[i]; gId('thumbFile').click(); }
async function uploadThumbFile(input) {
  const f = input.files[0]; input.value = ''; const kat = thumbPick; if (!kat) return;
  try {
    checkImageFile(f); const b = await readFileAsBase64(f);
    const res = await api('uploadThumbKategori', S.token, kat, b.base64, f.name, f.type);
    S.thumbs[kat] = res.data.fileId; renderThumbGrid(); toast('Berhasil', res.message, 'success');
  } catch (e) { toast('Gagal', e.message, 'danger'); }
}
function removeThumb(i) {
  const kat = S.meta.kategoriAlat[i];
  confirmBox('Hapus thumbnail ' + kat + '?', 'Kartu kategori akan kembali memakai ikon bawaan.', 'Hapus', async () => {
    try { await api('hapusThumbKategori', S.token, kat); S.thumbs[kat] = ''; renderThumbGrid(); toast('Berhasil', 'Thumbnail dihapus.', 'success'); }
    catch (e) { toast('Gagal', e.message, 'danger'); }
  }, true);
}
async function loadAkun() {
  gId('akunTable').innerHTML = skeletonHtml(3);
  try { S.data.akun = (await api('getAkun', S.token)).data; renderAkunTable(); markFresh('akunTable'); }
  catch (e) { gId('akunTable').innerHTML = emptyHtml('bi-exclamation-triangle', esc(e.message)); }
}
function renderAkunTable() {
  gId('akunTable').innerHTML = '<div class="table-wrap"><table class="neu-table" style="min-width:520px"><thead><tr><th>Username</th><th>Nama</th><th>Peran</th><th>Status</th><th class="num">Aksi</th></tr></thead><tbody>' + S.data.akun.map(a => '<tr><td><b>' + esc(a.Username) + '</b></td><td>' + esc(a.Nama) + '</td><td><span class="pill ' + (a.Peran === 'Admin' ? 'navy' : 'info') + '">' + esc(a.Peran) + '</span></td><td><span class="pill ' + (a.Status === 'Aktif' ? 'ok' : 'neutral') + '">' + esc(a.Status) + '</span></td><td><div class="row-actions"><button class="btn-neu icon sm" type="button" onclick="openAkunModal(\'' + esc(a.ID) + '\')" aria-label="Ubah akun"><i class="bi bi-pencil"></i></button><button class="btn-neu icon sm danger" type="button" onclick="deleteAkunConfirm(\'' + esc(a.ID) + '\')" aria-label="Hapus akun"><i class="bi bi-trash"></i></button></div></td></tr>').join('') + '</tbody></table></div>';
}
function openAkunModal(id) {
  const a = id ? S.data.akun.find(x => x.ID === id) : null; setErr('errAkun', '');
  gId('maTitle').textContent = a ? 'Ubah Akun' : 'Tambah Akun'; gId('maId').value = a ? a.ID : '';
  gId('maUser').value = a ? a.Username : ''; gId('maNama').value = a ? a.Nama : ''; gId('maPeran').value = a ? a.Peran : 'Instruktur'; gId('maStatus').value = a ? a.Status : 'Aktif';
  gId('maPass').value = ''; gId('maPassHint').textContent = a ? '(kosongkan jika tidak diubah)' : '(min. 8 karakter)';
  modal('mdlAkun').show();
}
async function saveAkunModal() {
  const a = { ID: gId('maId').value, Username: gId('maUser').value, Nama: gId('maNama').value, Peran: gId('maPeran').value, Status: gId('maStatus').value, Password: gId('maPass').value };
  try { const res = await withBusy(gId('maSave'), () => api('saveAkun', S.token, a)); toast('Berhasil', res.message, 'success'); modal('mdlAkun').hide(); loadAkun(); }
  catch (e) { setErr('errAkun', e.message); }
}
function deleteAkunConfirm(id) {
  confirmBox('Hapus akun?', 'Akun ini tidak akan bisa login lagi.', 'Hapus', async () => {
    try { await api('deleteAkun', S.token, id); toast('Berhasil', 'Akun dihapus.', 'success'); loadAkun(); }
    catch (e) { toast('Gagal', e.message, 'danger'); }
  }, true);
}

// ════════ BAGIAN 5: ALUR PESERTA ════════
const Exam = {
  active: false, data: null, idx: 0, answers: {}, flags: {}, viol: 0, limit: 3, endAt: 0,
  tick: null, saver: null, dirty: false, saving: false, submitting: false, fs: false,
  lastViolation: 0, kategori: null, resumeKategori: null, info: null, handlers: []
};

function showPesertaSection(id) {
  document.querySelectorAll('#viewPeserta .content-section').forEach(s => s.classList.remove('active'));
  gId('p-' + id).classList.add('active'); window.scrollTo(0, 0);
}
async function enterPeserta() {
  showView('peserta');
  gId('pcNama').textContent = S.profil.nama; gId('pcId').textContent = S.profil.id + ' · ' + S.profil.departemen;
  show('btnKeluarPeserta', true);
  gId('catGrid').innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton" style="height:160px;border-radius:20px"></div>').join('');
  showPesertaSection('kategori');
  try {
    Exam.info = (await api('getKategoriInfo', S.token)).data; renderCategories();
    if (Exam.resumeKategori) { Exam.kategori = Exam.resumeKategori; goLobi(true); }
  } catch (e) { gId('catGrid').innerHTML = emptyHtml('bi-exclamation-triangle', esc(e.message)); }
}
function alatIcon(k, thumbId, cls) {
  const ic = ICON_ALAT[k] || 'bi-gear';
  if (!thumbId) return '<i class="bi ' + ic + '"></i>';
  return '<img src="' + driveImg(thumbId, 300) + '" alt="Logo ' + esc(k) + '" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'i\'),{className:\'bi ' + ic + '\'}))">';
}
function renderCategories() {
  const info = Exam.info;
  gId('catGrid').innerHTML = info.kategori.map((k, i) => {
    const total = k.pg + k.esai;
    return '<button type="button" class="cat-card' + (total === 0 ? ' empty' : '') + '" style="--i:' + i + '" data-kat="' + esc(k.nama) + '" ' + (total === 0 ? 'disabled aria-disabled="true"' : '') + ' onclick="selectKategori(\'' + esc(k.nama) + '\')" aria-pressed="false"><span class="radio"><i class="bi bi-check-lg"></i></span><span class="ico' + (k.thumbId ? ' has-img' : '') + '">' + alatIcon(k.nama, k.thumbId) + '</span><span class="name">' + esc(k.nama) + '</span><span class="count"><i class="bi bi-journal-check"></i> ' + (total === 0 ? 'Belum ada soal' : Math.min(info.jumlahPG, k.pg) + ' pilihan ganda + ' + Math.min(info.jumlahEsai, k.esai) + ' esai') + '</span></button>';
  }).join('');
  updateCategorySelection();
}
function updateCategorySelection() {
  const info = Exam.info;
  document.querySelectorAll('#catGrid .cat-card').forEach(c => { const sel = c.dataset.kat === Exam.kategori; c.classList.toggle('selected', sel); c.setAttribute('aria-pressed', sel); });
  const k = info.kategori.find(x => x.nama === Exam.kategori);
  gId('catSummaryName').textContent = k ? k.nama : 'Belum dipilih';
  gId('catSummaryInfo').textContent = k ? Math.min(info.jumlahPG, k.pg) + ' pilihan ganda + ' + Math.min(info.jumlahEsai, k.esai) + ' esai · Waktu ' + info.durasiMenit + ' menit' : 'Pilih salah satu kategori di atas.';
  gId('catSummaryIco').innerHTML = k ? alatIcon(k.nama, k.thumbId) : '<i class="bi bi-grid"></i>';
  if (k) retrigger(gId('catSummaryIco'), 'pop');
  gId('btnLanjutKategori').disabled = !k;
}
function selectKategori(nama) { Exam.kategori = nama; updateCategorySelection(); }
function goLobi(resume) {
  const p = S.profil, info = Exam.info, k = info.kategori.find(x => x.nama === Exam.kategori) || { pg: info.jumlahPG, esai: info.jumlahEsai };
  gId('lobiProfil').innerHTML = [['Nama', p.nama], ['ID', p.id], ['Kategori', p.kategori], ['Departemen', p.departemen], ['Crew', p.crew], ['Tanggal tes', fmtTgl(p.tanggal)], ['Kategori alat', Exam.kategori]].map(x => '<div><div class="k">' + x[0] + '</div><div class="v">' + esc(x[1]) + '</div></div>').join('');
  gId('lobiTiles').innerHTML = [[Math.min(info.jumlahPG, k.pg), 'Pilihan Ganda'], [Math.min(info.jumlahEsai, k.esai), 'Esai'], [info.durasiMenit, 'Menit'], [info.batasPelanggaran, 'Batas Pelanggaran']].map(x => '<div class="info-tile"><div class="v">' + x[0] + '</div><div class="k">' + x[1] + '</div></div>').join('');
  gId('chkAturan').checked = false; gId('btnMulaiTes').disabled = true;
  gId('btnMulaiLabel').textContent = resume ? 'Lanjutkan Tes' : 'Mulai Tes';
  showPesertaSection('lobi');
}
async function enterFullscreen() {
  const el = document.documentElement;
  if (!el.requestFullscreen) return false;
  try { await el.requestFullscreen(); return true; } catch (e) { return false; }
}
async function startExam() {
  const btn = gId('btnMulaiTes');
  try {
    Exam.fs = await enterFullscreen();   // harus di dalam gestur klik
    const res = await withBusy(btn, () => api('mulaiTes', S.token, Exam.kategori));
    initExam(res.data);
    if (!Exam.fs) toast('Layar penuh tidak tersedia', 'Perangkat atau peramban ini tidak mendukung layar penuh. Perpindahan tab atau aplikasi tetap dipantau.', 'warning');
  } catch (e) {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    toast('Gagal memulai tes', e.message, 'danger');
  }
}
function localKey() { return 'otc_draft_' + Exam.data.sesiId; }
function initExam(data) {
  Exam.data = data; Exam.idx = 0; Exam.flags = {}; Exam.submitting = false; Exam.limit = data.batasPelanggaran;
  Exam.answers = Object.assign({}, data.draft.j || {}); Exam.viol = data.draft.p || 0;
  try {   // cadangan lokal: isi jawaban yang belum ada di server
    const loc = JSON.parse(store.get(localKey()) || 'null');
    if (loc) { Object.keys(loc.j || {}).forEach(k => { if (Exam.answers[k] === undefined) Exam.answers[k] = loc.j[k]; }); Exam.viol = Math.max(Exam.viol, loc.p || 0); }
  } catch (e) { /* abaikan */ }
  Exam.endAt = Date.now() + data.sisaDetik * 1000; Exam.active = true; Exam.dirty = false;
  gId('examKategori').innerHTML = '<i class="bi ' + (ICON_ALAT[data.kategoriAlat] || 'bi-gear') + '"></i> ' + esc(data.kategoriAlat);
  show('btnKeluarPeserta', false); showPesertaSection('ujian');
  renderViolPill(); renderQuestion(true); armAntiCheat(); startExamTimers();
}
function pgList() { return Exam.data.soal.filter(s => s.tipe === 'PG'); }
function renderQuestion(animate) {
  const s = Exam.data.soal[Exam.idx], total = Exam.data.soal.length, ans = Exam.answers[s.id];
  const img = s.gambarId ? '<div class="q-img" onclick="showImage(\'' + driveImg(s.gambarId, 1600) + '\')" title="Klik untuk memperbesar"><img src="' + driveImg(s.gambarId, 1000) + '" alt="Gambar pendukung soal"></div>' : '';
  let body;
  if (s.tipe === 'PG') {
    body = '<div class="opt-list" role="radiogroup" aria-label="Pilihan jawaban">' + s.opsi.map((o, i) => '<button type="button" class="opt' + (ans === o.k ? ' selected' : '') + '" role="radio" aria-checked="' + (ans === o.k) + '" onclick="chooseOpt(\'' + o.k + '\')"><span class="letter">' + 'ABCD'[i] + '</span><span>' + esc(o.t) + '</span></button>').join('') + '</div>';
  } else {
    body = '<div class="essay-box"><label class="field-label" for="essayInput">Lembar jawaban esai</label><textarea class="neu-textarea" id="essayInput" maxlength="2000" placeholder="Tulis jawaban Anda secara terstruktur dan prosedural…" oninput="onEssayInput(this)" spellcheck="false">' + esc(ans || '') + '</textarea><div class="essay-foot"><span>Tersimpan otomatis</span><span id="essayCount">' + (ans || '').length + ' / 2000 karakter</span></div></div>';
  }
  gId('qCard').innerHTML = '<div class="q-head"><span class="q-no">Soal No. ' + s.nomor + '</span><span class="pill ' + (s.tipe === 'Esai' ? 'amber' : 'navy') + '">' + (s.tipe === 'Esai' ? 'ESAI' : 'PILIHAN GANDA') + '</span>' + (Exam.flags[s.id] ? '<span class="pill warn"><i class="bi bi-flag-fill"></i> Ragu-ragu</span>' : '') + '</div><div class="q-text">' + esc(s.teks) + '</div>' + img + body;
  if (animate) retrigger(gId('qCard'), 'q-anim');
  updateExamNav();
}
function updateExamNav() {
  const soal = Exam.data.soal, total = soal.length, cur = soal[Exam.idx];
  const answered = id => Exam.answers[id] !== undefined && String(Exam.answers[id]).trim() !== '';
  const btn = s => '<button type="button" class="nav-btn' + (s.tipe === 'Esai' ? ' essay' : '') + (answered(s.id) ? ' answered' : '') + (s === cur ? ' current' : '') + (Exam.flags[s.id] ? ' flag' : '') + '" onclick="gotoQ(' + (s.nomor - 1) + ');closeDrawer()" aria-label="Soal ' + s.nomor + (answered(s.id) ? ', terjawab' : '') + '">' + pad2(s.nomor) + '</button>';
  const pg = soal.filter(s => s.tipe === 'PG'), es = soal.filter(s => s.tipe === 'Esai');
  gId('navGridPG').innerHTML = pg.map(btn).join(''); gId('navGridEsai').innerHTML = es.map(btn).join('');
  gId('navCountPG').textContent = pg.filter(s => answered(s.id)).length + '/' + pg.length + ' terisi';
  gId('navCountEsai').textContent = es.filter(s => answered(s.id)).length + '/' + es.length + ' selesai';
  show('navEsaiWrap', es.length > 0); gId('navTotal').textContent = total + ' butir';
  const done = soal.filter(s => answered(s.id)).length;
  gId('examProgressLabel').textContent = 'Soal ' + cur.nomor + ' dari ' + total;
  gId('examProgressSub').textContent = done + ' terjawab (' + Math.round(done / total * 100) + '%)';
  gId('examProgressFill').style.width = (done / total * 100) + '%';
  gId('btnPrev').disabled = Exam.idx === 0;
  const last = Exam.idx === total - 1, nb = gId('btnNext');
  nb.innerHTML = last ? '<i class="bi bi-check2-all"></i> Selesaikan' : 'Selanjutnya <i class="bi bi-arrow-right"></i>';
  nb.onclick = last ? askFinish : () => gotoQ(Exam.idx + 1);
  gId('btnFlag').innerHTML = '<i class="bi bi-flag' + (Exam.flags[cur.id] ? '-fill' : '') + '"></i> <span class="hide-sm">' + (Exam.flags[cur.id] ? 'Batal Ragu-ragu' : 'Tandai Ragu-ragu') + '</span>';
}
function gotoQ(i) {
  if (!Exam.active || i < 0 || i >= Exam.data.soal.length) return;
  Exam.idx = i; renderQuestion(true); window.scrollTo(0, 0); if (Exam.dirty) saveDraft();
}
function toggleFlag() { const s = Exam.data.soal[Exam.idx]; Exam.flags[s.id] = !Exam.flags[s.id]; renderQuestion(); }
function backupLocal() { store.set(localKey(), JSON.stringify({ j: Exam.answers, p: Exam.viol })); }
function markDirty() { Exam.dirty = true; backupLocal(); setSaveState('saving', 'Menyimpan…'); }
function chooseOpt(k) { const s = Exam.data.soal[Exam.idx]; Exam.answers[s.id] = k; markDirty(); renderQuestion(); }
function onEssayInput(el) {
  const s = Exam.data.soal[Exam.idx]; Exam.answers[s.id] = el.value; markDirty();
  gId('essayCount').textContent = el.value.length + ' / 2000 karakter';
  const btn = document.querySelector('#navGridEsai .nav-btn.current'); if (btn) btn.classList.toggle('answered', el.value.trim() !== '');
  clearTimeout(timers.essayNav); timers.essayNav = setTimeout(updateExamNav, 600);
}
function setSaveState(cls, text) { const el = gId('saveState'); el.className = 'savestate ' + cls; gId('saveText').textContent = text; }

// ── Timer & autosave ──
function fmtClock(sec) { const m = Math.floor(sec / 60), s = sec % 60; return (m >= 60 ? pad2(Math.floor(m / 60)) + ':' : '') + pad2(m % 60) + ':' + pad2(s); }
function startExamTimers() {
  stopExamTimers();
  const render = () => {
    if (!Exam.active) return;
    const left = Math.max(0, Math.ceil((Exam.endAt - Date.now()) / 1000));
    gId('timerText').textContent = fmtClock(left);
    gId('examTimer').className = 'timer' + (left <= 120 ? ' crit' : left <= 600 ? ' low' : '');
    if (left <= 0) submitExam('waktu');
  };
  render(); Exam.tick = setInterval(render, 500);
  Exam.saver = setInterval(() => { if (Exam.dirty) saveDraft(); }, 15000);
}
function stopExamTimers() { clearInterval(Exam.tick); clearInterval(Exam.saver); Exam.tick = Exam.saver = null; }
async function saveDraft() {
  if (Exam.saving || !Exam.active || Exam.submitting) return;
  Exam.saving = true; const snapshot = JSON.stringify(Exam.answers) + Exam.viol; Exam.dirty = false;
  try {
    const res = await api('simpanDraft', S.token, Exam.data.sesiId, Exam.answers, Exam.viol);
    if (res.data && res.data.sisaDetik !== undefined) {   // sinkronkan jam dengan server bila selisih > 5 dtk
      const serverEnd = Date.now() + res.data.sisaDetik * 1000;
      if (Math.abs(serverEnd - Exam.endAt) > 5000) Exam.endAt = serverEnd;
    }
    const t = new Date(); setSaveState(JSON.stringify(Exam.answers) + Exam.viol === snapshot ? '' : 'saving', 'Tersimpan ' + pad2(t.getHours()) + ':' + pad2(t.getMinutes()) + ':' + pad2(t.getSeconds()));
  } catch (e) { Exam.dirty = true; setSaveState('err', 'Gagal menyimpan ke server (aman di perangkat)'); }
  finally { Exam.saving = false; }
}

// ── Anti-cheat ──
function renderViolPill() {
  const el = gId('examIntegritas');
  el.className = 'pill ' + (Exam.viol === 0 ? 'neutral' : Exam.viol >= Exam.limit - 1 ? 'bad' : 'warn');
  el.innerHTML = '<i class="bi bi-shield-' + (Exam.viol ? 'exclamation' : 'check') + '"></i> Pelanggaran: ' + Exam.viol + '/' + Exam.limit;
}
function armAntiCheat() {
  disarmAntiCheat();
  const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); Exam.handlers.push([t, ev, fn, opt]); };
  on(document, 'visibilitychange', () => { if (document.hidden) registerViolation('Anda berpindah tab atau jendela.'); });
  on(window, 'blur', () => registerViolation('Fokus jendela tes hilang (membuka aplikasi lain).'));
  on(document, 'fullscreenchange', () => { if (Exam.fs && !document.fullscreenElement) registerViolation('Anda keluar dari mode layar penuh.'); });
  on(document, 'contextmenu', e => { if (Exam.active) e.preventDefault(); });
  ['copy', 'cut', 'paste', 'dragstart', 'drop'].forEach(ev => on(document, ev, e => { if (Exam.active) e.preventDefault(); }, true));
  on(document, 'keydown', e => {
    if (!Exam.active) return;
    const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (k === 'f12' || k === 'printscreen' || (mod && ['c', 'v', 'x', 'p', 's', 'u'].indexOf(k) >= 0) || (mod && e.shiftKey && ['i', 'j', 'c'].indexOf(k) >= 0)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  on(window, 'beforeunload', e => { if (Exam.active && !Exam.submitting) { e.preventDefault(); e.returnValue = ''; } });
}
function disarmAntiCheat() { Exam.handlers.forEach(h => h[0].removeEventListener(h[1], h[2], h[3])); Exam.handlers = []; }
function registerViolation(reason) {
  if (!Exam.active || Exam.submitting) return;
  const now = Date.now(); if (now - Exam.lastViolation < 2000) return; Exam.lastViolation = now;
  Exam.viol++; renderViolPill(); backupLocal(); saveDraft();
  const final = Exam.viol >= Exam.limit;
  gId('mvTitle').textContent = final ? 'Tes Dihentikan Otomatis' : 'Peringatan Pelanggaran';
  gId('mvText').textContent = final ? 'Batas pelanggaran tercapai. Jawaban Anda akan dikirim otomatis.' : reason;
  gId('mvDots').innerHTML = Array.from({ length: Exam.limit }, (_, i) => '<i class="' + (i < Exam.viol ? 'on' : '') + '"></i>').join('');
  gId('mvCount').textContent = 'Pelanggaran ' + Exam.viol + ' dari ' + Exam.limit;
  gId('mvBtn').textContent = final ? 'OK' : 'Kembali ke Tes (layar penuh)';
  gId('mvBtn').dataset.final = final ? '1' : '';
  modal('mdlViolation').show();
}
async function closeViolation() {
  const final = gId('mvBtn').dataset.final === '1';
  if (!final && Exam.fs && !document.fullscreenElement) await enterFullscreen();
  modal('mdlViolation').hide();
  if (final) submitExam('pelanggaran');
}

// ── Selesai & kirim ──
function askFinish() {
  const soal = Exam.data.soal, ans = s => Exam.answers[s.id] !== undefined && String(Exam.answers[s.id]).trim() !== '';
  const pgBelum = soal.filter(s => s.tipe === 'PG' && !ans(s)).length, esBelum = soal.filter(s => s.tipe === 'Esai' && !ans(s)).length;
  gId('mfBody').innerHTML = (pgBelum || esBelum ? '<div class="pill warn mb-2"><i class="bi bi-exclamation-triangle"></i> Masih ada soal belum dijawab</div><ul>' + (pgBelum ? '<li>' + pgBelum + ' soal pilihan ganda</li>' : '') + (esBelum ? '<li>' + esBelum + ' soal esai</li>' : '') + '</ul>' : '<div class="pill ok mb-2"><i class="bi bi-check-circle"></i> Semua soal sudah dijawab</div>') + '<p class="mb-0">Setelah dikirim, jawaban <b>tidak dapat diubah</b>. Yakin ingin menyelesaikan tes?</p>';
  modal('mdlFinish').show();
}
function confirmFinish() { modal('mdlFinish').hide(); submitExam('manual'); }
function setBusyOverlay(html) {
  const ov = gId('loadingOverlay'); ov.classList.remove('hidden'); ov.style.opacity = '1';
  ov.innerHTML = html;
}
function hideBusyOverlay() { const ov = gId('loadingOverlay'); ov.style.opacity = '0'; setTimeout(() => ov.classList.add('hidden'), 250); }
async function submitExam(reason) {
  if (!Exam.active || Exam.submitting) return;
  Exam.submitting = true; stopExamTimers(); document.querySelectorAll('.modal.show').forEach(m => modal(m.id).hide());
  const delays = [0, 2000, 4000, 7000];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    setBusyOverlay('<div class="ring"></div><p class="mt-3 mb-0"><b>Mengirim jawaban…</b></p><p class="caption">Jangan tutup halaman ini' + (attempt ? ' (percobaan ' + (attempt + 1) + ')' : '') + '</p>');
    if (delays[attempt]) await new Promise(r => setTimeout(r, delays[attempt]));
    try {
      const res = await api('kirimJawaban', S.token, Exam.data.sesiId, Exam.answers, Exam.viol, reason);
      finishExamUi(res.data); return;
    } catch (e) {
      if (e.code === 'SESI_BERAKHIR') break;
      if (attempt === delays.length - 1) break;
    }
  }
  setBusyOverlay('<div class="neu-card text-center" style="max-width:420px"><div class="mini-modal-ico" style="color:var(--danger)"><i class="bi bi-wifi-off"></i></div><h3>Jawaban belum terkirim</h3><p class="text-muted-2">Koneksi bermasalah. Jawaban Anda aman di perangkat ini. Pastikan internet aktif lalu coba lagi, atau hubungi pengawas.</p><button class="btn-neu primary block" type="button" onclick="retrySubmit(\'' + reason + '\')"><i class="bi bi-arrow-repeat"></i> Coba kirim lagi</button></div>');
}
function retrySubmit(reason) { Exam.submitting = false; submitExam(reason); }
function finishExamUi(d) {
  Exam.active = false; disarmAntiCheat(); store.del(localKey());
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => { });
  hideBusyOverlay(); setTimeout(() => { gId('loadingOverlay').innerHTML = '<div class="ring"></div><p class="mt-3 mb-0 caption">Memuat aplikasi…</p>'; }, 400);
  const stopped = d.status === 'Dihentikan otomatis';
  gId('doneCard').innerHTML = '<div class="mini-modal-ico" style="color:' + (stopped ? 'var(--danger)' : 'var(--ok-text)') + '"><i class="bi ' + (stopped ? 'bi-slash-circle-fill' : 'bi-check-circle-fill') + '"></i></div><h1>' + (stopped ? 'Tes Dihentikan' : 'Tes Selesai') + '</h1><p class="text-muted-2 mt-2">' + (stopped ? 'Tes dihentikan otomatis karena batas pelanggaran tercapai. Jawaban Anda tetap tersimpan.' : 'Jawaban Anda telah tersimpan. Hasil akan diumumkan oleh panitia setelah penilaian selesai.') + '</p><div class="info-tiles my-3" style="grid-template-columns:repeat(3,1fr)"><div class="info-tile"><div class="v" style="font-size:18px">' + esc(d.mulai || '–') + '</div><div class="k">Waktu mulai</div></div><div class="info-tile"><div class="v" style="font-size:18px">' + esc(d.selesai || '–') + '</div><div class="k">Waktu selesai</div></div><div class="info-tile"><div class="v" style="font-size:14px;padding-top:4px">' + statusPill(d.status || 'Selesai') + '</div><div class="k">Status</div></div></div><button class="btn-neu primary block" type="button" onclick="doLogout()"><i class="bi bi-box-arrow-right"></i> Keluar</button>';
  show('btnKeluarPeserta', true); showPesertaSection('selesai');
}

// ── Drawer navigasi (mobile) ──
function toggleDrawer() { gId('navPanel').classList.toggle('open'); }
function closeDrawer() { const p = gId('navPanel'); if (p) p.classList.remove('open'); }

// ════════ BAGIAN 6: MOTION 3D (miring 3D mengikuti kursor, magnet tombol, paralaks login) ════════
// Aktif hanya pada perangkat dengan mouse; dimatikan bila pengguna memilih "reduce motion".
(function initMotion() {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduce || !fine) return;
  const SEL = '.btn-neu, .cat-card, .thumb-tile, .neu-card.stat, .info-tile, .insight, .opt, .nav-btn, .esai-tabs button, #viewAuth .auth-banner';   // kartu & kolom login sengaja tidak ikut miring agar mudah diklik
  let cur = null, raf = 0, ev = null;
  const reset = el => { ['--rx', '--ry', '--tx', '--ty'].forEach(p => el.style.removeProperty(p)); el.classList.remove('is-tilting'); };
  const frame = () => {
    raf = 0; const e = ev; if (!e) return;
    const va = gId('viewAuth');
    if (va && !va.classList.contains('hidden')) {   // paralaks latar login
      va.style.setProperty('--px', ((e.clientX / window.innerWidth - .5) * 2).toFixed(3));
      va.style.setProperty('--py', ((e.clientY / window.innerHeight - .5) * 2).toFixed(3));
    }
    const el = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (cur && cur !== el) reset(cur);
    cur = el; if (!el || el.disabled) return;
    const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    const btn = el.classList.contains('btn-neu');
    const max = btn ? 9 : Math.max(2, Math.min(9, 16 - r.width / 55));
    el.style.setProperty('--ry', ((px - .5) * 2 * max).toFixed(2) + 'deg');
    el.style.setProperty('--rx', ((.5 - py) * 2 * max).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    if (btn) { el.style.setProperty('--tx', ((px - .5) * 6).toFixed(1) + 'px'); el.style.setProperty('--ty', ((py - .5) * 4).toFixed(1) + 'px'); }  // magnet
    el.classList.add('is-tilting');
  };
  document.addEventListener('pointermove', e => { ev = e; if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { if (cur) { reset(cur); cur = null; } });
  window.addEventListener('blur', () => { if (cur) { reset(cur); cur = null; } });
})();

// ════════ MULAI APLIKASI ════════
// Dijalankan di akhir skrip (semua fungsi & konstanta sudah terdefinisi), baik DOM masih memuat maupun sudah siap.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootApp); else bootApp();
window.__otcBoot = true;   // dibaca penjaga pemuatan di index.html
