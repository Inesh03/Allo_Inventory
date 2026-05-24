"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReserveButtonProps = {
  productId: string;
  warehouseId: string;
  disabled?: boolean;
};

export default function ReserveButton({
  productId,
  warehouseId,
  disabled = false,
}: ReserveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleReserve() {
    try {
      setLoading(true);
      setError("");

      const idempotencyKey = crypto.randomUUID();

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          productId,
          warehouseId,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError("This item just went out of stock at this warehouse.");
          router.refresh();
          return;
        }

        setError(data.error || "Failed to reserve item");
        return;
      }

      router.push(`/reservations/${data.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong while creating the reservation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full sm:w-auto">
      <button
        onClick={handleReserve}
        disabled={disabled || loading}
        className="allo-btn-primary w-full sm:w-auto"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Reserving…
          </span>
        ) : disabled ? (
          "Out of stock"
        ) : (
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            Reserve
          </span>
        )}
      </button>

      {error ? (
        <div
          className="mt-3 rounded-xl px-4 py-3 text-sm font-medium animate-allo-scale-in"
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
    </div>
  );
}