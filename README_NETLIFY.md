# Reddy Anna Kossu - Netlify Deployment Guide

This guide will help you deploy the Reddy Anna Kossu gaming website to Netlify.

## Prerequisites

1. A Netlify account (sign up at [netlify.com](https://netlify.com))
2. A Git repository (GitHub, GitLab, or Bitbucket)
3. Backend server deployed on a platform like Heroku, Vercel, or any cloud provider

## Step 1: Prepare Your Repository

1. Push all your project files to a Git repository
2. Make sure your repository includes:
   - All HTML files (index.html, login.html, signup.html, etc.)
   - CSS and JavaScript files
   - Assets folder (images, videos, etc.)
   - `netlify.toml` configuration file
   - `config.js` for environment-specific API URLs

## Step 2: Configure Backend URL

Before deploying, update the backend URL in `config.js`:

```javascript
// In config.js, update this line with your actual backend URL
production: {
  API_BASE_URL: 'https://reddy-anna-59l3.onrender.com'  // Replace with your actual backend URL
}
```

## Step 3: Deploy to Netlify

### Option A: Using Git Integration (Recommended)

1. Log in to your Netlify account
2. Click "New site from Git"
3. Choose your Git provider (GitHub, GitLab, or Bitbucket)
4. Select the repository containing your project
5. Configure build settings:
   - Build command: Leave blank (static site)
   - Publish directory: Leave blank (root directory)
6. Click "Deploy site"

### Option B: Using Drag and Drop

1. Log in to your Netlify account
2. Drag and drop your entire project folder onto the deployment area
3. Wait for the deployment to complete

## Step 4: Configure API Redirects

After deployment, you need to set up API redirects:

1. Go to Site settings > Build & deploy > Redirects
2. Add a redirect rule:
   - From: `/api/*`
   - To: `https://reddy-anna-59l3.onrender.com/api/:splat`
   - Status code: 200
   - Force: Yes

## Step 5: Update Environment Variables

1. Go to Site settings > Build & deploy > Environment
2. Add environment variables if needed:
   - `API_BASE_URL`: `https://reddy-anna-59l3.onrender.com`

## Step 6: Test Your Deployment

1. Visit your Netlify URL
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
3. Verify the API redirects are set up correctly in Netlify

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

1. Go to Site settings > Domain management
2. Add your custom domain
3. Update DNS records as instructed by Netlify
4. Update any hardcoded URLs in your project

## Continuous Deployment

Netlify automatically updates your site when you push changes to your Git repository. This means:

1. Make changes to your code
2. Commit and push to Git
3. Netlify will automatically rebuild and deploy your site

## Security Considerations

1. Ensure your backend has proper authentication
2. Use HTTPS for all API calls
3. Validate all user inputs on the backend
4. Consider rate limiting for API endpoints

## Performance Optimization

1. Optimize images before uploading
2. Enable Gzip compression in Netlify settings
3. Consider using Netlify's Edge Functions for dynamic content
4. Monitor site performance with Netlify Analytics

## Support

If you encounter any issues:

1. Check Netlify's deployment logs
2. Review browser console for JavaScript errors
3. Verify backend API endpoints are working
4. Consult Netlify's documentation at [docs.netlify.com](https://docs.netlify.com)