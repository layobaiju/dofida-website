// Writes the brochure PDF to disk, e.g. to share on WhatsApp or print.
// Usage: npm run brochure [-- output.pdf]
const fs = require('fs');
const path = require('path');
const { buildBrochure } = require('../src/brochure');

const out = path.resolve(process.argv[2] || 'Dofida-Plant-Bill-Brochure.pdf');
buildBrochure().then((pdf) => {
  fs.writeFileSync(out, pdf);
  console.log(`Brochure written to ${out}`);
});
