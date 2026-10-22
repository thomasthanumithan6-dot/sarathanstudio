import type { ReactNode } from "react";

/**
 * Shown by features that need environment configuration (Supabase,
 * AI API key, ...) instead of pretending to work.
 */
export default function ConfigNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-gold/40 bg-sand p-8 text-center shadow-sm">
      <p className="text-[11px] font-medium tracking-[3px] text-gold">
        CONFIGURATION REQUIRED
      </p>
      <h2 className="mt-2 font-display text-2xl">{title}</h2>
      <div className="mt-3 text-sm leading-7 text-mocha">{children}</div>
      <p className="mt-4 text-xs text-mocha">
        See <code>.env.example</code> and <code>README.md</code> for setup steps.
      </p>
    </div>
  );
}
