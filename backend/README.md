# SafeWay-AI Backend API

Modular Node.js, Express.js, and MongoDB backend service for the SafeWay-AI platform.

## Architecture & Folder Structure

```text
backend/
├── src/
│   ├── config/          # Environment configuration & Database setup
│   ├── controllers/     # Route request controllers
│   ├── models/          # Mongoose database models
│   ├── services/        # Business logic services
│   ├── routes/          # Express route definitions
│   ├── middlewares/     # Express middlewares (CORS, Error handling, 404)
│   ├── utils/           # Helper response and error classes
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point & DB startup
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore list
├── package.json         # Package configuration (ES Modules)
└── README.md            # Backend documentation
```

## Getting Started

### 1. Installation
Navigate to the `backend` directory and install dependencies:
```bash
cd backend
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and update credentials:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Seed Verified Traffic Rules & Challan Data
```bash
npm run seed:rules
```

### 5. Run Test Suite
```bash
node src/tests/trafficRule.test.js
node src/tests/challan.test.js
node src/tests/security.test.js
node src/tests/hazard.test.js
node src/tests/safety.test.js
node src/tests/emergency.test.js
node src/tests/ai.test.js
```

### 6. Health Check Endpoint
```bash
GET http://localhost:5000/api/health
```
Response format:
```json
{
  "success": true,
  "message": "Backend server is healthy",
  "data": {
    "status": "UP",
    "timestamp": "2026-08-13T22:13:00.000Z",
    "uptime": 12.34,
    "environment": "development",
    "database": "connected"
  }
}
```

