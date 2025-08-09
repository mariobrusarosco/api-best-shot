# Best Shot System Flow - Complete Architecture

This document explains the complete flow of the Best Shot automated sports data update system.

## 🎯 **System Purpose**

This is a **sports data automation system** that:
- Monitors real football/soccer matches
- Automatically updates scores when games finish
- Recalculates tournament standings and tables
- Keeps your app's data fresh without manual intervention

## 🔄 **Complete System Flow**

### **Phase 1: Schedule Creation**
```
POST /api/v2/data-provider/scheduler
↓
API checks current day matches in database
↓
Creates EventBridge schedules for each tournament
↓
Schedule triggers 2 minutes after creation (for testing)
```

### **Phase 2: Scheduled Execution**
```
EventBridge Scheduler (2 minutes later)
↓
Triggers AWS Lambda: caller-scores-and-standings
↓
Lambda receives event data with target URLs
↓
Lambda makes PATCH requests to update data
```

### **Phase 3: Data Updates**
```
Lambda → PATCH /tournaments/:id/matches/:round
       → Scrapes sports websites for match results
       → Updates scores in database
       
Lambda → PATCH /tournaments/:id/standings  
       → Recalculates tournament tables
       → Updates standings in database
```

## 🏗️ **Detailed Architecture**

### **1. Schedule Creation Flow**

#### **Input:**
```http
POST https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/scheduler
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **What Happens Inside:**
```javascript
// API finds today's matches
const currentDayMatches = await MatchQueries.currentDayMatchesOnDatabase();

// For each unique tournament, creates a schedule:
{
  targetInput: {
    standingsUrl: "https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/tournaments/123/standings",
    roundUrl: "https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/tournaments/123/matches/round-1",
    targetEnv: "demo"  // or "production"
  },
  cronExpression: "cron(56 21 9 8 ? 2025)", // 2 minutes from now
  id: "brasileiro_betano_2025_08_09_21_56"
}
```

#### **AWS Resources Created:**
- **EventBridge Schedule**: `brasileiro_betano_2025_08_09_21_56`
- **Schedule Group**: `scores-and-standings-routine`
- **Target**: Lambda function `caller-scores-and-standings`

### **2. Lambda Execution Flow**

#### **Event Data Received:**
```javascript
{
  standingsUrl: "https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/tournaments/123/standings",
  roundUrl: "https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/tournaments/123/matches/round-1",
  targetEnv: "demo"
}
```

#### **Lambda Processing:**
```javascript
// Lambda authenticates using internal token
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// Makes two PATCH requests:
// 1. Update match scores
await axios.patch(event.roundUrl, null, {
  headers: { 'X-Internal-Token': INTERNAL_TOKEN }
});

// 2. Update tournament standings  
await axios.patch(event.standingsUrl, null, {
  headers: { 'X-Internal-Token': INTERNAL_TOKEN }
});
```

### **3. Data Provider Endpoints**

#### **Match Scores Update:**
```http
PATCH /api/v2/data-provider/tournaments/123/matches/round-1
X-Internal-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**What this does:**
- Scrapes sports websites (ESPN, FIFA, etc.)
- Gets latest match results for the specific round
- Updates match scores in database
- Marks matches as completed

#### **Tournament Standings Update:**
```http
PATCH /api/v2/data-provider/tournaments/123/standings
X-Internal-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**What this does:**
- Recalculates points, wins, losses, draws
- Updates team positions in tournament table
- Recalculates goal differences
- Updates playoff qualification status

## 🌍 **Environment Handling**

### **Demo Environment:**
- **API Domain**: `https://api-best-shot-demo.mariobrusarosco.com`
- **Database**: Demo database with test data
- **Data Sources**: Mock/test sports data
- **Purpose**: Testing and development

### **Production Environment:**
- **API Domain**: `https://api-best-shot.mariobrusarosco.com`  
- **Database**: Production database with real data
- **Data Sources**: Live sports APIs and websites
- **Purpose**: Real user-facing data

### **How Environment is Determined:**
```javascript
// Schedule creation determines environment
const targetEnv = process.env.NODE_ENV; // "demo" or "production"

// URLs automatically point to correct environment
const standingsUrl = `${env.API_DOMAIN}/api/v2/data-provider/tournaments/:tournamentId/standings`;
// API_DOMAIN = "https://api-best-shot-demo.mariobrusarosco.com" (demo)
// API_DOMAIN = "https://api-best-shot.mariobrusarosco.com" (production)
```

## 🔐 **Authentication Flow**

### **API → Lambda Authentication:**
- Uses `INTERNAL_SERVICE_TOKEN` (JWT)
- Stored in both API environment and Lambda environment variables
- Single token works for both demo and production

### **Lambda → API Authentication:**
```javascript
// Lambda sends internal token
headers: { 
  'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN 
}

// API validates token
if (internalToken !== env.INTERNAL_SERVICE_TOKEN) {
  return res.status(403).json({ error: 'Invalid internal service token' });
}
```

## 📊 **Example: Complete Flow Trace**

### **Real Example - Brasileiro Tournament:**

#### **1. Schedule Creation (21:54 UTC):**
```json
{
  "id": "brasileiro_betano_2025_08_09_21_56",
  "cronExpression": "cron(56 21 9 8 ? 2025)",
  "targetInput": {
    "standingsUrl": "https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/tournaments/brasileiro-2025/standings",
    "roundUrl": "https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/tournaments/brasileiro-2025/matches/round-20",
    "targetEnv": "demo"
  }
}
```

#### **2. Lambda Execution (21:56 UTC):**
```
START RequestId: d66897c3-f006-432a-ad42-790239a982ba
INFO: ---------------------------------START [demo]----
Duration: 688.50 ms
Memory Used: 139 MB
Status: SUCCESS ✅
```

#### **3. API Calls Made:**
```http
PATCH https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/tournaments/brasileiro-2025/matches/round-20
X-Internal-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

PATCH https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/tournaments/brasileiro-2025/standings  
X-Internal-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **4. Database Updates:**
- **Matches Table**: Updated with final scores
- **Standings Table**: Recalculated team positions
- **Teams Table**: Updated points, goals, wins/losses

## 🔧 **Required Configuration**

### **Environment Variables:**

#### **API (.env file):**
```bash
NODE_ENV=demo  # or "production"
API_DOMAIN=https://api-best-shot-demo.mariobrusarosco.com
INTERNAL_SERVICE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
AWS_ACCOUNT_ID=905418297381
```

#### **Lambda (AWS Environment Variables):**
```json
{
  "INTERNAL_SERVICE_TOKEN": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "SENTRY_DSN": "https://99725970cd0e2e7f72a680239f535935@o4506356341276672.ingest.us.sentry.io/4508562415157248",
  "SENTRY_TRACES_SAMPLE_RATE": "1.0"
}
```

### **AWS Resources:**
- **Lambda Function**: `caller-scores-and-standings`
- **IAM Role**: `root-scheduler` (with Lambda + Scheduler permissions)
- **EventBridge Schedule Group**: `scores-and-standings-routine`
- **CloudWatch Logs**: `/aws/lambda/caller-scores-and-standings`

## 🎮 **Testing the System**

### **Manual Test (Postman):**
```http
POST https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/scheduler
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Expected Results:**
1. **Immediate**: 200 OK response with schedule details
2. **2 minutes later**: Lambda execution in CloudWatch logs
3. **API logs**: PATCH requests from Lambda with scores/standings updates
4. **Database**: Updated match scores and tournament standings

### **Monitoring:**
```bash
# Check schedules
aws scheduler list-schedules --group-name scores-and-standings-routine --region us-east-1

# Check Lambda logs
aws logs get-log-events --log-group-name "/aws/lambda/caller-scores-and-standings" --region us-east-1
```

## 🚀 **Production Deployment**

### **Environments:**
- **Demo**: `https://api-best-shot-demo.mariobrusarosco.com` 
- **Production**: `https://api-best-shot.mariobrusarosco.com`

### **CI/CD Pipeline:**
- **GitHub Actions**: Automatically deploys Lambda code changes
- **Infrastructure as Code**: EventBridge schedules created via API
- **Environment Variables**: Managed separately per environment

## 🎯 **Key Benefits**

### **Automation:**
- No manual score updates needed
- Runs automatically after matches
- Handles multiple tournaments simultaneously

### **Reliability:**
- AWS EventBridge guarantees execution
- Lambda retries on failures
- Comprehensive logging and monitoring

### **Scalability:**
- Handles hundreds of matches per day
- Parallel execution for multiple tournaments
- Cloud-native serverless architecture

### **Monitoring:**
- Sentry for error tracking
- CloudWatch for execution logs
- AWS Dashboard for infrastructure monitoring

---

**This system transforms manual sports data management into a fully automated, cloud-native solution that keeps your app's data fresh in real-time.**

---

**Last Updated**: $(date)  
**Version**: 1.0  
**Author**: Senior Engineering Team