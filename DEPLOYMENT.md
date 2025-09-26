# Deployment Guide - AI Interview Coaching IVR System

This guide provides step-by-step instructions for deploying the AI Interview Coaching IVR System to Railway.

## 🚀 Railway Deployment

### Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Push your code to GitHub
3. **Required API Keys**:
   - Twilio Account SID and Auth Token
   - OpenAI API Key
   - JWT Secret Key

### Step 1: Create Railway Project

1. **Login to Railway**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize Project**
   ```bash
   railway init
   ```

3. **Connect to GitHub** (if not already connected)
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

### Step 2: Add PostgreSQL Database

1. **Add Database Service**
   ```bash
   railway add postgresql
   ```

2. **Get Database URL**
   ```bash
   railway variables
   ```
   Copy the `DATABASE_URL` value.

### Step 3: Configure Environment Variables

Set all required environment variables in Railway:

```bash
# Twilio Configuration
railway variables set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
railway variables set TWILIO_AUTH_TOKEN=your_auth_token_here
railway variables set TWILIO_PHONE_NUMBER=+1234567890

# OpenAI Configuration
railway variables set OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database Configuration (automatically set by Railway)
# DATABASE_URL is automatically configured

# JWT Configuration
railway variables set JWT_SECRET=your_super_secret_jwt_key_here

# Server Configuration
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Webhook Configuration
railway variables set WEBHOOK_BASE_URL=https://your-app-name.railway.app

# Rate Limiting
railway variables set RATE_LIMIT_WINDOW_MS=900000
railway variables set RATE_LIMIT_MAX_REQUESTS=100

# Logging
railway variables set LOG_LEVEL=info
```

### Step 4: Deploy Application

1. **Deploy from CLI**
   ```bash
   railway up
   ```

2. **Or Deploy from Dashboard**
   - Push code to GitHub
   - Railway will automatically deploy

### Step 5: Configure Twilio Webhooks

1. **Get Railway App URL**
   - Go to Railway dashboard
   - Copy your app URL (e.g., `https://your-app-name.railway.app`)

2. **Configure Twilio Phone Number**
   - Login to Twilio Console
   - Go to Phone Numbers → Manage → Active Numbers
   - Click on your phone number
   - Set webhook URL: `https://your-app-name.railway.app/webhook/voice`
   - Set HTTP method to `POST`
   - Save configuration

### Step 6: Initialize Database

1. **Run Database Migrations**
   ```bash
   railway run npm run migrate
   ```

2. **Seed Initial Data** (optional)
   ```bash
   railway run npm run seed
   ```

### Step 7: Test Deployment

1. **Health Check**
   ```bash
   curl https://your-app-name.railway.app/health
   ```

2. **Test Phone Call**
   - Call your Twilio phone number
   - Verify the IVR system responds correctly

## 🔧 Configuration Details

### Railway Configuration File

The `railway.toml` file configures the deployment:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[environments.production]
variables = { NODE_ENV = "production" }
```

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_auth_token_here` |
| `TWILIO_PHONE_NUMBER` | Twilio Phone Number | `+1234567890` |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `DATABASE_URL` | PostgreSQL URL | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | JWT Secret | `your_super_secret_key` |
| `WEBHOOK_BASE_URL` | App URL | `https://your-app.railway.app` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server Port | `3000` |

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database URL
   railway variables | grep DATABASE_URL
   
   # Test connection
   railway run node -e "console.log(process.env.DATABASE_URL)"
   ```

2. **Twilio Webhook Not Working**
   - Verify webhook URL is correct
   - Check Railway app is deployed and accessible
   - Test webhook endpoint manually

3. **OpenAI API Errors**
   ```bash
   # Check API key
   railway variables | grep OPENAI_API_KEY
   
   # Test API call
   railway run node -e "console.log('API Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing')"
   ```

4. **Application Not Starting**
   ```bash
   # Check logs
   railway logs
   
   # Check environment variables
   railway variables
   ```

### Debugging Commands

```bash
# View logs
railway logs

# Check environment variables
railway variables

# Run shell in Railway environment
railway shell

# Test database connection
railway run node src/database/test-connection.js

# Check application health
curl https://your-app-name.railway.app/health/detailed
```

## 📊 Monitoring

### Health Checks

Railway automatically monitors these endpoints:
- `/health` - Basic health check
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### Logs

Access logs through Railway dashboard or CLI:
```bash
railway logs --follow
```

### Metrics

Monitor these key metrics:
- Response times
- Error rates
- Database connections
- API call success rates

## 🔒 Security Considerations

### Environment Variables
- Never commit sensitive data to Git
- Use Railway's secure environment variable storage
- Rotate API keys regularly

### Network Security
- Railway provides HTTPS by default
- Webhook URLs use HTTPS
- Database connections are encrypted

### API Security
- JWT tokens for authentication
- Rate limiting enabled
- Input validation on all endpoints

## 🚀 Scaling

### Horizontal Scaling
Railway automatically scales based on demand. For high traffic:
- Upgrade Railway plan
- Implement caching
- Optimize database queries

### Performance Optimization
- Enable compression
- Implement response caching
- Optimize OpenAI API usage
- Use database connection pooling

## 🔄 CI/CD Pipeline

### Automatic Deployment
Railway automatically deploys when you push to GitHub:
1. Push code to main branch
2. Railway detects changes
3. Builds and deploys automatically
4. Runs health checks

### Manual Deployment
```bash
# Deploy specific branch
railway up --detach

# Deploy with specific environment
railway up --environment production
```

## 📞 Twilio Configuration

### Phone Number Setup
1. **Purchase Number**: Buy a phone number in Twilio Console
2. **Configure Webhook**: Set webhook URL to your Railway app
3. **Test Calls**: Verify the system responds correctly

### Webhook Configuration
```
Webhook URL: https://your-app-name.railway.app/webhook/voice
HTTP Method: POST
Fallback URL: (optional)
Status Callback URL: https://your-app-name.railway.app/webhook/status
```

## 💰 Cost Optimization

### Railway Costs
- **Hobby Plan**: $5/month (suitable for development)
- **Pro Plan**: $20/month (recommended for production)
- **Database**: Included in plan

### API Costs
- **Twilio**: ~$0.01-0.05 per minute of calls
- **OpenAI**: ~$0.01-0.03 per API call
- **Total**: Estimate $50-150/month for moderate usage

### Cost Reduction Tips
1. Implement caching for common responses
2. Optimize OpenAI prompts to reduce tokens
3. Use efficient database queries
4. Monitor usage and set alerts

## 🔧 Maintenance

### Regular Tasks
- Monitor logs for errors
- Check API usage and costs
- Update dependencies
- Backup database regularly

### Updates
```bash
# Update dependencies
npm update

# Deploy updates
git add .
git commit -m "Update dependencies"
git push origin main
```

---

**Deployment completed successfully! 🎉**

Your AI Interview Coaching IVR System is now live and ready to help users improve their interview skills.
