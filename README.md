# Eightify - Daily Time Management Tool

Eightify is a lightweight, clean time-management tool based on the 8-8-8 principle: 8 hours for productive activities, 8 hours for personal activities, and 8 hours for sleep.

## Features

- ⏱️ **Simple Timer**: Track activities with a beautiful circular timer
- 📊 **Daily Statistics**: Visualize your time usage with pie charts
- 👥 **Circles**: Create productivity groups and track progress together
- 🔄 **Daily Reset**: Automatically resets at midnight in your timezone
- ☁️ **Cloud Sync**: Save your data with Google login (Firebase)
- 📱 **Responsive**: Works perfectly on mobile and desktop

## Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project" and follow the setup wizard
   - Enable Google Analytics (optional)

2. **Enable Authentication**
   - In Firebase Console, go to "Authentication"
   - Click "Get Started"
   - Enable "Google" sign-in provider
   - Add your domain to authorized domains (for GitHub Pages: `username.github.io`)

3. **Enable Firestore Database**
   - In Firebase Console, go to "Firestore Database"
   - Click "Create Database"
   - Start in "Test Mode" (you can add security rules later)
   - Choose a location closest to your users

4. **Get Firebase Configuration**
   - Go to Project Settings (gear icon)
   - Scroll down to "Your apps" section
   - Click the web icon (</>)
   - Copy the `firebaseConfig` object

5. **Update Configuration**
   - Open `js/firebase-config.js`
   - Replace the placeholder values with your Firebase config:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

## Deployment to GitHub Pages

1. **Prepare Your Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create GitHub Repository**
   - Go to GitHub and create a new repository
   - Name it anything you like (e.g., `eightify`)

3. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/username/eightify.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**
   - Go to repository Settings
   - Navigate to "Pages" section
   - Under "Source", select "main" branch
   - Select "/static-site" folder (or move files to root)
   - Click "Save"

5. **Access Your Site**
   - Your site will be available at: `https://username.github.io/eightify/`
   - Wait a few minutes for the first deployment

## Security Rules (Recommended)

After testing, add these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /circles/{circleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Local Development

Simply open `index.html` in your browser or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

Then visit `http://localhost:8000`

## Project Structure

```
static-site/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── firebase-config.js  # Firebase configuration
│   └── app.js          # Main application logic
├── assets/
│   └── default-avatar.svg  # Default user avatar
└── README.md           # This file
```

## Features Overview

### Home Page
- Large circular timer displaying elapsed time
- Three category cards: Productive, Personal, Sleep
- One-click start/stop functionality
- Activity name input with 2-click workflow

### Statistics Page
- Pie chart showing daily time distribution
- Activity history with timestamps and durations
- Real-time updates

### Circle Feature
- Create productivity groups
- Track member progress
- Share activities within circles
- Weekly leaderboards (coming soon)

### Daily Reset
- Automatically resets at midnight (local timezone)
- Preserves history for logged-in users
- Local storage for offline mode

## Technologies Used

- **Frontend**: Pure HTML, CSS, JavaScript (ES6 modules)
- **Authentication**: Firebase Auth with Google Sign-In
- **Database**: Firebase Firestore
- **Hosting**: GitHub Pages
- **Cost**: 100% Free (Firebase free tier + GitHub Pages)

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Credits

Built for productivity enthusiasts who believe in the 8-8-8 principle.

## License

MIT License - Feel free to use and modify!
