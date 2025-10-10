#!/bin/bash

echo "🚀 Setting up Railway Database for AI Interview Coaching IVR"
echo "=============================================================="

echo ""
echo "Step 1: Add PostgreSQL to your Railway project"
echo "Run this command:"
echo "railway add postgresql"
echo ""

echo "Step 2: Railway will automatically set DATABASE_URL"
echo "You can verify this by running:"
echo "railway variables | grep DATABASE_URL"
echo ""

echo "Step 3: Set other required environment variables"
echo "railway variables set JWT_SECRET=\"dad961367352c7f68d1be2c987ceb942b6ac8dc0ba46a6076da7548f9e9f177737022affd9d735cc8cf25415a52f95badc35da5e580ed7b4bcb7c35d19601b9f\""
echo "railway variables set NODE_ENV=\"production\""
echo "railway variables set PORT=\"3000\""
echo "railway variables set LOG_LEVEL=\"info\""
echo ""

echo "Step 4: Set your API keys"
echo "railway variables set TWILIO_ACCOUNT_SID=\"your_twilio_account_sid\""
echo "railway variables set TWILIO_AUTH_TOKEN=\"your_twilio_auth_token\""
echo "railway variables set TWILIO_PHONE_NUMBER=\"+1234567890\""
echo "railway variables set OPENAI_API_KEY=\"your_openai_api_key\""
echo ""

echo "Step 5: Set your webhook URL (after deployment)"
echo "railway variables set WEBHOOK_BASE_URL=\"https://your-app-name.railway.app\""
echo ""

echo "✅ That's it! Railway handles all database configuration automatically."
echo ""

echo "🔧 Database Migration Commands:"
echo "railway run npm run migrate  # Run database migrations"
echo "railway run npm run seed     # Seed sample data (optional)"
echo ""

echo "📊 To check your database connection:"
echo "railway run node -e \"console.log('DB URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')\""
