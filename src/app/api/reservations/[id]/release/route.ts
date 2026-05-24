import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "../../../../../lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
      });

      if (!reservation) {
        return { error: "NOT_FOUND" as const };
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        return { error: "INVALID_STATE" as const };
      }

      // Guard: only decrement if reservedQuantity is high enough to avoid going negative
      await tx.inventory.updateMany({
        where: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
          reservedQuantity: {
            gte: reservation.quantity,
          },
        },
        data: {
          reservedQuantity: {
            decrement: reservation.quantity,
          },
        },
      });

      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status: ReservationStatus.RELEASED,
          releasedAt: new Date(),
        },
      });

      return { reservation: updated };
    });

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
      }

      return NextResponse.json({ error: "Invalid reservation state" }, { status: 400 });
    }

    return NextResponse.json(result.reservation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
