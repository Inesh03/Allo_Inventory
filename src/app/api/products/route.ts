import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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