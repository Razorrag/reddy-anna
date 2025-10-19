# Render Deployment Guide

## Quick Deploy Steps

### 1. Prepare Your Repository

Make sure all changes are committed and pushed to your Git repository (GitHub, GitLab, or Bitbucket).

```bash
git add .
git commit -m "Configure for Render deployment"
git push origin main
```

### 2. Create New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository
4. Select your repository: `reddy-anna`

### 3. Configure Build Settings

Render should auto-detect the settings from `render.yaml`, but verify:

- **Name**: `andar-bahar-game` (or your preferred name)
- **Region**: Frankfurt (or your preferred region)
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty (root of repo)
- **Environment**: `Node`
- **Build Command**: `npm install --production=false && npm run build`
- **Start Command**: `npm start`

### 4. Add Environment Variables

In the Render dashboard, add these environment variables:

#### Required Variables:
- `NODE_ENV` = `production` (auto-set by render.yaml)
- `SESSION_SECRET` = Auto-generated (render.yaml handles this)
- `SUPABASE_URL` = Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_ANON_KEY` = Your Supabase anonymous key
- `CORS_ORIGIN` = Your deployed Render URL (e.g., `https://andar-bahar-game.onrender.com`)

#### Optional Variables:
- `DATABASE_URL` = Your PostgreSQL connection string (if using external DB)
- `PORT` = Auto-set by Render (don't override)

### 5. Deploy

Click **"Create Web Service"** and Render will:
1. Clone your repository
2. Install dependencies
3. Build the client (React/Vite)
4. Build the server (Node.js/Express)
5. Start your application

### 6. Monitor Deployment

Watch the build logs in real-time. The deployment process takes 5-10 minutes:

```
==> Installing dependencies
==> Building client
==> Building server
==> Starting application
==> Your service is live at https://your-app.onrender.com
```

## Build Process Explained

The build script (`scripts/build.js`) performs these steps:

1. **Clean**: Removes old `dist/` directory
2. **Client Install**: Installs client dependencies
3. **Client Build**: Builds React app with Vite → `client/dist/`
4. **Copy Static**: Copies client build to `dist/public/`
5. **Server Build**: Bundles server with esbuild → `dist/index.js`

Output structure:
```
dist/
├── index.js          # Bundled server
└── public/           # Client static files
    ├── index.html
    ├── assets/
    └── ...
```

## Troubleshooting

### Build Fails with "Cannot find module"

**Solution**: Ensure all dependencies are in `dependencies`, not `devDependencies` in root `package.json`.

### "ENOENT: no such file or directory, stat 'dist/public'"

**Solution**: Client build failed. Check client build logs. Common causes:
- Missing client dependencies
- TypeScript errors in client code
- Vite configuration issues

### WebSocket Connection Issues

**Solution**: Update WebSocket URL in production:
- Check `client/src/contexts/WebSocketContext.tsx`
- Ensure it uses `window.location.host` for production
- CORS_ORIGIN must match your deployed URL

### Static Files Not Loading (404 errors)

**Solution**: 
- Verify `dist/public/` contains built files
- Check server logs for static file serving
- Ensure `serveStatic()` is called in production mode

### Database Connection Errors

**Solution**:
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly
- Check Supabase project is active
- Verify network access from Render IPs

## Local Testing Before Deploy

Test the production build locally:

```bash
# Build the application
npm run build

# Start in production mode
npm start
```

Visit `http://localhost:5000` to verify everything works.

## Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Static assets (CSS, JS, images) load correctly
- [ ] API endpoints respond correctly
- [ ] WebSocket connections work
- [ ] Database operations function
- [ ] Authentication works
- [ ] Admin panel accessible
- [ ] Game functionality works

## Updating Your Deployment

To deploy updates:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically detect the push and redeploy.

## Performance Optimization

### Free Tier Limitations
- Service spins down after 15 minutes of inactivity
- Cold start takes 30-60 seconds
- 512MB RAM limit

### Upgrade Recommendations
- **Starter Plan**: Keeps service always running, faster response
- **Standard Plan**: More resources for higher traffic

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com/)
- Check build logs in Render dashboard for errors
