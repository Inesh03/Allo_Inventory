import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { createReservationSchema } from "../../../lib/validations";
import { withIdempotency } from "../../../lib/idempotency";

const RESERVATION_WINDOW_MINUTES = 10;

export async function POST(req: NextRequest) {
  return withIdempotency(req, async () => {
    try {
      const body = await req.clone().json();
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

      const result = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const now = new Date();

          const existingReservation = await tx.reservation.findFirst({
            where: {
              productId,
              warehouseId,
              status: ReservationStatus.PENDING,
            },
            orderBy: {
              createdAt: "desc",
            },
          });

          if (existingReservation) {
            if (existingReservation.expiresAt > now) {
              return {
                reservation: existingReservation,
                reused: true,
              };
            }

            await tx.inventory.updateMany({
              where: {
                productId,
                warehouseId,
                reservedQuantity: {
                  gte: existingReservation.quantity,
                },
              },
              data: {
                reservedQuantity: {
                  decrement: existingReservation.quantity,
                },
              },
            });

            await tx.reservation.update({
              where: { id: existingReservation.id },
              data: {
                status: ReservationStatus.RELEASED,
                releasedAt: now,
              },
            });
          }

          const inventory = await tx.inventory.findUnique({
            where: {
              productId_warehouseId: {
                productId,
                warehouseId,
              },
            },
          });

          if (!inventory) {
            return { error: "INVENTORY_NOT_FOUND" as const };
          }

          const available =
            inventory.totalQuantity - inventory.reservedQuantity;

          if (available < quantity) {
            return { error: "INSUFFICIENT_STOCK" as const };
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
            return { error: "CONFLICT" as const };
          }

          const reservation = await tx.reservation.create({
            data: {
              productId,
              warehouseId,
              quantity,
              status: ReservationStatus.PENDING,
              expiresAt: new Date(
                now.getTime() + RESERVATION_WINDOW_MINUTES * 60 * 1000
              ),
            },
          });

          return {
            reservation,
            reused: false,
          };
        }
      );

      if ("error" in result) {
        if (result.error === "INVENTORY_NOT_FOUND") {
          return NextResponse.json(
            { error: "Inventory not found for this product and warehouse" },
            { status: 404 }
          );
        }

        if (
          result.error === "INSUFFICIENT_STOCK" ||
          result.error === "CONFLICT"
        ) {
          return NextResponse.json(
            { error: "Not enough stock available" },
            { status: 409 }
          );
        }
      }

      return NextResponse.json(result.reservation, { status: 201 });
    } catch (error) {
      console.error(error);

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}