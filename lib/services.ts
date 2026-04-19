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
}

export const getAlunos = async (turma?: string): Promise<Aluno[]> => {
  if (!cachedDb) return [];
  try {
    let q = query(collection(cachedDb, 'alunos'), orderBy('nome', 'asc'));

    if (turma && turma !== 'Todas') {
      q = query(q, where('turma', '==', turma));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Aluno));
  } catch (error) {
    console.error("Erro ao buscar alunos:", error);
    return [];
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
  if (!cachedDb || !cachedAuth) return null;
  try {
    const currentUser = cachedAuth.currentUser;
    if (!currentUser) throw new Error("Usuário não autenticado");

    const docRef = await addDoc(collection(cachedDb, 'alunos'), {
      ...aluno,
      professorId: currentUser.uid,
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