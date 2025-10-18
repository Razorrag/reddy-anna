#!/bin/bash

# Reddy Anna Kossu Backend Deployment Script for Heroku

echo "🚀 Starting Reddy Anna Kossu Backend Deployment to Heroku..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Please login to Heroku:"
    heroku login
fi

# Get app name
read -p "📝 Enter your Heroku app name (or press Enter to create a new one): " app_name

if [ -z "$app_name" ]; then
    # Generate a random app name
    app_name="reddy-anna-$(date +%s)"
    echo "🎲 Creating new Heroku app: $app_name"
    heroku create $app_name
else
    echo "🔍 Using existing Heroku app: $app_name"
fi

# Get database URL
echo "🗄️ Setting up database..."
heroku addons:create cleardb:ignite --app $app_name

# Get database credentials
db_url=$(heroku config:get CLEARDB_DATABASE_URL --app $app_name)

# Parse database URL
db_host=$(echo $db_url | sed -n 's/.*@\([^/]*\).*/\1/p')
db_name=$(echo $db_url | sed -n 's/.*\/\(.*\)?reconnect.*/\1/p')
db_user=$(echo $db_url | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
db_password=$(echo $db_url | sed -n 's/.*:\([^@]*\)@.*/\1/p')

# Set environment variables
echo "⚙️ Setting environment variables..."
heroku config:set PORT=4000 --app $app_name
heroku config:set DB_HOST=$db_host --app $app_name
heroku config:set DB_USER=$db_user --app $app_name
heroku config:set DB_PASSWORD=$db_password --app $app_name
heroku config:set DB_NAME=$db_name --app $app_name

# Import database schema
echo "📊 Importing database schema..."
mysql -h $db_host -u $db_user -p$db_password $db_name < db.sql

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
heroku buildpacks:set heroku/nodejs --app $app_name

# Create a temporary git repository for deployment
temp_dir=$(mktemp -d)
cp -r * $temp_dir
cd $temp_dir

# Initialize git and push to Heroku
git init
git add .
git commit -m "Initial deployment"

# Add Heroku remote
heroku git:remote -a $app_name

# Push to Heroku
git push heroku master:main

# Get the app URL
app_url="https://$app_name.herokuapp.com"

echo "✅ Deployment successful!"
echo "🌐 Your backend is running at: $app_url"
echo ""
echo "📋 Next steps:"
echo "1. Update your frontend config.js with this URL:"
echo "   production: { API_BASE_URL: '$app_url' }"
echo "2. Update your Netlify redirects to point to this URL"
echo "3. Test your application"
echo ""
echo "🔑 Default admin accounts:"
echo "   Username: admin, Password: admin123"
echo "   Username: reddy, Password: reddy123"
echo "   Username: superadmin, Password: superadmin"
echo ""
echo "⚠️  Remember to change default passwords in production!"

# Clean up
cd ..
rm -rf $temp_dir