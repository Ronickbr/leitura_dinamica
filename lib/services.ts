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
  Firestore
} from 'firebase/firestore';
import { Auth } from 'firebase/auth';

let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

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
  if (!cachedDb) {
    console.warn("getAlunos chamado antes da inicialização do Firebase");
    return [];
  }
  try {
    // Removemos o orderBy temporariamente para garantir que a consulta funcione mesmo sem índices manuais
    let q = query(collection(cachedDb, 'alunos'));

    if (turma && turma !== 'Todas') {
      q = query(q, where('turma', '==', turma));
    }

    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Aluno));

    // Ordenação manual no cliente para garantir que a interface fique organizada e resiliente a falta de índices
    return results.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  } catch (error) {
    console.error("Erro crítico ao buscar alunos no Firestore:", error);
    return [];
  }
};

export const getAlunoFilterOptions = async (): Promise<AlunoFilterOptions> => {
  const emptyResult: AlunoFilterOptions = {
    turmas: [],
    series: [],
    turnos: [],
    diagnosticos: [],
    totalRegistros: 0
  };

  if (!cachedDb) {
    console.warn("getAlunoFilterOptions chamado antes da inicialização do Firebase");
    return emptyResult;
  }

  try {
    const querySnapshot = await getDocs(query(collection(cachedDb, 'alunos')));

    if (querySnapshot.empty) {
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

    return {
      turmas: sortValues(turmas),
      series: sortValues(series),
      turnos: sortValues(turnos),
      diagnosticos: sortValues(diagnosticos),
      totalRegistros: querySnapshot.size
    };
  } catch (error) {
    console.error("Erro ao buscar opções de filtro no Firestore:", error);
    return emptyResult;
  }
};

export const getAlunoById = async (id: string): Promise<Aluno | null> => {
  if (!cachedDb) return null;
  try {
    const docRef = doc(cachedDb, 'alunos', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Aluno;
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar aluno:", error);
    return null;
  }
};

export const addAluno = async (aluno: Omit<Aluno, 'id'>): Promise<string | null> => {
  if (!cachedDb || !cachedAuth) {
    console.warn("addAluno chamado antes da inicialização do Firebase");
    return null;
  }
  try {
    const currentUser = cachedAuth.currentUser;
    if (!currentUser) throw new Error("Usuário não autenticado");

    // Prepara os dados para evitar duplicatas (verificação básica)
    const nomeNorm = aluno.nome.trim();
    const turmaNorm = aluno.turma.trim();
    const serieNorm = aluno.serie.trim();

    // Busca duplicatas
    const q = query(
      collection(cachedDb, 'alunos'),
      where('nome', '==', nomeNorm),
      where('turma', '==', turmaNorm),
      where('serie', '==', serieNorm)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      console.log(`Aluno já existe: ${nomeNorm} (${turmaNorm} - ${serieNorm}). Retornando ID existente.`);
      return querySnapshot.docs[0].id;
    }

    const docRef = await addDoc(collection(cachedDb, 'alunos'), {
      ...aluno,
      nome: nomeNorm,
      turma: turmaNorm,
      serie: serieNorm,
      professorId: currentUser.uid,
      anoLetivo: aluno.anoLetivo || new Date().getFullYear().toString(),
      metaPCM: aluno.metaPCM || 0,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao adicionar aluno:", error);
    return null;
  }
};

export const updateAluno = async (id: string, data: Partial<Aluno>): Promise<boolean> => {
  if (!cachedDb) return false;
  try {
    const docRef = doc(cachedDb, 'alunos', id);
    await updateDoc(docRef, data);
    return true;
  } catch (error) {
    console.error("Erro ao atualizar aluno:", error);
    return false;
  }
};

export const deleteAluno = async (id: string): Promise<boolean> => {
  if (!cachedDb) return false;
  try {
    const docRef = doc(cachedDb, 'alunos', id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Erro ao deletar aluno:", error);
    return false;
  }
};

export const addImportRecord = async (record: Omit<ImportRecord, 'id' | 'importedAt' | 'professorId'>): Promise<string | null> => {
  if (!cachedDb || !cachedAuth) {
    console.warn("addImportRecord chamado antes da inicialização do Firebase");
    return null;
  }
  try {
    const currentUser = cachedAuth.currentUser;
    if (!currentUser) throw new Error("Usuário não autenticado");

    const docRef = await addDoc(collection(cachedDb, 'import_history'), {
      ...record,
      professorId: currentUser.uid,
      importedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao salvar histórico de importação:", error);
    return null;
  }
};

export const getImportHistory = async (): Promise<ImportRecord[]> => {
  if (!cachedDb || !cachedAuth) return [];
  try {
    const currentUser = cachedAuth.currentUser;
    if (!currentUser) return [];

    const q = query(
      collection(cachedDb, 'import_history'),
      where('professorId', '==', currentUser.uid),
      orderBy('importedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as ImportRecord));
  } catch (error) {
    console.error("Erro ao buscar histórico de importação:", error);
    return [];
  }
};
