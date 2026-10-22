"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSelectionStatus } from "@/app/admin/actions";
import type { CustomerOption, AdminPhoto } from "./GalleriesAdmin";

export type AdminSelection = {
  customer_id: string;
  photo_id: string;
  status: "draft" | "submitted" | "completed";
  submitted_at: string | null;
};

type Message = { kind: "error" | "ok"; text: string } | null;

const STATUS_BADGE: Record<string, string> = {
  none: "bg-gray-100 text-gray-600 border-gray-200",
  draft: "bg-amber-50 text-amber-800 border-amber-200",
  submitted: "bg-blue-50 text-blue-800 border-blue-200",
  completed: "bg-green-50 text-green-800 border-green-200",
};

export default function SelectionsAdmin({
  customers,
  selections,
  photos,
}: {
  customers: CustomerOption[];
  selections: AdminSelection[];
  photos: AdminPhoto[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  const photoById = useMemo(
    () => new Map(photos.map((photo) => [photo.id, photo])),
    [photos]
  );

  const customerSelections = selections.filter(
    (selection) => selection.customer_id === customerId
  );

  const overallStatus = !customerId
    ? "none"
    : customerSelections.length === 0
      ? "none"
      : customerSelections.every((selection) => selection.status === "completed")
        ? "completed"
        : customerSelections.some((selection) => selection.status === "submitted")
          ? "submitted"
          : "draft";

  function run(action: () => Promise<{ error?: string }>, okText: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "ok", text: okText });
        router.refresh();
      }
    });
  }

  function downloadList() {
    const header = "photo_id,title,status,submitted_at";
    const lines = customerSelections.map((selection) => {
      const photo = photoById.get(selection.photo_id);
      return [
        selection.photo_id,
        `"${(photo?.title ?? "Untitled").replace(/"/g, '""')}"`,
        selection.status,
        selection.submitted_at ?? "",
      ].join(",");
    });
    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `selections-${customerId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h2 className="font-display text-2xl">Customer Selections</h2>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          className="max-w-xs rounded-md border border-[#e6dac8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gold"
          aria-label="Choose customer"
        >
          <option value="">Choose customer…</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.label}
            </option>
          ))}
        </select>

        {customerId && (
          <span
            className={`rounded-full border px-3 py-1 text-[11px] capitalize ${STATUS_BADGE[overallStatus]}`}
          >
            {overallStatus === "none" ? "no selections" : overallStatus}
          </span>
        )}
      </div>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-3 rounded-md px-4 py-2.5 text-sm ${
            message.kind === "error"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </p>
      )}

      {customerId && (
        <>
          <p className="mt-4 text-sm text-mocha">
            {customerSelections.length} photo
            {customerSelections.length === 1 ? "" : "s"} selected by this
            customer.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadList}
              disabled={customerSelections.length === 0}
              className="rounded-full border border-[#dfd1bc] px-4 py-2 text-xs transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-60"
            >
              Download list (CSV)
            </button>
            {overallStatus === "submitted" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    run(
                      () => setSelectionStatus(customerId, "draft"),
                      "Selection reopened - the customer can edit it again."
                    )
                  }
                  disabled={isPending}
                  className="rounded-full border border-amber-300 px-4 py-2 text-xs text-amber-800 transition hover:bg-amber-50 disabled:opacity-60"
                >
                  Reopen selection
                </button>
                <button
                  type="button"
                  onClick={() =>
                    run(
                      () => setSelectionStatus(customerId, "completed"),
                      "Selection marked as completed."
                    )
                  }
                  disabled={isPending}
                  className="rounded-full bg-gold px-4 py-2 text-xs text-white transition hover:bg-espresso disabled:opacity-60"
                >
                  Mark completed
                </button>
              </>
            )}
          </div>

          {customerSelections.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {customerSelections.map((selection) => {
                const photo = photoById.get(selection.photo_id);
                if (!photo) return null;
                return (
                  <figure key={selection.photo_id} className="relative">
                    <img
                      src={photo.url}
                      alt={photo.title ?? "Selected photo"}
                      loading="lazy"
                      className="h-20 w-full rounded object-cover"
                    />
                    <figcaption className="mt-1 truncate text-[10px] text-mocha">
                      {photo.title ?? "Untitled"} · {selection.status}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
