// Writes the brochure PDF to disk, e.g. to share on WhatsApp or print.
// Usage: npm run brochure [-- output.pdf] [en|ml|kn]
const fs = require('fs');
const path = require('path');
const { buildBrochure } = require('../src/brochure');

const lang = process.argv[3] || 'en';
const out = path.resolve(process.argv[2] || `Dofida-Plant-Bill-Brochure${lang === 'en' ? '' : `-${lang}`}.pdf`);
buildBrochure(lang).then((pdf) => {
  fs.writeFileSync(out, pdf);
  console.log(`Brochure written to ${out}`);
});
