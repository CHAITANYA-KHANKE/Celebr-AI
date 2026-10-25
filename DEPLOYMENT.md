# CelebrAI — Deployment Guide

## Vercel Deployment (Full-Stack Monorepo)

CelebrAI is configured for seamless full-stack deployment on **Vercel** with zero extra build steps:
- **Frontend:** React + TypeScript + Vite (`dist/` output)
- **Backend API:** FastAPI running as a Vercel Serverless Python function via `api/index.py`
- **Routing:** Handled automatically by [`vercel.json`](file:///c:/Users/chait/Documents/bc/celerai/vercel.json) (all `/api/*` routes forwarded to FastAPI, all other routes served by Vite).

---

### Step 1: Connect GitHub Repository to Vercel
1. Go to [https://vercel.com/new](https://vercel.com/new).
2. Under "Import Git Repository", select **`CHAITANYA-KHANKE/Celebr-AI`**.
3. Choose project name (e.g. `celebr-ai`).

---

### Step 2: Project Build & Output Settings
Vercel will automatically detect `vercel.json` and `vite`. Verify the settings:
- **Framework Preset:** Vite
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

---

### Step 3: Environment Variables on Vercel
In the Vercel Dashboard project creation screen, open **"Environment Variables"** and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `your_gemini_api_key` | Server-side Gemini API key for live AI plan generation |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Target Google Gemini model |
| `DATABASE_URL` | *(Optional)* | PostgreSQL URL (e.g. Supabase / Neon). If omitted, falls back to `/tmp/celebrai.db` |
| `CORS_ORIGINS` | `*` or `https://your-app.vercel.app` | Allowed CORS origins for browser fetch |

> [!IMPORTANT]
> Do NOT prefix backend secrets with `VITE_`. Vercel serverless Python functions read standard environment variables (like `GEMINI_API_KEY`), keeping your credentials 100% secure from client browser bundles.

---

### Step 4: Click "Deploy"
1. Click **Deploy**.
2. Vercel will install dependencies from `package.json` and `requirements.txt`, run `npm run build`, and provision the Python serverless function.
3. Once finished, Vercel gives you your live production URL: `https://celebr-ai.vercel.app` (or similar).

---

## Verifying Deployment
- **Frontend:** Open `https://your-deployment.vercel.app/` — verify the landing page and "Create event plan" wizard.
- **Backend Health:** Open `https://your-deployment.vercel.app/api/health` — should return `{"status":"ok","mode":"ai"}`.
- **Live AI Generation:** Complete the 4-step wizard with explicit consent and generate a plan — verify AI recommendations and custom themes generate live!

