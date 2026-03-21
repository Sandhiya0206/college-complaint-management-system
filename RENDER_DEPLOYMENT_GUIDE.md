# 🚀 Render Deployment Guide - Full Stack Setup

Complete step-by-step guide to deploy your College Complaint Management System to Render + Vercel + MongoDB Atlas.

---

## 📋 Prerequisites

- ✅ GitHub account with your repo pushed
- ✅ Render account (free tier available)
- ✅ Vercel account (free tier available)
- ✅ MongoDB Atlas account (free tier: 512MB)
- ✅ Groq API key (optional but recommended)

---

## Phase 1: Set Up MongoDB Atlas Cloud Database

### Step 1: Create MongoDB Atlas Account
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Try Free"**
3. Sign up with your email
4. Create organization & project

### Step 2: Create a Free Cluster
1. On the **Clusters** dashboard, click **"Create"**
2. Select **M0 (Free tier)**
3. Choose region close to your location (e.g., **Mumbai** for India)
4. Click **"Create Cluster"** → Wait 2-3 minutes

### Step 3: Get Connection String
1. In your cluster, click **"Connect"**
2. Choose **"Drivers"** (not Shell)
3. Copy the connection string (looks like):
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
   ```
4. **Replace:**
   - `username` → your MongoDB username
   - `password` → your MongoDB password
   - `myFirstDatabase` → `complaint_db`

**Example:**
```
mongodb+srv://admin:MySecurePass123@cluster0.abc123.mongodb.net/complaint_db?retryWrites=true&w=majority
```

✅ **Save this connection string** — you'll need it for Render

---

## Phase 2: Deploy Backend to Render

### Step 1: Create Render Web Service
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (easier for deployments)
3. Click **"New +"** → **"Web Service"**
4. Select your GitHub repository
5. Click **"Connect"**

### Step 2: Configure Service Settings

| Setting | Value |
|---------|-------|
| **Name** | `complaint-backend` |
| **Environment** | `Node` |
| **Region** | Select closest to you |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

Click **"Create Web Service"**

### Step 3: Add Environment Variables

Once the service is created, go to **Settings** → **Environment Variables**

Add these variables one by one:

```
MONGODB_URI=mongodb+srv://admin:MySecurePass123@cluster0.abc123.mongodb.net/complaint_db?retryWrites=true&w=majority

PORT=5000

NODE_ENV=production

JWT_SECRET=your-super-secret-key-change-this-in-production-12345

GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE

GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions

GROQ_TIMEOUT_MS=20000

GROQ_TEXT_MODEL=llama-3.3-70b-versatile

CLIENT_URL=https://your-frontend.vercel.app

ADMIN_EMAIL=admin@example.com
```

⚠️ **Important:**
- Replace `MONGODB_URI` with your actual connection string
- Replace `JWT_SECRET` with a random secure string (use a UUID generator)
- Get `GROQ_API_KEY` from [console.groq.com](https://console.groq.com) (free tier available)
- Leave `CLIENT_URL` temporary — update after frontend is deployed

### Step 4: Deploy Backend

1. Render should auto-deploy from GitHub
2. Watch the **"Deploy Log"** (takes 3-5 minutes)
3. When done, you'll see: ✅ **"Your service is live"**
4. Copy your backend URL: `https://complaint-backend.onrender.com`

---

## Phase 3: Deploy Frontend to Vercel

### Step 1: Create Vercel Project
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"Add New"** → **"Project"**
4. Select your GitHub repository
5. Click **"Import"**

### Step 2: Configure Project Settings

| Setting | Value |
|---------|-------|
| **Framework** | `Vite` |
| **Root Directory** | `./client` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Step 3: Add Environment Variables

Click **"Environment Variables"** and add:

```
VITE_API_URL=https://complaint-backend.onrender.com/api
```

⚠️ Replace `complaint-backend` with your actual Render backend name

### Step 4: Deploy Frontend

Click **"Deploy"** → Wait 2-3 minutes

When done, you'll see your frontend URL like:
```
https://complaint-system.vercel.app
```

✅ **Save this URL** — it's your production frontend

---

## Phase 4: Connect Backend & Frontend

### Step 1: Update Backend CLIENT_URL

1. Go back to **Render Dashboard**
2. Open your **`complaint-backend`** service
3. Go to **Settings** → **Environment Variables**
4. Update `CLIENT_URL`:
   ```
   CLIENT_URL=https://complaint-system.vercel.app
   ```
5. Click **"Save"**
6. Render will **auto-redeploy** (should see new deployment log)

### Step 2: Test Connection

1. Open your frontend: https://complaint-system.vercel.app
2. Try logging in with test account
3. Create a test complaint
4. Check Render logs for any errors:
   - In Render dashboard → **"Logs"** tab
   - Look for any `ECONNREFUSED` or `401` errors

---

## Phase 5: Verify Everything Works

### Test Checklist:

- [ ] Frontend loads without errors
- [ ] Login works
- [ ] Can submit a complaint (as student)
- [ ] Can assign complaint (as admin)
- [ ] Worker can see assigned complaints
- [ ] Tamil translation loads when viewing complaint details
- [ ] Voice playback button appears
- [ ] AI draft generation button works
- [ ] Status update saves successfully

### Check Backend Logs:

In Render dashboard → Your service → **"Logs"** tab

You should see:
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
Server running on port 5000
```

---

## Troubleshooting

### ❌ "Cannot find module" errors

**Solution:** Check if all dependencies are installed
```bash
# In server folder locally
npm install
# Make sure package.json has all modules
```

### ❌ MongoDB Connection Fails

**Solution:** Check connection string
- Verify IP whitelist: MongoDB Atlas → **Network Access** → Add `0.0.0.0/0` (allow all)
- Check password has no special characters (use simple password)
- Verify database name is correct

### ❌ CORS Errors in Console

**Solution:** Update `CLIENT_URL` in Render environment variables
- Must match your exact Vercel URL
- Restart backend deployment after changing

### ❌ Tamil Voice Not Working

**Solution:** Browser may not have Tamil language pack
- Install Windows language pack for Tamil
- Or app will fallback to default voice

### ❌ AI Draft Returns Generic Template

**Solution:** Check Groq API config
1. Verify `GROQ_API_KEY` is set in Render
2. Check Groq API rate limit (free: 30 requests/minute)
3. Check Groq account is active: [console.groq.com](https://console.groq.com)

---

## Getting Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free account)
3. Go to **"API Keys"** in left sidebar
4. Click **"Create New API Key"**
5. Copy the key
6. Add to Render environment variables

**Free tier limits:**
- 30 requests per minute
- Unlimited requests per day (after initial limit)
- Always has quota for college use case

---

## Production Tips

### Security Best Practices:

1. **Change JWT_SECRET**: Use a strong random string
   ```bash
   # Generate random secret in terminal:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Use Strong MongoDB Password**: Mix of uppercase, lowercase, numbers, symbols

3. **Restrict MongoDB IP**: In MongoDB Atlas → **Network Access** → Add specific Render IP instead of `0.0.0.0/0`

4. **Environment Variables**: Never commit `.env` files to GitHub

### Scaling Tips:

- Free Render tier sleeps after 15 mins inactivity
- Upgrade to **Starter** plan ($7/month) for 24/7 uptime
- Monitor resource usage in Render dashboard

### Monitoring:

1. **Render Logs**: Check daily for errors
2. **MongoDB Atlas**: Monitor data usage (free: 512MB)
3. **Vercel Analytics**: Track frontend performance

---

## URLs After Setup

```
🌐 Frontend (Vercel):  https://complaint-system.vercel.app
🔧 Backend (Render):   https://complaint-backend.onrender.com
📊 API Endpoint:       https://complaint-backend.onrender.com/api
💾 Database (Atlas):   mongodb+srv://cluster0.xxxxx.mongodb.net
```

---

## Quick Reference: Environment Variables

### Render (Backend)
```
MONGODB_URI = [Your MongoDB Atlas connection string]
JWT_SECRET = [Random long string]
GROQ_API_KEY = [From console.groq.com]
CLIENT_URL = [Your Vercel frontend URL]
PORT = 5000
NODE_ENV = production
```

### Vercel (Frontend)
```
VITE_API_URL = [Your Render backend URL]/api
```

---

## Support & Next Steps

1. **Monitor in production** for first 24 hours
2. **Collect user feedback** on performance
3. **Consider upgrading plans** after testing
4. **Set up error tracking** (optional: Sentry.io)
5. **Enable SSL/TLS** (automatic on Vercel & Render)

---

## Common Issues During Deployment

| Issue | Solution |
|-------|----------|
| Build takes too long | Render may be busy; try manual deploy later |
| API 404 errors | Check `VITE_API_URL` matches backend URL exactly |
| Database connection timeout | Check MongoDB IP whitelist is set to 0.0.0.0/0 |
| Frontend blank page | Check browser console for errors; Hard refresh (Ctrl+Shift+R) |
| Worker can't see complaints | Check JWT_SECRET is same on frontend & backend |

---

**Good luck with your deployment! 🎉**

For live help, check:
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- MongoDB Docs: https://docs.mongodb.com/atlas
