import { collection, query, where, getDocs, addDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface MetricasQualitativas {
    leitura_precisa: boolean;
    leitura_silabada: boolean;
    boa_entonacao: boolean;
    interpretacao: boolean;
    pontuacao: boolean;
}

export interface Avaliacao {
    id?: string;
    alunoId: string;
    textoId: string;
    pcm: number;
    precisao: number;
    transcricao: string;
    diagnosticoIA: string;
    intervencaoIA: string;
    metricasQualitativas?: MetricasQualitativas;
    data: Timestamp | { seconds?: number; toDate?: () => Date } | null;
    professorId: string;
}

export const saveAvaliacao = async (avaliacao: Omit<Avaliacao, 'id' | 'data' | 'professorId'>): Promise<string | null> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Usuário não autenticado");

        const docRef = await addDoc(collection(db, 'avaliacoes'), {
            ...avaliacao,
            professorId: currentUser.uid,
            data: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error("Erro ao salvar avaliação:", error);
        return null;
    }
};

export const getAvaliacoesPorAluno = async (alunoId: string): Promise<Avaliacao[]> => {
    try {
        const q = query(
            collection(db, 'avaliacoes'),
            where('alunoId', '==', alunoId),
            orderBy('data', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Avaliacao));
    } catch (error) {
        console.error("Erro ao buscar avaliações do aluno:", error);
        return [];
    }
};

export const getAllAvaliacoes = async (): Promise<Avaliacao[]> => {
    try {
        // Busca global de avaliações (acesso compartilhado)
        const q = query(
            collection(db, 'avaliacoes'),
            orderBy('data', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Avaliacao));
    } catch (error) {
        console.error("Erro ao buscar todas as avaliações:", error);
        return [];
    }
};

export const getAvaliacaoById = async (id: string): Promise<Avaliacao | null> => {
    try {
        const { getDoc, doc } = await import('firebase/firestore');
        const docRef = doc(db, 'avaliacoes', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Avaliacao;
        }
        return null;
    } catch (error) {
        console.error("Erro ao buscar avaliação por ID:", error);
        return null;
    }
};
