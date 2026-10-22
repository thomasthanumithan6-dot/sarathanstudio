"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Photo = {
  id: string;
  title: string | null;
  url: string;
  galleryTitle: string;
};

type SelectionStatus = "draft" | "submitted" | "completed";
type SelectionRow = { photo_id: string; status: SelectionStatus };
type Filter = "all" | "selected";

const PAGE_SIZE = 24;

const STATUS_STYLES: Record<SelectionStatus, string> = {
  draft: "bg-amber-50 text-amber-800 border-amber-200",
  submitted: "bg-blue-50 text-blue-800 border-blue-200",
  completed: "bg-green-50 text-green-800 border-green-200",
};

export default function PhotoSelector({
  photos,
  customerId,
  initialSelections,
  initialStatus,
}: {
  photos: Photo[];
  customerId: string;
  initialSelections: SelectionRow[];
  initialStatus: SelectionStatus;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Map<string, SelectionStatus>>(
    new Map(initialSelections.map((row) => [row.photo_id, row.status]))
  );
  const [status, setStatus] = useState<SelectionStatus>(initialStatus);
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadedCount, setLoadedCount] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const readOnly = status !== "draft";

  const filteredPhotos = useMemo(
    () =>
      filter === "selected"
        ? photos.filter((photo) => selected.has(photo.id))
        : photos,
    [filter, photos, selected]
  );

  const visiblePhotos = filteredPhotos.slice(0, visibleCount);
  const selectedCount = selected.size;
  const loadingProgress =
    visiblePhotos.length === 0
      ? 100
      : Math.min(100, Math.round((loadedCount / visiblePhotos.length) * 100));

  async function toggle(photoId: string) {
    if (readOnly || pendingId) return;

    const previous = new Map(selected);
    const next = new Map(selected);
    const willSelect = !next.has(photoId);

    if (willSelect) {
      next.set(photoId, "draft");
    } else {
      next.delete(photoId);
    }

    setSelected(next);
    setPendingId(photoId);
    setError(null);
    setConfirmation(null);

    try {
      const supabase = createClient();

      const { error: writeError } = willSelect
        ? await supabase
            .from("photo_selections")
            .insert({ customer_id: customerId, photo_id: photoId, status: "draft" })
        : await supabase
            .from("photo_selections")
            .delete()
            .eq("customer_id", customerId)
            .eq("photo_id", photoId)
            .eq("status", "draft");

      if (writeError) throw writeError;
    } catch (err) {
      setSelected(previous);
      setError(
        err instanceof Error ? err.message : "Could not save your selection."
      );
    } finally {
      setPendingId(null);
    }
  }

  async function submitFinalSelection() {
    if (readOnly || submitting || selectedCount === 0) return;

    const confirmed = window.confirm(
      `Submit ${selectedCount} selected photo${selectedCount === 1 ? "" : "s"} to the studio? ` +
        "You will not be able to change the selection afterwards unless the studio reopens it."
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    setConfirmation(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("photo_selections")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("customer_id", customerId)
        .eq("status", "draft");

      if (updateError) throw updateError;

      setStatus("submitted");
      setSelected(
        new Map(
          Array.from(selected.keys()).map((id) => [id, "submitted" as SelectionStatus])
        )
      );
      setConfirmation(
        "Your selection has been submitted to Sarathan Studio. We will start preparing your final photos."
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit your selection."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-6xl">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span
          className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
        >
          Status: {status}
        </span>
        <span className="rounded-full border border-[#eee3d3] bg-white px-4 py-1.5 text-xs text-mocha">
          Total photos: {photos.length}
        </span>
        <span className="rounded-full border border-[#eee3d3] bg-white px-4 py-1.5 text-xs text-mocha">
          Selected: <span className="font-semibold text-gold">{selectedCount}</span>
        </span>
        <span className="rounded-full border border-[#eee3d3] bg-white px-4 py-1.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setVisibleCount(PAGE_SIZE);
            }}
            aria-pressed={filter === "all"}
            className={`mr-2 ${filter === "all" ? "font-semibold text-gold" : "text-mocha"}`}
          >
            All
          </button>
          |
          <button
            type="button"
            onClick={() => {
              setFilter("selected");
              setVisibleCount(PAGE_SIZE);
            }}
            aria-pressed={filter === "selected"}
            className={`ml-2 ${filter === "selected" ? "font-semibold text-gold" : "text-mocha"}`}
          >
            Selected only
          </button>
        </span>
      </div>

      {loadingProgress < 100 && (
        <div className="mx-auto mt-5 max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#eee3d3]">
            <div
              className="h-full bg-gold transition-all"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="mt-1 text-center text-[11px] text-mocha">
            Loading photos… {loadingProgress}%
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-xl rounded-md bg-red-50 px-4 py-3 text-center text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {confirmation && (
        <p
          role="status"
          className="mx-auto mt-4 max-w-xl rounded-md bg-green-50 px-4 py-3 text-center text-sm text-green-700"
        >
          {confirmation}
        </p>
      )}

      {status === "submitted" && (
        <p className="mx-auto mt-4 max-w-xl rounded-md bg-blue-50 px-4 py-3 text-center text-sm text-blue-800">
          Your selection has been submitted. Need changes? Ask the studio to
          reopen it from the admin dashboard.
        </p>
      )}
      {status === "completed" && (
        <p className="mx-auto mt-4 max-w-xl rounded-md bg-green-50 px-4 py-3 text-center text-sm text-green-800">
          Your selection is complete. The studio has finished processing your
          chosen photos.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePhotos.map((photo, index) => {
          const isSelected = selected.has(photo.id);
          return (
            <figure
              key={photo.id}
              className={`overflow-hidden rounded-lg border bg-white transition ${
                isSelected ? "border-gold shadow-md ring-1 ring-gold" : "border-[#eee3d3]"
              }`}
            >
              <button
                type="button"
                onClick={() => setViewerIndex(index)}
                className="block w-full focus:outline-none focus:ring-2 focus:ring-gold"
                aria-label={`Preview ${photo.title ?? "photo"} full screen`}
              >
                <img
                  src={photo.url}
                  alt={photo.title ?? "Customer gallery photo"}
                  loading="lazy"
                  onLoad={() => setLoadedCount((count) => count + 1)}
                  className="h-64 w-full object-cover"
                />
              </button>
              <figcaption className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium">
                    {photo.title ?? "Untitled"}
                  </p>
                  <p className="truncate text-xs text-mocha">{photo.galleryTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(photo.id)}
                  disabled={readOnly || pendingId === photo.id}
                  aria-pressed={isSelected}
                  className={`flex-none rounded-full px-4 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isSelected
                      ? "bg-gold text-white"
                      : "border border-[#dfd1bc] text-espresso hover:border-gold hover:text-gold"
                  }`}
                >
                  {pendingId === photo.id
                    ? "Saving…"
                    : isSelected
                      ? "♥ Selected"
                      : "♡ Select"}
                </button>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {visibleCount < filteredPhotos.length && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="rounded-full border border-[#dfd1bc] px-6 py-3 text-sm text-espresso transition hover:border-gold hover:text-gold"
          >
            Load more photos ({filteredPhotos.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {!readOnly && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={submitFinalSelection}
            disabled={submitting || selectedCount === 0}
            className="rounded-full bg-gold px-8 py-3.5 text-sm text-white transition hover:-translate-y-0.5 hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Submitting…"
              : `Submit Final Selection (${selectedCount})`}
          </button>
          <p className="mt-2 text-xs text-mocha">
            Submitting locks your selection until the studio reopens it.
          </p>
        </div>
      )}

      {viewerIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full screen photo preview"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setViewerIndex(null)}
        >
          <img
            src={visiblePhotos[viewerIndex].url}
            alt={visiblePhotos[viewerIndex].title ?? "Photo preview"}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setViewerIndex(null)}
            aria-label="Close preview"
            className="absolute right-5 top-5 text-3xl text-white/80 transition hover:text-white"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setViewerIndex((current) =>
                current === null
                  ? current
                  : (current - 1 + visiblePhotos.length) % visiblePhotos.length
              );
            }}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white transition hover:bg-white/25"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setViewerIndex((current) =>
                current === null ? current : (current + 1) % visiblePhotos.length
              );
            }}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white transition hover:bg-white/25"
          >
            ›
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs text-white">
            {viewerIndex + 1} / {visiblePhotos.length}
          </span>
        </div>
      )}
    </div>
  );
}
