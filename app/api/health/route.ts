import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    runtime: "nextjs",
    message: "API de leitura ativa",
    env: {
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    },
  });
}