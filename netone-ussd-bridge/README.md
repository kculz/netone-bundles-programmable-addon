# NetOne USSD Bridge API

## Overview
This API provides a bridge between external applications (like chatbots/Apps) and NetOne's USSD system for automated bundle purchases via an Android gateway device.

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
        "data_split": {
          "peak": "80GB",
          "off_peak": "20GB"
        },
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

**Example:** `/api/v1/bundles/data/mogigs`

**Response:**
```json
{
  "category_id": "mogigs",
  "category_name": "Mo'Gigs",
  "description": "Flexible 30-day data bundles",
  "bundles": [
    {
      "id": "mogigs_1",
      "name": "Mo'Gigs 30 Days",
      "price": "USD $7",
      "currency": "USD",
      "total_data": "5000MB",
      "validity": "30 Days"
    }
  ]
}
```

---

### 4. Get Social Media Bundles
**GET** `/api/v1/bundles/social-media`

Returns all social media bundles.

**Response:**
```json
{
  "category_name": "Social Media Bundles",
  "bundles": [
    {
      "id": "social_1",
      "name": "WhatsApp Daily",
      "price": "USD $1",
      "currency": "USD",
      "platform": "WhatsApp",
      "validity": "24 Hours"
    }
  ]
}
```

---

### 5. Get SMS Bundles
**GET** `/api/v1/bundles/sms`

Returns all SMS bundles.

**Response:**
```json
{
  "category_name": "SMS Bundles",
  "bundles": [
    {
      "id": "sms_1",
      "name": "100 SMS",
      "price": "USD $2",
      "currency": "USD",
      "sms_count": 100,
      "validity": "30 Days"
    }
  ]
}
```

---

### 6. Purchase Bundle
**POST** `/api/v1/bundles/buy`

Purchase a bundle for self or another number.

**Request Body:**
```json
{
  "bundle_id": "mogigs_1",
  "bundle_type": "data",
  "category": "mogigs",
  "recipient": "0771234567"
}
```

**Fields:**
- `bundle_id` (required): Bundle ID from the bundle catalog
- `bundle_type` (required): One of: `data`, `social_media`, `sms`, `combo`, `voice`
- `category` (optional): Required for data bundles. One of: `bbb`, `mogigs`, `night`, `daily`, `weekly`, `hourly`
- `recipient` (optional): Phone number if buying for another person. Omit or use empty string for self-purchase

**Response:**
```json
{
  "message": "Bundle purchase task queued. Waiting for confirmation from device.",
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "recipient": "0771234567",
  "bundle": {
    "id": "mogigs_1",
    "type": "data",
    "category": "mogigs"
  }
}
```

**Example: Purchase for Self**
```json
{
  "bundle_id": "mogigs_1",
  "bundle_type": "data",
  "category": "mogigs"
}
```

**Example: Purchase for Other**
```json
{
  "bundle_id": "social_1",
  "bundle_type": "social_media",
  "recipient": "0771234567"
}
```

---

### 7. Get Task Status
**GET** `/api/v1/bundles/status/:taskId`

Check the status of a bundle purchase task.

**Response:**
```json
{
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "COMPLETED",
  "recipient": "0771234567",
  "bundleId": "mogigs_1",
  "bundleType": "data",
  "bundleCategory": "mogigs",
  "ussdResponse": "Bundle successfully purchased",
  "createdAt": "2024-02-06T10:30:00.000Z",
  "updatedAt": "2024-02-06T10:31:00.000Z"
}
```

**Status Values:**
- `PENDING`: Task created, waiting to be sent to device
- `PROCESSING`: Task sent to device, USSD interaction in progress
- `COMPLETED`: Purchase successful
- `FAILED`: Purchase failed

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
  bundleType ENUM('data', 'social_media', 'sms', 'combo', 'voice') NOT NULL,
  bundleCategory VARCHAR,
  status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
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