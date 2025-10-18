#!/bin/bash

# Git Initialization Script for Andar Bahar Game
# This script initializes a Git repository and prepares for first commit

echo "=== Andar Bahar Game - Git Initialization ==="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Error: Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're already in a git repository
if [ -d ".git" ]; then
    echo "This directory is already a Git repository."
    read -p "Do you want to continue with existing repository? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting."
        exit 1
    fi
else
    echo "Initializing Git repository..."
    git init
    
    # Create .gitignore file
    echo "Creating .gitignore file..."
    cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Database
*.db
*.sqlite
*.sqlite3

# Temporary files
tmp/
temp/

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rpt2_build-cache/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Temporary folders
tmp/
temp/
EOF
fi

# Create initial commit
echo "Creating initial commit..."
git add .
git commit -m "Initial commit: Andar Bahar Game Implementation

- Responsive three-column layout for mobile and desktop
- Real-time backend integration with separate API endpoints
- Game administration interface for complete game control
- Optimized performance with targeted API calls
- Professional black/gold theme with smooth animations
- Connection status indicators and error handling
- Comprehensive testing documentation"

# Instructions for pushing to remote repository
echo ""
echo "=== Repository Initialization Complete ==="
echo ""
echo "To push to a remote repository:"
echo ""
echo "1. Create a new repository on GitHub/GitLab/Bitbucket"
echo "2. Add the remote repository:"
echo "   git remote add origin <repository-url>"
echo ""
echo "3. Push to the remote repository:"
echo "   git push -u origin main"
echo ""
echo "Or create a repository on GitHub CLI:"
echo "   gh repo create"
echo "   git remote add origin https://github.com/username/andar-bahar.git"
echo "   git push -u origin main"
echo ""
echo "Happy coding! 🎮"