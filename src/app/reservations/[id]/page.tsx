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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          ← Back to products
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Reservation
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                {reservation.product.name}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Warehouse: {reservation.warehouse.name}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                reservation.status === "CONFIRMED"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : reservation.status === "RELEASED"
                  ? "bg-rose-50 text-rose-700 ring-rose-200"
                  : isExpired
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-teal-50 text-teal-700 ring-teal-200"
              }`}
            >
              {isExpired ? "EXPIRED" : reservation.status}
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Reservation ID</p>
              <p className="mt-2 break-all text-sm font-medium text-slate-900">
                {reservation.id}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Quantity</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {reservation.quantity}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Created at</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {new Date(reservation.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Expires at</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
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