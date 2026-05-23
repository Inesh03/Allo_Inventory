import { prisma } from "@/lib/prisma";
import ReserveButton from "@/components/reserve-button";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      inventories: {
        include: {
          warehouse: true,
        },
        orderBy: {
          warehouse: {
            name: "asc",
          },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-teal-50 px-4 py-1 text-sm font-medium text-teal-700 ring-1 ring-inset ring-teal-200">
              Allo-style inventory reservation demo
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Better stock control, better checkout experience
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Reserve inventory for a short checkout window, confirm on payment
              success, and release automatically on cancellation or expiry.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">Products</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {products.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">Warehouses</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {new Set(
                  products.flatMap((product) =>
                    product.inventories.map((inventory) => inventory.warehouseId)
                  )
                ).size}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">
                Inventory rows
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {products.reduce(
                  (acc, product) => acc + product.inventories.length,
                  0
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Available products
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Choose a warehouse and reserve stock for checkout.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                    {product.sku}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                    {product.name}
                  </h3>
                </div>

                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-200">
                  Ready to reserve
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {product.inventories.map((inventory) => {
                  const available =
                    inventory.totalQuantity - inventory.reservedQuantity;

                  return (
                    <div
                      key={inventory.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {inventory.warehouse.name}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                              Total: {inventory.totalQuantity}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                              Reserved: {inventory.reservedQuantity}
                            </span>
                            <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700 ring-1 ring-teal-200">
                              Available: {available}
                            </span>
                          </div>
                        </div>

                        <ReserveButton
                          productId={product.id}
                          warehouseId={inventory.warehouseId}
                          disabled={available <= 0}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}