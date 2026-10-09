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
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) setTimeout(() => target.scrollIntoView(), 50);
    }
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
    const accent = new Set(['greenery,', 'bill', 'print', 'faster,', 'instantly']);
    words.innerHTML = words.textContent.trim().split(/\s+/)
      .map((w) => `<span class="w${accent.has(w) ? ' is-accent' : ''}">${w}</span>`).join(' ');
    wordEls = $$('.w', words);
  }

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
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const start = performance.now();
    const dur = 1400;
    (function frame(now) {
      const t = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(target * eased) + suffix;
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
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, input, textarea, label, .card'));
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
  const quote = (n) => first + Math.max(0, n - 1) * additional;

  if (calc) {
    const range = $('#calcRange');
    const out = $('#calcCount');
    const shown = { total: first };
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
      out.animate?.([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
    }
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

  function setInterest(value) {
    const radio = $(`input[name="interest"][value="${value}"]`);
    if (radio) radio.checked = true;
  }
  $$('[data-interest]').forEach((a) => a.addEventListener('click', () => setInterest(a.dataset.interest)));

  // ---------------- Slide deck ----------------
  const deck = $('#deck');
  if (deck) {
    const slides = $$('.slide', deck);
    const dots = $('#deckDots');
    const count = $('#deckCount');
    const bar = $('#deckProgress');
    const DUR = 6000;
    let index = 0;
    let timer = null;
    let inView = false;
    let paused = false;

    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Go to slide ${i + 1}`);
      b.addEventListener('click', () => go(i));
      dots.appendChild(b);
    });

    function go(i, dir) {
      const next = (i + slides.length) % slides.length;
      if (next === index && slides[index].classList.contains('is-active')) { schedule(); return; }
      deck.classList.toggle('is-back', dir === -1 || (dir === undefined && next < index));
      slides.forEach((s) => s.classList.remove('is-leaving'));
      slides[index].classList.add('is-leaving');
      slides[index].classList.remove('is-active');
      const leaving = slides[index];
      setTimeout(() => leaving.classList.remove('is-leaving'), 1000);
      index = next;
      slides[index].classList.add('is-active');
      render();
      schedule();
    }
    function render() {
      $$('button', dots).forEach((b, i) => b.classList.toggle('is-active', i === index));
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      slides.forEach((s, i) => s.setAttribute('aria-hidden', String(i !== index)));
    }
    function schedule() {
      clearTimeout(timer);
      bar.classList.remove('is-running');
      bar.style.transform = 'scaleX(0)';
      if (!inView || paused || reduceMotion) return;
      void bar.offsetWidth; // restart the CSS transition
      bar.style.setProperty('--dur', `${DUR}ms`);
      bar.style.transform = '';
      bar.classList.add('is-running');
      timer = setTimeout(() => go(index + 1, 1), DUR);
    }

    $('#deckPrev').addEventListener('click', () => go(index - 1, -1));
    $('#deckNext').addEventListener('click', () => go(index + 1, 1));
    deck.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') go(index + 1, 1);
      if (e.key === 'ArrowLeft') go(index - 1, -1);
    });
    deck.addEventListener('pointerenter', () => { paused = true; schedule(); });
    deck.addEventListener('pointerleave', () => { paused = false; schedule(); });

    let startX = null;
    const stage = $('.deck__stage', deck);
    stage.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      startX = null;
    });

    new IntersectionObserver(([e]) => { inView = e.isIntersecting; schedule(); }, { threshold: 0.4 }).observe(deck);
    render();
  }

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
        form.reset();
        updateEstimate();
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
