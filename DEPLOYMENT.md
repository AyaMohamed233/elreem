# Deployment Guide - Elreem Bag Store

This guide provides step-by-step instructions for deploying the Elreem Bag Store to various cloud platforms.

## Prerequisites

- Node.js 16+ installed
- PostgreSQL database (local or cloud)
- Git repository with your code

## Environment Variables

All deployments require these environment variables:

```env
# Required
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-super-secure-session-secret

# Admin Account
ADMIN_EMAIL=admin@elreem.com
ADMIN_PASSWORD=secure-admin-password

# Optional
PORT=8080
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

## Railway Deployment (Recommended)

Railway provides easy PostgreSQL hosting and automatic deployments.

### Step 1: Prepare Your Repository
1. Push your code to GitHub
2. Ensure `.env` is in `.gitignore`
3. Verify `package.json` has correct start script

### Step 2: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository

### Step 3: Add PostgreSQL Database
1. In your Railway project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will create a database and provide `DATABASE_URL`

### Step 4: Configure Environment Variables
1. Go to your web service → "Variables" tab
2. Add all required environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=(copy from PostgreSQL service)
   SESSION_SECRET=your-secure-secret
   ADMIN_EMAIL=admin@elreem.com
   ADMIN_PASSWORD=secure-password
   ```

### Step 5: Deploy
1. Railway automatically deploys on git push
2. Check logs for any issues
3. Visit your app URL to verify deployment

### Step 6: Initialize Database
1. Go to Railway dashboard → your web service
2. Open "Deploy" tab → "View Logs"
3. The app will automatically create tables on first run

## Render Deployment

### Step 1: Create Database
1. Go to [render.com](https://render.com)
2. Create new PostgreSQL database
3. Note the connection details

### Step 2: Create Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

### Step 3: Set Environment Variables
Add in Render dashboard:
```
NODE_ENV=production
DATABASE_URL=postgresql://... (from your database)
SESSION_SECRET=your-secure-secret
ADMIN_EMAIL=admin@elreem.com
ADMIN_PASSWORD=secure-password
```

### Step 4: Deploy
1. Click "Create Web Service"
2. Render will build and deploy automatically
3. Check logs for any issues

## Heroku Deployment

### Step 1: Install Heroku CLI
```bash
npm install -g heroku
heroku login
```

### Step 2: Create Heroku App
```bash
heroku create your-app-name
heroku addons:create heroku-postgresql:mini
```

### Step 3: Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-secure-secret
heroku config:set ADMIN_EMAIL=admin@elreem.com
heroku config:set ADMIN_PASSWORD=secure-password
```

### Step 4: Deploy
```bash
git push heroku main
heroku run npm run init-db
heroku open
```

## Manual Server Deployment

### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
```

### Step 2: Database Setup
```bash
sudo -u postgres psql
CREATE DATABASE elreem_store;
CREATE USER elreem_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE elreem_store TO elreem_user;
\q
```

### Step 3: Application Setup
```bash
# Clone repository
git clone your-repo-url
cd elreem-bag-store

# Install dependencies
npm install --production

# Set environment variables
cp .env.example .env
# Edit .env with your settings

# Initialize database
npm run init-db
```

### Step 4: Process Management
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name elreem-store

# Setup auto-restart
pm2 startup
pm2 save
```

### Step 5: Nginx Setup (Optional)
```bash
sudo apt install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/elreem-store
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/elreem-store /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Post-Deployment Checklist

1. **Test Health Endpoint**: Visit `/health` to verify database connection
2. **Admin Login**: Test admin login with configured credentials
3. **Create Test Order**: Verify shopping cart and order functionality
4. **Check Logs**: Monitor application logs for any errors
5. **SSL Certificate**: Set up HTTPS for production (Let's Encrypt recommended)
6. **Monitoring**: Set up monitoring and alerts
7. **Backups**: Configure database backups

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check database server is running and accessible
- Verify firewall settings allow connections

### Application Won't Start
- Check Node.js version (16+ required)
- Verify all environment variables are set
- Check application logs for specific errors

### 502/503 Errors
- Verify application is running on correct port
- Check reverse proxy configuration
- Monitor server resources (CPU, memory)

## Support

For deployment issues:
1. Check application logs first
2. Verify environment variables
3. Test database connection with `npm run test-db`
4. Check the health endpoint `/health`

## Security Notes

- Always use HTTPS in production
- Keep dependencies updated
- Use strong passwords and secrets
- Enable database SSL in production
- Implement rate limiting (already included)
- Regular security audits with `npm audit`
