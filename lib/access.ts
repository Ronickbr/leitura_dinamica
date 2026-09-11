import { Auth } from 'firebase/auth';
import { where, QueryConstraint } from 'firebase/firestore';
export async function ownerConstraints(auth: Auth | null): Promise<QueryConstraint[]> {
  if (!auth?.currentUser) throw new Error('Faça login para carregar os dados.');
  const token = await auth.currentUser.getIdTokenResult();
  return token.claims.admin === true ? [] : [where('professorId', '==', auth.currentUser.uid)];
}
