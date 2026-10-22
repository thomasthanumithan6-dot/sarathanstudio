import { NextResponse } from "next/server";
import { searchPublicStudioContent } from "@/lib/thoma-content";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 120) {
    return NextResponse.json({ error: "Search must be 120 characters or fewer." }, { status: 400 });
  }

  try {
    const results = await searchPublicStudioContent(query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Search is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}