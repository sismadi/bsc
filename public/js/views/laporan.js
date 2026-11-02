// Laporan & rekapitulasi bulanan (format seperti papan "Data Serapan Sampah" BSC): kg per kategori + nilai per bulan.
import { api } from '../api.js';
import { esc, rupiah, empty, on } from '../ui.js';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const num = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });

export async function laporan(el) {
  let tahun = new Date().getFullYear();
  const draw = async () => {
    const d = await api.get('/laporan/rekap?tahun=' + tahun);
    const kats = [...new Set(d.setoran.map((r) => r.kategori))];
    const cell = (b, k) => d.setoran.find((r) => r.bulan === b && r.kategori === k);
    const rows = BULAN.map((nm, i) => {
      const b = String(i + 1).padStart(2, '0'), per = kats.map((k) => cell(b, k)), kg = per.reduce((a, c) => a + (c?.kg || 0), 0), nilai = per.reduce((a, c) => a + (c?.nilai || 0), 0);
      const jual = d.penjualan.find((r) => r.bulan === b);
      return { nm, per, kg, nilai, jual };
    });
    const sum = (f) => rows.reduce((a, r) => a + f(r), 0);
    el.innerHTML = `<h2>Laporan Pengelolaan ${tahun}</h2>
      <div class="chips"><button class="chip" data-y="-1">◀ ${tahun - 1}</button><button class="chip" data-y="1">${tahun + 1} ▶</button><button class="chip on" id="cetak">Cetak</button></div>
      <div class="stats"><div class="stat"><span class="muted">Total sampah (kg)</span><b>${num(sum((r) => r.kg))}</b></div>
        <div class="stat"><span class="muted">Nilai setoran</span><b>${rupiah(sum((r) => r.nilai))}</b></div>
        <div class="stat"><span class="muted">Penjualan ke pengepul</span><b>${rupiah(sum((r) => r.jual?.nilai || 0))}</b></div>
        <div class="stat"><span class="muted">Saldo seluruh nasabah</span><b>${rupiah(d.saldo_nasabah)}</b></div></div>
      <div class="tablewrap">${kats.length ? `<table><thead><tr><th>Bulan</th>${kats.map((k) => `<th>${esc(k)} (kg)</th>`).join('')}<th>Total kg</th><th>Nilai</th><th>Terjual</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${r.nm}</td>${r.per.map((c) => `<td>${c ? num(c.kg) : '–'}</td>`).join('')}<td>${num(r.kg)}</td><td>${rupiah(r.nilai)}</td><td>${r.jual ? rupiah(r.jual.nilai) : '–'}</td></tr>`).join('')}
        </tbody></table>` : empty('Belum ada setoran disetujui pada tahun ini.')}</div>`;
    on(el, 'click', '[data-y]', (e, b) => { tahun += Number(b.dataset.y); draw(); });
    on(el, 'click', '#cetak', () => window.print());
  };
  return draw();
}
