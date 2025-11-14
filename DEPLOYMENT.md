# Deployment Guide for Eightify

This guide will walk you through deploying Eightify to GitHub Pages.

## Prerequisites

- A GitHub account
- Git installed on your computer
- A Firebase account (free)

## Step 1: Firebase Setup (15 minutes)

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `eightify` (or your preferred name)
4. Disable Google Analytics (optional) or keep it enabled
5. Click **"Create project"**
6. Wait for project creation, then click **"Continue"**

### 1.2 Enable Google Authentication

1. In the left sidebar, click **"Authentication"**
2. Click **"Get started"**
3. Click on **"Google"** under Sign-in providers
4. Toggle **"Enable"**
5. Set a public-facing name for your project
6. Enter your email as Project support email
7. Click **"Save"**

### 1.3 Enable Firestore Database

1. In the left sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add security rules later)
4. Select a Cloud Firestore location (choose closest to your users)
5. Click **"Enable"**

### 1.4 Get Firebase Configuration

1. Click the **gear icon** (⚙️) next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"**
4. Click the **web icon** (</>)
5. Register app with nickname: `eightify-web`
6. **Don't** check "Also set up Firebase Hosting"
7. Click **"Register app"**
8. Copy the `firebaseConfig` object (looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

### 1.5 Update Your Code

1. Open `static-site/js/firebase-config.js` in a text editor
2. Replace the placeholder values with your Firebase config
3. Save the file

## Step 2: Prepare for GitHub Pages

### 2.1 Create Repository

1. Go to [GitHub](https://github.com)
2. Click the **+** icon in the top right
3. Select **"New repository"**
4. Repository name: `eightify` (or your choice)
5. Description: "Daily time management tool using the 8-8-8 principle"
6. Choose **Public** (required for free GitHub Pages)
7. **Don't** check "Initialize with README"
8. Click **"Create repository"**

### 2.2 Prepare Files

Open terminal/command prompt and navigate to your project:

```bash
cd path/to/your/project
cd static-site
```

Initialize Git:

```bash
git init
git add .
git commit -m "Initial commit: Eightify time management tool"
```

### 2.3 Push to GitHub

Replace `YOUR-USERNAME` and `eightify` with your GitHub username and repository name:

```bash
git remote add origin https://github.com/YOUR-USERNAME/eightify.git
git branch -M main
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **"Settings"** tab
3. In the left sidebar, click **"Pages"**
4. Under **"Source"**, select:
   - Branch: **main**
   - Folder: **/ (root)**
5. Click **"Save"**

⏱️ **Wait 2-5 minutes** for GitHub to build your site

## Step 4: Configure Firebase for Your Domain

### 4.1 Add Authorized Domain

1. Go back to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Settings** tab
4. Scroll to **"Authorized domains"**
5. Click **"Add domain"**
6. Add: `YOUR-USERNAME.github.io`
7. Click **"Add"**

### 4.2 Test Your Site

Your site is now live at: `https://YOUR-USERNAME.github.io/eightify/`

## Step 5: Add Security Rules (Recommended)

### 5.1 Update Firestore Rules

1. In Firebase Console, go to **Firestore Database**
2. Click **"Rules"** tab
3. Replace the content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data: only owners can read/write
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Circles: authenticated users can read, creators can write
    match /circles/{circleId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.createdBy == request.auth.uid;
    }
  }
}
```

4. Click **"Publish"**

## Step 6: Verify Everything Works

1. Visit your site: `https://YOUR-USERNAME.github.io/eightify/`
2. Click the hamburger menu (☰)
3. Click **"Sign in with Google"**
4. Sign in with your Google account
5. Click **"Start"** on a category
6. Enter an activity name
7. Let the timer run for a minute
8. Click **"Stop"**
9. Check **"Statistics"** page

✅ **Success!** Your site is live!

## Troubleshooting

### Issue: "Firebase not defined" error

**Solution:** Check that you updated `firebase-config.js` with your actual Firebase credentials.

### Issue: Google Sign-in doesn't work

**Solution:**
1. Verify you added your GitHub Pages domain to Firebase authorized domains
2. Make sure the domain is exactly: `YOUR-USERNAME.github.io` (no `https://` or trailing slash)

### Issue: Data not saving

**Solution:**
1. Check browser console for errors
2. Verify Firestore is enabled in Firebase Console
3. Check that security rules allow authenticated users to write

### Issue: 404 error when accessing the site

**Solution:**
1. Wait 5 more minutes (first deployment takes time)
2. Check GitHub Actions tab for build status
3. Verify GitHub Pages is enabled in repository settings

### Issue: Changes not showing up

**Solution:**
1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Wait a few minutes for GitHub to rebuild
3. Make sure you pushed your changes: `git push`

## Updating Your Site

To make changes:

```bash
# Make your edits
git add .
git commit -m "Description of changes"
git push
```

GitHub will automatically rebuild your site in 1-2 minutes.

## Custom Domain (Optional)

To use a custom domain like `eightify.com`:

1. Buy a domain from a registrar (Namecheap, Google Domains, etc.)
2. In GitHub repository → Settings → Pages
3. Enter your custom domain
4. In your domain registrar, add these DNS records:
   ```
   Type: A, Name: @, Value: 185.199.108.153
   Type: A, Name: @, Value: 185.199.109.153
   Type: A, Name: @, Value: 185.199.110.153
   Type: A, Name: @, Value: 185.199.111.153
   Type: CNAME, Name: www, Value: YOUR-USERNAME.github.io
   ```
5. Wait 24-48 hours for DNS to propagate
6. Add your custom domain to Firebase authorized domains

## Cost

- Firebase: **$0** (free tier includes 50,000 reads/day, 20,000 writes/day)
- GitHub Pages: **$0** (unlimited for public repositories)
- **Total: FREE** ✨

## Support

If you encounter issues:

1. Check the browser console for errors (F12 → Console tab)
2. Verify all Firebase services are enabled
3. Check GitHub Actions for build errors
4. Review Firestore security rules

## Next Steps

- Customize colors in `css/styles.css`
- Add more features to `js/app.js`
- Implement Circle leaderboards
- Add weekly/monthly statistics
- Create activity categories

Happy time tracking! 🎯
