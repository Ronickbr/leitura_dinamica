import { apiRequest } from "./apiClient";

export type PrivacyRequestType = "withdraw_consent" | "delete_identifiable_data" | "access_information";

export async function createPrivacyRequest(input: { alunoId: string; type: PrivacyRequestType; note?: string }): Promise<string | null> {
  const result = await apiRequest<{ id: string }>("/api/privacy-requests", { method: "POST", body: JSON.stringify(input) });
  return result.id;
}
