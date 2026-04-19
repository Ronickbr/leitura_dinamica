import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, Firestore } from 'firebase/firestore';

let cachedDb: Firestore | null = null;

export function setFirebaseDbInstance(dbInstance: Firestore) {
  cachedDb = dbInstance;
}

export interface Texto {
  id: string;
  titulo: string;
  conteudo: string;
  numeroPalavras: number;
  serie: string;
}

export const getTextos = async (): Promise<Texto[]> => {
  if (!cachedDb) return [];
  try {
    const q = query(collection(cachedDb, 'textos'), orderBy('titulo', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Texto));
  } catch (error) {
    console.error("Erro ao buscar textos:", error);
    return [];
  }
};

export const getTextoById = async (id: string): Promise<Texto | null> => {
  if (!cachedDb) return null;
  try {
    const docRef = doc(cachedDb, 'textos', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Texto;
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar texto por ID:", error);
    return null;
  }
};

export const addTexto = async (texto: Omit<Texto, 'id'>): Promise<string | null> => {
  if (!cachedDb) return null;
  try {
    const docRef = await addDoc(collection(cachedDb, 'textos'), {
      ...texto,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao adicionar texto:", error);
    return null;
  }
};

export const updateTexto = async (id: string, data: Partial<Texto>): Promise<boolean> => {
  if (!cachedDb) return false;
  try {
    const docRef = doc(cachedDb, 'textos', id);
    await updateDoc(docRef, data);
    return true;
  } catch (error) {
    console.error("Erro ao atualizar texto:", error);
    return false;
  }
};

export const deleteTexto = async (id: string): Promise<boolean> => {
  if (!cachedDb) return false;
  try {
    const docRef = doc(cachedDb, 'textos', id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Erro ao deletar texto:", error);
    return false;
  }
};