"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Mode = "search" | "chat";
type Message = { role: "user" | "assistant"; content: string };
type SearchResult = { title: string; description: string; href: string };

const WELCOME = "Hi! I'm Thomah, your Sarathan Studio AI assistant. How can I help you?";
const SUGGESTIONS = [
  "Wedding Photography",
  "Photography Packages",
  "Book a Photoshoot",
  "Check Booking Information",
  "Contact Sarathan Studio",
];

export default function ThomaAssistant() {
  const [mode, setMode] = useState<Mode>("search");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function openSearch() {
      setMode("search");
      setOpen(true);
    }
    window.addEventListener("open-thoma-search", openSearch);
    return () => window.removeEventListener("open-thoma-search", openSearch);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      (mode === "search" ? searchInputRef.current : chatInputRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode, open]);

  useEffect(() => {
    if (!open || mode !== "search") return;
    const trimmed = query.trim();
    setSearchError("");
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/thoma/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Search is unavailable.");
        setResults(data.results ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setSearchError(error instanceof Error ? error.message : "Search is unavailable.");
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [mode, open, query]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function sendMessage(value: string) {
    const content = value.trim();
    if (!content || sending) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setMessage("");
    setSending(true);
    setChatError("");
    try {
      const response = await fetch("/api/thoma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-8) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "THOMA is temporarily unavailable.");
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "THOMA is temporarily unavailable.");
    } finally {
      setSending(false);
    }
  }

  function closePanel() {
    setOpen(false);
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => {
            setMode("chat");
            setOpen(true);
          }}
          aria-label="Open Thomah assistant"
          className="fixed bottom-20 right-5 z-[60] inline-flex h-14 items-center gap-2 rounded-full bg-espresso px-5 text-sm font-medium text-white shadow-xl transition hover:-translate-y-1 hover:bg-gold max-sm:right-4"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.4-.75L4 20l1.45-4.1A7.45 7.45 0 0 1 5 12a7.5 7.5 0 1 1 15-.5Z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12h.01M12.5 12h.01M16 12h.01" strokeLinecap="round" strokeWidth="2.4" />
          </svg>
          Ask Thomah
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-end bg-black/30 p-0 backdrop-blur-[2px] sm:items-end sm:p-6" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePanel();
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="thoma-title"
            className="flex h-[min(720px,100dvh)] w-full flex-col overflow-hidden rounded-t-2xl bg-ivory shadow-2xl animate-[thoma-enter_180ms_ease-out] sm:h-[min(680px,calc(100dvh-48px))] sm:max-w-[440px] sm:rounded-xl"
          >
            <header className="flex items-center justify-between border-b border-[#e9dfd1] px-5 py-4">
              <div className="flex items-center gap-3">
                <img
                  src="/thanu.jpg"
                  alt="Sarathan Studio logo"
                  className="h-10 w-10 flex-none rounded-full border border-[#e6dac8] bg-ivory p-1 object-contain"
                />
                <div>
                  <h2 id="thoma-title" className="font-display text-xl font-semibold">Ask Thomah</h2>
                  <p className="text-[11px] text-mocha">Sarathan Studio AI assistant</p>
                </div>
              </div>
              <button type="button" onClick={closePanel} aria-label="Close Thomah" className="grid h-10 w-10 place-items-center rounded-full text-mocha transition hover:bg-cream hover:text-espresso">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>
              </button>
            </header>

            <div className="grid grid-cols-2 border-b border-[#e9dfd1] px-5">
              <button type="button" onClick={() => setMode("search")} aria-pressed={mode === "search"} className={`border-b-2 py-3 text-sm transition ${mode === "search" ? "border-gold font-medium text-espresso" : "border-transparent text-mocha hover:text-espresso"}`}>Search</button>
              <button type="button" onClick={() => setMode("chat")} aria-pressed={mode === "chat"} className={`border-b-2 py-3 text-sm transition ${mode === "chat" ? "border-gold font-medium text-espresso" : "border-transparent text-mocha hover:text-espresso"}`}>Ask Thomah</button>
            </div>

            {mode === "search" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <form className="px-5 pt-5" onSubmit={(event) => event.preventDefault()} role="search">
                  <div className="flex h-12 items-center gap-3 rounded-lg border border-[#e6dac8] bg-white px-3.5 focus-within:border-gold">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-none text-mocha" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" strokeLinecap="round" /></svg>
                    <input ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search anything..." maxLength={120} aria-label="Search anything" className="min-w-0 flex-1 bg-transparent text-sm text-espresso outline-none placeholder:text-[#9b8c78]" />
                    {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="grid h-8 w-8 flex-none place-items-center rounded-full text-mocha hover:bg-cream hover:text-espresso"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" /></svg></button>}
                  </div>
                </form>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
                  {searching && <p className="py-8 text-center text-sm text-mocha">Searching the studio site...</p>}
                  {!searching && searchError && <p role="alert" className="py-8 text-center text-sm text-mocha">{searchError}</p>}
                  {!searching && !searchError && query.trim() && results.length === 0 && <p className="py-8 text-center text-sm text-mocha">No results found. Try a service, package, or page name.</p>}
                  {!searching && !searchError && !query.trim() && <p className="py-8 text-center text-sm leading-6 text-mocha">Search services, packages, booking, and more.</p>}
                  <ul className="space-y-2">
                    {!searching && results.map((result) => (
                      <li key={`${result.title}-${result.href}`}>
                        <Link href={result.href} onClick={closePanel} className="block rounded-lg border border-[#eee3d3] bg-white p-4 transition hover:border-gold">
                          <span className="block font-medium text-espresso">{result.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-mocha">{result.description}</span>
                          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-gold">View page <span aria-hidden="true">→</span></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
                  {messages.map((item, index) => (
                    <div key={`${index}-${item.role}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                      <p className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "bg-espresso text-white" : "border border-[#eee3d3] bg-white text-espresso"}`}>{item.content}</p>
                    </div>
                  ))}
                  {sending && <div className="flex items-center gap-2 text-xs text-mocha" role="status"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" /> Thomah is thinking...</div>}
                  <div ref={messageEndRef} />
                </div>

                {messages.length === 1 && (
                  <div className="px-5 pb-3">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-[1.5px] text-mocha">Quick suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS.map((suggestion) => <button type="button" key={suggestion} disabled={sending} onClick={() => void sendMessage(suggestion)} className="rounded-full border border-[#e6dac8] bg-white px-3 py-2 text-[11px] text-espresso transition hover:border-gold hover:text-gold disabled:opacity-50">{suggestion}</button>)}
                    </div>
                  </div>
                )}

                {chatError && <p role="alert" className="mx-5 mb-3 rounded-md bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">{chatError}</p>}
                <form className="border-t border-[#e9dfd1] bg-ivory p-4" onSubmit={(event) => { event.preventDefault(); void sendMessage(message); }}>
                  <div className="flex items-center gap-2 rounded-lg border border-[#e6dac8] bg-white p-1.5 pl-3 focus-within:border-gold">
                    <input ref={chatInputRef} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} placeholder="Message Thomah..." aria-label="Message Thomah" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[#9b8c78]" />
                    <button type="submit" disabled={sending || !message.trim()} aria-label="Send message" className="grid h-10 w-10 flex-none place-items-center rounded-md bg-gold text-white transition hover:bg-espresso disabled:cursor-not-allowed disabled:opacity-50">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m21 3-7.5 18-3.8-7.7L2 9.5 21 3Z" strokeLinejoin="round" /><path d="M9.7 13.3 15 8" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}