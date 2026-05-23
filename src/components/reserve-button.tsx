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

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        className="inline-flex w-full items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
      >
        {loading ? "Reserving..." : disabled ? "Out of stock" : "Reserve"}
      </button>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}