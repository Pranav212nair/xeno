# Xeno API Documentation

Base URL: `http://localhost:3000`

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Register
**POST** `/api/auth/register`

Create a new user account and tenant.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123",
  "companyName": "ACME Corp"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "tenantId": "uuid",
    "company": "ACME Corp"
  }
}
```

### Login
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "admin@acme.com",
  "password": "password123"
}
```

**Response:** Same as register

### Get Current User
**GET** `/api/auth/me`

Requires authentication.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin",
  "tenantId": "uuid",
  "company": "ACME Corp"
}
```

---

## Dashboard

### Get Dashboard Stats
**GET** `/api/dashboard/stats?days=30`

Get comprehensive dashboard statistics including KPIs, campaigns, lifecycle, segments, and journeys.

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 30)

**Response:**
```json
{
  "kpis": {
    "revenueInfluenced": 1250000,
    "activeCampaigns": 2,
    "totalCustomers": 3,
    "totalOrders": 0,
    "repeatRate": 42,
    "loyaltyEngagement": 61,
    "customerGrowth": 1,
    "topChannel": "WhatsApp"
  },
  "campaigns": [...],
  "lifecycle": {
    "new": 1,
    "active": 2,
    "at_risk": 0,
    "churned": 0
  },
  "segments": [...],
  "journeys": [...]
}
```

---

## Campaigns

### List Campaigns
**GET** `/api/campaigns`

Get all campaigns for the current tenant.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Weekend Flash Sale",
    "channel": "WhatsApp",
    "status": "live",
    "sent": 10000,
    "delivered": 9800,
    "opened": 5100,
    "clicked": 1200,
    "converted": 420,
    "revenue": 840000,
    "cost": 25000,
    "segment": null,
    "startedAt": "2024-12-01T00:00:00.000Z",
    "completedAt": null
  }
]
```

### Create Campaign
**POST** `/api/campaigns`

**Request Body:**
```json
{
  "name": "Summer Sale 2024",
  "channel": "Email",
  "segmentId": "uuid-optional",
  "budget": 50000
}
```

### Update Campaign
**PUT** `/api/campaigns/:id`

**Request Body:**
```json
{
  "name": "Updated Campaign Name",
  "channel": "SMS",
  "status": "paused"
}
```

### Delete Campaign
**DELETE** `/api/campaigns/:id`

---

## Customers

### List Customers
**GET** `/api/customers?lifecycle=active&limit=100`

**Query Parameters:**
- `lifecycle` (optional): Filter by lifecycle stage (new, active, at_risk, churned)
- `limit` (optional): Number of results (default: 100)

### Get Top Customers
**GET** `/api/customers/top?limit=10`

Get top customers by total spend.

---

## Segments

### List Segments
**GET** `/api/segments`

### Create Segment
**POST** `/api/segments`

**Request Body:**
```json
{
  "name": "High Value Customers",
  "description": "Customers with LTV > $1000",
  "type": "custom"
}
```

---

## Orders

### List Orders
**GET** `/api/orders?from=2024-01-01&to=2024-12-31&limit=100`

**Query Parameters:**
- `from` (optional): Start date (ISO format)
- `to` (optional): End date (ISO format)
- `limit` (optional): Number of results (default: 100)

---

## Analytics

### Get Analytics
**GET** `/api/analytics?days=30`

Get analytics including channel performance and top campaigns.

**Response:**
```json
{
  "channelPerformance": {
    "WhatsApp": {
      "revenue": 840000,
      "cost": 25000,
      "count": 1
    },
    "Email": {
      "revenue": 410000,
      "cost": 15000,
      "count": 1
    }
  },
  "topCampaigns": [...],
  "totalRevenue": 1250000,
  "totalCost": 40000,
  "avgROI": "31.25"
}
```

---

## Shopify Integration

### Sync Shopify Data
**POST** `/api/shopify/sync`

Initiate a sync with Shopify.

**Request Body:**
```json
{
  "accessToken": "shpat_xxxxx",
  "shopDomain": "mystore.myshopify.com"
}
```

---

## Test Credentials

For testing, use the seeded account:
- **Email:** `admin@acme.com`
- **Password:** `password123`
- **Tenant:** ACME Retail

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
