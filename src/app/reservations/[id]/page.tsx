import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReservationActions from "@/components/reservation-actions";

type ReservationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReservationPage({
  params,
}: ReservationPageProps) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  });

  if (!reservation) {
    notFound();
  }

  const now = new Date();
  const isExpired =
    reservation.status === "PENDING" && reservation.expiresAt <= now;

  const statusConfig = {
    CONFIRMED: { label: "CONFIRMED", className: "allo-badge allo-badge-green" },
    RELEASED: { label: "RELEASED", className: "allo-badge allo-badge-rose" },
    PENDING: isExpired
      ? { label: "EXPIRED", className: "allo-badge allo-badge-amber" }
      : { label: "PENDING", className: "allo-badge allo-badge-purple" },
  };

  const { label: statusLabel, className: statusClass } =
    statusConfig[reservation.status];

  return (
    <main className="min-h-screen px-6 py-10 lg:px-8" style={{ background: "var(--allo-cream)" }}>
      {/* ── Navigation Bar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 backdrop-blur-md"
        style={{ borderColor: "var(--allo-border)" }}
      >
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
            <span
              className="text-lg font-semibold"
              style={{ color: "var(--allo-purple-700)" }}
            >
              Inventory
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span
              className="hidden text-sm font-medium sm:block"
              style={{ color: "var(--allo-text-muted)" }}
            >
              Reservation System
            </span>
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "var(--allo-purple-500)" }}
            >
              A
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl pt-16">
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 text-sm font-medium transition-colors animate-allo-fade-in"
          style={{ color: "var(--allo-purple-500)" }}
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to products
        </Link>

        <div className="allo-card-static mt-6 p-8 animate-allo-fade-in-up delay-100">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: "var(--allo-purple-500)" }}
              >
                Reservation
              </p>
              <h1
                className="mt-2 text-3xl font-bold"
                style={{ color: "var(--allo-text-primary)" }}
              >
                {reservation.product.name}
              </h1>
              <p className="mt-2 text-sm" style={{ color: "var(--allo-text-muted)" }}>
                Warehouse: {reservation.warehouse.name}
              </p>
            </div>

            <span className={statusClass}>{statusLabel}</span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div
              className="rounded-xl p-4"
              style={{
                background: "var(--allo-cream-dark)",
                border: "1px solid var(--allo-border)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--allo-text-muted)" }}>
                Reservation ID
              </p>
              <p
                className="mt-2 break-all text-sm font-medium"
                style={{ color: "var(--allo-text-primary)" }}
              >
                {reservation.id}
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                background: "var(--allo-cream-dark)",
                border: "1px solid var(--allo-border)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--allo-text-muted)" }}>
                Quantity
              </p>
              <p
                className="mt-2 text-lg font-bold"
                style={{ color: "var(--allo-purple-700)" }}
              >
                {reservation.quantity}
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                background: "var(--allo-cream-dark)",
                border: "1px solid var(--allo-border)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--allo-text-muted)" }}>
                Created at
              </p>
              <p
                className="mt-2 text-sm font-medium"
                style={{ color: "var(--allo-text-primary)" }}
              >
                {new Date(reservation.createdAt).toLocaleString()}
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                background: "var(--allo-cream-dark)",
                border: "1px solid var(--allo-border)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--allo-text-muted)" }}>
                Expires at
              </p>
              <p
                className="mt-2 text-sm font-medium"
                style={{ color: "var(--allo-text-primary)" }}
              >
                {new Date(reservation.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <ReservationActions
              reservationId={reservation.id}
              status={reservation.status}
              expiresAt={reservation.expiresAt.toISOString()}
            />
          </div>
        </div>
      </div>
    </main>
  );
}