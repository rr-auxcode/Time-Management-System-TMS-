# Database Migration Instructions

## ✅ Step 1: Environment Variables (DONE!)
Your `.env` file has been configured with:
- ✅ Supabase URL: https://ukstmlpaddigdomufotl.supabase.co
- ✅ Supabase Anon Key: (configured)

## 📋 Step 2: Run Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/ukstmlpaddigdomufotl

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Copy and Paste the Migration SQL**
   - Open the file: `supabase/migrations/001_initial_schema.sql`
   - Copy ALL the contents (Ctrl+C / Cmd+C)
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - You should see: "Success. No rows returned"

5. **Verify Tables Were Created**
   - Go to "Table Editor" in the left sidebar
   - You should see two tables: `projects` and `tasks`

### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:
```bash
supabase db push
```

## 🔐 Step 3: Configure Google OAuth

1. **Go to Authentication → Providers**
   - In your Supabase dashboard
   - Click "Authentication" → "Providers"

2. **Enable Google Provider**
   - Find "Google" in the list
   - Toggle it ON

3. **Enter Your Google Credentials**
   - **Client ID**: `692169435833-5eeu6vjrt9h6i4oj7hmv1lmsiqb6ar81.apps.googleusercontent.com`
   - **Client Secret**: 
     - Go to: https://console.cloud.google.com/apis/credentials
     - Find your OAuth 2.0 Client ID
     - Copy the "Client secret"
     - Paste it in Supabase

4. **Add Redirect URL**
   - In the Google provider settings, add:
   - `https://ukstmlpaddigdomufotl.supabase.co/auth/v1/callback`
   - Click "Save"

5. **Also add to Google Cloud Console**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Edit your OAuth 2.0 Client ID
   - Under "Authorized redirect URIs", add:
   - `https://ukstmlpaddigdomufotl.supabase.co/auth/v1/callback`
   - Click "Save"

## ✅ Step 4: Test the Application

1. **Restart your dev server** (if running):
   ```bash
   npm run dev
   ```

2. **Open the app** in your browser

3. **Click "Sign in with Google"**
   - Complete the OAuth flow
   - You should be redirected back to the app

4. **Check Data Migration**
   - If you had data in localStorage, it should automatically migrate
   - Check the browser console for migration messages

5. **Create a Test Project**
   - Click "+ New Project"
   - Fill in the details
   - Click "Create Project"
   - The project should save to Supabase!

## 🐛 Troubleshooting

### "Failed to load projects"
- Check that you ran the SQL migration
- Verify tables exist in Table Editor
- Check browser console for errors

### "Authentication failed"
- Verify Google OAuth is enabled in Supabase
- Check redirect URLs match exactly
- Ensure Google Client Secret is correct

### "Migration failed"
- Check browser console for specific error
- Verify you're authenticated before migration runs
- Old localStorage data is backed up as `tms-projects-backup`

## 📊 Verify Everything Works

After migration, check:
- ✅ Tables created: `projects` and `tasks`
- ✅ Can create a new project
- ✅ Can create a new task
- ✅ Data persists after page refresh
- ✅ Can sign in with Google
- ✅ Old localStorage data migrated

## 🎉 You're Done!

Your Time Management System is now powered by Supabase PostgreSQL!

