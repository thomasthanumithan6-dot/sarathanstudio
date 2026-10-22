"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Photo = {
  id: string;
  title: string | null;
  url: string;
  galleryTitle: string;
};

export default function PhotoSelector({
  photos,
  initialSelectedIds,
}: {
  photos: Photo[];
  initialSelectedIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelectedIds)
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(photoId: string) {
    const previous = new Set(selected);
    const next = new Set(selected);
    const willSelect = !next.has(photoId);

    if (willSelect) {
      next.add(photoId);
    } else {
      next.delete(photoId);
    }

    setSelected(next);
    setPendingId(photoId);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { error: writeError } = willSelect
        ? await supabase
            .from("selections")
            .insert({ customer_id: user.id, photo_id: photoId })
        : await supabase
            .from("selections")
            .delete()
            .eq("customer_id", user.id)
            .eq("photo_id", photoId);

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

  return (
    <div className="mx-auto mt-10 max-w-6xl">
      <p className="text-center text-sm text-mocha">
        <span className="font-semibold text-gold">{selected.size}</span>{" "}
        photo{selected.size === 1 ? "" : "s"} selected
      </p>

      {error && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-xl rounded-md bg-red-50 px-4 py-3 text-center text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => {
          const isSelected = selected.has(photo.id);
          return (
            <figure
              key={photo.id}
              className={`overflow-hidden rounded-lg border bg-white transition ${
                isSelected ? "border-gold shadow-md" : "border-[#eee3d3]"
              }`}
            >
              <img
                src={photo.url}
                alt={photo.title ?? "Customer gallery photo"}
                loading="lazy"
                className="h-64 w-full object-cover"
              />
              <figcaption className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium">
                    {photo.title ?? "Untitled"}
                  </p>
                  <p className="truncate text-xs text-mocha">
                    {photo.galleryTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(photo.id)}
                  disabled={pendingId === photo.id}
                  aria-pressed={isSelected}
                  className={`flex-none rounded-full px-4 py-2 text-xs transition disabled:opacity-60 ${
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
    </div>
  );
}
