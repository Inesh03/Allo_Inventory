import { prisma } from "@/lib/prisma";
import ReserveButton from "@/components/reserve-button";
export const dynamic = "force-dynamic";

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
    <main className="min-h-screen" style={{ background: "var(--allo-cream)" }}>
      {/* ── Navigation Bar ── */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md" style={{ borderColor: "var(--allo-border)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://media.allohealth.care/allo-logo-v1.png"
              alt="Allo Health Logo"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="text-lg font-semibold" style={{ color: "var(--allo-purple-700)" }}>
              Inventory
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm font-medium sm:block" style={{ color: "var(--allo-text-muted)" }}>
              Reservation System
            </span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--allo-purple-500)" }}>
              A
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--allo-cream) 0%, var(--allo-cream-dark) 50%, var(--allo-cream-deeper) 100%)" }}
      >
        {/* Decorative gradient orb */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--allo-purple-300), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--allo-gold), transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="max-w-3xl animate-allo-fade-in">
            <span className="allo-badge allo-badge-gold">
              <svg className="mr-1.5 h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.05 2.927z" />
              </svg>
              Allo Health — Inventory Demo
            </span>

            <h1
              className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
              style={{ color: "var(--allo-purple-700)", lineHeight: 1.1 }}
            >
              Better stock control,{" "}
              <br className="hidden sm:block" />
              better checkout
            </h1>

            <p
              className="mt-5 max-w-2xl text-base leading-7 sm:text-lg"
              style={{ color: "var(--allo-text-secondary)" }}
            >
              Reserve inventory for a short checkout window, confirm on payment
              success, and release automatically on cancellation or expiry.
            </p>
          </div>

          {/* ── Stats Row ── */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3 animate-allo-fade-in-up delay-200">
            <div className="allo-stat-card">
              <p className="text-sm font-medium" style={{ color: "var(--allo-text-muted)" }}>
                Products
              </p>
              <p className="mt-2 text-3xl font-bold" style={{ color: "var(--allo-purple-700)" }}>
                {products.length}
              </p>
            </div>

            <div className="allo-stat-card">
              <p className="text-sm font-medium" style={{ color: "var(--allo-text-muted)" }}>
                Warehouses
              </p>
              <p className="mt-2 text-3xl font-bold" style={{ color: "var(--allo-purple-700)" }}>
                {new Set(
                  products.flatMap((product) =>
                    product.inventories.map((inventory) => inventory.warehouseId)
                  )
                ).size}
              </p>
            </div>

            <div className="allo-stat-card">
              <p className="text-sm font-medium" style={{ color: "var(--allo-text-muted)" }}>
                Inventory rows
              </p>
              <p className="mt-2 text-3xl font-bold" style={{ color: "var(--allo-purple-700)" }}>
                {products.reduce(
                  (acc, product) => acc + product.inventories.length,
                  0
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product Listing ── */}
      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4 animate-allo-fade-in">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--allo-text-primary)" }}>
              Available products
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--allo-text-muted)" }}>
              Choose a warehouse and reserve stock for checkout.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {products.map((product, index) => (
            <article
              key={product.id}
              className="allo-card p-6 animate-allo-fade-in-up"
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--allo-purple-500)" }}
                  >
                    {product.sku}
                  </p>
                  <h3
                    className="mt-2 text-xl font-bold sm:text-2xl"
                    style={{ color: "var(--allo-text-primary)" }}
                  >
                    {product.name}
                  </h3>
                </div>

                <span className="allo-badge allo-badge-gold whitespace-nowrap">
                  Ready to reserve
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {product.inventories.map((inventory) => {
                  const available =
                    inventory.totalQuantity - inventory.reservedQuantity;

                  return (
                    <div
                      key={inventory.id}
                      className="rounded-xl p-4 transition-colors"
                      style={{ background: "var(--allo-cream-dark)", border: "1px solid var(--allo-border)" }}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--allo-text-primary)" }}>
                            {inventory.warehouse.name}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span
                              className="rounded-full bg-white px-3 py-1"
                              style={{ color: "var(--allo-text-muted)", border: "1px solid var(--allo-border)" }}
                            >
                              Total: {inventory.totalQuantity}
                            </span>
                            <span
                              className="rounded-full bg-white px-3 py-1"
                              style={{ color: "var(--allo-text-muted)", border: "1px solid var(--allo-border)" }}
                            >
                              Reserved: {inventory.reservedQuantity}
                            </span>
                            <span className="allo-badge allo-badge-green">
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

      {/* ── Footer ── */}
      <footer className="mt-auto border-t py-6" style={{ borderColor: "var(--allo-border)" }}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://media.allohealth.care/allo-logo-v1.png"
                alt="Allo Health Logo"
                width={28}
                height={28}
                className="h-7 w-7 opacity-60"
              />
              <span className="text-sm font-medium" style={{ color: "var(--allo-text-muted)" }}>
                Allo Inventory — Take-Home Exercise
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--allo-text-muted)" }}>
              Reservation system with real-time stock management
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}