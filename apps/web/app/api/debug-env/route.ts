export async function GET() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";

  // Test OpenRouter API - Models endpoint
  let modelsTest = null;
  try {
    const response = await fetch(`${OPENAI_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://novel.sh',
        'X-Title': 'Novel Editor'
      }
    });

    const data = await response.json();
    modelsTest = {
      status: response.status,
      statusText: response.statusText,
      modelsCount: data.data ? data.data.length : 0,
      error: response.ok ? null : data
    };
  } catch (error) {
    modelsTest = {
      error: 'Network error',
      message: error.message
    };
  }

  // Test different models and formats
  let chatTests = {};

  // Test 1: Try with a free model first
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
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [
          {
            role: "user",
            content: "Hello, respond with 'Test successful!'"
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    const data = await response.json();
    chatTests.freeModel = {
      model: "meta-llama/llama-3.2-3b-instruct:free",
      status: response.status,
      success: response.ok,
      response: response.ok ? data.choices?.[0]?.message?.content : null,
      error: response.ok ? null : data
    };
  } catch (error) {
    chatTests.freeModel = {
      error: 'Network error',
      message: error.message
    };
  }

  // Test 2: Try with Claude (original)
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
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "user",
            content: "Hello, respond with 'Test successful!'"
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    const data = await response.json();
    chatTests.claude = {
      model: "anthropic/claude-3.5-sonnet",
      status: response.status,
      success: response.ok,
      response: response.ok ? data.choices?.[0]?.message?.content : null,
      error: response.ok ? null : data
    };
  } catch (error) {
    chatTests.claude = {
      error: 'Network error',
      message: error.message
    };
  }

  // Test 3: Try with GPT-4o-mini (usually cheaper/more accessible)
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
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Hello, respond with 'Test successful!'"
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    const data = await response.json();
    chatTests.gpt4mini = {
      model: "openai/gpt-4o-mini",
      status: response.status,
      success: response.ok,
      response: response.ok ? data.choices?.[0]?.message?.content : null,
      error: response.ok ? null : data
    };
  } catch (error) {
    chatTests.gpt4mini = {
      error: 'Network error',
      message: error.message
    };
  }

  return Response.json({
    OPENAI_API_KEY: OPENAI_API_KEY ? 'SET' : 'NOT SET',
    OPENAI_BASE_URL: OPENAI_BASE_URL || 'NOT SET',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    API_KEY_PREFIX: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    modelsTest: modelsTest,
    chatTests: chatTests
  });
}
