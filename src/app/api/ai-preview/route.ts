import { NextResponse } from "next/server";

export const runtime = "nodejs";

const STYLE_PROMPTS: Record<string, string> = {
  cinematic:
    "Re-edit this photograph with cinematic colour grading, dramatic lighting and a film-like mood. Keep the subjects identical.",
  wedding:
    "Re-edit this photograph as romantic wedding photography with soft, warm, elegant light. Keep the subjects identical.",
  bw: "Re-edit this photograph as an elegant fine-art black and white photograph with rich contrast. Keep the subjects identical.",
  studio:
    "Re-edit this photograph as a professional studio portrait with softbox lighting and a clean backdrop. Keep the subjects identical.",
};

/**
 * POST /api/ai-preview
 * Accepts multipart form data: image (File), style (string).
 * Returns { image: data-url } on success, or 501 when the AI provider
 * is not configured so the UI can say so honestly.
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "AI integration is not configured. Add OPENAI_API_KEY to .env.local (see .env.example).",
      },
      { status: 501 }
    );
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const style = String(formData.get("style") ?? "");
    const prompt = STYLE_PROMPTS[style];

    if (!(image instanceof File) || !image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "A valid image file is required." },
        { status: 400 }
      );
    }
    if (!prompt) {
      return NextResponse.json(
        { error: "Unknown style." },
        { status: 400 }
      );
    }

    const body = new FormData();
    body.append("model", "gpt-image-1");
    body.append("image", image);
    body.append("prompt", prompt);
    body.append("size", "1024x1024");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `AI provider error (${response.status}). Please try again later.` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;

    if (!b64) {
      return NextResponse.json(
        { error: "The AI provider returned no image." },
        { status: 502 }
      );
    }

    return NextResponse.json({ image: `data:image/png;base64,${b64}` });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error while generating the image." },
      { status: 500 }
    );
  }
}
