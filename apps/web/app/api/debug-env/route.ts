export async function GET() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";

  return Response.json({
    environment: {
      OPENAI_API_KEY: OPENAI_API_KEY ? "SET" : "NOT SET",
      OPENAI_BASE_URL: OPENAI_BASE_URL,
      OPENAI_MODEL: process.env.OPENAI_MODEL || "NOT SET",
      NODE_ENV: process.env.NODE_ENV,
      API_KEY_PREFIX: OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 10)}...` : "NOT SET",
    },
    message: "Environment debug endpoint. Use runtime API configuration in /settings for better user experience.",
  });
}
