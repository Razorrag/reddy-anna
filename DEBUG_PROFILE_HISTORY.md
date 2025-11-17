# Debug: Game History Not Showing in Profile

## Quick Checks

### 1. Test API Endpoint
Open browser console (F12) and run:
```javascript
fetch('/api/user/game-history?limit=10', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(console.log)
```

### 2. Check Console Errors
- Open profile page
- Go to Game History tab
- Check browser console for errors

### 3. Check Network Tab
- Open DevTools → Network tab
- Go to Game History tab
- Look for `/api/user/game-history` request
- Check response status and data

## Common Issues

**Issue 1: Empty Response**
- Backend function works but API returns empty
- Check if user is authenticated

**Issue 2: 401 Unauthorized**
- Token expired or invalid
- Logout and login again

**Issue 3: Data not mapping correctly**
- Check console for mapping errors
- Response structure might not match expected format

## Quick Fix

Try refreshing the page with cache cleared:
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`
