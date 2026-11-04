// Admin konten landing page (/admin). Hanya super_admin. Data tersimpan di D1: landing_setting + landing_konten.
// Seluruh DOM dibuat dengan textContent (tanpa innerHTML) agar aman dari XSS; tanpa skrip/gaya inline (CSP).
import { api } from '/js/api.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
};
let toastT;
const toast = (msg, bad = false) => {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, bad ? 4500 : 2200);
};
const errMsg = (e) => e?.message || 'Terjadi kesalahan';
const tglID = (iso) => { const d = new Date(iso + 'T00:00:00'); return Number.isNaN(+d) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };

/* ===================== konfigurasi UI ===================== */
const TABS = [
  { id: 'teks', label: 'Teks & kontak' },
  { id: 'slider', label: 'Slider foto' },
  { id: 'kegiatan', label: 'Catatan kegiatan' },
  { id: 'prestasi', label: 'Prestasi' },
  { id: 'nasabah', label: 'Nasabah' },
];

const SETTING_GROUPS = [
  { title: 'Beranda (bagian atas)', cols: 1, items: [
    { k: 'hero_eyebrow', label: 'Teks kecil di atas judul' },
    { k: 'hero_judul', label: 'Judul utama' },
    { k: 'hero_lead', label: 'Kalimat pengantar', type: 'textarea', rows: 3 } ] },
  { title: 'Angka ringkas (4 kartu)', stats: true },
  { title: 'Tentang', cols: 1, items: [
    { k: 'tentang_judul', label: 'Judul bagian' },
    { k: 'tentang_isi', label: 'Isi', type: 'textarea', rows: 7, hint: 'Pisahkan paragraf dengan satu baris kosong.' },
    { k: 'visi', label: 'Visi', type: 'textarea', rows: 2 },
    { k: 'misi', label: 'Misi', type: 'textarea', rows: 5, hint: 'Satu poin per baris.' } ] },
  { title: 'Dokumentasi kegiatan', cols: 1, items: [
    { k: 'dokumentasi_isi', label: 'Keterangan', type: 'textarea', rows: 3 },
    { k: 'link_dokumentasi', label: 'Tautan dokumentasi', type: 'url', hint: 'Google Drive, Instagram, YouTube, dll. Harus diawali https://' } ] },
  { title: 'Jadwal penimbangan & tips', cols: 1, items: [
    { k: 'jadwal_ket', label: 'Keterangan jadwal', type: 'textarea', rows: 2 },
    { k: 'tips', label: 'Tips menyetor', type: 'textarea', rows: 4, hint: 'Satu tips per baris.' } ] },
  { title: 'Mitra', cols: 1, items: [ { k: 'mitra', label: 'Kalimat mitra', type: 'textarea', rows: 3 } ] },
  { title: 'Kontak & footer', cols: 2, items: [
    { k: 'kontak_nama', label: 'Nama' },
    { k: 'kontak_telp', label: 'Telepon', hint: 'Ditampilkan apa adanya.' },
    { k: 'kontak_alamat', label: 'Alamat', type: 'textarea', rows: 3, hint: 'Satu baris alamat per baris.' },
    { k: 'kontak_wa', label: 'Nomor WhatsApp', hint: 'Contoh 081234567890 (otomatis jadi 62…).' },
    { k: 'footer', label: 'Teks footer' } ] },
];

const FIELDS = {
  slider: [
    { k: 'judul', label: 'Keterangan foto', req: true, max: 200 },
    { k: 'foto', type: 'image', label: 'Foto' } ],
  kegiatan: [
    { k: 'tanggal', label: 'Tanggal', type: 'date', req: true },
    { k: 'judul', label: 'Kegiatan', req: true, max: 200 },
    { k: 'isi', label: 'Keterangan', type: 'textarea', max: 2000 },
    { k: 'tautan', label: 'Tautan (opsional)', type: 'url', max: 500 } ],
  prestasi: [
    { k: 'tanggal', label: 'Tahun', req: true, max: 4, pattern: /^\d{4}$/, msg: 'Tahun harus 4 angka, mis. 2025' },
    { k: 'judul', label: 'Prestasi', req: true, max: 200 },
    { k: 'isi', label: 'Keterangan', type: 'textarea', max: 2000 } ],
  nasabah: [
    { k: 'judul', label: 'Nama nasabah', req: true, max: 200 },
    { k: 'isi', label: 'RT / keterangan', max: 2000, hint: 'Mis. RT 13, Sekolah, Mitra.' } ],
};
const NOUN = { slider: 'foto', kegiatan: 'kegiatan', prestasi: 'prestasi', nasabah: 'nasabah' };
const REORDER = ['slider', 'nasabah'];     // kegiatan & prestasi otomatis urut tanggal terbaru
const BULK = {
  kegiatan: { hint: 'Satu per baris: tanggal | kegiatan | keterangan (opsional). Contoh: 2026-01-10 | Penimbangan bulanan | Minggu ke-2', parse: (l) => { const [t, j, i] = l.split('|').map((x) => x.trim()); return { tanggal: t, judul: j, isi: i || '' }; } },
  nasabah: { hint: 'Satu per baris: nama | RT/keterangan (opsional). Contoh: Ibu Siti | RT 05', parse: (l) => { const [j, i] = l.split('|').map((x) => x.trim()); return { judul: j, isi: i || '' }; } },
};

/* ===================== state ===================== */
const S = { setting: {}, keys: {}, konten: [], tab: 'teks', q: '', page: 1 };
const PER_PAGE = 50;
const root = $('#root');

async function load() {
  const d = await api.get('/landing/admin');
  S.setting = d.setting; S.keys = d.keys; S.konten = d.konten;
}
const items = (b) => S.konten.filter((k) => k.bagian === b);

/* ===================== gerbang akses ===================== */
function gate(title, text, linkHref, linkText) {
  root.replaceChildren(h('div', { class: 'panel gate' }, h('h1', {}, title), h('p', { class: 'muted' }, text),
    linkHref ? h('a', { class: 'btn', href: linkHref }, linkText) : null));
}

async function boot() {
  let user;
  try { user = (await api.get('/me')).user; }
  catch (e) { if (e.status === 401) return gate('Masuk dulu', 'Halaman ini khusus Admin BSC. Masuk dengan akun Admin, lalu buka kembali /admin.', '/masuk', 'Ke halaman masuk'); return gate('Gagal memuat', errMsg(e)); }
  if (user.role !== 'super_admin') return gate('Akses ditolak', 'Hanya akun Admin yang dapat mengelola konten landing page.', '/masuk', 'Kembali ke aplikasi');
  const out = $('#logout'); out.hidden = false;
  out.onclick = async () => { try { await api.post('/auth/logout'); } finally { location.href = '/masuk'; } };
  try { await load(); } catch (e) { return gate('Gagal memuat data', errMsg(e)); }
  render();
}

/* ===================== kerangka + tab ===================== */
function render() {
  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Bagian landing' },
    TABS.map((t) => h('button', { class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(S.tab === t.id), onclick: () => { S.tab = t.id; S.q = ''; S.page = 1; render(); } },
      t.label, t.id === 'teks' ? null : h('span', { class: 'n' }, `(${items(t.id).length})`))));
  root.replaceChildren(
    h('h1', {}, 'Kelola konten landing page'),
    h('p', { class: 'hint' }, 'Perubahan tersimpan di database D1 dan tampil di halaman utama dalam ±1 menit (cache publik).'),
    tabs, S.tab === 'teks' ? renderTeks() : renderList(S.tab));
}

/* ===================== tab teks ===================== */
function fieldEl(it, value) {
  const id = 'f-' + it.k, max = S.keys[it.k];
  const input = it.type === 'textarea'
    ? h('textarea', { id, name: it.k, rows: it.rows || 3, maxlength: max }, value)
    : h('input', { id, name: it.k, type: it.type === 'url' ? 'url' : 'text', maxlength: max, value, autocomplete: 'off', inputmode: it.type === 'url' ? 'url' : null });
  if (it.type !== 'textarea') input.value = value;
  return h('div', { class: 'field' }, h('label', { for: id }, it.label), input, it.hint ? h('small', {}, it.hint) : null);
}

function renderTeks() {
  const form = h('form', { novalidate: true });
  for (const g of SETTING_GROUPS) {
    const fs = h('fieldset', { class: 'group' }, h('legend', {}, g.title));
    if (g.stats) {
      fs.append(h('div', { class: 'grid4' }, [1, 2, 3, 4].map((n) => h('div', { class: 'stat' },
        fieldEl({ k: `stat_${n}_angka`, label: `Kartu ${n}: angka` }, S.setting[`stat_${n}_angka`] ?? ''),
        fieldEl({ k: `stat_${n}_label`, label: 'Keterangan' }, S.setting[`stat_${n}_label`] ?? '')))));
    } else {
      fs.append(h('div', { class: g.cols === 2 ? 'grid2' : null }, g.items.map((it) => fieldEl(it, S.setting[it.k] ?? ''))));
    }
    form.append(fs);
  }
  const btn = h('button', { class: 'btn', type: 'submit' }, 'Simpan perubahan');
  form.append(h('div', { class: 'savebar' }, h('span', { class: 'muted', id: 'dirty' }, ''), btn));
  form.addEventListener('input', () => { $('#dirty').textContent = changed(form).length ? 'Ada perubahan yang belum disimpan' : ''; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const diff = Object.fromEntries(changed(form));
    if (!Object.keys(diff).length) return toast('Tidak ada perubahan');
    if (diff.link_dokumentasi && !/^(https?:\/\/|\/)\S+$/.test(diff.link_dokumentasi)) return toast('Tautan dokumentasi harus diawali https://', true);
    btn.disabled = true;
    try { await api.put('/landing/setting', diff); Object.assign(S.setting, diff); $('#dirty').textContent = ''; toast('Tersimpan'); }
    catch (err) { toast(errMsg(err), true); } finally { btn.disabled = false; }
  });
  return h('section', { class: 'panel', role: 'tabpanel' }, form);
}
const norm = (v) => String(v ?? '').replace(/\r\n/g, '\n').trim();
const changed = (form) => [...form.elements].filter((e) => e.name).map((e) => [e.name, norm(e.value)]).filter(([k, v]) => v !== norm(S.setting[k]));

/* ===================== tab daftar ===================== */
function renderList(b) {
  const all = items(b), term = S.q.trim().toLowerCase();
  const rows = term ? all.filter((k) => `${k.judul} ${k.isi} ${k.tanggal ?? ''}`.toLowerCase().includes(term)) : all;
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  S.page = Math.min(S.page, pages);
  const view = rows.slice((S.page - 1) * PER_PAGE, S.page * PER_PAGE);

  const search = h('input', { type: 'search', class: 'grow', placeholder: 'Cari…', 'aria-label': 'Cari', value: S.q, autocomplete: 'off' });
  search.value = S.q;
  search.addEventListener('input', () => { S.q = search.value; S.page = 1; const pos = search.selectionStart; render(); const n = $('input[type=search]'); n.focus(); n.setSelectionRange(pos, pos); });
  const bar = h('div', { class: 'toolbar' },
    h('button', { class: 'btn', type: 'button', onclick: () => openForm(b) }, `+ Tambah ${NOUN[b]}`),
    BULK[b] ? h('button', { class: 'btn ghost', type: 'button', onclick: () => openBulk(b) }, 'Impor banyak') : null,
    search, h('span', { class: 'muted' }, `${rows.length} data`));

  const head = { slider: ['Foto', 'Keterangan'], kegiatan: ['Tanggal', 'Kegiatan'], prestasi: ['Tahun', 'Prestasi'], nasabah: ['Nama', 'RT / keterangan'] }[b];
  const table = h('table', {}, h('thead', {}, h('tr', {}, head.map((t) => h('th', {}, t)), h('th', {}, 'Tampil'), h('th', {}))),
    h('tbody', {}, view.map((k) => row(b, k, all))));
  const wrap = rows.length ? h('div', { class: 'tablewrap' }, table) : h('p', { class: 'empty' }, term ? 'Tidak ada yang cocok.' : `Belum ada ${NOUN[b]}. Klik “Tambah ${NOUN[b]}”.`);
  const pager = pages > 1 ? h('div', { class: 'pager' },
    h('button', { class: 'btn ghost sm', type: 'button', disabled: S.page <= 1, onclick: () => { S.page--; render(); } }, '‹ Sebelumnya'),
    h('span', { class: 'muted' }, `Halaman ${S.page} / ${pages}`),
    h('button', { class: 'btn ghost sm', type: 'button', disabled: S.page >= pages, onclick: () => { S.page++; render(); } }, 'Berikutnya ›')) : null;
  return h('section', { class: 'panel', role: 'tabpanel' }, bar, wrap, pager);
}

function row(b, k, all) {
  const cells = [];
  if (b === 'slider') cells.push(h('td', {}, k.gambar ? h('img', { class: 'thumb', src: k.gambar, alt: '', loading: 'lazy' }) : '—'), h('td', {}, k.judul, k.unggahan ? h('span', { class: 'sub' }, 'foto unggahan') : null));
  else if (b === 'kegiatan') cells.push(h('td', {}, k.tanggal ? tglID(k.tanggal) : '—'), h('td', {}, k.judul, k.isi ? h('span', { class: 'sub' }, k.isi) : null));
  else if (b === 'prestasi') cells.push(h('td', {}, k.tanggal || '—'), h('td', {}, k.judul, k.isi ? h('span', { class: 'sub' }, k.isi) : null));
  else cells.push(h('td', {}, k.judul), h('td', {}, k.isi || '—'));
  const idx = all.indexOf(k);
  const sw = h('input', { type: 'checkbox', 'aria-label': 'Tampilkan di landing' }); sw.checked = !!k.tampil;
  sw.addEventListener('change', async () => {
    try { await api.put(`/landing/konten/${k.id}`, { tampil: sw.checked ? 1 : 0 }); k.tampil = sw.checked ? 1 : 0; render(); }
    catch (e) { sw.checked = !sw.checked; toast(errMsg(e), true); }
  });
  const act = h('td', { class: 'act' },
    REORDER.includes(b) ? [h('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Naikkan', disabled: idx === 0 || !!S.q, onclick: () => move(b, idx, -1) }, '↑'),
      h('button', { class: 'btn ghost sm', type: 'button', 'aria-label': 'Turunkan', disabled: idx === all.length - 1 || !!S.q, onclick: () => move(b, idx, 1) }, '↓')] : null,
    h('button', { class: 'btn ghost sm', type: 'button', onclick: () => openForm(b, k) }, 'Ubah'),
    h('button', { class: 'btn danger sm', type: 'button', onclick: () => remove(k) }, 'Hapus'));
  return h('tr', { class: k.tampil ? '' : 'off' }, cells, h('td', {}, h('label', { class: 'switch' }, sw)), act);
}

async function move(b, idx, dir) {
  const ids = items(b).map((k) => k.id), j = idx + dir;
  if (j < 0 || j >= ids.length) return;
  [ids[idx], ids[j]] = [ids[j], ids[idx]];
  try { await api.post('/landing/konten/urut', { ids }); await load(); render(); } catch (e) { toast(errMsg(e), true); }
}
async function remove(k) {
  if (!confirm(`Hapus “${k.judul}”? Tindakan ini tidak bisa dibatalkan.`)) return;
  try { await api.del(`/landing/konten/${k.id}`); await load(); render(); toast('Terhapus'); } catch (e) { toast(errMsg(e), true); }
}

/* ===================== dialog tambah/ubah ===================== */
const dlg = $('#dlg'), dform = $('#dlg-form'), dbody = $('#dlg-body'), derr = $('#dlg-err');
let onSubmit = null;
$('#dlg-cancel').addEventListener('click', () => dlg.close());
dform.addEventListener('submit', async (e) => {
  e.preventDefault(); derr.hidden = true;
  const ok = $('#dlg-ok'); ok.disabled = true;
  try { await onSubmit(); } catch (err) { derr.textContent = errMsg(err); derr.hidden = false; } finally { ok.disabled = false; }
});
function openDialog(title, body, submit, okText = 'Simpan') {
  $('#dlg-title').textContent = title; $('#dlg-ok').textContent = okText;
  dbody.replaceChildren(...body); derr.hidden = true; onSubmit = submit; dlg.showModal();
  const first = $('input:not([type=file]),textarea', dbody); first?.focus();
}

// Kompres gambar di perangkat: sisi terpanjang 1280px, JPEG, <= ~300 KB (batas server 420.000 karakter base64).
async function compress(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Pilih file JPEG, PNG, atau WebP');
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const cv = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * sc), height: Math.round(bmp.height * sc) });
  const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(bmp, 0, 0, cv.width, cv.height);
  for (let qlt = 0.85; qlt >= 0.4; qlt -= 0.1) { const u = cv.toDataURL('image/jpeg', qlt); if (u.length <= 400000) return u; }
  throw new Error('Foto terlalu besar, pilih foto lain atau yang resolusinya lebih kecil');
}

function openForm(b, rec) {
  const edit = !!rec, st = { data: null };
  const inputs = {}, body = [];
  for (const f of FIELDS[b]) {
    if (f.type === 'image') { body.push(imageField(rec, st)); continue; }
    const id = 'd-' + f.k;
    const el = f.type === 'textarea' ? h('textarea', { id, rows: 3, maxlength: f.max }) : h('input', { id, type: f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text', maxlength: f.max, autocomplete: 'off' });
    el.value = rec?.[f.k] ?? ''; inputs[f.k] = el;
    body.push(h('div', { class: 'field' }, h('label', { for: id }, f.label + (f.req ? ' *' : '')), el, f.hint ? h('small', {}, f.hint) : null));
  }
  const tampil = h('input', { type: 'checkbox', id: 'd-tampil' }); tampil.checked = rec ? !!rec.tampil : true;
  body.push(h('label', { class: 'switch' }, tampil, 'Tampilkan di landing page'));
  openDialog(`${edit ? 'Ubah' : 'Tambah'} ${NOUN[b]}`, body, async () => {
    const p = { tampil: tampil.checked ? 1 : 0 };
    for (const f of FIELDS[b]) {
      if (f.type === 'image') continue;
      const v = inputs[f.k].value.trim();
      if (f.req && !v) throw new Error(`${f.label} wajib diisi`);
      if (v && f.pattern && !f.pattern.test(v)) throw new Error(f.msg || `${f.label} tidak valid`);
      if (v && f.type === 'url' && !/^(https?:\/\/|\/)\S+$/.test(v)) throw new Error(`${f.label} harus diawali https://`);
      p[f.k] = v;
    }
    if (b === 'slider') {
      const url = ($('#d-url')?.value || '').trim(), orig = rec?.unggahan ? '' : (rec?.gambar || '');
      if (st.data) p.gambar_data = st.data;
      else if (url !== orig) {
        if (!/^\/\S+$/.test(url)) throw new Error('Path gambar harus diawali / (mis. /img/slide-1.jpg). Gambar dari situs lain diblokir; unggah fotonya saja.');
        p.gambar = url; if (rec?.unggahan) p.hapus_gambar = true;
      }
      if (!edit && !p.gambar_data && !p.gambar) throw new Error('Pilih foto atau isi path gambar');
    }
    if (edit) await api.put(`/landing/konten/${rec.id}`, p); else await api.post('/landing/konten', { bagian: b, ...p });
    dlg.close(); await load(); render(); toast('Tersimpan');
  });
}

function imageField(rec, st) {
  const prev = h('img', { alt: 'Pratinjau foto', src: rec?.gambar || '' });
  prev.hidden = !rec?.gambar;
  const file = h('input', { type: 'file', id: 'd-file', accept: 'image/jpeg,image/png,image/webp' });
  const info = h('small', { class: 'muted' }, rec ? 'Pilih foto baru untuk mengganti. Foto otomatis dikecilkan (maks 1280 px).' : 'Foto otomatis dikecilkan (maks 1280 px) sebelum disimpan di database.');
  const url = h('input', { type: 'text', id: 'd-url', placeholder: 'atau path gambar situs, mis. /img/slide-1.jpg', autocomplete: 'off', maxlength: 500 });
  url.value = rec && !rec.unggahan ? rec.gambar || '' : '';
  file.addEventListener('change', async () => {
    const f = file.files[0]; if (!f) return;
    info.textContent = 'Memproses foto…';
    try { st.data = await compress(f); prev.src = st.data; prev.hidden = false; info.textContent = `Siap disimpan (${Math.round(st.data.length * 0.75 / 1024)} KB).`; }
    catch (e) { st.data = null; file.value = ''; info.textContent = errMsg(e); }
  });
  url.addEventListener('input', () => { const v = url.value.trim(); if (/^\/\S+$/.test(v)) { prev.src = v; prev.hidden = false; } });
  return h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Foto *'), h('div', { class: 'imgbox' }, prev, h('div', { class: 'col' }, file, url, info)));
}

/* ===================== impor massal ===================== */
function openBulk(b) {
  const ta = h('textarea', { id: 'bulk', rows: 10, placeholder: 'Tempel daftar di sini…' });
  openDialog(`Impor ${NOUN[b]}`, [h('p', { class: 'hint' }, BULK[b].hint), h('div', { class: 'field' }, h('label', { for: 'bulk' }, 'Data'), ta)], async () => {
    const list = ta.value.split('\n').map((l) => l.trim()).filter(Boolean).map(BULK[b].parse);
    if (!list.length) throw new Error('Tidak ada baris untuk diimpor');
    if (list.length > 300) throw new Error('Maksimal 300 baris per impor');
    list.forEach((r, i) => {
      if (!r.judul) throw new Error(`Baris ${i + 1}: nama/judul kosong`);
      if (b === 'kegiatan' && !/^\d{4}-\d{2}-\d{2}$/.test(r.tanggal || '')) throw new Error(`Baris ${i + 1}: tanggal harus YYYY-MM-DD`);
    });
    const res = await api.post('/landing/konten/bulk', { bagian: b, items: list });
    dlg.close(); await load(); render(); toast(`${res.ditambah} data ditambahkan`);
  }, 'Impor');
}

boot();
