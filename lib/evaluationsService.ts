import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  Timestamp,
  doc,
  getDoc,
  Firestore
} from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import {
  logDetailed,
  formatFirebaseFirestoreError,
  tryExtractFirebaseErrorCode,
  DetailedError,
  IS_DEV,
  formatErrorForUser
} from './errorUtils';

let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

const FILE_NAME = 'evaluationsService.ts';
const ENDPOINT_PROCESS_AUDIO = '/api/process-audio';

const getCurrentUserId = (): string | null => cachedAuth?.currentUser?.uid ?? null;

const ensureFirebaseReady = (context: { requireAuth?: boolean; methodName: string; lineNumber: number; parameters?: Record<string, unknown> }): boolean => {
  if (!cachedDb) {
    const err = new DetailedError({
      userMessage: `Firebase/Firestore não inicializado antes de chamar ${context.methodName}. Aguarde o carregamento completo.`,
      fileName: FILE_NAME,
      methodName: context.methodName,
      lineNumber: context.lineNumber,
      extraData: {
        checkList: [
          'Verifique se FirebaseProvider está envolvendo a página',
          'Confirme variáveis NEXT_PUBLIC_FIREBASE_*',
          'Recarregue a página'
        ]
      }
    });
    logDetailed({
      level: 'warn',
      message: `${context.methodName} chamado sem Firestore inicializado`,
      fileName: FILE_NAME,
      methodName: context.methodName,
      lineNumber: context.lineNumber,
      parameters: context.parameters,
      userId: getCurrentUserId() ?? undefined,
      errorName: err.name,
      errorMessage: err.message
    });
    if (IS_DEV) throw err;
    return false;
  }
  if (context.requireAuth && !cachedAuth?.currentUser) {
    const err = new DetailedError({
      userMessage: `Usuário não autenticado. É necessário login para executar ${context.methodName}.`,
      fileName: FILE_NAME,
      methodName: context.methodName,
      lineNumber: context.lineNumber,
      httpCode: 401
    });
    logDetailed({
      level: 'warn',
      message: `${context.methodName} chamado sem usuário autenticado`,
      fileName: FILE_NAME,
      methodName: context.methodName,
      lineNumber: context.lineNumber,
      parameters: context.parameters,
      errorName: err.name,
      errorMessage: err.message
    });
    if (IS_DEV) throw err;
    return false;
  }
  return true;
};

const logFirestoreError = (error: unknown, context: { methodName: string; lineNumber: number; parameters?: Record<string, unknown>; operation: string; collection: string }) => {
  const fbCode = tryExtractFirebaseErrorCode(error);
  const formatted = fbCode ? formatFirebaseFirestoreError(fbCode) : null;
  const originalName = error instanceof Error ? error.name : 'UnknownError';
  const originalMessage = error instanceof Error ? error.message : String(error);
  const originalStack = error instanceof Error ? error.stack : undefined;

  logDetailed({
    level: 'error',
    message: `Erro ao ${context.operation} em ${context.collection}: ${formatted?.userMessage || originalMessage}`,
    fileName: FILE_NAME,
    methodName: context.methodName,
    lineNumber: context.lineNumber,
    parameters: context.parameters,
    userId: getCurrentUserId() ?? undefined,
    errorName: originalName,
    errorMessage: originalMessage,
    stackTrace: originalStack,
    extraData: {
      firebaseErrorCode: fbCode,
      firestoreCollection: context.collection,
      operation: context.operation,
      campo: formatted?.fieldName
    }
  });

  return { fbCode, formatted, originalName, originalMessage };
};

export function setFirebaseInstances(dbInstance: Firestore, authInstance: Auth) {
  cachedDb = dbInstance;
  cachedAuth = authInstance;
  logDetailed({
    level: 'info',
    message: 'Instâncias Firebase (Firestore + Auth) injetadas no evaluationsService',
    fileName: FILE_NAME,
    methodName: 'setFirebaseInstances',
    extraData: { hasDb: !!dbInstance, hasAuth: !!authInstance, hasCurrentUser: !!authInstance?.currentUser }
  });
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
}

export const processAudio = async (
  audioBlob: Blob,
  originalText: string,
  studentGrade?: string,
  targetPCM?: number,
  history?: any[],
  duration?: number,
  isForeigner?: boolean,
  isGlassesUser?: boolean
) => {
  const methodName = 'processAudio';
  const lineNumber = 156;
  const parameters = {
    audioSizeBytes: audioBlob?.size ?? 0,
    audioType: audioBlob?.type ?? '(desconhecido)',
    originalTextLength: originalText?.length ?? 0,
    studentGrade: studentGrade ?? '(sem série)',
    targetPCM: targetPCM ?? '(sem meta)',
    historyLength: history?.length ?? 0,
    durationSec: duration ?? '(desconhecida)',
    isForeigner: !!isForeigner,
    isGlassesUser: !!isGlassesUser
  };

  const user = cachedAuth?.currentUser;
  const userId = user?.uid;

  logDetailed({
    level: 'info',
    message: `Iniciando processamento de áudio via ${ENDPOINT_PROCESS_AUDIO}`,
    fileName: FILE_NAME,
    methodName,
    lineNumber,
    userId: userId ?? undefined,
    endpoint: ENDPOINT_PROCESS_AUDIO,
    parameters
  });

  if (!audioBlob || !(audioBlob instanceof Blob) || audioBlob.size === 0) {
    const err = new DetailedError({
      userMessage: 'Falha no processamento do áudio. Campo: Arquivo de Áudio. Motivo: Nenhum arquivo de áudio foi recebido ou o arquivo está vazio.',
      fieldName: 'Arquivo de Áudio',
      fieldValue: audioBlob ? `(Blob size=${audioBlob.size} type=${audioBlob.type})` : '(nulo/undefined)',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      httpCode: 400,
      userId
    });
    logDetailed({ level: 'warn', message: 'processAudio chamado sem audioBlob válido', fileName: FILE_NAME, methodName, lineNumber, userId: userId ?? undefined, endpoint: ENDPOINT_PROCESS_AUDIO, parameters, errorName: err.name, errorMessage: err.message });
    throw err;
  }

  if (!originalText || !originalText.trim()) {
    const err = new DetailedError({
      userMessage: 'Falha no processamento do áudio. Campo: Texto Original. Motivo: O texto original é obrigatório para o processamento e não foi informado.',
      fieldName: 'Texto Original',
      fieldValue: originalText ?? '(vazio)',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      httpCode: 400,
      userId
    });
    logDetailed({ level: 'warn', message: 'processAudio chamado sem texto original válido', fileName: FILE_NAME, methodName, lineNumber, userId: userId ?? undefined, endpoint: ENDPOINT_PROCESS_AUDIO, parameters, errorName: err.name, errorMessage: err.message });
    throw err;
  }

  const token = user ? await user.getIdToken().catch((e) => {
    logDetailed({ level: 'warn', message: `Falha ao obter token de autenticação para processAudio: ${e instanceof Error ? e.message : String(e)}`, fileName: FILE_NAME, methodName, lineNumber, userId: userId ?? undefined, errorName: e instanceof Error ? e.name : 'UnknownError', errorMessage: e instanceof Error ? e.message : String(e) });
    return null;
  }) : null;

  const formData = new FormData();
  formData.append('file', audioBlob, 'reading.webm');
  formData.append('original_text', originalText);
  if (studentGrade) formData.append('student_grade', studentGrade);
  if (targetPCM) formData.append('target_pcm', targetPCM.toString());
  if (history) formData.append('history', JSON.stringify(history));
  if (duration) formData.append('duration', duration.toString());
  if (isForeigner) formData.append('is_foreigner', 'true');
  if (isGlassesUser) formData.append('is_glasses_user', 'true');

  let response: Response;
  const startTime = Date.now();
  try {
    response = await fetch(ENDPOINT_PROCESS_AUDIO, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: formData
    });
  } catch (networkError: unknown) {
    const originalName = networkError instanceof Error ? networkError.name : 'UnknownError';
    const originalMessage = networkError instanceof Error ? networkError.message : String(networkError);
    const originalStack = networkError instanceof Error ? networkError.stack : undefined;

    const isTimeout = originalMessage.toLowerCase().includes('timeout') || originalMessage.toLowerCase().includes('abort');
    const isNetwork = originalMessage.toLowerCase().includes('network') || originalMessage.toLowerCase().includes('fetch') || originalMessage.toLowerCase().includes('failed to fetch');

    logDetailed({
      level: 'error',
      message: `Falha de rede ao chamar ${ENDPOINT_PROCESS_AUDIO}: ${originalMessage}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      httpCode: 0,
      userId: userId ?? undefined,
      parameters,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: originalStack,
      extraData: { duracaoMs: Date.now() - startTime, categoria: isTimeout ? 'TIMEOUT' : isNetwork ? 'NETWORK' : 'DESCONHECIDO' }
    });

    throw new DetailedError({
      userMessage: isTimeout
        ? `Falha no processamento do áudio. Tempo limite de resposta excedido ao chamar ${ENDPOINT_PROCESS_AUDIO}. Verifique sua conexão e tente novamente.`
        : isNetwork
          ? `Falha de conexão ao chamar ${ENDPOINT_PROCESS_AUDIO}. Verifique sua internet e tente novamente.`
          : `Falha ao comunicar com o servidor de processamento de áudio: ${originalMessage}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      httpCode: 0,
      userId,
      extraData: { duracaoMs: Date.now() - startTime }
    }, networkError);
  }

  const duracaoMs = Date.now() - startTime;

  if (!response.ok) {
    let errorDetail: any = {};
    try {
      errorDetail = await response.json();
    } catch (parseError: unknown) {
      logDetailed({
        level: 'warn',
        message: `Não foi possível fazer parse do JSON de erro do response (HTTP ${response.status}). Resposta pode não ser JSON.`,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        endpoint: ENDPOINT_PROCESS_AUDIO,
        httpCode: response.status,
        userId: userId ?? undefined,
        errorName: parseError instanceof Error ? parseError.name : 'UnknownError',
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
        extraData: { responseStatus: response.status, responseStatusText: response.statusText, duracaoMs }
      });
    }

    const detailMsg = typeof errorDetail?.detail === 'string' ? errorDetail.detail : JSON.stringify(errorDetail).substring(0, 500);
    const detailLower = detailMsg.toLowerCase();

    const isOpenAIQuotaError =
      response.status === 429 &&
      (detailLower.includes('insufficient_quota') ||
       detailLower.includes('no credits remaining') ||
       detailLower.includes('you have no credits remaining') ||
       detailLower.includes('billing quota') ||
       detailLower.includes('add credits') ||
       detailLower.includes('exceeded your current quota'));

    const userDetailMsg = isOpenAIQuotaError
      ? 'A API da OpenAI está sem créditos disponíveis. Adicione créditos no painel de cobrança da OpenAI e tente novamente.'
      : detailMsg;

    logDetailed({
      level: 'error',
      message: `Endpoint ${ENDPOINT_PROCESS_AUDIO} retornou HTTP ${response.status} ${response.statusText}. Detalhe: ${detailMsg || '(sem detalhe)'}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      httpCode: response.status,
      userId: userId ?? undefined,
      parameters,
      extraData: { responseStatus: response.status, responseStatusText: response.statusText, duracaoMs, corpoErro: errorDetail }
    });

    throw new DetailedError({
      userMessage: userDetailMsg
        ? `Falha no processamento do áudio.\nMotivo: ${userDetailMsg}\nCódigo HTTP: ${response.status}`
        : `Falha no processamento do áudio.\nO servidor retornou o código HTTP ${response.status} (${response.statusText}). Verifique o arquivo de áudio e tente novamente.`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      httpCode: response.status,
      userId,
      extraData: { responseStatus: response.status, duracaoMs, isOpenAIQuotaError }
    });
  }

  try {
    const result = await response.json();
    logDetailed({
      level: 'info',
      message: `Processamento de áudio concluído com sucesso (HTTP ${response.status}) em ${duracaoMs}ms. PCM=${result?.pcm ?? '?'} | Precisão=${result?.precisao ?? '?'}%`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      httpCode: response.status,
      userId: userId ?? undefined,
      extraData: {
        duracaoMs,
        pcmRetornado: result?.pcm,
        precisaoRetornada: result?.precisao,
        temDiagnostico: !!result?.diagnosticoIA,
        temTranscricao: !!result?.transcricao,
        temMarcacao: !!result?.transcricaoMarcada
      }
    });
    return result;
  } catch (parseError: unknown) {
    const originalName = parseError instanceof Error ? parseError.name : 'UnknownError';
    const originalMessage = parseError instanceof Error ? parseError.message : String(parseError);
    const originalStack = parseError instanceof Error ? parseError.stack : undefined;

    logDetailed({
      level: 'error',
      message: `Falha ao fazer parse da resposta JSON do processamento de áudio (HTTP ${response.status}): ${originalMessage}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      httpCode: response.status,
      userId: userId ?? undefined,
      parameters,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: originalStack,
      extraData: { responseStatus: response.status, duracaoMs }
    });

    throw new DetailedError({
      userMessage: `Falha ao interpretar a resposta do servidor de processamento.\nMotivo: ${originalMessage}\nEndpoint: ${ENDPOINT_PROCESS_AUDIO}\nCódigo HTTP: ${response.status}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      endpoint: ENDPOINT_PROCESS_AUDIO,
      httpCode: response.status,
      userId
    }, parseError);
  }
};

export const saveAvaliacao = async (avaliacao: Omit<Avaliacao, 'id' | 'professorId'>): Promise<string | null> => {
  const methodName = 'saveAvaliacao';
  const lineNumber = 353;
  const parameters = {
    alunoId: avaliacao?.alunoId ?? '(vazio)',
    textoId: avaliacao?.textoId ?? '(vazio)',
    pcm: avaliacao?.pcm ?? 0,
    precisao: avaliacao?.precisao ?? 0,
    erros: avaliacao?.erros ?? 0,
    transcricaoLength: avaliacao?.transcricao?.length ?? 0,
    temDiagnostico: !!avaliacao?.diagnosticoIA,
    temIntervencao: !!avaliacao?.intervencaoIA
  };

  if (!ensureFirebaseReady({ methodName, lineNumber, parameters, requireAuth: true })) return null;

  if (!avaliacao) {
    const err = new DetailedError({ userMessage: 'Falha ao salvar avaliação: nenhum dado de avaliação foi informado.', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'saveAvaliacao chamado com objeto nulo', fileName: FILE_NAME, methodName, lineNumber, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }
  if (!avaliacao.alunoId || !avaliacao.alunoId.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao salvar avaliação. Campo: alunoId. Motivo: O identificador do aluno é obrigatório.', fieldName: 'Aluno ID', fieldValue: avaliacao.alunoId ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'Validação saveAvaliacao: alunoId vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }
  if (!avaliacao.textoId || !avaliacao.textoId.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao salvar avaliação. Campo: textoId. Motivo: O identificador do texto é obrigatório.', fieldName: 'Texto ID', fieldValue: avaliacao.textoId ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'Validação saveAvaliacao: textoId vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }

  try {
    const currentUser = cachedAuth!.currentUser!;
    logDetailed({ level: 'info', message: `Salvando avaliação: Aluno=${avaliacao.alunoId.substring(0, 8)}... | Texto=${avaliacao.textoId.substring(0, 8)}... | PCM=${avaliacao.pcm}`, fileName: FILE_NAME, methodName, lineNumber, userId: currentUser.uid, parameters });

    const docRef = await addDoc(collection(cachedDb!, 'avaliacoes'), {
      ...avaliacao,
      professorId: currentUser.uid,
      data: avaliacao.data || Timestamp.now()
    });

    logDetailed({ level: 'info', message: `Avaliação salva. Novo ID: ${docRef.id.substring(0, 8)}...`, fileName: FILE_NAME, methodName, lineNumber, userId: currentUser.uid, extraData: { avaliacaoId: docRef.id } });
    return docRef.id;
  } catch (error) {
    const info = logFirestoreError(error, { methodName, lineNumber, parameters, operation: 'salvar avaliação', collection: 'avaliacoes' });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao salvar avaliação. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        userId: getCurrentUserId() ?? undefined,
        extraData: { firebaseErrorCode: info.fbCode }
      }, error);
    }
    return null;
  }
};

export const getAvaliacoesPorAluno = async (alunoId: string): Promise<Avaliacao[]> => {
  const methodName = 'getAvaliacoesPorAluno';
  const lineNumber = 430;
  const parameters = { alunoId: alunoId ?? '(vazio)' };

  if (!ensureFirebaseReady({ methodName, lineNumber, parameters })) return [];

  if (!alunoId || !alunoId.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao buscar avaliações do aluno. Campo: alunoId. Motivo: Não informado.', fieldName: 'Aluno ID', fieldValue: alunoId ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'getAvaliacoesPorAluno com alunoId vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return [];
  }

  try {
    logDetailed({ level: 'info', message: `Buscando avaliações do aluno id=${alunoId.substring(0, 8)}...`, fileName: FILE_NAME, methodName, lineNumber, userId: getCurrentUserId() ?? undefined, parameters });

    const q = query(collection(cachedDb!, 'avaliacoes'), where('alunoId', '==', alunoId));
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Avaliacao)).sort((a, b) => {
      const dateA = (a.data as any)?.seconds || 0;
      const dateB = (b.data as any)?.seconds || 0;
      return dateB - dateA;
    });

    logDetailed({ level: 'debug', message: `${results.length} avaliação(ões) encontrada(s) para o aluno.`, fileName: FILE_NAME, methodName, lineNumber, userId: getCurrentUserId() ?? undefined, extraData: { totalAvaliacoes: results.length, alunoId } });
    return results;
  } catch (error) {
    const info = logFirestoreError(error, { methodName, lineNumber, parameters, operation: `buscar avaliações do aluno ${alunoId?.substring(0, 8)}`, collection: 'avaliacoes' });
    if (IS_DEV) {
      throw new DetailedError({ userMessage: `Falha ao buscar avaliações do aluno. ${info.formatted?.userMessage || info.originalMessage}`, fieldName: info.formatted?.fieldName || 'Aluno ID', fieldValue: alunoId, fileName: FILE_NAME, methodName, lineNumber, extraData: { firebaseErrorCode: info.fbCode } }, error);
    }
    return [];
  }
};

export const getAllAvaliacoes = async (): Promise<Avaliacao[]> => {
  const methodName = 'getAllAvaliacoes';
  const lineNumber = 485;

  if (!ensureFirebaseReady({ methodName, lineNumber })) return [];

  try {
    logDetailed({ level: 'info', message: 'Buscando TODAS as avaliações (lista geral)', fileName: FILE_NAME, methodName, lineNumber, userId: getCurrentUserId() ?? undefined });
    const q = query(collection(cachedDb!, 'avaliacoes'));
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Avaliacao)).sort((a, b) => {
      const dateA = (a.data as any)?.seconds || 0;
      const dateB = (b.data as any)?.seconds || 0;
      return dateB - dateA;
    });
    logDetailed({ level: 'debug', message: `Busca geral concluída: ${results.length} avaliação(ões).`, fileName: FILE_NAME, methodName, lineNumber, extraData: { totalAvaliacoes: results.length } });
    return results;
  } catch (error) {
    const info = logFirestoreError(error, { methodName, lineNumber, operation: 'buscar todas as avaliações', collection: 'avaliacoes' });
    if (IS_DEV) {
      throw new DetailedError({ userMessage: `Falha ao buscar avaliações. ${info.formatted?.userMessage || info.originalMessage}`, fieldName: info.formatted?.fieldName, fileName: FILE_NAME, methodName, lineNumber, extraData: { firebaseErrorCode: info.fbCode } }, error);
    }
    return [];
  }
};

export const getAvaliacaoById = async (id: string): Promise<Avaliacao | null> => {
  const methodName = 'getAvaliacaoById';
  const lineNumber = 524;
  const parameters = { avaliacaoId: id ?? '(vazio)' };

  if (!ensureFirebaseReady({ methodName, lineNumber, parameters })) return null;

  if (!id || !id.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao buscar avaliação. Campo: Avaliação ID. Motivo: O identificador da avaliação é obrigatório e não foi informado.', fieldName: 'Avaliação ID', fieldValue: id ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'getAvaliacaoById com id vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }

  try {
    logDetailed({ level: 'debug', message: `Buscando avaliação por ID: ${id.substring(0, 8)}...`, fileName: FILE_NAME, methodName, lineNumber, userId: getCurrentUserId() ?? undefined, parameters });

    const docRef = doc(cachedDb!, 'avaliacoes', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      logDetailed({ level: 'debug', message: `Avaliação encontrada (id=${id.substring(0, 8)}...)`, fileName: FILE_NAME, methodName, lineNumber, extraData: { avaliacaoId: id } });
      return { id: docSnap.id, ...docSnap.data() } as Avaliacao;
    }
    logDetailed({ level: 'warn', message: `Avaliação não encontrada no Firestore (id=${id.substring(0, 8)}...)`, fileName: FILE_NAME, methodName, lineNumber, extraData: { avaliacaoId: id } });
    return null;
  } catch (error) {
    const info = logFirestoreError(error, { methodName, lineNumber, parameters, operation: `buscar avaliação por ID=${id?.substring(0, 8)}`, collection: 'avaliacoes' });
    if (IS_DEV) {
      throw new DetailedError({ userMessage: `Falha ao buscar avaliação por ID. ${info.formatted?.userMessage || info.originalMessage}`, fieldName: info.formatted?.fieldName || 'Avaliação ID', fieldValue: id, fileName: FILE_NAME, methodName, lineNumber, extraData: { firebaseErrorCode: info.fbCode } }, error);
    }
    return null;
  }
};