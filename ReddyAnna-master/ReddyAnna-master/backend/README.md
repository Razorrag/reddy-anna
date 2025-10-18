# Express Auth APIs (Login & Signup)

Simple Node.js/Express + MySQL backend providing signup and login endpoints.

## Endpoints
- POST `/api/auth/signup` → body: `{ name, email, password }` → returns `{ message }`
- POST `/api/auth/login` → body: `{ email, password }` → returns `{ message, user }`

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from the template below and adjust as needed:
   ```env
   PORT=4000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=app_user
   DB_PASSWORD=app_password
   DB_NAME=annar_db
   ```
3. Create DB, user and tables in MySQL:
   ```bash
   mysql -u root -p < db.sql
   ```
4. Run the server:
   ```bash
   npm run start
   # or during development with auto-reload
   npm run dev
   ```

## Frontend usage
From your forms, submit JSON to the endpoints, e.g.:
```javascript
fetch('http://localhost:4000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, password })
}).then(r => r.json()).then(console.log);
```

```javascript
fetch('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
}).then(r => r.json()).then(console.log);
```



