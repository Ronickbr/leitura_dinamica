import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { processReadingAudio } from "@/lib/analysisService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let tempPath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const originalText = formData.get("original_text") as string | null;

    if (!file) {
      return NextResponse.json(
        { detail: "Envie um arquivo de áudio no campo 'file'." },
        { status: 400 }
      );
    }

    if (!originalText) {
      return NextResponse.json(
        { detail: "O texto original é obrigatório." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    tempPath = `/tmp/leitura-${Date.now()}-${file.name}`;
    await writeFile(tempPath, buffer);

    console.log(
      `Processando áudio para texto: "${originalText.substring(0, 30)}..."`
    );

    const result = await processReadingAudio({
      filePath: tempPath,
      originalText,
      filename: file.name,
    });

    console.log("Processamento concluído com sucesso");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro no processamento:", error);

    const message =
      error instanceof Error ? error.message : "Erro interno no processamento do áudio.";

    const statusCode =
      message.includes("obrigatório") ||
      message.includes("inválido") ||
      message.includes("file must be one of")
        ? 400
        : 500;

    return NextResponse.json({ detail: message }, { status: statusCode });
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