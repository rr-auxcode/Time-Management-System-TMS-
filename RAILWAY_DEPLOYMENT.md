# Railway Deployment Guide

This guide will walk you through deploying your TMS application to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. A GitHub account (if you want to use GitHub integration)
3. Your Supabase project URL and anon key

## Step-by-Step Deployment

### Step 1: Prepare Your Code

1. Make sure all your changes are committed to Git:
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   ```

2. Push to GitHub (if not already done):
   ```bash
   git push origin main
   ```

### Step 2: Create Railway Project

1. Go to https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo" (recommended) or "Empty Project"
4. If using GitHub:
   - Authorize Railway to access your GitHub
   - Select your repository: `TMS-FINAL`
   - Railway will automatically detect it's a Node.js project

### Step 3: Configure Environment Variables

1. In your Railway project dashboard, go to the "Variables" tab
2. Add the following environment variables:

   ```
   VITE_SUPABASE_URL=your_actual_supabase_url
   VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
   ```

   **Important**: Replace with your actual Supabase credentials from:
   https://supabase.com/dashboard/project/_/settings/api

3. Railway will automatically set `PORT` - you don't need to add it manually

### Step 4: Configure Build Settings

Railway should auto-detect your build settings, but verify:

1. Go to your service settings
2. Under "Build Command", it should be: `npm run build`
3. Under "Start Command", it should be: `npm start`
4. Under "Root Directory", leave it as `/` (root)

### Step 5: Deploy

1. Railway will automatically start building and deploying
2. Watch the build logs in the "Deployments" tab
3. Wait for the build to complete (usually 2-5 minutes)

### Step 6: Get Your Public URL

1. Once deployed, Railway will provide a public URL
2. Go to the "Settings" tab → "Networking"
3. Click "Generate Domain" to get a permanent URL like: `your-app-name.up.railway.app`
4. (Optional) You can add a custom domain in the same section

### Step 7: Update Supabase Redirect URLs

1. Go to your Supabase dashboard
2. Navigate to: Authentication → URL Configuration
3. Add your Railway URL to "Redirect URLs":
   - `https://your-app-name.up.railway.app`
   - `https://your-app-name.up.railway.app/**`
4. Add to "Site URL": `https://your-app-name.up.railway.app`
5. Save changes

### Step 8: Test Your Deployment

1. Visit your Railway URL
2. Test login functionality
3. Verify all features work correctly

## Troubleshooting

### Build Fails

- Check the build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Railway uses Node 18+ by default)

### Environment Variables Not Working

- Make sure variables start with `VITE_` prefix
- Redeploy after adding/changing variables
- Check that variables are set in the correct service

### App Shows Blank Page

- Check browser console for errors
- Verify Supabase credentials are correct
- Ensure redirect URLs are configured in Supabase

### 404 Errors on Refresh

- This is handled by the Express server in `server.js`
- If issues persist, check that `server.js` is being used

## Updating Your App

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin main
   ```
3. Railway will automatically detect the push and redeploy

## Database Migrations

Your Supabase migrations are already in the database. No additional steps needed for Railway deployment.

## Cost

Railway offers:
- Free tier: $5 credit/month
- Hobby plan: $5/month for more resources
- Your app should run fine on the free tier for development/testing

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
