-- Skema D1 (SQLite) BSC (Bank Sampah CINTA). Diturunkan dari kepik.sql (master_users, bs_barang,
-- bs_cartbarang, data_pencairan, bs_kontak) dan dirapikan + dinormalisasi.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  alamat TEXT NOT NULL DEFAULT '',
  lat REAL, lng REAL,
  telpon TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  no_hp TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  pin_hash TEXT NOT NULL,                       -- PBKDF2-SHA256, bukan PIN polos
  role TEXT NOT NULL DEFAULT 'nasabah' CHECK (role IN ('nasabah','admin_tps','pengepul','super_admin')),
  tps_id INTEGER REFERENCES tps(id) ON DELETE SET NULL,
  aktif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jenis_sampah (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL,
  harga_per_kg INTEGER NOT NULL CHECK (harga_per_kg >= 0),
  aktif INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS setoran (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  jenis_id INTEGER NOT NULL REFERENCES jenis_sampah(id),
  tps_id INTEGER NOT NULL REFERENCES tps(id),
  berat_kg REAL NOT NULL CHECK (berat_kg > 0),
  harga_per_kg INTEGER NOT NULL,                -- snapshot harga saat setor
  nilai INTEGER NOT NULL,
  foto TEXT,                                    -- data URL JPEG terkompres (<=~280KB)
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','disetujui','ditolak')),
  catatan TEXT NOT NULL DEFAULT '',
  verified_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS penukaran (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  nominal INTEGER NOT NULL CHECK (nominal > 0),
  metode TEXT NOT NULL,
  tujuan TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','selesai','ditolak')),
  processed_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifikasi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  isi TEXT NOT NULL,
  dibaca INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS edukasi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  judul TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Umum',
  isi TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Penjualan dari TPS ke pengepul. Stok TPS = setoran disetujui - penjualan (menunggu/diterima), dihitung bukan disimpan.
CREATE TABLE IF NOT EXISTS penjualan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  tps_id INTEGER NOT NULL REFERENCES tps(id),
  pengepul_id INTEGER NOT NULL REFERENCES users(id),
  jenis_id INTEGER NOT NULL REFERENCES jenis_sampah(id),
  berat_kg REAL NOT NULL CHECK (berat_kg > 0),
  harga_per_kg INTEGER NOT NULL CHECK (harga_per_kg >= 0),   -- snapshot harga kesepakatan
  nilai INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','diterima','ditolak','dibatalkan')),
  catatan TEXT NOT NULL DEFAULT '',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Jejak delegasi peran (pengguna -> petugas / pengepul, atau dicabut kembali).
CREATE TABLE IF NOT EXISTS delegasi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  dari_role TEXT NOT NULL,
  ke_role TEXT NOT NULL,
  tps_id INTEGER REFERENCES tps(id) ON DELETE SET NULL,
  oleh INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Anti-replay captcha: satu captcha hanya boleh dipakai sekali.
CREATE TABLE IF NOT EXISTS captcha_used (nonce TEXT PRIMARY KEY, exp INTEGER NOT NULL);

CREATE INDEX IF NOT EXISTS idx_setoran_user ON setoran(user_id, status);
CREATE INDEX IF NOT EXISTS idx_setoran_tps ON setoran(tps_id, status);
CREATE INDEX IF NOT EXISTS idx_tukar_user ON penukaran(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifikasi(user_id, dibaca);
CREATE INDEX IF NOT EXISTS idx_jual_tps ON penjualan(tps_id, jenis_id, status);
CREATE INDEX IF NOT EXISTS idx_jual_pgp ON penjualan(pengepul_id, status);
CREATE INDEX IF NOT EXISTS idx_delegasi_user ON delegasi(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
