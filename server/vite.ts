import { ViteDevServer } from 'vite';
import express from 'express';
import path from 'path';
import { createServer as createViteServer, type ViteDevServer as ViteDevServerType } from 'vite';
import { Server } from 'http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Declare vite as a module variable
let vite: ViteDevServerType | null = null;

export async function setupVite(app: express.Application, server: Server) {
  const isTest = process.env.NODE_ENV === 'test';

  if (isTest) return;

  try {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa', // Single page application
      root: resolve(__dirname, '../../client'),
    });
    
    app.use(vite.middlewares);

    // Handle HTML requests - SPA fallback for all non-API routes
    app.get(/^(?!\/api|\/ws|\/static|\/assets|\/favicon).*/, async (req, res, next) => {
      try {
        const fs = await import('fs');
        const indexPath = resolve(__dirname, '../../client/index.html');
        
        // Read the index.html file
        let html = fs.readFileSync(indexPath, 'utf-8');
        
        // Transform the HTML with Vite
        html = await vite!.transformIndexHtml(req.originalUrl, html);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        console.error('Error serving HTML:', e);
        next(e);
      }
    });
  } catch (e) {
    console.error('Error setting up Vite:', e);
  }
}

export async function serveStatic(app: express.Application) {
  // Serve static files in production from dist/public
  // After build, the compiled server is in dist/ and the client files are in dist/public/
  const staticDir = resolve(__dirname, 'public');
  
  // Check if dist/public directory exists
  const fs = await import('fs');
  if (!fs.existsSync(staticDir)) {
    console.error('❌ Production build not found at:', staticDir);
    console.error('   Run "npm run build" to create the production build');
    throw new Error('Production build not found. Please run: npm run build');
  }
  
  console.log('✅ Serving static files from:', staticDir);
  app.use(express.static(staticDir));
  
  // Handle all routes by serving index.html in production, excluding API routes
  app.get(/^(?!\/api|\/ws|\/static|\/assets|\/favicon).*/, (req, res) => {
    const indexPath = resolve(staticDir, 'index.html');
    console.log('📄 Serving index.html from:', indexPath);
    res.sendFile(indexPath);
  });
}

export function log(message: string) {
  console.log(`\ud83d\udc3e ${message}`);
}