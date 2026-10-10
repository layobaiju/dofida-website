# Dofida Group website

The website for **Dofida Group**. We build and maintain websites, mobile apps, e-commerce stores and custom software for every kind of business, and make **Plant Bill**: billing software for plant nurseries that runs on Android and iOS and comes with a billing printer. Serving all of Kerala and Karnataka from offices in Calicut and Hunsur.

- Animated landing page with a dark split-down intro, services, Plant Bill product, features, compare slider, pricing, brochure, locations, FAQ and enquiry form
- Plant Bill pricing: ₹20,000 for the first nursery, 50% off (₹10,000) for each extra nursery under the same owner, printer included, plus ₹199/month for all nurseries
- **Animated brochure** at `/brochure` (also embedded on the home page): swipeable, keyboard and touch friendly, works on phones, fold phones, tablets and computers
- **Downloadable PDF brochure** generated from the same data
- **Enquiry form** backed by an API, with validation, spam protection and rate limiting
- **Admin dashboard** at `/admin` to read enquiries, set their status, add notes and export CSV
- **Three languages**: English (default), Malayalam and Kannada, switchable from the top bar on every screen; the whole site, the animated brochure, the PDF, form messages and pop-ups change language (numbers stay the same). Translations live in `src/i18n/`.
- Dark Midnight theme by default, plus Paper and Sage themes; the same fonts (Outfit + Inter) and colours across the site, brochure and PDF

## Run it on your computer (Windows)

You need two free programs installed once: **Node.js** (LTS version, from nodejs.org) and **Git** (from git-scm.com). Install both with the default options.

**First time: download the code into Documents\dofida-website**

Open **Command Prompt** and run:

```bat
cd %USERPROFILE%\Documents
git clone -b claude/dofida-animated-website-cpt52z https://github.com/layobaiju/dofida-website.git "dofida-website"
cd dofida-website
npm ci
copy .env.example .env
notepad .env
```

In Notepad, change `ADMIN_TOKEN` to a password of your choice, then save and close.

**Start the website**

```bat
cd %USERPROFILE%\Documents\dofida-website
npm start
```

Open http://localhost:3000 in your browser. The admin dashboard is at http://localhost:3000/admin. Press `Ctrl + C` in Command Prompt to stop the site.

**Get the latest changes** (after Claude pushes an update)

```bat
cd %USERPROFILE%\Documents\dofida-website
git pull
npm ci
npm start
```

Use `npm ci` (not `npm install`) for updates: it installs exactly what's in `package-lock.json` without changing that file, so `git pull` never gets blocked. If `git pull` says *"Your local changes to the following files would be overwritten: package-lock.json"*, run `git checkout -- package-lock.json` and pull again.

**Send your own changes to GitHub** (if you edit files yourself)

```bat
git add -A
git commit -m "Describe what you changed"
git push
```

## Other commands

```bash
npm run dev        # auto-restarts when you edit code
npm test           # backend tests
npm run brochure   # save the PDF brochure to disk
```

## Configuration

Prices, features, locations and contact details are in **`src/config.js`**. The website, the slide deck and the PDF brochure all read from it, so you only change a price in one place.

Settings go in a `.env` file in the project folder (copy `.env.example` to start). It is private and never uploaded to GitHub. You can also set them as normal environment variables.

| Variable | Purpose |
| --- | --- |
| `PORT` | Port to listen on (default `3000`) |
| `HOST` | Address to listen on; use `127.0.0.1` on a shared server behind nginx |
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
