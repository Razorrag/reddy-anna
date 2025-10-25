import { ViteDevServer } from 'vite';
import express from 'express';
import path from 'path';
import { createServer as createViteServer, type ViteDevServer as ViteDevServerType } from 'vite';
import { Server } from 'http';

// Declare vite as a module variable
let vite: ViteDevServerType | null = null;

export async function setupVite(app: express.Application, server: Server) {
  const isTest = process.env.NODE_ENV === 'test';

  if (isTest) return;

  try {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa', // Single page application
      root: path.resolve(__dirname, '../../client'),
    });
    
    app.use(vite.middlewares);

    // Handle HTML requests
    app.get(/^(?!\/api|\/ws|\/static|\/assets|\/favicon).*/, async (req, res) => {
      try {
        const indexPath = path.resolve(__dirname, '../../client/index.html');
        let html = await vite!.transformIndexHtml(req.originalUrl, 
          (await vite!.ssrLoadModule(indexPath)).default || 
          await vite!.transformRequest(indexPath).then(result => result!.html)
        );
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite!.ssrLoadModule
        const indexPath = path.resolve(__dirname, '../../client/index.html');
        const html = await vite!.transformIndexHtml(req.originalUrl, 
          await vite!.transformRequest(indexPath).then(result => result!.html || '')
        );
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      }
    });
  } catch (e) {
    console.error('Error setting up Vite:', e);
  }
}

export function serveStatic(app: express.Application) {
  // Serve static files in production
  const staticDir = path.resolve(__dirname, '../../client/dist');
  
  // Check if dist directory exists, otherwise use client root
  const fs = require('fs');
  const assetsDir = fs.existsSync(staticDir) ? staticDir : path.resolve(__dirname, '../../client');
  
  app.use(express.static(assetsDir));
  
  // Handle all routes by serving index.html in production, excluding API routes
  app.get(/^(?!\/api|\/ws|\/static|\/assets|\/favicon).*/, (req, res) => {
    res.sendFile(path.resolve(assetsDir, 'index.html'));
  });
}

export function log(message: string) {
  console.log(`\ud83d\udc3e ${message}`);
}