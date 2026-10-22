# Olive & Ember Bistro

> **“Good food. Slow moments. Lasting memories.”**

A complete, responsive, editorial-style restaurant website built with plain **HTML5**, **CSS3**, **Vanilla JavaScript (ES6+)**, and **Supabase PostgreSQL**.

---

## 1. Project Overview

**Olive & Ember Bistro** is a fictional contemporary woodfire and seasonal kitchen set in Pune, Maharashtra, India. This project demonstrates how to build a warm, high-end independent restaurant website without frontend frameworks, featuring:

- **Editorial Brand Design:** Warm ivory and cream backgrounds, deep olive-green primary tones, muted sage and terracotta accents, serif headings (`Cormorant Garamond`), and clean sans-serif body typography (`Plus Jakarta Sans`).
- **Interactive Food Menu (`menu.html`):** Filterable by category (*Starters*, *Main Course*, *Pasta*, *Desserts*, *Beverages*), keyword search, and a *Vegetarian Only* toggle, with Indian Rupee (`INR`) formatting.
- **Database-Backed Table Reservation Request System (`reservation.html`):** Accessible client-side validation, anti-spam protection, and live persistence to a Supabase PostgreSQL `reservations` table.
- **Graceful Local Demo Fallback:** Works immediately out of the box using built-in sample menu items before Supabase is configured, while clearly indicating whether data is coming from the local demo catalog or live Supabase tables.
- **Honest Prototype Framing:** All addresses, prices, chef profiles, and testimonials are clearly labeled as fictional demonstration data, and reservation submissions are explicitly framed as pending reservation requests rather than guaranteed real-time table inventory bookings.

---

## 2. Folder Structure

```text
olive-ember-bistro/
├── index.html                  # Homepage (Hero, Intro, Signatures, Experience, Testimonials, Hours)
├── menu.html                   # Interactive Food & Beverage Menu with filters & search
├── reservation.html            # Table Reservation Request form connected to Supabase
├── about.html                  # Restaurant story, culinary philosophy & fictional chef profile
├── contact.html                # Placeholder contact details, hours, map placeholder & UI demo form
├── css/
│   └── style.css               # Complete responsive stylesheet (desktop, tablet, mobile)
├── js/
│   ├── supabase.js             # Supabase SDK initialization, config validation & DB queries
│   ├── main.js                 # Mobile navigation, image fallbacks, INR formatter & contact form
│   ├── menu.js                 # Menu rendering, category/search/veg filtering & fallback logic
│   └── reservation.js          # Reservation form validation & Supabase insert workflow
├── assets/
│   └── images/
│       ├── favicon.svg         # Brand icon
│       ├── fallback-dish.svg   # Local SVG fallback for dish photography
│       └── fallback-editorial.svg # Local SVG fallback for interior/editorial photography
├── supabase/
│   └── schema.sql              # PostgreSQL tables, constraints, indexes, RLS policies & seed data
├── .env.example                # Reference template for Supabase URL and Publishable Key
├── .gitignore                  # Prevents committing local environment/config secrets
└── README.md                   # Complete setup, testing, deployment & security documentation
```

---

## 3. Technologies Used

- **HTML5:** Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`), accessible form labels, and ARIA live regions.
- **CSS3:** Custom properties (CSS variables), CSS Grid and Flexbox layouts, fluid `clamp()` typography, visible `:focus-visible` outlines, and `@media (prefers-reduced-motion: reduce)` support.
- **Vanilla JavaScript (ES6+):** Modular IIFE closures, `async/await` database calls, safe DOM construction (`document.createElement` / `textContent`), and `Intl.NumberFormat('en-IN')` currency formatting.
- **Supabase (`@supabase/supabase-js` v2.49.1):** Loaded via pinned jsDelivr CDN for PostgreSQL queries and inserts protected by Row Level Security (RLS).
- **Static Hosting:** Ready for zero-config static deployment on **Vercel**.

---

## 4. How to Open the Project in VS Code

1. Open **Visual Studio Code**.
2. Click **File → Open Folder…** and select the `olive-ember-bistro` directory.
3. Confirm that `index.html`, `css/style.css`, `js/`, and `supabase/schema.sql` are visible in the Explorer sidebar.

---

## 5. How to Run Locally Using a Development Server

Because modern browsers restrict certain features when opening files directly via `file://`, always run the site through a local HTTP server:

### Option A: VS Code Live Server Extension (Recommended for Beginners)
1. Open the **Extensions** panel in VS Code (`Ctrl+Shift+X` on Windows/Linux or `Cmd+Shift+X` on macOS).
2. Search for **Live Server** (by Ritwick Dey) and click **Install**.
3. Right-click `index.html` in the VS Code Explorer and select **Open with Live Server**.
4. Your browser will open `http://127.0.0.1:5500/index.html`.

### Option B: Node.js or Python CLI
If you have Node.js or Python installed, run one of the following commands inside `olive-ember-bistro/`:

```bash
# Using Node.js npx serve
npx serve -l 3000 .

# OR using Python 3
python -m http.server 3000
```
Then open `http://localhost:3000` in your browser.

---

## 6. How to Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in or create a free account.
2. Click **New Project**.
3. Choose your organization, enter a project name (e.g., `olive-ember-bistro`), set a strong database password, and select a region close to your users (e.g., *South Asia (Mumbai)*).
4. Wait 1–2 minutes for your PostgreSQL database to finish provisioning.

---

## 7. Where to Execute `supabase/schema.sql`

1. In your Supabase Project Dashboard, click **SQL Editor** in the left sidebar.
2. Click **+ New query**.
3. Open `supabase/schema.sql` from this project in VS Code, copy its entire contents, and paste it into the Supabase SQL Editor.
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
5. You should see **"Success. No rows returned."**
6. Click **Table Editor** in the left sidebar to verify that two tables now exist:
   - `menu_items` (pre-populated with 17 fictional sample dishes across all 5 categories)
   - `reservations` (empty, ready to receive reservation requests)

---

## 8. How to Configure the Project URL and Publishable Key Safely

### Why `.env` Files Are Not Loaded Automatically in Plain Browser JS
Because this application runs directly in the browser **without a build bundler** (such as Vite, Next.js, or Webpack), the browser does not have access to a Node.js `process.env` object or `.env` file parser. Do not use fake `.env` loader scripts in static sites, as any file fetched by the browser is publicly readable anyway.

### Step-by-Step Configuration
1. In your Supabase Dashboard, go to **Project Settings (gear icon) → API** (or **API Keys**).
2. Copy two values:
   - **Project URL** (looks like `https://abcdefghijklm.supabase.co`)
   - **Publishable key** (`sb_publishable_...`) or legacy **`anon` `public` key** (`eyJhbGci...`)
   - > **CRITICAL SECURITY RULE:** **Never** copy or use the `service_role` or `sb_secret_...` key in browser code! `js/supabase.js` includes a built-in safety check that actively blocks initialization if it detects a `service_role` or `sb_secret_` key.
3. Open `js/supabase.js` and update `FALLBACK_CONFIG` near the top of the file:

```javascript
const FALLBACK_CONFIG = {
  supabaseUrl: 'https://your-actual-project-ref.supabase.co',
  supabasePublishableKey: 'your-actual-publishable-or-anon-key'
};
```

*(Optional for avoiding Git diffs during local development)*: You can instead define `window.OLIVE_EMBER_CONFIG = { supabaseUrl: '...', supabasePublishableKey: '...' }` in a local untracked script `js/config.local.js` (already listed in `.gitignore`) and include `<script src="js/config.local.js"></script>` right before `<script src="js/supabase.js"></script>` in `menu.html` and `reservation.html`.

---

## 9. How to Test Menu Retrieval

1. Open `menu.html` in your browser via your local server.
2. **Before configuring Supabase:**
   - The status banner at the top of the menu reads: *"Demonstration Mode: Displaying built-in fictional sample menu items..."*
   - All 17 dishes render immediately, and you can test the category filter buttons (*All Dishes*, *Starters*, *Main Course*, *Pasta*, *Desserts*, *Beverages*), keyword search box, and *Vegetarian Only* checkbox.
3. **After configuring Supabase and running `supabase/schema.sql`:**
   - Refresh `menu.html`.
   - The status banner turns green and reads: *"Live Database Connected: Menu items loaded from Supabase PostgreSQL (`menu_items`)."*
   - Try editing a dish price or toggling `is_available` to `false` in the Supabase Table Editor, then refresh `menu.html` to see your database change reflected live.

---

## 10. How to Test Reservation Submission

1. Open `reservation.html` in your browser.
2. **Test Client-Side Validation:**
   - Click **Submit Reservation Request** with empty fields or an invalid phone/email.
   - Verify that helpful inline error messages appear beneath each invalid field and focus moves to the first invalid input.
   - Try entering `15` in **Number of Guests** (exceeds the 1–12 limit) or a past date; verify validation blocks submission.
3. **Test Database Submission:**
   - Fill in valid details:
     - **Full Name:** `Priya Kulkarni`
     - **Email Address:** `priya.kulkarni@example.com`
     - **Phone Number:** `+91 98765 43210`
     - **Reservation Date:** Today or any future date
     - **Preferred Time:** `7:30 PM`
     - **Number of Guests:** `4`
     - **Special Requests:** `Window table if available, please.`
   - Click **Submit Reservation Request**.
   - **If Supabase is not configured yet:** An error alert explains that Supabase credentials are not configured yet, and **all of your typed entries remain preserved in the form**.
   - **If Supabase is configured:** The button disables while sending, and once PostgreSQL confirms the `INSERT`, a green confirmation banner appears stating your request was recorded with status `pending`, and the form resets.

---

## 11. How to Verify Saved Reservations in Supabase

1. Open your **Supabase Dashboard → Table Editor**.
2. Select the **`reservations`** table in the left panel.
3. Confirm your newly submitted row appears with:
   - Auto-generated UUID `id`
   - `full_name`, `email`, `phone`, `reservation_date`, `reservation_time`, `guests`, `special_requests`
   - `status` set to `'pending'`
   - Auto-generated `created_at` timestamp
4. Note that public website visitors **cannot** read rows from `reservations` via the browser console because Row Level Security (RLS) restricts `anon` to `INSERT` only.

---

## 12. How to Deploy on Vercel

Because this is a pure static HTML/CSS/JS site, Vercel can host it directly:

1. Push your project repository to GitHub, GitLab, or Bitbucket.
2. Log in to [https://vercel.com](https://vercel.com) and click **Add New… → Project**.
3. Import your `olive-ember-bistro` repository.
4. **Framework Preset:** Select **Other** (no build framework needed).
5. **Important Note on Static Hosting & Environment Variables:**
   - In a static HTML project without a build step, Vercel environment variables are **not** automatically injected into browser `.js` files at runtime.
   - You have two safe options for supplying your public Supabase URL and Publishable Key on Vercel:
     - **Option 1 (Simplest):** Put your public `supabaseUrl` and public `supabasePublishableKey` (never the secret key) in `js/supabase.js`. Because Supabase Publishable/Anon keys are designed to be public in client browsers when Row Level Security (RLS) is enabled, this works out of the box.
     - **Option 2 (Using Vercel Environment Variables at Build Time):** Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in **Vercel Project Settings → Environment Variables**, and set the Vercel **Build Command** to:
       ```bash
       sed -i "s|https://your-project-ref.supabase.co|$SUPABASE_URL|g" js/supabase.js && sed -i "s|your-supabase-publishable-or-anon-key-here|$SUPABASE_PUBLISHABLE_KEY|g" js/supabase.js
       ```
       Leave the **Output Directory** as `.` (root).
6. Click **Deploy**. Your site will be live on a `.vercel.app` domain in seconds.

---

## 13. Security Limitations & Production Readiness Checklist

This project implements the safest possible architecture for a **static browser-to-Supabase prototype**:

- **Row Level Security (RLS)** is enabled on both `menu_items` and `reservations`.
- Public visitors (`anon`) can only `SELECT` rows from `menu_items` where `is_available = true`.
- Public visitors (`anon`) can only `INSERT` into `reservations` when `status = 'pending'`, `guests BETWEEN 1 AND 12`, `reservation_date >= CURRENT_DATE`, and field length/format `CHECK` constraints pass.
- Public visitors have **zero** `SELECT`, `UPDATE`, or `DELETE` access to `reservations` (protecting guest PII such as names, phone numbers, and emails).
- `js/supabase.js` actively rejects `service_role` and `sb_secret_` keys if accidentally configured.

### What Must Change Before Real-World Production Use
Because any direct browser-to-Supabase `INSERT` policy is publicly reachable by anyone with the public anon/publishable key:
1. **Server-Side Endpoint / Supabase Edge Function:** Move reservation creation behind a server-side API route or Supabase Edge Function so public clients cannot insert directly into the table.
2. **Rate Limiting & Bot Protection:** Add IP-based rate limiting (e.g., Upstash Redis or Cloudflare Turnstile / hCaptcha) on the server endpoint to prevent automated spam floods that bypass client-side honeypots and cooldowns.
3. **Real Table Inventory & Conflict Checking:** Check actual table capacity per time slot on the server and send transactional email/SMS verification links before confirming a booking.
4. **Verified Business Details:** Replace all placeholder Pune contact information, sample INR prices, and sample hours with verified real-world restaurant information.

---

## 14. Common Errors & Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **`menu.html` shows "Demonstration Mode" instead of "Live Database Connected"** | `js/supabase.js` still contains placeholder URL/key values. | Replace `https://your-project-ref.supabase.co` and `your-supabase-publishable-or-anon-key-here` in `js/supabase.js` with your real Supabase Project URL and Publishable Key. |
| **Reservation submission shows "new row violates row-level security policy" or "relation does not exist"** | `supabase/schema.sql` has not been executed in your Supabase project yet, or the date selected is earlier than the database server's `CURRENT_DATE`. | Run the entire `supabase/schema.sql` script in the Supabase SQL Editor and choose today or a future date. |
| **Client initialization blocked with Security Error in console** | You pasted a `service_role` or `sb_secret_...` key into `js/supabase.js`. | Replace it immediately with your public **Publishable** (`sb_publishable_...`) or **`anon` public** key from Supabase Project Settings → API. |
| **External Unsplash images fail to load on a restricted network** | Corporate firewall or offline mode blocking `images.unsplash.com`. | `js/main.js` automatically swaps any failed image to local SVG artwork in `assets/images/fallback-dish.svg` and `assets/images/fallback-editorial.svg`. |

---

## 15. Image Sources & Attribution

All external food and restaurant photographs used in this prototype are sourced from [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license), with automatic local SVG fallbacks (`assets/images/fallback-dish.svg` and `assets/images/fallback-editorial.svg`) if offline:

- Hero interior: `photo-1517248135467-4c7edcad34c4`
- Editorial dining room & table settings: `photo-1555396273-367ea4eb4db5`, `photo-1466978913421-dad2ebd01d17`, `photo-1559339352-11d035aa65de`
- Artisan sourdough & chef craft: `photo-1509440159596-0249088772ff`, `photo-1577219491135-ce391730fb2c`
- Starters, Mains, Pasta, Desserts & Beverages: `photo-1572695157366-5e585ab2b69f`, `photo-1565557623262-b51c2513a641`, `photo-1540420773420-3366772f4999`, `photo-1541529086526-db283c563270`, `photo-1519708227418-c8fd9a32b7a2`, `photo-1544025162-d76694265947`, `photo-1546069901-ba9599a7e63c`, `photo-1432139555190-58524dae6a55`, `photo-1555949258-eb67b1ef0ceb`, `photo-1563379926898-05f4575a45d8`, `photo-1551183053-bf91a1d81141`, `photo-1533134242443-d4fd215305ad`, `photo-1578985545062-69928b1d9587`, `photo-1551024709-8f23befc6f87`, `photo-1513558161293-cdaf765ed2fd`, `photo-1556679343-c7306c1976bc`, `photo-1495474472287-4d71bcdd2085`.
