-- Data awal BSC (Bank Sampah CINTA RW 21, Ciangsana). Sumber: daftar harga BS Barokah / BSC dan kategori jenis sampah BSC.
-- Harga = harga pengurus sebelum ke pengepul (per kg); ubah lewat menu Harga.
INSERT OR IGNORE INTO tps (id,nama,alamat,lat,lng,telpon) VALUES
 (1,'Bank Sampah CINTA RW 21','Blok AB 6 No 22A RT 11/21, Komplek TWP TNI AL Ciangsana, Gunung Putri, Kab. Bogor',NULL,NULL,'081382845578');

INSERT OR IGNORE INTO jenis_sampah (kode,nama,kategori,harga_per_kg,aktif) VALUES
 ('KRT-DUS','Dus / Kardus','Kertas',1000,1),
 ('KRT-PTH','Putihan (SWL / HVS)','Kertas',1200,1),
 ('KRT-KRN','Koran','Kertas',1000,1),
 ('KRT-DPL','Duplek','Kertas',500,1),
 ('KRT-SMN','Kantong Semen','Kertas',500,1),
 ('KRT-MJB','Majalah / Buku','Kertas',500,1),
 ('PLS-GLA','Gelas A','Plastik',2500,1),
 ('PLS-GLB','Gelas B','Plastik',1500,1),
 ('PLS-BTA','Botol A (Bodong A)','Plastik',3000,1),
 ('PLS-BTB','Botol B (Bodong B)','Plastik',1000,1),
 ('PLS-MIK','Plastik Mika','Plastik',50,1),
 ('PLS-EMH','Emberan Hitam','Plastik',400,1),
 ('PLS-EML','Emberan Lunak','Plastik',1300,1),
 ('PLS-EMK','Emberan Keras (mainan, helm, TV, monitor)','Plastik',500,1),
 ('PLS-CD','CD','Plastik',1800,1),
 ('PLS-KRS','Kresek (Asoy)','Plastik',200,1),
 ('PLS-BNG','Plastik Bening (Naso/Injek/Kreek)','Plastik',500,1),
 ('PLS-WRN','Plastik Warna / Bergambar','Plastik',50,1),
 ('PLS-SLP','Plastik Selopan Minyak (Slopan)','Plastik',100,1),
 ('PLS-KRP','Karpet','Plastik',200,1),
 ('PLS-KLK','Kulit Kabel','Plastik',300,1),
 ('PLS-KBU','Kabel Utuh','Plastik',3000,1),
 ('PLS-TGL','Tutup Galon / Tutup Botol','Plastik',2500,1),
 ('PLS-GBR','Gabrukan (campur aduk)','Plastik',1000,1),
 ('LOG-BSU','Besi Super','Logam',2500,1),
 ('LOG-KWT','Per / Kawat','Logam',100,1),
 ('LOG-KLG','Kaleng / Seng','Logam',700,1),
 ('LOG-ALM','Aluminium','Logam',8000,1),
 ('LOG-TBG','Tembaga','Logam',35000,1),
 ('LOG-WJN','Wajan / Regulator / Kran Besi','Logam',2500,1),
 ('LOG-STL','Stall (baja ringan)','Logam',2500,1),
 ('LOG-BTP','Kabin / Besi Tipis / Penutup Kipas Angin','Logam',100,1),
 ('LOG-ACC','Accu (Aki)','Logam',5000,1),
 ('KCA-BLG','Botol Beling / Beling Utuh','Kaca',100,1),
 ('MYK-JLT','Minyak Jelantah (Mijel)','Minyak',4000,1),
 ('LNN-SPT','Sepatu / Sandal','Lainnya',50,1),
 ('LNN-TTP','Tetra Pack','Lainnya',100,1),
 ('LNN-AC','AC Komplit','Lainnya',125000,1),
 ('LNN-LMP','Lampu Utuh','Lainnya',100,1),
 ('LNN-BAN','Ban Dalam Motor / Mobil','Lainnya',50,1),
 ('LNN-MON','Monitor Komputer','Lainnya',8000,1),
 ('LNN-MSC','Mesin Cuci (masih ada mesinnya)','Lainnya',25000,1);

INSERT OR IGNORE INTO edukasi (id,judul,kategori,isi) VALUES
 (1,'Cara memilah sampah di rumah','Pemilahan','Pisahkan sampah menjadi organik, anorganik (plastik, kertas, logam, kaca) dan minyak jelantah. Bilas botol dan gelas plastik, buang label dan pisahkan tutupnya sebelum disetor.'),
 (2,'Jadwal penimbangan Bank Sampah CINTA','Informasi','Penimbangan dilaksanakan rutin sekali dalam sebulan pada minggu ke-2: pukul 08.00-10.00 penimbangan, 10.00-12.00 pemilahan, 13.00-14.00 pengambilan oleh pengepul.'),
 (3,'Apa itu ekonomi sirkular?','Green Lifestyle','Ekonomi sirkular menjaga bahan tetap dipakai selama mungkin: dipakai, dikumpulkan, didaur ulang, lalu dipakai lagi, bukan dibuang.');
