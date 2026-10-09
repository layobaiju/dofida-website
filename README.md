# Dofida Group website

The website for **Dofida Group** and its product **Plant Bill**: billing software for plant nurseries that runs on Android and iOS and comes with a billing printer.

- Animated landing page: a split-down intro that reveals the Dofida logo, then the product, features, pricing, slides and locations
- Pricing calculator: ₹20,400 for the first nursery and 50% off (₹10,200) for each extra nursery under the same owner, printer included in both
- In-page slide deck plus a **downloadable PDF brochure** generated from the same data
- **Enquiry form** backed by an API, with validation, spam protection and rate limiting
- **Admin dashboard** at `/admin` to read enquiries, set their status, add notes and export CSV
- Offices: Calicut, Kerala and Hunsur, Karnataka

## Run it

Requires Node.js 20 or newer.

```bash
npm install
ADMIN_TOKEN=choose-a-long-secret npm start     # http://localhost:3000
npm run dev                                    # auto-restarts on file changes
npm test                                       # backend tests
npm run brochure                               # save the PDF brochure to disk
```

## Configuration

Prices, features, locations and contact details are in **`src/config.js`**. The website, the slide deck and the PDF brochure all read from it, so you only change a price in one place.

Environment variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Port to listen on (default `3000`) |
| `ADMIN_TOKEN` | Password for `/admin`. If it's not set, the admin dashboard is turned off. |
| `DATA_FILE` | Where enquiries are stored (default `data/db.json`) |
| `CONTACT_PHONE`, `CONTACT_WHATSAPP`, `CONTACT_EMAIL` | Shown on the site and in the brochure when set |
| `ENQUIRY_WEBHOOK_URL` | Optional. Each new enquiry is POSTed here (Slack, Zapier, Make, n8n…) |
| `TRUST_PROXY` | Set to `1` when running behind a reverse proxy, so rate limiting sees the real visitor IP |

## API

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/enquiries` | Submit an enquiry (`name`, `phone` required) |
| `GET` | `/api/brochure` | Download the PDF brochure (`?inline=1` to view it in the browser) |
| `GET` | `/api/quote?nurseries=3` | Price for N nurseries |
| `GET` | `/api/site` | Company, product and pricing data |
| `GET` | `/api/admin/enquiries` | List enquiries (Bearer `ADMIN_TOKEN`) |
| `PATCH` | `/api/admin/enquiries/:id` | Update `status` / `notes` |
| `DELETE` | `/api/admin/enquiries/:id` | Delete an enquiry |
| `GET` | `/api/admin/enquiries.csv` | Export as CSV |
| `GET` | `/api/admin/stats` | Enquiry and brochure download counts |

## Project layout

```
server.js            entry point
src/app.js           Express app: pages, API, admin, security headers
src/config.js        company, product and pricing data
src/brochure.js      PDF brochure generator (pdfkit)
src/store.js         JSON file storage for enquiries
public/              HTML, CSS, JS and images
test/                API tests (node --test)
```

## Deploying

The site is a single Node process. It runs on any host that supports Node (Render, Railway, a VPS with PM2, etc.). Enquiries are saved to `DATA_FILE`, so put that file on persistent storage and back it up.
