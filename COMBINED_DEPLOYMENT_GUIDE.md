# Combined Frontend + Backend Deployment Guide

Deploy both React frontend and Express backend on **single Render service** with zero CORS issues.

---

## Architecture

```
Single Render Service (complaint-backend.onrender.com)
├── Express API (port 5000)
│   ├── /api/auth/*
│   ├── /api/complaints/*
│   ├── /api/admin/*
│   ├── /api/worker/*
│   └── /api/image/*
├── React Frontend (served from /client/dist)
│   ├── / (root)
│   ├── /login
│   ├── /register
│   └── /* (all React routes via fallback)
└── PostgreSQL Database
```

**Benefits:**
- ✅ No CORS errors (same origin)
- ✅ Single deployment
- ✅ Cheaper (1 service instead of 2)
- ✅ Better performance (no cross-domain latency)

---

## Step 1: Update Render Service Configuration

### 1.1 Go to Render Dashboard
- Navigate to https://dashboard.render.com
- Select your backend service (e.g., `complaint-backend`)

### 1.2 Update Build Command
- Click **Settings** tab
- Find **Build Command** field
- **Replace with:**
  ```
  npm run build:production
  ```
  This will:
  - Install root dependencies
  - Install server dependencies  
  - Install client dependencies
  - Build React app to `client/dist`

### 1.3 Verify Start Command
- Should be:
  ```
  npm start
  ```
  (Already configured)

### 1.4 Verify Root Directory
- Should be `.` (empty or default)
- **NOT** `./server`

### 1.5 Clean up Environment Variables
- **Keep these:**
  ```
  NODE_ENV=production
  DATABASE_PROVIDER=postgres
  DATABASE_URL=postgresql://user:pass@host:5432/db
  PG_SSL=true
  JWT_SECRET=your-secret-key
  GROQ_API_KEY=your-groq-api-key
  ```

- **Delete these (no longer needed):**
  - `CLIENT_URL`
  - `CLIENT_URLS`
  - `ALLOW_VERCEL_PREVIEWS`
  - `VITE_API_URL`

### 1.6 Save and Deploy
- Click **Save** (auto-deploys with new commit from GitHub)
- Or click **Manual Deploy** to force immediate redeploy
- Wait 3-5 minutes for build completion

---

## Step 2: Delete Vercel Project (Optional but Recommended)

If you had a separate Vercel deployment, delete it:

### 2.1 Go to Vercel
- Navigate to https://vercel.com/dashboard

### 2.2 Find Your Project
- Locate `college-complaint-management-system` (or similar)

### 2.3 Delete Project
- Click project name
- Go to **Settings** tab
- Scroll to bottom → **Delete Project**
- Type project name to confirm
- Click **Delete**

---

## Step 3: Monitor Deployment

### 3.1 Check Build Logs
- Render Dashboard → your service
- Click **Logs** tab
- Watch for:
  ```
  ==> Running build command 'npm run build:production'...
  added XXX packages
  npm notice
  npm notice New major version of npm available: X.X.X → X.X.X
  ...
  ==> Build successful 🎉
  ```

### 3.2 Check Start Logs
- After build completes, look for:
  ```
  > npm start
  > cd server && npm start
  > complaint-server@2.0.0 start
  > node server.js
  ✓ PostgreSQL connection established successfully
  ✓ PostgreSQL database initialized successfully
  🚀 Server running on port 5000 in production mode
  ```

### 3.3 If Build Fails
- Common issues:
  - `npm run build:production` not found → npm package.json script missing
  - `client/dist` not created → React build failed
  - Port already in use → restart service
- Check full logs and paste output for debugging

---

## Step 4: Test Deployment

### 4.1 Test Health Endpoint
```bash
curl https://your-render-app.onrender.com/api/health
```

**Expected response:**
```json
{
  "status": "OK",
  "timestamp": "2026-03-21T15:30:00.000Z"
}
```

### 4.2 Test Frontend Access
- Open browser: `https://your-render-app.onrender.com`
- Should see login page
- No 404 errors
- No CORS errors in console

### 4.3 Test Login (Full Flow)
1. Click "Register" link
2. Fill form:
   - Name: Test User
   - Email: test@example.com
   - Password: Test@123456
   - Student ID: 12345
3. Click "Register"
4. Should see success message
5. Go back to login
6. Enter credentials and login
7. Should redirect to dashboard

### 4.4 Test API Call
Open browser DevTools (F12) → Network tab:
1. Click login
2. Watch for request to: `https://your-render-app.onrender.com/api/auth/login`
3. Should be **POST** request
4. Response status should be **200** (not 401/403/CORS error)
5. Response body should contain `token` and `user` object

---

## Step 5: Verify URLs

After deployment, verify all URLs work:

| Endpoint | Expected |
|----------|----------|
| `https://your-render-app.onrender.com` | React login page |
| `https://your-render-app.onrender.com/api/health` | `{"status":"OK"}` |
| `https://your-render-app.onrender.com/api/auth/login` | 400 (POST required) |
| `https://your-render-app.onrender.com/uploads/...` | Uploaded files (if any) |
| `https://your-render-app.onrender.com/invalid` | React 404 page |

---

## Troubleshooting

### Issue: Build fails with "npm run build:production not found"
**Solution:**
- Check root `package.json` has `build:production` script
- Current version should have it (commit 80aed7a)
- If missing, file an issue

### Issue: "client/dist not found"
**Solution:**
- Render is looking for React build output
- Make sure build command generates `client/dist/index.html`
- Check React Vite config: `vite.config.js`
- Should have `outDir: 'dist'`

### Issue: "Cannot find module 'dotenv'" or other missing packages
**Solution:**
- Build command didn't install all dependencies properly
- Render should run: `npm run install:all`
- Then: `npm run build:production`
- Check `package.json` scripts

### Issue: CORS errors still appearing
**Solution:**
- Frontend and backend are now same-origin (no CORS needed)
- If errors persist, check browser console
- Verify frontend is actually loaded (not Vercel old deployment)
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

### Issue: React routes don't work (404 on page refresh)
**Solution:**
- SPA fallback middleware should handle this
- Server.js has fallback at line ~73:
  ```javascript
  app.get('*', (req, res) => {
    // serves index.html for all non-API routes
  });
  ```
- If not working, verify server.js was updated (commit 80aed7a)

### Issue: Upload or file serving not working
**Solution:**
- Check `/uploads` static route in server.js (line 62)
- Ensure `server/uploads` directory exists
- Verify permissions on Render

---

## File Changes Summary

**Commits made:**
- `80aed7a`: Combined frontend/backend deployment
  - Updated `server/server.js` to serve React static files
  - Added SPA fallback middleware for React Router
  - Updated `package.json` with `build:production` script
  - Updated `client/src/services/api.js` to normalize API URLs

**What was changed:**
```
server/server.js
├── Added frontend static serving (line 62-67)
├── Added SPA fallback to index.html (line 70-80)
└── Kept all API routes unchanged

package.json
├── Added build:production script
└── Added build:client:dist helper

client/src/services/api.js
├── Normalized API base URL to always include /api
└── Removed dependency on VITE_API_URL env var
```

---

## Production Checklist

- [ ] Render build command: `npm run build:production`
- [ ] Render start command: `npm start`
- [ ] Render root directory: `.` (empty)
- [ ] DATABASE_PROVIDER: `postgres`
- [ ] DATABASE_URL: Set to Render PostgreSQL URL
- [ ] JWT_SECRET: Set to random secure string
- [ ] Log check: "Server running on port 5000"
- [ ] Health endpoint returns 200
- [ ] Frontend loads without 404
- [ ] Login page displays
- [ ] Register/login flow works
- [ ] No CORS errors in browser console
- [ ] Vercel project deleted (if applicable)

---

## Support

If issues occur:
1. Check Render logs: Dashboard → Logs tab
2. Check browser console: F12 → Console tab
3. Test health endpoint: `curl https://app.onrender.com/api/health`
4. Verify environment variables are set
5. Verify commit `80aed7a` is deployed

---

## Next Steps

After confirming everything works:
1. Set up custom domain (optional)
2. Configure backup/auto-restart (optional)
3. Scale plan if needed (optional)
4. Monitor logs for errors

**You're done!** 🎉 Both frontend and backend running from single URL.
