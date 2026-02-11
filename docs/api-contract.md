# API Contract

This document covers the custom Payload endpoints implemented in:
- `/Users/lingc/Projects/nextjs/mutto-cms/src/endpoints/auth.ts`
- `/Users/lingc/Projects/nextjs/mutto-cms/src/endpoints/content.ts`

Base URL: `/api`

## Conventions

### Success response shape

```json
{
  "success": true,
  "data": {}
}
```

### Error response shape

```json
{
  "success": false,
  "message": "Error message",
  "details": null
}
```

### Authentication

- Auth is cookie-based.
- Login/Register set an HTTP-only token cookie.
- Logout clears the token cookie.
- Cookie name is `${cookiePrefix}-token` (default Payload prefix usually yields `payload-token`).

## Endpoints

### `POST /api/auth/login`

Authenticate user by email/password.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Responses:
- `200`:

```json
{
  "success": true,
  "data": {
    "id": "USER_ID",
    "email": "user@example.com"
  }
}
```

- `400`: email/password missing
- `401`: invalid credentials
- `500`: token generation failure

Side effects:
- Sets `Set-Cookie` auth token cookie.

### `POST /api/auth/register`

Create a new user, then auto-login.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "optional display name"
}
```

Validation:
- `email` must be valid.
- `password` must be at least 8 chars.

User defaults applied:
- `nickname`: `name` or email prefix
- `role`: `free`
- `isVerified`: `false`

Responses:
- `201`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "USER_ID",
      "email": "user@example.com"
    }
  }
}
```

- `400`: validation failure
- `409`: email already exists
- `500`: registration/login failure

Side effects:
- Sets `Set-Cookie` auth token cookie.

### `GET /api/auth/me`

Get the authenticated user from request headers/cookies.

Request:
- No body required.
- Requires valid auth cookie/token.

Responses:
- `200`:

```json
{
  "success": true,
  "data": {
    "id": "USER_ID",
    "email": "user@example.com"
  }
}
```

- `401`: unauthorized

### `POST /api/auth/logout`

Invalidate session and clear auth cookie.

Request:
- No body required.

Responses:
- `200`:

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

Side effects:
- Clears auth cookie via expired `Set-Cookie`.
- Attempts server-side session logout.

### `POST /api/generate-coupons`

Generate coupon documents in `coupons` collection.

Request body:

```json
{
  "count": 10,
  "batchId": "optional-batch-id"
}
```

Rules:
- `count` defaults to `10`.
- `count` must be `1..1000`.
- `batchId` defaults to current timestamp string.
- Codes format: 16 chars grouped as `XXXX-XXXX-XXXX-XXXX` using characters `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`.

Responses:
- `200`:

```json
{
  "success": true,
  "data": {
    "batchId": "1730000000000",
    "generated": 10
  }
}
```

- `400`: invalid `count`
- `500`: create failure (non-duplicate error)

Notes:
- Duplicate-code create errors are skipped, so `generated` may be lower than requested `count`.

### `GET /api/content/list`

Get paginated ASMR resources, always filtered to `public=true`.

Request:
- No body required.
- Supports query params forwarded to local find options:
  - `page`
  - `limit`
  - `depth`
  - `sort`
  - `where` (combined with `public=true` by `and`)

Responses:
- `200`:

```json
{
  "success": true,
  "data": {
    "docs": [],
    "totalDocs": 0
  }
}
```

- `502`: content fetch failed

### `GET /api/content/:id`

Get one ASMR resource by ID.

Request:
- Path param: `id` (resource id)
- No body required.

Rules:
- Non-public resources return `404`.

Responses:
- `200`:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "ASMR title"
  }
}
```

- `400`: missing/invalid resource id
- `404`: resource not found or not public
- `500`: fetch failure

### `POST /api/content/purchase/:id`

Purchase one ASMR resource using user points.

Request:
- Path param: `id` (resource id)
- Requires valid auth session cookie/token.
- No body required.

Rules:
- User must be authenticated.
- Resource must exist.
- Resource must not already be owned by the user.
- Resource `price` must be greater than `0`.
- User points must be >= resource price.
- On success:
  - deducts points
  - appends resource id to `ownedAsmrResources`

Responses:
- `201`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "points": 120
    },
    "resource": {
      "id": 99,
      "price": 30
    },
    "transaction": {
      "pointsDeducted": 30,
      "remainingPoints": 120,
      "purchaseTime": "2026-02-11T00:00:00.000Z"
    }
  }
}
```

- `400`: missing id / invalid purchase / insufficient points
- `401`: unauthenticated or invalid session
- `404`: resource not found
- `409`: already owned
- `500`: purchase update failure
