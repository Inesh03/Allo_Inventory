import { NextResponse } from "next/server";
import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/products
 *
 * Returns all products with available stock per warehouse.
 *
 * Before building the response we do a quick "lazy cleanup" pass:
 * any PENDING reservations that have expired get released so the
 * available-quantity numbers are always accurate — even if the
 * Vercel Cron hasn't fired yet.
 */
export async function GET() {
  // ── Lazy cleanup: release any expired reservations ──
  const now = new Date();
  const expired = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.PENDING,
      expiresAt: { lt: now },
    },
  });

  for (const reservation of expired) {
    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    } catch (err) {
      // Log but don't block the response
      console.error(`Lazy cleanup failed for reservation ${reservation.id}:`, err);
    }
  }

  // ── Build response ──
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      inventories: {
        include: {
          warehouse: true,
        },
      },
    },
  });

  const result = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    inventories: product.inventories.map((inventory) => ({
      id: inventory.id,
      warehouseId: inventory.warehouseId,
      warehouseName: inventory.warehouse.name,
      totalQuantity: inventory.totalQuantity,
      reservedQuantity: inventory.reservedQuantity,
      availableQuantity:
        inventory.totalQuantity - inventory.reservedQuantity,
    })),
  }));

  return NextResponse.json(result);
}