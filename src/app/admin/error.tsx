"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h2 className="font-display text-2xl">Something went wrong</h2>
      <p className="mt-3 text-sm text-mocha">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-gold px-6 py-3 text-sm text-white transition hover:bg-espresso"
      >
        Try again
      </button>
    </div>
  );
}
