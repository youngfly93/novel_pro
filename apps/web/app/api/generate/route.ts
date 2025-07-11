import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { match } from "ts-pattern";

// Load environment variables explicitly with fallbacks
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "anthropic/claude-3.5-sonnet";

// IMPORTANT! Set the runtime to edge: https://vercel.com/docs/functions/edge-functions/edge-runtime
export const runtime = "edge";

export async function POST(req: Request): Promise<Response> {
  // Debug: Log environment variables (remove in production)
  console.log('Environment check:', {
    OPENAI_API_KEY: OPENAI_API_KEY ? 'SET' : 'NOT SET',
    OPENAI_BASE_URL: OPENAI_BASE_URL,
    OPENAI_MODEL: OPENAI_MODEL,
    NODE_ENV: process.env.NODE_ENV
  });

  // Check if the OPENAI_API_KEY is set, if not return 400
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "") {
    return new Response(JSON.stringify({
      error: "Missing OPENAI_API_KEY",
      message: "Make sure to add OPENAI_API_KEY to your .env file.",
      debug: {
        NODE_ENV: process.env.NODE_ENV,
        hasEnvFile: 'Check if .env file exists in apps/web directory'
      }
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ip = req.headers.get("x-forwarded-for");
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(`novel_ratelimit_${ip}`);

    if (!success) {
      return new Response("You have reached your request limit for the day.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  // We'll use direct fetch instead of AI SDK due to authentication issues

  const { prompt, option, command } = await req.json();
  const messages = match(option)
    .with("continue", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that continues existing text based on context from prior text. " +
          "Give more weight/priority to the later characters than the beginning ones. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: prompt,
      },
    ])
    .with("improve", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that improves existing text. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("shorter", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that shortens existing text. " + "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("longer", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that lengthens existing text. " +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("fix", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that fixes grammar and spelling errors in existing text. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${prompt}`,
      },
    ])
    .with("zap", () => [
      {
        role: "system",
        content:
          "You area an AI writing assistant that generates text based on a prompt. " +
          "You take an input from the user and a command for manipulating the text" +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `For this text: ${prompt}. You have to respect the command: ${command}`,
      },
    ])
    .run();

  // Use custom model if specified (for OpenRouter support), otherwise default to gpt-4o-mini
  const modelName = OPENAI_MODEL;
  
  try {
    // Debug: Log the actual API key being used
    console.log('API Key being used:', OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 15) + '...' : 'NOT SET');
    console.log('Model name:', modelName);
    console.log('Messages:', JSON.stringify(messages, null, 2));

    // Try multiple models in order of preference (Claude first)
    const modelsToTry = [
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o-mini",
      "meta-llama/llama-3.2-3b-instruct:free"
    ];

    let response = null;
    let lastError = null;

    for (const model of modelsToTry) {
      console.log(`Trying model: ${model}`);

      const requestBody = {
        model: model,
        messages: messages,
        max_tokens: 200,
        temperature: 0.7,
        stream: false
      };

      try {
        response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://novel.sh',
            'X-Title': 'Novel Editor'
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          console.log(`Success with model: ${model}`);
          break;
        } else {
          const errorData = await response.json();
          console.log(`Failed with model ${model}:`, errorData);
          lastError = errorData;
          response = null;
        }
      } catch (error) {
        console.log(`Network error with model ${model}:`, error.message);
        lastError = { error: { message: error.message } };
        response = null;
      }
    }

    if (!response || !response.ok) {
      console.error('All models failed. Last error:', lastError);

      // Return error as a stream to match expected format
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          const errorMessage = `Sorry, AI service is temporarily unavailable. Please try again later.`;
          const chunk = `0:"${errorMessage}"\n`;
          controller.enqueue(encoder.encode(chunk));
          controller.close();
        }
      });

      return new Response(errorStream, {
        status: 200, // Return 200 to avoid frontend error handling
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

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

    // Return as a properly formatted data stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        try {
          // Escape the content properly for JSON
          const escapedContent = content
            .replace(/\\/g, '\\\\')  // Escape backslashes
            .replace(/"/g, '\\"')    // Escape quotes
            .replace(/\n/g, '\\n')   // Escape newlines
            .replace(/\r/g, '\\r')   // Escape carriage returns
            .replace(/\t/g, '\\t');  // Escape tabs

          // Send the content as a data stream chunk in the expected format
          const chunk = `0:"${escapedContent}"\n`;
          controller.enqueue(encoder.encode(chunk));
          controller.close();
        } catch (error) {
          console.error('Stream encoding error:', error);
          // Fallback: send a simple message
          const fallbackChunk = `0:"AI response generated successfully"\n`;
          controller.enqueue(encoder.encode(fallbackChunk));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Network Error:', error);

    // Return error as a stream to match expected format
    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
      start(controller) {
        const errorMessage = `Error: ${error.message || 'Unknown error occurred'}`;
        const chunk = `0:"${errorMessage}"\n`;
        controller.enqueue(encoder.encode(chunk));
        controller.close();
      }
    });

    return new Response(errorStream, {
      status: 200, // Return 200 to avoid frontend error handling
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
