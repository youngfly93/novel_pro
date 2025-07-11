export async function POST(req: Request): Promise<Response> {
  try {
    const { apiKey, baseUrl, model, provider } = await req.json();

    if (!apiKey || !baseUrl || !model) {
      return Response.json({
        success: false,
        error: "Missing required fields"
      }, { status: 400 });
    }

    // Test the API key by making a simple request
    const testResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://novel.sh',
        'X-Title': 'Novel Editor'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: "Hello! This is a test message. Please respond with 'API key is working!'"
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    if (testResponse.ok) {
      const data = await testResponse.json();
      const response = data.choices?.[0]?.message?.content || '';
      
      return Response.json({
        success: true,
        message: "API key is valid and working!",
        testResponse: response,
        provider: provider,
        model: model
      });
    } else {
      const errorData = await testResponse.json();
      return Response.json({
        success: false,
        error: errorData.error?.message || `HTTP ${testResponse.status}: ${testResponse.statusText}`,
        details: errorData
      }, { status: 400 });
    }

  } catch (error) {
    console.error('API key test error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
