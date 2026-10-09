const path = require('path');
const { createApp } = require('./src/app');
const { createStore } = require('./src/store');

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');

// Optional: POST every new enquiry to a webhook (Slack, Zapier, Make, n8n, etc.).
const webhook = process.env.ENQUIRY_WEBHOOK_URL;
const notify = webhook
  ? (enquiry) =>
      fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `New Dofida enquiry from ${enquiry.name} (${enquiry.phone}) — ${enquiry.nursery || 'nursery not given'}, ${enquiry.nurseries} nursery(s)`,
          enquiry,
        }),
      })
  : undefined;

const store = createStore(DATA_FILE);
const app = createApp({ store, notify });

app.listen(PORT, () => {
  console.log(`Dofida website running at http://localhost:${PORT}`);
  if (!process.env.ADMIN_TOKEN) console.log('Admin dashboard disabled: set ADMIN_TOKEN to enable /admin');
});
