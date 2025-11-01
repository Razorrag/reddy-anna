# 🔧 Environment Variables Reference

Complete list of all environment variables used in the Andar Bahar game application.

## 📋 Required Variables

These variables **MUST** be set for the application to start:

### **JWT_SECRET**
- **Description**: Secret key for JWT token signing
- **Example**: `your_jwt_secret_here_min_32_characters_long`
- **Generate**: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- **Required**: ✅ Yes

### **SUPABASE_URL**
- **Description**: Your Supabase project URL
- **Example**: `https://your-project-id.supabase.co`
- **Where to find**: Supabase Dashboard → Settings → API
- **Required**: ✅ Yes

### **SUPABASE_SERVICE_KEY**
- **Description**: Supabase service role key (admin access)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find**: Supabase Dashboard → Settings → API → service_role key
- **Security**: ⚠️ Keep secret! Has admin access
- **Required**: ✅ Yes

---

## 🔧 Optional Variables (with defaults)

These variables have default values but can be customized:

### **NODE_ENV**
- **Description**: Node environment mode
- **Default**: `production` (in production)
- **Options**: `development`, `production`, `test`
- **Required**: ❌ No (defaults to `production` on Render)

### **PORT**
- **Description**: Server port number
- **Default**: `5000`
- **Note**: ⚠️ **DO NOT SET ON RENDER** - Render provides this automatically
- **Required**: ❌ No

### **JWT_EXPIRES_IN**
- **Description**: JWT token expiration time
- **Default**: `7d`
- **Examples**: `7d`, `24h`, `1h`, `30m`
- **Required**: ❌ No

### **CORS_ORIGIN**
- **Description**: Primary CORS origin
- **Default**: Based on `ALLOWED_ORIGINS` or auto-detected
- **Example**: `https://your-app-name.onrender.com`
- **Required**: ❌ No

### **ALLOWED_ORIGINS**
- **Description**: Comma-separated list of allowed CORS origins
- **Default**: Empty (allows all in development)
- **Example**: `https://your-app.onrender.com,https://www.your-app.onrender.com`
- **Required**: ❌ No

### **DEFAULT_BALANCE**
- **Description**: Default balance for new users on signup
- **Default**: `1000`
- **Example**: `500`, `1000`, `5000`
- **Required**: ❌ No

### **MIN_DEPOSIT**
- **Description**: Minimum deposit amount
- **Default**: `100`
- **Required**: ❌ No

### **MAX_DEPOSIT**
- **Description**: Maximum deposit amount
- **Default**: `1000000`
- **Required**: ❌ No

### **MIN_WITHDRAWAL**
- **Description**: Minimum withdrawal amount
- **Default**: `500`
- **Required**: ❌ No

### **MAX_WITHDRAWAL**
- **Description**: Maximum withdrawal amount
- **Default**: `500000`
- **Required**: ❌ No

---

## 🌐 HTTPS/SSL Variables (VPS Only)

These are only needed for custom VPS deployments. **Render provides HTTPS automatically**.

### **HTTPS_ENABLED**
- **Description**: Enable HTTPS server
- **Default**: `false`
- **Example**: `true`
- **Note**: ⚠️ Not needed on Render (HTTPS provided automatically)
- **Required**: ❌ No

### **SSL_KEY_PATH**
- **Description**: Path to SSL private key
- **Default**: `./server.key`
- **Required**: ❌ No

### **SSL_CERT_PATH**
- **Description**: Path to SSL certificate
- **Default**: `./server.crt`
- **Required**: ❌ No

### **SSL_CA_PATH**
- **Description**: Path to SSL CA chain certificate
- **Default**: Auto-detected from `SSL_CERT_PATH`
- **Required**: ❌ No

### **HTTPS_PORT**
- **Description**: HTTPS server port
- **Default**: Same as `PORT`
- **Example**: `443`
- **Required**: ❌ No

### **HTTP_TO_HTTPS_REDIRECT**
- **Description**: Redirect HTTP to HTTPS
- **Default**: `false`
- **Example**: `true`
- **Required**: ❌ No

### **DOMAIN**
- **Description**: Your domain name (for SSL certificate generation)
- **Example**: `example.com`
- **Required**: ❌ No

---

## 🗄️ Database Variables (Optional - Postgres Fallback)

If not using Supabase, you can use Postgres directly:

### **DATABASE_URL**
- **Description**: PostgreSQL connection string
- **Example**: `postgresql://user:password@host:5432/database`
- **Required**: ❌ No (uses Supabase if available)

### **POSTGRES_URL**
- **Description**: Alternative PostgreSQL connection string
- **Example**: `postgresql://user:password@host:5432/database`
- **Required**: ❌ No

### **PGSSL**
- **Description**: Enable SSL for PostgreSQL connection
- **Default**: `false`
- **Example**: `true`
- **Required**: ❌ No

---

## 🔒 Security Variables (Optional)

### **TRUSTED_IPS**
- **Description**: Comma-separated list of trusted IP addresses
- **Example**: `127.0.0.1,::1,192.168.1.0/24`
- **Required**: ❌ No

---

## 🎨 Client-Side Variables (Vite Build)

These variables are prefixed with `VITE_` and are available in the browser:

### **VITE_API_BASE_URL**
- **Description**: API base URL for client-side requests
- **Default**: `http://localhost:5000` (development)
- **Example**: `https://your-app.onrender.com`
- **Note**: Only needed for local development
- **Required**: ❌ No

### **VITE_SUPABASE_URL**
- **Description**: Supabase URL for client-side
- **Example**: `https://your-project-id.supabase.co`
- **Note**: Usually same as `SUPABASE_URL`
- **Required**: ❌ No

### **VITE_SUPABASE_ANON_KEY**
- **Description**: Supabase anonymous key for client-side
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Note**: Usually same as `SUPABASE_ANON_KEY`
- **Required**: ❌ No

---

## 📝 Example `.env` File

Create a `.env` file in your project root with:

```env
# Required
NODE_ENV=production
JWT_SECRET=your_jwt_secret_here_min_32_characters_long
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_public_key_here

# Optional (with defaults)
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-app-name.onrender.com
ALLOWED_ORIGINS=https://your-app-name.onrender.com
DEFAULT_BALANCE=1000
```

---

## 🚀 Render Deployment

For Render deployment, set these in Render Dashboard → Environment Variables:

### **Required on Render:**
```
NODE_ENV=production
JWT_SECRET=<auto-generated or set your own>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-service-key>
SUPABASE_ANON_KEY=<your-anon-key>
```

### **Optional on Render:**
```
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-app-name.onrender.com
ALLOWED_ORIGINS=https://your-app-name.onrender.com,https://www.your-app-name.onrender.com
DEFAULT_BALANCE=1000
```

**⚠️ Important Notes:**
- **DO NOT SET `PORT`** on Render - it's provided automatically
- **DO NOT SET HTTPS variables** - Render provides HTTPS automatically
- `CORS_ORIGIN` should match your Render URL
- `JWT_SECRET` can be auto-generated in `render.yaml` or set manually

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** to version control
2. **Keep `SUPABASE_SERVICE_KEY` secret** - it has admin access
3. **Use strong `JWT_SECRET`** - minimum 32 characters, preferably 64+
4. **Rotate secrets regularly** in production
5. **Use environment variables** in deployment platforms (don't hardcode)

---

## 📚 See Also

- [Render Deployment Guide](./RENDER_DEPLOYMENT_GUIDE.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Render Environment Variables](https://render.com/docs/environment-variables)

