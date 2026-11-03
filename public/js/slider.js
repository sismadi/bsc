// Slider generik & dapat dipakai ulang: tandai elemen dengan [data-slider] berisi .slides > .slide.
// Markup sudah bisa digeser tanpa JS; modul ini hanya menambah tombol, titik, keyboard, dan autoplay.
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

function build(root) {
  const track = root.querySelector('.slides'), slides = [...track.children];
  if (slides.length < 2) return;
  const delay = +root.dataset.interval || 5000;
  let i = 0, timer = null;

  const mk = (cls, label, html) => Object.assign(document.createElement('button'), { type: 'button', className: cls, ariaLabel: label, innerHTML: html });
  const prev = mk('s-btn prev', 'Sebelumnya', '&#8249;'), next = mk('s-btn next', 'Berikutnya', '&#8250;');
  const dots = Object.assign(document.createElement('div'), { className: 's-dots' });
  const dotBtns = slides.map((_, n) => dots.appendChild(mk('', `Slide ${n + 1}`, '')));
  root.append(prev, next, dots);
  root.setAttribute('aria-roledescription', 'carousel');
  track.setAttribute('aria-live', 'off');

  const mark = (n) => { i = n; dotBtns.forEach((d, k) => d.setAttribute('aria-current', k === n)); };
  const go = (n) => {
    const t = (n + slides.length) % slides.length;
    track.scrollTo({ left: t * track.clientWidth, behavior: REDUCED ? 'auto' : 'smooth' });
    mark(t);
  };
  const stop = () => { clearInterval(timer); timer = null; };
  const play = () => { if (!REDUCED && !timer && !document.hidden) timer = setInterval(() => go(i + 1), delay); };

  prev.onclick = () => go(i - 1);
  next.onclick = () => go(i + 1);
  dotBtns.forEach((d, n) => (d.onclick = () => go(n)));
  track.addEventListener('scroll', () => mark(Math.round(track.scrollLeft / track.clientWidth)), { passive: true });
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
  });
  ['pointerenter', 'focusin', 'touchstart'].forEach((ev) => root.addEventListener(ev, stop, { passive: true }));
  ['pointerleave', 'focusout'].forEach((ev) => root.addEventListener(ev, play));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));
  mark(0);
  play();
}

export const initSliders = (scope = document) => scope.querySelectorAll('[data-slider]').forEach(build);
