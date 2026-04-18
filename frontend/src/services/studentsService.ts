import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface Aluno {
    id: string;
    nome: string;
    turma: string;
    serie: string;
    diagnostico: string;
    observacoes?: string;
    professorId?: string; // ID do professor que cadastrou
}

export const getAlunos = async (turma?: string): Promise<Aluno[]> => {
    try {
        // Busca global de alunos conforme pedido (acesso compartilhado entre pedagogas)
        let q = query(collection(db, 'alunos'), orderBy('nome', 'asc'));

        if (turma && turma !== 'Todas') {
            q = query(q, where('turma', '==', turma));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Aluno));
    } catch (error) {
        console.error("Erro ao buscar alunos:", error);
        return [];
    }
};

export const getAlunoById = async (id: string): Promise<Aluno | null> => {
    try {
        const docRef = doc(db, 'alunos', id);
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
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Usuário não autenticado");

        const docRef = await addDoc(collection(db, 'alunos'), {
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
    try {
        const docRef = doc(db, 'alunos', id);
        await updateDoc(docRef, data);
        return true;
    } catch (error) {
        console.error("Erro ao atualizar aluno:", error);
        return false;
    }
};

export const deleteAluno = async (id: string): Promise<boolean> => {
    try {
        const docRef = doc(db, 'alunos', id);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error("Erro ao deletar aluno:", error);
        return false;
    }
};
