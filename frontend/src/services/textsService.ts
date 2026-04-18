import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Texto {
    id: string;
    titulo: string;
    conteudo: string;
    numeroPalavras: number;
    serie: string;
}

export const getTextos = async (): Promise<Texto[]> => {
    try {
        const q = query(collection(db, 'textos'), orderBy('titulo', 'asc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Texto));
    } catch (error) {
        console.error("Erro ao buscar textos:", error);
        return [];
    }
};

export const getTextoById = async (id: string): Promise<Texto | null> => {
    try {
        const docRef = doc(db, 'textos', id);
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
    try {
        const docRef = await addDoc(collection(db, 'textos'), {
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
    try {
        const docRef = doc(db, 'textos', id);
        await updateDoc(docRef, data);
        return true;
    } catch (error) {
        console.error("Erro ao atualizar texto:", error);
        return false;
    }
};

export const deleteTexto = async (id: string): Promise<boolean> => {
    try {
        const docRef = doc(db, 'textos', id);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error("Erro ao deletar texto:", error);
        return false;
    }
};
