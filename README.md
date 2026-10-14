# Seminar Report Generator — Muthayammal Engineering College

An AI-powered web application and serverless backend for **Muthayammal Engineering College (Autonomous)** that drafts complete technical seminar reports and exports them as downloadable Microsoft Word (`.doc`) files and **exact 3-page PDF documents** matching the college's official COE/IQAC document specifications.

---

## 🎯 Key Features

- **Exact 3-Page PDF Generation**: Direct in-browser multi-page PDF generation via `html2pdf.js` with calibrated A4 print stylesheets (`@media print`) guaranteeing **exactly 3 pages with zero blank pages** and full content integrity.
- **Dual Payment & Access Engine**:
  - **Option 1 — Razorpay (₹5)**: Standard Razorpay checkout with dynamic UPI QR code scanning (Google Pay, PhonePe, Paytm, BHIM) and Cards/NetBanking.
  - **Option 2 — Coupon Code**: Server-side validated single-use coupon authorization (`Kesavan@2007#9042`) waiving the ₹5 fee.
- **Dynamic Topic-Specific Vector Diagrams**: 14 distinct SVG architectural renderers (Process Flow, Layered Architecture, Network Mesh, Feedback Loop, Threat Mitigation Matrix, Ecosystem, IPO, etc.) with real-time color theme and layout switching.
- **Live In-Browser Word Editor**: Live WYSIWYG editing of Page 1, Page 2, and Page 3 with instant .doc and .pdf re-export.
- **Universal Multi-Cloud Serverless**: Native deployment support for **Vercel** (`/api`), **Netlify** (`/netlify/functions`), and local Node.js.

---

## 🚀 Deployment to Vercel (1-Click & Recommended)

### Method 1: Deploy with Vercel Web Dashboard (Easiest)

1. Push this project repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Open your [Vercel Dashboard](https://vercel.com/new) and click **"Add New Project"** &rarr; **"Import"**.
3. Select your repository.
4. In the **Configure Project** screen:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./`
   - **Build Command**: Leave blank (or `node build-assets.js`)
   - **Output Directory**: Leave blank (root directory serves static assets)
5. Expand **Environment Variables** and add the following keys:

| Variable Name | Value / Description | Required? |
| :--- | :--- | :--- |
| `GOOGLE_API_KEY` | Your Google Gemini API Key | **Required** (for AI Generation) |
| `RAZORPAY_KEY_ID` | `rzp_test_TUM66pq8EwVYrx` (or your Live Key) | **Required** |
| `RAZORPAY_KEY_SECRET` | `ttWWjnEF3RUgW1VIrSnEhXJd` (or your Live Secret) | **Required** |
| `VALID_COUPON_CODE` | `Kesavan@2007#9042` | **Required** (Default) |
| `PAYMENT_ENFORCEMENT` | `true` | **Required** |
| `LLM_PROVIDER` | `google` | Optional |

6. Click **Deploy**. Vercel will automatically build the site and deploy all serverless functions in `/api`.

---

### Method 2: Deploy with Vercel CLI

```bash
# 1. Install Vercel CLI globally
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to production
vercel --prod
```

When prompted:
- Set up and deploy: `Y`
- Which scope: Select your account
- Link to existing project: `N`
- Project name: `seminar-report-generator`
- In which directory is your code located: `./`

---

## ⚡ Local Development

Run the hardened local server:

```bash
# Start local dev server at http://localhost:3000
npm start
# or
node dev-server.js
```

Run test suites:

```bash
# Run 100% verified test suites (generator + security + Vercel handlers)
npm test
```

---

## 📄 Document Format Compliance Checklist

- [x] Header code: `MEC/IQAC/2026-27/COE/136` (top right, bold)
- [x] Body Font: Times New Roman, 12pt throughout
- [x] Section headings: `N. HEADING` (number, period, single space, bold uppercase)
- [x] Section 1 (Abstract): 1 paragraph, justified, 5–6 sentences
- [x] Section 2 (Introduction): 1 paragraph, justified, 7–8 sentences, `0.046in` extra left indent
- [x] Section 3 (Theme of the Seminar): 2 paragraphs + centered PNG diagram + Figure caption
- [x] Section 4 (Applications): Intro sentence + 4 topic-specific domain items + closing sentence
- [x] Section 5 (Conclusion): 1 paragraph, justified, 3–4 sentences
- [x] Section 6 (References): 4 items mixing italicized books and institutional whitepapers
- [x] Page 3: Official College Letterhead Banner + `SEMINAR PRESENTATION`
- [x] Page 3: 9-row details table + Evaluation table (5 marks categories) + 3 Signatures + Presentation Notes
- [x] Exact 3-page PDF export with zero blank pages and no content truncation
