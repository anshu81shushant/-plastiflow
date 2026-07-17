# PlastiFlow — order tracker

A Next.js + Supabase app for tracking plastic moulding orders: dashboard, all orders, add order (with photo upload), and remaining orders with progress. Google sign-in required.

## What you need before starting

- VS Code (you have this)
- Node.js (you have this)
- A free Supabase account
- A free Google Cloud account (only to enable "Sign in with Google" — takes 5 minutes)

---

## Part 1 — Create your Supabase project

1. Go to https://supabase.com and sign up / log in.
2. Click **New project**.
3. Pick an organization, name the project `plastiflow` (or anything), set a database password (save it somewhere), pick a region close to you, click **Create new project**. Wait ~2 minutes for it to spin up.
4. Once it's ready, go to **Project Settings** (gear icon, bottom left) → **API**.
5. Copy two values, you'll need them soon:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

## Part 2 — Create the database table

1. In the Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file `supabase-setup.sql` (included in this project folder), copy all of it, and paste it into the SQL editor.
4. Click **Run** (bottom right). You should see "Success. No rows returned."

This creates:
- An `orders` table with all your order fields
- Row-level security so only signed-in users can read/write orders
- A public storage bucket called `order-photos` for item images

## Part 3 — Enable Google sign-in

1. In Supabase, go to **Authentication** → **Providers** in the left sidebar.
2. Find **Google** in the list and click it to expand.
3. Toggle **Enable sign in with Google** on.
4. You now need a Google Client ID and Secret. Keep this tab open and open a new tab:
   - Go to https://console.cloud.google.com/apis/credentials
   - Create a new project (top left dropdown → New Project) if you don't have one, name it `PlastiFlow`.
   - Click **Create Credentials** → **OAuth client ID**.
   - If prompted, configure the **OAuth consent screen** first: choose **External**, fill in app name (`PlastiFlow`), your email for support and developer contact, save through the steps (you can skip scopes/test users, just click through).
   - Back on **Create OAuth client ID**: Application type = **Web application**. Name it anything.
   - Under **Authorized redirect URIs**, add the callback URL shown in your Supabase Google provider settings (it looks like `https://xxxxx.supabase.co/auth/v1/callback`) — copy it exactly from Supabase.
   - Click **Create**. Copy the **Client ID** and **Client Secret** shown.
5. Back in Supabase's Google provider settings, paste the **Client ID** and **Client Secret**, then click **Save**.

## Part 4 — Set up the project in VS Code

1. Unzip the project folder you downloaded and open it in VS Code (`File` → `Open Folder`).
2. Open the built-in terminal (`` Ctrl+` `` or `View` → `Terminal`).
3. Install dependencies:
   ```
   npm install
   ```
4. Create your local environment file: duplicate `.env.local.example` and rename the copy to `.env.local`. In VS Code you can right-click `.env.local.example` → Copy, then paste and rename.
5. Open `.env.local` and fill in the values from Part 1, step 5:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
6. Save the file.

## Part 5 — Run it

In the VS Code terminal:
```
npm run dev
```

Open your browser to **http://localhost:3000**. You should land on the login page — click **Continue with Google** to sign in, and you'll be dropped onto the dashboard.

Try adding an order from **Add Order**, then check **All Orders** and **Remaining** to see it reflected.

---

## Project structure (for reference)

```
app/
  dashboard/       Dashboard page (stats, urgent orders, recent orders)
  orders/          All Orders page (search, filter, edit, delete)
  orders/new/      Add Order form
  orders/[id]/edit/  Edit Order form
  remaining/       Remaining Orders with progress bars
  login/           Google sign-in page
  auth/callback/   OAuth redirect handler
components/
  Sidebar.js       Left navigation
  AppShell.js       Wraps pages with the sidebar
  OrderForm.js      Shared form used by Add and Edit
  OrdersList.js      All Orders list with client-side search/filter
lib/
  supabase-browser.js   Supabase client for the browser
  supabase-server.js     Supabase client for server components
  orders.js               Shared helpers (status colors, date math)
middleware.js       Redirects signed-out users to /login
supabase-setup.sql  Run this once in Supabase's SQL editor
```

## Deploying so your team can use it (later)

The easiest option is **Vercel** (made by the creators of Next.js, free tier is enough):
1. Push this project to a GitHub repo.
2. Go to https://vercel.com, sign up, click **Add New Project**, import your repo.
3. Add the same two environment variables from `.env.local` in Vercel's project settings.
4. Deploy. You'll get a live URL to share with your team.

One extra step for Google login to work on the live URL: go back to Google Cloud Console → your OAuth client → add your Vercel URL's Supabase callback as an authorized redirect URI (same one as before — it doesn't change per-domain since Supabase handles the callback).

## Notes

- All signed-in users currently share the same order list (good for a small team seeing the same orders). If you later want each user to only see their own orders, there's a commented-out alternate policy at the bottom of `supabase-setup.sql`.
- Photos are stored in Supabase Storage's `order-photos` bucket and are publicly viewable via URL (not publicly listed/browsable, but anyone with a direct photo link could view it). That's normal for this kind of app.
- **Voice-fill (free, no API cost)**: click "Fill by voice" on the Add/Edit Order form and speak in a structured order, using cue words: "customer Rajesh Traders, item plastic hanger, quantity 5000, due date 20 July, material HDPE, grams 15, price 50000, notes handle with care" — then tap Stop. It's all parsed locally in the browser, no external service, no per-use cost. Because it's free rule-based matching rather than AI, it needs cue words said in that structure — loose conversational phrasing won't parse as reliably. Always review the filled fields before saving. Works in Chrome and Edge; Safari's speech support is limited.
- **Click any item photo** (in Add/Edit Order preview or in the All Orders list) to view it full-screen. Press Escape or click outside to close.
- **Raw materials & reorder alerts**: run `supabase-migration-2-materials.sql` in Supabase's SQL editor (after the main `supabase-setup.sql`) to enable the Materials page, stock tracking, and reorder warnings.
- **Daily production logging**: run `supabase-migration-3-production.sql` in Supabase's SQL editor (after the other two migrations) to enable production tracking. On each order's Edit page, log units produced each day — it shows a completion dial, and if the order has a material + grams-per-unit set, it automatically deducts that material's stock. Deletions don't restore deducted stock automatically, so double-check before removing an entry.
- **Redesigned UI**: the whole app now uses a mobile-first industrial design — dark graphite navigation, safety-orange accent, a bottom tab bar on phones (sidebar returns on desktop). Run all three SQL migrations in order for every feature to work correctly.
- **Visual refresh (latest pass)**: new type system — Space Grotesk for headings, Inter for body text, JetBrains Mono for every number (stat counts, quantities, batch figures) so data reads like a machine readout. Warm "raw-material paper" background instead of plain white, a two-tone molten-amber / quality-teal accent pair, a heater-coil gradient line on the nav, subtle rise-in animation on dashboard stat cards, and a pulsing live-dot on the "In Progress" stat when something's actively running. All animation respects `prefers-reduced-motion`.
- **Auto-save on production log**: type units produced and it saves automatically about a second after you stop typing — no save button. A small status label ("Typing…", "Saving…", "✓ Saved") shows what's happening.
- **First-time setup guide**: when the dashboard is completely empty (no orders yet), a "Quick start" card walks a new user through adding their first material and first order. It only shows once — dismissing or completing it hides it for good (stored per-device, not per-account, so it'll reappear if someone opens the app on a new phone).
- **Floating add button**: on Dashboard, All Orders, Remaining, and Materials, a round + button stays fixed in the corner while scrolling, so adding something is always one tap away — especially useful on long lists on mobile.
- **Machines**: track your induction moulding machines, log hourly production per machine, log downtime with reasons, and see a 7-day output chart per machine. Run `supabase-migration-4-machines.sql` for this.
- **Scan to fill (demo)**: visit `/scan-demo` on your live site to try scanning a Purchase Order or supplier bill — photo **or PDF** — it reads the document with free, in-browser text recognition (no API key, no cost) and extracts customer name, item, quantity, due date, and more (or material name, quantity, price for bills). A sample test PO image (`sample_po_for_testing.png`) is included in this zip so you can try it immediately. This is a demo page only right now — it shows what got extracted but doesn't save anywhere yet. **Important honesty note**: this works well on clean, printed, well-formatted documents (verified against real tests), but accuracy drops noticeably on handwriting, blurry photos, or unusual layouts, since it's pattern-matching on text rather than truly understanding the document. For multi-page PDFs, only the first page is read. Always review before saving — a "show raw text" toggle lets you see exactly what was read, in case a field needs manual correction. If you want higher accuracy later (at a small per-scan cost), this could be swapped for AI-based document understanding instead of free OCR.
- **Machines (per-hour production + downtime)**: run `supabase-migration-4-machines.sql` in Supabase's SQL editor to enable this. Add your machines (e.g. "Machine 1" through "Machine 7"), then log hourly output per machine — units produced, which hour, optionally linked to an order. Log downtime with a reason (mold change, breakdown, no material, etc.) and mark it resolved when the machine's running again. Each machine's page shows a 7-day output chart and total downtime for the week. Reachable from the sidebar (desktop) or bottom tab bar (mobile, replacing the old "Add" tab since the floating + button already covers that).

## Installing as a mobile app (PWA)

PlastiFlow is a Progressive Web App — no app store needed, completely free.

**On Android (Chrome):** open the live site, a small "Install PlastiFlow" banner appears at the bottom — tap **Install**. Or tap the ⋮ menu → **Add to Home screen**.

**On iPhone (Safari):** open the live site, tap the Share icon (square with an arrow), scroll down and tap **Add to Home Screen**. iOS doesn't support the automatic install banner — this manual step is required by Apple, not something the app can prompt for.

Once installed, it opens full-screen with its own icon, no browser bar — feels like a native app. It also caches recently visited pages, so orders you've already loaded stay viewable with a spotty connection.

**Note:** this only works once the app is deployed to a live HTTPS URL (like your Vercel deployment) — it won't install from `localhost` during local development.
