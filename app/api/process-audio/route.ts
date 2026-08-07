import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import os from "os";
import path from "path";
import { processReadingAudio } from "@/lib/analysisService";
import {
  DetailedError,
  logDetailed,
  formatErrorForUser,
  IS_DEV,
} from "@/lib/errorUtils";

import { z } from "zod";

export const dynamic = "force-dynamic";

const FILE_NAME = "app/api/process-audio/route.ts";
const ENDPOINT = "POST /api/process-audio";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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
    .refine(
      (file) => file?.size <= MAX_FILE_SIZE,
      "Arquivo muito grande (máximo 10MB)."
    )
    .refine(
      (file) =>
        ALLOWED_MIME.includes(file?.type) ||
        file?.name.endsWith(".webm") ||
        file?.name.endsWith(".mp3") ||
        file?.name.endsWith(".m4a"),
      "Tipo de arquivo inválido. Use webm, mp3, wav ou m4a."
    ),
  originalText: z
    .string()
    .min(1, "O texto original é obrigatório.")
    .max(10000, "O texto original excede o limite de 10000 caracteres."),
  studentGrade: z.string().optional(),
  targetPCM: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : undefined)),
  history: z
    .string()
    .optional()
    .transform((v) => (v ? JSON.parse(v) : undefined)),
  duration: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined)),
  isForeigner: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  isGlassesUser: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

function safeParseFormValue(val: FormDataEntryValue | null): unknown {
  if (val === null) return null;
  if (typeof val === "string") {
    if (val.length > 100) return val.slice(0, 100) + `…(${val.length} chars)`;
    return val;
  }
  return `[File:${val.name ?? "unknown"} ${val.size} bytes type=${val.type}]`;
}

function buildStatusFromMessage(message: string, fallback: number = 500): number {
  const msg = message.toLowerCase();

  if (msg.includes("obrigatório") || msg.includes("inválido") || msg.includes("grande")) return 400;
  if (msg.includes("autenticação") || msg.includes("autentic") || msg.includes("api key") || msg.includes("unauthorized")) return 401;
  if (msg.includes("sem permissão") || msg.includes("permisi") || msg.includes("forbidden") || msg.includes("acesso negado")) return 403;
  if (msg.includes("não encontrado") || msg.includes("nao encontrado") || msg.includes("not found")) return 404;
  if (msg.includes("conflito") || msg.includes("já cadastrado") || msg.includes("ja cadastrado")) return 409;
  if (msg.includes("extenso") || msg.includes("extensa") || msg.includes("payload") || msg.includes("muitos tokens")) return 413;
  if (msg.includes("limite") || msg.includes("cota") || msg.includes("rate limit") || msg.includes("muitas requisições")) return 429;
  if (msg.includes("timeout") || msg.includes("tempo esgotado") || msg.includes("timed out")) return 504;

  return fallback;
}

export async function POST(req: NextRequest) {
  let tempPath: string | null = null;
  const startTime = Date.now();
  const methodName = "POST handler";

  const auditInfo = {
    type: "AUDIT_LOG_AUDIO_PROCESS",
    filename: "unknown",
    fileSize: 0,
    textLength: 0,
  };

  let validatedPayloadForLog: Record<string, unknown> | null = null;
  let processingCompleted = false;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const originalText = formData.get("original_text");
    const studentGrade = formData.get("student_grade");
    const targetPCM = formData.get("target_pcm");
    const history = formData.get("history");
    const duration = formData.get("duration");
    const isForeigner = formData.get("is_foreigner");
    const isGlassesUser = formData.get("is_glasses_user");

    validatedPayloadForLog = {
      file: safeParseFormValue(file),
      originalText: safeParseFormValue(originalText),
      student_grade: safeParseFormValue(studentGrade),
      target_pcm: safeParseFormValue(targetPCM),
      history:
        typeof history === "string" && history.length > 200
          ? history.slice(0, 200) + `…(${history.length} chars)`
          : safeParseFormValue(history),
      duration: safeParseFormValue(duration),
      is_foreigner: safeParseFormValue(isForeigner),
      is_glasses_user: safeParseFormValue(isGlassesUser),
    };

    logDetailed({
      level: "info",
      message: `[${ENDPOINT}] Requisição recebida para processamento de áudio.`,
      fileName: FILE_NAME,
      methodName,
      lineNumber: 168,
      userId: req.headers.get("x-user-id") || req.headers.get("authorization")?.slice(0, 40) || undefined,
      parameters: validatedPayloadForLog,
    });

    const validation = uploadSchema.safeParse({
      file,
      originalText,
      studentGrade: studentGrade || undefined,
      targetPCM: targetPCM || undefined,
      history: history || undefined,
      duration: duration || undefined,
      isForeigner: isForeigner || undefined,
      isGlassesUser: isGlassesUser || undefined,
    });

    if (!validation.success) {
      const issue = validation.error.issues[0];
      const fieldPath = issue.path.join(".") || "payload";
      const errorMsg = issue.message;

      logDetailed({
        level: "warn",
        message: `[${ENDPOINT}] Validação de payload falhou. Campo: ${fieldPath}. Motivo: ${errorMsg}`,
        fileName: FILE_NAME,
        methodName,
        lineNumber: 196,
        userId: req.headers.get("x-user-id") || undefined,
        parameters: validatedPayloadForLog ?? undefined,
        extraData: {
          fieldName: fieldPath,
          receivedValue:
            fieldPath === "file"
              ? validatedPayloadForLog?.file
              : validatedPayloadForLog?.[fieldPath] ?? issue.path.join("."),
          zodIssueCode: issue.code,
          httpStatusCode: 400,
        },
      });

      return NextResponse.json(
        {
          detail: errorMsg,
          fieldName: fieldPath === "payload" ? undefined : fieldPath,
          httpStatus: 400,
          endpoint: ENDPOINT,
          arquivo: FILE_NAME,
        },
        { status: 400 }
      );
    }

    const {
      file: validatedFile,
      originalText: validatedText,
      studentGrade: validatedGrade,
      targetPCM: validatedTarget,
      history: validatedHistory,
      duration: validatedDuration,
    } = validation.data as {
      file: File;
      originalText: string;
      studentGrade?: string;
      targetPCM?: number;
      history?: any[];
      duration?: number;
      isGlassesUser?: boolean;
    };

    auditInfo.filename = validatedFile.name;
    auditInfo.fileSize = validatedFile.size;
    auditInfo.textLength = validatedText.length;

    try {
      const bytes = await validatedFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      tempPath = path.join(
        os.tmpdir(),
        `leitura-${Date.now()}-${validatedFile.name.replace(/\s+/g, "_")}`
      );
      await writeFile(tempPath, buffer);
    } catch (fsErr) {
      const error = fsErr instanceof Error ? fsErr : new Error(String(fsErr));
      const code = (error as NodeJS.ErrnoException).code;

      logDetailed({
        level: "error",
        message: `[${ENDPOINT}] Falha ao gravar arquivo temporário em disco.`,
        fileName: FILE_NAME,
        methodName,
        lineNumber: 260,
        userId: req.headers.get("x-user-id") || undefined,
        parameters: {
          filename: validatedFile.name,
          fileSize: validatedFile.size,
          tempPath: tempPath || null,
          tmpDir: os.tmpdir(),
        },
        extraData: {
          endpoint: ENDPOINT,
          httpStatusCode: code === "ENOENT" ? 500 : code === "ENOSPC" ? 413 : 500,
          syscall: (error as NodeJS.ErrnoException).syscall || "fs.writeFile",
          errnoCode: code,
          campo: "file",
          valorRecebido: `[File ${validatedFile.name} ${validatedFile.size} bytes]`,
        },
        errorName: error.name,
        errorMessage: error.message,
        stackTrace: error.stack,
      });

      const userMessage =
        code === "ENOENT"
          ? "Diretório temporário indisponível no servidor. Contate o suporte técnico."
          : code === "ENOSPC"
          ? "Espaço em disco insuficiente no servidor para receber o arquivo. Tente novamente mais tarde ou contate o suporte."
          : code === "EACCES"
          ? "Permissão negada ao gravar arquivo temporário no servidor. Contate o suporte técnico."
          : `Falha ao receber arquivo temporário (${code || error.name}). Contate o suporte se persistir.`;

      return NextResponse.json(
        {
          detail: userMessage,
          campo: "file",
          endpoint: ENDPOINT,
          arquivo: FILE_NAME,
          metodo: methodName,
          httpStatus: code === "ENOENT" ? 500 : code === "ENOSPC" ? 413 : 500,
          ...(IS_DEV
            ? { devStackTrace: error.stack, devErrnoCode: code }
            : {}),
        },
        { status: code === "ENOENT" ? 500 : code === "ENOSPC" ? 413 : 500 }
      );
    }

    const result = await processReadingAudio({
      filePath: tempPath,
      originalText: validatedText,
      filename: validatedFile.name,
      studentGrade: validatedGrade,
      targetPCM: validatedTarget,
      history: validatedHistory,
      duration: validatedDuration,
      isForeigner: validation.data.isForeigner,
      isGlassesUser: validation.data.isGlassesUser,
    });

    processingCompleted = true;

    logDetailed({
      level: "info",
      message: `[${ENDPOINT}] Processamento de áudio concluído com sucesso.`,
      fileName: FILE_NAME,
      methodName,
      lineNumber: 326,
      userId: req.headers.get("x-user-id") || undefined,
      parameters: {
        filename: validatedFile.name,
        fileSize: validatedFile.size,
        textLength: validatedText.length,
        durationMs: Date.now() - startTime,
      },
      extraData: {
        endpoint: ENDPOINT,
        httpStatusCode: 200,
        pcm: typeof (result as any)?.pcm === "number" ? (result as any).pcm : undefined,
        nivel: (result as any)?.nivel ?? undefined,
      },
    });

    return NextResponse.json(result);
  } catch (rawError) {
    const error =
      rawError instanceof Error ? rawError : new Error(String(rawError));

    let httpStatus = buildStatusFromMessage(error.message, 500);
    let campo: string | undefined = undefined;
    let valorRecebido: unknown = undefined;

    if (error instanceof DetailedError) {
      httpStatus = error.httpStatus ?? httpStatus;
      campo = error.fieldName ?? campo;
      valorRecebido = error.fieldValue ?? valorRecebido;
    }

    logDetailed({
      level: "error",
      message: `[${ENDPOINT}] Falha no processamento da requisição de áudio. ${error.message}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber: 365,
      userId: req.headers.get("x-user-id") || req.headers.get("authorization")?.slice(0, 40) || undefined,
      parameters: validatedPayloadForLog ?? { auditInfo },
      extraData: {
        endpoint: ENDPOINT,
        httpStatusCode: httpStatus,
        auditInfo,
        processingCompletedBeforeError: processingCompleted,
        tempPathCreated: !!tempPath,
        campo,
        valorRecebido,
      },
      errorName: error.name,
      errorMessage: error.message,
      stackTrace: error.stack,
    });

    const userMessage = formatErrorForUser(error, {
      operation: "processar áudio da avaliação de leitura",
      fileName: FILE_NAME,
      methodName,
      endpoint: ENDPOINT,
      httpStatus,
      campo,
      valorRecebido,
    });

    return NextResponse.json(
      {
        detail: userMessage,
        endpoint: ENDPOINT,
        arquivo: FILE_NAME,
        metodo: methodName,
        httpStatus,
        campo,
        ...(IS_DEV
          ? {
              devStackTrace: error.stack,
              devOriginalMessage: error.message,
              devErrorName: error.name,
            }
          : {}),
      },
      { status: httpStatus }
    );
  } finally {
    if (tempPath) {
      try {
        await unlink(tempPath);
        logDetailed({
          level: "debug",
          message: `[${ENDPOINT}] Arquivo temporário removido com sucesso.`,
          fileName: FILE_NAME,
          methodName: "POST handler/finally",
          lineNumber: 424,
          extraData: {
            tempPath,
            processingCompleted,
            endpoint: ENDPOINT,
          },
        });
      } catch (cleanupRaw) {
        const cleanupErr =
          cleanupRaw instanceof Error ? cleanupRaw : new Error(String(cleanupRaw));
        const code = (cleanupErr as NodeJS.ErrnoException).code;

        logDetailed({
          level: processingCompleted ? "warn" : "error",
          message: `[${ENDPOINT}] Falha ao remover arquivo temporário de áudio após processamento. ${processingCompleted ? "A resposta já foi enviada ao usuário, apenas arquivos temporários acumulados." : "A operação principal também falhou, cleanup secundário também falhou."}`,
          fileName: FILE_NAME,
          methodName: "POST handler/finally cleanup",
          lineNumber: 444,
          extraData: {
            tempPath,
            endpoint: ENDPOINT,
            processingCompleted,
            syscall: (cleanupErr as NodeJS.ErrnoException).syscall || "fs.unlink",
            errnoCode: code,
            totalDurationMs: Date.now() - startTime,
          },
          errorName: cleanupErr.name,
          errorMessage: cleanupErr.message,
          stackTrace: cleanupErr.stack,
        });
      }
    }
  }
}
