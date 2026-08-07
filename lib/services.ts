import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  Firestore,
  FirestoreError
} from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import {
  logDetailed,
  formatFirebaseFirestoreError,
  tryExtractFirebaseErrorCode,
  DetailedError,
  IS_DEV
} from './errorUtils';

let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

const FILE_NAME = 'services.ts';

const getCurrentUserId = (): string | null => {
  return cachedAuth?.currentUser?.uid ?? null;
};

const ensureFirebaseReady = (context: { requireAuth?: boolean; methodName: string; lineNumber: number; parameters?: Record<string, unknown> }): { ok: boolean; error?: DetailedError } => {
  if (!cachedDb) {
    const err = new DetailedError({
      userMessage: `Firebase/Firestore não foi inicializado antes de chamar ${context.methodName}. Aguarde o carregamento completo da página e tente novamente.`,
      fileName: FILE_NAME,
      methodName: context.methodName,
      lineNumber: context.lineNumber,
      extraData: {
        checkList: [
          'Verifique se FirebaseProvider está envolvendo a página/layout',
          'Confirme se as variáveis NEXT_PUBLIC_FIREBASE_* estão definidas',
          'Recarregue a página para forçar nova inicialização'
        ]
      }
    });
    logDetailed({
      level: 'warn',
      message: `${context.methodName} chamado antes da inicialização do Firestore`,
      fileName: FILE_NAME,
      methodName: context.methodName,
      lineNumber: context.lineNumber,
      parameters: context.parameters,
      userId: getCurrentUserId() ?? undefined,
      errorName: err.name,
      errorMessage: err.message
    });
    return { ok: false, error: err };
  }
  if (context.requireAuth && !cachedAuth?.currentUser) {
    const err = new DetailedError({
      userMessage: `Usuário não autenticado. É necessário fazer login para executar ${context.methodName}.`,
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
    return { ok: false, error: err };
  }
  return { ok: true };
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
  const methodName = 'setFirebaseInstances';
  cachedDb = dbInstance;
  cachedAuth = authInstance;
  logDetailed({
    level: 'info',
    message: 'Instâncias Firebase (Firestore + Auth) injetadas nos serviços',
    fileName: FILE_NAME,
    methodName,
    extraData: {
      hasDb: !!dbInstance,
      hasAuth: !!authInstance,
      hasCurrentUser: !!authInstance?.currentUser
    }
  });
}

export interface Aluno {
  id: string;
  nome: string;
  turma: string;
  serie: string;
  turno?: string;
  diagnostico?: string;
  observacoes?: string;
  professorId?: string;
  anoLetivo: string;
  metaPCM?: number;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  successCount: number;
  errorCount: number;
  importedAt: Timestamp;
  professorId: string;
}

export interface AlunoFilterOptions {
  turmas: string[];
  series: string[];
  turnos: string[];
  diagnosticos: string[];
  totalRegistros: number;
}

export const getAlunos = async (turma?: string): Promise<Aluno[]> => {
  const methodName = 'getAlunos';
  const lineNumber = 174;
  const parameters = { turma: turma ?? '(todas)' };

  const ready = ensureFirebaseReady({ methodName, lineNumber, parameters });
  if (!ready.ok) return [];

  try {
    logDetailed({
      level: 'info',
      message: `Buscando lista de alunos${turma && turma !== 'Todas' ? ` filtrados por turma="${turma}"` : ''}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters,
      userId: getCurrentUserId() ?? undefined
    });

    let q = query(collection(cachedDb!, 'alunos'));
    if (turma && turma !== 'Todas') {
      q = query(q, where('turma', '==', turma));
    }

    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Aluno));

    logDetailed({
      level: 'debug',
      message: `Busca de alunos concluída. ${results.length} registro(s) encontrados.`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters,
      userId: getCurrentUserId() ?? undefined,
      extraData: { totalEncontrados: results.length, filtradoPorTurma: !!(turma && turma !== 'Todas') }
    });

    return results.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  } catch (error) {
    const info = logFirestoreError(error, {
      methodName, lineNumber, parameters,
      operation: 'buscar alunos',
      collection: 'alunos'
    });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao buscar alunos. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        extraData: { firebaseErrorCode: info.fbCode }
      }, error);
    }
    return [];
  }
};

export const getAlunoFilterOptions = async (): Promise<AlunoFilterOptions> => {
  const methodName = 'getAlunoFilterOptions';
  const lineNumber = 229;
  const emptyResult: AlunoFilterOptions = {
    turmas: [],
    series: [],
    turnos: [],
    diagnosticos: [],
    totalRegistros: 0
  };

  const ready = ensureFirebaseReady({ methodName, lineNumber });
  if (!ready.ok) return emptyResult;

  try {
    logDetailed({
      level: 'debug',
      message: 'Buscando opções de filtro (turmas, séries, turnos, diagnósticos)',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: getCurrentUserId() ?? undefined
    });

    const querySnapshot = await getDocs(query(collection(cachedDb!, 'alunos')));

    if (querySnapshot.empty) {
      logDetailed({
        level: 'debug',
        message: 'Nenhum aluno cadastrado; retornando filtros vazios.',
        fileName: FILE_NAME,
        methodName,
        lineNumber
      });
      return emptyResult;
    }

    const turmas = new Set<string>();
    const series = new Set<string>();
    const turnos = new Set<string>();
    const diagnosticos = new Set<string>();

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as Partial<Aluno>;
      const turma = data.turma?.trim();
      const serie = data.serie?.trim();
      const turno = data.turno?.trim();
      const diagnostico = data.diagnostico?.trim();
      if (turma) turmas.add(turma);
      if (serie) series.add(serie);
      if (turno) turnos.add(turno);
      if (diagnostico) diagnosticos.add(diagnostico);
    });

    const sortValues = (values: Set<string>) =>
      Array.from(values).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    const result = {
      turmas: sortValues(turmas),
      series: sortValues(series),
      turnos: sortValues(turnos),
      diagnosticos: sortValues(diagnosticos),
      totalRegistros: querySnapshot.size
    };

    logDetailed({
      level: 'debug',
      message: `Filtros carregados. ${result.totalRegistros} aluno(s); ${result.turmas.length} turmas; ${result.series.length} séries.`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      extraData: {
        totalAlunos: result.totalRegistros,
        qtdTurmas: result.turmas.length,
        qtdSeries: result.series.length,
        qtdTurnos: result.turnos.length,
        qtdDiagnosticos: result.diagnosticos.length
      }
    });

    return result;
  } catch (error) {
    const info = logFirestoreError(error, {
      methodName, lineNumber,
      operation: 'buscar opções de filtro',
      collection: 'alunos'
    });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao buscar opções de filtro. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        extraData: { firebaseErrorCode: info.fbCode }
      }, error);
    }
    return emptyResult;
  }
};

export const getAlunoById = async (id: string): Promise<Aluno | null> => {
  const methodName = 'getAlunoById';
  const lineNumber = 315;
  const parameters = { alunoId: id ?? '(vazio)' };

  const ready = ensureFirebaseReady({ methodName, lineNumber, parameters });
  if (!ready.ok) return null;

  if (!id || !id.trim()) {
    const err = new DetailedError({
      userMessage: 'Falha ao buscar aluno. O identificador do aluno (id) é obrigatório e não foi informado.',
      fieldName: 'Aluno ID',
      fieldValue: id ?? '(vazio)',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 400
    });
    logDetailed({
      level: 'warn',
      message: 'getAlunoById chamado com id vazio/nulo',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters,
      errorName: err.name,
      errorMessage: err.message
    });
    if (IS_DEV) throw err;
    return null;
  }

  try {
    logDetailed({
      level: 'debug',
      message: `Buscando aluno por ID: ${id.substring(0, 8)}...`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters,
      userId: getCurrentUserId() ?? undefined
    });

    const docRef = doc(cachedDb!, 'alunos', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      logDetailed({ level: 'debug', message: `Aluno encontrado (id=${id.substring(0, 8)}...)`, fileName: FILE_NAME, methodName, lineNumber, extraData: { alunoId: id } });
      return { id: docSnap.id, ...docSnap.data() } as Aluno;
    }
    logDetailed({ level: 'warn', message: `Aluno não encontrado no Firestore (id=${id.substring(0, 8)}...)`, fileName: FILE_NAME, methodName, lineNumber, extraData: { alunoId: id } });
    return null;
  } catch (error) {
    const info = logFirestoreError(error, {
      methodName, lineNumber, parameters,
      operation: `buscar aluno por ID=${id?.substring(0, 8)}`,
      collection: 'alunos'
    });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao buscar aluno por ID. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName || 'Aluno ID',
        fieldValue: id,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        extraData: { firebaseErrorCode: info.fbCode }
      }, error);
    }
    return null;
  }
};

export const addAluno = async (aluno: Omit<Aluno, 'id'>): Promise<string | null> => {
  const methodName = 'addAluno';
  const lineNumber = 380;
  const parameters = {
    nomeRecebido: aluno?.nome?.substring(0, 40) ?? '(vazio)',
    turma: aluno?.turma ?? '(vazio)',
    serie: aluno?.serie ?? '(vazio)',
    turno: aluno?.turno ?? '(sem turno)',
    anoLetivo: aluno?.anoLetivo ?? '(padrão atual)',
    temDiagnostico: !!aluno?.diagnostico
  };

  const ready = ensureFirebaseReady({ methodName, lineNumber, parameters, requireAuth: true });
  if (!ready.ok) return null;

  if (!aluno) {
    const err = new DetailedError({
      userMessage: 'Falha ao adicionar aluno: nenhum dado de aluno foi informado.',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 400
    });
    logDetailed({ level: 'warn', message: 'addAluno chamado com objeto aluno nulo/undefined', fileName: FILE_NAME, methodName, lineNumber, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }
  if (!aluno.nome || !aluno.nome.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao adicionar aluno. Campo: Nome. Motivo: O nome do aluno é obrigatório e não foi informado.', fieldName: 'Nome', fieldValue: aluno.nome ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'Validação falhou: nome do aluno vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }
  if (!aluno.turma || !aluno.turma.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao adicionar aluno. Campo: Turma. Motivo: A turma é obrigatória e não foi informada.', fieldName: 'Turma', fieldValue: aluno.turma ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'Validação falhou: turma vazia', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }
  if (!aluno.serie || !aluno.serie.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao adicionar aluno. Campo: Série. Motivo: A série é obrigatória e não foi informada.', fieldName: 'Série', fieldValue: aluno.serie ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'Validação falhou: série vazia', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }

  try {
    const currentUser = cachedAuth!.currentUser!;
    const nomeNorm = aluno.nome.trim();
    const turmaNorm = aluno.turma.trim();
    const serieNorm = aluno.serie.trim();

    logDetailed({
      level: 'info',
      message: `Adicionando aluno: "${nomeNorm}" (${turmaNorm} / ${serieNorm})`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters,
      userId: currentUser.uid
    });

    const q = query(
      collection(cachedDb!, 'alunos'),
      where('nome', '==', nomeNorm),
      where('turma', '==', turmaNorm),
      where('serie', '==', serieNorm)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const existingId = querySnapshot.docs[0].id;
      logDetailed({
        level: 'warn',
        message: `Aluno duplicado detectado. Retornando ID existente em vez de criar novo.`,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        parameters,
        userId: currentUser.uid,
        extraData: { existingId, nome: nomeNorm, turma: turmaNorm, serie: serieNorm }
      });
      return existingId;
    }

    const docRef = await addDoc(collection(cachedDb!, 'alunos'), {
      ...aluno,
      nome: nomeNorm,
      turma: turmaNorm,
      serie: serieNorm,
      professorId: currentUser.uid,
      anoLetivo: aluno.anoLetivo || new Date().getFullYear().toString(),
      metaPCM: aluno.metaPCM || 0,
      createdAt: Timestamp.now()
    });

    logDetailed({
      level: 'info',
      message: `Aluno criado com sucesso. Novo ID: ${docRef.id.substring(0, 8)}...`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: currentUser.uid,
      extraData: { alunoId: docRef.id, nome: nomeNorm }
    });

    return docRef.id;
  } catch (error) {
    const info = logFirestoreError(error, {
      methodName, lineNumber, parameters,
      operation: 'adicionar aluno',
      collection: 'alunos'
    });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao adicionar aluno. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        extraData: { firebaseErrorCode: info.fbCode }
      }, error);
    }
    return null;
  }
};

export const updateAluno = async (id: string, data: Partial<Aluno>): Promise<boolean> => {
  const methodName = 'updateAluno';
  const lineNumber = 505;
  const parameters = {
    alunoId: id ?? '(vazio)',
    camposAlterados: Object.keys(data ?? {})
  };

  const ready = ensureFirebaseReady({ methodName, lineNumber, parameters });
  if (!ready.ok) return false;

  if (!id || !id.trim()) {
    const err = new DetailedError({
      userMessage: 'Falha ao atualizar aluno. Campo: Aluno ID. Motivo: O identificador do aluno é obrigatório e não foi informado.',
      fieldName: 'Aluno ID',
      fieldValue: id ?? '(vazio)',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 400
    });
    logDetailed({ level: 'warn', message: 'updateAluno chamado com id vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return false;
  }

  if (!data || Object.keys(data).length === 0) {
    const err = new DetailedError({
      userMessage: 'Falha ao atualizar aluno. Motivo: Nenhum campo foi informado para atualização.',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 400
    });
    logDetailed({ level: 'warn', message: 'updateAluno chamado sem dados (objeto vazio)', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return false;
  }

  try {
    logDetailed({
      level: 'info',
      message: `Atualizando aluno id=${id.substring(0, 8)}... Campos: ${Object.keys(data).join(', ')}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters,
      userId: getCurrentUserId() ?? undefined
    });

    const docRef = doc(cachedDb!, 'alunos', id);
    await updateDoc(docRef, data);

    logDetailed({
      level: 'info',
      message: `Aluno atualizado com sucesso (id=${id.substring(0, 8)}...).`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters,
      userId: getCurrentUserId() ?? undefined
    });

    return true;
  } catch (error) {
    const info = logFirestoreError(error, {
      methodName, lineNumber, parameters,
      operation: `atualizar aluno ID=${id?.substring(0, 8)}`,
      collection: 'alunos'
    });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao atualizar aluno. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName || 'Aluno ID',
        fieldValue: id,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        extraData: { firebaseErrorCode: info.fbCode }
      }, error);
    }
    return false;
  }
};

export const deleteAluno = async (id: string): Promise<boolean> => {
  const methodName = 'deleteAluno';
  const lineNumber = 595;
  const parameters = { alunoId: id ?? '(vazio)' };

  const ready = ensureFirebaseReady({ methodName, lineNumber, parameters });
  if (!ready.ok) return false;

  if (!id || !id.trim()) {
    const err = new DetailedError({
      userMessage: 'Falha ao deletar aluno. Campo: Aluno ID. Motivo: O identificador do aluno é obrigatório e não foi informado.',
      fieldName: 'Aluno ID',
      fieldValue: id ?? '(vazio)',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 400
    });
    logDetailed({ level: 'warn', message: 'deleteAluno chamado com id vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return false;
  }

  try {
    logDetailed({
      level: 'warn',
      message: `Excluindo aluno permanentemente: id=${id.substring(0, 8)}...`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters,
      userId: getCurrentUserId() ?? undefined
    });

    const docRef = doc(cachedDb!, 'alunos', id);
    await deleteDoc(docRef);

    logDetailed({
      level: 'info',
      message: `Aluno excluído com sucesso (id=${id.substring(0, 8)}...).`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters,
      userId: getCurrentUserId() ?? undefined
    });

    return true;
  } catch (error) {
    const info = logFirestoreError(error, {
      methodName, lineNumber, parameters,
      operation: `deletar aluno ID=${id?.substring(0, 8)}`,
      collection: 'alunos'
    });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao deletar aluno. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName || 'Aluno ID',
        fieldValue: id,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        extraData: { firebaseErrorCode: info.fbCode }
      }, error);
    }
    return false;
  }
};

export const addImportRecord = async (record: Omit<ImportRecord, 'id' | 'importedAt' | 'professorId'>): Promise<string | null> => {
  const methodName = 'addImportRecord';
  const lineNumber = 662;
  const parameters = {
    fileName: record?.fileName ?? '(vazio)',
    successCount: record?.successCount ?? 0,
    errorCount: record?.errorCount ?? 0
  };

  const ready = ensureFirebaseReady({ methodName, lineNumber, parameters, requireAuth: true });
  if (!ready.ok) return null;

  if (!record) {
    const err = new DetailedError({ userMessage: 'Falha ao salvar histórico de importação: nenhum dado foi informado.', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'addImportRecord chamado com record nulo', fileName: FILE_NAME, methodName, lineNumber, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }
  if (!record.fileName || !record.fileName.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao salvar histórico de importação. Campo: fileName. Motivo: O nome do arquivo importado não foi informado.', fieldName: 'Nome do Arquivo', fieldValue: record.fileName ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'Validação falhou: fileName vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }

  try {
    const currentUser = cachedAuth!.currentUser!;

    logDetailed({
      level: 'info',
      message: `Registrando histórico de importação: arquivo="${record.fileName}" (sucesso=${record.successCount}, erros=${record.errorCount})`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters,
      userId: currentUser.uid
    });

    const docRef = await addDoc(collection(cachedDb!, 'import_history'), {
      ...record,
      professorId: currentUser.uid,
      importedAt: Timestamp.now()
    });

    logDetailed({
      level: 'info',
      message: `Histórico de importação salvo (id=${docRef.id.substring(0, 8)}...).`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: currentUser.uid,
      extraData: { importRecordId: docRef.id }
    });

    return docRef.id;
  } catch (error) {
    const info = logFirestoreError(error, {
      methodName, lineNumber, parameters,
      operation: 'salvar histórico de importação',
      collection: 'import_history'
    });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao salvar histórico de importação. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        extraData: { firebaseErrorCode: info.fbCode }
      }, error);
    }
    return null;
  }
};

export const getImportHistory = async (): Promise<ImportRecord[]> => {
  const methodName = 'getImportHistory';
  const lineNumber = 744;

  const ready = ensureFirebaseReady({ methodName, lineNumber, requireAuth: true });
  if (!ready.ok) return [];

  try {
    const currentUser = cachedAuth!.currentUser!;

    logDetailed({
      level: 'info',
      message: 'Buscando histórico de importações do professor',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: currentUser.uid
    });

    const q = query(
      collection(cachedDb!, 'import_history'),
      where('professorId', '==', currentUser.uid),
      orderBy('importedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as ImportRecord));

    logDetailed({
      level: 'debug',
      message: `Histórico carregado: ${results.length} registro(s).`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: currentUser.uid,
      extraData: { totalRegistros: results.length }
    });

    return results;
  } catch (error) {
    const info = logFirestoreError(error, {
      methodName, lineNumber,
      operation: 'buscar histórico de importações',
      collection: 'import_history'
    });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao buscar histórico de importação. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        extraData: { firebaseErrorCode: info.fbCode }
      }, error);
    }
    return [];
  }
};
