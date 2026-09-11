import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    runtime: "nextjs",
    message: "API de leitura ativa",
    env: {
      openAIConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY),
      provider: process.env.OPENAI_API_KEY ? "openai" : (process.env.OPENROUTER_API_KEY ? "openrouter" : "none")
    },
  });
}