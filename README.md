# LinkedIn Lead Export Automation

Full-stack lead export automation using Node.js, Express, Playwright, MongoDB Atlas, Mongoose, React, and Vite.

The scraper opens LinkedIn in a visible browser, waits for manual login, searches the query entered in the UI, stores unique leads by LinkedIn URL, and exports saved leads to CSV.

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Install Playwright Chromium:

```bash
npx playwright install chromium
```

3. Create backend environment file:

```bash
copy backend\.env.example backend\.env
```

4. Fill in `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/linkedin_leads
MONGODB_DB_NAME=digitalgadgets
FRONTEND_ORIGIN=http://localhost:5173,https://your-site.netlify.app
```

To reuse the same MongoDB Atlas database as the DigitalGadgets project, paste that project's Atlas connection string into `MONGODB_URI` and keep `MONGODB_DB_NAME=digitalgadgets`.

The search query is entered from the frontend. LinkedIn login happens manually in the browser window opened by Playwright, so credentials are not stored in this project.
Each successful new scrape clears the old saved leads before storing the latest results, so the table and CSV export contain only the newest scrape.

## Run

Start backend:

```bash
npm run dev:backend
```

Start frontend in another terminal:

```bash
npm run dev:frontend
```

Open the Vite URL, usually `http://localhost:5173`.

## Netlify Frontend

Use these Netlify build settings:

```text
Base directory: frontend
Build command: npm run build
Publish directory: frontend/dist
```

Add this Netlify environment variable:

```env
VITE_API_BASE_URL=https://your-public-backend-url/api
```

If the backend runs on your laptop through ngrok, expose it with:

```bash
ngrok http 5000
```

Then set `VITE_API_BASE_URL` to the ngrok HTTPS URL plus `/api`. Also add your Netlify site URL to backend `FRONTEND_ORIGIN`, separated by commas.

## API

- `POST /api/scrape` starts LinkedIn scraping with `query` and `maxPages` in the JSON body.
- `GET /api/scrape` is still available for quick backend testing and uses query parameters.
- `GET /api/leads` returns saved leads.
- `GET /api/export` writes `backend/exports/leads.csv` and downloads it.

## Notes

- The Playwright browser runs with `headless: false` and waits up to 5 minutes for manual LinkedIn login.
- This project extracts only publicly visible fields. It does not bypass CAPTCHAs, MFA, paywalls, or LinkedIn access controls.
- LinkedIn markup changes often, so selectors may need updates over time.
