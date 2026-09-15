import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import crypto from "node:crypto";
import os from "os";
import path from "path";
import { processReadingAudio } from "@/lib/analysisService";
import { requireActor } from "@/lib/server/authz";
import { DetailedError, logDetailed, formatErrorForUser, IS_DEV } from "@/lib/errorUtils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const FILE_NAME = "app/api/process-audio/route.ts";
const ENDPOINT = "POST /api/process-audio";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = [
  "audio/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
  "audio/x-m4a",
  "audio/m4a",
  "application/octet-stream",
];

const uploadSchema = z.object({
  file: z
    .any()
    .refine((file) => file instanceof File, "O campo 'file' deve ser um arquivo.")
    .refine((file) => file?.size <= MAX_FILE_SIZE, "Arquivo muito grande (máximo 10MB).")
    .refine(
      (file) =>
        ALLOWED_MIME.includes(file?.type) ||
        file?.name.endsWith(".webm") ||
        file?.name.endsWith(".mp3") ||
        file?.name.endsWith(".wav") ||
        file?.name.endsWith(".m4a") ||
        file?.name.endsWith(".ogg"),
      "Tipo de arquivo inválido. Use webm, mp3, wav, m4a ou ogg."
    ),
  originalText: z.string().min(1).max(10000),
  studentGrade: z.string().max(40).optional(),
  targetPCM: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
  history: z.string().optional().transform((v) => (v ? JSON.parse(v) : undefined)),
  duration: z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
});

function hashId(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function minimizeHistory(history: unknown): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(history)) return undefined;
  return history.slice(-5).map((item) => {
    const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      pcm: typeof source.pcm === "number" ? source.pcm : undefined,
      precisao: typeof source.precisao === "number" ? source.precisao : undefined,
      erros: typeof source.erros === "number" ? source.erros : undefined,
      data: typeof source.data === "string" ? source.data.slice(0, 10) : undefined,
    };
  });
}

function statusFromError(error: unknown): number {
  if (error instanceof DetailedError) return error.httpStatus || error.httpCode || 500;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("token") || message.includes("autent")) return 401;
  if (message.includes("permiss")) return 403;
  if (message.includes("grande") || message.includes("payload")) return 413;
  if (message.includes("rate") || message.includes("quota") || message.includes("cota")) return 429;
  if (message.includes("timeout")) return 504;
  return 500;
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  let tempPath: string | null = null;
  let hashedUserId: string | undefined;
  let fileSize = 0;
  let textLength = 0;

  try {
    try {
      const actor = await requireActor();
      hashedUserId = hashId(actor.email);
    } catch (authError) {
      logDetailed({
        level: "warn",
        message: "Sessão recusada no endpoint de áudio.",
        fileName: FILE_NAME,
        methodName: "POST",
        endpoint: ENDPOINT,
        extraData: { requestId, reason: authError instanceof Error ? authError.message : "token inválido" },
      });
      return NextResponse.json({ detail: "Sessão inválida ou expirada.", requestId }, { status: 401 });
    }

    const formData = await req.formData();
    const validation = uploadSchema.safeParse({
      file: formData.get("file"),
      originalText: formData.get("original_text"),
      studentGrade: formData.get("student_grade") || undefined,
      targetPCM: formData.get("target_pcm") || undefined,
      history: formData.get("history") || undefined,
      duration: formData.get("duration") || undefined,
    });

    if (!validation.success) {
      const issue = validation.error.issues[0];
      logDetailed({
        level: "warn",
        message: "Payload de áudio rejeitado por validação.",
        fileName: FILE_NAME,
        methodName: "POST",
        endpoint: ENDPOINT,
        userId: hashedUserId,
        extraData: { requestId, field: issue.path.join("."), code: issue.code },
      });
      return NextResponse.json({ detail: issue.message, requestId }, { status: 400 });
    }

    const validatedFile = validation.data.file as File;
    const validatedText = validation.data.originalText;
    fileSize = validatedFile.size;
    textLength = validatedText.length;

    const bytes = await validatedFile.arrayBuffer();
    tempPath = path.join(os.tmpdir(), `leitura-${requestId}.webm`);
    await writeFile(tempPath, Buffer.from(bytes));

    logDetailed({
      level: "info",
      message: "Processamento de áudio iniciado.",
      fileName: FILE_NAME,
      methodName: "POST",
      endpoint: ENDPOINT,
      userId: hashedUserId,
      extraData: { requestId, fileSize, textLength },
    });

    const result = await processReadingAudio({
      filePath: tempPath,
      originalText: validatedText,
      filename: "reading.webm",
      studentGrade: validation.data.studentGrade,
      targetPCM: validation.data.targetPCM,
      history: minimizeHistory(validation.data.history),
      duration: validation.data.duration,
      // Dados de nacionalidade/saúde não são enviados ao fornecedor por padrão.
      isForeigner: false,
      isGlassesUser: false,
    });

    logDetailed({
      level: "info",
      message: "Processamento de áudio concluído.",
      fileName: FILE_NAME,
      methodName: "POST",
      endpoint: ENDPOINT,
      userId: hashedUserId,
      extraData: {
        requestId,
        durationMs: Date.now() - startTime,
        pcm: typeof (result as any)?.pcm === "number" ? (result as any).pcm : undefined,
        precisao: typeof (result as any)?.precisao === "number" ? (result as any).precisao : undefined,
      },
    });

    return NextResponse.json({ ...result, requestId });
  } catch (rawError) {
    const error = rawError instanceof Error ? rawError : new Error(String(rawError));
    const status = statusFromError(error);

    logDetailed({
      level: "error",
      message: "Falha no processamento de áudio.",
      fileName: FILE_NAME,
      methodName: "POST",
      endpoint: ENDPOINT,
      userId: hashedUserId,
      httpStatusCode: status,
      errorName: error.name,
      errorMessage: error.message,
      stackTrace: error.stack,
      extraData: { requestId, fileSize, textLength, durationMs: Date.now() - startTime },
    });

    const detail = IS_DEV
      ? formatErrorForUser(error, { operation: "processar áudio", endpoint: ENDPOINT, httpStatus: status })
      : status === 401
        ? "Sessão inválida ou expirada."
        : "Não foi possível processar a avaliação. Informe o código da requisição ao suporte.";

    return NextResponse.json({ detail, requestId }, { status });
  } finally {
    if (tempPath) {
      try {
        await unlink(tempPath);
        logDetailed({
          level: "debug",
          message: "Arquivo temporário de áudio removido.",
          fileName: FILE_NAME,
          methodName: "POST/finally",
          endpoint: ENDPOINT,
          userId: hashedUserId,
          extraData: { requestId },
        });
      } catch (cleanupError) {
        logDetailed({
          level: "error",
          message: "Falha ao remover arquivo temporário de áudio.",
          fileName: FILE_NAME,
          methodName: "POST/finally",
          endpoint: ENDPOINT,
          userId: hashedUserId,
          errorName: cleanupError instanceof Error ? cleanupError.name : "CleanupError",
          errorMessage: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          extraData: { requestId },
        });
      }
    }
  }
}
