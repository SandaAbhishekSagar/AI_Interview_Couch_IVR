# AI Interview Coaching IVR System

A comprehensive AI-powered Interactive Voice Response (IVR) system for interview preparation and coaching. This system helps users practice interviews, receive real-time feedback, and improve their communication skills through voice interactions.

## 🚀 Features

### Core Functionality
- **Voice-Based Interview Practice**: Conduct realistic mock interviews via phone calls
- **Real-Time AI Analysis**: Analyze speech patterns, content quality, and communication effectiveness
- **Personalized Coaching**: Generate tailored feedback and improvement recommendations
- **Progress Tracking**: Monitor improvement over multiple sessions
- **Multi-Industry Support**: Customized questions for different industries and experience levels

### Technical Features
- **Twilio Integration**: Voice handling and speech-to-text
- **MurfAI TTS**: High-quality text-to-speech conversion with natural voices
- **OpenAI GPT-4**: Intelligent question generation and response analysis
- **Voice Analysis**: Speech rate, filler words, confidence assessment, and clarity evaluation
- **Database Tracking**: Comprehensive user profiles, session history, and progress analytics
- **RESTful API**: Complete API for user management and data access

## 🏗️ Architecture

### Backend Stack
- **Node.js** with Express.js
- **PostgreSQL** database with Sequelize ORM
- **Twilio** for voice communications
- **MurfAI** for text-to-speech
- **OpenAI GPT-4** for AI analysis
- **JWT** authentication
- **Winston** logging

### Key Components
```
src/
├── server.js                 # Main application entry point
├── database/
│   ├── connection.js         # Database connection setup
│   └── models/              # Sequelize models
├── services/
│   ├── twilioService.js     # Twilio API integration
│   ├── murfaiService.js     # MurfAI TTS integration
│   ├── openaiService.js     # OpenAI API integration
│   └── voiceAnalysisService.js # Voice analysis algorithms
├── routes/
│   ├── auth.js             # Authentication endpoints
│   ├── users.js            # User management
│   ├── sessions.js         # Session management
│   ├── webhooks.js         # Twilio webhooks
│   ├── audio.js            # Audio file serving
│   └── health.js           # Health checks
└── middleware/
    ├── auth.js             # JWT authentication
    └── errorHandler.js     # Error handling
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Twilio account with phone number
- MurfAI API key (for text-to-speech)
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-interview-coaching-ivr
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# MurfAI Configuration (Text-to-Speech)
MURF_API_KEY=your_murf_api_key
MURF_API_URL=https://api.murf.ai/v1
MURF_DEFAULT_VOICE=en-US-natalie
USE_MURFAI_TTS=true

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ivr_coaching

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Railway Configuration
WEBHOOK_BASE_URL=https://your-app.railway.app
```

4. **Database Setup**
```bash
npm run migrate
npm run seed
```

5. **Start the server**
```bash
npm run dev  # Development mode
npm start    # Production mode
```

## 📱 Twilio Configuration

### Phone Number Setup
1. Purchase a Twilio phone number
2. Configure webhook URL: `https://your-domain.com/webhook/voice`
3. Set HTTP method to POST

### Webhook Endpoints
- **Voice Webhook**: `/webhook/voice` - Handles incoming calls
- **Status Webhook**: `/webhook/status` - Call status updates
- **Menu Handler**: `/webhook/menu` - User menu selections
- **Response Handler**: `/webhook/response` - User responses

## 🔧 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "name": "John Doe",
  "industry": "technology",
  "experienceLevel": "mid",
  "targetRoles": ["Software Engineer", "Product Manager"],
  "email": "john@example.com"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "phoneNumber": "+1234567890"
}
```

### Session Management

#### Start Session
```http
POST /api/sessions/start
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "sessionType": "mock_interview",
  "industry": "technology",
  "roleLevel": "mid"
}
```

#### Submit Response
```http
POST /api/sessions/:sessionId/response
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "questionId": "uuid",
  "text": "User response text",
  "duration": 30
}
```

### User Management

#### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <jwt_token>
```

#### Get User Progress
```http
GET /api/users/progress
Authorization: Bearer <jwt_token>
```

## 🎯 Interview Workflows

### Mock Interview Flow
1. **User calls** the Twilio phone number
2. **System greets** and presents menu options
3. **User selects** mock interview option
4. **AI generates** relevant questions based on user profile
5. **User responds** to questions via voice
6. **System analyzes** responses in real-time
7. **Feedback provided** with scores and recommendations
8. **Session summary** generated upon completion

### Coaching Mode Flow
1. **Assessment** of current skills
2. **Weakness identification** through analysis
3. **Targeted practice** sessions
4. **Progress tracking** over time
5. **Personalized recommendations** for improvement

## 📊 Analytics & Reporting

### Voice Analysis Metrics
- **Speech Rate**: Words per minute analysis
- **Filler Words**: Detection and counting of "um", "uh", etc.
- **Confidence Level**: Language pattern analysis
- **Clarity Score**: Articulation and vocabulary assessment
- **Pause Analysis**: Strategic pause usage evaluation

### Performance Scoring
- **Content Quality** (0-100): Relevance and completeness
- **Structure** (0-100): Organization and STAR method usage
- **Communication** (0-100): Clarity and confidence
- **Industry Knowledge** (0-100): Technical accuracy
- **Overall Score** (0-100): Weighted average

## 🚀 Deployment

### Railway Deployment

1. **Connect to Railway**
```bash
npm install -g @railway/cli
railway login
railway init
```

2. **Add PostgreSQL Database**
```bash
railway add postgresql
```

3. **Set Environment Variables**
```bash
railway variables set TWILIO_ACCOUNT_SID=your_sid
railway variables set TWILIO_AUTH_TOKEN=your_token
railway variables set MURF_API_KEY=your_murf_key
railway variables set OPENAI_API_KEY=your_key
railway variables set JWT_SECRET=your_secret
railway variables set WEBHOOK_BASE_URL=https://your-app.railway.app
```

4. **Deploy**
```bash
railway up
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Yes |
| `TWILIO_PHONE_NUMBER` | Twilio Phone Number | Yes |
| `MURF_API_KEY` | MurfAI API Key for TTS | Yes |
| `MURF_API_URL` | MurfAI API Base URL | No (defaults to https://api.murf.ai/v1) |
| `MURF_DEFAULT_VOICE` | Default MurfAI Voice ID | No (defaults to en-US-natalie) |
| `USE_MURFAI_TTS` | Enable/disable MurfAI TTS | No (defaults to true) |
| `OPENAI_API_KEY` | OpenAI API Key | Yes |
| `DATABASE_URL` | PostgreSQL Connection URL | Yes |
| `JWT_SECRET` | JWT Secret Key | Yes |
| `WEBHOOK_BASE_URL` | Webhook Base URL | Yes |
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server Port | No |

## 🧪 Testing

### Run Tests
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

### Test Coverage
- Unit tests for core functions
- Integration tests for API endpoints
- End-to-end tests for call flows
- Mock tests for external services

## 📈 Monitoring & Logging

### Health Checks
- `/health` - Basic health check
- `/health/detailed` - Detailed system status
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

### Logging
- Structured logging with Winston
- Request/response logging
- Error tracking and reporting
- Performance metrics

## 🔒 Security

### Authentication
- JWT-based authentication
- Phone number verification
- Session management
- Rate limiting

### Data Protection
- Environment variable security
- Database encryption
- Input validation
- CORS configuration

## 📞 Usage Examples

### Phone Call Flow
1. **Call**: User dials the Twilio number
2. **Greeting**: "Welcome to AI Interview Coaching..."
3. **Menu**: "Press 1 for mock interview, 2 for coaching tips..."
4. **Interview**: Questions asked and responses analyzed
5. **Feedback**: Real-time scoring and recommendations
6. **Summary**: Session completion with overall assessment

### API Usage
```javascript
// Start a session
const response = await fetch('/api/sessions/start', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionType: 'mock_interview',
    industry: 'technology',
    roleLevel: 'mid'
  })
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Basic IVR functionality
- ✅ Mock interview sessions
- ✅ Voice analysis
- ✅ Progress tracking

### Phase 2 (Planned)
- 📱 Mobile app companion
- 🌍 Multi-language support
- 📊 Advanced analytics dashboard
- 🔗 Calendar integration

### Phase 3 (Future)
- 🤖 Advanced AI coaching
- 👥 Group interview practice
- 📹 Video interview support
- 🎯 Industry-specific modules

## 💰 Cost Estimates

### Monthly Costs (Estimated)
- **Twilio**: $20-50 (depending on call volume)
- **MurfAI**: $19-99 (depending on characters used, free tier: 100K chars)
- **OpenAI**: $30-100 (depending on API usage)
- **Railway**: $5-20 (hosting and database)
- **Total**: ~$74-269/month

### Cost Optimization
- Implement caching for common responses
- Use OpenAI efficiently with prompt optimization
- Monitor and optimize Twilio usage
- Scale resources based on demand

---

**Built with ❤️ for better interview preparation**
