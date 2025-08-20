# Deployment Guide for BuyWhatSG

This comprehensive guide provides detailed step-by-step instructions for deploying the BuyWhatSG application to production using Firebase Hosting with a custom domain (buywhatsg.com) from Namecheap and SSL certificate setup.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Domain Purchase from Namecheap](#domain-purchase-from-namecheap)
3. [Firebase Project Setup](#firebase-project-setup)
4. [Environment Configuration](#environment-configuration)
5. [Building for Production](#building-for-production)
6. [Firebase Hosting Configuration](#firebase-hosting-configuration)
7. [Custom Domain Setup](#custom-domain-setup)
8. [SSL Certificate Configuration](#ssl-certificate-configuration)
9. [Deployment Process](#deployment-process)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting the deployment process, ensure you have:

- Node.js v18 or higher installed
- Git installed
- A Google account for Firebase
- A Namecheap account
- Firebase CLI installed globally: `npm install -g firebase-tools`
- Access to your project's source code

## Domain Purchase from Namecheap

### Step 1: Purchase the Domain

1. **Visit Namecheap**: Go to [namecheap.com](https://www.namecheap.com)
2. **Search for Domain**: Enter "buywhatsg.com" in the search bar
3. **Add to Cart**: If available, add the domain to your cart
4. **Complete Purchase**: 
   - Choose registration period (1-10 years)
   - Add domain privacy protection (recommended)
   - Complete the checkout process
   - Verify your email address when prompted

### Step 2: Access Domain Management

1. **Login to Namecheap**: Go to your Namecheap account
2. **Navigate to Domain List**: Click on "Domain List" in the left sidebar
3. **Manage Domain**: Click "Manage" next to buywhatsg.com
4. **Access DNS Settings**: Click on "Advanced DNS" tab

*Note: Keep this tab open as you'll need to configure DNS records later.*

## Firebase Project Setup

### Step 1: Create Firebase Project

1. **Visit Firebase Console**: Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Create New Project**:
   - Click "Create a project"
   - Enter project name: "BuyWhatSG" or "buywhatsg-production"
   - Choose whether to enable Google Analytics (recommended)
   - Select or create a Google Analytics account
   - Click "Create project"

### Step 2: Configure Firebase Services

#### Enable Authentication
1. **Navigate to Authentication**: In the Firebase console, click "Authentication" in the left sidebar
2. **Get Started**: Click "Get started" if it's your first time
3. **Configure Sign-in Methods**:
   - Click on "Sign-in method" tab
   - Enable the authentication providers you need:
     - Email/Password
     - Google
     - Any other providers your app uses
4. **Configure Authorized Domains**:
   - In the "Sign-in method" tab, scroll down to "Authorized domains"
   - Add "buywhatsg.com" and "www.buywhatsg.com"

#### Setup Firestore Database
1. **Navigate to Firestore**: Click "Firestore Database" in the left sidebar
2. **Create Database**:
   - Click "Create database"
   - Choose "Start in production mode" for security
   - Select a location (choose closest to your users, e.g., asia-southeast1 for Singapore)
3. **Configure Security Rules**: Update rules based on your app's requirements

#### Setup Firebase Storage (if needed)
1. **Navigate to Storage**: Click "Storage" in the left sidebar
2. **Get Started**: Click "Get started"
3. **Configure Security Rules**: Set up rules for file uploads
4. **Choose Location**: Select the same region as your Firestore

### Step 3: Get Firebase Configuration

1. **Project Settings**: Click the gear icon next to "Project Overview"
2. **General Tab**: Scroll down to "Your apps" section
3. **Add Web App**:
   - Click the web icon (</>) to add a web app
   - Enter app nickname: "BuyWhatSG Web"
   - Check "Also set up Firebase Hosting" (important!)
   - Click "Register app"
4. **Copy Configuration**: Copy the Firebase config object for later use

## Environment Configuration

### Step 1: Create Production Environment File

1. **Navigate to Project Root**: Open terminal in your project directory
2. **Create Production Environment File**:

```bash
cp .env .env.production
```

3. **Edit Production Environment Variables**:

```env
# Firebase Configuration (from Firebase Console)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# API Keys for Production
VITE_GEMINI_API_KEY=your_production_gemini_api_key
VITE_OPENAI_API_KEY=your_production_openai_api_key
VITE_ONEMAP_EMAIL=your_onemap_email
VITE_ONEMAP_PASSWORD=your_onemap_password

# Production URL
VITE_APP_URL=https://buywhatsg.com
```

### Step 2: Update .gitignore

Ensure your `.gitignore` includes:

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.production
```

## Building for Production

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build the Application

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

### Step 3: Test the Build Locally (Optional)

```bash
npm run preview
```

## Firebase Hosting Configuration

### Step 1: Initialize Firebase in Your Project

1. **Login to Firebase CLI**:

```bash
firebase login
```

2. **Initialize Firebase Hosting**:

```bash
firebase init hosting
```

3. **Configuration Options**:
   - Select your Firebase project from the list
   - Set public directory to: `dist`
   - Configure as single-page app: `Yes`
   - Set up automatic builds with GitHub: `No` (for now)
   - Don't overwrite `dist/index.html` if prompted

### Step 2: Configure firebase.json

Update your `firebase.json` file with the following configuration:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      },
      {
        "source": "**/*.@(js|css|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "/index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=0, must-revalidate"
          }
        ]
      }
    ]
  }
}
```

## Custom Domain Setup

### Step 1: Deploy to Firebase First

```bash
firebase deploy --only hosting
```

Note the Firebase hosting URL (e.g., `https://your-project.web.app`)

### Step 2: Add Custom Domain in Firebase

1. **Navigate to Hosting**: In Firebase Console, go to "Hosting"
2. **Add Custom Domain**:
   - Click "Add custom domain"
   - Enter: `buywhatsg.com`
   - Click "Continue"
3. **Verify Ownership**: Firebase will provide DNS records to verify domain ownership
4. **Note the DNS Records**: Firebase will show you the required DNS records

### Step 3: Configure DNS in Namecheap

1. **Return to Namecheap**: Go back to your Namecheap "Advanced DNS" tab
2. **Delete Default Records**: Remove any existing A records and CNAME records
3. **Add Firebase DNS Records**: Add the records provided by Firebase:

   **For Root Domain (buywhatsg.com)**:
   - Type: `A Record`
   - Host: `@`
   - Value: `151.101.1.195` (Firebase IP)
   - TTL: `Automatic`
   
   - Type: `A Record`
   - Host: `@`
   - Value: `151.101.65.195` (Firebase IP)
   - TTL: `Automatic`

   **For WWW Subdomain**:
   - Type: `CNAME Record`
   - Host: `www`
   - Value: `buywhatsg.com.`
   - TTL: `Automatic`

4. **Save Changes**: Click "Save all changes"

*Note: DNS propagation can take 24-48 hours, but usually completes within a few hours.*

### Step 4: Complete Domain Setup in Firebase

1. **Return to Firebase Console**: Go back to the custom domain setup
2. **Verify Domain**: Click "Verify" (may take some time for DNS to propagate)
3. **Wait for SSL**: Firebase will automatically provision an SSL certificate

## SSL Certificate Configuration

### Automatic SSL with Firebase

Firebase Hosting automatically provides SSL certificates for custom domains:

1. **Automatic Provisioning**: Once your domain is verified, Firebase automatically provisions an SSL certificate
2. **Let's Encrypt**: Firebase uses Let's Encrypt for SSL certificates
3. **Auto-Renewal**: Certificates are automatically renewed before expiration
4. **HTTPS Redirect**: Firebase automatically redirects HTTP traffic to HTTPS

### Verify SSL Setup

1. **Check Certificate Status**: In Firebase Console > Hosting, verify the SSL status shows "Active"
2. **Test HTTPS**: Visit `https://buywhatsg.com` to ensure SSL is working
3. **Check Certificate Details**: Click the lock icon in your browser to view certificate details

## Deployment Process

### Step 1: Final Build and Deploy

```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Step 2: Set Up Deployment Script

Create a deployment script in `package.json`:

```json
{
  "scripts": {
    "deploy": "npm run build && firebase deploy --only hosting",
    "deploy:preview": "npm run build && firebase hosting:channel:deploy preview"
  }
}
```

### Step 3: Future Deployments

For future updates:

```bash
npm run deploy
```

## Post-Deployment Verification

### Step 1: Functional Testing

1. **Visit Your Site**: Go to `https://buywhatsg.com`
2. **Test All Features**:
   - User authentication
   - Database operations
   - File uploads (if applicable)
   - PWA installation
   - Mobile responsiveness

### Step 2: Performance Testing

1. **Google PageSpeed Insights**: Test your site at [pagespeed.web.dev](https://pagespeed.web.dev)
2. **Lighthouse Audit**: Run Lighthouse in Chrome DevTools
3. **Firebase Performance**: Check Firebase Performance monitoring

### Step 3: Security Verification

1. **SSL Test**: Use [SSL Labs](https://www.ssllabs.com/ssltest/) to test SSL configuration
2. **Security Headers**: Check security headers at [securityheaders.com](https://securityheaders.com)
3. **Firebase Security Rules**: Review and test your Firestore security rules

## Troubleshooting

### Common Issues and Solutions

#### Domain Not Resolving
- **Check DNS Propagation**: Use [whatsmydns.net](https://www.whatsmydns.net) to check DNS propagation
- **Verify DNS Records**: Ensure all DNS records in Namecheap match Firebase requirements
- **Wait for Propagation**: DNS changes can take up to 48 hours

#### SSL Certificate Issues
- **Domain Verification**: Ensure domain ownership is verified in Firebase
- **DNS Records**: Verify all DNS records are correctly configured
- **Wait for Provisioning**: SSL certificate provisioning can take several hours

#### Firebase Deployment Errors
- **Check Firebase CLI**: Ensure you're logged in: `firebase login`
- **Project Selection**: Verify correct project: `firebase use --add`
- **Build Errors**: Check build output for errors: `npm run build`

#### Authentication Issues
- **Authorized Domains**: Ensure your domain is added to Firebase Auth authorized domains
- **CORS Issues**: Check browser console for CORS errors
- **API Keys**: Verify all environment variables are correctly set

### Monitoring and Maintenance

#### Set Up Monitoring
1. **Firebase Analytics**: Enable Google Analytics in Firebase
2. **Performance Monitoring**: Enable Firebase Performance
3. **Crashlytics**: Set up Firebase Crashlytics for error tracking
4. **Uptime Monitoring**: Use services like UptimeRobot or Pingdom

#### Regular Maintenance
1. **Update Dependencies**: Regularly update npm packages
2. **Security Updates**: Monitor for security vulnerabilities
3. **Performance Optimization**: Regular performance audits
4. **Backup**: Regular backups of Firestore data

### Support Resources

- **Firebase Documentation**: [firebase.google.com/docs](https://firebase.google.com/docs)
- **Namecheap Support**: [namecheap.com/support](https://www.namecheap.com/support)
- **Firebase Community**: [firebase.google.com/community](https://firebase.google.com/community)

---

**Congratulations!** Your BuyWhatSG application should now be live at `https://buywhatsg.com` with a secure SSL certificate and professional hosting setup.

For any issues or questions during deployment, refer to the troubleshooting section or consult the official documentation for each service.