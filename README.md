# Allo Inventory — Reservation System

A Next.js application that solves the checkout race condition for multi-warehouse inventory. When a customer proceeds to checkout, the system temporarily holds (reserves) units for a 10-minute window. If payment succeeds, the reservation is confirmed and stock is permanently decremented. If payment fails or the timer runs out, the hold is released and the units become available again.

**Live URL:** [https://allo-inventory-bycqok49y-inesh03s-projects.vercel.app](https://allo-inventory-bycqok49y-inesh03s-projects.vercel.app)

---

## Local Setup

### Prerequisites

- Node.js 18+
- A hosted PostgreSQL database (I used [Supabase](https://supabase.com/))

### Steps

```bash
# Clone and install
git clone https://github.com/Inesh03/Allo_Inventory.git
cd Allo_Inventory
npm install

# Set up environment variables
cp .env.example .env
# Then fill in your values (see below)

# Run migrations and seed the database
npx prisma migrate deploy
npx prisma db seed

# Start the dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string (pooled/transaction mode) |
| `DIRECT_URL` | Postgres direct connection string (for migrations) |
| `CRON_SECRET` | Bearer token for the cron endpoint (any random string) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (for idempotency) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products` | List products with available stock per warehouse |
| `GET` | `/api/warehouses` | List warehouses |
| `POST` | `/api/reservations` | Reserve units for a product/warehouse. Returns `409` if not enough stock |
| `POST` | `/api/reservations/:id/confirm` | Confirm reservation (payment succeeded). Returns `410` if expired |
| `POST` | `/api/reservations/:id/release` | Release reservation early (payment failed or user cancelled) |
| `GET` | `/api/cron/expire-reservations` | Cron endpoint — batch-releases expired reservations |

---

## How Reservation Expiry Works

I went with a two-layer approach:

### 1. Vercel Cron (primary)

A `GET /api/cron/expire-reservations` endpoint runs every minute via Vercel Cron (`vercel.json`). It finds all `PENDING` reservations where `expiresAt < now`, decrements `reservedQuantity` on the matching inventory row, and marks them as `RELEASED`.

Each reservation is released in its own database transaction, so if one fails it doesn't block the rest. The endpoint is protected by a `CRON_SECRET` bearer token.

### 2. Lazy cleanup on read (safety net)

The `GET /api/products` endpoint runs the same cleanup logic before returning results. This means even if the cron hasn't fired yet (or is delayed), the available stock numbers are always accurate when a user loads the product page.

**Why both?** The cron handles the common case — reservations expire and get cleaned up within a minute. The lazy cleanup handles the edge case where a user loads the product page right after a reservation expires but before the next cron tick. Together they guarantee stock is never stuck as reserved.

---

## Concurrency

The core challenge is: if two customers try to reserve the last unit simultaneously, exactly one should succeed.

I used an **optimistic concurrency control** pattern. When reserving, the code:

1. Reads the current `reservedQuantity` inside a Prisma interactive transaction
2. Attempts an `updateMany` with a `WHERE reservedQuantity = <previously read value>` (CAS-style check)
3. If `updated.count === 0`, another request got there first → return `409`

```typescript
const updated = await tx.inventory.updateMany({
  where: {
    productId,
    warehouseId,
    reservedQuantity: inventory.reservedQuantity, // CAS check
  },
  data: { reservedQuantity: { increment: quantity } },
});

if (updated.count === 0) {
  return { error: "CONFLICT" };
}
```

This works well for the expected contention level. Under extreme load you could hit a narrow TOCTOU window because Prisma's default transaction isolation is Read Committed. For a production system I'd either bump to `Serializable` isolation or use a raw `SELECT ... FOR UPDATE` to take a row-level lock. I kept it simple here because the CAS check catches the vast majority of races and the trade-off felt right for this scope.

---

## Idempotency (Bonus)

The reserve (`POST /api/reservations`) and confirm (`POST /api/reservations/:id/confirm`) endpoints support idempotency via an `Idempotency-Key` header.

### How it works

1. The client generates a UUID (`crypto.randomUUID()`) before each action and sends it as an `Idempotency-Key` header
2. The server checks Redis for a cached response under `idempotency:<key>`
3. **Cache hit** → return the stored response immediately with an `X-Idempotency-Replayed: true` header. No database side effects.
4. **Cache miss** → acquire a short NX lock (`idempotency-lock:<key>`), process the request normally, cache the response with a 24-hour TTL, release the lock

The NX lock prevents two identical requests from racing through the handler simultaneously — if the lock is already held, the second request gets a `409` with a "request in progress" message.

### Graceful degradation

If Redis is unreachable (network blip, cold start), the middleware catches the error and falls through to process the request normally. Idempotency is a safety net, not a hard dependency — the app keeps working without it.

### Why Upstash Redis?

Upstash provides a serverless, HTTP-based Redis that works well with Vercel's edge/serverless model. No persistent connections to manage, and the free tier is more than enough for this use case.

---

## Trade-offs & What I'd Do Differently

**What's here:**
- Full reservation lifecycle (reserve → confirm/release)
- Concurrency-safe reservations with optimistic locking
- Automatic expiry (cron + lazy cleanup)
- Idempotency on reserve and confirm via Redis
- Live countdown timer on the checkout page
- Proper error handling with visible 409/410 feedback

**What I'd improve with more time:**

- **Serializable transactions** — As mentioned above, bumping the isolation level or using `SELECT ... FOR UPDATE` would close the theoretical TOCTOU window entirely.

- **WebSocket / SSE for live updates** — Right now the product page shows a snapshot. If another user reserves the last unit, you won't see the stock change until you refresh. Server-Sent Events or polling would fix this.

- **Tests** — I'd add integration tests for the concurrency edge cases (concurrent reserves for the last unit, confirm after expiry, double-release). These are the scenarios that matter most and are easy to get wrong.

- **More granular stock management** — The current model has a single `totalQuantity` per product per warehouse. In production you'd want batch/lot tracking, safety stock thresholds, and possibly multi-location fulfillment logic.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript end-to-end
- **Database:** PostgreSQL (Supabase) via Prisma ORM
- **Cache:** Redis (Upstash) for idempotency
- **Validation:** Zod
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
