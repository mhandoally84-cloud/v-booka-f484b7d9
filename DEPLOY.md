# Deployment Guide

Your app is a **TanStack Start** full-stack app. It needs a host that runs a Node/Edge server — **GitHub Pages will not work** (it only serves static files).

Recommended hosts (all free tier available):
- **Vercel** (easiest — auto-detects TanStack Start)
- **Netlify**
- **Cloudflare Pages/Workers**
- **Lovable Hosting** (already live at your `.lovable.app` URL — no setup needed)

---

## Option 1: Deploy to Vercel (recommended)

### Step 1 — Push your code to GitHub
Make sure your repo is on GitHub (public or private — Vercel supports both on the free plan).

### Step 2 — Import the repo on Vercel
1. Go to https://vercel.com/new
2. Sign in with GitHub and click **Import** on your repo.
3. Vercel auto-detects the framework. Leave the defaults:
   - **Framework Preset:** TanStack Start (or "Other" — the config in `vercel.json` handles it)
   - **Build Command:** `bun run build`
   - **Output Directory:** `.output/public`
   - **Install Command:** `bun install`

### Step 3 — Add environment variables
In the Vercel import screen (or later under **Project Settings → Environment Variables**), add:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | copy from your local `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | copy from your local `.env` |
| `VITE_SUPABASE_PROJECT_ID` | copy from your local `.env` |

Apply them to **Production**, **Preview**, and **Development**.

### Step 4 — Deploy
Click **Deploy**. First build takes ~2 minutes. You'll get a URL like `your-app.vercel.app`.

Every future `git push` to your main branch auto-deploys.

---

## Option 2: Deploy to Netlify

1. Go to https://app.netlify.com/start
2. Connect GitHub and pick your repo.
3. Build settings:
   - **Build command:** `bun run build`
   - **Publish directory:** `.output/public`
4. Add the same env vars as above under **Site settings → Environment variables**.
5. Click **Deploy**.

---

## Option 3: Keep using Lovable Hosting

Your site is already live at your `.lovable.app` URL. No extra work required. You can also connect a custom domain from **Project settings → Domains** inside Lovable.

---

## Why not GitHub Pages?

GitHub Pages serves only static HTML/CSS/JS. This app has:
- Server functions (`createServerFn`) for database calls
- Server-side auth middleware
- SSR rendering

None of that can run on GitHub Pages. Use Vercel, Netlify, Cloudflare, or Lovable Hosting instead.
