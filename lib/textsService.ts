import { apiRequest } from "./apiClient";

export interface Texto {
  id: string;
  titulo: string;
  conteudo: string;
  numeroPalavras: number;
  serie: string;
  comDiagnostico?: boolean;
}

export async function getTextos(): Promise<Texto[]> {
  return (await apiRequest<{ items: Texto[] }>("/api/texts")).items;
}

export async function getTextoById(id: string): Promise<Texto | null> {
  if (!id?.trim()) return null;
  try { return await apiRequest<Texto>(`/api/texts/${encodeURIComponent(id)}`); }
  catch { return null; }
}

export async function addTexto(texto: Omit<Texto, "id">): Promise<string | null> {
  return (await apiRequest<{ id: string }>("/api/texts", { method: "POST", body: JSON.stringify(texto) })).id;
}

export async function updateTexto(id: string, data: Partial<Texto>): Promise<boolean> {
  await apiRequest(`/api/texts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
  return true;
}

export async function deleteTexto(id: string): Promise<boolean> {
  await apiRequest(`/api/texts/${encodeURIComponent(id)}`, { method: "DELETE" });
  return true;
}
