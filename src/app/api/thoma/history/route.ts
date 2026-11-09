import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MESSAGES = 80;
const MAX_CONTENT_LENGTH = 20_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StoredMessage = { role: "user" | "assistant"; content: string; createdAt: number };
type StoredThread = { id: string; title: string; updatedAt: number; messages: StoredMessage[] };

async function getSignedInClient() {
  if (!isSupabaseConfigured()) return { error: "Supabase is not configured.", status: 501 as const };
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Sign in to sync chat history.", status: 401 as const };
  return { supabase, user };
}

export async function GET() {
  const access = await getSignedInClient();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data: conversations, error: conversationError } = await access.supabase
    .from("thoma_conversations")
    .select("id, title, updated_at")
    .eq("user_id", access.user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (conversationError) {
    return NextResponse.json({ error: "Chat history is unavailable. Apply the THOMA Supabase migration first." }, { status: 503 });
  }
  if (!conversations?.length) return NextResponse.json({ threads: [] });

  const messages: Array<{ conversation_id: string; role: string; content: string; created_at: string }> = [];
  for (let offset = 0; offset < 4_000; offset += 1_000) {
    const { data: batch, error: messageError } = await access.supabase
      .from("thoma_messages")
      .select("conversation_id, role, content, created_at")
      .eq("user_id", access.user.id)
      .in("conversation_id", conversations.map((conversation) => conversation.id))
      .order("created_at", { ascending: true })
      .range(offset, offset + 999);

    if (messageError) {
      return NextResponse.json({ error: "Chat messages could not be loaded." }, { status: 503 });
    }
    messages.push(...(batch ?? []));
    if ((batch?.length ?? 0) < 1_000) break;
  }

  const threads: StoredThread[] = conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: Date.parse(conversation.updated_at),
    messages: messages
      .filter((message) => message.conversation_id === conversation.id)
      .map((message) => ({
        role: message.role as StoredMessage["role"],
        content: message.content,
        createdAt: Date.parse(message.created_at),
      })),
  }));

  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 1_800_000) {
    return NextResponse.json({ error: "The conversation is too large to save." }, { status: 413 });
  }

  const access = await getSignedInClient();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }

  const thread = body && typeof body === "object" ? (body as { thread?: unknown }).thread : null;
  if (!thread || typeof thread !== "object") {
    return NextResponse.json({ error: "A conversation is required." }, { status: 400 });
  }

  const candidate = thread as Partial<StoredThread>;
  if (
    typeof candidate.id !== "string" ||
    !UUID_PATTERN.test(candidate.id) ||
    typeof candidate.title !== "string" ||
    candidate.title.length > 80 ||
    !Array.isArray(candidate.messages) ||
    candidate.messages.length > MAX_MESSAGES
  ) {
    return NextResponse.json({ error: "The conversation is invalid or too large." }, { status: 400 });
  }

  const normalizedMessages: Array<{ role: string; content: string; created_at: string }> = [];
  for (const message of candidate.messages) {
    const createdAt = typeof message?.createdAt === "number" ? new Date(message.createdAt) : null;
    if (
      !message ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      message.content.length > MAX_CONTENT_LENGTH ||
      typeof message.createdAt !== "number" ||
      !Number.isFinite(message.createdAt) ||
      !createdAt ||
      Number.isNaN(createdAt.getTime())
    ) {
      return NextResponse.json({ error: "A chat message is invalid or too large." }, { status: 400 });
    }
    normalizedMessages.push({
      role: message.role,
      content: message.content,
      created_at: createdAt.toISOString(),
    });
  }

  const { error } = await access.supabase.rpc("thoma_save_conversation", {
    p_conversation_id: candidate.id,
    conversation_title: candidate.title.trim() || "New chat",
    conversation_messages: normalizedMessages,
  });
  if (error) {
    return NextResponse.json({ error: "Chat history could not be saved. Check the THOMA Supabase migration." }, { status: 503 });
  }

  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const access = await getSignedInClient();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? body as { id?: unknown; all?: unknown } : {};
  const all = payload.all === true;
  if (!all && (typeof payload.id !== "string" || !UUID_PATTERN.test(payload.id))) {
    return NextResponse.json({ error: "A valid conversation ID is required." }, { status: 400 });
  }

  const { error } = await access.supabase.rpc("thoma_delete_conversation", {
    p_conversation_id: all ? null : payload.id,
  });
  if (error) return NextResponse.json({ error: "Chat history could not be deleted." }, { status: 503 });
  return NextResponse.json({ deleted: true });
}