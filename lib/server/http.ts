import { NextResponse } from "next/server";
import { HttpError } from "./authz";

export function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private" } });
}

export function apiError(error: unknown) {
  if (error instanceof HttpError) return noStoreJson({ detail: error.message }, error.status);
  console.error("API request failed", { name: error instanceof Error ? error.name : "UnknownError" });
  return noStoreJson({ detail: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "Erro interno." }, 500);
}
