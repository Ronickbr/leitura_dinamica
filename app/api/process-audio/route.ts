import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import os from "os";
import path from "path";
import { processReadingAudio } from "@/lib/analysisService";

import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = ["audio/webm", "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/x-m4a", "audio/m4a", "application/octet-stream"];

const uploadSchema = z.object({
  file: z.any()
    .refine((file) => file instanceof File, "O campo 'file' deve ser um arquivo.")
    .refine((file) => file?.size <= MAX_FILE_SIZE, "Arquivo muito grande (máximo 10MB).")
    .refine((file) => ALLOWED_MIME.includes(file?.type) || file?.name.endsWith('.webm') || file?.name.endsWith('.mp3') || file?.name.endsWith('.m4a'), "Tipo de arquivo inválido. Use webm, mp3, wav ou m4a."),
  originalText: z.string().min(1, "O texto original é obrigatório.").max(10000, "O texto original excede o limite de 10000 caracteres."),
  studentGrade: z.string().optional(),
  targetPCM: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  history: z.string().optional().transform(v => v ? JSON.parse(v) : undefined),
});

export async function POST(req: NextRequest) {
  let tempPath: string | null = null;
  const startTime = Date.now();
  let auditInfo = {
    type: "AUDIT_LOG_AUDIO_PROCESS",
    filename: "unknown",
    fileSize: 0,
    textLength: 0,
  };

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const originalText = formData.get("original_text");
    const studentGrade = formData.get("student_grade");
    const targetPCM = formData.get("target_pcm");
    const history = formData.get("history");

    // Validação com Zod
    const validation = uploadSchema.safeParse({
      file,
      originalText,
      studentGrade: studentGrade || undefined,
      targetPCM: targetPCM || undefined,
      history: history || undefined
    });

    if (!validation.success) {
      const errorMsg = validation.error.issues[0].message;
      return NextResponse.json({ detail: errorMsg }, { status: 400 });
    }

    const {
      file: validatedFile,
      originalText: validatedText,
      studentGrade: validatedGrade,
      targetPCM: validatedTarget,
      history: validatedHistory
    } = validation.data as {
      file: File,
      originalText: string,
      studentGrade?: string,
      targetPCM?: number,
      history?: any[]
    };

    auditInfo.filename = validatedFile.name;
    auditInfo.fileSize = validatedFile.size;
    auditInfo.textLength = validatedText.length;

    const bytes = await validatedFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    tempPath = path.join(os.tmpdir(), `leitura-${Date.now()}-${validatedFile.name.replace(/\s+/g, "_")}`);
    await writeFile(tempPath, buffer);

    console.log(
      `Processando áudio para texto: "${validatedText.substring(0, 30)}..."`
    );

    const result = await processReadingAudio({
      filePath: tempPath,
      originalText: validatedText,
      filename: validatedFile.name,
      studentGrade: validatedGrade,
      targetPCM: validatedTarget,
      history: validatedHistory,
    });

    console.log(JSON.stringify({
      ...auditInfo,
      status: "SUCCESS",
      durationMs: Date.now() - startTime,
    }));

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";

    console.error(JSON.stringify({
      ...auditInfo,
      status: "FAILED",
      error: message,
      durationMs: Date.now() - startTime,
    }));

    return NextResponse.json(
      { detail: message },
      { status: message.includes("obrigatório") || message.includes("inválido") || message.includes("grande") ? 400 : 500 }
    );
  } finally {
    if (tempPath) {
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}