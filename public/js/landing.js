// Pencarian nasabah di landing page (tanpa data pribadi: hanya nama dan RT).
const q = document.getElementById('cari'), items = [...document.querySelectorAll('#daftar li')], kosong = document.getElementById('kosong');
q?.addEventListener('input', () => {
  const t = q.value.trim().toLowerCase();
  let n = 0;
  items.forEach((li) => { const ok = !t || li.dataset.n.includes(t) || li.textContent.toLowerCase().includes(t); li.hidden = !ok; if (ok) n++; });
  kosong.hidden = n > 0;
});
