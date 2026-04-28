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

let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

export function setFirebaseInstances(dbInstance: Firestore, authInstance: Auth) {
  cachedDb = dbInstance;
  cachedAuth = authInstance;
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
  transcricao: string;
  diagnosticoIA: string;
  intervencaoIA: string;
  transcricaoMarcada?: string;
  metricasQualitativas?: MetricasQualitativas;
  perguntasCompreensao?: Array<{
    pergunta: string;
    resposta_esperada: string;
  }>;
  data?: Timestamp | { seconds?: number; toDate?: () => Date } | null;
  professorId: string;
}

export const processAudio = async (audioBlob: Blob, originalText: string, studentGrade?: string, targetPCM?: number, history?: any[], duration?: number, isForeigner?: boolean) => {
  const user = cachedAuth?.currentUser;
  const token = user ? await user.getIdToken() : null;

  if (!originalText) {
    throw new Error('O texto original é obrigatório para o processamento');
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'reading.webm');
  formData.append('original_text', originalText);
  if (studentGrade) formData.append('student_grade', studentGrade);
  if (targetPCM) formData.append('target_pcm', targetPCM.toString());
  if (history) formData.append('history', JSON.stringify(history));
  if (duration) formData.append('duration', duration.toString());
  if (isForeigner) formData.append('is_foreigner', 'true');

  const response = await fetch('/api/process-audio', {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erro no processamento do áudio');
  }

  return response.json();
};

export const saveAvaliacao = async (avaliacao: Omit<Avaliacao, 'id' | 'professorId'>): Promise<string | null> => {
  if (!cachedDb || !cachedAuth) return null;
  try {
    const currentUser = cachedAuth.currentUser;
    if (!currentUser) throw new Error("Usuário não autenticado");

    const docRef = await addDoc(collection(cachedDb, 'avaliacoes'), {
      ...avaliacao,
      professorId: currentUser.uid,
      data: avaliacao.data || Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao salvar avaliação:", error);
    return null;
  }
};

export const getAvaliacoesPorAluno = async (alunoId: string): Promise<Avaliacao[]> => {
  if (!cachedDb) return [];
  try {
    const q = query(
      collection(cachedDb, 'avaliacoes'),
      where('alunoId', '==', alunoId)
    );
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Avaliacao));

    // Ordenação manual por data decrescente
    return results.sort((a, b) => {
      const dateA = (a.data as any)?.seconds || 0;
      const dateB = (b.data as any)?.seconds || 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Erro ao buscar avaliações do aluno:", error);
    return [];
  }
};

export const getAllAvaliacoes = async (): Promise<Avaliacao[]> => {
  if (!cachedDb) return [];
  try {
    const q = query(
      collection(cachedDb, 'avaliacoes')
    );
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Avaliacao));

    // Ordenação manual por data decrescente
    return results.sort((a, b) => {
      const dateA = (a.data as any)?.seconds || 0;
      const dateB = (b.data as any)?.seconds || 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Erro ao buscar todas as avaliações:", error);
    return [];
  }
};

export const getAvaliacaoById = async (id: string): Promise<Avaliacao | null> => {
  if (!cachedDb) return null;
  try {
    const docRef = doc(cachedDb, 'avaliacoes', id);
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