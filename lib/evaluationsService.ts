import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  Firestore,
} from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import {
  logDetailed,
  formatFirebaseFirestoreError,
  tryExtractFirebaseErrorCode,
  DetailedError,
  IS_DEV,
} from './errorUtils';

let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
const FILE_NAME = 'evaluationsService.ts';
const ENDPOINT_PROCESS_AUDIO = '/api/process-audio';

function currentUid(): string | null {
  return cachedAuth?.currentUser?.uid ?? null;
}

function ensureReady(methodName: string): { db: Firestore; auth: Auth; uid: string } | null {
  const uid = currentUid();
  if (!cachedDb || !cachedAuth || !uid) {
    logDetailed({
      level: 'warn',
      message: 'Operação de avaliação bloqueada por ausência de sessão ou Firestore.',
      fileName: FILE_NAME,
      methodName,
    });
    return null;
  }
  return { db: cachedDb, auth: cachedAuth, uid };
}

function logFirestoreError(error: unknown, methodName: string, operation: string) {
  const code = tryExtractFirebaseErrorCode(error);
  const formatted = code ? formatFirebaseFirestoreError(code) : null;
  logDetailed({
    level: 'error',
    message: `Falha ao ${operation}.`,
    fileName: FILE_NAME,
    methodName,
    userId: currentUid() ?? undefined,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: error instanceof Error ? error.message : String(error),
    stackTrace: error instanceof Error ? error.stack : undefined,
    extraData: { firebaseErrorCode: code },
  });
  return formatted?.userMessage || 'Operação no banco de dados não concluída.';
}

export function setFirebaseInstances(dbInstance: Firestore, authInstance: Auth) {
  cachedDb = dbInstance;
  cachedAuth = authInstance;
}

export interface MetricasQualitativas {
  leitura_precisa: boolean;
  leitura_precisa_justificativa?: string;
  leitura_silabada: boolean;
  leitura_silabada_justificativa?: string;
  boa_entonacao: boolean;
  boa_entonacao_justificativa?: string;
  interpretacao: boolean;
  interpretacao_justificativa?: string;
  pontuacao: boolean;
  pontuacao_justificativa?: string;
}

export interface Avaliacao {
  id?: string;
  alunoId: string;
  textoId: string;
  pcm: number;
  precisao: number;
  erros?: number;
  transcricao: string;
  diagnosticoIA: string;
  intervencaoIA: string;
  transcricaoMarcada?: string;
  metricasQualitativas?: MetricasQualitativas;
  perguntasCompreensao?: Array<{ pergunta: string; resposta_esperada: string }>;
  data?: Timestamp | { seconds?: number; toDate?: () => Date } | null;
  professorId: string;
  words?: any[];
  fluencyMetrics?: any;
}

function minimizeHistory(history?: any[]): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(history) || history.length === 0) return undefined;
  return history.slice(-5).map((item) => ({
    pcm: typeof item?.pcm === 'number' ? item.pcm : undefined,
    precisao: typeof item?.precisao === 'number' ? item.precisao : undefined,
    erros: typeof item?.erros === 'number' ? item.erros : undefined,
    data: item?.data?.toDate && typeof item.data.toDate === 'function'
      ? item.data.toDate().toISOString().slice(0, 10)
      : typeof item?.data === 'string'
        ? item.data.slice(0, 10)
        : undefined,
  }));
}

export const processAudio = async (
  audioBlob: Blob,
  originalText: string,
  studentGrade?: string,
  targetPCM?: number,
  history?: any[],
  duration?: number,
  _isForeigner?: boolean,
  _isGlassesUser?: boolean,
) => {
  const methodName = 'processAudio';
  const ready = ensureReady(methodName);
  if (!ready) throw new DetailedError({ userMessage: 'Sessão inválida. Faça login novamente.', httpCode: 401 });
  if (!audioBlob || !(audioBlob instanceof Blob) || audioBlob.size === 0) {
    throw new DetailedError({ userMessage: 'Nenhum arquivo de áudio válido foi recebido.', httpCode: 400 });
  }
  if (!originalText?.trim()) {
    throw new DetailedError({ userMessage: 'O texto original é obrigatório.', httpCode: 400 });
  }

  const token = await ready.auth.currentUser!.getIdToken(true);
  const formData = new FormData();
  formData.append('file', audioBlob, 'reading.webm');
  formData.append('original_text', originalText);
  if (studentGrade) formData.append('student_grade', studentGrade.slice(0, 40));
  if (targetPCM !== undefined) formData.append('target_pcm', String(targetPCM));
  const safeHistory = minimizeHistory(history);
  if (safeHistory) formData.append('history', JSON.stringify(safeHistory));
  if (duration !== undefined) formData.append('duration', String(duration));

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(ENDPOINT_PROCESS_AUDIO, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch (error) {
    logDetailed({
      level: 'error',
      message: 'Falha de rede no processamento de áudio.',
      fileName: FILE_NAME,
      methodName,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      userId: ready.uid,
      errorName: error instanceof Error ? error.name : 'NetworkError',
      errorMessage: error instanceof Error ? error.message : String(error),
      extraData: { durationMs: Date.now() - startedAt, audioSizeBytes: audioBlob.size },
    });
    throw new DetailedError({ userMessage: 'Falha de conexão durante o processamento do áudio.', httpCode: 0 }, error);
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // Resposta inválida é tratada abaixo sem registrar corpo bruto.
  }

  if (!response.ok) {
    const requestId = typeof payload?.requestId === 'string' ? payload.requestId : undefined;
    logDetailed({
      level: 'error',
      message: 'Endpoint de áudio retornou erro.',
      fileName: FILE_NAME,
      methodName,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      userId: ready.uid,
      httpStatusCode: response.status,
      extraData: { requestId, durationMs: Date.now() - startedAt },
    });
    throw new DetailedError({
      userMessage: typeof payload?.detail === 'string' ? payload.detail : 'Não foi possível processar o áudio.',
      httpCode: response.status,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      extraData: { requestId },
    });
  }

  if (!payload) {
    throw new DetailedError({ userMessage: 'Resposta inválida do serviço de processamento.', httpCode: 502 });
  }
  return payload;
};

export const saveAvaliacao = async (
  avaliacao: Omit<Avaliacao, 'id' | 'professorId'>
): Promise<string | null> => {
  const ready = ensureReady('saveAvaliacao');
  if (!ready || !avaliacao?.alunoId?.trim() || !avaliacao?.textoId?.trim()) return null;

  try {
    const docRef = await addDoc(collection(ready.db, 'avaliacoes'), {
      ...avaliacao,
      professorId: ready.uid,
      data: avaliacao.data || Timestamp.now(),
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    const message = logFirestoreError(error, 'saveAvaliacao', 'salvar avaliação');
    if (IS_DEV) throw new DetailedError({ userMessage: message, fileName: FILE_NAME, methodName: 'saveAvaliacao' }, error);
    return null;
  }
};

export const getAvaliacoesPorAluno = async (alunoId: string): Promise<Avaliacao[]> => {
  const ready = ensureReady('getAvaliacoesPorAluno');
  if (!ready || !alunoId?.trim()) return [];
  try {
    const snapshot = await getDocs(query(
      collection(ready.db, 'avaliacoes'),
      where('professorId', '==', ready.uid),
      where('alunoId', '==', alunoId),
    ));
    return snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() } as Avaliacao))
      .sort((a, b) => Number((b.data as any)?.seconds || 0) - Number((a.data as any)?.seconds || 0));
  } catch (error) {
    logFirestoreError(error, 'getAvaliacoesPorAluno', 'buscar avaliações do aluno');
    if (IS_DEV) throw error;
    return [];
  }
};

export const getAllAvaliacoes = async (): Promise<Avaliacao[]> => {
  const ready = ensureReady('getAllAvaliacoes');
  if (!ready) return [];
  try {
    const snapshot = await getDocs(query(
      collection(ready.db, 'avaliacoes'),
      where('professorId', '==', ready.uid),
    ));
    return snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() } as Avaliacao))
      .sort((a, b) => Number((b.data as any)?.seconds || 0) - Number((a.data as any)?.seconds || 0));
  } catch (error) {
    logFirestoreError(error, 'getAllAvaliacoes', 'buscar avaliações do professor');
    if (IS_DEV) throw error;
    return [];
  }
};

export const getAvaliacaoById = async (id: string): Promise<Avaliacao | null> => {
  const ready = ensureReady('getAvaliacaoById');
  if (!ready || !id?.trim()) return null;
  try {
    const snapshot = await getDoc(doc(ready.db, 'avaliacoes', id));
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Avaliacao;
    if (data.professorId !== ready.uid) return null;
    return { id: snapshot.id, ...data };
  } catch (error) {
    logFirestoreError(error, 'getAvaliacaoById', 'buscar avaliação');
    if (IS_DEV) throw error;
    return null;
  }
};
