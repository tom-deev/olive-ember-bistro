# Olive & Ember Bistro

> **“Good food. Slow moments. Lasting memories.”**

A complete, responsive, editorial-style restaurant website built with plain **HTML5**, **CSS3**, **Vanilla JavaScript (ES6+)**, and **Supabase (PostgreSQL + Authentication)**.

---

## 1. Project Overview

**Olive & Ember Bistro** is a fictional contemporary woodfire and seasonal kitchen set in Pune, Maharashtra, India. This project demonstrates how to build a warm, high-end independent restaurant website without frontend frameworks, featuring:

- **Brand Identity & Custom SVG Emblem (`assets/images/olive-ember-logo.svg`):** Minimalist olive branch and terracotta hearth flame emblem paired with `Cormorant Garamond` and `Plus Jakarta Sans` typography.
- **Public Editorial Pages (`index.html`, `menu.html`, `about.html`, `contact.html`):** Publicly accessible without login, including an interactive food menu filterable by category, keyword search, and a *Vegetarian Only* toggle with Indian Rupee (`INR`) formatting.
- **Customer Authentication (`login.html`, `signup.html`, `reset-password.html`):** Powered by **Supabase Auth** (email & password registration, persistent sessions, email verification support, and password recovery).
- **Protected Table Reservations (`reservation.html`):** Customers must be authenticated before submitting a reservation request. Each reservation is linked to the authenticated customer's `auth.uid()` (`user_id`) and protected by PostgreSQL Row Level Security (RLS).
- **Lightweight Customer Account Experience:** Signed-in customers see their first name in the navigation bar and can view their own existing reservation requests (date, time, party size, and status) on `reservation.html`.

---

## 2. Folder Structure

```text
olive-ember-bistro/
├── index.html                  # Homepage (Hero, Intro, Signatures, Experience, Testimonials, Hours)
├── menu.html                   # Public Interactive Food & Beverage Menu with filters & search
├── reservation.html            # Protected Table Reservation form + Customer's Reservation History
├── about.html                  # Restaurant story, culinary philosophy & fictional chef profile
├── contact.html                # Placeholder contact details, hours, map placeholder & UI demo form
├── login.html                  # Customer Sign-In page (Supabase Auth)
├── signup.html                 # Customer Registration page (Supabase Auth)
├── reset-password.html         # Password Recovery request & new password update page
├── css/
│   └── style.css               # Complete responsive stylesheet (desktop, tablet, mobile)
├── js/
│   ├── supabase.js             # Single shared Supabase client, Auth helpers & DB queries
│   ├── main.js                 # Mobile nav, auth nav state, protected links, image fallbacks
│   ├── auth.js                 # Login, Signup, Password Recovery & password toggle controllers
│   ├── menu.js                 # Menu rendering, category/search/veg filtering & fallback logic
│   └── reservation.js          # Protected reservation validation, insert & user history rendering
├── assets/
│   └── images/
│       ├── olive-ember-logo.svg   # Primary Olive & Ember vector emblem (olive branch + flame)
│       ├── favicon.svg            # Brand favicon consistent with the logo
│       ├── fallback-dish.svg      # Local SVG fallback for dish photography
│       └── fallback-editorial.svg # Local SVG fallback for interior/editorial photography
├── supabase/
│   ├── schema.sql              # Full PostgreSQL schema, RLS policies & seed data
│   └── migrations/
│       └── 20261027_auth_protected_reservations.sql # Migration for existing databases
├── .env.example                # Reference template for Supabase URL and Publishable Key
├── .gitignore                  # Prevents committing local environment/config secrets
└── README.md                   # Complete setup, Auth configuration, migration & testing guide
```

---

## 3. Technologies Used

- **HTML5:** Semantic landmarks, accessible form labels, and ARIA live regions.
- **CSS3:** Custom properties, CSS Grid and Flexbox layouts, fluid `clamp()` typography, visible `:focus-visible` outlines, and `@media (prefers-reduced-motion: reduce)` support.
- **Vanilla JavaScript (ES6+):** Modular IIFE closures, `async/await` Supabase Auth & PostgreSQL calls, safe DOM construction (`document.createElement` / `textContent`), and `Intl.NumberFormat('en-IN')` currency formatting.
- **Supabase (`@supabase/supabase-js` v2.49.1):** Loaded via pinned jsDelivr CDN for Email/Password Authentication and PostgreSQL queries protected by Row Level Security (RLS).
- **Static Hosting:** Ready for zero-config static deployment on **Vercel**.

---

## 4. How to Open & Run Locally

### Open in VS Code
1. Open **Visual Studio Code**.
2. Click **File → Open Folder…** and select the `olive-ember-bistro` directory.

### Run Using a Local Development Server
Always run the site through a local HTTP server so browser navigation and Supabase Auth redirects work properly:

- **Option A — VS Code Live Server:** Right-click `index.html` and select **Open with Live Server** (typically `http://127.0.0.1:5500`).
- **Option B — Node.js / Python CLI:**
  ```bash
  npx serve -l 3000 .
  # OR
  python -m http.server 3000
  ```
  Then open `http://localhost:3000`.

---

## 5. Database Setup & SQL Migration Instructions

### Case A: Fresh Supabase Project
1. In your Supabase Dashboard, open **SQL Editor → + New query**.
2. Copy and paste the entire contents of `supabase/schema.sql` and click **Run**.

### Case B: Updating an Existing Database (Migration Required)
If you previously ran the initial version of `supabase/schema.sql`, you **must manually run the migration** to add customer ownership (`user_id`) and update the Row Level Security policies:

1. Open your **Supabase Dashboard → SQL Editor → + New query**.
2. Open `supabase/migrations/20261027_auth_protected_reservations.sql` in VS Code, copy its entire contents, and paste it into the SQL Editor.
3. Click **Run**.

#### What `20261027_auth_protected_reservations.sql` Changes:
- Safely adds `user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL` to `public.reservations` (nullable at the table level so any pre-existing reservation rows are preserved without breaking).
- Creates index `idx_reservations_user_id_created_at` on `(user_id, created_at DESC)`.
- Drops the old permissive public insert policy (`"Public visitors can submit pending reservation requests"`) and revokes `anon` table privileges on `public.reservations`.
- Creates two strict RLS policies for the `authenticated` role:
  - **INSERT Policy:** Authenticated users can only insert `pending` reservations where `user_id = auth.uid()`.
  - **SELECT Policy:** Authenticated users can only read rows where `user_id = auth.uid()`.
- Leaves `public.menu_items` and public menu browsing completely untouched.

---

## 6. Supabase Dashboard Authentication Configuration

To enable registration, sign-in, email verification, and password recovery, configure the following settings in your **Supabase Dashboard**:

### A. Project URL & Publishable Key (`js/supabase.js`)
1. Go to **Project Settings (gear icon) → API**.
2. Copy your **Project URL** (`https://<project-ref>.supabase.co`) and **Publishable key** (`sb_publishable_...` or legacy `anon` `public` key).
   - > **CRITICAL SECURITY RULE:** Never expose your `service_role` or `sb_secret_...` key in browser files!
3. Update `FALLBACK_CONFIG` in `js/supabase.js` (or provide `window.OLIVE_EMBER_CONFIG` via an untracked `js/config.local.js` file).

### B. Authentication Site URL & Allowed Redirect URLs
1. In the Supabase Dashboard, go to **Authentication → URL Configuration**.
2. Set **Site URL** to your primary deployment URL:
   - Production: `https://olive-ember-bistro.vercel.app`
   - Local development: `http://localhost:3000` (or `http://127.0.0.1:5500`)
3. Under **Redirect URLs**, add both your production and local development URLs so email verification and password reset links are permitted by Supabase:
   - `https://olive-ember-bistro.vercel.app/**`
   - `https://olive-ember-bistro.vercel.app/reservation.html`
   - `https://olive-ember-bistro.vercel.app/reset-password.html`
   - `http://localhost:3000/**`
   - `http://127.0.0.1:5500/**`
4. Click **Save**.

### C. Email Provider & Email Verification Settings
1. Go to **Authentication → Providers → Email**.
2. Ensure **Enable Email provider** is turned **ON**.
3. **Confirm email toggle:**
   - **When ON (Recommended for Production):** New signups on `signup.html` receive a confirmation link via email. `signup.html` detects that no active session was issued yet, instructs the customer to verify their email before booking, and prevents reservation submission until verified.
   - **When OFF (Convenient for Quick Local Testing):** `signup.html` receives an active session immediately upon registration and redirects the customer straight to `reservation.html`.
4. **SMTP / Email Delivery Note:** Supabase's default built-in email service is intended only for development and has a strict hourly rate limit. For reliable delivery of verification and password-reset emails in production, configure a custom SMTP provider (e.g., Resend, Postmark, SendGrid, or AWS SES) under **Project Settings → Authentication → SMTP Settings**.

---

## 7. How to Test the Authentication & Protected Reservation Flow

1. **Public Browsing & Logo Check:**
   - Open `index.html`, `menu.html`, `about.html`, and `contact.html` while logged out.
   - Verify the new Olive & Ember SVG logo displays in the header and that `Login` and `Sign Up` links appear next to `Book a Table`.
2. **Unauthenticated Reservation Redirect:**
   - While logged out, click **Book a Table** in the navigation bar or **Reserve Your Table** on the homepage.
   - Verify you are redirected to `login.html?redirect=reservation.html`.
3. **Account Registration (`signup.html`):**
   - Click **Create an Account** on the login page.
   - Test validation by submitting empty fields, an invalid email, a password under 8 characters, or mismatched passwords.
   - Register with a valid name, email, and 8+ character password.
   - If email verification is enabled in Supabase, verify the confirmation message appears and check your inbox. If disabled, verify you are signed in and redirected to `reservation.html`.
4. **Sign In & Navigation State (`login.html`):**
   - Sign in with your registered email and password.
   - Verify the navigation bar updates to show your first name (e.g., `Priya`) and a `Logout` button, and redirects you to `reservation.html`.
5. **Protected Reservation Submission (`reservation.html`):**
   - Complete the reservation form and click **Submit Reservation Request**.
   - Verify the request is saved in `public.reservations` with your authenticated `user_id` (`auth.uid()`) and status `pending`, and immediately appears in the **Your Reservation Requests** section on `reservation.html`.
6. **Password Recovery (`reset-password.html`):**
   - Click **Forgot Password?** on `login.html`, enter your email, and click **Send Reset Link**.
   - Follow the recovery link from your email back to `reset-password.html`, enter a new 8+ character password, and confirm it updates your password.
7. **Logout:**
   - Click **Logout** in the navigation bar. Verify your session is cleared and the navigation returns to showing `Login` and `Sign Up`.

---

## 8. Deploying Updates on Vercel

Remember that static browser JavaScript files do not automatically read Vercel environment variables at runtime unless injected during a build command:

- **Option 1:** Configure your public `supabaseUrl` and public `supabasePublishableKey` (never the secret key) in `js/supabase.js`.
- **Option 2 (Vercel Build Command):** Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in **Vercel Project Settings → Environment Variables**, and set the **Build Command** to:
  ```bash
  sed -i "s|https://your-project-ref.supabase.co|$SUPABASE_URL|g" js/supabase.js && sed -i "s|your-supabase-publishable-or-anon-key-here|$SUPABASE_PUBLISHABLE_KEY|g" js/supabase.js
  ```

---

## 9. Security Architecture & Limitations

- **Mandatory Row Level Security (RLS):** Even if someone bypasses frontend checks, PostgreSQL RLS on `public.reservations` rejects any `INSERT` where `auth.uid() IS NULL` or `user_id <> auth.uid()`, and restricts `SELECT` strictly to `user_id = auth.uid()`.
- **Untrusted Client Metadata:** Customer `full_name` stored in `user_metadata` is used strictly for greeting display in the UI and never for authorization.
- **Open-Redirect Protection:** `OliveEmberAuth.getSafeRedirectPath()` whitelists only local project pages (`reservation.html`, `index.html`, `menu.html`, `about.html`, `contact.html`) and rejects any external domain or protocol-relative URL.
- **Production Hardening:** Before commercial use with a real restaurant, add a server-side endpoint or Supabase Edge Function with IP rate limiting / CAPTCHA (e.g., Cloudflare Turnstile) and real-time table capacity conflict checks.
