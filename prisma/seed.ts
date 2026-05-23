import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const warehouseBangalore = await prisma.warehouse.create({
    data: {
      name: "Bangalore Central Warehouse",
      code: "BLR-CENTRAL",
    },
  });

  const warehouseMumbai = await prisma.warehouse.create({
    data: {
      name: "Mumbai West Warehouse",
      code: "MUM-WEST",
    },
  });

  const product1 = await prisma.product.create({
    data: {
      name: "Vitamin C Serum",
      sku: "SERUM-001",
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: "Hydrating Face Wash",
      sku: "FACEWASH-001",
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: "Daily Sunscreen SPF 50",
      sku: "SUNSCREEN-001",
    },
  });

  await prisma.inventory.createMany({
    data: [
      {
        productId: product1.id,
        warehouseId: warehouseBangalore.id,
        totalQuantity: 10,
        reservedQuantity: 0,
      },
      {
        productId: product1.id,
        warehouseId: warehouseMumbai.id,
        totalQuantity: 6,
        reservedQuantity: 0,
      },
      {
        productId: product2.id,
        warehouseId: warehouseBangalore.id,
        totalQuantity: 15,
        reservedQuantity: 0,
      },
      {
        productId: product2.id,
        warehouseId: warehouseMumbai.id,
        totalQuantity: 8,
        reservedQuantity: 0,
      },
      {
        productId: product3.id,
        warehouseId: warehouseBangalore.id,
        totalQuantity: 5,
        reservedQuantity: 0,
      },
      {
        productId: product3.id,
        warehouseId: warehouseMumbai.id,
        totalQuantity: 12,
        reservedQuantity: 0,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });