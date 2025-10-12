# Complete Menu Options Guide 📞

## 🎯 Overview: What Each Button Does

Your IVR system has **3 menu options** when someone calls:

```
"Welcome to AI Interview Coaching. I'm your personal interview coach.
 Press 1 for a mock interview,
 Press 2 for coaching tips,
 or Press 3 to speak to a representative.
 What would you like to do today?"
```

---

## 1️⃣ Press 1: Mock Interview (Full Practice)

### **Purpose**
Complete interview simulation for serious preparation

### **What Happens**
1. ✅ User profile created/loaded from database
2. ✅ Interview session started
3. ✅ AI generates **5 personalized questions** based on:
   - Industry (technology, finance, healthcare, etc.)
   - Experience level (junior, mid, senior)
   - Previous questions (avoids repetition)
4. ✅ Each question played with natural MurfAI voice
5. ✅ User's answer recorded (up to 60 seconds)
6. ✅ AI analyzes each answer:
   - **Content Quality** (0-100): Relevance, completeness
   - **Structure** (0-100): Organization, STAR method
   - **Communication** (0-100): Clarity, confidence
   - **Industry Knowledge** (0-100): Technical accuracy
   - **Overall Score** (0-100): Weighted average
7. ✅ Scores saved to database
8. ✅ Progress tracked over multiple sessions

### **Duration**: 8-12 minutes

### **Example Questions**:
- "Tell me about a time when you had to work with a difficult team member."
- "Describe a challenging project you completed and your role in it."
- "How do you handle tight deadlines and multiple priorities?"
- "Tell me about a failure and what you learned from it."
- "Describe your approach to solving complex technical problems."

### **User Journey**:
```
Press 1
  ↓
"Please hold while I prepare..." (2s)
  ↓
"Here's your first question: [Question 1]" (MurfAI voice)
  ↓
User answers (records)
  ↓
"Thank you, please hold..." (2s)
  ↓
"Here's your next question: [Question 2]" (MurfAI voice)
  ↓
[Repeats 5 times]
  ↓
"Thank you for completing the interview!"
  ↓
Call ends, scores saved
```

### **What Gets Saved**:
```javascript
{
  sessionType: "mock_interview",
  questions: [/* 5 questions */],
  responses: [/* 5 answers with recordings */],
  scores: {
    overall: 85,
    content: 82,
    structure: 87,
    communication: 90,
    industryKnowledge: 81
  },
  feedback: {
    strengths: ["Clear communication", "Good examples"],
    weaknesses: ["Could use more structure"],
    suggestions: ["Practice STAR method"]
  }
}
```

---

## 2️⃣ Press 2: Coaching Tips (Quick Practice)

### **Purpose**
Shorter session focused on foundational skills

### **What Happens**
1. ✅ Creates coaching session
2. ✅ Generates **3 questions** (fewer than mock interview)
3. ✅ Focuses on:
   - Behavioral questions
   - Communication skills
   - Self-reflection
4. ✅ Records and analyzes answers
5. ✅ Provides basic feedback

### **Duration**: 5-8 minutes

### **Example Questions**:
- "Tell me about yourself and your background."
- "Describe a time when you had to work under pressure."
- "What are your greatest strengths and how do they apply to this role?"

### **Differences from Press 1**:
| Feature | Mock Interview (1) | Coaching (2) |
|---------|-------------------|--------------|
| Questions | 5 | 3 |
| Focus | Technical + Behavioral | Behavioral + Communication |
| Analysis | Detailed scores | Basic feedback |
| Duration | 8-12 min | 5-8 min |
| Best For | Experienced users | Beginners |

### **User Journey**:
```
Press 2
  ↓
"Let me start your coaching session..."
  ↓
"Here's your first question: Tell me about yourself"
  ↓
User answers
  ↓
[3 questions total - shorter loop]
  ↓
"Thank you for completing the coaching session!"
  ↓
Call ends
```

---

## 3️⃣ Press 3: Speak to Representative (Human Support)

### **Current Implementation**
**Provides contact information only** (no live transfer)

**What happens**:
```
Press 3
  ↓
"I'm transferring you to a representative..."
  ↓
"For immediate assistance, please call 1-800-123-4567 
 or email support@yourcompany.com"
  ↓
Call ends
```

### **To Enable Live Transfer**

**Option A: Set Environment Variable** (Recommended)
```bash
# In Railway
railway variables set SUPPORT_PHONE_NUMBER=+15551234567

# Or in .env file
SUPPORT_PHONE_NUMBER=+15551234567
```

The system will automatically transfer calls to that number!

**Option B: Hardcode in Code**
Edit `src/routes/webhooks.js` line 1035-1036:
```javascript
// Uncomment and add your number:
twiml.dial('+15551234567'); // Your support number
```

### **After Enabling Transfer**:
```
Press 3
  ↓
"I'm transferring you to a representative. Please hold..."
  ↓
[Call rings your support number]
  ↓
Support person answers
  ↓
Caller talks to real person
```

---

## 🎬 Complete Menu Flow Diagram

```
                    INCOMING CALL
                         │
                         ↓
              ┌──────────────────────┐
              │   WELCOME MESSAGE    │
              │  (MurfAI Natural     │
              │   Voice)             │
              └──────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     Press 1          Press 2          Press 3
        │                │                │
        ↓                ↓                ↓
┌──────────────┐  ┌──────────────┐  ┌─────────────┐
│MOCK INTERVIEW│  │   COACHING   │  │REPRESENTATIVE│
│              │  │              │  │             │
│ 5 Questions  │  │ 3 Questions  │  │ Transfer or │
│              │  │              │  │ Contact Info│
│ 8-12 min     │  │ 5-8 min      │  │ Immediate   │
│              │  │              │  │             │
│ AI Analysis  │  │ Basic        │  │ Human Help  │
│              │  │ Feedback     │  │             │
│              │  │              │  │             │
│ Saves to DB  │  │ Saves to DB  │  │ No DB       │
└──────────────┘  └──────────────┘  └─────────────┘
        │                │                │
        └────────────────┴────────────────┘
                         │
                         ↓
                  CALL COMPLETE
                  THANK YOU MESSAGE
                      HANGUP
```

---

## 📊 What's Stored in Database

### **After Press 1 (Mock Interview)**:
```javascript
Session {
  sessionType: "mock_interview",
  questions: 5,
  responses: 5,
  scores: { overall: 85, ... },
  duration: 720 seconds,
  status: "completed"
}

User {
  totalSessions: 3, // Incremented
  averageScore: 82.5, // Updated
  lastActive: "2025-10-11"
}
```

### **After Press 2 (Coaching)**:
```javascript
Session {
  sessionType: "coaching",
  questions: 3,
  responses: 3,
  scores: { overall: 78, ... },
  duration: 420 seconds,
  status: "completed"
}
```

### **After Press 3 (Representative)**:
No database entry (just transfers or provides info)

---

## 💡 Quick Summary

**Press 1**: Full 5-question interview with detailed AI analysis ⭐⭐⭐⭐⭐  
**Press 2**: Quick 3-question practice session ⭐⭐⭐  
**Press 3**: Human support (currently just provides contact info) ⭐

**All three options work!** Your system is fully functional! 🎉

---

## 🚀 To Enable Live Transfer (Optional)

Add to Railway:
```bash
railway variables set SUPPORT_PHONE_NUMBER=+15551234567
```

Then deploy:
```bash
git add .
git commit -m "Add support phone number configuration"
git push origin main
```

Now Press 3 will actually transfer calls to your support team! 📞

---

**Your IVR system is complete and production-ready!** All three menu options are functional. 🎊
