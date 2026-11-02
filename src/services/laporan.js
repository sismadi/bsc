// Service Laporan: rekap bulanan per kategori (setoran disetujui) + ringkasan penjualan ke pengepul.
// Super admin = semua TPS, petugas = TPS miliknya (?1 NULL -> semua). Dihitung dari transaksi, tidak disimpan.
import { json, fail } from '../lib/http.js';
import { all } from '../lib/db.js';
import { ADM } from '../lib/roles.js';

export const register = (r) => {
  r.add('GET', '/api/laporan/rekap', ADM, async ({ env, user, url }) => {
    const scope = user.role === 'admin_tps' ? user.tps_id : null;
    const tahun = url.searchParams.get('tahun') || String(new Date().getUTCFullYear());
    if (!/^\d{4}$/.test(tahun)) fail(422, 'Tahun tidak valid');
    const setoran = await all(env,
      `SELECT strftime('%m', s.created_at) AS bulan, j.kategori, ROUND(SUM(s.berat_kg),2) AS kg, SUM(s.nilai) AS nilai
         FROM setoran s JOIN jenis_sampah j ON j.id=s.jenis_id
        WHERE s.status='disetujui' AND strftime('%Y', s.created_at)=?2 AND (?1 IS NULL OR s.tps_id=?1)
        GROUP BY bulan, j.kategori ORDER BY bulan, j.kategori`, scope, tahun);
    const penjualan = await all(env,
      `SELECT strftime('%m', p.created_at) AS bulan, ROUND(SUM(p.berat_kg),2) AS kg, SUM(p.nilai) AS nilai
         FROM penjualan p
        WHERE p.status='diterima' AND strftime('%Y', p.created_at)=?2 AND (?1 IS NULL OR p.tps_id=?1)
        GROUP BY bulan ORDER BY bulan`, scope, tahun);
    const [saldo] = await all(env,
      `SELECT COALESCE((SELECT SUM(nilai) FROM setoran WHERE status='disetujui'),0)
            - COALESCE((SELECT SUM(nominal) FROM penukaran WHERE status IN ('menunggu','selesai')),0) AS saldo_nasabah`);
    return json({ tahun, setoran, penjualan, saldo_nasabah: saldo.saldo_nasabah });
  });
};
