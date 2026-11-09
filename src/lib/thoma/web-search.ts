export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("Web search is not configured.");

  const normalizedQuery = query.trim().slice(0, 300);
  if (normalizedQuery.length < 2) throw new Error("Search query is too short.");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: normalizedQuery,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Web search is temporarily unavailable.");

  const data = await response.json();
  const results: unknown[] = Array.isArray(data?.results) ? data.results : [];
  return results.flatMap((entry): WebSearchResult[] => {
    if (!entry || typeof entry !== "object" || !("url" in entry)) return [];
    const result = entry as { url?: unknown; title?: unknown; content?: unknown };
    if (typeof result.url !== "string") return [];
    try {
      const url = new URL(result.url);
      if (url.protocol !== "https:") return [];
      return [{
        title: typeof result.title === "string" ? result.title.slice(0, 160) : url.hostname,
        url: url.toString(),
        snippet: typeof result.content === "string" ? result.content.slice(0, 800) : "",
      }];
    } catch {
      return [];
    }
  }).slice(0, 5);
}