(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const KEY = 'dofida-admin-token';
  const STATUSES = [['new', 'New'], ['contacted', 'Contacted'], ['demo', 'Demo booked'], ['won', 'Won'], ['closed', 'Closed']];
  let token = '';
  try { token = sessionStorage.getItem(KEY) || ''; } catch { /* storage blocked */ }
  let enquiries = [];

  async function api(path, opts = {}) {
    const res = await fetch(`/api/admin${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (res.status === 401) { signOut('That token was not accepted.'); throw new Error('unauthorised'); }
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${res.status})`);
    }
    return res;
  }

  function el(tag, props = {}, ...children) {
    const { dataset, ...rest } = props;
    const node = Object.assign(document.createElement(tag), rest);
    if (dataset) Object.assign(node.dataset, dataset);
    children.flat().forEach((c) => c != null && node.append(c));
    return node;
  }

  function render() {
    const q = $('#search').value.trim().toLowerCase();
    const st = $('#statusFilter').value;
    const rows = enquiries.filter((e) =>
      (!st || e.status === st) &&
      (!q || [e.name, e.phone, e.email, e.nursery, e.location, e.message].join(' ').toLowerCase().includes(q)));
    const list = $('#list');
    list.replaceChildren(...rows.map(card));
    $('#empty').hidden = rows.length > 0;
  }

  function card(e) {
    const select = el('select', { ariaLabel: 'Status' },
      STATUSES.map(([v, l]) => el('option', { value: v, textContent: l, selected: e.status === v })));
    select.addEventListener('change', () => update(e, { status: select.value }));

    const notes = el('textarea', { placeholder: 'Private notes…', value: e.notes || '', rows: 1 });
    notes.addEventListener('change', () => update(e, { notes: notes.value }));

    const del = el('button', { type: 'button', className: 'enq__del', textContent: 'Delete' });
    del.addEventListener('click', async () => {
      if (!confirm(`Delete the enquiry from ${e.name}? This cannot be undone.`)) return;
      await api(`/enquiries/${e.id}`, { method: 'DELETE' });
      enquiries = enquiries.filter((x) => x.id !== e.id);
      render(); loadStats();
    });

    const phoneDigits = (e.phone || '').replace(/[^\d+]/g, '');
    const waDigits = phoneDigits.replace(/\D/g, '');
    const meta = el('div', { className: 'enq__meta' },
      el('a', { href: `tel:${phoneDigits}`, textContent: e.phone }),
      el('a', { href: `https://wa.me/${waDigits.length === 10 ? `91${waDigits}` : waDigits}`, target: '_blank', rel: 'noopener', textContent: 'WhatsApp' }),
      e.email ? el('a', { href: `mailto:${e.email}`, textContent: e.email }) : null,
      e.nursery ? el('span', {}, 'Nursery: ', el('b', { textContent: e.nursery })) : null,
      e.location ? el('span', {}, 'Town: ', el('b', { textContent: e.location })) : null,
      el('span', {}, 'Nurseries: ', el('b', { textContent: String(e.nurseries) })),
      e.estimate ? el('span', {}, 'Estimate: ', el('b', { textContent: `₹${Number(e.estimate).toLocaleString('en-IN')}` })) : null,
      el('span', {}, 'Interest: ', el('b', { textContent: e.interest })),
    );

    return el('article', { className: 'enq', dataset: { status: e.status } },
      el('div', { className: 'enq__head' },
        el('h3', { textContent: e.name }),
        el('time', { dateTime: e.createdAt, textContent: new Date(e.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) })),
      meta,
      e.message ? el('p', { className: 'enq__msg', textContent: e.message }) : null,
      el('div', { className: 'enq__row' }, select, notes, del));
  }

  async function update(e, patch) {
    const res = await api(`/enquiries/${e.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    Object.assign(e, await res.json());
    render(); loadStats();
  }

  async function loadStats() {
    const s = await (await api('/stats')).json();
    $('#sTotal').textContent = s.enquiries;
    $('#sNew').textContent = s.new;
    $('#sDl').textContent = s.downloads;
  }

  async function load() {
    enquiries = await (await api('/enquiries')).json();
    render();
    await loadStats();
  }

  function show(signedIn) {
    $('#login').hidden = signedIn;
    $('#dash').hidden = !signedIn;
    $('#actions').hidden = !signedIn;
  }

  function signOut(msg = '') {
    token = '';
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    show(false);
    $('#loginStatus').textContent = msg;
  }

  $('#login').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    token = ev.target.token.value.trim();
    $('#loginStatus').textContent = '';
    try {
      await load();
      try { sessionStorage.setItem(KEY, token); } catch { /* ignore */ }
      show(true);
    } catch (err) {
      if (err.message !== 'unauthorised') $('#loginStatus').textContent = err.message;
    }
  });

  $('#refresh').addEventListener('click', load);
  $('#logout').addEventListener('click', () => signOut());
  $('#search').addEventListener('input', render);
  $('#statusFilter').addEventListener('change', render);
  $('#csv').addEventListener('click', async () => {
    const blob = await (await api('/enquiries.csv')).blob();
    const a = el('a', { href: URL.createObjectURL(blob), download: `dofida-enquiries-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  if (token) load().then(() => show(true)).catch(() => {});
})();
