import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { createReservationSchema } from "../../../lib/validations";

const RESERVATION_WINDOW_MINUTES = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      });

      if (!inventory) {
        throw new Error("INVENTORY_NOT_FOUND");
      }

      const available =
        inventory.totalQuantity - inventory.reservedQuantity;

      if (available < quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const updated = await tx.inventory.updateMany({
        where: {
          productId,
          warehouseId,
          reservedQuantity: inventory.reservedQuantity,
        },
        data: {
          reservedQuantity: {
            increment: quantity,
          },
        },
      });

      if (updated.count === 0) {
        throw new Error("CONFLICT");
      }

      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: ReservationStatus.PENDING,
          expiresAt: new Date(
            Date.now() + RESERVATION_WINDOW_MINUTES * 60 * 1000
          ),
        },
      });

      return reservation;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVENTORY_NOT_FOUND") {
        return NextResponse.json(
          { error: "Inventory not found for this product and warehouse" },
          { status: 404 }
        );
      }

      if (
        error.message === "INSUFFICIENT_STOCK" ||
        error.message === "CONFLICT"
      ) {
        return NextResponse.json(
          { error: "Not enough stock available" },
          { status: 409 }
        );
      }
    }

    console.error(error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}