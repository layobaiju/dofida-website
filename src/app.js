const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { company, pricing, product, formatINR } = require('./config');
const { buildBrochure } = require('./brochure');

const PUBLIC = path.join(__dirname, '..', 'public');
const STATUSES = ['new', 'contacted', 'demo', 'won', 'closed'];
const BROCHURE_NAME = 'Dofida-Plant-Bill-Brochure.pdf';
// `npm run dev` (node --watch) re-reads pages on every request; otherwise they are cached.
const DEV = process.execArgv.includes('--watch') || process.env.NODE_ENV === 'development';

// ---------- helpers ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderIndex() {
  const tpl = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  const contactLines = [
    company.contact.phone && `<a href="tel:${escapeHtml(company.contact.phone.replace(/\s/g, ''))}">${escapeHtml(company.contact.phone)}</a>`,
    company.contact.whatsapp && `<a href="https://wa.me/${escapeHtml(company.contact.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp ${escapeHtml(company.contact.whatsapp)}</a>`,
    company.contact.email && `<a href="mailto:${escapeHtml(company.contact.email)}">${escapeHtml(company.contact.email)}</a>`,
  ].filter(Boolean);
  const vars = {
    PRICE_FIRST: formatINR(pricing.firstNursery),
    PRICE_ADDITIONAL: formatINR(pricing.additionalNursery),
    PRICE_FIRST_RAW: String(pricing.firstNursery),
    PRICE_ADDITIONAL_RAW: String(pricing.additionalNursery),
    DISCOUNT: String(pricing.additionalDiscountPercent),
    CONTACT_LINES: contactLines.join(''),
    YEAR: String(new Date().getFullYear()),
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? vars[key] : m));
}

// Fixed-window limiter keyed by IP. Good enough for a single-instance site.
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip);
    if (!entry || entry.reset < now) {
      hits.set(req.ip, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' });
    }
    next();
  };
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function validateEnquiry(body) {
  const errors = {};
  const e = {
    name: str(body.name, 80),
    phone: str(body.phone, 20),
    email: str(body.email, 120),
    nursery: str(body.nursery, 120),
    location: str(body.location, 120),
    nurseries: parseInt(body.nurseries, 10) || 1,
    interest: str(body.interest, 40),
    message: str(body.message, 2000),
  };
  if (e.name.length < 2) errors.name = 'Please tell us your name.';
  if (!/^[+\d][\d\s-]{6,18}$/.test(e.phone) || e.phone.replace(/\D/g, '').length < 7) errors.phone = 'Please enter a valid phone number.';
  if (e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) errors.email = 'That email address does not look right.';
  if (e.nurseries < 1 || e.nurseries > 500) errors.nurseries = 'Number of nurseries should be between 1 and 500.';
  if (!['plant-bill', 'demo', 'pricing', 'other'].includes(e.interest)) e.interest = 'plant-bill';
  return { enquiry: e, errors };
}

function quote(n) {
  return pricing.firstNursery + Math.max(0, n - 1) * pricing.additionalNursery;
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
}

// ---------- app ----------

function createApp({ store, adminToken = process.env.ADMIN_TOKEN, notify } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);

  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
    next();
  });

  app.use(express.json({ limit: '20kb' }));

  // Index is templated from config so prices are always in sync with the PDF.
  let indexCache = null;
  const sendIndex = (req, res) => {
    if (!indexCache || DEV) indexCache = renderIndex();
    res.type('html').send(indexCache);
  };
  app.get(['/', '/index.html'], sendIndex);

  app.use('/fonts/outfit', express.static(path.join(path.dirname(require.resolve('@fontsource/outfit/package.json')), 'files'), { maxAge: '30d', immutable: true }));
  app.use('/fonts/inter', express.static(path.join(path.dirname(require.resolve('@fontsource/inter/package.json')), 'files'), { maxAge: '30d', immutable: true }));
  app.use(express.static(PUBLIC, { index: false, maxAge: DEV ? 0 : '1h' }));
  app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC, 'admin.html')));

  // ----- public API -----

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.get('/api/site', (req, res) => {
    res.json({
      company: { name: company.name, legalName: company.legalName, locations: company.locations },
      product,
      pricing: {
        currency: pricing.currency,
        firstNursery: pricing.firstNursery,
        additionalNursery: pricing.additionalNursery,
        additionalDiscountPercent: pricing.additionalDiscountPercent,
        includes: pricing.includes,
      },
    });
  });

  app.get('/api/quote', (req, res) => {
    const n = parseInt(req.query.nurseries, 10);
    if (!Number.isInteger(n) || n < 1 || n > 500) return res.status(400).json({ error: 'nurseries must be between 1 and 500' });
    res.json({ nurseries: n, total: quote(n), savings: (n - 1) * (pricing.firstNursery - pricing.additionalNursery) });
  });

  let brochure = null;
  app.get('/api/brochure', async (req, res, next) => {
    try {
      brochure ||= await buildBrochure();
      store.recordDownload().catch((err) => console.error('download count failed', err));
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${BROCHURE_NAME}"`,
        'Cache-Control': 'no-store',
      });
      res.send(brochure);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/enquiries', rateLimit({ windowMs: 10 * 60 * 1000, max: 5 }), async (req, res, next) => {
    try {
      const body = req.body || {};
      // Honeypot: real visitors never see or fill this field.
      if (body.website) return res.status(201).json({ ok: true });
      const { enquiry, errors } = validateEnquiry(body);
      if (Object.keys(errors).length) return res.status(400).json({ error: 'Please check the highlighted fields.', fields: errors });
      const saved = await store.addEnquiry({ ...enquiry, estimate: quote(enquiry.nurseries) });
      if (notify) Promise.resolve(notify(saved)).catch((err) => console.error('notify failed', err));
      res.status(201).json({ ok: true, id: saved.id });
    } catch (err) {
      next(err);
    }
  });

  // ----- admin API -----

  const requireAdmin = (req, res, next) => {
    if (!adminToken) return res.status(503).json({ error: 'Admin is disabled. Set ADMIN_TOKEN to enable it.' });
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !safeEqual(token, adminToken)) return res.status(401).json({ error: 'Invalid admin token.' });
    next();
  };
  const admin = express.Router();
  admin.use(rateLimit({ windowMs: 60 * 1000, max: 60 }), requireAdmin);

  admin.get('/stats', (req, res) => res.json(store.stats()));
  admin.get('/enquiries', (req, res) => res.json(store.listEnquiries()));
  admin.patch('/enquiries/:id', async (req, res, next) => {
    try {
      const patch = {};
      if (req.body?.status !== undefined) {
        if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
        patch.status = req.body.status;
      }
      if (req.body?.notes !== undefined) patch.notes = str(req.body.notes, 2000);
      const updated = await store.updateEnquiry(req.params.id, patch);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });
  admin.delete('/enquiries/:id', async (req, res, next) => {
    try {
      if (!(await store.deleteEnquiry(req.params.id))) return res.status(404).json({ error: 'Not found' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });
  admin.get('/enquiries.csv', (req, res) => {
    const cols = ['createdAt', 'status', 'name', 'phone', 'email', 'nursery', 'location', 'nurseries', 'estimate', 'interest', 'message', 'notes'];
    const rows = [cols.join(','), ...store.listEnquiries().map((e) => cols.map((c) => csvCell(e[c])).join(','))];
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="dofida-enquiries.csv"' });
    res.send(rows.join('\n'));
  });
  app.use('/api/admin', admin);

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC, '404.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}

module.exports = { createApp, quote, validateEnquiry };
