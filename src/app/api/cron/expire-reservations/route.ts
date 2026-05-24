import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cron/expire-reservations
 *
 * Runs on a schedule (Vercel Cron, every minute) to release any PENDING
 * reservations whose expiresAt has passed. For each one we decrement
 * reservedQuantity on the matching Inventory row so the units become
 * available again.
 *
 * Protected by a CRON_SECRET bearer token so random callers can't trigger it.
 */
export async function GET(req: NextRequest) {
  // ── Auth check ──
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all expired pending reservations
    const expired = await prisma.reservation.findMany({
      where: {
        status: ReservationStatus.PENDING,
        expiresAt: { lt: now },
      },
    });

    if (expired.length === 0) {
      return NextResponse.json({ released: 0 });
    }

    // Release each one inside its own transaction so a single failure
    // doesn't block the rest of the batch.
    let released = 0;

    for (const reservation of expired) {
      try {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // Decrement reservedQuantity (with gte guard)
          await tx.inventory.updateMany({
            where: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
              reservedQuantity: { gte: reservation.quantity },
            },
            data: {
              reservedQuantity: { decrement: reservation.quantity },
            },
          });

          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status: ReservationStatus.RELEASED,
              releasedAt: now,
            },
          });
        });

        released++;
      } catch (err) {
        // Log but don't abort — try the rest
        console.error(
          `Failed to release expired reservation ${reservation.id}:`,
          err
        );
      }
    }

    return NextResponse.json({ released, total: expired.length });
  } catch (error) {
    console.error("Cron expire-reservations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
