import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type RateLimit = { count: number; resetAt: number };
const rateLimits = new Map<string, RateLimit>();

function getClientKey(request: Request) {
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 3;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 4_000) {
    return NextResponse.json({ error: "The image prompt is too large." }, { status: 413 });
  }
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json(
      { error: "Image generation is limited to 3 requests per minute. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
  }
  const prompt = body && typeof body === "object" ? (body as { prompt?: unknown }).prompt : null;
  if (typeof prompt !== "string" || prompt.trim().length < 8 || prompt.length > 2_000) {
    return NextResponse.json({ error: "Write an image prompt between 8 and 2,000 characters." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Add OPENAI_API_KEY in Vercel to enable image generation." }, { status: 501 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt.trim(),
        size: "1024x1024",
        quality: "medium",
        output_format: "png",
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "The image provider could not generate that image. Please try another prompt." }, { status: 502 });
    }
    const data = await response.json();
    const base64 = data?.data?.[0]?.b64_json;
    if (typeof base64 !== "string" || !base64) {
      return NextResponse.json({ error: "The image provider returned no image." }, { status: 502 });
    }
    return NextResponse.json({ image: `data:image/png;base64,${base64}` });
  } catch {
    return NextResponse.json({ error: "Image generation timed out or is temporarily unavailable." }, { status: 502 });
  }
}