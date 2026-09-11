import { NextRequest, NextResponse } from 'next/server';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { processReadingAudio } from '@/lib/analysisService';
import { audioInputSchema, detectAudioContainer, MAX_AUDIO_BYTES } from '@/lib/audioInput';
import { adminServices } from '@/lib/server/firebaseAdmin';
import { authenticateAudioRequest, consumeAudioQuota, RequestError } from '@/lib/server/audioSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  let directory: string | undefined;
  try {
    const user = await authenticateAudioRequest(req.headers.get('authorization'));
    await consumeAudioQuota(user.uid);
    if (Number(req.headers.get('content-length')) > MAX_AUDIO_BYTES + 64 * 1024)
      throw new RequestError(413, 'Áudio muito grande (máximo 4 MB).');
    const reader = req.body?.getReader();
    if (!reader) throw new RequestError(400, 'Envie uma gravação.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AUDIO_BYTES + 64 * 1024) {
        await reader.cancel();
        throw new RequestError(413, 'Áudio muito grande (máximo 4 MB).');
      }
      chunks.push(value);
    }
    let form: FormData;
    try {
      form = await new Response(Buffer.concat(chunks), { headers: {
        'Content-Type': req.headers.get('content-type') || '',
      } }).formData();
    } catch { throw new RequestError(400, 'Formato de envio inválido.'); }
    const parsed = audioInputSchema.safeParse({
      alunoId: form.get('aluno_id'), textoId: form.get('texto_id'),
      isForeigner: form.get('is_foreigner') || undefined,
      isGlassesUser: form.get('is_glasses_user') || undefined,
    });
    if (!parsed.success) throw new RequestError(400, 'Confira o aluno e o texto selecionados.');
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) throw new RequestError(400, 'Envie uma gravação não vazia.');
    if (file.size > MAX_AUDIO_BYTES) throw new RequestError(413, 'Áudio muito grande (máximo 4 MB).');
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = detectAudioContainer(bytes);
    if (!extension) throw new RequestError(400, 'Formato de áudio não reconhecido. Grave novamente.');
    const { db } = adminServices();
    const [student, text] = await Promise.all([
      db.collection('alunos').doc(parsed.data.alunoId).get(),
      db.collection('textos').doc(parsed.data.textoId).get(),
    ]);
    if (!student.exists || (user.admin !== true && student.data()?.professorId !== user.uid))
      throw new RequestError(403, 'Você não tem acesso a este aluno.');
    if (!text.exists) throw new RequestError(404, 'Texto não encontrado.');
    const originalText = text.data()?.conteudo;
    if (typeof originalText !== 'string' || !originalText.trim() || originalText.length > 10_000)
      throw new RequestError(400, 'O texto precisa ter entre 1 e 10000 caracteres.');
    const historyQuery = await db.collection('avaliacoes').where('alunoId', '==', parsed.data.alunoId)
      .where('professorId', '==', student.data()?.professorId).orderBy('data', 'desc').limit(3).get();
    directory = await mkdtemp(join(tmpdir(), 'leitura-'));
    const filePath = join(directory, 'reading.' + extension);
    await writeFile(filePath, bytes);
    const result = await processReadingAudio({ filePath, filename: 'reading.' + extension, originalText,
      studentGrade: student.data()?.serie, targetPCM: student.data()?.metaPCM,
      history: historyQuery.docs.map(item => item.data()),
      isForeigner: parsed.data.isForeigner, isGlassesUser: parsed.data.isGlassesUser, userId: user.uid });
    return NextResponse.json({ ...result, requestId }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 502;
    console.error(JSON.stringify({ event: 'audio_failed', requestId, status,
      errorType: error instanceof Error ? error.name : 'UnknownError' }));
    return NextResponse.json({ detail: error instanceof RequestError ? error.message :
      'Não foi possível analisar a gravação. Tente novamente ou contate o suporte.', requestId },
      { status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) } });
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {
      console.error(JSON.stringify({ event: 'audio_cleanup_failed', requestId }));
    });
  }
}
