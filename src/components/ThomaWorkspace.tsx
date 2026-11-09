"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type Role = "user" | "assistant";
type ChatMessage = { role: Role; content: string; createdAt: number };
type ChatThread = { id: string; title: string; updatedAt: number; messages: ChatMessage[] };
type DocumentAttachment = {
  name: string;
  type: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  data: string;
};
type SpeechResult = { transcript: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<SpeechResult>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

const THREADS_KEY = "thoma.threads.v1";
const MEMORY_KEY = "thoma.memory-consent.v1";
const THEME_KEY = "thoma.theme.v1";
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

function makeThread(): ChatThread {
  return { id: crypto.randomUUID(), title: "New chat", updatedAt: Date.now(), messages: [] };
}

function renderInline(text: string, dark: boolean) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className={`rounded px-1.5 py-0.5 font-mono text-[0.92em] ${dark ? "bg-white/10 text-emerald-200" : "bg-stone-100 text-emerald-800"}`}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
    if (link) {
      return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className={`underline decoration-emerald-700/40 underline-offset-2 ${dark ? "text-emerald-300" : "text-emerald-700"}`}>{link[1]}</a>;
    }
    return part;
  });
}

function renderMessage(content: string, dark: boolean) {
  const blocks = content.split(/(^```[^\n]*\n[\s\S]*?^```$)/gm).filter(Boolean);
  return blocks.map((block, index) => {
    if (block.startsWith("```")) {
      const firstNewline = block.indexOf("\n");
      const language = block.slice(3, firstNewline).trim();
      const code = block.slice(firstNewline + 1).replace(/\n```$/, "");
      return (
        <div key={index} className={`my-3 overflow-hidden rounded-lg border ${dark ? "border-white/10 bg-[#111715]" : "border-stone-200 bg-stone-50"}`}>
          {language && <div className={`border-b px-3 py-1.5 font-mono text-[10px] uppercase ${dark ? "border-white/10 text-stone-400" : "border-stone-200 text-stone-500"}`}>{language}</div>}
          <pre className="overflow-x-auto p-4 text-xs leading-6"><code>{code}</code></pre>
        </div>
      );
    }
    return block.split("\n").map((line, lineIndex) => {
      const key = `${index}-${lineIndex}`;
      if (!line.trim()) return <div key={key} className="h-2" />;
      if (line.startsWith("### ")) return <h3 key={key} className="mb-1 mt-3 font-semibold">{renderInline(line.slice(4), dark)}</h3>;
      if (line.startsWith("## ")) return <h2 key={key} className="mb-1 mt-3 text-base font-semibold">{renderInline(line.slice(3), dark)}</h2>;
      if (line.startsWith("# ")) return <h2 key={key} className="mb-2 mt-3 text-lg font-semibold">{renderInline(line.slice(2), dark)}</h2>;
      if (/^\s*[-*] /.test(line)) return <div key={key} className="flex gap-2"><span aria-hidden="true">•</span><span>{renderInline(line.replace(/^\s*[-*] /, ""), dark)}</span></div>;
      if (/^\d+\. /.test(line)) return <div key={key} className="pl-2">{renderInline(line, dark)}</div>;
      return <p key={key}>{renderInline(line, dark)}</p>;
    });
  });
}

export default function ThomaWorkspace() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [attachmentText, setAttachmentText] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [imageData, setImageData] = useState("");
  const [documentData, setDocumentData] = useState<DocumentAttachment | null>(null);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("auto");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    try {
      const allowed = localStorage.getItem(MEMORY_KEY) === "true";
      const savedTheme = localStorage.getItem(THEME_KEY);
      setMemoryEnabled(allowed);
      if (savedTheme === "dark") setTheme("dark");
      const saved = allowed ? localStorage.getItem(THREADS_KEY) : null;
      const parsed = saved ? JSON.parse(saved) as ChatThread[] : [];
      const restored = Array.isArray(parsed) && parsed.length ? parsed : [makeThread()];
      setThreads(restored);
      setActiveId(restored[0].id);
    } catch {
      const initial = makeThread();
      setThreads([initial]);
      setActiveId(initial.id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (memoryEnabled) localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
    else localStorage.removeItem(THREADS_KEY);
    localStorage.setItem(MEMORY_KEY, String(memoryEnabled));
  }, [hydrated, memoryEnabled, threads]);

  useEffect(() => {
    if (!hydrated) return;
    if (!memoryEnabled || !isSupabaseConfigured()) {
      setHistoryReady(true);
      return;
    }

    let active = true;
    setHistoryReady(false);
    void fetch("/api/thoma/history")
      .then(async (response) => {
        if (response.status === 401) {
          setNotice("Sign in to sync chats securely; browser history remains available.");
          return null;
        }
        if (!response.ok) {
          setNotice("Cloud history needs the THOMA Supabase migration. Browser history is still available.");
          return null;
        }
        return response.json() as Promise<{ threads?: ChatThread[] }>;
      })
      .then((data) => {
        if (!active || !data || !Array.isArray(data.threads) || data.threads.length === 0) return;
        setThreads((current) => {
          const merged = new Map<string, ChatThread>();
          for (const thread of [...data.threads!, ...current]) {
            const existing = merged.get(thread.id);
            if (!existing || thread.updatedAt > existing.updatedAt) merged.set(thread.id, thread);
          }
          return Array.from(merged.values()).sort((left, right) => right.updatedAt - left.updatedAt).slice(0, 50);
        });
        setActiveId(data.threads[0].id);
      })
      .catch(() => {
        if (active) setNotice("Chat sync is unavailable. This browser can still save history.");
      })
      .finally(() => {
        if (active) setHistoryReady(true);
      });

    return () => { active = false; };
  }, [hydrated, memoryEnabled]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const refreshVoices = () => setVoices(synth.getVoices());
    refreshVoices();
    synth.addEventListener("voiceschanged", refreshVoices);
    return () => synth.removeEventListener("voiceschanged", refreshVoices);
  }, []);

  const activeThread = threads.find((thread) => thread.id === activeId) ?? threads[0];
  useEffect(() => {
    if (!hydrated || !historyReady || !memoryEnabled || !isSupabaseConfigured() || !activeThread?.messages.length) return;
    const timeout = window.setTimeout(() => {
      void fetch("/api/thoma/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread: activeThread }),
      }).then((response) => {
        if (!response.ok) setNotice("Chat history could not sync. Your local saved copy is unchanged.");
      }).catch(() => setNotice("Chat history sync is temporarily unavailable."));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [activeThread, historyReady, memoryEnabled, hydrated]);

  const visibleThreads = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return threads;
    return threads.filter((thread) =>
      `${thread.title} ${thread.messages.map((item) => item.content).join(" ")}`.toLocaleLowerCase().includes(term)
    );
  }, [query, threads]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeThread?.messages, sending]);

  function updateThread(id: string, update: (thread: ChatThread) => ChatThread) {
    setThreads((current) => current.map((thread) => {
      if (thread.id !== id) return thread;
      const updated = update(thread);
      return { ...updated, messages: updated.messages.slice(-80) };
    }));
  }

  function createNewChat() {
    const thread = makeThread();
    setThreads((current) => [thread, ...current]);
    setActiveId(thread.id);
    setMessage("");
    setError("");
    setNotice("");
    setSidebarOpen(false);
    setEditingIndex(null);
    setGeneratedImage("");
  }

  async function generateImage() {
    if (imagePrompt.trim().length < 8 || generatingImage) return;
    setGeneratingImage(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/thoma/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Image generation failed.");
      setGeneratedImage(data.image);
      setShowImageGenerator(false);
      setNotice("Image generated. You can download it below.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Image generation failed.");
    } finally {
      setGeneratingImage(false);
    }
  }

  function deleteThread(id: string) {
    const remaining = threads.filter((thread) => thread.id !== id);
    setThreads(remaining);
    if (activeId === id) setActiveId(remaining[0]?.id ?? "");
    if (memoryEnabled && isSupabaseConfigured()) {
      void fetch("/api/thoma/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    }
  }

  function updateMemoryConsent(enabled: boolean) {
    setHistoryReady(false);
    setMemoryEnabled(enabled);
    if (!enabled) {
      localStorage.removeItem(THREADS_KEY);
      setNotice("Saved chat history was deleted.");
      if (isSupabaseConfigured()) {
        void fetch("/api/thoma/history", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
      }
    }
  }

  async function requestAnswer(threadId: string, history: ChatMessage[], image = "", document?: DocumentAttachment) {
    const controller = new AbortController();
    abortRef.current = controller;
    setSending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/thoma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-8).map(({ role, content }) => ({ role, content })),
          ...(image ? { image } : {}),
          ...(document ? { document } : {}),
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "THOMA could not answer just now.");
      updateThread(threadId, (thread) => ({
        ...thread,
        updatedAt: Date.now(),
        messages: [...thread.messages, { role: "assistant", content: data.answer, createdAt: Date.now() }],
      }));
    } catch (reason) {
      if (reason instanceof Error && reason.name !== "AbortError") {
        setError(reason.message || "Network error. Please try again.");
      }
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }

  async function sendMessage(value = message) {
    const text = value.trim();
    if ((!text && !attachmentText && !imageData) || !activeThread || sending) return;

    const fullText = [text, attachmentText ? `\n\nDocument: ${attachmentName}\n${attachmentText}` : ""].filter(Boolean).join("");
    const previous = activeThread.messages;
    const prefix = editingIndex === null ? previous : previous.slice(0, editingIndex);
    const userMessage: ChatMessage = {
      role: "user",
      content: fullText || (documentData ? `Please analyze the attached document: ${documentData.name}` : "Please describe this image."),
      createdAt: Date.now(),
    };
    const next = [...prefix, userMessage];
    updateThread(activeThread.id, (thread) => ({
      ...thread,
      title: thread.messages.length ? thread.title : (text.slice(0, 40) || attachmentName || "Image question"),
      updatedAt: Date.now(),
      messages: next,
    }));
    setMessage("");
    setEditingIndex(null);
    setAttachmentText("");
    setAttachmentName("");
    const image = imageData;
    const document = documentData ?? undefined;
    setImageData("");
    setDocumentData(null);
    await requestAnswer(activeThread.id, next, image, document);
  }

  async function regenerate(index: number) {
    if (!activeThread || sending || index < 1) return;
    const previousUser = activeThread.messages.slice(0, index).findLastIndex((item) => item.role === "user");
    if (previousUser < 0) return;
    const history = activeThread.messages.slice(0, index);
    updateThread(activeThread.id, (thread) => ({ ...thread, messages: history }));
    await requestAnswer(activeThread.id, history);
  }

  function handleAttachment(file: File, kind: "image" | "document") {
    setError("");
    if (kind === "image") {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return setError("Choose a JPEG, PNG, or WebP image.");
      }
      if (file.size > MAX_IMAGE_SIZE) return setError("Images must be 3 MB or smaller.");
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentText("");
        setDocumentData(null);
        setImageData(String(reader.result ?? ""));
        setAttachmentName(file.name);
      };
      reader.readAsDataURL(file);
      return;
    }

    const extension = file.name.toLowerCase().split(".").pop();
    if (extension === "pdf" || extension === "docx") {
      if (file.size > MAX_IMAGE_SIZE) return setError("PDF and DOCX files must be 3 MB or smaller.");
      const type = extension === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const reader = new FileReader();
      reader.onload = () => {
        const encoded = String(reader.result ?? "").split(",", 2)[1];
        if (!encoded) return setError("Could not read that document.");
        setAttachmentText("");
        setImageData("");
        setDocumentData({ name: file.name, type, data: `data:${type};base64,${encoded}` });
        setAttachmentName(file.name);
      };
      reader.onerror = () => setError("Could not read that document.");
      reader.readAsDataURL(file);
      return;
    }
    if (extension !== "txt" && file.type !== "text/plain") {
      return setError("Choose a PDF, DOCX, or plain-text document.");
    }
    if (file.size > 100 * 1024) return setError("Text documents must be 100 KB or smaller.");
    void file.text().then((text) => {
      setImageData("");
      setDocumentData(null);
      setAttachmentText(text.slice(0, 10_000));
      setAttachmentName(file.name);
    }).catch(() => setError("Could not read that document."));
  }

  function startVoiceInput() {
    const speechWindow = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported by this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage === "auto" ? navigator.language || "en-US" : voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const result = event.results[event.resultIndex]?.[0]?.transcript;
      if (result) setMessage((current) => `${current}${current ? " " : ""}${result}`);
    };
    recognition.onerror = () => setError("Voice input could not start. Check microphone permissions.");
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function speak(content: string) {
    if (!("speechSynthesis" in window)) {
      setError("Voice output is not supported by this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    const inferredLanguage = /[\u0B80-\u0BFF]/.test(content) ? "ta-IN" : navigator.language || "en-US";
    const language = voiceLanguage === "auto" ? inferredLanguage : voiceLanguage;
    const voice = voices.find((item) => item.voiceURI === selectedVoice) ??
      voices.find((item) => item.lang.toLowerCase().startsWith(language.toLowerCase().slice(0, 2)));
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? language;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  const dark = theme === "dark";
  const shell = dark ? "bg-[#171b19] text-stone-100" : "bg-[#f7f6f2] text-stone-900";
  const panel = dark ? "bg-[#202522] border-white/10" : "bg-white border-stone-200";
  const muted = dark ? "text-stone-400" : "text-stone-500";

  return (
    <section className={`-mt-[98px] flex min-h-[calc(100dvh-0px)] overflow-hidden pt-[98px] max-md:-mt-[90px] max-md:pt-[90px] ${shell}`}>
      {sidebarOpen && <button aria-label="Close chat list" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,300px)] flex-col border-r p-4 pt-[112px] transition-transform lg:static lg:z-auto lg:w-[280px] lg:flex-none lg:translate-x-0 lg:pt-4 ${panel} ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="font-display text-lg font-semibold">THOMA AI</span>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="grid h-9 w-9 place-items-center rounded-md">×</button>
        </div>
        <button type="button" onClick={createNewChat} className={`flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${dark ? "border-white/15 hover:bg-white/5" : "border-stone-200 hover:bg-stone-50"}`}>
          <span aria-hidden="true" className="text-lg leading-none">+</span> New chat
        </button>
        <label className={`mt-4 flex h-10 items-center gap-2 rounded-lg border px-3 ${dark ? "border-white/10 bg-black/10" : "border-stone-200 bg-stone-50"}`}>
          <span aria-hidden="true" className={muted}>⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats" aria-label="Search chats" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-stone-400" />
        </label>
        <p className={`mb-2 mt-6 px-2 text-[10px] font-semibold uppercase tracking-[1.4px] ${muted}`}>Recent</p>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {visibleThreads.map((thread) => (
            <div key={thread.id} className={`group flex items-center gap-1 rounded-lg ${activeId === thread.id ? dark ? "bg-white/10" : "bg-stone-100" : ""}`}>
              <button type="button" onClick={() => { setActiveId(thread.id); setSidebarOpen(false); }} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-xs">{thread.title}</button>
              {threads.length > 1 && <button type="button" aria-label={`Delete ${thread.title}`} title="Delete chat" onClick={() => deleteThread(thread.id)} className="mr-1 grid h-8 w-8 place-items-center rounded-md opacity-0 transition hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100">×</button>}
            </div>
          ))}
          {visibleThreads.length === 0 && <p className={`px-2 py-3 text-xs ${muted}`}>No matching chats.</p>}
        </div>
        <div className={`mt-4 border-t pt-4 ${dark ? "border-white/10" : "border-stone-200"}`}>
          <label className="flex cursor-pointer items-start gap-3 px-1">
            <input type="checkbox" checked={memoryEnabled} onChange={(event) => updateMemoryConsent(event.target.checked)} className="mt-0.5 accent-emerald-700" />
            <span><span className="block text-xs font-medium">Save chat history</span><span className={`mt-1 block text-[10px] leading-4 ${muted}`}>Consent-based; account sync requires sign-in.</span></span>
          </label>
          <label className={`mt-3 block px-1 text-[10px] ${muted}`}>
            Voice language
            <select value={voiceLanguage} onChange={(event) => setVoiceLanguage(event.target.value)} className={`mt-1 h-9 w-full rounded-md border px-2 text-xs ${dark ? "border-white/10 bg-[#202522] text-stone-100" : "border-stone-200 bg-white text-stone-800"}`}>
              <option value="auto">Auto detect</option>
              <option value="en-US">English</option>
              <option value="ta-IN">Tamil</option>
            </select>
          </label>
          <label className={`mt-2 block px-1 text-[10px] ${muted}`}>
            Speech voice
            <select value={selectedVoice} onChange={(event) => setSelectedVoice(event.target.value)} className={`mt-1 h-9 w-full rounded-md border px-2 text-xs ${dark ? "border-white/10 bg-[#202522] text-stone-100" : "border-stone-200 bg-white text-stone-800"}`}>
              <option value="">System default</option>
              {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} className={`mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs transition ${dark ? "hover:bg-white/5" : "hover:bg-stone-100"}`}><span aria-hidden="true">{dark ? "☼" : "◐"}</span>{dark ? "Light appearance" : "Dark appearance"}</button>
          <Link href="/" className={`mt-1 block px-2 py-2 text-xs ${muted} hover:underline`}>Back to Sarathan Studio</Link>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className={`flex h-14 flex-none items-center justify-between border-b px-4 sm:px-7 ${dark ? "border-white/10" : "border-stone-200"}`}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open chat list" className={`grid h-9 w-9 place-items-center rounded-md lg:hidden ${dark ? "hover:bg-white/5" : "hover:bg-stone-100"}`}>☰</button>
            <div><h1 className="text-sm font-semibold">THOMA AI</h1><p className={`text-[10px] ${muted}`}>Sarathan Studio assistant</p></div>
          </div>
          <span className={`hidden text-[10px] sm:block ${muted}`}>General AI · Studio help</span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-y-auto px-4 pb-8 pt-6 sm:px-8">
            {!activeThread?.messages.length ? (
              <div className="m-auto w-full max-w-2xl py-10 text-center">
                <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl border font-display text-2xl ${dark ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-emerald-800/15 bg-emerald-800/5 text-emerald-900"}`}>T</div>
                <h2 className="mt-5 font-display text-3xl font-semibold sm:text-4xl">What can I help with?</h2>
                <p className={`mx-auto mt-3 max-w-lg text-sm leading-6 ${muted}`}>Ask in Tamil or English. Get help with ideas, writing, learning, code, photography, and the studio.</p>
                <div className="mt-8 grid gap-2 text-left sm:grid-cols-2">
                  {["Explain aperture and shutter speed simply", "Write a polite booking follow-up email", "Help debug this JavaScript error", "Suggest wedding portrait poses"].map((suggestion) => <button key={suggestion} type="button" onClick={() => void sendMessage(suggestion)} className={`rounded-lg border p-3 text-xs leading-5 transition ${dark ? "border-white/10 hover:bg-white/5" : "border-stone-200 hover:bg-white"}`}>{suggestion}</button>)}
                </div>
              </div>
            ) : (
              <div className="space-y-7">
                {activeThread.messages.map((item, index) => (
                  <article key={`${item.createdAt}-${index}`} className={`group flex gap-3 ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                    {item.role === "assistant" && <div className={`mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg text-xs font-semibold ${dark ? "bg-emerald-300/10 text-emerald-200" : "bg-emerald-900/10 text-emerald-900"}`}>T</div>}
                    <div className={`max-w-[min(88%,760px)] min-w-0 ${item.role === "user" ? `rounded-2xl px-4 py-3 ${dark ? "bg-white/10" : "bg-white shadow-sm"}` : "pt-1"}`}>
                      <div className="space-y-1 break-words text-sm leading-7">{renderMessage(item.content, dark)}</div>
                      {item.role === "assistant" && <div className={`mt-3 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 ${muted}`}>
                        <button type="button" title="Copy response" aria-label="Copy response" onClick={() => { void navigator.clipboard.writeText(item.content).then(() => setNotice("Copied to clipboard.")); }} className="grid h-8 w-8 place-items-center rounded-md hover:bg-black/5">⧉</button>
                        <button type="button" title="Read aloud" aria-label="Read response aloud" onClick={() => speak(item.content)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-black/5">◖))</button>
                        <button type="button" title="Regenerate response" aria-label="Regenerate response" disabled={sending} onClick={() => void regenerate(index)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-black/5 disabled:opacity-40">↻</button>
                      </div>}
                      {item.role === "user" && <button type="button" title="Edit message" aria-label="Edit message" onClick={() => { setEditingIndex(index); setMessage(item.content); }} className={`mt-2 text-[10px] opacity-0 transition hover:underline group-hover:opacity-100 ${muted}`}>Edit</button>}
                    </div>
                    {item.role === "user" && <div className={`mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg text-xs ${dark ? "bg-white/10" : "bg-stone-200"}`}>You</div>}
                  </article>
                ))}
                {sending && <div role="status" className={`flex items-center gap-3 text-xs ${muted}`}><span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700/20 border-t-emerald-700" />THOMA is thinking…</div>}
                <div ref={messageEndRef} />
              </div>
            )}
            {generatedImage && <figure className={`mx-auto mt-8 w-full max-w-2xl overflow-hidden rounded-xl border ${panel}`}>
              <img src={generatedImage} alt={`Generated image for prompt: ${imagePrompt}`} className="max-h-[560px] w-full object-contain" />
              <figcaption className="flex items-center justify-between gap-4 px-4 py-3 text-xs">
                <span className={`min-w-0 flex-1 truncate ${muted}`}>{imagePrompt}</span>
                <a href={generatedImage} download="thoma-generated.png" className="flex-none font-medium text-emerald-700 underline underline-offset-2">Download PNG</a>
              </figcaption>
            </figure>}
          </div>

          <div className={`w-full flex-none border-t px-3 pb-3 pt-3 sm:px-6 sm:pb-5 ${dark ? "border-white/10" : "border-stone-200"}`}>
            {error && <p role="alert" className="mx-auto mb-2 max-w-4xl rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>}
            {notice && <p role="status" className={`mx-auto mb-2 max-w-4xl text-xs ${muted}`}>{notice}</p>}
            {(attachmentName || imageData || documentData) && <div className={`mx-auto mb-2 flex max-w-4xl items-center justify-between rounded-md border px-3 py-2 text-xs ${dark ? "border-white/10" : "border-stone-200"}`}><span className="truncate">{attachmentName}{attachmentText ? " · text ready" : imageData ? " · image ready" : documentData ? " · document ready" : ""}</span><button type="button" onClick={() => { setAttachmentName(""); setAttachmentText(""); setImageData(""); setDocumentData(null); }} aria-label="Remove attachment">×</button></div>}
            {showImageGenerator && <div className={`mx-auto mb-2 flex max-w-4xl items-center gap-2 rounded-xl border p-2 ${panel}`}>
              <input value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} maxLength={2000} placeholder="Describe the image you want to generate…" aria-label="Image generation prompt" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs outline-none placeholder:text-stone-400" />
              <button type="button" disabled={generatingImage || imagePrompt.trim().length < 8} onClick={() => void generateImage()} className="flex-none rounded-lg bg-emerald-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">{generatingImage ? "Generating…" : "Generate"}</button>
            </div>}
            <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className={`mx-auto max-w-4xl rounded-2xl border p-2 shadow-sm focus-within:border-emerald-700/40 ${panel}`}>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={2} maxLength={8000} placeholder={editingIndex === null ? "Message THOMA…" : "Edit your message…"} aria-label="Message THOMA AI" className="max-h-40 min-h-[54px] w-full resize-y bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-stone-400" />
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleAttachment(file, "image"); event.target.value = ""; }} />
                  <input ref={documentInputRef} type="file" accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleAttachment(file, "document"); event.target.value = ""; }} />
                  <button type="button" onClick={() => imageInputRef.current?.click()} title="Attach image" aria-label="Attach image" className={`grid h-9 w-9 place-items-center rounded-lg text-lg ${dark ? "hover:bg-white/5" : "hover:bg-stone-100"}`}>＋</button>
                  <button type="button" onClick={() => documentInputRef.current?.click()} title="Attach a text document" aria-label="Attach document" className={`grid h-9 w-9 place-items-center rounded-lg text-sm ${dark ? "hover:bg-white/5" : "hover:bg-stone-100"}`}>▤</button>
                  <button type="button" onClick={() => setShowImageGenerator((current) => !current)} title="Generate an image from a prompt" aria-label="Generate an image" className={`rounded-lg px-2 py-2 text-[11px] ${dark ? "hover:bg-white/5" : "hover:bg-stone-100"}`}>▧ Create image</button>
                  <button type="button" onClick={() => listening ? recognitionRef.current?.stop() : startVoiceInput()} title={listening ? "Stop voice input" : "Start voice input"} aria-label={listening ? "Stop voice input" : "Start voice input"} className={`grid h-9 w-9 place-items-center rounded-lg text-sm ${listening ? "bg-red-500/10 text-red-600" : dark ? "hover:bg-white/5" : "hover:bg-stone-100"}`}>♩</button>
                  {speaking && <button type="button" onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }} title="Stop speaking" aria-label="Stop speaking" className="grid h-9 w-9 place-items-center rounded-lg text-sm text-red-600">■</button>}
                </div>
                {sending ? <button type="button" onClick={() => abortRef.current?.abort()} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white">Stop</button> : <button type="submit" disabled={!message.trim() && !attachmentText && !imageData && !documentData} aria-label="Send message" className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-800 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">↑</button>}
              </div>
            </form>
            <p className={`mx-auto mt-2 max-w-4xl text-center text-[10px] ${muted}`}>THOMA can make mistakes. Don’t include sensitive customer information in general chats.</p>
          </div>
        </div>
      </main>
    </section>
  );
}