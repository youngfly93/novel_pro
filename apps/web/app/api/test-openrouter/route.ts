export async function GET() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "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";
  const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";

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
    
    return Response.json({
      status: response.status,
      statusText: response.statusText,
      apiKeyPrefix: OPENAI_API_KEY.substring(0, 10) + '...',
      baseURL: OPENAI_BASE_URL,
      modelsCount: data.data ? data.data.length : 0,
      error: response.ok ? null : data
    });
  } catch (error) {
    return Response.json({
      error: 'Network error',
      message: error.message,
      apiKeyPrefix: OPENAI_API_KEY.substring(0, 10) + '...',
      baseURL: OPENAI_BASE_URL
    }, { status: 500 });
  }
}
