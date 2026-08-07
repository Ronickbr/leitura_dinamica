import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, Firestore } from 'firebase/firestore';
import {
  logDetailed,
  formatFirebaseFirestoreError,
  tryExtractFirebaseErrorCode,
  DetailedError,
  IS_DEV
} from './errorUtils';

let cachedDb: Firestore | null = null;

const FILE_NAME = 'textsService.ts';

const ensureFirebaseReady = (context: { methodName: string; lineNumber: number; parameters?: Record<string, unknown> }): boolean => {
  if (!cachedDb) {
    const err = new DetailedError({
      userMessage: `Firebase/Firestore não inicializado antes de chamar ${context.methodName}. Aguarde o carregamento completo da página.`,
      fileName: FILE_NAME,
      methodName: context.methodName,
      lineNumber: context.lineNumber,
      extraData: {
        checkList: [
          'Verifique se FirebaseProvider está envolvendo a página/layout',
          'Confirme se as variáveis NEXT_PUBLIC_FIREBASE_* estão definidas',
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
      errorName: err.name,
      errorMessage: err.message
    });
    if (IS_DEV) throw err;
    return false;
  }
  return true;
};

const logFirestoreError = (error: unknown, context: { methodName: string; lineNumber: number; parameters?: Record<string, unknown>; operation: string }) => {
  const fbCode = tryExtractFirebaseErrorCode(error);
  const formatted = fbCode ? formatFirebaseFirestoreError(fbCode) : null;
  const originalName = error instanceof Error ? error.name : 'UnknownError';
  const originalMessage = error instanceof Error ? error.message : String(error);
  const originalStack = error instanceof Error ? error.stack : undefined;

  logDetailed({
    level: 'error',
    message: `Erro ao ${context.operation} textos: ${formatted?.userMessage || originalMessage}`,
    fileName: FILE_NAME,
    methodName: context.methodName,
    lineNumber: context.lineNumber,
    parameters: context.parameters,
    errorName: originalName,
    errorMessage: originalMessage,
    stackTrace: originalStack,
    extraData: {
      firebaseErrorCode: fbCode,
      firestoreCollection: 'textos',
      operation: context.operation,
      campo: formatted?.fieldName
    }
  });

  return { fbCode, formatted, originalName, originalMessage };
};

export function setFirebaseDbInstance(dbInstance: Firestore) {
  cachedDb = dbInstance;
  logDetailed({
    level: 'info',
    message: 'Instância Firestore injetada no textsService',
    fileName: FILE_NAME,
    methodName: 'setFirebaseDbInstance',
    extraData: { hasDb: !!dbInstance }
  });
}

export interface Texto {
  id: string;
  titulo: string;
  conteudo: string;
  numeroPalavras: number;
  serie: string;
  comDiagnostico?: boolean;
}

export const getTextos = async (): Promise<Texto[]> => {
  const methodName = 'getTextos';
  const lineNumber = 94;

  if (!ensureFirebaseReady({ methodName, lineNumber })) return [];

  try {
    logDetailed({
      level: 'info',
      message: 'Buscando lista de textos cadastrados',
      fileName: FILE_NAME,
      methodName,
      lineNumber
    });

    const q = query(collection(cachedDb!, 'textos'));
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Texto));

    logDetailed({
      level: 'debug',
      message: `Busca de textos concluída. ${results.length} texto(s) encontrado(s).`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      extraData: { totalTextos: results.length }
    });

    return results.sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
  } catch (error) {
    const info = logFirestoreError(error, { methodName, lineNumber, operation: 'buscar lista de' });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao buscar textos. ${info.formatted?.userMessage || info.originalMessage}`,
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

export const getTextoById = async (id: string): Promise<Texto | null> => {
  const methodName = 'getTextoById';
  const lineNumber = 137;
  const parameters = { textoId: id ?? '(vazio)' };

  if (!ensureFirebaseReady({ methodName, lineNumber, parameters })) return null;

  if (!id || !id.trim()) {
    const err = new DetailedError({
      userMessage: 'Falha ao buscar texto. Campo: Texto ID. Motivo: O identificador do texto é obrigatório e não foi informado.',
      fieldName: 'Texto ID',
      fieldValue: id ?? '(vazio)',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 400
    });
    logDetailed({ level: 'warn', message: 'getTextoById chamado com id vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }

  try {
    logDetailed({
      level: 'debug',
      message: `Buscando texto por ID: ${id.substring(0, 8)}...`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters
    });

    const docRef = doc(cachedDb!, 'textos', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      logDetailed({ level: 'debug', message: `Texto encontrado (id=${id.substring(0, 8)}...)`, fileName: FILE_NAME, methodName, lineNumber, extraData: { textoId: id } });
      return { id: docSnap.id, ...docSnap.data() } as Texto;
    }
    logDetailed({ level: 'warn', message: `Texto não encontrado no Firestore (id=${id.substring(0, 8)}...)`, fileName: FILE_NAME, methodName, lineNumber, extraData: { textoId: id } });
    return null;
  } catch (error) {
    const info = logFirestoreError(error, { methodName, lineNumber, parameters, operation: `buscar texto por ID=${id?.substring(0, 8)}` });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao buscar texto por ID. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName || 'Texto ID',
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

export const addTexto = async (texto: Omit<Texto, 'id'>): Promise<string | null> => {
  const methodName = 'addTexto';
  const lineNumber = 195;
  const parameters = {
    tituloRecebido: texto?.titulo?.substring(0, 60) ?? '(vazio)',
    serie: texto?.serie ?? '(vazio)',
    numeroPalavras: texto?.numeroPalavras ?? 0,
    conteudoLength: texto?.conteudo?.length ?? 0,
    comDiagnostico: texto?.comDiagnostico ?? false
  };

  if (!ensureFirebaseReady({ methodName, lineNumber, parameters })) return null;

  if (!texto) {
    const err = new DetailedError({ userMessage: 'Falha ao adicionar texto: nenhum dado de texto foi informado.', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'addTexto chamado com objeto nulo', fileName: FILE_NAME, methodName, lineNumber, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }
  if (!texto.titulo || !texto.titulo.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao adicionar texto. Campo: Título. Motivo: O título do texto é obrigatório e não foi informado.', fieldName: 'Título', fieldValue: texto.titulo ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'Validação falhou: título vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }
  if (!texto.conteudo || !texto.conteudo.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao adicionar texto. Campo: Conteúdo. Motivo: O conteúdo do texto é obrigatório e não foi informado.', fieldName: 'Conteúdo', fieldValue: texto.conteudo ? `(${texto.conteudo.length} caracteres)` : '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'Validação falhou: conteúdo vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }
  if (!texto.serie || !texto.serie.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao adicionar texto. Campo: Série. Motivo: A série/ano do texto é obrigatória e não foi informada.', fieldName: 'Série', fieldValue: texto.serie ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'Validação falhou: série vazia', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return null;
  }

  try {
    logDetailed({
      level: 'info',
      message: `Adicionando texto: "${texto.titulo.trim()}" (${texto.serie} | ${texto.numeroPalavras} palavras)`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters
    });

    const docRef = await addDoc(collection(cachedDb!, 'textos'), {
      ...texto,
      titulo: texto.titulo.trim(),
      conteudo: texto.conteudo.trim(),
      serie: texto.serie.trim(),
      numeroPalavras: texto.numeroPalavras || texto.conteudo.trim().split(/\s+/).filter(Boolean).length,
      createdAt: Timestamp.now()
    });

    logDetailed({
      level: 'info',
      message: `Texto criado com sucesso. Novo ID: ${docRef.id.substring(0, 8)}...`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      extraData: { textoId: docRef.id, titulo: texto.titulo.trim() }
    });

    return docRef.id;
  } catch (error) {
    const info = logFirestoreError(error, { methodName, lineNumber, parameters, operation: 'adicionar' });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao adicionar texto. ${info.formatted?.userMessage || info.originalMessage}`,
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

export const updateTexto = async (id: string, data: Partial<Texto>): Promise<boolean> => {
  const methodName = 'updateTexto';
  const lineNumber = 292;
  const parameters = {
    textoId: id ?? '(vazio)',
    camposAlterados: Object.keys(data ?? {})
  };

  if (!ensureFirebaseReady({ methodName, lineNumber, parameters })) return false;

  if (!id || !id.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao atualizar texto. Campo: Texto ID. Motivo: O identificador do texto é obrigatório e não foi informado.', fieldName: 'Texto ID', fieldValue: id ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'updateTexto chamado com id vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return false;
  }
  if (!data || Object.keys(data).length === 0) {
    const err = new DetailedError({ userMessage: 'Falha ao atualizar texto. Motivo: Nenhum campo foi informado para atualização.', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'updateTexto chamado sem dados', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return false;
  }

  try {
    logDetailed({
      level: 'info',
      message: `Atualizando texto id=${id.substring(0, 8)}... Campos: ${Object.keys(data).join(', ')}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters
    });

    const docRef = doc(cachedDb!, 'textos', id);
    await updateDoc(docRef, data);

    logDetailed({
      level: 'info',
      message: `Texto atualizado com sucesso (id=${id.substring(0, 8)}...)`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters
    });

    return true;
  } catch (error) {
    const info = logFirestoreError(error, { methodName, lineNumber, parameters, operation: `atualizar texto ID=${id?.substring(0, 8)}` });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao atualizar texto. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName || 'Texto ID',
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

export const deleteTexto = async (id: string): Promise<boolean> => {
  const methodName = 'deleteTexto';
  const lineNumber = 363;
  const parameters = { textoId: id ?? '(vazio)' };

  if (!ensureFirebaseReady({ methodName, lineNumber, parameters })) return false;

  if (!id || !id.trim()) {
    const err = new DetailedError({ userMessage: 'Falha ao deletar texto. Campo: Texto ID. Motivo: O identificador do texto é obrigatório e não foi informado.', fieldName: 'Texto ID', fieldValue: id ?? '(vazio)', fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    logDetailed({ level: 'warn', message: 'deleteTexto chamado com id vazio', fileName: FILE_NAME, methodName, lineNumber, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return false;
  }

  try {
    logDetailed({
      level: 'warn',
      message: `Excluindo texto permanentemente: id=${id.substring(0, 8)}...`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters
    });

    const docRef = doc(cachedDb!, 'textos', id);
    await deleteDoc(docRef);

    logDetailed({
      level: 'info',
      message: `Texto excluído com sucesso (id=${id.substring(0, 8)}...)`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      parameters
    });

    return true;
  } catch (error) {
    const info = logFirestoreError(error, { methodName, lineNumber, parameters, operation: `deletar texto ID=${id?.substring(0, 8)}` });
    if (IS_DEV) {
      throw new DetailedError({
        userMessage: `Falha ao deletar texto. ${info.formatted?.userMessage || info.originalMessage}`,
        fieldName: info.formatted?.fieldName || 'Texto ID',
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
