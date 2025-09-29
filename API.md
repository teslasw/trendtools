# Trend Advisory API Documentation

## Base URL
- Development: `http://localhost:3002/api`
- Production: `https://api.trendadvisory.com/api`

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

### Auth Endpoints

#### POST /api/auth/register
Register a new user account.

**Body:**
```json
{
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string"
  },
  "token": "string"
}
```

#### POST /api/auth/login
Authenticate user and receive token.

**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string"
  },
  "token": "string"
}
```

#### POST /api/auth/refresh
Refresh authentication token.

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response:**
```json
{
  "token": "string",
  "refreshToken": "string"
}
```

#### POST /api/auth/logout
Logout and invalidate token.

**Headers:**
```
Authorization: Bearer <token>
```

#### POST /api/auth/forgot-password
Request password reset.

**Body:**
```json
{
  "email": "string"
}
```

#### POST /api/auth/reset-password
Reset password with token.

**Body:**
```json
{
  "token": "string",
  "newPassword": "string"
}
```

### User Endpoints

#### GET /api/user/profile
Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "dateOfBirth": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "zipCode": "string",
  "country": "string",
  "group": {
    "id": "string",
    "name": "string",
    "riskLevel": "string"
  },
  "preferences": {
    "notifications": "boolean",
    "emailUpdates": "boolean",
    "twoFactor": "boolean"
  }
}
```

#### PUT /api/user/profile
Update user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "dateOfBirth": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "zipCode": "string",
  "country": "string"
}
```

#### PUT /api/user/password
Change user password.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

#### PUT /api/user/preferences
Update user preferences.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "notifications": "boolean",
  "emailUpdates": "boolean",
  "twoFactor": "boolean"
}
```

#### DELETE /api/user/account
Delete user account.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "password": "string",
  "confirmation": "DELETE"
}
```

### Financial Tools Endpoints

#### POST /api/tools/super-calculator
Calculate superannuation projections.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "currentAge": "number",
  "retirementAge": "number",
  "currentBalance": "number",
  "annualContribution": "number",
  "employerContribution": "number",
  "expectedReturn": "number",
  "inflationRate": "number"
}
```

**Response:**
```json
{
  "projectedBalance": "number",
  "totalContributions": "number",
  "totalReturns": "number",
  "inflationAdjustedBalance": "number",
  "monthlyRetirementIncome": "number",
  "yearByYearProjection": [
    {
      "year": "number",
      "age": "number",
      "balance": "number",
      "contribution": "number",
      "returns": "number"
    }
  ]
}
```

#### GET /api/tools/super-calculator/history
Get calculation history.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "calculations": [
    {
      "id": "string",
      "createdAt": "string",
      "inputs": {},
      "results": {}
    }
  ]
}
```

### Spending Analysis Endpoints

#### POST /api/spending/upload
Upload bank statement for analysis.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
```
file: <CSV/PDF file>
accountId: string (optional)
```

**Response:**
```json
{
  "uploadId": "string",
  "status": "processing",
  "transactionCount": "number"
}
```

#### GET /api/spending/transactions
Get user transactions.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate`: ISO date string
- `endDate`: ISO date string
- `categoryId`: string (optional)
- `page`: number (default: 1)
- `limit`: number (default: 50)

**Response:**
```json
{
  "transactions": [
    {
      "id": "string",
      "date": "string",
      "description": "string",
      "amount": "number",
      "category": {
        "id": "string",
        "name": "string",
        "icon": "string"
      },
      "merchant": "string",
      "accountId": "string"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "pages": "number"
  }
}
```

#### POST /api/spending/analyze
Analyze spending patterns with AI.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "startDate": "string",
  "endDate": "string",
  "categories": ["string"]
}
```

**Response:**
```json
{
  "summary": {
    "totalSpending": "number",
    "averageDaily": "number",
    "averageMonthly": "number",
    "topCategories": [
      {
        "category": "string",
        "amount": "number",
        "percentage": "number"
      }
    ]
  },
  "insights": [
    {
      "type": "string",
      "title": "string",
      "description": "string",
      "recommendation": "string",
      "potentialSavings": "number"
    }
  ],
  "trends": {
    "monthlyTrend": [
      {
        "month": "string",
        "amount": "number"
      }
    ],
    "categoryTrends": {}
  },
  "aiRecommendations": "string"
}
```

#### PUT /api/spending/transactions/:id
Update transaction category.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "categoryId": "string",
  "notes": "string"
}
```

#### POST /api/spending/categories
Create custom category.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "string",
  "icon": "string",
  "color": "string",
  "budget": "number"
}
```

### Dashboard Endpoints

#### GET /api/dashboard/summary
Get dashboard summary data.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "name": "string",
    "lastLogin": "string",
    "memberSince": "string"
  },
  "financial": {
    "totalAssets": "number",
    "monthlySpending": "number",
    "savingsRate": "number",
    "netWorth": "number"
  },
  "tools": [
    {
      "id": "string",
      "name": "string",
      "lastUsed": "string",
      "available": "boolean"
    }
  ],
  "recentActivity": [
    {
      "type": "string",
      "description": "string",
      "timestamp": "string"
    }
  ],
  "alerts": [
    {
      "type": "string",
      "message": "string",
      "priority": "string"
    }
  ]
}
```

#### GET /api/dashboard/charts
Get chart data for dashboard.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: string (week|month|quarter|year)

**Response:**
```json
{
  "spending": {
    "labels": ["string"],
    "data": ["number"]
  },
  "savings": {
    "labels": ["string"],
    "data": ["number"]
  },
  "categories": {
    "labels": ["string"],
    "data": ["number"]
  }
}
```

### Document Management Endpoints

#### GET /api/documents
Get user documents.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "documents": [
    {
      "id": "string",
      "name": "string",
      "type": "string",
      "size": "number",
      "uploadedAt": "string",
      "url": "string"
    }
  ]
}
```

#### POST /api/documents/upload
Upload document.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
```
file: <file>
type: string
description: string
```

#### DELETE /api/documents/:id
Delete document.

**Headers:**
```
Authorization: Bearer <token>
```

### Notifications Endpoints

#### GET /api/notifications
Get user notifications.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "string",
      "type": "string",
      "title": "string",
      "message": "string",
      "read": "boolean",
      "createdAt": "string"
    }
  ],
  "unreadCount": "number"
}
```

#### PUT /api/notifications/:id/read
Mark notification as read.

**Headers:**
```
Authorization: Bearer <token>
```

#### POST /api/notifications/subscribe
Subscribe to push notifications.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "deviceToken": "string",
  "platform": "ios|android|web"
}
```

## Rate Limiting

API endpoints are rate limited to:
- Authentication endpoints: 5 requests per minute
- User endpoints: 100 requests per minute
- Financial tools: 20 requests per minute
- File uploads: 10 requests per hour

## Error Responses

All errors follow this format:
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

Common error codes:
- `AUTH_REQUIRED`: Authentication required
- `AUTH_INVALID`: Invalid credentials
- `TOKEN_EXPIRED`: Token has expired
- `PERMISSION_DENIED`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `RATE_LIMITED`: Too many requests
- `SERVER_ERROR`: Internal server error