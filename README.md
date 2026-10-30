# Transaction Ledger Service

A scalable, maintainable, and testable REST API for a transaction ledger service built with TypeScript, Node.js, and Express, following clean architecture and SOLID principles.

---

## 🏛 Architecture Overview

The project is structured according to the **Scalable REST API** specification:

```
Client
  │
  ▼
Routes (Routing & Schema Validation via Zod)
  │
  ▼
Middleware (Centralized Error Handling, 404, CORS, Helmet)
  │
  ▼
Controllers (Thin HTTP translation layer)
  │
  ▼
Services (Business rules, validations, system timestamp generation)
  │
  ▼
Repository Abstraction (IAccountRepository)
  │
  ├──► MongoAccountRepository (MongoDB / Mongoose with lean queries & index optimization)
  └──► InMemoryAccountRepository (Fast in-memory mock for isolated testing & fallback)
```

### Folder Layout

```
src/
├── app/                  # Application bootstrap & middleware composition
├── config/               # Environment & central configurations
├── common/
│   ├── errors/           # AppError, BadRequestError, ConflictError, NotFoundError
│   └── http/             # ApiResponseBuilder and standard response shapes
├── middleware/           # Validation, Error handler, 404 handler
├── modules/
│   └── accounts/
│       ├── controllers/  # AccountController
│       ├── models/       # Account entity & DTOs
│       ├── repositories/ # IAccountRepository & InMemoryAccountRepository
│       ├── routes/       # Account Express router
│       ├── services/     # AccountService (Domain logic)
│       └── validators/   # Zod request body schemas
└── server/               # Server startup & graceful shutdown
tests/
├── unit/                 # Domain service unit tests
└── integration/          # HTTP API integration tests
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18 (Tested on v22.20.0)
- npm >= 9

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `API_PREFIX` | `/api/v1` | Base route prefix |
| `MONGODB_URI` | `mongodb://localhost:27017/transaction_ledger` | MongoDB connection URI |
| `USE_IN_MEMORY` | `false` | When `true`, forces in-memory repository (useful for testing or offline mode) |

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Production Build & Run

```bash
npm run build
npm start
```

### Run Tests

```bash
# Unit & Integration Tests (83 automated tests)
npm test

# Concurrent Load & Performance Benchmark
npm run test:load
```

### Docker & Docker Compose Deployment

Spin up the entire stack (Node.js API + MongoDB with health check) in one command:

```bash
docker compose up -d --build
```

The API will be live at `http://localhost:3000` and automatically connects to the containerized MongoDB instance.

### Free Cloud Deployment on Koyeb

This repository is ready for 1-click deployment on [Koyeb](https://www.koyeb.com) (Free Eco Nano tier, no cold sleep timeouts):

1. **Sign up at [koyeb.com](https://www.koyeb.com)** (free, no credit card required).
2. Click **Create Service** -> **GitHub**.
3. Select this repository: `Balaji2510/transaction-ledger-service`.
4. Choose **Dockerfile** as the build method.
5. Select **Nano** instance type (free).
6. Under **Environment variables**, set:
   - `PORT`: `3000`
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<your-mongodb-atlas-url>` (or set `USE_IN_MEMORY=true` if testing without external DB)
7. Under **Exposed Ports**, configure port `3000` with HTTP protocol.
8. Click **Deploy**. Your live service URL will be ready in ~1 minute.

### Interactive API Documentation (Swagger UI)

Explore and test endpoints interactively in your browser:

- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **Raw OpenAPI 3.0 Spec**: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

---

## 🏆 JMeter Load Testing & Performance Scorecard

The service includes an Apache JMeter load test suite ([`jmeter/transaction_ledger_load_test.jmx`](file:///c:/Users/balaj/OneDrive/Desktop/transaction-ledger-service/jmeter/transaction_ledger_load_test.jmx)) and GitHub Actions automated performance scorecard ([`.github/workflows/jmeter-load-test.yml`](file:///c:/Users/balaj/OneDrive/Desktop/transaction-ledger-service/.github/workflows/jmeter-load-test.yml)).

### Scorecard Summary

- **Testing Score**: **`96 / 100`** *(Grade: **A+**)*
- **Success Rate**: **`100.00%`** (0 errors across 2,600+ requests)
- **Average Latency**: **`38.2 ms`**
- **Median Latency (P50)**: **`27.1 ms`**
- **95th Percentile (P95)**: **`82.4 ms`**
- **Throughput**: **`280+ req/sec`**
- **Detailed Report**: See [`JMETER_LOAD_TEST_REPORT.md`](file:///c:/Users/balaj/OneDrive/Desktop/transaction-ledger-service/JMETER_LOAD_TEST_REPORT.md)


---

## 📡 API Specification

### 1. Create Account

Creates a new account in the ledger.

- **Method**: `POST`
- **Path**: `/api/v1/accounts`
- **Headers**: `Content-Type: application/json`

#### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | **Yes** | Account holder name. Must be a non-empty string. |
| `id` | `string` | No | Optional unique account identifier. If omitted, the system generates a unique UUID. |

> ⚠️ **Strict Business Rules**:
> - `id` must be unique across the ledger (returns `409 Conflict` if duplicate).
> - `name` is required and non-empty.
> - **Initial balance is always `0`**.
> - **Client is strictly prohibited from setting the initial balance**. Any request containing `balance` will be rejected with `400 Bad Request`.
> - **`created_at` is generated automatically by the system** (ISO 8601). Any attempt by the client to supply `created_at` will be rejected with `400 Bad Request`.

#### Example Request

```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe"
  }'
```

#### Successful Response (`201 Created`)

```json
{
  "success": true,
  "data": {
    "id": "e44d34fb-7a55-46eb-8a4b-008fe3750805",
    "name": "Jane Doe",
    "balance": 0,
    "created_at": "2026-10-30T09:05:00.000Z"
  },
  "meta": {
    "timestamp": "2026-10-30T09:05:00.015Z"
  }
}
```

#### Client Prohibited From Setting Balance (`400 Bad Request`)

Request:
```json
{
  "name": "Jane Doe",
  "balance": 100
}
```

Response:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Client is not allowed to set the initial balance. Initial balance must always be 0."
  },
  "meta": {
    "timestamp": "2026-10-30T09:05:01.000Z"
  }
}
```

#### Duplicate ID Conflict (`409 Conflict`)

Response:
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Account with id 'acc_123' already exists"
  },
  "meta": {
    "timestamp": "2026-10-30T09:05:02.000Z"
  }
}
```

---

### 2. Get Account by ID

- **Method**: `GET`
- **Path**: `/api/v1/accounts/:id`

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "id": "e44d34fb-7a55-46eb-8a4b-008fe3750805",
    "name": "Jane Doe",
    "balance": 0,
    "created_at": "2026-10-30T09:05:00.000Z"
  },
  "meta": {
    "timestamp": "2026-10-30T09:05:00.015Z"
  }
}
```

---

### 3. Get Account Balance

Fetches the accurate, current balance of an account in the ledger. Designed for high read throughput using lean queries and primary key index lookups.

- **Method**: `GET`
- **Path**: `/api/v1/accounts/:id/balance` *(alias: `/api/v1/accounts/balance/:id`)*

#### Example Request

```bash
curl -X GET http://localhost:3000/api/v1/accounts/e44d34fb-7a55-46eb-8a4b-008fe3750805/balance
```

#### Successful Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "accountId": "e44d34fb-7a55-46eb-8a4b-008fe3750805",
    "id": "e44d34fb-7a55-46eb-8a4b-008fe3750805",
    "balance": 0
  },
  "meta": {
    "timestamp": "2026-10-30T09:05:00.015Z"
  }
}
```

#### Non-Existent Account (`404 Not Found`)

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Account with id 'non-existent-id' not found"
  },
  "meta": {
    "timestamp": "2026-10-30T09:05:01.000Z"
  }
}
```

---

### 4. Create Transaction (Atomic Ledger Entry)

Records a new credit or debit transaction for an account. Modifies the account balance atomically.

- **Method**: `POST`
- **Path**: `/api/v1/accounts/:id/transactions`
- **Headers**: `Content-Type: application/json`

#### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `string` | **Yes** | Either `'credit'` or `'debit'`. |
| `amount` | `number` | **Yes** | Transaction amount (must be $> 0$). |
| `referenceId` | `string` | **Yes** | Client idempotency/reference key (must be unique per account). |
| `description` | `string` | No | Optional description/notes. |

#### Example Request

```bash
curl -X POST http://localhost:3000/api/v1/accounts/acc_123/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": 100,
    "referenceId": "ref_deposit_001",
    "description": "Initial funding"
  }'
```

#### Successful Response (`201 Created`)

```json
{
  "success": true,
  "data": {
    "id": "tx_3c48fd4e-b530-4e3d-82d7-b892a4038a8f",
    "accountId": "acc_123",
    "type": "credit",
    "amount": 100,
    "referenceId": "ref_deposit_001",
    "description": "Initial funding",
    "created_at": "2026-10-30T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2026-10-30T10:00:00.015Z"
  }
}
```

#### Insufficient Balance (`400 Bad Request`)

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance in account 'acc_123'. Current balance is 50, requested debit is 100."
  },
  "meta": {
    "timestamp": "2026-10-30T10:00:01.000Z"
  }
}
```

#### Duplicate Reference ID (`409 Conflict`)

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_TRANSACTION",
    "message": "Transaction with referenceId 'ref_deposit_001' already exists for account 'acc_123'"
  },
  "meta": {
    "timestamp": "2026-10-30T10:00:02.000Z"
  }
}
```

---

### 5. Get Transaction History

Fetches all transactions for an account sorted in latest first order based on creation date. Supports filtering by type (`credit`, `debit`) and standardized pagination. Transactions are **strictly immutable** and cannot be modified (`PUT`/`PATCH`) or deleted (`DELETE`) (returns `405 Method Not Allowed`).

- **Method**: `GET`
- **Path**: `/api/v1/accounts/:id/transactions`
- **Query Parameters**:
  - `type` (optional): Filter transactions by `'credit'` or `'debit'`. If omitted, returns both types.
  - `page` (optional): Page number (default: `1`).
  - `pageSize` or `limit` (optional): Records per page (default: `10`, max: `100`).

#### Successful Response (`200 OK`)

```json
{
  "success": true,
  "data": [
    {
      "id": "tx_3c48fd4e-b530-4e3d-82d7-b892a4038a8f",
      "accountId": "e44d34fb-7a55-46eb-8a4b-008fe3750805",
      "type": "credit",
      "amount": 250,
      "referenceId": "ref_deposit_001",
      "description": "Deposit",
      "created_at": "2026-10-30T10:00:00.000Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "pageSize": 10,
    "totalRecords": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false,
    "timestamp": "2026-10-30T10:05:00.015Z"
  }
}
```

---

### 6. Money Transfer (Bonus Feature)

Transfers money atomically between two accounts. Debits the source account and credits the destination account within a single atomic operation with rollback protection.

- **Method**: `POST`
- **Path**: `/api/v1/accounts/transfer` *(alias: `/api/v1/transactions/transfer`)*
- **Headers**: `Content-Type: application/json`

#### Request Body

```json
{
  "fromAccountId": "acc_A",
  "toAccountId": "acc_B",
  "amount": 30,
  "referenceId": "ref_transfer_001",
  "description": "Payment for consulting services"
}
```

#### Successful Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "transferId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "referenceId": "ref_transfer_001",
    "fromAccountId": "acc_A",
    "toAccountId": "acc_B",
    "amount": 30,
    "fromAccountBalance": 70,
    "toAccountBalance": 80,
    "debitTransactionId": "tx_debit_001",
    "creditTransactionId": "tx_credit_002",
    "created_at": "2026-10-30T10:10:00.000Z"
  },
  "meta": {
    "timestamp": "2026-10-30T10:10:00.015Z"
  }
}
```

---

### 7. List All Accounts

- **Method**: `GET`
- **Path**: `/api/v1/accounts`
- **Query Parameters**:
  - `page` (optional): Page number (default: `1`).
  - `pageSize` or `limit` (optional): Records per page (default: `10`).

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": [
    {
      "id": "e44d34fb-7a55-46eb-8a4b-008fe3750805",
      "name": "Jane Doe",
      "balance": 0,
      "created_at": "2026-10-30T09:05:00.000Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "pageSize": 10,
    "totalRecords": 1,
    "totalPages": 1,
    "timestamp": "2026-10-30T09:05:00.015Z"
  }
}
```

---

### 8. Health Check

- **Method**: `GET`
- **Path**: `/health`

#### Response (`200 OK`)

```json
{
  "status": "ok",
  "uptime": 12.45
}
```

---

## 📝 Architectural & Business Assumptions

1. **Strict Zero Initial Balance**:
   - Accounts are always initialized with a balance of `0.00`. Clients cannot override or supply an initial balance during account creation (`400 Bad Request`).
   - Funding must occur via an explicit `credit` transaction to maintain an auditable, verifiable ledger history.

2. **System-Generated Timestamps & Immutability**:
   - Account and transaction timestamps (`created_at`) are automatically generated in ISO 8601 UTC format by the server and cannot be supplied by clients.
   - Financial ledger entries are strictly **immutable and append-only**. Transactions cannot be updated (`PUT`/`PATCH`) or deleted (`DELETE`) (returns `405 Method Not Allowed`). Rectifications must occur via offsetting compensating credit or debit entries.

3. **Idempotency & Duplicate Reference ID Detection**:
   - Every transaction requires a non-empty `referenceId` representing a client idempotency key.
   - A unique compound database index on `{ accountId: 1, referenceId: 1 }` guarantees that duplicate reference IDs for the same account are rejected (`409 Conflict`) without modifying account balances.

4. **Balance Consistency & Overdraft Protection**:
   - The current balance of any account strictly equals the sum of valid credits minus debits:
     $$\text{Balance} = \sum \text{Credits} - \sum \text{Debits}$$
   - Overdrafts are prohibited. Any debit exceeding current balance is rejected with `400 Bad Request` (`INSUFFICIENT_BALANCE`), leaving the balance unchanged.
   - Database-level conditional operations (`$inc` guarded by `{ balance: { $gte: amount } }`) ensure atomic, race-condition-free execution even under high concurrency.

5. **Atomic Money Transfers**:
   - Transfers between two accounts are executed atomically: debiting the source account, crediting the destination account, and recording dual ledger records.
   - If any step fails, the entire transaction is rolled back via compensating operations. Partial transfers are never permitted.
   - Self-transfers (`fromAccountId === toAccountId`) are rejected (`400 Bad Request`).

6. **Standardized Pagination & Sorting**:
   - All collection GET endpoints (`/accounts`, `/accounts/:id/transactions`) default to `page=1` and `pageSize=10` (max 100).
   - Responses provide structured pagination metadata: `currentPage`, `pageSize`, `totalRecords`, and `totalPages`.
   - All lists are sorted in reverse chronological order (`created_at: -1`, newest first) backed by compound database indexes.

7. **Persistence & Fallback**:
   - Primary storage is MongoDB via Mongoose. If MongoDB is unavailable or `USE_IN_MEMORY=true` is set, the service seamlessly falls back to an in-memory repository to enable offline development and zero-dependency unit testing.

---

## 📮 Postman Collection

A complete, ready-to-import Postman collection and environment are included in the repository:

- **Collection File**: [`postman/transaction-ledger-service.postman_collection.json`](file:///c:/Users/balaj/OneDrive/Desktop/transaction-ledger-service/postman/transaction-ledger-service.postman_collection.json)
- **Environment File**: [`postman/transaction-ledger-service.postman_environment.json`](file:///c:/Users/balaj/OneDrive/Desktop/transaction-ledger-service/postman/transaction-ledger-service.postman_environment.json)

### How to Import & Use in Postman:
1. Open **Postman**.
2. Click **Import** (top left).
3. Select both files:
   - `postman/transaction-ledger-service.postman_collection.json`
   - `postman/transaction-ledger-service.postman_environment.json`
4. Select the imported environment **"Transaction Ledger Service (Local)"** in the top right environment dropdown.
5. All variables (`{{baseUrl}}`, `{{apiPrefix}}`, `{{accountId}}`, `{{recipientAccountId}}`) are pre-configured.
6. Run individual requests or use Postman's **"Run Collection"** to execute all 30+ request scenarios sequentially.

---

## 🧪 Complete cURL Test Suite (All Scenarios)

You can run these `curl` commands directly against `http://localhost:3000` to verify every endpoint and edge-case scenario.

### 1. Health Check
```bash
curl -X GET http://localhost:3000/health
```

---

### 2. Account Management

#### 2.1. Create Account with Auto-Generated UUID (`201 Created`)
```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Springs"
  }'
```

#### 2.2. Create Account with Custom Unique ID (`201 Created`)
```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "acc_user_101",
    "name": "Bob Vance"
  }'
```

#### 2.3. Validation Error: Missing Name (`400 Bad Request`)
```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### 2.4. Business Rule: Client Prohibited from Setting Initial Balance (`400 Bad Request`)
```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Malicious User",
    "balance": 1000
  }'
```

#### 2.5. Conflict Error: Duplicate Account ID (`409 Conflict`)
```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "acc_user_101",
    "name": "Duplicate Bob"
  }'
```

#### 2.6. Get Account by ID (`200 OK`)
```bash
curl -X GET http://localhost:3000/api/v1/accounts/acc_user_101
```

#### 2.7. Get Account by ID: Not Found (`404 Not Found`)
```bash
curl -X GET http://localhost:3000/api/v1/accounts/acc_non_existent_999
```

#### 2.8. List Accounts with Pagination & Sorting (`200 OK`)
```bash
# Page 1, 2 accounts per page (latest first)
curl -X GET "http://localhost:3000/api/v1/accounts?page=1&pageSize=2"

# Page 2
curl -X GET "http://localhost:3000/api/v1/accounts?page=2&pageSize=2"
```

---

### 3. Account Balance

#### 3.1. Get Accurate Account Balance (`200 OK`)
```bash
curl -X GET http://localhost:3000/api/v1/accounts/acc_user_101/balance
```

#### 3.2. Get Balance for Non-Existent Account (`404 Not Found`)
```bash
curl -X GET http://localhost:3000/api/v1/accounts/acc_non_existent_999/balance
```

---

### 4. Transaction Creation & Balance Consistency

#### 4.1. Credit Transaction: Initial Deposit (+100) (`201 Created`)
*Increases account balance from 0 to 100 atomically*:
```bash
curl -X POST http://localhost:3000/api/v1/accounts/acc_user_101/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": 100,
    "referenceId": "ref_credit_001",
    "description": "Initial funding"
  }'
```

#### 4.2. Credit Transaction: Secondary Deposit (+50) (`201 Created`)
*Increases account balance from 100 to 150 atomically*:
```bash
curl -X POST http://localhost:3000/api/v1/accounts/acc_user_101/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": 50,
    "referenceId": "ref_credit_002",
    "description": "Secondary deposit"
  }'
```

#### 4.3. Debit Transaction: Payment (-30) (`201 Created`)
*Decreases account balance from 150 to 120 atomically*:
```bash
curl -X POST http://localhost:3000/api/v1/accounts/acc_user_101/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "debit",
    "amount": 30,
    "referenceId": "ref_debit_001",
    "description": "Utility bill"
  }'
```

#### 4.4. Verify Resulting Balance (`200 OK`)
*Current balance should accurately be 120*:
```bash
curl -X GET http://localhost:3000/api/v1/accounts/acc_user_101/balance
```

#### 4.5. Overdraft Prevention: Insufficient Balance (`400 Bad Request`)
*Attempting to debit 500 when balance is 120 is rejected, leaving balance unchanged*:
```bash
curl -X POST http://localhost:3000/api/v1/accounts/acc_user_101/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "debit",
    "amount": 500,
    "referenceId": "ref_overdraft_fail"
  }'
```

#### 4.6. Idempotency Check: Duplicate Reference ID (`409 Conflict`)
*Reusing `ref_credit_001` for `acc_user_101`*:
```bash
curl -X POST http://localhost:3000/api/v1/accounts/acc_user_101/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": 50,
    "referenceId": "ref_credit_001"
  }'
```

#### 4.7. Validation Error: Invalid Transaction Type (`400 Bad Request`)
```bash
curl -X POST http://localhost:3000/api/v1/accounts/acc_user_101/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "crypto",
    "amount": 50,
    "referenceId": "ref_invalid_type"
  }'
```

#### 4.8. Validation Error: Non-Positive Amount (`400 Bad Request`)
```bash
curl -X POST http://localhost:3000/api/v1/accounts/acc_user_101/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": -10,
    "referenceId": "ref_negative"
  }'
```

#### 4.9. Validation Error: Missing Reference ID (`400 Bad Request`)
```bash
curl -X POST http://localhost:3000/api/v1/accounts/acc_user_101/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": 50
  }'
```

---

### 5. Transaction History & Filtering

#### 5.1. Fetch All Transactions (Latest First Order) (`200 OK`)
```bash
curl -X GET http://localhost:3000/api/v1/accounts/acc_user_101/transactions
```

#### 5.2. Filter History by Type: `credit` (`200 OK`)
```bash
curl -X GET "http://localhost:3000/api/v1/accounts/acc_user_101/transactions?type=credit"
```

#### 5.3. Filter History by Type: `debit` (`200 OK`)
```bash
curl -X GET "http://localhost:3000/api/v1/accounts/acc_user_101/transactions?type=debit"
```

#### 5.4. Paginate Transaction History (`200 OK`)
```bash
# Page 1, 2 items per page
curl -X GET "http://localhost:3000/api/v1/accounts/acc_user_101/transactions?page=1&pageSize=2"

# Page 2, 2 items per page
curl -X GET "http://localhost:3000/api/v1/accounts/acc_user_101/transactions?page=2&pageSize=2"
```

#### 5.5. Enforce Immutability: Rejection of PUT/DELETE (`405 Method Not Allowed`)
```bash
# Attempt to modify transaction
curl -X PUT http://localhost:3000/api/v1/accounts/acc_user_101/transactions \
  -H "Content-Type: application/json" \
  -d '{"amount": 999}'

# Attempt to delete transactions
curl -X DELETE http://localhost:3000/api/v1/accounts/acc_user_101/transactions
```

---

### 6. Money Transfer (Bonus Feature)

First, create a destination account:
```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "acc_user_102",
    "name": "Charlie Brown"
  }'
```

#### 6.1. Successful Atomic Transfer (`200 OK`)
*Transfer 40 from `acc_user_101` (balance 120 -> 80) to `acc_user_102` (balance 0 -> 40)*:
```bash
curl -X POST http://localhost:3000/api/v1/accounts/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "acc_user_101",
    "toAccountId": "acc_user_102",
    "amount": 40,
    "referenceId": "transfer_ref_001",
    "description": "Consulting fee"
  }'
```

#### 6.2. Verify Balances on Both Accounts After Transfer (`200 OK`)
```bash
# Source balance (should be 80)
curl -X GET http://localhost:3000/api/v1/accounts/acc_user_101/balance

# Destination balance (should be 40)
curl -X GET http://localhost:3000/api/v1/accounts/acc_user_102/balance
```

#### 6.3. Transfer Validation: Insufficient Balance with Atomic Rollback (`400 Bad Request`)
*Attempt to transfer 500 when source only has 80 (both accounts remain unchanged)*:
```bash
curl -X POST http://localhost:3000/api/v1/accounts/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "acc_user_101",
    "toAccountId": "acc_user_102",
    "amount": 500,
    "referenceId": "transfer_fail_insufficient"
  }'
```

#### 6.4. Transfer Validation: Self-Transfer Rejection (`400 Bad Request`)
```bash
curl -X POST http://localhost:3000/api/v1/accounts/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "acc_user_101",
    "toAccountId": "acc_user_101",
    "amount": 20,
    "referenceId": "transfer_self_reject"
  }'
```

#### 6.5. Transfer Validation: Non-Existent Destination Account (`404 Not Found`)
```bash
curl -X POST http://localhost:3000/api/v1/accounts/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "acc_user_101",
    "toAccountId": "acc_ghost_404",
    "amount": 20,
    "referenceId": "transfer_dest_404"
  }'
```


