# Quick Start: Deploy to Railway

## ✅ What's Already Done

- ✅ Express server configured (`server.js`)
- ✅ Build script updated
- ✅ Railway configuration file created
- ✅ Environment variable template created

## 🚀 Deploy in 5 Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 2. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub

### 3. Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your `TMS-FINAL` repository

### 4. Add Environment Variables
In Railway dashboard → Variables tab, add:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Get these from: https://supabase.com/dashboard/project/_/settings/api

### 5. Deploy!
- Railway will auto-detect and start building
- Wait 2-5 minutes
- Get your URL from Settings → Networking

## 🔧 Update Supabase Redirect URLs

After deployment, add your Railway URL to Supabase:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to "Redirect URLs":
   - `https://your-app.up.railway.app`
   - `https://your-app.up.railway.app/**`
3. Set "Site URL" to: `https://your-app.up.railway.app`

## 📝 Notes

- Build command: `npm run build`
- Start command: `npm start`
- Port: Railway sets `PORT` automatically
- The app will auto-redeploy when you push to GitHub

## 🐛 Troubleshooting

**Build fails?**
- Check Railway build logs
- Ensure all files are committed

**Blank page?**
- Check browser console
- Verify Supabase environment variables
- Check Supabase redirect URLs

**404 on refresh?**
- The Express server handles this automatically

## 📚 Full Guide

See `RAILWAY_DEPLOYMENT.md` for detailed instructions.
