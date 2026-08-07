import { collection, getDocs, writeBatch, Firestore, FirestoreError } from 'firebase/firestore';
import {
  logDetailed,
  formatFirebaseFirestoreError,
  tryExtractFirebaseErrorCode,
  DetailedError,
  IS_DEV
} from './errorUtils';

const FILE_NAME = 'resetDatabaseService.ts';
const FIRESTORE_BATCH_LIMIT = 500;

export async function resetDatabase(
  db: Firestore,
  collectionsToClear: string[],
  userId?: string
): Promise<boolean> {
  const methodName = 'resetDatabase';
  const lineNumber = 22;
  const parameters = {
    collectionsSolicitadas: collectionsToClear ?? [],
    totalCollections: collectionsToClear?.length ?? 0
  };

  logDetailed({
    level: 'warn',
    message: `Iniciando RESET DE BANCO (operação destrutiva!). Coleções selecionadas: ${collectionsToClear?.join(', ') || '(nenhuma)'}`,
    fileName: FILE_NAME,
    methodName,
    lineNumber,
    userId,
    parameters
  });

  if (!db) {
    const err = new DetailedError({
      userMessage: 'Falha ao resetar banco de dados. Instância Firestore (db) não fornecida ou inválida.\nArquivo: resetDatabaseService.ts\nMétodo: resetDatabase()',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 400,
      userId,
      extraData: { dbIsNull: db === null, dbIsUndefined: db === undefined }
    });
    logDetailed({ level: 'error', message: 'resetDatabase chamado sem instância Firestore válida', fileName: FILE_NAME, methodName, lineNumber, userId, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return false;
  }

  if (!collectionsToClear || !Array.isArray(collectionsToClear) || collectionsToClear.length === 0) {
    const err = new DetailedError({
      userMessage: 'Falha ao resetar banco de dados. Nenhuma coleção foi selecionada para limpeza.\nCampo: collectionsToClear.\nValor recebido: ' + (collectionsToClear === undefined ? 'undefined' : collectionsToClear === null ? 'null' : `array vazio (0 itens)`),
      fieldName: 'Coleções Selecionadas',
      fieldValue: collectionsToClear ?? '(vazio/nulo)',
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 400,
      userId
    });
    logDetailed({ level: 'warn', message: 'resetDatabase chamado sem coleções a limpar', fileName: FILE_NAME, methodName, lineNumber, userId, parameters, errorName: err.name, errorMessage: err.message });
    if (IS_DEV) throw err;
    return false;
  }

  let totalDocumentosExcluidos = 0;
  const colecoesProcessadas: Record<string, { docs: number; batches: number }> = {};

  for (const collName of collectionsToClear) {
    if (!collName || typeof collName !== 'string' || collName.trim().length === 0) {
      logDetailed({
        level: 'warn',
        message: `Nome de coleção inválido encontrado na lista; pulando entrada. Valor recebido: "${collName}" (tipo=${typeof collName})`,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        userId,
        parameters,
        extraData: { collectionNameRaw: collName }
      });
      continue;
    }

    let querySnapshot;
    try {
      const q = collection(db, collName);
      querySnapshot = await getDocs(q);
    } catch (readError: unknown) {
      const fbCode = tryExtractFirebaseErrorCode(readError);
      const formatted = fbCode ? formatFirebaseFirestoreError(fbCode) : null;
      const originalName = readError instanceof Error ? readError.name : 'UnknownError';
      const originalMessage = readError instanceof Error ? readError.message : String(readError);
      const originalStack = readError instanceof Error ? readError.stack : undefined;

      logDetailed({
        level: 'error',
        message: `Falha ao ler documentos da coleção "${collName}" para reset: ${formatted?.userMessage || originalMessage}`,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        userId,
        parameters: { ...parameters, collectionAtual: collName },
        errorName: originalName,
        errorMessage: originalMessage,
        stackTrace: originalStack,
        extraData: {
          firebaseErrorCode: fbCode,
          collection: collName,
          campo: formatted?.fieldName,
          operacao: 'getDocs (leitura para reset)'
        }
      });

      const combinedErr = new DetailedError({
        userMessage: `Falha ao ler a coleção "${collName}" antes da limpeza.\nMotivo: ${formatted?.userMessage || originalMessage}\nArquivo: resetDatabaseService.ts\nMétodo: resetDatabase()\nEtapa: Leitura de documentos da coleção.`,
        fieldName: formatted?.fieldName || `Coleção ${collName}`,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        userId,
        extraData: { firebaseErrorCode: fbCode, collection: collName }
      }, readError);

      if (IS_DEV) throw combinedErr;
      return false;
    }

    const totalDocsNaColecao = querySnapshot.size;
    const batches: Promise<void>[] = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    let batchesCriados = 0;

    logDetailed({
      level: 'info',
      message: `Coleção "${collName}": ${totalDocsNaColecao} documento(s) para excluir. Limite por batch: ${FIRESTORE_BATCH_LIMIT}.`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId,
      extraData: { collection: collName, totalDocs: totalDocsNaColecao }
    });

    for (const document of querySnapshot.docs) {
      try {
        currentBatch.delete(document.ref);
        operationCount++;
        totalDocumentosExcluidos++;

        if (operationCount === FIRESTORE_BATCH_LIMIT) {
          batchesCriados++;
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      } catch (batchErr: unknown) {
        const originalName = batchErr instanceof Error ? batchErr.name : 'UnknownError';
        const originalMessage = batchErr instanceof Error ? batchErr.message : String(batchErr);
        logDetailed({
          level: 'error',
          message: `Erro ao adicionar exclusão ao batch. Coleção="${collName}", DocID="${document.id}", batch=${batchesCriados + 1}, op=${operationCount}`,
          fileName: FILE_NAME,
          methodName,
          lineNumber,
          userId,
          errorName: originalName,
          errorMessage: originalMessage,
          stackTrace: batchErr instanceof Error ? batchErr.stack : undefined,
          extraData: { collection: collName, docId: document.id, batchNumber: batchesCriados + 1, opNumber: operationCount }
        });
        const combinedErr = new DetailedError({
          userMessage: `Falha ao agendar exclusão do documento ${document.id} da coleção "${collName}" no batch.\nMotivo: ${originalMessage}`,
          fieldName: `Documento ${collName}/${document.id}`,
          fileName: FILE_NAME,
          methodName,
          lineNumber,
          userId,
          extraData: { docId: document.id, collection: collName }
        }, batchErr);
        if (IS_DEV) throw combinedErr;
        return false;
      }
    }

    if (operationCount > 0) {
      batchesCriados++;
      batches.push(currentBatch.commit());
    }

    colecoesProcessadas[collName] = { docs: totalDocsNaColecao, batches: batchesCriados };

    if (batches.length > 0) {
      try {
        await Promise.all(batches);
      } catch (commitError: unknown) {
        const fbCode = tryExtractFirebaseErrorCode(commitError);
        const formatted = fbCode ? formatFirebaseFirestoreError(fbCode) : null;
        const originalName = commitError instanceof Error ? commitError.name : 'UnknownError';
        const originalMessage = commitError instanceof Error ? commitError.message : String(commitError);
        const originalStack = commitError instanceof Error ? commitError.stack : undefined;
        const isQuota = /quota|exhausted|rate|limit/i.test(originalMessage + (fbCode || ''));
        const isPermission = fbCode === 'permission-denied';

        logDetailed({
          level: 'error',
          message: `Falha ao executar batches da coleção "${collName}" (${batchesCriados} batch(es) para ${totalDocsNaColecao} docs): ${formatted?.userMessage || originalMessage}`,
          fileName: FILE_NAME,
          methodName,
          lineNumber,
          userId,
          errorName: originalName,
          errorMessage: originalMessage,
          stackTrace: originalStack,
          extraData: {
            firebaseErrorCode: fbCode,
            collection: collName,
            totalBatches: batchesCriados,
            docs: totalDocsNaColecao,
            isQuotaError: isQuota,
            isPermissionError: isPermission
          }
        });

        const combinedErr = new DetailedError({
          userMessage: `Falha ao executar exclusão em lote (batch write) da coleção "${collName}".\nMotivo: ${formatted?.userMessage || originalMessage}${isQuota ? '\nAtenção: O limite de 500 operações por batch ou a cota diária pode ter sido atingida.' : ''}${isPermission ? '\nAtenção: Verifique as regras de segurança do Firestore — seu usuário precisa de permissão de escrita/delete na coleção.' : ''}\nArquivo: resetDatabaseService.ts\nMétodo: resetDatabase()\nTotal de batches preparados: ${batchesCriados}`,
          fieldName: formatted?.fieldName || `Coleção ${collName} (Batch Commit)`,
          fileName: FILE_NAME,
          methodName,
          lineNumber,
          userId,
          extraData: {
            firebaseErrorCode: fbCode,
            collection: collName,
            batches: batchesCriados,
            limitePorBatch: FIRESTORE_BATCH_LIMIT,
            isQuota,
            isPermission
          }
        }, commitError);

        if (IS_DEV) throw combinedErr;
        return false;
      }
    }

    logDetailed({
      level: 'info',
      message: `Coleção "${collName}" limpa com sucesso. ${totalDocsNaColecao} documento(s) excluído(s) em ${batchesCriados} batch(es).`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId,
      extraData: { collection: collName, docsExcluidos: totalDocsNaColecao, batches: batchesCriados }
    });
  }

  logDetailed({
    level: 'warn',
    message: `RESET DE BANCO CONCLUÍDO. Total de ${totalDocumentosExcluidos} documento(s) excluído(s) em ${collectionsToClear.length} coleção(ões). Detalhes por coleção: ${JSON.stringify(colecoesProcessadas)}`,
    fileName: FILE_NAME,
    methodName,
    lineNumber,
    userId,
    extraData: { totalDocumentosExcluidos, colecoesProcessadas }
  });

  return true;
}
