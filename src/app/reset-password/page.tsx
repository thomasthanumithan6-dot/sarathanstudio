"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConfigNotice from "@/components/ConfigNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-md border border-[#e6dac8] bg-white px-4 py-3.5 text-sm outline-none transition focus:border-gold";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    if (!supabaseReady) return;

    // The recovery link lands here with a token in the URL hash;
    // @supabase/ssr exchanges it for a session automatically.
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Fallback: if a session already exists, allow the form.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
  }, [supabaseReady]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setStatus("loading");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setStatus("idle");
    }
  }

  if (!supabaseReady) {
    return (
      <section className="px-[8%] py-16">
        <ConfigNotice title="Password reset requires Supabase">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
          .env.local to enable email-based password reset.
        </ConfigNotice>
      </section>
    );
  }

  return (
    <section className="px-[8%] py-16">
      <div className="mx-auto max-w-md rounded-xl border border-[#eee3d3] bg-white p-8 shadow-sm">
        <p className="text-center text-[11px] font-medium tracking-[3px] text-gold">
          CUSTOMER AREA
        </p>
        <h1 className="mt-2 text-center font-display text-3xl font-semibold">
          Set a New Password
        </h1>

        {done ? (
          <p role="status" className="mt-6 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
            Your password has been updated. Redirecting you to sign in…
          </p>
        ) : !ready ? (
          <p className="mt-6 text-center text-sm text-mocha">
            Verifying your reset link… If this message stays, please request a
            new reset link from the login page.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium">
                New Password *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-xs font-medium">
                Confirm New Password *
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat the password"
                required
                minLength={6}
                className={inputClass}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-full bg-gold px-6 py-3.5 text-sm text-white transition hover:-translate-y-0.5 hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
