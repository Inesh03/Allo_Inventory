# Allo Health Take-Home Exercise — Implementation Audit

## Summary

| Area | Status |
|------|--------|
| Data Model | ✅ Complete |
| API — `GET /api/products` | ✅ Complete |
| API — `GET /api/warehouses` | ✅ Complete |
| API — `POST /api/reservations` | ✅ Complete |
| API — `POST /api/reservations/:id/confirm` | ✅ Complete |
| API — `POST /api/reservations/:id/release` | ✅ Complete |
| Concurrency correctness | ⚠️ Mostly — see notes |
| Frontend — Product listing | ✅ Complete |
| Frontend — Checkout/reservation page | ✅ Complete |
| Frontend — Live countdown | ✅ Complete |
| Frontend — Error visibility (409/410) | ✅ Complete |
| Frontend — UI refresh after confirm/cancel | ✅ Complete |
| Reservation expiry mechanism | ❌ Missing |
| Bonus: Idempotency | ❌ Not implemented |
| README | ❌ Still default template |
| Metadata (layout.tsx title/description) | ⚠️ Still default |
| Database seeding | ✅ Complete |
| Redis (Upstash) | ⚠️ Dependency installed but unused |

---

## 1. Data Model ✅

[schema.prisma](file:///Users/inesh/Desktop/allo-inventory/prisma/schema.prisma)

All required entities are present:
- **Product** — `id`, `name`, `sku` (unique), timestamps ✅
- **Warehouse** — `id`, `name`, `code` (unique), timestamps ✅
- **Inventory** — `totalQuantity`, `reservedQuantity`, composite unique on `[productId, warehouseId]` ✅
- **Reservation** — `status` (PENDING/CONFIRMED/RELEASED), `expiresAt`, `confirmedAt`, `releasedAt`, timestamps ✅
- **ReservationStatus enum** — PENDING, CONFIRMED, RELEASED ✅
- Proper indices on `[productId, warehouseId, status]` and `[expiresAt]` ✅

---

## 2. API ✅

### `GET /api/products` ✅
[route.ts](file:///Users/inesh/Desktop/allo-inventory/src/app/api/products/route.ts)

Returns products with `availableQuantity` per warehouse. Computes `totalQuantity - reservedQuantity` correctly.

### `GET /api/warehouses` ✅
[route.ts](file:///Users/inesh/Desktop/allo-inventory/src/app/api/warehouses/route.ts)

Simple listing, works fine.

### `POST /api/reservations` ✅
[route.ts](file:///Users/inesh/Desktop/allo-inventory/src/app/api/reservations/route.ts)

- Validates input with Zod ✅
- Returns 409 on insufficient stock ✅
- Uses Prisma interactive transaction ✅
- 10-minute expiry window ✅
- Has existing-reservation reuse logic (finds pending, reuses if not expired, releases if expired) ✅

### `POST /api/reservations/:id/confirm` ✅
[route.ts](file:///Users/inesh/Desktop/allo-inventory/src/app/api/reservations/%5Bid%5D/confirm/route.ts)

- Returns 410 if reservation expired ✅
- Returns 404 if not found ✅
- Decrements both `totalQuantity` and `reservedQuantity` on confirm ✅
- Lazy-releases expired reservation when confirm is attempted ✅

### `POST /api/reservations/:id/release` ✅
[route.ts](file:///Users/inesh/Desktop/allo-inventory/src/app/api/reservations/%5Bid%5D/release/route.ts)

- Returns 404 if not found ✅
- Returns 400 for invalid state ✅
- Decrements `reservedQuantity` on release ✅

---

## 3. Concurrency ⚠️ Mostly Correct

The reserve endpoint uses an **optimistic concurrency control** pattern within a Prisma interactive transaction:

```typescript
// Line 92-103 of reservations/route.ts
const updated = await tx.inventory.updateMany({
  where: {
    productId,
    warehouseId,
    reservedQuantity: inventory.reservedQuantity, // CAS check
  },
  data: { reservedQuantity: { increment: quantity } },
});
if (updated.count === 0) {
  return { error: "CONFLICT" as const };
}
```

> [!WARNING]
> ### Potential Issue: Transaction Isolation Level
> Prisma's default interactive transaction uses **Read Committed** isolation. This means the `findUnique` + conditional `updateMany` pattern *could* still have a narrow TOCTOU window under very high contention. The CAS-style `where` clause on `reservedQuantity` is good — it will catch most races — but for bulletproof guarantees you'd want either:
> - A `SELECT ... FOR UPDATE` (using `$queryRaw`)
> - Serializable isolation: `prisma.$transaction(..., { isolationLevel: 'Serializable' })`
>
> For a take-home this is likely acceptable, but **mention this trade-off in your README**.

> [!WARNING]
> ### Release endpoint missing guard
> In [release/route.ts](file:///Users/inesh/Desktop/allo-inventory/src/app/api/reservations/%5Bid%5D/release/route.ts#L25-L35), the `updateMany` doesn't have a `gte` guard on `reservedQuantity` before decrementing. If something goes wrong, `reservedQuantity` could go negative. The confirm endpoint has this guard (line 57-59) but release does not.

---

## 4. Frontend ✅

### Product listing page ✅
[page.tsx](file:///Users/inesh/Desktop/allo-inventory/src/app/page.tsx)

- Shows products with available stock per warehouse ✅
- Reserve button per warehouse row ✅
- Disables button when available ≤ 0 ✅

### Checkout/reservation page ✅
[page.tsx](file:///Users/inesh/Desktop/allo-inventory/src/app/reservations/%5Bid%5D/page.tsx)

- Shows reservation details (product, warehouse, quantity, ID, timestamps) ✅
- Status badge (color-coded for PENDING/CONFIRMED/RELEASED/EXPIRED) ✅
- Confirm purchase button ✅
- Cancel button ✅
- Back to products link ✅

### Live countdown ✅
[reservation-actions.tsx](file:///Users/inesh/Desktop/allo-inventory/src/components/reservation-actions.tsx)

- `setInterval` at 1-second tick ✅
- Shows "M:SS remaining" format ✅
- Transitions to "Expired" state when timer hits 0 ✅
- Triggers `router.refresh()` on expiry ✅
- Disables confirm button when expired ✅

### Error visibility ✅
- 409 (not enough stock) → visible error in [reserve-button.tsx](file:///Users/inesh/Desktop/allo-inventory/src/components/reserve-button.tsx#L41-L44) ✅
- 410 (reservation expired) → visible error in [reservation-actions.tsx](file:///Users/inesh/Desktop/allo-inventory/src/components/reservation-actions.tsx#L76-L83) ✅
- UI refreshes after confirm/cancel via `router.push("/")` + `router.refresh()` ✅

---

## 5. Reservation Expiry ❌ MISSING

> [!CAUTION]
> **This is a required deliverable.** The exercise states:
> *"Reservations that aren't confirmed before expiresAt should be released automatically so the units return to available stock."*
>
> Currently, there is **no automatic expiry mechanism**:
> - No cron job / Vercel Cron route
> - No background worker
> - The only "lazy cleanup" happens:
>   - When someone tries to **confirm** an expired reservation (confirm route releases it inline)
>   - When a new reservation is created and finds an expired pending one for the same product+warehouse
>
> **But**: if a reservation expires and nobody ever confirms or creates a new one for that product/warehouse, the reserved units are **stuck forever** as reserved, making the available count permanently wrong.

### What you need
At minimum, one of:
1. **A Vercel Cron route** (e.g. `GET /api/cron/expire-reservations`) that runs every minute, finds all `PENDING` reservations where `expiresAt < now`, and releases them in batch.
2. **Lazy cleanup on the `GET /api/products` read path** — before returning inventory, scan for and release expired reservations.
3. Describe whichever approach you choose in the README.

---

## 6. Bonus: Idempotency ❌ Not Implemented

- No `Idempotency-Key` header handling anywhere in the code.
- `@upstash/redis` is in `package.json` but never imported or used.
- This is optional per the spec, but since you installed the Redis dependency, it looks like you intended to implement it.

> [!TIP]
> If you don't plan to implement it, remove `@upstash/redis` from dependencies to avoid confusion. If you do implement it, the README should describe the approach.

---

## 7. README ❌ Still Default Template

[README.md](file:///Users/inesh/Desktop/allo-inventory/README.md)

The README is still the boilerplate from `create-next-app`. The exercise **requires** it to include:

- [ ] How to run the app locally (env vars, migrations, seed)
- [ ] How the expiry mechanism works in production
- [ ] Any trade-offs you made or things you'd do differently with more time

---

## 8. Other Observations

### Metadata still default ⚠️
[layout.tsx](file:///Users/inesh/Desktop/allo-inventory/src/app/layout.tsx#L15-L18) still says:
```typescript
title: "Create Next App",
description: "Generated by create next app",
```
Should be updated to something relevant like "Allo Inventory — Reservation System".

### Git history is thin ⚠️
Only 4 commits. The exercise says *"Commit as you go — we look at the git history."* Consider more granular commits showing your thought process.

### Database seeding ✅
[seed.ts](file:///Users/inesh/Desktop/allo-inventory/prisma/seed.ts) creates 3 products × 2 warehouses with realistic data. Good.

### TypeScript ✅
Used end-to-end as recommended.

### Zod ✅
Used for reservation input validation in [validations.ts](file:///Users/inesh/Desktop/allo-inventory/src/lib/validations.ts).

### Tailwind + clean UI ✅
Good-looking, functional UI using Tailwind CSS with a cohesive teal color scheme.

---

## Action Items (Priority Order)

| # | Priority | Item | Effort |
|---|----------|------|--------|
| 1 | 🔴 High | Implement reservation expiry mechanism (cron route or lazy cleanup) | ~30 min |
| 2 | 🔴 High | Write a proper README (local setup, expiry approach, trade-offs) | ~20 min |
| 3 | 🟡 Medium | Add `gte` guard to release endpoint's `reservedQuantity` decrement | ~5 min |
| 4 | 🟡 Medium | Update `layout.tsx` metadata to something relevant | ~2 min |
| 5 | 🟡 Medium | Consider mentioning concurrency trade-offs (isolation level) in README | ~5 min |
| 6 | 🟢 Low | Remove unused `@upstash/redis` dependency (or implement idempotency) | ~5 min |
| 7 | 🟢 Low | Make more granular git commits going forward | ongoing |
