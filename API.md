# API Documentation - AI Interview Coaching IVR System

This document provides comprehensive API documentation for the AI Interview Coaching IVR System.

## Base URL
```
Production: https://your-app.railway.app
Development: http://localhost:3000
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Health Check

#### GET /health
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "api": "operational"
  }
}
```

#### GET /health/detailed
Detailed health check with system information.

### Authentication

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "phoneNumber": "+15551234567",
  "name": "John Doe",
  "industry": "technology",
  "experienceLevel": "mid",
  "targetRoles": ["Software Engineer", "Product Manager"],
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+15551234567",
      "name": "John Doe",
      "industry": "technology",
      "experienceLevel": "mid",
      "targetRoles": ["Software Engineer"],
      "totalSessions": 0,
      "averageScore": null
    },
    "token": "jwt_token"
  }
}
```

#### POST /api/auth/login
Login an existing user.

**Request Body:**
```json
{
  "phoneNumber": "+15551234567"
}
```

#### GET /api/auth/verify
Verify JWT token and get user profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### POST /api/auth/phone-auth
Authenticate user by phone number (for IVR system).

**Request Body:**
```json
{
  "phoneNumber": "+15551234567"
}
```

### User Management

#### GET /api/users/profile
Get user profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+15551234567",
      "name": "John Doe",
      "email": "john@example.com",
      "industry": "technology",
      "experienceLevel": "mid",
      "targetRoles": ["Software Engineer"],
      "preferences": {
        "sessionDuration": 30,
        "difficultyLevel": "medium",
        "focusAreas": ["behavioral", "technical"],
        "language": "en-US"
      },
      "totalSessions": 5,
      "averageScore": 85.5,
      "lastActiveAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### PUT /api/users/profile
Update user profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com",
  "industry": "finance",
  "experienceLevel": "senior",
  "targetRoles": ["Senior Software Engineer", "Tech Lead"],
  "preferences": {
    "sessionDuration": 45,
    "difficultyLevel": "hard"
  }
}
```

#### GET /api/users/sessions
Get user's session history.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `limit` (optional): Number of sessions to return (default: 10)
- `offset` (optional): Number of sessions to skip (default: 0)
- `sessionType` (optional): Filter by session type
- `status` (optional): Filter by session status

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "sessionType": "mock_interview",
        "industry": "technology",
        "roleLevel": "mid",
        "status": "completed",
        "scores": {
          "overall": 85,
          "content": 80,
          "structure": 85,
          "communication": 90,
          "industryKnowledge": 85
        },
        "duration": 1800,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "completedAt": "2024-01-01T00:30:00.000Z"
      }
    ],
    "total": 5,
    "limit": 10,
    "offset": 0
  }
}
```

#### GET /api/users/progress
Get user's progress tracking data.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "progress": [
      {
        "id": "uuid",
        "skillArea": "communication",
        "baselineScore": 70,
        "currentScore": 85,
        "targetScore": 90,
        "improvementPercentage": 21.43,
        "practiceCount": 10,
        "lastPracticedAt": "2024-01-01T00:00:00.000Z",
        "milestones": [
          {
            "threshold": 20,
            "achievedAt": "2024-01-01T00:00:00.000Z",
            "score": 85,
            "description": "Achieved 20% improvement in communication"
          }
        ]
      }
    ],
    "overall": {
      "totalSkills": 6,
      "averageImprovement": 18.5,
      "topSkill": "communication",
      "needsImprovement": ["technical", "confidence"],
      "recentMilestones": []
    }
  }
}
```

#### GET /api/users/stats
Get user's statistics and performance metrics.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalSessions": 10,
      "averageScore": 85,
      "currentLevel": "mid",
      "industry": "technology"
    },
    "sessions": {
      "totalSessions": 10,
      "averageScore": 85,
      "averageDuration": 1800,
      "improvementTrend": [
        {
          "date": "2024-01-01T00:00:00.000Z",
          "score": 85
        }
      ]
    },
    "progress": {
      "totalSkills": 6,
      "averageImprovement": 18.5,
      "topSkill": "communication",
      "needsImprovement": ["technical"],
      "recentMilestones": []
    },
    "trends": {
      "improvement": [],
      "sessionsThisMonth": 3,
      "averageSessionDuration": 1800
    }
  }
}
```

#### GET /api/users/recommendations
Get personalized coaching recommendations.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": {
      "immediate": [
        {
          "action": "Practice behavioral questions using STAR method",
          "priority": "high",
          "reason": "Improve structured responses"
        }
      ],
      "longTerm": [
        {
          "goal": "Achieve 80+ overall interview score",
          "timeline": "3 months",
          "milestones": ["Complete 10 practice sessions", "Improve confidence score"]
        }
      ],
      "focusAreas": ["communication", "confidence"],
      "nextSession": {
        "type": "mock_interview",
        "duration": 30,
        "focus": "communication"
      }
    },
    "basedOn": {
      "totalSessions": 10,
      "averageScore": 85,
      "recentPerformance": {
        "overall": 85,
        "content": 80,
        "structure": 85,
        "communication": 90
      }
    }
  }
}
```

### Session Management

#### POST /api/sessions/start
Start a new interview session.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "sessionType": "mock_interview",
  "industry": "technology",
  "roleLevel": "mid",
  "callSid": "CA1234567890abcdef"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session started successfully",
  "data": {
    "session": {
      "id": "uuid",
      "sessionType": "mock_interview",
      "industry": "technology",
      "roleLevel": "mid",
      "status": "active",
      "questions": [
        {
          "id": "q1",
          "text": "Tell me about yourself",
          "category": "behavioral",
          "difficulty": "medium",
          "expectedKeywords": ["experience", "background"],
          "evaluationCriteria": ["clarity", "relevance"]
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### POST /api/sessions/:sessionId/response
Submit a response to an interview question.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "questionId": "q1",
  "text": "I am a software engineer with 5 years of experience...",
  "duration": 45,
  "transcription": "I am a software engineer with 5 years of experience..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Response submitted successfully",
  "data": {
    "analysis": {
      "scores": {
        "content": 80,
        "structure": 85,
        "communication": 90,
        "industryKnowledge": 85,
        "overall": 85
      },
      "feedback": {
        "strengths": ["Clear communication", "Good examples"],
        "weaknesses": ["Could use more structure"],
        "suggestions": ["Practice STAR method"]
      },
      "voiceAnalysis": {
        "score": 85,
        "level": "good"
      }
    },
    "nextQuestion": {
      "id": "q2",
      "text": "Describe a challenging project",
      "category": "behavioral"
    }
  }
}
```

#### POST /api/sessions/:sessionId/complete
Complete an interview session.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Session completed successfully",
  "data": {
    "session": {
      "id": "uuid",
      "status": "completed",
      "completedAt": "2024-01-01T00:30:00.000Z",
      "duration": 1800,
      "scores": {
        "overall": 85,
        "content": 80,
        "structure": 85,
        "communication": 90
      }
    },
    "summary": {
      "totalQuestions": 5,
      "questionsAnswered": 5,
      "averageScore": 85,
      "strengths": ["Communication", "Industry Knowledge"],
      "areasForImprovement": ["Structure", "Confidence"],
      "keyInsights": ["Good overall performance"],
      "nextSteps": ["Practice STAR method"]
    }
  }
}
```

#### GET /api/sessions/:sessionId
Get detailed session information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### GET /api/sessions/:sessionId/analytics
Get detailed session analytics.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "performance": {
        "overallScore": 85,
        "breakdown": {
          "content": 80,
          "structure": 85,
          "communication": 90,
          "industryKnowledge": 85
        }
      },
      "voiceMetrics": {
        "speechRate": 150,
        "fillerWords": 3,
        "confidence": 85,
        "clarity": 90
      },
      "progress": {
        "questionsAnswered": 5,
        "totalQuestions": 5,
        "completionRate": 100
      },
      "insights": [
        {
          "type": "success",
          "message": "Excellent performance!"
        }
      ],
      "recommendations": {
        "immediateActions": [],
        "longTermGoals": [],
        "practicePlan": {
          "focusAreas": ["maintenance"],
          "sessionFrequency": "weekly",
          "sessionDuration": "30 minutes"
        }
      }
    }
  }
}
```

### Webhook Endpoints

#### POST /webhook/voice
Twilio voice webhook for incoming calls.

**Request Body (Twilio format):**
```
CallSid=CA1234567890abcdef&From=%2B15551234567&To=%2B15551234568&CallStatus=ringing&Direction=inbound
```

**Response:**
TwiML response for voice interaction.

#### POST /webhook/menu
Handle user menu selections.

#### POST /webhook/response
Handle user responses to interview questions.

#### POST /webhook/status
Handle call status updates.

### Audio Endpoints (MurfAI Integration)

#### GET /audio/:filename
Serve generated audio files for Twilio playback.

**URL Parameters:**
- `filename` - Audio file name (e.g., `abc123def456.mp3`)

**Response:**
Binary audio data with appropriate content-type headers.

**Headers:**
```
Content-Type: audio/mpeg (for MP3) or audio/wav (for WAV)
Cache-Control: public, max-age=86400
Access-Control-Allow-Origin: *
```

**Example:**
```
GET /audio/abc123def456.mp3
```

#### GET /audio
List all cached audio files (for management purposes).

**Response:**
```json
{
  "count": 15,
  "files": [
    {
      "filename": "abc123def456.mp3",
      "size": 45678,
      "created": "2024-01-01T00:00:00.000Z",
      "modified": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description",
  "details": [] // Optional validation details
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (inactive account)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable

## Rate Limiting

The API implements rate limiting:
- **Window**: 15 minutes
- **Limit**: 100 requests per IP address
- **Headers**: Rate limit information included in response headers

## Data Models

### User
```json
{
  "id": "uuid",
  "phoneNumber": "+15551234567",
  "name": "John Doe",
  "email": "john@example.com",
  "industry": "technology",
  "experienceLevel": "mid",
  "targetRoles": ["Software Engineer"],
  "preferences": {
    "sessionDuration": 30,
    "difficultyLevel": "medium",
    "focusAreas": ["behavioral", "technical"],
    "language": "en-US"
  },
  "isActive": true,
  "totalSessions": 5,
  "averageScore": 85.5,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Session
```json
{
  "id": "uuid",
  "userId": "uuid",
  "sessionType": "mock_interview",
  "industry": "technology",
  "roleLevel": "mid",
  "callSid": "CA1234567890abcdef",
  "status": "completed",
  "questions": [],
  "responses": [],
  "scores": {
    "overall": 85,
    "content": 80,
    "structure": 85,
    "communication": 90,
    "industryKnowledge": 85
  },
  "metrics": {
    "speechRate": 150,
    "fillerWords": 3,
    "pauseCount": 5,
    "averagePauseLength": 1.2,
    "confidenceLevel": 85
  },
  "feedback": {
    "strengths": ["Communication"],
    "weaknesses": ["Structure"],
    "suggestions": ["Practice STAR method"]
  },
  "duration": 1800,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:30:00.000Z"
}
```

### Progress
```json
{
  "id": "uuid",
  "userId": "uuid",
  "skillArea": "communication",
  "baselineScore": 70,
  "currentScore": 85,
  "targetScore": 90,
  "improvementPercentage": 21.43,
  "practiceCount": 10,
  "lastPracticedAt": "2024-01-01T00:00:00.000Z",
  "milestones": [],
  "recommendations": [],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://your-app.railway.app',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Start session
const session = await api.post('/api/sessions/start', {
  sessionType: 'mock_interview',
  industry: 'technology',
  roleLevel: 'mid'
});

// Submit response
const analysis = await api.post(`/api/sessions/${sessionId}/response`, {
  questionId: 'q1',
  text: 'My response...',
  duration: 45
});
```

### Python
```python
import requests

BASE_URL = 'https://your-app.railway.app'
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Start session
response = requests.post(f'{BASE_URL}/api/sessions/start', 
                        json={
                            'sessionType': 'mock_interview',
                            'industry': 'technology',
                            'roleLevel': 'mid'
                        },
                        headers=headers)

# Submit response
response = requests.post(f'{BASE_URL}/api/sessions/{session_id}/response',
                        json={
                            'questionId': 'q1',
                            'text': 'My response...',
                            'duration': 45
                        },
                        headers=headers)
```

---

For more information, please refer to the main README.md file or contact support.
