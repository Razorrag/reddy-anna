# Reddy Anna Kossu - Vercel Deployment Guide

This guide will help you deploy the Reddy Anna Kossu gaming website to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. A Git repository (GitHub, GitLab, or Bitbucket)
3. Backend server deployed on a platform like Heroku, Render, or any cloud provider

## Step 1: Prepare Your Repository

1. Push all your project files to a Git repository
2. Make sure your repository includes:
   - All HTML files (index.html, login.html, signup.html, etc.)
   - CSS and JavaScript files
   - Assets folder (images, videos, etc.)
   - `vercel.json` configuration file
   - `config.js` for environment-specific API URLs

## Step 2: Configure Backend URL

Before deploying, update the backend URL in `config.js`:

```javascript
// In config.js, update this line with your actual backend URL
production: {
  API_BASE_URL: 'https://reddy-anna-59l3.onrender.com'  // Replace with your actual backend URL
}
```

## Step 3: Deploy to Vercel

### Option A: Using Git Integration (Recommended)

1. Log in to your Vercel account
2. Click "New Project"
3. Import your Git repository
4. Configure project settings:
   - Framework Preset: Other
   - Root Directory: ./ (leave as is)
   - Build Command: (leave blank for static sites)
   - Output Directory: (leave blank for static sites)
5. Click "Deploy"

### Option B: Using Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts to deploy

## Step 4: Configure API Routing

The `vercel.json` file handles API routing automatically:

1. API calls to `/api/*` are automatically forwarded to your backend
2. Update the backend URL in `vercel.json` if needed:
   ```json
   {
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "https://your-backend-url.com/api/$1"
       }
     ]
   }
   ```

## Step 5: Update Environment Variables (Optional)

1. Go to Project settings > Environment Variables
2. Add environment variables if needed:
   - `API_BASE_URL`: `https://your-backend-url.com`

## Step 6: Test Your Deployment

1. Visit your Vercel URL
2. Test all functionality:
   - Navigation between pages
   - Login and signup forms
   - Admin panel access
   - Game functionality

## Troubleshooting

### API Connection Issues

If you're having trouble connecting to the backend:

1. Check that your backend URL is correctly set in `config.js`
2. Ensure CORS is properly configured on your backend
3. Verify the API routes are set up correctly in `vercel.json`

### Asset Loading Issues

If images or videos aren't loading:

1. Check file paths in your HTML files
2. Ensure all assets are included in your deployment
3. Verify case sensitivity in file names

### Form Submission Issues

If forms aren't submitting:

1. Check browser console for error messages
2. Verify the API endpoints are accessible
3. Check that your backend is running and accessible

## Custom Domain (Optional)

To use a custom domain:

1. Go to Project settings > Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update any hardcoded URLs in your project

## Continuous Deployment

Vercel automatically updates your site when you push changes to your Git repository. This means:

1. Make changes to your code
2. Commit and push to Git
3. Vercel will automatically rebuild and deploy your site

## Security Considerations

1. Ensure your backend has proper authentication
2. Use HTTPS for all API calls
3. Validate all user inputs on the backend
4. Consider rate limiting for API endpoints

## Performance Optimization

1. Optimize images before uploading
2. Vercel automatically handles Gzip compression
3. Consider using Vercel's Edge Functions for dynamic content
4. Monitor site performance with Vercel Analytics

## Support

If you encounter any issues:

1. Check Vercel's deployment logs
2. Review browser console for JavaScript errors
3. Verify backend API endpoints are working
4. Consult Vercel's documentation at [vercel.com/docs](https://vercel.com/docs)