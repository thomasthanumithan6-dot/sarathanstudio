"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { demoSignIn, demoSignUp } from "@/lib/demo-auth";

const inputClass =
  "w-full rounded-md border border-[#e6dac8] bg-white px-4 py-3.5 text-sm outline-none transition focus:border-gold";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabaseReady = isSupabaseConfigured();

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  async function handleForgotPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!supabaseReady) {
      setError("Password reset requires Supabase (demo accounts cannot be recovered).");
      return;
    }

    setStatus("loading");
    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Deliberately ignored below: never reveal whether the email exists.
    } finally {
      setStatus("idle");
      setNotice(
        "If an account exists for this email, a password reset link has been sent. Please check your inbox."
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setStatus("loading");

    try {
      const next =
        new URLSearchParams(window.location.search).get("next") ??
        "/my-gallery";

      if (!supabaseReady) {
        // Demo mode: account lives only in this browser.
        if (mode === "signup") {
          const result = await demoSignUp(fullName, email, password);
          if (result.error) throw new Error(result.error);
          setNotice("Account created. You can sign in now.");
          setMode("signin");
        } else {
          const result = await demoSignIn(email, password);
          if (result.error) throw new Error(result.error);
          router.push(next);
          router.refresh();
        }
        return;
      }

      const supabase = createClient();

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signUpError) throw signUpError;
        setNotice(
          "Account created. If email confirmation is enabled in Supabase, confirm your email and then sign in."
        );
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className="px-[8%] py-16">
      {!supabaseReady && (
        <p className="mx-auto mb-6 max-w-md rounded-md bg-amber-50 px-4 py-3 text-center text-xs leading-6 text-amber-800">
          Demo mode: Supabase is not connected, so accounts are stored only in
          this browser. Connect Supabase (see README.md) for real, secure
          customer accounts.
        </p>
      )}
      <div className="mx-auto max-w-md rounded-xl border border-[#eee3d3] bg-white p-8 shadow-sm">
        <p className="text-center text-[11px] font-medium tracking-[3px] text-gold">
          CUSTOMER AREA
        </p>
        <h1 className="mt-2 text-center font-display text-3xl font-semibold">
          {mode === "signin" && "Sign In"}
          {mode === "signup" && "Create Account"}
          {mode === "forgot" && "Reset Password"}
        </h1>
        <p className="mt-2 text-center text-xs text-mocha">
          Access your private photo gallery and selections.
        </p>

        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="mt-6 grid gap-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputClass}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-full bg-gold px-6 py-3.5 text-sm text-white transition hover:-translate-y-0.5 hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        {mode !== "forgot" && (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="fullName" className="mb-1 block text-xs font-medium">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium">
              Password *
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

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-full bg-gold px-6 py-3.5 text-sm text-white transition hover:-translate-y-0.5 hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading"
              ? "Please wait…"
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="text-center text-xs text-mocha underline underline-offset-4 transition hover:text-gold"
            >
              Forgot your password?
            </button>
          )}
        </form>
        )}

        <p className="mt-5 text-center text-xs text-mocha">
          {mode === "signin" ? "New customer? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className="font-medium text-gold underline underline-offset-4"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </section>
  );
}
