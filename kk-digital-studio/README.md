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
| **Media storage** | Select Cloudinary or Backblaze with `STORAGE_PROVIDER` and server-side credentials | Production uploads require configured remote storage or an explicitly selected persistent disk |
| **SMTP account** (optional) | `SMTP_*` in `.env` | Password-reset links are printed in the server console (development only) |
| **Razorpay account** (optional) | Set server-only `RAZORPAY_*` variables after testing | Online payment is disabled by default |
| **Domain name + HTTPS hosting** | Your host | – |

---

## Requirements

- **Node.js 20.9 or newer** (22 LTS recommended) and npm
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
| `npm --prefix server run migrate:media` | One-time conversion of existing uploads to private originals and watermarked previews; back up first |
| `npm run build` | Builds the React app and prerenders crawlable SEO HTML for public routes into `client/dist` |
| `npm --prefix client run test:api` | Verifies API request timeouts and successful response handling |
| `npm --prefix client run test:site-fallback` | Verifies bounded site-config retries and static fallback behavior |
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
| `STORAGE_PROVIDER` | Optional `backblaze`, `cloudinary`, or `local`. With `backblaze`, new images use B2 and videos continue using Cloudinary; local disk is only for development |
| `B2_BUCKET_NAME`, `B2_ENDPOINT`, `B2_REGION`, `B2_KEY_ID`, `B2_APPLICATION_KEY` | Server-only Backblaze B2 S3-compatible credentials and endpoint; use a private bucket and a bucket-restricted application key |
| `CLOUDINARY_*` | Existing Cloudinary credentials and media remain supported; when `STORAGE_PROVIDER` is blank and all three are set, Cloudinary remains selected |
| `MAX_IMAGE_MB`, `MAX_VIDEO_MB` | Upload size limits |
| `MEDIA_WATERMARK_TEXT` | Text burned into newly generated public image/video previews |
| `MEDIA_BASE_URL` | Optional public backend origin for local and B2 preview delivery; Render's `RENDER_EXTERNAL_URL` is used by default |
| `SMTP_*` | Enables emailing password-reset links |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_API_VERSION` | Optional server-only WhatsApp Business Cloud API settings. Automatic order notifications remain disabled unless all four are valid; also configure `WHATSAPP_TEMPLATE_LANGUAGE` (defaults to `en`). |
| `COOKIE_SECURE`, `TRUST_PROXY` | Default to `true` in production (HTTPS + reverse proxy) |
| `PAYMENT_PROVIDER` | `none` (default) |
| `RAZORPAY_ENABLED` | `false` (default); set `true` only after staging tests pass |
| `RAZORPAY_TEST_MODE` | `true` by default; requires an `rzp_test_` key ID. Production live checkout requires `false` and an `rzp_live_` key ID |
| `RAZORPAY_ALLOW_TEST_MODE` | `false` (default); set `true` only on a separate staging service when it runs with `NODE_ENV=production`. Keep false in production |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Server-side Razorpay API credentials; never use `VITE_` variables |
| `RAZORPAY_WEBHOOK_SECRET` | Server-side signing secret configured for the Razorpay webhook |
| `VITE_API_URL` | Frontend API origin (for example, `https://kk-digital-studio-backend.onrender.com`); set in Cloudflare Pages build variables, without `/api` |
| `VITE_ARATTAI_CHAT_URL` | Optional public HTTPS Arattai URL override. Defaults to the Arattai app download page; this is not a direct chat URL |

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

There is no hardcoded manageable content: services, packages, products, gallery, testimonials, contact details, navigation, homepage copy, hero media and SEO are stored in MongoDB and read through the public API (`/api/site`, `/api/home`, …). Saving in the admin writes to the database; the website reads it on the next load. During an API outage, public pages use the existing verified site defaults and service/package seed copy; dynamic products and all booking, order, payment and admin actions still require live API responses.

Built-in defaults (`server/services/defaults.js`) are only a starting point, merged underneath whatever you save. Sections with no data (portfolio without photos, testimonials without published items) are hidden instead of showing fake content.

## Local SEO and indexing

The shared SEO defaults in `seo.mjs` provide unique titles and descriptions for public routes. `npm run build` generates static HTML for all eight public pages, including meaningful page content, LocalBusiness data and canonical URLs. React starts from local defaults rather than hiding these pages behind `/api/site`; the site-settings request has a 10-second timeout and one bounded retry. Public content remains visible when that request fails, while write and transaction actions still require valid backend responses. The sitemap handler fetches `/sitemap.xml` from Render and returns validated, uncached XML, including legitimate published products. Function entrypoints are present for either supported Pages project root (`functions/` at the repository root or `client/functions/` when the project root is `client`); `client/public/_routes.json` scopes invocation to `/sitemap.xml`. Known client-side routes have explicit rewrites, while other unknown paths use the custom noindex `404.html` response.

SEO values saved in the admin panel intentionally override these defaults at runtime. Review **Admin → SEO** after deployment if saved page titles or descriptions still use older copy. Account, admin, cart, checkout, orders, and order-tracking routes carry `noindex` headers; robots.txt leaves those paths crawlable so search engines can see the directive.

---

## Shop, orders and payments

- Cart is saved in the browser; **prices are always recalculated on the server** at checkout (the browser’s numbers are never trusted).
- The selected variant price is the charged price; any compare-at savings and shipping are calculated from server-side product and site settings.
- Stock is reserved atomically when an order is placed and restored when it is cancelled. Two customers cannot buy the last unit.
- Products or variants with price `0` show “Price on request” and cannot be added to the cart; customers can send an enquiry instead.
- Online payment is **disabled by default** (`RAZORPAY_ENABLED=false`). When production uses `PAYMENT_PROVIDER=razorpay`, checkout is online-only: COD and enquiry orders are hidden in the UI and rejected by the backend.
- Razorpay orders use server-priced products, variants and shipping. The server verifies the checkout signature and fetches the payment to confirm captured status, amount, currency and provider order ID before recording `Paid`. Test keys are required while `RAZORPAY_TEST_MODE=true`; live keys are rejected in test mode.
- Test against a separate staging service and MongoDB database so test orders and stock reservations do not touch customer data. Set staging `PAYMENT_PROVIDER=razorpay`, `RAZORPAY_TEST_MODE=true`, `RAZORPAY_ENABLED=true`, and use test credentials only. If that service has `NODE_ENV=production`, `RAZORPAY_ALLOW_TEST_MODE=true` is required there. Keep it false on production.
- Configure the Razorpay webhook URL as `https://kk-digital-studio-backend.onrender.com/api/payments/razorpay/webhook` (use the corresponding staging backend URL while testing). Subscribe to **`payment.captured`** and **`payment.failed`**. Copy the webhook signing secret to Render as `RAZORPAY_WEBHOOK_SECRET`; do not use the API key secret for webhook verification.
- On the public production Render service, set `PAYMENT_PROVIDER=razorpay`, `RAZORPAY_ENABLED=true`, `RAZORPAY_TEST_MODE=false`, `RAZORPAY_ALLOW_TEST_MODE=false`, and the live `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Online checkout is then the only customer payment path. Do not place any secret in frontend/build variables or run a real payment without explicit approval.

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
- JPG/JPEG, PNG and WebP uploads (as well as the existing GIF/AVIF formats) are validated by **file signature**, resized and composited with an SVG watermark by Sharp, then stored as WebP previews. FFmpeg and the bundled DejaVu Sans font remain in use for watermarked video previews.
- Originals for new images are stored privately in Backblaze B2; new video uploads continue to use Cloudinary, and fail safely in production if Cloudinary is not configured. Public content uses separate reduced, watermarked previews. B2 previews are streamed through stable backend URLs; only the authenticated admin-original route can obtain a short-lived B2 download URL. Signed URLs are never stored in MongoDB or returned to the frontend.
- To enable B2 for new image uploads, configure all five `B2_*` variables on the backend, retain Cloudinary credentials for video uploads, then explicitly set `STORAGE_PROVIDER=backblaze`. The S3 endpoint must match the configured B2 region. Keep the bucket private and the application key restricted to that bucket with file read, write, delete, and list permissions. `npm --prefix server run check` verifies bucket access when B2 is selected.
- Provider selection does not migrate existing media. Existing Cloudinary URLs and assets continue working and are deleted through Cloudinary when an admin deletes or replaces them. Do not run `migrate:media` as part of enabling B2; that script is a separate, manual operation and can replace legacy assets.
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
Production Render must have at least: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (32+ chars), `SITE_URL`, and `STORAGE_PROVIDER=backblaze` with all five `B2_*` settings plus Cloudinary credentials for video uploads. For online-only production checkout, also configure the live Razorpay variables above. Do not run media migration scripts.

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
- Build command: `npm run install:all && npm run build`
- Start command: `npm start`
- Set the environment variables from `.env.example` in the platform dashboard.
- Use **MongoDB Atlas** and a persistent remote media provider (Cloudinary or private Backblaze B2): most platforms have ephemeral disks, so local uploads would be lost on redeploy.
- Run `npm run seed` once from the platform shell.

### Cloudflare Pages frontend with a separate Render API
- Set the Cloudflare Pages build variable `VITE_API_URL` to `https://kk-digital-studio-backend.onrender.com` (the origin only; do not append `/api`). The shared API client adds `/api` and uses this base for public requests, admin requests, and uploads. The Render origin is the fallback if the variable is omitted.
- The Arattai floating button opens `https://chat.arattai.in/app/download` in a new tab by default; this is the app download page, not a direct chat. Set `VITE_ARATTAI_CHAT_URL` in the Cloudflare Pages build environment to override it with a verified HTTPS Arattai link. The button also displays and can copy the studio number. This is a public frontend URL, not a secret.
- On Render, keep `COOKIE_SECURE=true` and `TRUST_PROXY=true`. The API allows the Cloudflare Pages origin and both `https://kkdigitalstudioframes.com` and `https://www.kkdigitalstudioframes.com`. Keep `CLIENT_URL` for any additional origins (such as localhost during development), as comma-separated entries.
- Admin sessions use `SameSite=None; Secure` cookies for this cross-site setup. The cookie remains HTTP-only; exact-origin credentialed CORS and the existing CSRF header remain enabled. Browser privacy settings that block third-party cookies can still prevent cross-site admin sessions; using a custom frontend domain on the same site as the API is the most reliable option.
- The existing `client/public/_redirects` SPA fallback serves `/index.html` for deep links such as `/admin` and `/photo-frames/example`.
- Customer tracking is available at `/track-order`. Public lookup requires the order number and checkout phone, is rate-limited, and returns only customer-safe status/history fields. Existing `/orders/lookup` response format is preserved; its per-instance/IP limit charges each submitted order candidate (up to 40 candidates per 15 minutes). New references use a longer random suffix; existing references remain unchanged.
- Checkout reuses a browser-session idempotency key across retries and stores only its SHA-256 hash with the order. Replayed submissions return the existing order instead of reserving stock or enqueueing another notification.
- Order creation, order status changes, cancellation stock restoration, and their WhatsApp outbox events commit in MongoDB transactions. This prevents a saved order/status without its matching notification event, and prevents duplicate stock returns. MongoDB must support transactions (MongoDB Atlas does; a local standalone server must be configured as a replica set). If a transaction fails, the operation is rejected; it is not retried outside the transaction.
- WhatsApp automation is opt-in per checkout and stays disabled until all WhatsApp settings are configured on Render. Use an approved utility template with three body parameters in order: order number, status, tracking URL. Never place tokens in Cloudflare Pages or `VITE_*` variables. Known 429 rate limits use `Retry-After` or bounded exponential backoff, with at most five attempts. Timeouts, network errors, and 5xx responses remain `unknown` and are not automatically resent to avoid duplicates; verify these before any manual action. Logs include event IDs/state, not customer phone numbers or credentials. A provider acceptance is not a delivery receipt.
- Changes are additive: existing order documents are not migrated or rewritten. To roll back, redeploy the previous Render and Cloudflare Pages versions; leave the added notification collection and order fields untouched. Unset the WhatsApp variables on Render to immediately disable automatic sends.

### Safe feature rollout and rollback
- Review the changed files and tests in a GitHub pull request; merge only after approval. Do not run seeds or migrations for order tracking.
- If provider automation is desired, first create/approve the WhatsApp Business utility template and configure its four required values plus optional language in Render's backend environment. Otherwise leave them unset; manual WhatsApp remains available only for customers who opted in.
- After merging, verify the Render deployment and Cloudflare Pages deployment using their dashboards. Confirm API health, custom-domain CORS/preflight, public tracking, authenticated admin updates, and normal checkout before enabling automatic notifications.
- Roll back by redeploying the previous known-good version on Render and Cloudflare Pages. The feature adds fields and a collection but does not delete or transform existing customer/order/media data; do not drop the collection during rollback.

### Backups & updates
Back up the MongoDB database regularly (Atlas has built-in backups). To update: pull the new code, `npm run install:all`, `npm run build`, restart.

---

## Security

- Passwords are hashed with **bcrypt** (cost 12, via `bcryptjs`); policy 10+ characters with a letter and a number.
- Admin sessions: **JWT in an HTTP-only cookie**, 8-hour expiry, invalidated on password change/role change. SameSite is Strict for local/non-cross-site use; separate-origin production uses SameSite=None with Secure.
- **Server-side authorization** on every admin route (role + per-module permissions). Hiding a menu item is cosmetic only.
- Brute-force protection: rate limits on login/reset, 5 failed logins lock the account for 15 minutes, timing-equalised responses.
- CSRF defence: state-changing admin calls require a custom header plus SameSite cookie.
- Password-reset tokens are random, stored hashed, expire in 30 minutes, single use.
- `helmet` security headers with a strict Content-Security-Policy (Google Fonts, Cloudinary, Google Maps embed only).
- Input validation on every public form; a hidden honeypot field catches simple bots; public lookups need reference **and** phone.
- Uploads: type sniffing by magic bytes, size limits, random file names; originals are private and media in use cannot be deleted.
- Settings sanitised server-side (`javascript:` / `data:` links are rejected).

Recommended: keep `JWT_SECRET` private, use HTTPS only, give team members the minimum permissions, and review *Activity logs* occasionally.

### Public media protection and rollout

- New uploads keep originals in private local storage, Cloudinary `authenticated` delivery, or a private Backblaze bucket. Only the server-side authenticated admin download endpoint can retrieve originals, and it checks the existing media permissions.
- Public content receives separate, maximum-1600px watermarked image previews and maximum-720p watermarked MP4 previews. Preview URLs are intentionally public; they are not originals.
- FFmpeg renders video watermarks using a bundled DejaVu Sans font; Sharp composites the same branding onto image previews with SVG.
- The default watermark is `© KK DIGITAL STUDIO`. Set `MEDIA_WATERMARK_TEXT` on Render before migrating or uploading media. Watermarks are burned into generated previews, so changing the value later requires regenerating previews.
- Back up MongoDB and media storage before any migration. Enabling B2 does not migrate or delete existing media: existing Cloudinary URLs stay as-is and continue to display. `npm --prefix server run migrate:media` is an explicit manual migration that can replace references and remove old assets; do not run it unless that separate migration is intended and approved.
- Render supplies `RENDER_EXTERNAL_URL` for local preview delivery. On other hosts, set `MEDIA_BASE_URL` to the backend's public origin. Keep Cloudinary credentials only in the backend environment.
- Existing external/manual image URLs that are not backed by a Media-library record cannot be migrated or made private automatically; replace them with protected Media-library uploads. Keep public Cloudinary previews separate from authenticated originals. Strict transformation restrictions are an additional Cloudinary control, but enable them only after allowing the transformations the site uses.
- There is no customer-album feature in this project. Any future private-album route must authorize each request against the album owner/customer and must never reuse the public gallery endpoint.
- Right-click, dragging, video download controls, and save shortcuts are deterrents only. Browser-based screenshots, screen recording, developer tools, or copying already-delivered public previews cannot be reliably prevented.

For Cloudflare Pages + Render, configure `MEDIA_WATERMARK_TEXT` on Render and preserve Cloudinary credentials there. Set `MEDIA_BASE_URL` only if Render does not provide `RENDER_EXTERNAL_URL`. Deploy the backend, run the migration, then publish the frontend build as usual. No Cloudinary secret belongs in a `VITE_*` variable.

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
└─ server/                      Express + MongoDB
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

Public (`/api`): `GET /site`, `/home`, `/services`, `/packages`, `/testimonials`, `/categories`, `/gallery`, `/products`, `/products/:idOrSlug` · `POST /cart/price`, `/orders`, `/orders/lookup`, `/orders/track`, `/bookings`, `/bookings/lookup`, `/bookings/cancel`, `/bookings/reschedule`, `/enquiries`.

Admin (`/api/admin`, authenticated, header `X-Requested-With: kk-admin` on writes): `auth/*`, `config`, `config/:group`, `dashboard`, and CRUD for `services`, `packages`, `categories`, `testimonials`, `products`, `gallery` (+ `gallery/upload`, `bulk`), `bookings`, `orders` (+ status and notification retry), `enquiries`, `customers`, `media`, `users`, `logs`.

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
- The production frontend build (`npm run build` from the project directory) succeeds.
- All modified backend JavaScript files pass `node --check`.
- Local upload smoke tests created private originals and processed public previews for a sample image and video, including the video poster; test assets were removed.

**Not run**
- The MongoDB-backed server check, authentication/authorization integration, or Cloudinary upload/download integration.
- The one-time media migration, which must be run manually after backing up MongoDB and media storage.
- Verification against deployed Cloudflare Pages/Render environments or in production browsers.
- Any payment gateway (none is enabled).
- `npm --prefix server audit --omit=dev` reports a pre-existing high-severity Nodemailer advisory; `npm --prefix client audit --omit=dev` reports two moderate React Router advisories. No Sharp advisory remains after removing Sharp.

Please run through this checklist on your machine before launch: `npm run seed` → sign in → change password → add contact numbers → upload a few photos → create a test booking and test order → confirm them in the admin → check the public pages on a phone.

If something does not work as described when first run, it is most likely a small integration issue that did not surface in the mock environment; the structure and logic are all in place.
