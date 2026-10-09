// Builds the downloadable "Plant Bill" slide deck as a 16:9 PDF.
// Content comes from config.js so the PDF always matches the website.

const PDFDocument = require('pdfkit');
const { company, pricing, product, formatINR } = require('./config');

const font = (name) => require.resolve(`@fontsource/${name}`);
const FONTS = {
  display: font('outfit/files/outfit-latin-700-normal.woff'),
  displayBold: font('outfit/files/outfit-latin-800-normal.woff'),
  body: font('inter/files/inter-latin-400-normal.woff'),
  bodySemi: font('inter/files/inter-latin-600-normal.woff'),
  // The latin subset has no ₹ sign; latin-ext does.
  rupee: font('inter/files/inter-latin-ext-700-normal.woff'),
};

// Same colours as the website's dark Midnight theme and the animated brochure.
const C = {
  bg: '#0B0F1C',
  bg2: '#10162A',
  card: '#141B2F',
  card2: '#212A44',
  line: '#2B3556',
  text: '#E9ECF5',
  muted: '#98A2BE',
  ink: '#141A2E',
  deep: '#05070F',
  blue: '#6E8EEA',
  blueL: '#8AA4F2',
  tint: '#24305A',
  paper: '#EFEEEA',
  leaf: '#3F8F6B',
  white: '#FFFFFF',
};

const W = 960;
const H = 540;
const M = 56;
const STAR = 'M50 9 L61.17 37.63 L91.85 39.4 L68.07 58.87 L75.86 88.6 L50 72 L24.14 88.6 L31.93 58.87 L8.15 39.4 L38.83 37.63 Z';

function star(doc, x, y, size, { left = C.text, right = C.blue } = {}) {
  const s = size / 100;
  for (const side of ['left', 'right']) {
    doc.save();
    doc.translate(x, y).scale(s);
    doc.rect(side === 'left' ? 0 : 50, 0, 50, 100).clip();
    doc.path(STAR).lineWidth(8).lineJoin('round');
    if (side === 'left') doc.fillColor(left).strokeColor(left).fillAndStroke();
    else doc.strokeColor(right).stroke();
    doc.restore();
  }
}

// Draws "₹12,345". Pass align: 'right' to make x the right edge. Returns the width.
function money(doc, amount, x, y, size, color, { align = 'left' } = {}) {
  const digits = formatINR(amount);
  const rupeeW = doc.font('rupee').fontSize(size).widthOfString('₹');
  const digitsW = doc.font('displayBold').fontSize(size).widthOfString(digits);
  const left = align === 'right' ? x - rupeeW - digitsW : x;
  doc.fillColor(color).font('rupee').fontSize(size).text('₹', left, y, { lineBreak: false });
  doc.font('displayBold').fontSize(size).text(digits, left + rupeeW, y, { lineBreak: false });
  return rupeeW + digitsW;
}

function card(doc, x, y, w, h, { fill = C.card, stroke = C.line, r = 16 } = {}) {
  doc.roundedRect(x, y, w, h, r).fillAndStroke(fill, stroke);
}

function frame(doc, n, total) {
  doc.rect(0, 0, W, H).fill(C.bg);
  // faint grid, like the website
  doc.save().lineWidth(0.5).strokeColor('#151B2E');
  for (let x = 0; x <= W; x += 48) doc.moveTo(x, 0).lineTo(x, H);
  for (let y = 0; y <= H; y += 48) doc.moveTo(0, y).lineTo(W, y);
  doc.stroke().restore();
  doc.circle(W - 40, H + 60, 260).fillOpacity(0.12).fill(C.blue).fillOpacity(1);
  star(doc, M, H - 40, 18);
  doc.font('bodySemi').fontSize(9).fillColor(C.muted)
    .text(`${company.legalName.toUpperCase()}  ·  ${product.name.toUpperCase()}`, M + 26, H - 35, { characterSpacing: 1.5, lineBreak: false });
  doc.text(`${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, W - M - 60, H - 35, { width: 60, align: 'right', lineBreak: false });
}

function heading(doc, eyebrow, title) {
  doc.font('bodySemi').fontSize(10).fillColor(C.blueL).text(eyebrow.toUpperCase(), M, M, { characterSpacing: 2.5 });
  doc.font('display').fontSize(34).fillColor(C.text).text(title, M, M + 20, { width: W - 2 * M });
}

function check(doc, x, y) {
  doc.circle(x, y, 11).fill(C.leaf);
  doc.moveTo(x - 5, y).lineTo(x - 1, y + 4).lineTo(x + 6, y - 4).lineWidth(2).strokeColor(C.white).stroke();
}

const slides = [
  // 1. Cover
  (doc) => {
    doc.rect(0, 0, W / 2, H).fill(C.deep);
    doc.rect(W / 2, 0, W / 2, H).fill(C.blue);
    doc.circle(W / 2, H / 2, 150).fillAndStroke(C.bg, C.line);
    star(doc, W / 2 - 60, H / 2 - 92, 120);
    doc.font('displayBold').fontSize(40).fillColor(C.text).text(company.name, W / 2 - 150, H / 2 + 40, { width: 300, align: 'center' });
    doc.font('bodySemi').fontSize(10).fillColor(C.muted).text('GROUP', W / 2 - 150, H / 2 + 88, { width: 300, align: 'center', characterSpacing: 6 });
    doc.font('display').fontSize(26).fillColor(C.white).text(product.name, M, H - M - 60);
    doc.font('body').fontSize(12).fillColor('#C9CFE2').text('Billing software + printer for plant nurseries', M, H - M - 26, { width: W / 2 - 2 * M });
    doc.font('bodySemi').fontSize(11).fillColor(C.ink).text(`${product.platforms.join('  ·  ')}  ·  All of Kerala & Karnataka`, W / 2 + M, H - M - 20, { width: W / 2 - 2 * M, align: 'right' });
  },
  // 2. What it is
  (doc, n, t) => {
    frame(doc, n, t);
    heading(doc, 'What is Plant Bill', 'Billing made for plant nurseries.');
    doc.font('body').fontSize(15).fillColor(C.muted).text(product.summary, M, M + 90, { width: 470, lineGap: 5 });
    const items = [`Works on ${product.platforms.join(' and ')}`, 'Billing printer included', `Serving ${company.serviceArea}`];
    items.forEach((it, i) => {
      const y = M + 230 + i * 40;
      doc.circle(M + 7, y + 7, 6).fill(C.blue);
      doc.font('bodySemi').fontSize(13).fillColor(C.text).text(it, M + 26, y);
    });
    // Phone illustration
    const px = 640, py = 70;
    doc.roundedRect(px, py, 190, 380, 28).fill(C.deep);
    doc.roundedRect(px + 10, py + 14, 170, 352, 20).fillAndStroke(C.card, C.line);
    doc.font('display').fontSize(14).fillColor(C.text).text(product.name, px + 26, py + 34);
    ['Areca Palm  x2', 'Money Plant  x3', 'Hibiscus  x1', 'Rose (Grafted)  x4'].forEach((row, i) => {
      card(doc, px + 24, py + 70 + i * 46, 142, 36, { fill: i === 1 ? C.tint : C.card2, r: 8 });
      doc.font('body').fontSize(10).fillColor(C.text).text(row, px + 34, py + 82 + i * 46);
    });
    doc.roundedRect(px + 24, py + 300, 142, 40, 10).fill(C.blue);
    doc.font('bodySemi').fontSize(12).fillColor(C.white).text('Print bill', px + 24, py + 313, { width: 142, align: 'center' });
  },
  // 3. Features
  (doc, n, t) => {
    frame(doc, n, t);
    heading(doc, 'Features', 'Everything a nursery counter needs.');
    const cw = (W - 2 * M - 2 * 20) / 3;
    product.features.forEach((f, i) => {
      const x = M + (i % 3) * (cw + 20);
      const y = M + 90 + Math.floor(i / 3) * 170;
      card(doc, x, y, cw, 150);
      doc.circle(x + 30, y + 32, 14).fill(i % 2 ? C.blue : C.paper);
      doc.font('bodySemi').fontSize(11).fillColor(i % 2 ? C.white : C.ink).text(String(i + 1), x + 16, y + 26, { width: 28, align: 'center' });
      doc.font('display').fontSize(16).fillColor(C.text).text(f.title, x + 18, y + 58, { width: cw - 36 });
      doc.font('body').fontSize(10.5).fillColor(C.muted).text(f.text, x + 18, y + 84, { width: cw - 36, lineGap: 2 });
    });
  },
  // 4. How it works
  (doc, n, t) => {
    frame(doc, n, t);
    heading(doc, 'How it works', 'From enquiry to your first printed bill.');
    const cw = (W - 2 * M) / 4;
    doc.moveTo(M + 22, M + 160).lineTo(W - M - cw + 22, M + 160).lineWidth(2).dash(4, { space: 5 }).strokeColor(C.blue).stroke().undash();
    product.steps.forEach((st, i) => {
      const x = M + i * cw;
      doc.circle(x + 22, M + 160, 22).fill(i === 3 ? C.blue : C.paper);
      doc.font('displayBold').fontSize(16).fillColor(i === 3 ? C.white : C.ink).text(String(i + 1), x, M + 150, { width: 44, align: 'center' });
      doc.font('display').fontSize(20).fillColor(C.text).text(st.title, x, M + 205, { width: cw - 20 });
      doc.font('body').fontSize(11).fillColor(C.muted).text(st.text, x, M + 238, { width: cw - 28, lineGap: 3 });
    });
  },
  // 5. Pricing
  (doc, n, t) => {
    frame(doc, n, t);
    heading(doc, 'Pricing', 'One simple price. Printer included.');
    const cards = [
      { label: 'First nursery', amount: pricing.firstNursery, note: 'Software + printer', main: true },
      { label: 'Each extra nursery', amount: pricing.additionalNursery, note: 'Same owner · printer included' },
    ];
    cards.forEach((c, i) => {
      const x = M + i * 290, y = M + 95, w = 270, h = 200;
      card(doc, x, y, w, h, { fill: c.main ? C.deep : C.card, stroke: c.main ? C.blue : C.line, r: 18 });
      doc.font('bodySemi').fontSize(11).fillColor(C.muted).text(c.label.toUpperCase(), x + 24, y + 24, { characterSpacing: 1.5 });
      money(doc, c.amount, x + 24, y + 56, 44, C.text);
      doc.font('body').fontSize(11).fillColor(C.muted).text(c.note, x + 24, y + 130, { width: w - 48 });
      if (!c.main) {
        doc.roundedRect(x + w - 84, y + h - 44, 60, 24, 12).fill(C.blue);
        doc.font('bodySemi').fontSize(10).fillColor(C.white).text(`-${pricing.additionalDiscountPercent}%`, x + w - 84, y + h - 37, { width: 60, align: 'center' });
      }
    });
    // Example totals
    const tx = M + 600, ty = M + 95;
    doc.font('bodySemi').fontSize(11).fillColor(C.muted).text('EXAMPLE TOTALS · ONE TIME', tx, ty, { characterSpacing: 1.5 });
    [1, 2, 3, 5].forEach((count, i) => {
      const y = ty + 30 + i * 42;
      const total = pricing.firstNursery + (count - 1) * pricing.additionalNursery;
      doc.moveTo(tx, y + 32).lineTo(W - M, y + 32).lineWidth(1).strokeColor(C.line).stroke();
      doc.font('body').fontSize(13).fillColor(C.text).text(`${count} nurser${count === 1 ? 'y' : 'ies'}`, tx, y + 8);
      money(doc, total, W - M, y + 6, 15, C.text, { align: 'right' });
    });
    // Monthly subscription band
    const by = M + 318;
    card(doc, M, by, W - 2 * M, 64, { fill: C.tint, stroke: C.blue });
    doc.font('bodySemi').fontSize(10).fillColor(C.blueL).text('MONTHLY SUBSCRIPTION', M + 24, by + 14, { characterSpacing: 1.5 });
    const mw = money(doc, pricing.monthly, M + 24, by + 30, 22, C.white);
    doc.font('display').fontSize(14).fillColor(C.muted).text('/ month', M + 24 + mw + 8, by + 36, { lineBreak: false });
    doc.font('bodySemi').fontSize(13).fillColor(C.text).text('One flat fee for all your nurseries, no matter how many you have.', M + 260, by + 25, { width: W - 2 * M - 290 });
    doc.font('body').fontSize(10).fillColor(C.muted).text('Additional-nursery pricing applies to nurseries owned by the same owner.', M, by + 76, { width: 540 });
  },
  // 6. What's included
  (doc, n, t) => {
    frame(doc, n, t);
    heading(doc, "What's in the box", 'Everything you need on day one.');
    [...pricing.includes, `₹${formatINR(pricing.monthly)}/month covers all your nurseries`].forEach((item, i) => {
      const y = M + 90 + i * 58;
      card(doc, M, y, 520, 46, { r: 14 });
      check(doc, M + 26, y + 23);
      if (item.startsWith('₹')) {
        doc.font('rupee').fontSize(13).fillColor(C.text).text('₹', M + 50, y + 16, { continued: true });
        doc.font('bodySemi').text(item.slice(1));
      } else {
        doc.font('bodySemi').fontSize(13).fillColor(C.text).text(item, M + 50, y + 16);
      }
    });
    star(doc, 680, 140, 220);
  },
  // 7. Services
  (doc, n, t) => {
    frame(doc, n, t);
    heading(doc, 'Beyond Plant Bill', 'We build for every kind of business.');
    const services = [
      ['Plant Bill', 'Billing software + printer for plant nurseries'],
      ['Websites', 'Designed and built for any company'],
      ['Website maintenance', 'Updates, fixes and keeping your site running'],
      ['Mobile apps', 'Android and iOS apps'],
      ['E-commerce', 'Online stores that take orders'],
      ['Custom software', 'Billing, business tools and much more'],
    ];
    const cw = (W - 2 * M - 2 * 20) / 3;
    services.forEach(([title, text], i) => {
      const x = M + (i % 3) * (cw + 20);
      const y = M + 95 + Math.floor(i / 3) * 150;
      card(doc, x, y, cw, 130, { fill: i === 0 ? C.tint : C.card, stroke: i === 0 ? C.blue : C.line });
      doc.font('bodySemi').fontSize(10).fillColor(C.blueL).text(String(i + 1).padStart(2, '0'), x + 20, y + 20, { characterSpacing: 1.5 });
      doc.font('display').fontSize(18).fillColor(C.text).text(title, x + 20, y + 44, { width: cw - 40 });
      doc.font('body').fontSize(11).fillColor(C.muted).text(text, x + 20, y + 74, { width: cw - 40, lineGap: 2 });
    });
  },
  // 8. Contact
  (doc, n, t) => {
    frame(doc, n, t);
    heading(doc, 'Talk to us', 'Ready to bill smarter?');
    doc.font('body').fontSize(14).fillColor(C.muted).text(`We serve businesses and nurseries across ${company.serviceArea}. Send us an enquiry on our website and we will get back to you.`, M, M + 80, { width: 500, lineGap: 4 });
    company.locations.forEach((loc, i) => {
      const x = M + i * 250, y = M + 180;
      card(doc, x, y, 230, 110);
      doc.font('bodySemi').fontSize(10).fillColor(C.blueL).text(loc.note.toUpperCase(), x + 20, y + 20, { characterSpacing: 1.5 });
      doc.font('display').fontSize(24).fillColor(C.text).text(loc.city, x + 20, y + 40);
      doc.font('body').fontSize(12).fillColor(C.muted).text(loc.region, x + 20, y + 74);
    });
    const lines = [
      company.contact.phone && `Phone: ${company.contact.phone}`,
      company.contact.whatsapp && `WhatsApp: ${company.contact.whatsapp}`,
      company.contact.email && `Email: ${company.contact.email}`,
    ].filter(Boolean);
    if (lines.length) doc.font('bodySemi').fontSize(12).fillColor(C.text).text(lines.join('     '), M, M + 320);
    star(doc, 700, 120, 190);
  },
];

function buildBrochure() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [W, H],
      margin: 0,
      autoFirstPage: false,
      info: { Title: `${product.name} by ${company.legalName}`, Author: company.legalName, Subject: 'Plant nursery billing software' },
    });
    for (const [name, file] of Object.entries(FONTS)) doc.registerFont(name, file);
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    slides.forEach((draw, i) => {
      doc.addPage();
      draw(doc, i + 1, slides.length);
    });
    doc.end();
  });
}

module.exports = { buildBrochure };
