# GitHub Setup Instructions for Reddy Anna Project

## Issue
Your local Git is configured as "razorrag15" but the repository permissions are for "Prachi-Agarwal211".

## Solution: Create Personal Access Token

### Step 1: Login to GitHub with Prachi-Agarwal211 Account
1. Go to [github.com](https://github.com)
2. Login with the "Prachi-Agarwal211" account

### Step 2: Create Personal Access Token
1. Click your profile picture > Settings
2. Scroll down and click "Developer settings" (left sidebar)
3. Click "Personal access tokens" > "Tokens (classic)"
4. Click "Generate new token"
5. Give it a name: "Reddy Anna Project"
6. Set expiration: 90 days (or as needed)
7. Select scopes:
   - ✅ repo (Full control of private repositories)
   - ✅ workflow (Update GitHub Action workflows)
8. Click "Generate token"
9. **Important**: Copy the token immediately (you won't see it again)

### Step 3: Use the Token to Push

#### Option A: Git Credential Manager (Recommended)
1. Run this command in your terminal:
   ```bash
   git config --global credential.helper store
   ```
2. Try to push again:
   ```bash
   git push origin master
   ```
3. When prompted for username, enter: `Prachi-Agarwal211`
4. When prompted for password, paste your personal access token

#### Option B: Include Token in URL (Temporary)
1. Run this command with your token:
   ```bash
   git remote set-url origin https://Prachi-Agarwal211:[YOUR-TOKEN]@github.com/Razorrag/reddy-anna.git
   ```
2. Replace `[YOUR-TOKEN]` with the actual token you copied
3. Push:
   ```bash
   git push origin master
   ```

### Step 4: After Successful Push
If you used Option B, remove the token from URL for security:
```bash
git remote set-url origin https://github.com/Razorrag/reddy-anna.git
```

## Alternative Solutions

### Add Razorrag15 as Collaborator
1. Login to GitHub with "Prachi-Agarwal211"
2. Go to the repository: https://github.com/Razorrag/reddy-anna
3. Click Settings > Collaborators
4. Add "razorrag15" as a collaborator

### Use GitHub Desktop
1. Install GitHub Desktop
2. Login with "Prachi-Agarwal211" account
3. Clone the repository through GitHub Desktop
4. Make your changes and commit/push through the GUI

## Troubleshooting

### If you get "Authentication failed"
- Double-check your token is correct
- Ensure the token has "repo" permissions
- Make sure you're using the correct username (Prachi-Agarwal211)

### If you get "Permission denied"
- Ensure the repository belongs to Razorrag organization
- Check if "Prachi-Agarwal211" has push permissions
- Try adding yourself as a collaborator

Once you successfully push, your code will be ready for deployment to Render!