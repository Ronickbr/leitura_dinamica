import crypto from "node:crypto";

const CERT_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const CACHE_TTL_MS = 60 * 60 * 1000;

let certCache: { expiresAt: number; certs: Record<string, string> } | null = null;

function decodeBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
}

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.certs;

  const response = await fetch(CERT_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Falha ao obter certificados públicos do Firebase (${response.status}).`);

  const certs = (await response.json()) as Record<string, string>;
  certCache = { expiresAt: Date.now() + CACHE_TTL_MS, certs };
  return certs;
}

export interface VerifiedFirebaseToken {
  uid: string;
  email?: string;
  admin?: boolean;
  [key: string]: unknown;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID não configurado no servidor.");

  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Token Firebase em formato inválido.");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(decodeBase64Url(encodedHeader).toString("utf8")) as { alg?: string; kid?: string };
  const payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8")) as Record<string, unknown>;

  if (header.alg !== "RS256" || !header.kid) throw new Error("Cabeçalho do token Firebase inválido.");

  const certs = await getGoogleCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error("Certificado público do token Firebase não encontrado.");

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const signatureValid = verifier.verify(cert, decodeBase64Url(encodedSignature));
  if (!signatureValid) throw new Error("Assinatura do token Firebase inválida.");

  const now = Math.floor(Date.now() / 1000);
  const exp = Number(payload.exp ?? 0);
  const iat = Number(payload.iat ?? 0);
  const aud = String(payload.aud ?? "");
  const iss = String(payload.iss ?? "");
  const sub = String(payload.sub ?? "");

  if (!exp || exp <= now) throw new Error("Token Firebase expirado.");
  if (!iat || iat > now + 300) throw new Error("Token Firebase com data de emissão inválida.");
  if (aud !== projectId) throw new Error("Audience do token Firebase inválida.");
  if (iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Issuer do token Firebase inválido.");
  if (!sub || sub.length > 128) throw new Error("Subject do token Firebase inválido.");

  return {
    ...payload,
    uid: sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    admin: payload.admin === true,
  };
}
