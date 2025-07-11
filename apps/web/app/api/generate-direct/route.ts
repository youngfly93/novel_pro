import { match } from "ts-pattern";

// Load environment variables explicitly with fallbacks
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "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";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "anthropic/claude-3.5-sonnet";

export async function POST(req: Request): Promise<Response> {
  console.log('Direct API call - Environment check:', {
    OPENAI_API_KEY: OPENAI_API_KEY ? 'SET' : 'NOT SET',
    OPENAI_BASE_URL: OPENAI_BASE_URL,
    OPENAI_MODEL: OPENAI_MODEL,
  });

  const { prompt, option, command } = await req.json();
  
  const messages = match(option)
    .with("continue", () => [
      {
        role: "system",
        content: "You are an AI writing assistant that continues existing text based on context from prior text. Limit your response to no more than 200 characters, but make sure to construct complete sentences. Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: prompt,
      },
    ])
    .with("improve", () => [
      {
        role: "system",
        content: "You are an AI writing assistant that improves existing text. Limit your response to no more than 200 characters, but make sure to construct complete sentences. Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("shorter", () => [
      {
        role: "system",
        content: "You are an AI writing assistant that shortens existing text. Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("longer", () => [
      {
        role: "system",
        content: "You are an AI writing assistant that lengthens existing text. Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("fix", () => [
      {
        role: "system",
        content: "You are an AI writing assistant that fixes grammar and spelling errors in existing text. Limit your response to no more than 200 characters, but make sure to construct complete sentences. Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("zap", () => [
      {
        role: "system",
        content: "You are an AI writing assistant that generates text based on a prompt. You take an input from the user and a command for manipulating the text. Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `For this text: ${prompt}. You have to respect the command: ${command}`,
      },
    ])
    .run();

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://novel.sh',
        'X-Title': 'Novel Editor'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: messages,
        max_tokens: 200,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API Error:', errorData);
      return new Response(JSON.stringify({
        error: 'OpenRouter API Error',
        status: response.status,
        message: errorData.error?.message || 'Unknown error',
        details: errorData
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response generated';

    return new Response(content, {
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    console.error('Network Error:', error);
    return new Response(JSON.stringify({
      error: 'Network Error',
      message: error.message,
      details: {
        apiKey: OPENAI_API_KEY ? 'SET' : 'NOT SET',
        baseURL: OPENAI_BASE_URL,
        model: OPENAI_MODEL
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
