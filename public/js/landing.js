// Landing publik: mengisi konten dari D1 (GET /api/publik/landing). HTML statis tetap jadi cadangan bila API gagal.
// Semua teks disisipkan lewat textContent (tanpa innerHTML) agar aman dari XSS.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const safeUrl = (u) => (/^(https?:\/\/|\/)[^\s<>"']*$/.test(u || '') ? u : '');
const lines = (t) => String(t || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
const paras = (t) => String(t || '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
const digits = (t) => String(t || '').replace(/\D/g, '');
const tglID = (iso) => { const d = new Date(iso + 'T00:00:00'); return Number.isNaN(+d) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };
const fill = (node, kids) => node.replaceChildren(...kids);

/* ---------- teks & kontak ---------- */
function applySettings(s) {
  $$('[data-set]').forEach((n) => { const v = s[n.dataset.set]; if (v) n.textContent = v; });
  $$('[data-paras]').forEach((n) => { const p = paras(s[n.dataset.paras]); if (p.length) fill(n, p.map((t) => el('p', '', t))); });
  $$('[data-list]').forEach((n) => { const l = lines(s[n.dataset.list]); if (l.length) fill(n, l.map((t) => el('li', '', t))); });
  $$('[data-lines]').forEach((n) => {
    const l = lines(s[n.dataset.lines]); if (!l.length) return;
    fill(n, l.flatMap((t, i) => (i ? [document.createElement('br'), document.createTextNode(t)] : [document.createTextNode(t)])));
  });
  $$('[data-href]').forEach((a) => { const u = safeUrl(s[a.dataset.href]); if (u) { a.href = u; a.target = '_blank'; a.rel = 'noopener'; } });
  $$('[data-tel]').forEach((a) => { const v = s[a.dataset.tel]; if (v) { a.textContent = v; a.href = 'tel:' + digits(v); } });
  $$('[data-wa]').forEach((a) => { let d = digits(s[a.dataset.wa]); if (!d) return; if (d.startsWith('0')) d = '62' + d.slice(1); a.href = 'https://wa.me/' + d; });
}

/* ---------- daftar konten ---------- */
function renderLog(items) {
  const ol = $('#log'); if (!ol) return;
  const sec = ol.closest('section');
  if (!items.length) { sec.hidden = true; return; }
  sec.hidden = false;
  fill(ol, items.map((k) => {
    const li = el('li'), body = el('div'), b = el('b', '', k.judul);
    li.append(el('time', '', k.tanggal ? tglID(k.tanggal) : ''), body); body.append(b);
    if (k.isi) body.append(el('span', '', k.isi));
    return li;
  }));
  const sub = $('#log-sub'); if (sub) sub.textContent = `${items.length} kegiatan tercatat, dari yang terbaru.`;
}
function renderPrestasi(items) {
  const g = $('#prestasi-list'); if (!g) return;
  g.hidden = !items.length;
  fill(g, items.map((k) => { const a = el('article', 'card'); a.append(el('b', '', k.tanggal || ''), el('p', '', k.judul + (k.isi ? ' — ' + k.isi : ''))); return a; }));
}
function renderNasabah(items) {
  const ul = $('#daftar'); if (!ul) return;
  const sec = ul.closest('section');
  if (!items.length) { sec.hidden = true; return; }
  sec.hidden = false;
  fill(ul, items.map((k) => { const li = el('li'); li.dataset.n = k.judul.toLowerCase(); li.append(el('b', '', k.judul), el('span', '', k.isi || '')); return li; }));
  searchInit();
}

/* ---------- pencarian nasabah ---------- */
let searchBound = false;
function searchInit() {
  const q = $('#cari'), kosong = $('#kosong'); if (!q) return;
  const run = () => {
    const t = q.value.trim().toLowerCase(); let n = 0;
    $$('#daftar li').forEach((li) => { const ok = !t || li.textContent.toLowerCase().includes(t); li.hidden = !ok; if (ok) n++; });
    kosong.hidden = n > 0;
  };
  if (!searchBound) { q.addEventListener('input', run); searchBound = true; }
  run();
}

/* ---------- slider ---------- */
let timer = null;
function sliderInit(items) {
  const wrap = $('#slider'), track = $('#slides'); if (!wrap) return;
  const sec = wrap.closest('section');
  if (items) {
    if (!items.length) { sec.hidden = true; return; }
    sec.hidden = false;
    fill(track, items.map((k, i) => {
      const f = el('figure', 'slide'), img = el('img'); img.src = k.gambar; img.alt = k.judul; if (i) img.loading = 'lazy';
      f.append(img, el('figcaption', '', k.judul)); return f;
    }));
  }
  const slides = $$('.slide', track), dots = $('#sl-dots'); let cur = 0;
  fill(dots, slides.map((_, i) => { const b = el('button'); b.type = 'button'; b.setAttribute('aria-label', 'Foto ' + (i + 1)); b.addEventListener('click', () => go(i)); return b; }));
  const mark = () => $$('button', dots).forEach((b, i) => b.setAttribute('aria-current', String(i === cur)));
  const go = (i) => { cur = (i + slides.length) % slides.length; track.scrollTo({ left: slides[cur].offsetLeft - track.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); mark(); };
  track.addEventListener('scroll', () => { const i = Math.round(track.scrollLeft / track.clientWidth); if (i !== cur && i >= 0 && i < slides.length) { cur = i; mark(); } }, { passive: true });
  $('#sl-prev').onclick = () => go(cur - 1); $('#sl-next').onclick = () => go(cur + 1);
  const multi = slides.length > 1;
  $('#sl-prev').hidden = $('#sl-next').hidden = dots.hidden = !multi;
  clearInterval(timer);
  if (multi && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const start = () => { clearInterval(timer); timer = setInterval(() => go(cur + 1), 5500); }, stop = () => clearInterval(timer);
    ['mouseenter', 'focusin', 'touchstart'].forEach((ev) => wrap.addEventListener(ev, stop, { passive: true }));
    ['mouseleave', 'focusout'].forEach((ev) => wrap.addEventListener(ev, start));
    start();
  }
  mark();
}

/* ---------- mulai ---------- */
sliderInit(); searchInit();   // cadangan statis langsung berfungsi
fetch('/api/publik/landing', { headers: { accept: 'application/json' } })
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then(({ setting, konten }) => {
    applySettings(setting || {});
    const by = (b) => konten.filter((k) => k.bagian === b);
    sliderInit(by('slider').filter((k) => safeUrl(k.gambar)));
    renderLog(by('kegiatan')); renderPrestasi(by('prestasi')); renderNasabah(by('nasabah'));
  })
  .catch(() => {});
