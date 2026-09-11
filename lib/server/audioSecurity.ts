import { Timestamp } from 'firebase-admin/firestore';
import { adminServices } from './firebaseAdmin';
export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function authenticateAudioRequest(authorization: string | null) {
  const bearer = authorization?.match(/^Bearer (\S+)$/);
  if (!bearer) throw new RequestError(401, 'Faça login para processar a leitura.');
  try { return await adminServices().auth.verifyIdToken(bearer[1], true); }
  catch (error) {
    const code = (error as { code?: string }).code;
    if (code?.startsWith('auth/') && code !== 'auth/internal-error') {
      throw new RequestError(401, 'Sua sessão expirou. Entre novamente.');
    }
    throw new RequestError(503, 'Autenticação temporariamente indisponível.');
  }
}
// Shared transaction prevents concurrent instances from bypassing user quotas.
export async function consumeAudioQuota(uid: string, now = Date.now()) {
  const { db } = adminServices();
  const ref = db.collection('_audio_quotas').doc(uid);
  await db.runTransaction(async transaction => {
    const data = (await transaction.get(ref)).data();
    const minute = Math.floor(now / 60_000), day = Math.floor(now / 86_400_000);
    const minuteCount = data?.minute === minute ? data.minuteCount : 0;
    const dayCount = data?.day === day ? data.dayCount : 0;
    if (minuteCount >= 5 || dayCount >= 100) throw new RequestError(429, 'Limite de análises atingido. Tente novamente mais tarde.');
    transaction.set(ref, { minute, day, minuteCount: minuteCount + 1, dayCount: dayCount + 1,
      expiresAt: Timestamp.fromMillis(now + 2 * 86_400_000) });
  });
}
