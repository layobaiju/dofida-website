(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const inr = (n) => Math.round(n).toLocaleString('en-IN');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Strings in the page's language, provided by the server.
  let STR = {};
  try { STR = JSON.parse($('#i18n')?.textContent || '{}'); } catch { /* fall back to keys */ }
  const tr = (key, vals = {}) => (STR[key] || key).replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));
  const LANG = document.documentElement.lang || 'en';
  $$('.br-lang a').forEach((a) => a.setAttribute('aria-current', String(a.dataset.lang === LANG)));

  const app = $('#app');
  const stage = $('#stage');
  const slides = $$('.br-slide', stage);
  const segs = $('#segs');
  const PRICE = {
    first: Number(app.dataset.first),
    additional: Number(app.dataset.additional),
    monthly: Number(app.dataset.monthly),
  };
  const DUR = 7000;

  // Embedded on the home page (in an iframe) or opened on its own page?
  const embedded = window.self !== window.top || new URLSearchParams(location.search).has('embed');
  document.body.classList.toggle('is-embed', embedded);

  // ---------- Logo stars ----------
  const STAR = 'M50 9 L61.17 37.63 L91.85 39.4 L68.07 58.87 L75.86 88.6 L50 72 L24.14 88.6 L31.93 58.87 L8.15 39.4 L38.83 37.63 Z';
  $$('[data-star]').forEach((el, i) => {
    el.innerHTML = `<svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><defs><clipPath id="s${i}l"><rect width="50" height="100"/></clipPath><clipPath id="s${i}r"><rect x="50" width="50" height="100"/></clipPath></defs><path clip-path="url(#s${i}l)" class="star-fill" d="${STAR}"/><path clip-path="url(#s${i}r)" class="star-line" d="${STAR}" pathLength="260"/></svg>`;
  });

  // ---------- Stagger: each animated element waits a little longer than the last ----------
  slides.forEach((slide, n) => {
    $$('[data-a], .br-steps li, .br-checks li', slide).forEach((el, i) => el.style.setProperty('--i', i));
    slide.setAttribute('aria-label', tr('bro.slideOf', { n: n + 1, total: slides.length, title: slide.dataset.title }));
  });

  // ---------- Progress segments ----------
  slides.forEach((slide, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', tr('bro.goTo', { n: i + 1, title: slide.dataset.title }));
    b.innerHTML = '<span></span>';
    b.addEventListener('click', () => go(i));
    segs.appendChild(b);
  });
  const segBtns = $$('button', segs);

  // ---------- Slide transitions ----------
  // Every slide has its own entrance (data-t). Going backwards plays it mirrored.
  const EASE = 'cubic-bezier(.76, 0, .24, 1)';
  const transitions = {
    split: () => ({ enter: [{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)' }], leave: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.9)', opacity: 0 }] }),
    wipe: (d) => ({
      enter: [{ clipPath: d > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      leave: [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-d * 25}%)`, opacity: 0.2 }],
    }),
    zoom: () => ({ enter: [{ transform: 'scale(1.3)', opacity: 0, filter: 'blur(12px)' }, { transform: 'scale(1)', opacity: 1, filter: 'blur(0)' }], leave: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.8)', opacity: 0 }] }),
    circle: (d) => {
      const at = d > 0 ? '88% 88%' : '12% 88%';
      return { enter: [{ clipPath: `circle(0% at ${at})` }, { clipPath: `circle(150% at ${at})` }], leave: [{ filter: 'brightness(1)' }, { filter: 'brightness(.35)' }] };
    },
    rise: (d) => ({ enter: [{ transform: `translateY(${d * 100}%)` }, { transform: 'translateY(0)' }], leave: [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${-d * 30}%)`, opacity: 0 }] }),
    flip: (d) => ({
      enter: [{ transform: `rotateY(${d * 75}deg) translateZ(-200px)`, opacity: 0 }, { transform: 'rotateY(0) translateZ(0)', opacity: 1 }],
      leave: [{ transform: 'rotateY(0) translateZ(0)', opacity: 1 }, { transform: `rotateY(${-d * 75}deg) translateZ(-200px)`, opacity: 0 }],
    }),
    diagonal: (d) => ({
      enter: [{ clipPath: d > 0 ? 'polygon(0 0, 0 0, 0 0)' : 'polygon(100% 100%, 100% 100%, 100% 100%)' }, { clipPath: d > 0 ? 'polygon(0 0, 220% 0, 0 220%)' : 'polygon(100% 100%, -120% 100%, 100% -120%)' }],
      leave: [{ transform: 'scale(1)' }, { transform: 'scale(.94)' }],
    }),
  };

  let index = 0;
  let running = [];

  function go(next, dir) {
    next = (next + slides.length) % slides.length;
    if (next === index) return;
    dir = dir || (next > index ? 1 : -1);
    running.forEach((a) => a.finish());
    running = [];
    const from = slides[index];
    const to = slides[next];
    slides.forEach((s) => s.classList.remove('is-leaving'));
    from.classList.remove('is-active');
    from.classList.add('is-leaving');
    to.classList.add('is-active');
    to.scrollTop = 0;
    index = next;
    onEnter(to);
    render();
    elapsed = 0;

    if (reduceMotion) { from.classList.remove('is-leaving'); return; }
    const t = (transitions[to.dataset.t] || transitions.wipe)(dir);
    const opts = { duration: 950, easing: EASE };
    running = [to.animate(t.enter, opts), from.animate(t.leave, opts)];
    running[1].finished.then(() => from.classList.remove('is-leaving')).catch(() => {});
  }

  function render() {
    segBtns.forEach((b, i) => {
      b.classList.toggle('is-active', i === index);
      b.classList.toggle('is-done', i < index);
      b.setAttribute('aria-current', i === index ? 'true' : 'false');
      if (i !== index) b.style.removeProperty('--p');
    });
    $('#count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    $('#title').textContent = slides[index].dataset.title;
    slides.forEach((s, i) => s.setAttribute('aria-hidden', String(i !== index)));
  }

  // ---------- Things that start when a slide arrives ----------
  let houseTimer = null;
  function onEnter(slide) {
    $$('[data-count]', slide).forEach((el) => countUp(el, Number(el.dataset.count)));
    clearInterval(houseTimer);
    if (slide.querySelector('#houses')) startHouses();
  }

  function countUp(el, target) {
    if (reduceMotion) { el.textContent = inr(target); return; }
    const start = performance.now() + 450;
    const dur = 1300;
    el.textContent = '0';
    (function frame(now) {
      const t = clamp((now - start) / dur, 0, 1);
      el.textContent = inr(target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(frame);
    })(performance.now());
  }

  // Monthly slide: nurseries keep being added, the price stays the same.
  const HOUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>';
  function startHouses() {
    const box = $('#houses');
    const count = $('#houseCount');
    const word = $('#houseWord');
    let n = 0;
    const step = () => {
      n = n >= 10 ? 1 : n + 1;
      if (n === 1) box.innerHTML = '';
      box.insertAdjacentHTML('beforeend', HOUSE);
      count.textContent = n;
      word.textContent = n === 1 ? tr('bro.nursery') : tr('bro.nurseries');
    };
    step();
    houseTimer = setInterval(step, reduceMotion ? 1500 : 650);
  }

  // ---------- Calculator ----------
  const calcRange = $('#calcRange');
  function calc(n) {
    n = clamp(Math.round(n) || 1, 1, 20);
    calcRange.value = n;
    $('#calcN').textContent = n;
    const once = PRICE.first + (n - 1) * PRICE.additional;
    $('#calcOnce').textContent = inr(once);
    $('#calcYear').textContent = inr(once + 12 * PRICE.monthly);
    $('#calcBar').innerHTML = '<i></i>'.repeat(n);
    $('#calcN').animate?.([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
  }
  calcRange.addEventListener('input', () => { calc(calcRange.valueAsNumber); hold(); });
  $$('.br-calc [data-step]').forEach((b) => b.addEventListener('click', () => { calc(calcRange.valueAsNumber + Number(b.dataset.step)); hold(); }));
  calc(1);

  // ---------- Autoplay ----------
  const playBtn = $('#play');
  let playing = !reduceMotion;
  let visible = true;
  let pointerDown = false;
  let holdUntil = 0;
  let elapsed = 0;
  let last = performance.now();
  const hold = (ms = 15000) => { holdUntil = performance.now() + ms; };

  function setPlaying(p) {
    playing = p;
    playBtn.setAttribute('aria-pressed', String(p));
    playBtn.setAttribute('aria-label', p ? tr('bro.pause') : tr('bro.play'));
  }
  setPlaying(playing);
  playBtn.addEventListener('click', () => setPlaying(!playing));

  (function tick(now) {
    const dt = now - last;
    last = now;
    if (playing && visible && !pointerDown && now > holdUntil && !document.hidden) {
      elapsed += dt;
      if (elapsed >= DUR) go(index + 1, 1);
    }
    segBtns[index].style.setProperty('--p', clamp(elapsed / DUR, 0, 1).toFixed(3));
    requestAnimationFrame(tick);
  })(last);

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.35 }).observe(stage);

  // ---------- Controls: buttons, keys, swipe, tap, wheel ----------
  $('#prev').addEventListener('click', () => go(index - 1, -1));
  $('#next').addEventListener('click', () => go(index + 1, 1));

  const typing = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  document.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(index + 1, 1); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(index - 1, -1); }
    else if (e.key === 'Home') go(0, -1);
    else if (e.key === 'End') go(slides.length - 1, 1);
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    else if (e.key === 'p' || e.key === 'P') setPlaying(!playing);
  });

  const interactive = (el) => el.closest('a, button, input, label, output, .br-calc');
  let sx = 0, sy = 0, st = 0, tracking = false;
  stage.addEventListener('pointerdown', (e) => {
    pointerDown = true;
    if (interactive(e.target)) return;
    tracking = true; sx = e.clientX; sy = e.clientY; st = performance.now();
  });
  const end = (e) => {
    pointerDown = false;
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) { go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); return; }
    // Tap the left or right edge on touch screens, like stories.
    if (e.pointerType !== 'mouse' && Math.abs(dx) < 10 && Math.abs(dy) < 10 && performance.now() - st < 350) {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      if (x > 0.7) go(index + 1, 1);
      else if (x < 0.3) go(index - 1, -1);
    }
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', () => { pointerDown = false; tracking = false; });

  // Mouse wheel / trackpad. Embedded on the home page, only sideways swipes are used,
  // so scrolling the page with the wheel still works.
  let wheelLock = 0;
  let acc = 0;
  stage.addEventListener('wheel', (e) => {
    const slide = slides[index];
    const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (embedded && !sideways) return;
    if (!sideways) {
      const canScroll = slide.scrollHeight > slide.clientHeight + 2;
      const atTop = slide.scrollTop <= 0;
      const atBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 2;
      if (canScroll && ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop))) return;
    }
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    acc += sideways ? e.deltaX : e.deltaY;
    if (Math.abs(acc) > 40) {
      go(index + (acc > 0 ? 1 : -1), acc > 0 ? 1 : -1);
      acc = 0;
      wheelLock = now + 900;
    }
  }, { passive: false });

  // ---------- Full screen ----------
  const fsBtn = $('#fs');
  const fsEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (!fsEnabled) fsBtn.hidden = true;
  function toggleFullscreen() {
    if (!fsEnabled) return;
    const doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
    else (app.requestFullscreen || app.webkitRequestFullscreen).call(app);
  }
  fsBtn.addEventListener('click', toggleFullscreen);

  // ---------- Start ----------
  render();
  // next frame, so the cover's entrance animation plays
  requestAnimationFrame(() => requestAnimationFrame(() => { slides[0].classList.add('is-active'); onEnter(slides[0]); }));
})();
