// Test script to verify OpenRouter integration
const testOpenRouter = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Once upon a time',
        option: 'continue',
        command: ''
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error:', response.status, errorText);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      result += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Note: Make sure the dev server is running on http://localhost:3000
console.log('Testing OpenRouter integration...');
console.log('Using model: anthropic/claude-3.5-sonnet\n');
testOpenRouter();