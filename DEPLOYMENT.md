# Deployment Guide for BuyWhatSG

This guide provides step-by-step instructions for deploying the BuyWhatSG application to production with a valid domain and SSL certificate.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Building for Production](#building-for-production)
4. [Domain Setup](#domain-setup)
5. [SSL Certificate](#ssl-certificate)
6. [Deployment Options](#deployment-options)
   - [Firebase Hosting](#firebase-hosting)
   - [Vercel](#vercel)
   - [Netlify](#netlify)
   - [Custom Server](#custom-server)
7. [Post-Deployment Verification](#post-deployment-verification)

## Prerequisites

Before deploying, ensure you have:

- Node.js v18 or higher installed
- Git installed
- Access to your domain registrar (for domain configuration)
- Firebase account (if using Firebase Hosting)
- Vercel or Netlify account (if using these platforms)

## Environment Configuration

The application now includes an environment configuration system that automatically switches between development and production settings.

1. Create a production-specific `.env.production` file:

```bash
cp .env .env.production
```

2. Edit `.env.production` with your production values:

```env
# Gemini API Key for AI-powered photo text extraction
VITE_GEMINI_API_KEY=your_production_gemini_api_key_here

# OpenAI API Key for voice recognition features
VITE_OPENAI_API_KEY=your_production_openai_api_key_here

# Any other production-specific environment variables
```

3. The application will automatically use these values when built for production.

## Building for Production

To create a production build:

```bash
npm run build
```

This will generate optimized files in the `dist` directory, ready for deployment.

## Domain Setup

1. Purchase a domain (e.g., buywhat.sg) from a domain registrar like Namecheap, GoDaddy, or Google Domains.

2. Configure your DNS settings based on your chosen hosting provider:

   - For Firebase Hosting: Add the required A records pointing to Firebase's IP addresses
   - For Vercel/Netlify: Follow their domain configuration instructions
   - For custom hosting: Point your domain to your server's IP address

3. Set up any required subdomains (e.g., www.buywhat.sg).

## SSL Certificate

Secure your site with HTTPS using an SSL certificate:

### Option 1: Let's Encrypt (for custom servers)

1. Install Certbot on your server:

```bash
# For Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot

# For CentOS/RHEL
sudo yum install certbot
```

2. Obtain and install a certificate:

```bash
sudo certbot --nginx -d buywhat.sg -d www.buywhat.sg
```

3. Set up auto-renewal:

```bash
sudo certbot renew --dry-run
```

### Option 2: Managed SSL (for hosting platforms)

Firebase Hosting, Vercel, and Netlify all provide free SSL certificates and handle the setup automatically when you configure your custom domain.

## Deployment Options

### Firebase Hosting

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Login to Firebase:

```bash
firebase login
```

3. Initialize Firebase in your project (if not already done):

```bash
firebase init hosting
```

4. Configure `firebase.json` for SPA routing:

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
        "source": "/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000"
          }
        ]
      },
      {
        "source": "/@(js|css)/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000"
          }
        ]
      },
      {
        "source": "/@(img|icons)/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000"
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

5. Deploy to Firebase:

```bash
npm run build
firebase deploy
```

6. Configure your custom domain in the Firebase Console under Hosting > Add custom domain.

### Vercel

1. Install Vercel CLI:

```bash
npm install -g vercel
```

2. Deploy to Vercel:

```bash
vercel
```

3. For production deployment:

```bash
vercel --prod
```

4. Configure your custom domain in the Vercel dashboard.

### Netlify

1. Install Netlify CLI:

```bash
npm install -g netlify-cli
```

2. Deploy to Netlify:

```bash
netlify deploy
```

3. For production deployment:

```bash
netlify deploy --prod
```

4. Configure your custom domain in the Netlify dashboard.

### Custom Server

If you're using your own server:

1. Set up a web server (Nginx or Apache):

```bash
# For Ubuntu/Debian with Nginx
sudo apt-get update
sudo apt-get install nginx
```

2. Configure Nginx for your application:

```nginx
server {
    listen 80;
    server_name buywhat.sg www.buywhat.sg;

    location / {
        root /var/www/buywhat.sg;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
}
```

3. Upload your build files:

```bash
scp -r dist/* user@your-server:/var/www/buywhat.sg/
```

4. Set up SSL with Let's Encrypt as described above.

## Post-Deployment Verification

After deployment, verify that:

1. The website loads correctly at your domain (https://buywhat.sg)
2. HTTPS is working properly (green lock icon in browser)
3. All features work as expected
4. PWA installation works correctly
5. Firebase authentication and database connections are functioning

## Troubleshooting

### Common Issues

1. **White screen after deployment**: Check browser console for errors. Ensure all paths are correct and the server is configured to serve the SPA correctly.

2. **API calls failing**: Verify that your environment variables are correctly set and that CORS is properly configured.

3. **SSL certificate issues**: Ensure your certificate is properly installed and renewed.

4. **Firebase connection issues**: Check that your Firebase configuration is correct for the production environment.

### Monitoring

Consider setting up monitoring for your production application:

- Firebase Performance Monitoring
- Google Analytics
- Sentry for error tracking

---

For additional support or questions, please refer to the project documentation or contact the development team.