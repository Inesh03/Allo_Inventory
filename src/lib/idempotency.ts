import { NextRequest, NextResponse } from "next/server";
import { redis } from "./redis";

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const LOCK_TTL_SECONDS = 30; // max time a request can hold the lock

type CachedResponse = {
  status: number;
  body: unknown;
};

/**
 * Wraps an API route handler with idempotency support.
 *
 * If the request includes an `Idempotency-Key` header:
 *   1. Check Redis for a cached response under that key
 *   2. If found → return the cached response (no side effects)
 *   3. If not found → acquire a short lock, run the handler,
 *      cache the result, and return it
 *
 * If no header is present, the handler runs normally with no
 * idempotency behavior (backwards compatible).
 */
export async function withIdempotency(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const idempotencyKey = req.headers.get("idempotency-key");

  // No header → skip idempotency, run handler directly
  if (!idempotencyKey) {
    return handler();
  }

  const cacheKey = `idempotency:${idempotencyKey}`;
  const lockKey = `idempotency-lock:${idempotencyKey}`;

  // Step 1: Check if we already have a cached response for this key
  try {
    const cached = await redis.get<CachedResponse>(cacheKey);

    if (cached) {
      // Return the cached response without running the handler again
      const response = NextResponse.json(cached.body, {
        status: cached.status,
      });
      response.headers.set("X-Idempotency-Replayed", "true");
      return response;
    }
  } catch (err) {
    // If Redis is down, fall through and process normally
    console.error("Redis GET failed, skipping idempotency cache:", err);
  }

  // Step 2: Try to acquire a lock so concurrent duplicates don't both run
  try {
    const lockAcquired = await redis.set(lockKey, "1", {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });

    if (!lockAcquired) {
      // Another request with the same key is currently being processed
      return NextResponse.json(
        { error: "A request with this idempotency key is already in progress" },
        { status: 409 }
      );
    }
  } catch (err) {
    // If Redis is down, skip locking and process anyway
    console.error("Redis SET lock failed, processing without lock:", err);
  }

  // Step 3: Run the actual handler
  try {
    const response = await handler();

    // Step 4: Cache the response for future replays
    const body = await response.clone().json();
    const cached: CachedResponse = {
      status: response.status,
      body,
    };

    try {
      await redis.set(cacheKey, cached, { ex: IDEMPOTENCY_TTL_SECONDS });
    } catch (err) {
      console.error("Redis SET cache failed:", err);
    }

    return response;
  } finally {
    // Always release the lock when done
    try {
      await redis.del(lockKey);
    } catch (err) {
      console.error("Redis DEL lock failed:", err);
    }
  }
}
