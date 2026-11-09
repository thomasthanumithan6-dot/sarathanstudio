export type ProviderTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ProviderMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<Record<string, unknown>> | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

export type ProviderCompletion = {
  message: ProviderMessage;
  finishReason: string | null;
};

export interface AIProvider {
  complete(input: {
    messages: ProviderMessage[];
    tools?: ProviderTool[];
    signal?: AbortSignal;
  }): Promise<ProviderCompletion>;
}

class OpenAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async complete({ messages, tools, signal }: Parameters<AIProvider["complete"]>[0]) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        ...(tools?.length ? { tools, tool_choice: "auto" } : {}),
        max_tokens: 900,
        temperature: 0.4,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error("THOMA's AI provider could not complete the request.");
    }

    const result = await response.json();
    const choice = result?.choices?.[0];
    if (!choice?.message || typeof choice.message !== "object") {
      throw new Error("THOMA received an invalid response from its AI provider.");
    }

    return {
      message: choice.message as ProviderMessage,
      finishReason: typeof choice.finish_reason === "string" ? choice.finish_reason : null,
    };
  }
}

export function getAIProvider(): AIProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAIProvider(apiKey, process.env.OPENAI_MODEL ?? "gpt-4o-mini");
}