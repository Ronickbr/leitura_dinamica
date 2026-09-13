import { addDoc, collection, Firestore, Timestamp } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { logDetailed } from './errorUtils';

let dbRef: Firestore | null = null;
let authRef: Auth | null = null;

export function setPrivacyRequestFirebaseInstances(db: Firestore, auth: Auth) {
  dbRef = db;
  authRef = auth;
}

export type PrivacyRequestType = 'withdraw_consent' | 'delete_identifiable_data' | 'access_information';

export async function createPrivacyRequest(input: {
  alunoId: string;
  type: PrivacyRequestType;
  note?: string;
}): Promise<string | null> {
  const uid = authRef?.currentUser?.uid;
  if (!dbRef || !uid || !input.alunoId?.trim()) return null;

  try {
    const document = await addDoc(collection(dbRef, 'data_subject_requests'), {
      professorId: uid,
      alunoId: input.alunoId,
      type: input.type,
      note: input.note?.trim().slice(0, 300) || null,
      status: 'pending',
      requestedAt: Timestamp.now(),
    });

    logDetailed({
      level: 'warn',
      message: 'Solicitação de privacidade registrada para revisão administrativa.',
      fileName: 'privacyRequestsService.ts',
      methodName: 'createPrivacyRequest',
      userId: uid,
      extraData: { requestType: input.type },
    });

    return document.id;
  } catch (error) {
    logDetailed({
      level: 'error',
      message: 'Falha ao registrar solicitação de privacidade.',
      fileName: 'privacyRequestsService.ts',
      methodName: 'createPrivacyRequest',
      userId: uid,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
