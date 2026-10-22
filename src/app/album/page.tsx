"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ABOUT_IMAGE, HERO_IMAGE, PORTFOLIO } from "@/lib/photos";

const ALBUM = [...PORTFOLIO.map((photo) => photo.src), HERO_IMAGE, ABOUT_IMAGE];

export default function AlbumPage() {
  const [index, setIndex] = useState<number | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const close = useCallback(() => setIndex(null), []);
  const showPrev = useCallback(
    () =>
      setIndex((current) =>
        current === null ? current : (current - 1 + ALBUM.length) % ALBUM.length
      ),
    []
  );
  const showNext = useCallback(
    () =>
      setIndex((current) =>
        current === null ? current : (current + 1) % ALBUM.length
      ),
    []
  );

  useEffect(() => {
    if (index === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, close, showPrev, showNext]);

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (musicOn) {
      audio.pause();
      setMusicOn(false);
    } else {
      audio
        .play()
        .then(() => {
          setMusicOn(true);
          setMusicError(false);
        })
        .catch(() => setMusicError(true));
    }
  }

  return (
    <section className="px-[8%] py-16 text-center">
      <p className="text-[11px] font-medium tracking-[3px] text-gold">
        DIGITAL WEDDING ALBUM
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        Our Story in Photographs
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-mocha">
        Click any photo to view it full-screen. Use the arrows or your
        keyboard to move through the album.
      </p>

      <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ALBUM.map((src, photoIndex) => (
          <button
            key={src}
            type="button"
            onClick={() => setIndex(photoIndex)}
            className="group overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-gold"
            aria-label={`Open photo ${photoIndex + 1} full screen`}
          >
            <img
              src={src}
              alt={`Wedding album photo ${photoIndex + 1}`}
              loading="lazy"
              className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {index !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full screen photo viewer"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
          onClick={close}
        >
          <img
            src={ALBUM[index]}
            alt={`Wedding album photo ${index + 1} of ${ALBUM.length}`}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
            aria-label="Close viewer"
            className="absolute right-5 top-5 text-3xl text-white/80 transition hover:text-white"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrev();
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
              showNext();
            }}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white transition hover:bg-white/25"
          >
            ›
          </button>

          <div
            className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-white/10 px-5 py-2.5 text-sm text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <span>
              {index + 1} / {ALBUM.length}
            </span>
            <button
              type="button"
              onClick={toggleMusic}
              className="rounded-full bg-gold px-4 py-1.5 text-xs transition hover:bg-espresso"
            >
              {musicOn ? "♫ Music off" : "♫ Play music"}
            </button>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src="/music.mp3"
        loop
        preload="none"
        onError={() => setMusicError(true)}
      />
      {musicError && (
        <p className="mt-6 text-xs text-mocha">
          Background music is optional - add your audio file as
          <code> public/music.mp3 </code>to enable it.
        </p>
      )}
    </section>
  );
}
