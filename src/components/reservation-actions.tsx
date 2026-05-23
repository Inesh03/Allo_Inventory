"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ReservationActionsProps = {
  reservationId: string;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
};

export default function ReservationActions({
  reservationId,
  status,
  expiresAt,
}: ReservationActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"confirm" | "release" | null>(null);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const hasRefreshedOnExpiry = useRef(false);

  const isPending = status === "PENDING";
  const expiryTime = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);

  useEffect(() => {
    if (!isPending) {
      setExpired(false);
      setTimeLeft("");
      return;
    }

    function updateCountdown() {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Expired");

        if (!hasRefreshedOnExpiry.current) {
          hasRefreshedOnExpiry.current = true;
          router.refresh();
        }

        return;
      }

      setExpired(false);

      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")} remaining`);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiryTime, isPending, router]);

  async function handleAction(action: "confirm" | "release") {
    try {
      setLoadingAction(action);
      setError("");

      const response = await fetch(`/api/reservations/${reservationId}/${action}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          setExpired(true);
          setError(
            "This reservation expired before confirmation. Please go back and reserve the item again."
          );
          router.refresh();
          return;
        }

        if (response.status === 409) {
          setError(
            "This action could not be completed because the inventory state changed."
          );
          router.refresh();
          return;
        }

        setError(data.error || `Failed to ${action} reservation`);
        router.refresh();
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(`Something went wrong while trying to ${action} the reservation.`);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-medium text-slate-500">Reservation timer</p>
        <p
          className={`mt-2 text-2xl font-semibold ${
            expired ? "text-amber-600" : "text-slate-900"
          }`}
        >
          {status === "CONFIRMED"
            ? "Purchase confirmed"
            : status === "RELEASED"
            ? "Reservation cancelled"
            : timeLeft}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Confirm before expiry to complete the purchase, or cancel to release
          the held unit back to inventory.
        </p>
      </div>

      {expired && status === "PENDING" ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          This reservation has expired. Confirm is no longer available, and you should create a new reservation from the product list.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => handleAction("confirm")}
          disabled={!isPending || loadingAction !== null || expired}
          className="inline-flex items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loadingAction === "confirm" ? "Confirming..." : "Confirm purchase"}
        </button>

        <button
          onClick={() => handleAction("release")}
          disabled={!isPending || loadingAction !== null}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {loadingAction === "release" ? "Cancelling..." : "Cancel"}
        </button>

        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center justify-center rounded-full border border-transparent px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Back to products
        </button>
      </div>
    </div>
  );
}