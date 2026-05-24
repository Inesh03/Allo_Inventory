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

      const idempotencyKey = crypto.randomUUID();

      const response = await fetch(`/api/reservations/${reservationId}/${action}`, {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
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
      {/* ── Timer Card ── */}
      <div
        className="rounded-xl p-5"
        style={{
          background: expired
            ? "#fffbeb"
            : status === "CONFIRMED"
            ? "#ecfdf5"
            : status === "RELEASED"
            ? "#fff1f2"
            : "var(--allo-cream-dark)",
          border: `1px solid ${
            expired
              ? "#fde68a"
              : status === "CONFIRMED"
              ? "#a7f3d0"
              : status === "RELEASED"
              ? "#fecdd3"
              : "var(--allo-border)"
          }`,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Timer icon */}
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            style={{
              color: expired
                ? "#d97706"
                : status === "CONFIRMED"
                ? "#059669"
                : status === "RELEASED"
                ? "#e11d48"
                : "var(--allo-purple-500)",
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: "var(--allo-text-muted)" }}>
            Reservation timer
          </p>
        </div>

        <p
          className={`mt-3 text-2xl font-bold ${
            expired && isPending ? "animate-allo-pulse-soft" : ""
          }`}
          style={{
            color: expired
              ? "#d97706"
              : status === "CONFIRMED"
              ? "#059669"
              : status === "RELEASED"
              ? "#e11d48"
              : "var(--allo-purple-700)",
          }}
        >
          {status === "CONFIRMED"
            ? "✓ Purchase confirmed"
            : status === "RELEASED"
            ? "Reservation cancelled"
            : timeLeft}
        </p>

        <p className="mt-2 text-sm" style={{ color: "var(--allo-text-muted)" }}>
          {status === "CONFIRMED"
            ? "The purchase has been finalized and the inventory has been deducted."
            : status === "RELEASED"
            ? "The reservation was cancelled and units have been returned to inventory."
            : "Confirm before expiry to complete the purchase, or cancel to release the held unit back to inventory."}
        </p>
      </div>

      {/* ── Expiry Warning ── */}
      {expired && status === "PENDING" ? (
        <div
          className="mt-4 rounded-xl p-4 text-sm font-medium animate-allo-scale-in"
          style={{
            background: "#fffbeb",
            color: "#92400e",
            border: "1px solid #fde68a",
          }}
        >
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            This reservation has expired. Confirm is no longer available — please create a new reservation from the product list.
          </div>
        </div>
      ) : null}

      {/* ── Error State ── */}
      {error ? (
        <div
          className="mt-4 rounded-xl p-4 text-sm font-medium animate-allo-scale-in"
          style={{
            background: "#fff1f2",
            color: "#be123c",
            border: "1px solid #fecdd3",
          }}
        >
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      ) : null}

      {/* ── Action Buttons ── */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => handleAction("confirm")}
          disabled={!isPending || loadingAction !== null || expired}
          className="allo-btn-primary"
        >
          {loadingAction === "confirm" ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Confirming…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Confirm purchase
            </span>
          )}
        </button>

        <button
          onClick={() => handleAction("release")}
          disabled={!isPending || loadingAction !== null}
          className="allo-btn-secondary"
        >
          {loadingAction === "release" ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Cancelling…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </span>
          )}
        </button>

        <button
          onClick={() => router.push("/")}
          className="allo-btn-ghost"
        >
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to products
          </span>
        </button>
      </div>
    </div>
  );
}