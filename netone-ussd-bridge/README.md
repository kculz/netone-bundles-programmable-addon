# NetOne USSD Bridge API

## Overview
This API provides a bridge between external applications (like chatbots/Apps) and NetOne's USSD system for automated bundle purchases and balance inquiries via an Android gateway device. It supports both **USD** and **ZWL** currencies.

## Architecture
```
External App → Bridge API → Socket.IO → Android Gateway → USSD Network
```

## Setup

### Environment Variables
Create a `.env` file with the following:
```env
PORT=3000
DB_NAME=ussd_bridge
DB_USER=postgres
DB_PASS=your_password
DB_HOST=localhost
API_KEY=your_secret_auth_token_for_chatbot
```

### Installation
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Run Production Server
```bash
npm start
```

## API Authentication
All API endpoints require an API key in the `x-api-key` header:
```
x-api-key: your_secret_auth_token_for_chatbot/app
```

## API Endpoints

### 1. Get All Bundles
**GET** `/api/v1/bundles`

Returns all available bundles across all types.

**Query Parameters:**
- `currency` (optional): `usd` (default) or `zwl`

**Response:**
```json
{
  "data_bundles": { ... },
  "social_media_bundles": { ... },
  "sms_bundles": { ... },
  "combo_bundles": { ... },
  "voice_bundles": { ... }
}
```

---

### 2. Get Data Bundles
**GET** `/api/v1/bundles/data`

Returns all data bundle categories.

**Query Parameters:**
- `currency` (optional): `usd` (default) or `zwl`

**Response:**
```json
{
  "bbb": {
    "category_id": "bbb",
    "category_name": "BBB (Big Beautiful Bundles)",
    "description": "Monthly data bundles with peak and off-peak allocations",
    "bundles": [
      {
        "id": "bbb_1",
        "name": "BBB 100",
        "price": "$45",
        "currency": "USD",
        "total_data": "100GB",
        "validity": "30 Days"
      }
    ]
  },
  "mogigs": { ... },
  "night": { ... },
  "daily": { ... },
  "weekly": { ... },
  "hourly": { ... }
}
```

---

### 3. Get Data Bundles by Category
**GET** `/api/v1/bundles/data/:category`

Returns bundles for a specific data category.

**Categories:** `bbb`, `mogigs`, `night`, `daily`, `weekly`, `hourly`

**Query Parameters:**
- `currency` (optional): `usd` (default) or `zwl`

**Example:** `/api/v1/bundles/data/mogigs?currency=zwl`

---

### 4. Get Social Media Bundles
**GET** `/api/v1/bundles/social-media`

Returns all social media bundles.

**Query Parameters:**
- `currency` (optional): `usd` (default) or `zwl`

---

### 5. Get SMS Bundles
**GET** `/api/v1/bundles/sms`

Returns all SMS bundles.

**Query Parameters:**
- `currency` (optional): `usd` (default) or `zwl`

---

### 6. Purchase Bundle
**POST** `/api/v1/bundles/buy`

Purchase a bundle for self or another number.

**Request Body:**
```json
{
  "bundle_id": "zwl_daily_1",
  "bundle_type": "data",
  "category": "daily",
  "recipient": "0771234567",
  "currency": "zwl"
}
```

**Fields:**
- `bundle_id` (required): Bundle ID from the bundle catalog
- `bundle_type` (required): One of: `data`, `social_media`, `sms`, `combo`, `voice`
- `category` (optional): Required for data bundles (e.g. `daily`, `weekly`)
- `recipient` (optional): Phone number if buying for another person. Omit or use "self" for self-purchase
- `currency` (optional): `usd` (default) or `zwl`

**Response:**
```json
{
  "message": "Bundle purchase task created. Please confirm to proceed.",
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "PENDING_CONFIRMATION",
  "recipient": "0771234567",
  "bundle": {
    "id": "zwl_daily_1",
    "type": "data",
    "category": "daily",
    "currency": "ZWL"
  }
}
```

---

### 7. Check Balance
**POST** `/api/v1/bundles/balance`

Initiate a balance inquiry task.

**Request Body:**
```json
{
  "currency": "zwl"
}
```

**Fields:**
- `currency` (optional): `usd` (default) or `zwl`

**Response:**
```json
{
  "message": "Balance check initiated",
  "taskId": "uuid...",
  "status": "QUEUED"
}
```

---

### 8. Get Last Balance
**GET** `/api/v1/bundles/balance/last/:currency`

Retrieve the most recent balance from the database.

**Params:**
- `currency`: `usd` or `zwl`

**Response:**
```json
{
  "balance": "Your balance is ZWL 500.00",
  "updatedAt": "2024-02-06T12:00:00.000Z",
  "currency": "ZWL"
}
```

---

### 9. Confirm Task
**POST** `/api/v1/bundles/confirm/:taskId`

Confirm a pending task to proceed with execution.

---

### 10. Get Task Status
**GET** `/api/v1/bundles/status/:taskId`

Check the status of a bundle purchase or balance task.

**Response:**
```json
{
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "COMPLETED",
  "recipient": "0771234567",
  "bundleId": "zwl_daily_1",
  "bundleType": "data",
  "bundleCategory": "daily",
  "ussdResponse": "Bundle successfully purchased",
  "createdAt": "2024-02-06T10:30:00.000Z",
  "updatedAt": "2024-02-06T10:31:00.000Z"
}
```

**Status Values:**
- `PENDING`: Task created
- `PENDING_CONFIRMATION`: Waiting for user confirmation (API side)
- `QUEUED`: Queued for execution
- `PROCESSING`: Sent to gateway, USSD in progress
- `COMPLETED`: Success
- `FAILED`: Failed

---

## Usage Examples

### cURL Examples

**Get all data bundles:**
```bash
curl -X GET http://localhost:3000/api/v1/bundles/data \
  -H "x-api-key: your_secret_auth_token_for_chatbot"
```

**Purchase bundle for self:**
```bash
curl -X POST http://localhost:3000/api/v1/bundles/buy \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_secret_auth_token_for_chatbot" \
  -d '{
    "bundle_id": "mogigs_1",
    "bundle_type": "data",
    "category": "mogigs"
  }'
```

**Purchase bundle for another number:**
```bash
curl -X POST http://localhost:3000/api/v1/bundles/buy \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_secret_auth_token_for_chatbot" \
  -d '{
    "bundle_id": "mogigs_1",
    "bundle_type": "data",
    "category": "mogigs",
    "recipient": "0771234567"
  }'
```

**Check task status:**
```bash
curl -X GET http://localhost:3000/api/v1/bundles/status/123e4567-e89b-12d3-a456-426614174000 \
  -H "x-api-key: your_secret_auth_token_for_chatbot"
```

---

## WebSocket Events (Android Gateway)

The Android gateway connects via Socket.IO and exchanges the following events:

### Events from Server to Gateway

**NEW_USSD_TASK**
```json
{
  "taskId": "uuid",
  "recipient": "0771234567",
  "bundleType": "data",
  "bundleId": "mogigs_1",
  "code": "*379#",
  "steps": ["1", "1", "1", "2", "1", "2", "0771234567"],
  "description": "Purchase Mo'Gigs 30 Days for 0771234567",
  "waitForConfirmation": true
}
```

### Events from Gateway to Server

**TASK_RESULT**
```json
{
  "taskId": "uuid",
  "status": "COMPLETED",
  "message": "Bundle successfully purchased"
}
```

**REQUEST_CONFIRMATION**
```json
{
  "taskId": "uuid",
  "recipient": "0771234567",
  "bundleDetails": "Mo'Gigs 30 Days - $7"
}
```

**TASK_PROGRESS**
```json
{
  "taskId": "uuid",
  "step": 3,
  "message": "Navigating to bundle selection"
}
```

**TASK_ERROR**
```json
{
  "taskId": "uuid",
  "error": "USSD session timeout",
  "step": 5
}
```

---

## Bundle Types Implementation Status

### ✅ Implemented
- **Data Bundles**: Fully implemented with all categories (BBB, Mo'Gigs, Night, Daily, Weekly, Hourly)

### 🔧 Template Ready (Needs USSD Flow Verification)
- **Social Media Bundles**: Template code provided
- **SMS Bundles**: Template code provided
- **Combo Bundles**: Template code provided
- **Voice Bundles**: Template code provided

To implement additional bundle types, update the USSD navigation steps in `ussd.service.js` based on the actual USSD menu flow.

---

## Error Handling

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Valid API key required in x-api-key header"
}
```

**404 Not Found:**
```json
{
  "error": "Not Found",
  "message": "Route GET /api/v1/invalid not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Android Gateway Offline"
}
```

---

## Database Schema

### Tasks Table
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  recipient VARCHAR NOT NULL,
  bundleId VARCHAR NOT NULL,
  bundleType ENUM('data', 'social_media', 'sms', 'combo', 'voice', 'balance') NOT NULL,
  bundleCategory VARCHAR,
  currency ENUM('USD', 'ZWL') DEFAULT 'USD',
  status ENUM('PENDING', 'PENDING_CONFIRMATION', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
  ussdResponse TEXT,
  externalId VARCHAR,
  errorMessage TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

---

## Testing

Use the provided examples to test the API. Make sure:
1. PostgreSQL is running
2. Environment variables are set
3. Android gateway app is connected
4. API key is valid

---

## Support

For issues or questions, check the error logs and task status endpoint.