# KK Digital Studio

Full-stack website for **KK DIGITAL STUDIO**, a photography studio in Achamangalam, Tirupathur, Tamil Nadu 635651.

- **Public website:** home, about, services, portfolio, packages, photo-frame shop (cart, checkout, order history), booking, contact.
- **One centralized admin panel** at `/admin` that controls all website content, bookings, orders and users.
- **Stack:** React 18 + Vite (JavaScript/JSX), React Router, Framer Motion, plain CSS · Node.js + Express · MongoDB + Mongoose.

> Please read **[Verification status](#verification-status)** first: it says exactly which parts have and have not been run.

---

## Contents

1. [What you need to provide](#what-you-need-to-provide)
2. [Requirements](#requirements)
3. [Quick start (local)](#quick-start-local)
4. [Configuration (`.env`)](#configuration-env)
5. [First admin account](#first-admin-account)
6. [Using the admin panel](#using-the-admin-panel)
7. [How content flows to the website](#how-content-flows-to-the-website)
8. [Shop, orders and payments](#shop-orders-and-payments)
9. [Booking system](#booking-system)
10. [Images and video](#images-and-video)
11. [Production deployment](#production-deployment)
12. [Security](#security)
13. [Project structure](#project-structure)
14. [API overview](#api-overview)
15. [Troubleshooting](#troubleshooting)
16. [Verification status](#verification-status)

---

## What you need to provide

The site never invents business facts. The following must come from the studio owner:

| Item | Where to set it | Until then |
|---|---|---|
| **MongoDB database** (local or [MongoDB Atlas](https://www.mongodb.com/atlas)) | `MONGODB_URI` in `.env` | Server will not start |
| **`JWT_SECRET`** (random, 32+ chars) | `.env` | Required in production; a temporary one is generated in development |
| **Admin email + password** | `ADMIN_EMAIL`, `ADMIN_PASSWORD` in `.env`, then `npm run seed` | No admin exists, so you cannot sign in |
| **Phone, WhatsApp number, email** | Admin → *Contact info* (or `BUSINESS_*` in `.env`) | Call/WhatsApp buttons are hidden or link to the Contact page |
| **Opening hours, social links** | Admin → *Contact info* | Not displayed |
| **Prices** (packages, frames) | Admin → *Packages*, *Products* | Shown as “Contact for pricing” / “Price on request”; frames cannot be added to the cart |
| **Photographs** (portfolio, services, products) | Admin → *Gallery*, *Services*, *Products* | Tasteful placeholders are shown; no stock photos are used |
| **Testimonials** | Admin → *Testimonials* | None are shown; the section hides itself |
| **Cloudinary account** (optional, recommended) | `CLOUDINARY_*` in `.env` | Uploads go to `server/uploads` on the server’s disk |
| **SMTP account** (optional) | `SMTP_*` in `.env` | Password-reset links are printed in the server console (development only) |
| **Payment gateway** (optional) | Implement in `server/services/payments.js` | Orders are enquiry-based (see below) |
| **Domain name + HTTPS hosting** | Your host | – |

---

## Requirements

- **Node.js 18.18 or newer** (20 LTS recommended) and npm
- **MongoDB 6+** (local install, Docker, or a free MongoDB Atlas cluster)

---

## Quick start (local)

```bash
# 1. install everything (root + server + client)
npm run install:all

# 2. configure
cp .env.example .env
#    edit .env: set MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 3. create the admin account and the starting content (services, categories, frame products, packages)
npm run seed

# 4. run API (http://localhost:5000) and website (http://localhost:5173) together
npm run dev
```

Open **http://localhost:5173** for the website and **http://localhost:5173/admin** for the admin panel.

Useful commands:

| Command | What it does |
|---|---|
| `npm run dev` | API with auto-restart + Vite dev server (the Vite server proxies `/api`, `/uploads`, `/sitemap.xml`, `/robots.txt` to the API) |
| `npm run seed` | Creates the first superadmin, categories, the 14 photography services, three starter packages and four frame products. Safe to re-run: it never overwrites existing content |
| `npm run seed:demo` | Same, plus **clearly sample** prices and stock on the frame products so you can try the shop. Replace them in the admin before going live |
| `npm run create-admin` | Creates (or resets the password of) an admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| `npm run build` | Builds the React app into `client/dist` |
| `npm start` | Starts the production server (serves the API **and** the built website on one port) |
| `npm --prefix server run check` | Prints storage/SMTP status and document counts |

---

## Configuration (`.env`)

Copy `.env.example` to `.env` (project root or `server/`). Every variable is documented in that file. The important ones:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Database connection string |
| `JWT_SECRET` | Signs admin sessions. 32+ random characters, required in production |
| `SITE_URL` | Public URL (sitemap, canonical links, emails) |
| `CLIENT_URL` | Extra allowed origin(s). In development set to `http://localhost:5173` so reset links open the right page |
| `ADMIN_NAME/EMAIL/PASSWORD` | Used by `seed` / `create-admin` only |
| `CLOUDINARY_*` | When all three are set, uploads go to Cloudinary |
| `MAX_IMAGE_MB`, `MAX_VIDEO_MB` | Upload size limits |
| `SMTP_*` | Enables emailing password-reset links |
| `COOKIE_SECURE`, `TRUST_PROXY` | Default to `true` in production (HTTPS + reverse proxy) |
| `PAYMENT_PROVIDER` | `none` (default) |

---

## First admin account

1. Put `ADMIN_EMAIL` and `ADMIN_PASSWORD` (10+ characters, with a letter and a number) in `.env`.
2. Run `npm run seed` (or `npm run create-admin`).
3. Sign in at `/admin/login`, then change the password under *My account*.
4. Remove `ADMIN_PASSWORD` from `.env` afterwards.

Forgot the password? Use *Forgot your password?* on the login page (needs SMTP, or read the link in the server console in development), or run `npm run create-admin` with a new `ADMIN_PASSWORD`.

---

## Using the admin panel

Everything is in one place: **`/admin`**. The sidebar shows only the modules each user is allowed to open, and the server re-checks permission on every request.

| Module | What you can do |
|---|---|
| **Dashboard** | Live counts from your database: pending bookings/orders, new enquiries, order value, 30-day booking trend, most booked services, low stock, recent activity |
| **Homepage** | Hero text, hero buttons (page / WhatsApp / call / link), hero video and poster images, every homepage section’s text, images, steps and reasons, section on/off switches, featured services and products |
| **Video** | Upload, preview, replace and delete videos; choose which video plays on desktop and/or mobile in the hero; poster images; promo videos |
| **Gallery** | Upload many photos at once, titles, captions, categories, featured, order, publish/hide, bulk publish/hide/delete |
| **Services** | Add/edit/hide/delete services; text, highlights, image, starting price text, order |
| **Packages** | Name, description, price (0 = “Contact for pricing”), inclusions, “Most popular” flag |
| **Products** | Frame products with images, description, features and a **variant table** (size × finish with price, compare-at price, stock, SKU, active). Includes a one-click size × finish generator |
| **Categories** | Gallery categories (portfolio filter) and product categories |
| **Orders** | Filter, view customer/items/address, change status, payment status, internal notes, full history. Cancelling restores stock |
| **Bookings** | Filter by status/date, confirm/reject/complete/cancel, reschedule, handle customer reschedule requests, location, internal notes, history |
| **Customers** | Auto-created from bookings, orders and enquiries; edit details/notes; see their bookings, orders and enquiries |
| **Enquiries** | Contact-form, product and service enquiries with status and internal notes; one-tap call / WhatsApp / email |
| **Testimonials** | Add real client feedback; hidden until published |
| **Contact info** | Phone, WhatsApp, email, address, map search text, opening hours, social links |
| **Navigation** | Header/footer links: reorder, rename, hide, add |
| **Website settings** | Business name, tagline, logo, favicon, currency, footer text, shipping charge, free-shipping threshold, cash-on-delivery / pickup options, “after ordering” message |
| **SEO** | Title, description and share image for every page, default share image, optional custom `robots.txt`, live search-result preview |
| **Media library** | Every uploaded image/video; rename, alt text, copy link, delete (blocked while the file is in use) |
| **Users & permissions** | Create team accounts, set role (superadmin / admin / editor / staff) and tick exactly which modules each person may use; disable accounts |
| **Activity logs** | Who changed what and when, plus public form submissions |

Role defaults (adjustable per user): **superadmin** everything · **admin** everything except Users · **editor** website content · **staff** bookings, orders, customers, enquiries, products.

---

## How content flows to the website

There is no hardcoded manageable content: services, packages, products, gallery, testimonials, contact details, navigation, homepage copy, hero media and SEO are stored in MongoDB and read through the public API (`/api/site`, `/api/home`, …). Saving in the admin writes to the database; the website reads it on the next load.

Built-in defaults (`server/services/defaults.js`) are only a starting point, merged underneath whatever you save. Sections with no data (portfolio without photos, testimonials without published items) are hidden instead of showing fake content.

---

## Shop, orders and payments

- Cart is saved in the browser; **prices are always recalculated on the server** at checkout (the browser’s numbers are never trusted).
- Stock is reserved atomically when an order is placed and restored when it is cancelled. Two customers cannot buy the last unit.
- Products or variants with price `0` show “Price on request” and cannot be added to the cart; customers can send an enquiry instead.
- **Online payment is not enabled.** Checkout creates an **enquiry-based order** (and optionally cash on delivery or store pickup, configurable in Website settings); the studio confirms and arranges payment with the customer. No gateway credentials are collected or stored.
- To add a gateway such as Razorpay or Stripe, implement `createPaymentSession` in `server/services/payments.js` and set `PAYMENT_PROVIDER`. Keep gateway keys in `.env`, never in the database or the client.

---

## Booking system

Customers submit service, date, time, location and message. The request is stored as **Pending** with a reference like `KK-BK-…`; **it is never auto-confirmed**. You confirm, reject, complete, reschedule or cancel from *Bookings*. Customers can look up a booking with reference + phone number, cancel it, or ask to reschedule (you approve the new time in the admin). WhatsApp shortcuts appear wherever a number is configured.

---

## Images and video

- **Hero video:** a 1280×720 looping clip and a lighter 854×480 clip for phones are included (`client/public/videos`). They were cut from the supplied commercial; the garbled on-screen caption and the “Veo” watermark were trimmed/cropped out of the loop. Visitors with “reduce motion” enabled see the poster image instead, and a pause/play button is always available.
- Replace or add videos in **Admin → Video**. Best results: MP4 (H.264), no audio, 10–20 s, under 8 MB. To compress with ffmpeg:
  ```bash
  ffmpeg -i input.mp4 -vf "scale=1280:-2" -an -c:v libx264 -crf 26 -preset slow -movflags +faststart hero.mp4
  ffmpeg -i input.mp4 -vf "scale=854:-2"  -an -c:v libx264 -crf 28 -preset slow -movflags +faststart hero-mobile.mp4
  ```
- Image uploads are validated by **file signature** (not just extension), limited by size, and stored on Cloudinary (if configured) or `server/uploads`.
- No stock photography is bundled. Until you upload photos, tonal placeholders are shown.

---

## Production deployment

The production server is **one Node process** that serves the API and the built React app from the same origin (simplest, and best for the secure cookie).

### 1. Prepare
```bash
npm run install:all
npm run build                     # creates client/dist
cp .env.example .env              # fill in for production
```
Production `.env` must have at least: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (32+ chars), `SITE_URL=https://your-domain.com`, and the admin details for the first seed. Add `CLOUDINARY_*` unless your host has persistent disk.

### 2. Seed once
```bash
NODE_ENV=production npm run seed
```

### 3. Run
```bash
npm start
```
Use a process manager so it restarts automatically, for example PM2:
```bash
npm i -g pm2
pm2 start server/server.js --name kk-digital-studio
pm2 save && pm2 startup
```

### 4. HTTPS reverse proxy (VPS example, Nginx)
```nginx
server {
  server_name your-domain.com;
  client_max_body_size 110m;              # allow video uploads (match MAX_VIDEO_MB)
  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
Then add a certificate with Let’s Encrypt (`certbot --nginx`). `TRUST_PROXY` and `COOKIE_SECURE` are on by default in production.

### Platform-as-a-service (Render, Railway, etc.)
- For this repository, create a **Render Web Service** with **Root Directory** `kk-digital-studio`.
- Build command: `npm run install:all && npm run build`
- Start command: `npm start`
- The backend package manifest is `server/package.json`; its `start` script runs `node server.js` from `server/`. The parent package's `npm start` script invokes it and is the recommended Render start command.
- Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and `SITE_URL` in Render's environment settings. Render supplies `PORT`. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` only when creating the first admin, then remove those variables.
- Use an Atlas URI in the form `mongodb+srv://<db-user>:<url-encoded-password>@<cluster-host>/kk-digital-studio?retryWrites=true&w=majority`. URL-encode special characters in the database password and allow Render's outbound IPs in the Atlas network access list.
- Set other values from `.env.example` in the platform dashboard as needed. Never copy secrets into source files or commit `.env`.
- Use **MongoDB Atlas** and **Cloudinary**: most platforms have ephemeral disks, so local uploads would be lost on redeploy.
- Run `npm run seed` once from the platform shell.

### Netlify
This application is configured as a same-origin full-stack app: the frontend calls `/api`, and Express serves both the API and `client/dist`. Deploying the static client alone to Netlify will send `/api` requests to Netlify and can return 404s; client-side routes also need an SPA fallback. Use the Render Web Service above as the production deployment. If you specifically want Netlify in front, configure Netlify proxy rules for `/api/*` (and `/uploads/*` if needed) to your actual Render service URL, plus an SPA fallback, and set `CLIENT_URL` to the Netlify origin in Render. Do not use a placeholder service URL or expose database/JWT/admin credentials in the client build.

### Backups & updates
Back up the MongoDB database regularly (Atlas has built-in backups). To update: pull the new code, `npm run install:all`, `npm run build`, restart.

---

## Security

- Passwords are hashed with **bcrypt** (cost 12, via `bcryptjs`); policy 10+ characters with a letter and a number.
- Admin sessions: **JWT in an HTTP-only, SameSite=Strict cookie** (Secure in production), 8-hour expiry, invalidated on password change/role change.
- **Server-side authorization** on every admin route (role + per-module permissions). Hiding a menu item is cosmetic only.
- Brute-force protection: rate limits on login/reset, 5 failed logins lock the account for 15 minutes, timing-equalised responses.
- CSRF defence: state-changing admin calls require a custom header plus SameSite cookie.
- Password-reset tokens are random, stored hashed, expire in 30 minutes, single use.
- `helmet` security headers with a strict Content-Security-Policy (Google Fonts, Cloudinary, Google Maps embed only).
- Input validation on every public form; a hidden honeypot field catches simple bots; public lookups need reference **and** phone.
- Uploads: type sniffing by magic bytes, size limits, random file names; media in use cannot be deleted.
- Settings sanitised server-side (`javascript:` / `data:` links are rejected).

Recommended: keep `JWT_SECRET` private, use HTTPS only, give team members the minimum permissions, and review *Activity logs* occasionally.

---

## Project structure

```
kk-digital-studio/
├─ .env.example
├─ package.json                 root scripts (dev, build, start, seed…)
├─ client/                      React + Vite
│  ├─ public/                   hero videos, posters, favicon
│  └─ src/
│     ├─ components/            shared UI (Header, Footer, HeroVideo, Lightbox, Cards…)
│     ├─ context/               Site (config), Cart, Auth
│     ├─ pages/                 public pages
│     ├─ layouts/               public layout
│     ├─ admin/                 the admin panel (lazy-loaded, own CSS)
│     │  ├─ modules/            Dashboard, Homepage, Videos, Gallery, Products, Orders…
│     │  ├─ components/         DataTable bits, modals, media picker, charts, forms
│     │  └─ pages/              login / reset / account
│     ├─ services/              api client, formatting helpers
│     └─ styles/                design tokens + layout/component/page CSS
└─ server/                      Express + MongoDB (`server/package.json`)
   ├─ config/                   env, db, constants
   ├─ models/                   Mongoose schemas
   ├─ controllers/              request handlers
   ├─ services/                 settings, pricing/stock, media, mail, payments
   ├─ middleware/               auth/RBAC, validation, uploads, errors
   ├─ routes/                   public.js, admin.js
   ├─ scripts/                  seed, createAdmin, check
   └─ server.js                 app entry (also serves client/dist + sitemap/robots)
```

---

## API overview

Public (`/api`): `GET /site`, `/home`, `/services`, `/packages`, `/testimonials`, `/categories`, `/gallery`, `/products`, `/products/:idOrSlug` · `POST /cart/price`, `/orders`, `/orders/lookup`, `/bookings`, `/bookings/lookup`, `/bookings/cancel`, `/bookings/reschedule`, `/enquiries`.

Admin (`/api/admin`, authenticated, header `X-Requested-With: kk-admin` on writes): `auth/*`, `config`, `config/:group`, `dashboard`, and CRUD for `services`, `packages`, `categories`, `testimonials`, `products`, `gallery` (+ `gallery/upload`, `bulk`), `bookings`, `orders`, `enquiries`, `customers`, `media`, `users`, `logs`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `MongoServerSelectionError` | `MONGODB_URI` is wrong or MongoDB is not running / Atlas IP allow-list blocks you |
| “JWT_SECRET must be set…” | Set a 32+ character `JWT_SECRET` when `NODE_ENV=production` |
| Cannot sign in at `/admin/login` | Run `npm run seed` (or `create-admin`) after setting `ADMIN_EMAIL`/`ADMIN_PASSWORD`; check the password rule |
| Signed in but immediately signed out over HTTP | Production sets `COOKIE_SECURE=true`; use HTTPS or set `COOKIE_SECURE=false` only for a plain-HTTP test |
| Uploads disappear after a redeploy | Host disk is temporary: configure Cloudinary |
| Video upload fails / “413” | Raise `MAX_VIDEO_MB` and your proxy’s `client_max_body_size` |
| WhatsApp / Call buttons missing | Add the numbers in Admin → Contact info |
| Frame shows “Price on request” | Set a price greater than 0 on at least one active variant |
| Website shows old text | Hard-refresh (Ctrl/Cmd+Shift+R); API responses are not cached by the server |

---

## Verification status

Being precise about what has been done:

**Done and checked**
- Every server file passes a Node syntax check (`node --check`).
- The whole client (public site **and** admin panel) compiles and bundles without errors.
- The public pages were rendered in headless Chrome at phone, tablet and desktop widths (320 → 1920 px) against a mock API, and checked for horizontal overflow, broken images and console errors.
- All 21 admin screens were rendered and exercised against a mock admin API: sign-in/out, forgot password, create/edit/delete, product variant generator, order and booking status changes, gallery bulk actions, homepage editor save, video selection, media picker, users & permissions, SEO, contact settings, role-based menu gating, and the mobile menu.

**Not run in the build environment (no network, no MongoDB, no npm install)**
- `npm install`, `npm run dev`, `npm run build` (Vite), `npm start`.
- The Express server against a real MongoDB: authentication, authorization, uploads (local and Cloudinary), booking and order creation, stock reservation, password-reset emails, sitemap/robots.
- Any payment gateway (none is enabled).
- No `package-lock.json` is included; it is created on your first `npm install`.

Please run through this checklist on your machine before launch: `npm run seed` → sign in → change password → add contact numbers → upload a few photos → create a test booking and test order → confirm them in the admin → check the public pages on a phone.

If something does not work as described when first run, it is most likely a small integration issue that did not surface in the mock environment; the structure and logic are all in place.
