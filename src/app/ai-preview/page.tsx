"use client";

import { useRef, useState } from "react";

const STYLES = [
  {
    id: "cinematic",
    label: "Cinematic",
    filter: "contrast(1.15) saturate(1.2) sepia(0.25)",
  },
  {
    id: "wedding",
    label: "Wedding",
    filter: "brightness(1.1) saturate(1.1) sepia(0.15)",
  },
  {
    id: "bw",
    label: "Black & White",
    filter: "grayscale(1) contrast(1.1)",
  },
  {
    id: "studio",
    label: "Studio Portrait",
    filter: "contrast(1.1) saturate(1.05) brightness(1.05)",
  },
] as const;

type StyleId = (typeof STYLES)[number]["id"];
type Status = "idle" | "loading" | "done" | "error";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export default function AiPreviewPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [styleId, setStyleId] = useState<StyleId>("cinematic");
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    setMessage(null);
    setAiImage(null);
    setStatus("idle");

    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setMessage("Please choose an image file (JPG, PNG, ...).");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setMessage("Please choose an image smaller than 8 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function generateWithAi() {
    if (!file) return;

    setStatus("loading");
    setMessage(null);
    setAiImage(null);

    try {
      const body = new FormData();
      body.append("image", file);
      body.append("style", styleId);

      const response = await fetch("/api/ai-preview", {
        method: "POST",
        body,
      });
      const data = await response.json();

      if (response.status === 501) {
        setStatus("error");
        setMessage(
          "Real AI generation is not configured yet. Add OPENAI_API_KEY to .env.local to enable it - the instant previews above are local demos, not AI output."
        );
        return;
      }
      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "AI generation failed. Please try again.");
        return;
      }

      setAiImage(data.image);
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <section className="px-[8%] py-16 text-center">
      <p className="text-[11px] font-medium tracking-[3px] text-gold">
        AI PHOTO PREVIEW
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Preview Your Photo in Our Styles
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-mocha">
        Upload a photo to instantly preview photography styles. Real AI
        generation requires an API key and is clearly marked below.
      </p>

      <div className="mx-auto mt-8 max-w-3xl">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-[#e6dac8] bg-sand px-6 py-10 text-sm text-mocha transition hover:border-gold"
        >
          {previewUrl
            ? "Choose a different photo"
            : "Click to upload a photo (JPG or PNG, max 8 MB)"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {previewUrl && (
        <>
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <figure className="overflow-hidden rounded-md">
              <img
                src={previewUrl}
                alt="Original upload"
                className="h-56 w-full object-cover"
              />
              <figcaption className="bg-white py-2 text-xs text-mocha">
                Original
              </figcaption>
            </figure>
            {STYLES.map((style) => (
              <figure
                key={style.id}
                className={`overflow-hidden rounded-md ring-2 transition ${
                  styleId === style.id ? "ring-gold" : "ring-transparent"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setStyleId(style.id)}
                  className="block w-full"
                  aria-pressed={styleId === style.id}
                >
                  <img
                    src={previewUrl}
                    alt={`${style.label} style preview (local demo)`}
                    className="h-56 w-full object-cover"
                    style={{ filter: style.filter }}
                  />
                  <span className="block bg-white py-2 text-xs text-mocha">
                    {style.label} · instant demo
                  </span>
                </button>
              </figure>
            ))}
          </div>

          <p className="mx-auto mt-4 max-w-xl text-xs leading-6 text-mocha">
            The instant previews above use simple colour filters so you can try
            styles offline. They are not AI-generated results.
          </p>

          <button
            type="button"
            onClick={generateWithAi}
            disabled={status === "loading"}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm text-white transition hover:-translate-y-0.5 hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            )}
            {status === "loading"
              ? "Generating with AI…"
              : `Generate "${STYLES.find((s) => s.id === styleId)?.label}" with AI`}
          </button>

          {message && (
            <p
              role="alert"
              className={`mx-auto mt-4 max-w-xl rounded-md px-4 py-3 text-sm ${
                status === "error"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-sand text-mocha"
              }`}
            >
              {message}
            </p>
          )}

          {aiImage && status === "done" && (
            <figure className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-xl shadow-lg">
              <img src={aiImage} alt="AI generated result" className="w-full" />
              <figcaption className="bg-white py-3 text-xs text-mocha">
                AI-generated result
              </figcaption>
            </figure>
          )}
        </>
      )}
    </section>
  );
}
