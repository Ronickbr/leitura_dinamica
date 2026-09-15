import { apiRequest } from "./apiClient";

export interface AdminAccount {
  email: string;
  displayName?: string | null;
  active: boolean;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  protected: boolean;
}

export async function getAdmins() {
  return (await apiRequest<{ items: AdminAccount[] }>("/api/admin/users")).items;
}

export async function createAdmin(email: string) {
  return apiRequest<{ email: string }>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function setAdminActive(email: string, active: boolean) {
  return apiRequest<{ email: string; active: boolean }>("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify({ email, active }),
  });
}
