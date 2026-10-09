(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const inr = (n) => Math.round(n).toLocaleString('en-IN');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  // ---------------- Always open at the top ----------------
  // Browsers restore the last scroll position (and jump to any #section in the
  // address) on reload. The site always starts at the top with the intro.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  scrollTo(0, 0);
  addEventListener('pageshow', (e) => { if (e.persisted) scrollTo(0, 0); });

  // In-page links scroll smoothly without adding #section to the address.
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target && id !== 'top') return;
    e.preventDefault();
    const y = target ? target.getBoundingClientRect().top + scrollY - (id === 'top' ? 0 : 20) : 0;
    scrollTo({ top: id === 'top' ? 0 : y, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  // ---------------- Intro: split-down reveal ----------------
  const intro = $('#intro');
  let introDone = false;
  function endIntro() {
    if (introDone) return;
    introDone = true;
    store.set('dofida-intro', '1');
    intro.classList.add('is-out');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    setTimeout(() => intro.classList.add('is-gone'), 1300);
  }
  const seen = store.get('dofida-intro');
  const introDelay = reduceMotion ? 0 : seen ? 1200 : 2700;
  setTimeout(endIntro, introDelay);
  $('.intro__skip').addEventListener('click', endIntro);
  intro.addEventListener('click', endIntro);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') endIntro(); }, { once: true });

  // ---------------- Falling leaves ----------------
  const leaves = $('.leaves');
  if (leaves && !reduceMotion) {
    const leafSvg = (c) => `<svg viewBox="0 0 24 24"><path fill="${c}" d="M5 21c0-9 6-16 16-17-1 10-8 16-16 17zm0 0 9-10"/></svg>`;
    const colors = ['#6E8EEA', '#141A2E', '#3F8F6B', '#8EA6F0'];
    const count = innerWidth < 700 ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'leaf';
      el.innerHTML = leafSvg(colors[i % colors.length]);
      el.style.left = `${Math.random() * 100}%`;
      el.style.setProperty('--s', `${10 + Math.random() * 16}px`);
      el.style.setProperty('--t', `${14 + Math.random() * 14}s`);
      el.style.setProperty('--delay', `${-Math.random() * 20}s`);
      el.style.setProperty('--x', `${(Math.random() - 0.5) * 300}px`);
      leaves.appendChild(el);
    }
  }

  // ---------------- Nav ----------------
  const nav = $('#nav');
  const toggle = $('#navToggle');
  const links = $('#navLinks');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
  });
  $$('a', links).forEach((a) => a.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    links.classList.remove('is-open');
  }));

  const navTargets = $$('a[href^="#"]:not(.btn)', links).map((a) => [a, document.getElementById(a.hash.slice(1))]).filter(([, s]) => s);
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navTargets.forEach(([a, s]) => a.classList.toggle('is-current', s === e.target));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navTargets.forEach(([, s]) => sectionObserver.observe(s));

  // ---------------- Scroll-driven effects ----------------
  const progress = $('.progress span');
  const parallax = $$('[data-parallax]');
  const steps = $('#steps');
  const words = $('[data-words]');
  let wordEls = [];
  if (words) {
    const accent = new Set(['websites,', 'apps,', 'Plant', 'Bill', 'faster,', 'instantly']);
    words.innerHTML = words.textContent.trim().split(/\s+/)
      .map((w) => `<span class="w${accent.has(w) ? ' is-accent' : ''}">${w}</span>`).join(' ');
    wordEls = $$('.w', words);
  }

  const clipSections = $$('.reveal-clip');
  const toTop = $('#toTop');
  const footerBig = $('.footer__big');

  let lastY = scrollY;
  let ticking = false;
  function onScroll() {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (y > 200 && y > lastY + 4 && !links.classList.contains('is-open')) nav.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 200) nav.classList.remove('is-hidden');
    lastY = y;

    if (!reduceMotion && y < innerHeight * 1.2) {
      parallax.forEach((el) => {
        el.style.translate = `${y * parseFloat(el.dataset.parallax) * 4}px ${y * 0.25}px`;
      });
    }

    if (wordEls.length) {
      const r = words.getBoundingClientRect();
      const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
      const lit = Math.round(p * wordEls.length);
      wordEls.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
    }

    // dark sections open from an inset rounded card to full width
    if (!reduceMotion) {
      clipSections.forEach((sec) => {
        const r = sec.getBoundingClientRect();
        if (r.top > innerHeight || r.bottom < 0) return;
        const p = clamp((innerHeight - r.top) / (innerHeight * 0.7), 0, 1);
        sec.style.setProperty('--ci', `${((1 - p) * 5).toFixed(2)}%`);
        sec.style.setProperty('--cr', `${((1 - p) * 48).toFixed(1)}px`);
      });
      if (footerBig) {
        const r = footerBig.getBoundingClientRect();
        // slides up into place as the footer arrives; never rises above its resting spot
        if (r.top < innerHeight * 1.2) footerBig.style.setProperty('--fy', `${clamp((r.top - innerHeight * 0.55) * 0.3, 0, 140).toFixed(1)}px`);
      }
    }

    if (toTop) {
      toTop.classList.toggle('is-on', y > innerHeight);
      toTop.style.setProperty('--ring', (145 - 145 * (max > 0 ? y / max : 0)).toFixed(1));
    }

    if (steps) {
      const r = steps.getBoundingClientRect();
      const p = clamp((innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.3), 0, 1);
      steps.style.setProperty('--p', p.toFixed(3));
    }
    ticking = false;
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // ---------------- Split headings into words ----------------
  // Each word gets its own masked span so it can rise in, staggered.
  $$('.h2[data-reveal]').forEach((h) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--wi', i++);
            w.append(inner);
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    walk(h);
    h.classList.add('is-split');
  });

  // ---------------- Reveal + counters ----------------
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealObserver.unobserve(e.target);
      $$('[data-count]', e.target).forEach(countUp);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('[data-reveal]').forEach((el) => revealObserver.observe(el));

  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    if (reduceMotion) { el.textContent = prefix + target + suffix; return; }
    const start = performance.now();
    const dur = 1400;
    (function frame(now) {
      const t = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  }

  // ---------------- Pointer effects ----------------
  if (finePointer && !reduceMotion) {
    const cursor = $('.cursor');
    let cx = 0, cy = 0, tx = 0, ty = 0;
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add('is-on');
    });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
    (function loop() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, input, textarea, label, .card, .compare__stage'));
    });

    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });

    $$('.card').forEach((card) => card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));

    $$('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(0)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    const hero = $('#hero');
    const star = $('.hero__star');
    hero.addEventListener('pointermove', (e) => {
      const x = e.clientX / innerWidth - 0.5;
      const y = e.clientY / innerHeight - 0.5;
      star.style.transform = `rotate(${x * 14}deg) translate(${x * 10}px, ${y * 10}px)`;
    });
    hero.addEventListener('pointerleave', () => { star.style.transform = ''; });
  }

  // ---------------- Buttons: fill from the pointer, ripple on click ----------------
  document.addEventListener('pointerover', (e) => {
    const btn = e.target.closest?.('.btn');
    if (!btn || btn.contains(e.relatedTarget)) return;
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--hx', `${((e.clientX - r.left) / r.width) * 100}%`);
    btn.style.setProperty('--hy', `${((e.clientY - r.top) / r.height) * 100}%`);
  });
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest?.('.btn');
    if (!btn || reduceMotion) return;
    const r = btn.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.left = `${e.clientX - r.left}px`;
    dot.style.top = `${e.clientY - r.top}px`;
    btn.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
  });

  // ---------------- Toast ----------------
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    $('span', toastEl).textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 3200);
  }
  $$('a[href^="/api/brochure"][download]').forEach((a) => a.addEventListener('click', () => toast('Your Plant Bill brochure is downloading')));

  // ---------------- Back to top ----------------
  $('#toTop')?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  // ---------------- Theme picker ----------------
  const themeWrap = $('#theme');
  if (themeWrap) {
    const btn = $('#themeBtn');
    const options = $$('[data-theme-value]', themeWrap);
    const names = { paper: 'Paper', midnight: 'Midnight', sage: 'Sage' };
    const current = () => document.documentElement.getAttribute('data-theme') || 'paper';
    const sync = () => {
      options.forEach((o) => o.setAttribute('aria-checked', String(o.dataset.themeValue === current())));
      const meta = $('meta[name="theme-color"]');
      if (meta) meta.content = getComputedStyle(document.body).backgroundColor;
    };
    const menu = $('#themeMenu');
    let closeTimer;
    const setOpen = (open) => {
      clearTimeout(closeTimer);
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        menu.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => themeWrap.classList.add('is-open')));
      } else {
        themeWrap.classList.remove('is-open');
        closeTimer = setTimeout(() => { menu.hidden = true; }, 400);
      }
    };
    const apply = (theme) => {
      if (theme === 'paper') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('dofida-theme', theme); } catch { /* storage blocked */ }
    };

    btn.addEventListener('click', () => setOpen(!themeWrap.classList.contains('is-open')));
    document.addEventListener('click', (e) => { if (!themeWrap.contains(e.target)) setOpen(false); });
    themeWrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); btn.focus(); } });

    options.forEach((o) => o.addEventListener('click', (e) => {
      const theme = o.dataset.themeValue;
      setOpen(false);
      if (theme === current()) return;
      const done = () => { sync(); toast(`${names[theme]} theme on`); };
      // Circular reveal from the click point, where the browser supports it.
      if (!document.startViewTransition || reduceMotion) { apply(theme); done(); return; }
      const r = btn.getBoundingClientRect();
      const x = e.clientX || r.left + r.width / 2;
      const y = e.clientY || r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(() => apply(theme));
      vt.ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 750, easing: 'cubic-bezier(.76, 0, .24, 1)', pseudoElement: '::view-transition-new(root)' },
        );
      }).catch(() => {});
      vt.finished.then(done, done);
    }));
    sync();
  }

  // ---------------- Compare slider ----------------
  const compareStage = $('#compareStage');
  if (compareStage) {
    const range = $('#compareRange');
    const wrap = $('#compare-slider');
    const set = (v) => compareStage.style.setProperty('--pos', `${v}%`);
    range.addEventListener('input', () => { wrap.classList.add('is-touched'); set(range.value); });
    // Gentle sweep the first time it scrolls into view, to show it can be dragged.
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting || reduceMotion) return;
      obs.disconnect();
      const start = performance.now();
      (function frame(now) {
        if (wrap.classList.contains('is-touched')) return;
        const t = clamp((now - start) / 2200, 0, 1);
        const v = 50 + Math.sin(t * Math.PI * 2) * 22 * (1 - t);
        set(v.toFixed(1)); range.value = v;
        if (t < 1) requestAnimationFrame(frame);
      })(start);
    }, { threshold: 0.5 }).observe(compareStage);
  }

  // ---------------- FAQ accordion ----------------
  $$('.faq__item').forEach((item) => {
    const q = $('.faq__q', item);
    q.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      $$('.faq__item.is-open').forEach((o) => { o.classList.remove('is-open'); $('.faq__q', o).setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });

  // ---------------- Billing demo (phone + printer) ----------------
  const demo = $('#demo');
  if (demo) {
    const items = [
      ['Areca Palm', 2, 350],
      ['Money Plant', 3, 120],
      ['Hibiscus', 1, 180],
      ['Rose (Grafted)', 4, 90],
    ];
    const list = $('#appItems');
    const total = $('#appTotal');
    const printBtn = $('#appPrint');
    const printer = $('.printer', demo);
    const rows = $('#receiptRows');
    const rTotal = $('#receiptTotal');
    const billNo = $('#billNo');
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    let running = false;
    let visible = false;

    function animateNumber(el, from, to, dur = 500) {
      const start = performance.now();
      (function frame(now) {
        const t = clamp((now - start) / dur, 0, 1);
        el.textContent = inr(from + (to - from) * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(frame);
      })(start);
    }

    async function cycle() {
      if (running) return;
      running = true;
      while (visible) {
        list.innerHTML = '';
        rows.innerHTML = '';
        total.textContent = '0';
        printer.className = 'printer';
        let sum = 0;
        for (const [name, qty, price] of items) {
          await wait(reduceMotion ? 0 : 650);
          const li = document.createElement('li');
          li.innerHTML = `${name} × ${qty}<span>₹${inr(qty * price)}</span>`;
          list.appendChild(li);
          animateNumber(total, sum, sum + qty * price);
          sum += qty * price;
          rows.insertAdjacentHTML('beforeend', `<div><span>${name} ×${qty}</span><span>${inr(qty * price)}</span></div>`);
        }
        rTotal.textContent = inr(sum);
        await wait(700);
        printBtn.classList.add('is-pressed');
        await wait(200);
        printBtn.classList.remove('is-pressed');
        printer.classList.add('is-printing');
        await wait(1900);
        printer.classList.replace('is-printing', 'is-printed');
        await wait(2600);
        printer.classList.add('is-tearing');
        await wait(700);
        billNo.textContent = String(Number(billNo.textContent) + 1);
      }
      running = false;
    }

    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) cycle();
    }, { threshold: 0.3 }).observe(demo);
  }

  // ---------------- Pricing calculator ----------------
  const calc = $('#calc');
  const formNurseries = $('#formNurseries');
  const formEstimate = $('#formEstimate');
  const first = Number(calc?.dataset.first) || 0;
  const additional = Number(calc?.dataset.additional) || 0;
  const monthly = Number(calc?.dataset.monthly) || 0;
  const quote = (n) => first + Math.max(0, n - 1) * additional;

  if (calc) {
    const range = $('#calcRange');
    const out = $('#calcCount');
    const shown = { calcTotal: first };
    const tweens = {};
    function tween(id, to) {
      const el = document.getElementById(id);
      const from = shown[id] ?? 0;
      shown[id] = to;
      cancelAnimationFrame(tweens[id]);
      const start = performance.now();
      (function frame(now) {
        const t = clamp((now - start) / 450, 0, 1);
        el.textContent = inr(from + (to - from) * (1 - Math.pow(1 - t, 3)));
        if (t < 1) tweens[id] = requestAnimationFrame(frame);
      })(start);
    }
    function update(n) {
      n = clamp(Math.round(n) || 1, 1, 20);
      range.value = n;
      out.value = n;
      out.textContent = n;
      $('#calcExtraCount').textContent = n - 1;
      tween('calcExtra', (n - 1) * additional);
      tween('calcSave', (n - 1) * (first - additional));
      tween('calcTotal', quote(n));
      tween('calcYear', quote(n) + 12 * monthly);
      out.animate?.([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
    }
    update(1);
    range.addEventListener('input', () => update(range.valueAsNumber));
    $$('.calc__step', calc).forEach((b) => b.addEventListener('click', () => update(range.valueAsNumber + Number(b.dataset.step))));
    $('#calcEnquire').addEventListener('click', () => {
      formNurseries.value = range.value;
      updateEstimate();
      setInterest('pricing');
    });
  }

  function updateEstimate() {
    const n = clamp(parseInt(formNurseries.value, 10) || 1, 1, 500);
    formEstimate.textContent = inr(quote(n));
  }
  formNurseries?.addEventListener('input', updateEstimate);

  // The Plant Bill estimate only shows when Plant Bill is what they're asking about.
  const estimateWrap = $('#formEstimateWrap');
  const syncEstimate = () => {
    const v = $('input[name="interest"]:checked')?.value;
    if (estimateWrap) estimateWrap.style.visibility = v === 'plant-bill' || v === 'pricing' ? 'visible' : 'hidden';
  };
  $$('input[name="interest"]').forEach((r) => r.addEventListener('change', syncEstimate));

  function setInterest(value) {
    const radio = $(`input[name="interest"][value="${value}"]`) || $('input[name="interest"][value="plant-bill"]');
    if (radio) radio.checked = true;
    syncEstimate();
  }
  $$('[data-interest]').forEach((a) => a.addEventListener('click', () => setInterest(a.dataset.interest)));

  // ---------------- Enquiry form ----------------
  const form = $('#enquiryForm');
  if (form) {
    const status = $('#formStatus');
    const done = $('#formDone');
    const label = $('.btn__label', form);

    const setError = (name, msg) => {
      const field = form.elements[name]?.closest('.field');
      if (!field) return;
      field.classList.toggle('has-error', !!msg);
      const em = $('em', field);
      if (em) em.textContent = msg || '';
    };

    function validate(data) {
      const errors = {};
      if ((data.name || '').trim().length < 2) errors.name = 'Please tell us your name.';
      const digits = (data.phone || '').replace(/\D/g, '');
      if (!/^[+\d][\d\s-]{6,18}$/.test((data.phone || '').trim()) || digits.length < 7) errors.phone = 'Please enter a valid phone number.';
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'That email address does not look right.';
      return errors;
    }

    $$('input, textarea', form).forEach((el) => el.addEventListener('input', () => setError(el.name, '')));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '';
      const data = Object.fromEntries(new FormData(form));
      ['name', 'phone', 'email'].forEach((n) => setError(n, ''));
      const errors = validate(data);
      if (Object.keys(errors).length) {
        Object.entries(errors).forEach(([k, v]) => setError(k, v));
        form.elements[Object.keys(errors)[0]].focus();
        return;
      }
      form.classList.add('is-sending');
      label.textContent = 'Sending…';
      try {
        const res = await fetch('/api/enquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (body.fields) Object.entries(body.fields).forEach(([k, v]) => setError(k, v));
          throw new Error(body.error || 'Could not send your enquiry.');
        }
        done.hidden = false;
        toast('Enquiry sent. We will be in touch soon');
        form.reset();
        updateEstimate();
        syncEstimate();
      } catch (err) {
        status.textContent = `${err.message} Please try again.`;
      } finally {
        form.classList.remove('is-sending');
        label.textContent = 'Send enquiry';
      }
    });

    $('#formAgain').addEventListener('click', () => { done.hidden = true; form.elements.name.focus(); });
  }
})();
