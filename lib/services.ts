import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  Timestamp,
  orderBy,
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
import { getResearchRetentionUntil } from './privacyConfig';

let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
const FILE_NAME = 'services.ts';

function currentUid(): string | null {
  return cachedAuth?.currentUser?.uid ?? null;
}

function ensureReady(methodName: string): { db: Firestore; uid: string } | null {
  const uid = currentUid();
  if (!cachedDb || !uid) {
    logDetailed({ level: 'warn', message: 'Operação bloqueada por ausência de sessão ou Firestore.', fileName: FILE_NAME, methodName });
    return null;
  }
  return { db: cachedDb, uid };
}

function retentionForWrite(methodName: string): Timestamp | null | undefined {
  const retention = getResearchRetentionUntil();
  if (retention) return retention;
  if (IS_DEV) return undefined;
  logDetailed({ level: 'error', message: 'Gravação bloqueada: prazo de retenção da pesquisa não configurado.', fileName: FILE_NAME, methodName });
  return null;
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
  retentionUntil?: Timestamp;
}

interface StudentPrivateData {
  professorId: string;
  diagnostico?: string;
  observacoes?: string;
  retentionUntil?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  successCount: number;
  errorCount: number;
  importedAt: Timestamp;
  professorId: string;
  retentionUntil?: Timestamp;
}

export interface AlunoFilterOptions {
  turmas: string[];
  series: string[];
  turnos: string[];
  diagnosticos: string[];
  totalRegistros: number;
}

function splitStudentData(data: Partial<Aluno>) {
  const { diagnostico, observacoes, ...publicData } = data;
  return {
    publicData,
    privateData: {
      ...(diagnostico !== undefined ? { diagnostico: diagnostico?.slice(0, 120) } : {}),
      ...(observacoes !== undefined ? { observacoes: observacoes?.slice(0, 500) } : {}),
    },
  };
}

async function getPrivateMap(db: Firestore, uid: string): Promise<Map<string, StudentPrivateData>> {
  const snapshot = await getDocs(query(collection(db, 'student_private'), where('professorId', '==', uid)));
  return new Map(snapshot.docs.map((item) => [item.id, item.data() as StudentPrivateData]));
}

async function migrateLegacyPrivateFields(
  db: Firestore,
  uid: string,
  studentId: string,
  data: Record<string, any>,
): Promise<void> {
  const hasLegacyDiagnosis = typeof data.diagnostico === 'string' && data.diagnostico.trim() !== '';
  const hasLegacyNotes = typeof data.observacoes === 'string' && data.observacoes.trim() !== '';
  if (!hasLegacyDiagnosis && !hasLegacyNotes) return;

  await setDoc(doc(db, 'student_private', studentId), {
    professorId: uid,
    ...(hasLegacyDiagnosis ? { diagnostico: data.diagnostico.slice(0, 120) } : {}),
    ...(hasLegacyNotes ? { observacoes: data.observacoes.slice(0, 500) } : {}),
    ...(data.retentionUntil ? { retentionUntil: data.retentionUntil } : {}),
    updatedAt: Timestamp.now(),
  }, { merge: true });

  await updateDoc(doc(db, 'alunos', studentId), {
    diagnostico: deleteField(),
    observacoes: deleteField(),
    updatedAt: Timestamp.now(),
  });
}

export const getAlunos = async (turma?: string): Promise<Aluno[]> => {
  const ready = ensureReady('getAlunos');
  if (!ready) return [];
  try {
    const constraints = [where('professorId', '==', ready.uid)];
    if (turma && turma !== 'Todas') constraints.push(where('turma', '==', turma));
    const [snapshot, privateMap] = await Promise.all([
      getDocs(query(collection(ready.db, 'alunos'), ...constraints)),
      getPrivateMap(ready.db, ready.uid),
    ]);

    const migrations: Promise<void>[] = [];
    const result = snapshot.docs.map((item) => {
      const raw = item.data() as Record<string, any>;
      if (raw.diagnostico || raw.observacoes) {
        migrations.push(migrateLegacyPrivateFields(ready.db, ready.uid, item.id, raw));
      }
      return { id: item.id, ...raw, ...(privateMap.get(item.id) || {}) } as Aluno;
    });

    if (migrations.length > 0) {
      void Promise.allSettled(migrations).then((settled) => {
        const failures = settled.filter((entry) => entry.status === 'rejected').length;
        if (failures > 0) {
          logDetailed({ level: 'warn', message: 'Alguns registros legados não puderam ser migrados para a coleção privada.', fileName: FILE_NAME, methodName: 'getAlunos', extraData: { failures } });
        }
      });
    }

    return result.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  } catch (error) {
    logFirestoreError(error, 'getAlunos', 'buscar alunos do professor autenticado');
    if (IS_DEV) throw error;
    return [];
  }
};

export const getAlunoFilterOptions = async (): Promise<AlunoFilterOptions> => {
  const alunos = await getAlunos();
  const unique = (values: Array<string | undefined>) =>
    Array.from(new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return {
    turmas: unique(alunos.map((a) => a.turma)),
    series: unique(alunos.map((a) => a.serie)),
    turnos: unique(alunos.map((a) => a.turno)),
    diagnosticos: unique(alunos.map((a) => a.diagnostico)),
    totalRegistros: alunos.length,
  };
};

export const getAlunoById = async (id: string): Promise<Aluno | null> => {
  const ready = ensureReady('getAlunoById');
  if (!ready || !id?.trim()) return null;
  try {
    const [snapshot, privateSnapshot] = await Promise.all([
      getDoc(doc(ready.db, 'alunos', id)),
      getDoc(doc(ready.db, 'student_private', id)),
    ]);
    if (!snapshot.exists()) return null;
    const raw = snapshot.data() as Record<string, any>;
    if (raw.professorId !== ready.uid) return null;
    const privateData = privateSnapshot.exists() ? privateSnapshot.data() as StudentPrivateData : {};
    if (raw.diagnostico || raw.observacoes) {
      void migrateLegacyPrivateFields(ready.db, ready.uid, id, raw).catch(() => undefined);
    }
    return { id: snapshot.id, ...raw, ...privateData } as Aluno;
  } catch (error) {
    logFirestoreError(error, 'getAlunoById', 'buscar aluno');
    if (IS_DEV) throw error;
    return null;
  }
};

export const addAluno = async (aluno: Omit<Aluno, 'id'>): Promise<string | null> => {
  const ready = ensureReady('addAluno');
  if (!ready) return null;
  if (!aluno?.nome?.trim() || !aluno?.turma?.trim() || !aluno?.serie?.trim()) return null;
  const retentionUntil = retentionForWrite('addAluno');
  if (retentionUntil === null) return null;

  try {
    const nome = aluno.nome.trim();
    const turma = aluno.turma.trim();
    const serie = aluno.serie.trim();
    const duplicate = await getDocs(query(
      collection(ready.db, 'alunos'),
      where('professorId', '==', ready.uid),
      where('nome', '==', nome),
      where('turma', '==', turma),
      where('serie', '==', serie),
    ));
    if (!duplicate.empty) return duplicate.docs[0].id;

    const { publicData, privateData } = splitStudentData(aluno);
    const document = await addDoc(collection(ready.db, 'alunos'), {
      ...publicData,
      nome,
      turma,
      serie,
      professorId: ready.uid,
      anoLetivo: aluno.anoLetivo || new Date().getFullYear().toString(),
      metaPCM: aluno.metaPCM || 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...(retentionUntil ? { retentionUntil } : {}),
    });

    if (Object.keys(privateData).length > 0) {
      await setDoc(doc(ready.db, 'student_private', document.id), {
        ...privateData,
        professorId: ready.uid,
        updatedAt: Timestamp.now(),
        ...(retentionUntil ? { retentionUntil } : {}),
      });
    }
    return document.id;
  } catch (error) {
    const message = logFirestoreError(error, 'addAluno', 'adicionar aluno');
    if (IS_DEV) throw new DetailedError({ userMessage: message, fileName: FILE_NAME, methodName: 'addAluno' }, error);
    return null;
  }
};

export const updateAluno = async (id: string, data: Partial<Aluno>): Promise<boolean> => {
  const ready = ensureReady('updateAluno');
  if (!ready || !id?.trim() || !data || Object.keys(data).length === 0) return false;

  try {
    const existing = await getAlunoById(id);
    if (!existing) return false;
    const { publicData, privateData } = splitStudentData(data);
    const safeData = { ...publicData } as Record<string, unknown>;
    delete safeData.id;
    delete safeData.professorId;
    delete safeData.retentionUntil;

    if (Object.keys(safeData).length > 0) {
      safeData.updatedAt = Timestamp.now();
      await updateDoc(doc(ready.db, 'alunos', id), safeData);
    }

    if (Object.keys(privateData).length > 0) {
      await setDoc(doc(ready.db, 'student_private', id), {
        ...privateData,
        professorId: ready.uid,
        updatedAt: Timestamp.now(),
      }, { merge: true });
    }
    return true;
  } catch (error) {
    logFirestoreError(error, 'updateAluno', 'atualizar aluno');
    if (IS_DEV) throw error;
    return false;
  }
};

export const deleteAluno = async (id: string): Promise<boolean> => {
  const ready = ensureReady('deleteAluno');
  if (!ready || !id?.trim() || !cachedAuth?.currentUser) return false;

  const tokenResult = await cachedAuth.currentUser.getIdTokenResult(true);
  if (tokenResult.claims.admin !== true) {
    logDetailed({ level: 'warn', message: 'Exclusão bloqueada: operação exige privilégio administrativo.', fileName: FILE_NAME, methodName: 'deleteAluno' });
    return false;
  }

  try {
    const evaluationSnapshot = await getDocs(query(
      collection(ready.db, 'avaliacoes'),
      where('professorId', '==', ready.uid),
      where('alunoId', '==', id),
    ));

    let batch = writeBatch(ready.db);
    let count = 0;
    for (const evaluation of evaluationSnapshot.docs) {
      batch.delete(evaluation.ref);
      count += 1;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(ready.db);
        count = 0;
      }
    }
    if (count > 0) await batch.commit();

    await deleteDoc(doc(ready.db, 'student_private', id)).catch(() => undefined);
    await deleteDoc(doc(ready.db, 'alunos', id));
    return true;
  } catch (error) {
    logFirestoreError(error, 'deleteAluno', 'excluir dados vinculados ao aluno');
    if (IS_DEV) throw error;
    return false;
  }
};

export const addImportRecord = async (
  record: Omit<ImportRecord, 'id' | 'importedAt' | 'professorId'>
): Promise<string | null> => {
  const ready = ensureReady('addImportRecord');
  if (!ready || !record?.fileName?.trim()) return null;
  const retentionUntil = retentionForWrite('addImportRecord');
  if (retentionUntil === null) return null;

  try {
    const document = await addDoc(collection(ready.db, 'import_history'), {
      fileName: record.fileName.slice(0, 160),
      successCount: Number(record.successCount || 0),
      errorCount: Number(record.errorCount || 0),
      professorId: ready.uid,
      importedAt: Timestamp.now(),
      ...(retentionUntil ? { retentionUntil } : {}),
    });
    return document.id;
  } catch (error) {
    logFirestoreError(error, 'addImportRecord', 'registrar importação');
    if (IS_DEV) throw error;
    return null;
  }
};

export const getImportHistory = async (): Promise<ImportRecord[]> => {
  const ready = ensureReady('getImportHistory');
  if (!ready) return [];
  try {
    const snapshot = await getDocs(query(
      collection(ready.db, 'import_history'),
      where('professorId', '==', ready.uid),
      orderBy('importedAt', 'desc'),
    ));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as ImportRecord));
  } catch (error) {
    logFirestoreError(error, 'getImportHistory', 'buscar histórico de importação');
    if (IS_DEV) throw error;
    return [];
  }
};
