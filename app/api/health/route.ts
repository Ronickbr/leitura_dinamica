import { NextResponse } from "next/server";

export async function GET() {
  const developmentFallback = process.env.NODE_ENV !== "production" && Boolean(process.env.OPENROUTER_API_KEY);
  return NextResponse.json({
    status: "ok",
    runtime: "nextjs",
    message: "API de leitura ativa",
    env: {
      openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
      provider: process.env.OPENAI_API_KEY ? "openai" : (developmentFallback ? "openrouter-development" : "none")
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
