# Route Flow Diagram

## Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                            │
│                    (Browser/HTTP Client)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER (Port 5000)                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. CORS Middleware                                        │  │
│  │    - Check origin                                         │  │
│  │    - Set CORS headers                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Security Headers Middleware                            │  │
│  │    - COOP, X-Content-Type-Options, etc.                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Session Middleware                                     │  │
│  │    - Load/create session                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Logging Middleware                                     │  │
│  │    - Log request details                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. API Routes (from routes.ts)                           │  │
│  │    ┌──────────────────────────────────────────────────┐ │  │
│  │    │ /api/auth/*        - Authentication              │ │  │
│  │    │ /api/game/*        - Game management             │ │  │
│  │    │ /api/user/*        - User management             │ │  │
│  │    │ /api/admin/*       - Admin operations            │ │  │
│  │    │ /api/payment/*     - Payment processing          │ │  │
│  │    │ /api/content/*     - Content management          │ │  │
│  │    │ /api/whatsapp/*    - WhatsApp integration        │ │  │
│  │    │ /ws                - WebSocket connection         │ │  │
│  │    └──────────────────────────────────────────────────┘ │  │
│  │                                                            │  │
│  │    If matched → Return JSON response                      │  │
│  │    If not matched → Continue to next middleware           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6. Error Handler Middleware                               │  │
│  │    - Catch errors from API routes                         │  │
│  │    - Return error JSON                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 7. Vite/Static Middleware (SPA Fallback)                 │  │
│  │                                                            │  │
│  │    Development Mode (NODE_ENV=development):               │  │
│  │    ┌────────────────────────────────────────────────┐    │  │
│  │    │ Vite Dev Server Middleware                     │    │  │
│  │    │ - Process /assets/* requests                   │    │  │
│  │    │ - HMR (Hot Module Replacement)                 │    │  │
│  │    │ - Transform TypeScript/JSX                     │    │  │
│  │    └────────────────────────────────────────────────┘    │  │
│  │                        │                                   │  │
│  │                        ▼                                   │  │
│  │    ┌────────────────────────────────────────────────┐    │  │
│  │    │ SPA Catch-All Route                            │    │  │
│  │    │ Regex: /^(?!\/api|\/ws|\/static|\/assets|     │    │  │
│  │    │         \/favicon).*/                          │    │  │
│  │    │                                                 │    │  │
│  │    │ 1. Read client/index.html                      │    │  │
│  │    │ 2. Transform with Vite                         │    │  │
│  │    │ 3. Return HTML                                 │    │  │
│  │    └────────────────────────────────────────────────┘    │  │
│  │                                                            │  │
│  │    Production Mode (NODE_ENV=production):                 │  │
│  │    ┌────────────────────────────────────────────────┐    │  │
│  │    │ Static File Middleware                         │    │  │
│  │    │ - Serve from client/dist/                      │    │  │
│  │    │ - Cache static assets                          │    │  │
│  │    └────────────────────────────────────────────────┘    │  │
│  │                        │                                   │  │
│  │                        ▼                                   │  │
│  │    ┌────────────────────────────────────────────────┐    │  │
│  │    │ SPA Catch-All Route                            │    │  │
│  │    │ - Serve dist/index.html for all routes        │    │  │
│  │    └────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Receives HTML with React App                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ React Router (wouter) - Client-Side Routing              │  │
│  │                                                            │  │
│  │  Route Matching:                                          │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ /                    → Index                       │  │  │
│  │  │ /game                → PlayerGame                  │  │  │
│  │  │ /admin-game          → AdminGame (protected)       │  │  │
│  │  │ /game-admin          → AdminGame (protected)       │  │  │
│  │  │ /admin-control       → AdminGame (protected)       │  │  │
│  │  │ /profile             → Profile                     │  │  │
│  │  │ /login               → Login                       │  │  │
│  │  │ /admin               → Admin (protected)           │  │  │
│  │  │ /user-admin          → UserAdmin (protected)       │  │  │
│  │  │ /admin-analytics     → AdminAnalytics (protected)  │  │  │
│  │  │ /admin-payments      → AdminPayments (protected)   │  │  │
│  │  │ /admin-bonus         → AdminBonus (protected)      │  │  │
│  │  │ /backend-settings    → BackendSettings (protected) │  │  │
│  │  │ /game-history        → GameHistoryPage (protected) │  │  │
│  │  │ /unauthorized        → Unauthorized                │  │  │
│  │  │ *                    → NotFound (404)              │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Render Component                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Request Examples

### Example 1: API Request
```
Request: GET /api/game/current
         │
         ├─→ CORS Middleware ✓
         ├─→ Security Headers ✓
         ├─→ Session Middleware ✓
         ├─→ Logging Middleware ✓
         ├─→ API Routes ✓ MATCHED!
         │   └─→ Return JSON: { gameId: "...", phase: "..." }
         └─→ Response: 200 OK (JSON)
```

### Example 2: SPA Route (Development)
```
Request: GET /admin-game
         │
         ├─→ CORS Middleware ✓
         ├─→ Security Headers ✓
         ├─→ Session Middleware ✓
         ├─→ Logging Middleware ✓
         ├─→ API Routes ✗ (not matched)
         ├─→ Error Handler ✗ (no error)
         ├─→ Vite Middleware
         │   ├─→ Check regex: /^(?!\/api|\/ws|\/static|\/assets|\/favicon).*/
         │   │   └─→ MATCHED! (not API route)
         │   ├─→ Read: client/index.html
         │   ├─→ Transform with Vite (add HMR, process imports)
         │   └─→ Return HTML
         └─→ Response: 200 OK (HTML)
         
Browser receives HTML:
         │
         ├─→ Load React app
         ├─→ React Router matches /admin-game
         └─→ Render AdminGame component
```

### Example 3: Static Asset (Development)
```
Request: GET /assets/main.js
         │
         ├─→ CORS Middleware ✓
         ├─→ Security Headers ✓
         ├─→ Session Middleware ✓
         ├─→ Logging Middleware ✓
         ├─→ API Routes ✗ (not matched)
         ├─→ Vite Middleware
         │   └─→ Vite dev server handles /assets/* internally
         └─→ Response: 200 OK (JavaScript)
```

### Example 4: WebSocket Connection
```
Request: GET /ws (Upgrade: websocket)
         │
         ├─→ CORS Middleware ✓
         ├─→ Security Headers ✓
         ├─→ Session Middleware ✓
         ├─→ Logging Middleware ✓
         ├─→ API Routes ✓ MATCHED!
         │   └─→ Upgrade to WebSocket
         └─→ Response: 101 Switching Protocols
```

## Regex Pattern Breakdown

```
/^(?!\/api|\/ws|\/static|\/assets|\/favicon).*/
```

### Matches (SPA Routes):
- `/` ✓
- `/game` ✓
- `/admin-game` ✓
- `/profile` ✓
- `/login` ✓
- `/any-other-route` ✓

### Does NOT Match (API/Static):
- `/api/game/current` ✗ (starts with /api)
- `/ws` ✗ (exact match /ws)
- `/static/logo.png` ✗ (starts with /static)
- `/assets/main.js` ✗ (starts with /assets)
- `/favicon.ico` ✗ (starts with /favicon)

## Key Points

1. **Order Matters**: API routes MUST be registered before SPA catch-all
2. **Negative Lookahead**: Regex excludes specific paths from SPA fallback
3. **Single HTML**: All SPA routes serve the same index.html
4. **Client-Side Routing**: React Router handles route matching in browser
5. **Development vs Production**: Different middleware but same logic

## Related Documentation

- [ROUTE_HANDLING_FIX.md](./ROUTE_HANDLING_FIX.md)
- [ROUTE_FIX_VERIFICATION.md](./ROUTE_FIX_VERIFICATION.md)
