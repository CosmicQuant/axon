---
description: How to deploy the Axon app to Firebase Hosting
---

# Deploying Axon to Firebase Hosting

This guide walks you through deploying the application to Firebase Hosting.

## Prerequisites
- Firebase CLI installed globally (`npm install -g firebase-tools`)
- A Firebase project already created (you should have one from setting up Firestore/Auth)

## Steps

### 1. Login to Firebase
```bash
firebase login
```
This will open a browser window for Google authentication.

### 2. Initialize Firebase Hosting (First Time Only)
```bash
firebase init hosting
```
When prompted:
- Select your existing Firebase project
- Set public directory to: `dist`
- Configure as single-page app: **Yes**
- Set up automatic builds with GitHub: **No** (unless you want CI/CD)
- Overwrite index.html: **No**

### 3. Build the Production Bundle
// turbo
```bash
npm run build
```
This creates an optimized production build in the `dist` folder.

### 4. Deploy to Firebase
```bash
firebase deploy --only hosting
```

## Expected Output
After deployment, you'll see:
```
✔ Deploy complete!

Hosting URL: https://your-project-id.web.app
```

## Custom Domain (Optional)
To use a custom domain like `axon.co.ke`:
1. Go to Firebase Console → Hosting → Add custom domain
2. Follow the DNS verification steps
3. Firebase provides free SSL certificates

## Environment Variables
Your `.env` file is NOT deployed (it's in `.gitignore`). For production:
1. Ensure all Firebase config values are in `.env`
2. Vite will inline them during the build process

## Rollback
To rollback to a previous deployment:
```bash
firebase hosting:channel:deploy live --only hosting
```
Or use the Firebase Console → Hosting → Release History → Rollback

## Troubleshooting
- **404 on refresh**: Ensure `firebase.json` has proper rewrites for SPA
- **API errors**: Check browser console for CORS or Firebase rules issues
- **Blank page**: Check that the `dist` folder contains `index.html`
