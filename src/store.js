// Small JSON-file store. Writes are serialised through a promise chain and go to a
// temp file first, then rename, so a crash mid-write never leaves a corrupt file.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EMPTY = () => ({ enquiries: [], downloads: { total: 0, byDay: {} } });

function createStore(file) {
  let data = EMPTY();
  let chain = Promise.resolve();

  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    try {
      data = { ...EMPTY(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch (err) {
      const backup = `${file}.corrupt-${Date.now()}`;
      fs.renameSync(file, backup);
      console.error(`Could not parse ${file}; moved it to ${backup} and started fresh.`);
    }
  }

  function persist() {
    chain = chain.then(async () => {
      const tmp = `${file}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.promises.rename(tmp, file);
    });
    return chain;
  }

  return {
    async addEnquiry(fields) {
      const enquiry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        status: 'new',
        ...fields,
      };
      data.enquiries.unshift(enquiry);
      await persist();
      return enquiry;
    },
    listEnquiries() {
      return data.enquiries;
    },
    async updateEnquiry(id, patch) {
      const enquiry = data.enquiries.find((e) => e.id === id);
      if (!enquiry) return null;
      Object.assign(enquiry, patch, { updatedAt: new Date().toISOString() });
      await persist();
      return enquiry;
    },
    async deleteEnquiry(id) {
      const before = data.enquiries.length;
      data.enquiries = data.enquiries.filter((e) => e.id !== id);
      if (data.enquiries.length === before) return false;
      await persist();
      return true;
    },
    async recordDownload() {
      const day = new Date().toISOString().slice(0, 10);
      data.downloads.total += 1;
      data.downloads.byDay[day] = (data.downloads.byDay[day] || 0) + 1;
      await persist();
    },
    stats() {
      const enquiries = data.enquiries;
      return {
        enquiries: enquiries.length,
        new: enquiries.filter((e) => e.status === 'new').length,
        downloads: data.downloads.total,
      };
    },
    flush: () => chain,
  };
}

module.exports = { createStore };
