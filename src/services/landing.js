// Service Landing: konten halaman publik (/) yang dikelola Admin lewat /admin.
// Publik: GET /api/publik/landing, GET /api/publik/gambar/:id. Admin (super_admin): sisanya.
// Tabel: landing_setting (kunci->nilai teks) dan landing_konten (slider, kegiatan, prestasi, nasabah).
import { json, body, fail, validate } from '../lib/http.js';
import { all, first, run, q, batch, insertRow, updateRow } from '../lib/db.js';
import { SUP } from '../lib/roles.js';

const BAGIAN = ['slider', 'kegiatan', 'prestasi', 'nasabah'];
const SORT_BY_DATE = ['kegiatan', 'prestasi'];   // diurutkan tanggal terbaru; sisanya menurut kolom urutan

// Kunci pengaturan yang boleh disimpan (nilai = panjang maksimum). Kunci lain ditolak.
const SETTING_KEYS = {
  hero_eyebrow: 120, hero_judul: 160, hero_lead: 400,
  stat_1_angka: 20, stat_1_label: 80, stat_2_angka: 20, stat_2_label: 80,
  stat_3_angka: 20, stat_3_label: 80, stat_4_angka: 20, stat_4_label: 80,
  tentang_judul: 120, tentang_isi: 3000, visi: 300, misi: 1000,
  dokumentasi_isi: 600, link_dokumentasi: 500,
  jadwal_ket: 300, tips: 1000, mitra: 600,
  kontak_nama: 120, kontak_alamat: 400, kontak_telp: 30, kontak_wa: 30, footer: 200,
};

const IMG_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const PATH_RE = /^\/[^\s<>"']*$/;
const URL_RE = /^(https?:\/\/|\/)[^\s<>"']*$/;
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const KONTEN_RULES = {
  bagian: { required: true, oneOf: BAGIAN },
  judul: { required: true, max: 200, label: 'Judul' },
  isi: { max: 2000 },
  tanggal: { max: 10, pattern: /^(\d{4}(-\d{2}-\d{2})?)?$/, msg: 'Tanggal tidak valid' },
  tautan: { max: 500, pattern: URL_RE, msg: 'Tautan harus diawali http(s):// atau /' },
  gambar: { max: 500, pattern: PATH_RE, msg: 'Path gambar harus diawali / (gambar situs lain diblokir CSP; unggah fotonya)' },
  gambar_data: { max: 420000, pattern: IMG_RE, msg: 'Gambar harus JPEG/PNG/WebP' },
  urutan: { type: 'number', min: 0, max: 100000 },
  tampil: { type: 'number', min: 0, max: 1 },
};

// URL gambar yang dikirim ke klien: data unggahan dilayani lewat /api/publik/gambar/:id (cache-friendly).
const GAMBAR_SQL = `CASE WHEN gambar_data IS NOT NULL AND gambar_data!='' THEN '/api/publik/gambar/'||id||'?v='||strftime('%s',updated_at)
                         WHEN gambar!='' THEN gambar END AS gambar`;
const COLS = `id,bagian,urutan,judul,isi,tanggal,tautan,tampil,${GAMBAR_SQL}`;
const ORDER = `ORDER BY bagian, CASE WHEN bagian IN ('kegiatan','prestasi') THEN 0 ELSE urutan END, tanggal DESC, urutan, id`;

const settingsMap = async (env) => Object.fromEntries((await all(env, 'SELECT kunci,nilai FROM landing_setting')).map((r) => [r.kunci, r.nilai]));
const nextUrutan = async (env, bagian) => ((await first(env, 'SELECT COALESCE(MAX(urutan),0)+1 AS n FROM landing_konten WHERE bagian=?', bagian)).n);

export const register = (r) => {
  /* ---------- publik ---------- */
  r.add('GET', '/api/publik/landing', null, async ({ env }) => json({
    setting: await settingsMap(env),
    konten: await all(env, `SELECT ${COLS} FROM landing_konten WHERE tampil=1 ${ORDER}`),
  }, 200, { 'cache-control': 'public, max-age=60' }));

  r.add('GET', '/api/publik/gambar/:id', null, async ({ env, params }) => {
    const row = await first(env, 'SELECT gambar_data FROM landing_konten WHERE id=? AND tampil=1', params.id);
    const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(row?.gambar_data || '');
    if (!m) fail(404, 'Gambar tidak ditemukan');
    const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    return new Response(bin, { headers: { 'content-type': m[1], 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } });
  });

  /* ---------- admin ---------- */
  r.add('GET', '/api/landing/admin', SUP, async ({ env }) => json({
    setting: await settingsMap(env),
    keys: SETTING_KEYS,
    konten: await all(env, `SELECT ${COLS}, (gambar_data IS NOT NULL AND gambar_data!='') AS unggahan FROM landing_konten ${ORDER}`),
  }));

  r.add('PUT', '/api/landing/setting', SUP, async ({ req, env }) => {
    const data = await body(req), stmts = [];
    for (const [k, v] of Object.entries(data || {})) {
      if (!(k in SETTING_KEYS)) fail(422, `Pengaturan tidak dikenal: ${k}`);
      const s = String(v ?? '').trim();
      if (s.length > SETTING_KEYS[k]) fail(422, `Isi "${k}" terlalu panjang (maks ${SETTING_KEYS[k]} karakter)`);
      if (k === 'link_dokumentasi' && s && !URL_RE.test(s)) fail(422, 'Link dokumentasi harus diawali http(s):// atau /');
      stmts.push(q(env, `INSERT INTO landing_setting(kunci,nilai,updated_at) VALUES(?,?,?)
        ON CONFLICT(kunci) DO UPDATE SET nilai=excluded.nilai, updated_at=excluded.updated_at`, k, s, now()));
    }
    if (!stmts.length) fail(422, 'Tidak ada data yang diubah');
    await batch(env, stmts);
    return json({ ok: true, diubah: stmts.length });
  });

  r.add('POST', '/api/landing/konten', SUP, async ({ req, env }) => {
    const d = validate(await body(req), KONTEN_RULES);
    if (d.bagian === 'slider' && !d.gambar && !d.gambar_data) fail(422, 'Foto slider wajib diisi (unggah atau URL)');
    if (d.urutan === undefined) d.urutan = await nextUrutan(env, d.bagian);
    d.updated_at = now();
    return json({ id: (await insertRow(env, 'landing_konten', d)).meta.last_row_id }, 201);
  });

  // Impor massal (mis. daftar nasabah): items = [{judul, isi?, tanggal?}], maks 300.
  r.add('POST', '/api/landing/konten/bulk', SUP, async ({ req, env }) => {
    const { bagian, items } = await body(req);
    if (!BAGIAN.includes(bagian) || bagian === 'slider') fail(422, 'Bagian tidak valid untuk impor massal');
    if (!Array.isArray(items) || !items.length || items.length > 300) fail(422, 'Impor 1–300 baris');
    let u = await nextUrutan(env, bagian);
    const stmts = items.map((it) => {
      const d = validate(it, { judul: KONTEN_RULES.judul, isi: KONTEN_RULES.isi, tanggal: KONTEN_RULES.tanggal });
      return q(env, 'INSERT INTO landing_konten(bagian,urutan,judul,isi,tanggal,updated_at) VALUES(?,?,?,?,?,?)',
        bagian, u++, d.judul, d.isi || '', d.tanggal || null, now());
    });
    await batch(env, stmts);
    return json({ ok: true, ditambah: stmts.length }, 201);
  });

  r.add('POST', '/api/landing/konten/urut', SUP, async ({ req, env }) => {
    const { ids } = await body(req);
    if (!Array.isArray(ids) || !ids.length || ids.length > 1000 || ids.some((i) => !Number.isInteger(i))) fail(422, 'Daftar id tidak valid');
    await batch(env, ids.map((id, i) => q(env, 'UPDATE landing_konten SET urutan=?, updated_at=? WHERE id=?', i + 1, now(), id)));
    return json({ ok: true });
  });

  r.add('PUT', '/api/landing/konten/:id', SUP, async ({ req, env, params }) => {
    const raw = await req.json().catch(() => fail(400, 'JSON tidak valid'));
    const { bagian: _b, ...rest } = KONTEN_RULES;           // bagian tidak boleh dipindah
    const rules = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, { ...v, required: false }]));  // update parsial
    if ('judul' in raw && !String(raw.judul ?? '').trim()) fail(422, 'Judul wajib diisi');
    const d = validate(raw, rules);
    if (raw.hapus_gambar) { d.gambar_data = null; d.gambar = d.gambar || ''; }
    else if (d.gambar_data) d.gambar = '';                  // unggahan baru menggantikan URL lama
    d.updated_at = now();
    await updateRow(env, 'landing_konten', params.id, d);
    return json({ ok: true });
  });

  r.add('DELETE', '/api/landing/konten/:id', SUP, async ({ env, params }) => {
    await run(env, 'DELETE FROM landing_konten WHERE id=?', params.id);
    return json({ ok: true });
  });
};
