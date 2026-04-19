import { collection, getDocs, writeBatch, Firestore } from 'firebase/firestore';

export async function resetDatabase(db: Firestore, collectionsToClear: string[]): Promise<boolean> {
    try {
        for (const coll of collectionsToClear) {
            const q = collection(db, coll);
            const querySnapshot = await getDocs(q);

            const batches = [];
            let currentBatch = writeBatch(db);
            let operationCount = 0;

            querySnapshot.forEach((document) => {
                currentBatch.delete(document.ref);
                operationCount++;

                if (operationCount === 500) {
                    batches.push(currentBatch.commit());
                    currentBatch = writeBatch(db);
                    operationCount = 0;
                }
            });

            if (operationCount > 0) {
                batches.push(currentBatch.commit());
            }

            await Promise.all(batches);
        }

        return true;
    } catch (error) {
        console.error("Erro ao resetar banco de dados:", error);
        return false;
    }
}
