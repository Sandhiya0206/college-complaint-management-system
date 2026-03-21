# PostgreSQL Deployment Guide

## Overview
This guide walks you through deploying the complaint system with PostgreSQL as the database instead of MongoDB.

## Prerequisites
- Render account (for backend and PostgreSQL hosting)
- Vercel account (for frontend)
- GitHub repository with latest code pushed

## Step 1: Delete Current Deployments

### Delete Render Backend Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your service (e.g., `complaint-backend-btyy`)
3. Click **Settings** → scroll to bottom → **Delete Service**
4. Type the service name to confirm and delete

### Delete Vercel Frontend Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project (e.g., `complaint-backend-one`)
3. Click **Settings** → scroll down → **Delete Project**
4. Type project name to confirm and delete

---

## Step 2: Create PostgreSQL Database on Render

### Provision Render PostgreSQL
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **PostgreSQL**
3. Fill in the form:
   - **Name**: `complaint-postgres-db`
   - **Database**: `complaint_db`
   - **User**: `complaint_user`
   - **Region**: Singapore (or your preference)
   - **Plan**: Free (or upgrade later)
4. Click **Create Database**
5. Wait 2-3 minutes for provisioning
6. Copy the **External Database URL** — you'll need this in Step 3

Example format:
```
postgresql://complaint_user:YOUR_PASSWORD@dpg-abc123.render.com:5432/complaint_db
```

---

## Step 3: Create Render Backend Service

### Deploy Backend with PostgreSQL
1. Go to Render Dashboard
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure the service:

   | Field | Value |
   |-------|-------|
   | **Name** | `complaint-backend` |
   | **Environment** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Root Directory** | `server` |
   | **Region** | Singapore |

5. Click **Create Web Service** (do NOT deploy yet)

### Add Environment Variables
Once service is created, go to **Environment** tab and add:

```
NODE_ENV=production
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://complaint_user:YOUR_PASSWORD@dpg-abc123.render.com:5432/complaint_db
PG_SSL=true
JWT_SECRET=your-secret-key-change-this
GROQ_API_KEY=your-groq-api-key
GROK_API_KEY=your-grok-api-key
GEMINI_API_KEY=your-gemini-api-key
CLIENT_URL=https://your-vercel-frontend.vercel.app
```

⚠️ **Important**: Replace placeholders with actual values

Then click **Save** and the service will deploy automatically.

---

## Step 4: Create Vercel Frontend

### Deploy Frontend
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Select your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add environment variable:
   ```
   VITE_API_URL=https://complaint-backend.onrender.com
   ```
   Replace `complaint-backend` with your actual Render service name

6. Click **Deploy**

Wait for build to complete (2-3 minutes)

---

## Step 5: Update Environment Variables in Render

After Vercel deployment completes:

1. Go back to Render Dashboard → your backend service
2. Go to **Environment** tab
3. Update `CLIENT_URL` to your actual Vercel URL:
   ```
   CLIENT_URL=https://your-vercel-project.vercel.app
   ```

4. Click **Save** (backend will redeploy with new URL)

---

## Step 6: Test Deployment

### Health Check
```bash
curl https://complaint-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-03-21T10:30:00.000Z"
}
```

### Test Login
1. Go to `https://your-vercel-project.vercel.app`
2. Try to register a new student account
3. Verify email and password are stored correctly
4. Log in with credentials

---

## Important Notes

### Database Initialization
- Tables are **automatically created** on first server start
- No manual schema setup needed
- If you need to reset, set `FORCE_DB_RESET=true` temporarily (dangerous!)

### Migration from MongoDB
Currently **NOT IMPLEMENTED**:
- Existing MongoDB data will NOT be migrated
- PostgreSQL starts with empty tables
- If you need historical data, contact support

### Sequelize ORM
- Backend now uses **Sequelize** for PostgreSQL queries
- Mongoose is deprecated and no longer used
- Models are in `server/src/models/sequelize/`
- Auth controller has been converted
- Other controllers (complaints, admin, worker) still need conversion

### Troubleshooting

**Login returns 500 error**
- Check `DATABASE_URL` is correct
- Verify PostgreSQL is created and running
- Check `JWT_SECRET` is set

**CORS errors on frontend**
- Update `CLIENT_URL` env var with exact Vercel URL
- No trailing slash needed

**Tables not creating**
- Check `DATABASE_PROVIDER=postgres` is set
- Check logs in Render dashboard

**Complaint endpoints fail**
- Complaint controller hasn't been converted to Sequelize yet
- Use auth endpoints first to test database

---

## Next Steps (Manual Conversion)

To enable full complaint management, you'll need to convert:
1. **Auth Controller** ✅ (Done in `auth.controller-sequelize.js`)
2. **Complaint Controller** ⏳ (In progress)
3. **Admin Controller** ⏳ (Not started)
4. **Worker Controller** ⏳ (Not started)

Once done, replace files and redeploy.

---

## Database Connection Details

The PostgreSQL database is configured with:
- **Connection pooling**: Max 5 concurrent connections
- **SSL**: Enabled for secure connections
- **Logging**: Detailed logs in development, silent in production
- **Auto-sync**: Sequelize syncs schema on startup

---

## Support

For issues:
1. Check Render service logs
2. Verify all environment variables
3. Test PostgreSQL connection locally with `psql`
4. Review Sequelize documentation for model conversions
