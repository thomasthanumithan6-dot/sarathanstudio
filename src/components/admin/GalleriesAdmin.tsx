"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createGallery,
  deleteGallery,
  deletePhoto,
  uploadPhoto,
} from "@/app/admin/actions";

export type CustomerOption = { id: string; label: string };
export type AdminGallery = {
  id: string;
  customer_id: string;
  title: string;
  created_at: string;
};
export type AdminPhoto = {
  id: string;
  gallery_id: string;
  title: string | null;
  storage_path: string;
  url: string;
  created_at: string;
};

type Message = { kind: "error" | "ok"; text: string } | null;

const inputClass =
  "w-full rounded-md border border-[#e6dac8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gold";

export default function GalleriesAdmin({
  customers,
  galleries,
  photos,
}: {
  customers: CustomerOption[];
  galleries: AdminGallery[];
  photos: AdminPhoto[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const customerLabel = (customerId: string) =>
    customers.find((customer) => customer.id === customerId)?.label ?? "Unknown";

  function photosOf(galleryId: string) {
    return photos.filter((photo) => photo.gallery_id === galleryId);
  }

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

  function handleCreateGallery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("customer_id", newCustomerId);
    formData.set("title", newTitle);
    run(() => createGallery(formData), "Gallery created.");
    setNewTitle("");
  }

  function handleDeleteGallery(gallery: AdminGallery) {
    const confirmed = window.confirm(
      `Delete gallery "${gallery.title}" and ALL its photos? This cannot be undone.`
    );
    if (!confirmed) return;
    const formData = new FormData();
    formData.set("id", gallery.id);
    run(() => deleteGallery(formData), "Gallery deleted.");
  }

  function handleDeletePhoto(photo: AdminPhoto) {
    const confirmed = window.confirm(
      `Delete photo "${photo.title ?? "Untitled"}"? This cannot be undone.`
    );
    if (!confirmed) return;
    const formData = new FormData();
    formData.set("id", photo.id);
    formData.set("storage_path", photo.storage_path);
    run(() => deletePhoto(formData), "Photo deleted.");
  }

  async function handleUpload(galleryId: string) {
    const input = fileInputs.current[galleryId];
    const files = input?.files ? Array.from(input.files) : [];
    if (files.length === 0) {
      setMessage({ kind: "error", text: "Choose one or more image files first." });
      return;
    }

    setMessage(null);
    setUploadProgress(null);

    for (let index = 0; index < files.length; index += 1) {
      setUploadProgress(`Uploading ${index + 1} of ${files.length}…`);
      const formData = new FormData();
      formData.set("gallery_id", galleryId);
      formData.set("file", files[index]);
      const result = await uploadPhoto(formData);
      if (result.error) {
        setUploadProgress(null);
        setMessage({
          kind: "error",
          text: `Failed on "${files[index].name}": ${result.error}`,
        });
        return;
      }
    }

    setUploadProgress(null);
    setMessage({ kind: "ok", text: `Uploaded ${files.length} photo(s).` });
    if (input) input.value = "";
    router.refresh();
  }

  return (
    <div>
      <h2 className="font-display text-2xl">Galleries &amp; Photos</h2>

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
      {uploadProgress && (
        <p role="status" className="mt-3 rounded-md bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
          {uploadProgress}
        </p>
      )}

      <form
        onSubmit={handleCreateGallery}
        className="mt-4 grid gap-3 rounded-lg border border-[#eee3d3] bg-sand p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <select
          value={newCustomerId}
          onChange={(event) => setNewCustomerId(event.target.value)}
          required
          className={inputClass}
          aria-label="Customer"
        >
          <option value="">Choose customer…</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.label}
            </option>
          ))}
        </select>
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Gallery title (e.g. Perera Wedding)"
          required
          className={inputClass}
        />
        <button
          type="submit"
          disabled={isPending || customers.length === 0}
          className="rounded-full bg-gold px-5 py-2.5 text-sm text-white transition hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60"
        >
          Create Gallery
        </button>
      </form>

      <div className="mt-4 grid gap-3">
        {galleries.length === 0 && (
          <p className="py-6 text-center text-sm text-mocha">
            No galleries yet. Create a customer first, then a gallery.
          </p>
        )}
        {galleries.map((gallery) => {
          const galleryPhotos = photosOf(gallery.id);
          const expanded = expandedId === gallery.id;
          return (
            <div
              key={gallery.id}
              className="rounded-lg border border-[#eee3d3] bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{gallery.title}</p>
                  <p className="mt-1 text-xs text-mocha">
                    {customerLabel(gallery.customer_id)} · {galleryPhotos.length}{" "}
                    photo{galleryPhotos.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : gallery.id)}
                    className="rounded-full border border-[#dfd1bc] px-4 py-1.5 text-xs transition hover:border-gold hover:text-gold"
                  >
                    {expanded ? "Close" : "Manage"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGallery(gallery)}
                    className="rounded-full border border-red-200 px-4 py-1.5 text-xs text-red-700 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="mt-4 border-t border-[#f4ecdf] pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={(element) => {
                        fileInputs.current[gallery.id] = element;
                      }}
                      type="file"
                      accept="image/*"
                      multiple
                      className="text-xs text-mocha"
                      aria-label="Choose photos to upload"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpload(gallery.id)}
                      disabled={isPending || uploadProgress !== null}
                      className="rounded-full bg-gold px-4 py-2 text-xs text-white transition hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Upload Photos
                    </button>
                  </div>

                  {galleryPhotos.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                      {galleryPhotos.map((photo) => (
                        <div key={photo.id} className="group relative">
                          <img
                            src={photo.url}
                            alt={photo.title ?? "Gallery photo"}
                            loading="lazy"
                            className="h-20 w-full rounded object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo)}
                            aria-label={`Delete ${photo.title ?? "photo"}`}
                            className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
