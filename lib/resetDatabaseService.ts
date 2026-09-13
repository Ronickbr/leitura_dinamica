import { collection, getDocs, writeBatch, Firestore } from 'firebase/firestore';
import { logDetailed, IS_DEV } from './errorUtils';

const FILE_NAME = 'resetDatabaseService.ts';
const ALLOWED_DEV_COLLECTIONS = new Set(['alunos', 'avaliacoes', 'import_history', 'student_private']);
const BATCH_LIMIT = 400;

export async function resetDatabase(
  db: Firestore,
  collectionsToClear: string[],
  userId?: string,
): Promise<boolean> {
  if (!IS_DEV) {
    logDetailed({
      level: 'warn',
      message: 'Reset de banco bloqueado em produção por política de proteção de dados.',
      fileName: FILE_NAME,
      methodName: 'resetDatabase',
      userId,
    });
    return false;
  }

  if (!db || !Array.isArray(collectionsToClear) || collectionsToClear.length === 0) return false;

  const collections = Array.from(new Set(collectionsToClear.map((name) => name.trim()).filter(Boolean)));
  if (collections.some((name) => !ALLOWED_DEV_COLLECTIONS.has(name))) {
    logDetailed({
      level: 'warn',
      message: 'Reset de desenvolvimento rejeitado por coleção fora da allowlist.',
      fileName: FILE_NAME,
      methodName: 'resetDatabase',
      userId,
    });
    return false;
  }

  try {
    for (const collectionName of collections) {
      const snapshot = await getDocs(collection(db, collectionName));
      let batch = writeBatch(db);
      let count = 0;

      for (const item of snapshot.docs) {
        batch.delete(item.ref);
        count += 1;
        if (count >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) await batch.commit();
    }
    return true;
  } catch (error) {
    logDetailed({
      level: 'error',
      message: 'Falha no reset de desenvolvimento.',
      fileName: FILE_NAME,
      methodName: 'resetDatabase',
      userId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
