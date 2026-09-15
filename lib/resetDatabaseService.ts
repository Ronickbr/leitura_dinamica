import { apiRequest } from "./apiClient";

export async function resetDatabase(collectionsToClear: string[]): Promise<boolean> {
  await apiRequest("/api/admin/reset", { method: "POST", body: JSON.stringify({ collections: collectionsToClear }) });
  return true;
}
