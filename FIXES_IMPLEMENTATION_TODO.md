# Implementation Todo List

## Step 1: Fix Server Environment Variable Validation
- [ ] Modify `server/index.ts` to require all critical environment variables
- [ ] Add validation logic that fails immediately if variables are missing
- [ ] Test by deliberately removing a variable and verifying server fails to start

## Step 2: Fix Frontend-to-Backend API Connection (REST)
- [ ] Examine current `client/src/lib/api-client.ts` implementation
- [ ] Modify constructor to use `VITE_API_BASE_URL` in development
- [ ] Add logging for baseURL initialization
- [ ] Create/update `client/.env` file with proper API base URL
- [ ] Test API requests go to correct port (5000)

## Step 3: Fix Frontend-to-Backend Connection (WebSocket)
- [ ] Examine current `client/src/contexts/WebSocketContext.tsx` implementation
- [ ] Modify `getWebSocketUrl()` to use `VITE_WEBSOCKET_URL` in development
- [ ] Add WebSocket URL to `client/.env` file
- [ ] Test WebSocket connection to correct port (5000)

## Step 4: Fix Authentication Data Mismatch
### Issue 4.1: Login Request
- [ ] Update `client/src/lib/api-client.ts` login method to use `email` instead of `username`
- [ ] Update `client/src/pages/login.tsx` form to use `email` field

### Issue 4.2: Registration Request
- [ ] Update `client/src/pages/signup.tsx` to collect name, mobile, email, password
- [ ] Update `client/src/lib/api-client.ts` register method with correct data structure

### Issue 4.3: Login Response (Missing Role)
- [ ] Examine `server/auth.ts` login functions
- [ ] Add `role` field to user response in `loginUser` function
- [ ] Add `role` field to admin response in `loginAdmin` function

## Final Testing
- [ ] Create proper `.env` file from `.env.example`
- [ ] Test complete authentication flow
- [ ] Verify admin WebSocket authentication works
- [ ] Test user registration with new fields
- [ ] Verify all API calls go to correct backend port
