# Vincit qui se vincit
*He conquers who conquers himself*

A full-featured vendor/lead management dashboard for IT Staffing.

## Features
- 🏢 50 pre-loaded vendor contacts
- 📊 Stats cards (emails sent, calls done, resumes sent)
- 🔍 Search + filter by status
- 📧 Email templates panel (save & copy frequently used emails)
- 📝 Thoughts/notes widget (supports Hindi too!)
- ✅ Per-vendor status tracking: Email Sent, Follow-Up, Call Done, Resume Role
- 💾 All data saved in localStorage (persists across sessions)
- 📤 Export data as JSON backup

## Deploy to Railway

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo → Railway auto-detects and deploys
4. Your dashboard is live on a public URL!

## Local Development

```bash
npm install
npm start
```

## Data Persistence
All vendor data, email templates, and notes are saved in your browser's localStorage.
Use the Export button to back up data as JSON.
