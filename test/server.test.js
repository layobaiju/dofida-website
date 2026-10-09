const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../src/app');
const { createStore } = require('../src/store');
const { pricing } = require('../src/config');

const TOKEN = 'test-admin-token';
let server;
let base;
let dir;
let store;
const notified = [];

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dofida-'));
  store = createStore(path.join(dir, 'db.json'));
  const app = createApp({ store, adminToken: TOKEN, notify: (e) => notified.push(e) });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const post = (body) => fetch(`${base}/api/enquiries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const admin = (p, opts = {}) => fetch(`${base}/api/admin${p}`, { ...opts, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } });

test('additional nursery is 50% of the first nursery price', () => {
  assert.equal(pricing.firstNursery, 20400);
  assert.equal(pricing.additionalNursery, 10200);
  assert.equal(pricing.monthly, 199);
});

test('animated brochure page renders with prices filled in', async () => {
  const res = await fetch(`${base}/brochure`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.doesNotMatch(html, /\{\{\w+\}\}/);
  assert.match(html, /data-monthly="199"/);
  assert.match(html, /all of Kerala and Karnataka/);
  assert.match(html, /\/js\/brochure\.js\?v=/);
  assert.equal((await fetch(`${base}/js/brochure.js`)).status, 200);
});

test('home page renders with prices filled in and security headers', async () => {
  const res = await fetch(base);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /₹20,400/);
  assert.match(html, /₹10,200/);
  assert.match(html, /₹199/);
  assert.match(html, /id="services"/);
  assert.match(html, /src="\/brochure\?embed=1&amp;lang=en"/);
  assert.doesNotMatch(html, /\{\{\w+\}\}/, 'no unreplaced template tokens');
  assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('pages link versioned assets and are never served stale', async () => {
  const res = await fetch(base);
  assert.equal(res.headers.get('cache-control'), 'no-cache');
  const html = await res.text();
  assert.match(html, /href="\/css\/style\.css\?v=[0-9a-f]{10}"/);
  assert.match(html, /src="\/js\/main\.js\?v=[0-9a-f]{10}"/);
  const admin = await (await fetch(`${base}/admin`)).text();
  assert.match(admin, /\/css\/admin\.css\?v=[0-9a-f]{10}/);
});

test('every page renders fully in English, Malayalam and Kannada', async () => {
  const { dictionaries } = require('../src/i18n');
  for (const lang of ['en', 'ml', 'kn']) {
    for (const path of ['/', '/brochure']) {
      const res = await fetch(`${base}${path}?lang=${lang}`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.doesNotMatch(html, /\{\{[\w.]+\}\}/, `${lang} ${path} has unfilled tokens`);
      assert.match(html, new RegExp(`<html lang="${lang}">`));
      assert.match(html, /₹20,400/, 'numbers stay the same in every language');
      assert.match(res.headers.get('set-cookie') || '', new RegExp(`lang=${lang}`));
    }
    const home = await (await fetch(`${base}/?lang=${lang}`)).text();
    assert.ok(home.includes(dictionaries[lang]['nav.services']));
    assert.ok(home.includes(dictionaries[lang]['faq.q2']));
  }
});

test('language choice is remembered with a cookie, English by default', async () => {
  const plain = await (await fetch(base)).text();
  assert.match(plain, /<html lang="en">/);
  const remembered = await (await fetch(base, { headers: { cookie: 'lang=kn' } })).text();
  assert.match(remembered, /<html lang="kn">/);
  const bogus = await (await fetch(`${base}/?lang=xx`)).text();
  assert.match(bogus, /<html lang="en">/);
});

test('enquiry errors come back in the visitor\'s language', async () => {
  const res = await fetch(`${base}/api/enquiries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '', phone: '1', lang: 'ml' }) });
  const body = await res.json();
  assert.equal(body.fields.name, require('../src/i18n/ml')['js.errName']);
});

test('PDF brochure is generated in each language', async () => {
  for (const lang of ['ml', 'kn']) {
    const res = await fetch(`${base}/api/brochure?lang=${lang}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-disposition'), new RegExp(`Brochure-${lang}\\.pdf`));
    const buf = Buffer.from(await res.arrayBuffer());
    assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
    assert.match(buf.toString('latin1'), /Anek/, 'uses the Malayalam/Kannada font');
  }
});

test('static assets and fonts are served', async () => {
  for (const p of ['/css/style.css', '/js/main.js', '/img/logo-mark.svg', '/fonts/outfit/outfit-latin-700-normal.woff2', '/fonts/anek-malayalam/anek-malayalam-malayalam-700-normal.woff2', '/fonts/anek-kannada/anek-kannada-kannada-700-normal.woff2', '/admin']) {
    const res = await fetch(base + p);
    assert.equal(res.status, 200, p);
  }
});

test('unknown pages return 404', async () => {
  assert.equal((await fetch(`${base}/nope`)).status, 404);
  assert.equal((await fetch(`${base}/api/nope`)).status, 404);
});

test('quote endpoint applies the multi-nursery discount', async () => {
  const one = await (await fetch(`${base}/api/quote?nurseries=1`)).json();
  assert.equal(one.total, 20400);
  const three = await (await fetch(`${base}/api/quote?nurseries=3`)).json();
  assert.equal(three.total, 20400 + 2 * 10200);
  assert.equal(three.savings, 2 * 10200);
  assert.equal(three.monthly, 199);
  assert.equal((await fetch(`${base}/api/quote?nurseries=0`)).status, 400);
});

test('brochure downloads as a multi-page PDF and is counted', async () => {
  await store.flush();
  const before = store.stats().downloads;
  const res = await fetch(`${base}/api/brochure`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  assert.match(res.headers.get('content-disposition'), /attachment; filename="Dofida-Plant-Bill-Brochure.pdf"/);
  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
  assert.ok((buf.toString('latin1').match(/\/Type \/Page\b/g) || []).length >= 8);
  await store.flush();
  assert.equal(store.stats().downloads, before + 1);
});

test('enquiry validation rejects bad input', async () => {
  const res = await post({ name: 'A', phone: 'abc', email: 'nope' });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.fields.name && body.fields.phone && body.fields.email);
  assert.equal((await fetch(`${base}/api/enquiries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' })).status, 400);
});

test('honeypot submissions are silently dropped', async () => {
  const before = store.listEnquiries().length;
  const res = await post({ name: 'Bot', phone: '9876543210', website: 'http://spam' });
  assert.equal(res.status, 201);
  assert.equal(store.listEnquiries().length, before);
});

test('valid enquiry is saved, persisted, estimated and notified', async () => {
  const res = await post({ name: 'Ravi Kumar', phone: '+91 98765 43210', email: 'ravi@example.com', nursery: 'Green Leaf', location: 'Hunsur', nurseries: '2', interest: 'demo', message: 'Need a demo' });
  assert.equal(res.status, 201);
  const { id } = await res.json();
  const saved = store.listEnquiries().find((e) => e.id === id);
  assert.equal(saved.estimate, 30600);
  assert.equal(saved.status, 'new');
  assert.equal(notified.at(-1).id, id);
  await store.flush();
  const onDisk = JSON.parse(fs.readFileSync(path.join(dir, 'db.json'), 'utf8'));
  assert.ok(onDisk.enquiries.some((e) => e.id === id));
});

test('admin API requires the token', async () => {
  assert.equal((await fetch(`${base}/api/admin/enquiries`)).status, 401);
  assert.equal((await fetch(`${base}/api/admin/enquiries`, { headers: { Authorization: 'Bearer wrong' } })).status, 401);
});

test('admin can list, update, export and delete enquiries', async () => {
  const list = await (await admin('/enquiries')).json();
  assert.ok(list.length >= 1);
  const id = list[0].id;

  const patched = await admin(`/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'contacted', notes: 'Called' }) });
  assert.equal(patched.status, 200);
  assert.equal((await patched.json()).status, 'contacted');
  assert.equal((await admin(`/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'bogus' }) })).status, 400);

  const stats = await (await admin('/stats')).json();
  assert.equal(stats.enquiries, list.length);

  const csv = await (await admin('/enquiries.csv')).text();
  assert.match(csv, /^createdAt,status,name/);
  assert.match(csv, /Ravi Kumar/);

  assert.equal((await admin(`/enquiries/${id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await admin(`/enquiries/${id}`, { method: 'DELETE' })).status, 404);
});

test('admin API is disabled when no token is configured', async () => {
  const app = createApp({ store, adminToken: '' });
  const s = await new Promise((r) => { const srv = app.listen(0, () => r(srv)); });
  const res = await fetch(`http://127.0.0.1:${s.address().port}/api/admin/stats`, { headers: { Authorization: 'Bearer ' } });
  assert.equal(res.status, 503);
  s.close();
});

test('enquiries are rate limited per IP', async () => {
  // 1 honeypot + 1 valid + 1 invalid already used 3 of the 5 slots... send until limited.
  let limited = false;
  for (let i = 0; i < 6; i++) {
    const res = await post({ name: 'Test', phone: '9876543210' });
    if (res.status === 429) { limited = true; break; }
  }
  assert.ok(limited);
});
