export const IS_DEV = process.env.NODE_ENV !== "production";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface DetailedErrorOptions {
  userMessage?: string;
  operation?: string;
  fieldName?: string;
  campo?: string;
  fieldValue?: unknown;
  valorRecebido?: unknown;
  httpCode?: number;
  httpStatus?: number;
  endpoint?: string;
  fileName?: string;
  arquivo?: string;
  methodName?: string;
  metodo?: string;
  lineNumber?: number;
  userId?: string;
  extraData?: Record<string, unknown>;
}

export interface DetailedLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  userId?: string;
  methodName?: string;
  endpoint?: string;
  fileName?: string;
  lineNumber?: number;
  parameters?: Record<string, unknown>;
  extraData?: Record<string, unknown>;
  errorName?: string;
  errorMessage?: string;
  stackTrace?: string;
  httpCode?: number;
  httpStatusCode?: number;
}

const SENSITIVE_KEY = /(authorization|token|password|senha|secret|api.?key|private.?key|cookie|nome|name|email|cpf|rg|telefone|phone|endereco|address|observa|diagnost|transcri|original.?text|history|historico|intervenc|prompt|contentpreview|audio|filename|file.?name)/i;

function redactString(value: string): string {
  let result = value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL_REDACTED]");

  if (!IS_DEV && result.length > 240) {
    result = `${result.slice(0, 240)}…[TRUNCATED]`;
  }
  return result;
}

function sanitizeValue(value: unknown, key = "", depth = 0): unknown {
  if (depth > 5) return "[MAX_DEPTH]";
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const list = value.slice(0, 20).map((item) => sanitizeValue(item, key, depth + 1));
    if (value.length > 20) list.push(`[+${value.length - 20} itens]`);
    return list;
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(source).slice(0, 40)) {
      output[childKey] = sanitizeValue(childValue, childKey, depth + 1);
    }
    return output;
  }
  return String(value);
}

export function sanitizeForLog(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;
  return sanitizeValue(data) as Record<string, unknown>;
}

export class DetailedError extends Error {
  public readonly userMessage: string;
  public readonly operation?: string;
  public readonly fieldName?: string;
  public readonly campo?: string;
  public readonly fieldValue?: unknown;
  public readonly valorRecebido?: unknown;
  public readonly httpCode: number;
  public readonly httpStatus: number;
  public readonly endpoint?: string;
  public readonly fileName?: string;
  public readonly arquivo?: string;
  public readonly methodName?: string;
  public readonly metodo?: string;
  public readonly lineNumber?: number;
  public readonly originalError?: Error;
  public readonly userId?: string;
  public readonly extraData?: Record<string, unknown>;

  constructor(options: DetailedErrorOptions, originalError?: unknown) {
    const resolvedUserMessage = options.userMessage || (options.operation ? `Falha ao ${options.operation}.` : "Falha inesperada.");
    super(resolvedUserMessage);
    this.name = "DetailedError";
    this.userMessage = resolvedUserMessage;
    this.operation = options.operation;
    this.fieldName = options.fieldName ?? options.campo;
    this.campo = options.campo ?? options.fieldName;
    this.fieldValue = options.fieldValue ?? options.valorRecebido;
    this.valorRecebido = options.valorRecebido ?? options.fieldValue;
    this.httpCode = options.httpCode ?? options.httpStatus ?? 500;
    this.httpStatus = options.httpStatus ?? options.httpCode ?? 500;
    this.endpoint = options.endpoint;
    this.fileName = options.fileName ?? options.arquivo;
    this.arquivo = options.arquivo ?? options.fileName;
    this.methodName = options.methodName ?? options.metodo;
    this.metodo = options.metodo ?? options.methodName;
    this.lineNumber = options.lineNumber;
    this.userId = options.userId;
    this.extraData = options.extraData;

    if (originalError instanceof Error) {
      this.originalError = originalError;
      if (IS_DEV && originalError.stack) this.stack = originalError.stack;
    }
  }

  public toDisplayString(includeStack = IS_DEV): string {
    if (!IS_DEV) return this.userMessage;

    const parts: string[] = [this.userMessage];
    if (this.fieldName) parts.push(`Campo: ${this.fieldName}`);
    if (this.fieldValue !== undefined) parts.push(`Valor Recebido: ${String(sanitizeValue(this.fieldValue, this.fieldName || "field"))}`);
    if (this.fileName) parts.push(`Arquivo: ${this.fileName}`);
    if (this.lineNumber) parts.push(`Linha: ${this.lineNumber}`);
    if (this.methodName) parts.push(`Método: ${this.methodName}()`);
    if (this.endpoint) parts.push(`Endpoint: ${this.endpoint}`);
    if (this.httpCode) parts.push(`Código HTTP: ${this.httpCode}`);
    if (this.originalError) parts.push(`Exceção Original: [${this.originalError.name}] ${redactString(this.originalError.message)}`);
    if (includeStack && this.stack) parts.push(`Stack Trace:\n${this.stack}`);
    return parts.join("\n");
  }
}

export function logDetailed(entry: Omit<DetailedLogEntry, "timestamp">): void {
  // Em produção, INFO/DEBUG não são persistidos para reduzir coleta incidental de dados.
  if (!IS_DEV && (entry.level === "debug" || entry.level === "info")) return;

  const timestamp = new Date().toISOString();
  const httpCode = entry.httpStatusCode ?? entry.httpCode;
  const contextParts: string[] = [];

  if (entry.userId) contextParts.push(`UserRef: ${redactString(entry.userId)}`);
  if (entry.methodName) contextParts.push(`Method: ${entry.methodName}()`);
  if (entry.endpoint) contextParts.push(`Endpoint: ${entry.endpoint}${httpCode ? ` HTTP ${httpCode}` : ""}`);
  else if (httpCode) contextParts.push(`HTTP ${httpCode}`);
  if (entry.fileName) contextParts.push(`File: ${entry.fileName}${entry.lineNumber ? `:${entry.lineNumber}` : ""}`);

  const context = contextParts.length ? ` {${contextParts.join(" | ")}}` : "";
  const baseMessage = `[${timestamp}] [${entry.level.toUpperCase()}]${context} ${redactString(entry.message)}`;
  const parameters = sanitizeForLog(entry.parameters);
  const extraData = sanitizeForLog(entry.extraData);
  const safeErrorMessage = entry.errorMessage ? redactString(entry.errorMessage) : undefined;

  if (entry.level === "debug") console.debug(baseMessage, parameters ?? extraData ?? "");
  else if (entry.level === "info") console.info(baseMessage, parameters ?? extraData ?? "");
  else if (entry.level === "warn") console.warn(baseMessage, parameters ?? extraData ?? "");
  else {
    console.error(baseMessage);
    if (parameters) console.error("  Parâmetros:", JSON.stringify(parameters));
    if (extraData) console.error("  Dados Extras:", JSON.stringify(extraData));
    if (entry.errorName || safeErrorMessage) console.error(`  Exceção: [${entry.errorName || "Error"}] ${safeErrorMessage || ""}`);
    if (IS_DEV && entry.stackTrace) console.error(`  Stack:\n${entry.stackTrace}`);
  }
}

export function formatErrorForUser(error: unknown, context: Partial<DetailedErrorOptions> = {}): string {
  if (!IS_DEV) {
    if (error instanceof DetailedError) return error.userMessage;
    return context.userMessage || (context.operation ? `Falha ao ${context.operation}.` : "Não foi possível concluir a operação.");
  }

  if (error instanceof DetailedError) return error.toDisplayString(false);
  const resolvedField = context.fieldName ?? context.campo;
  const resolvedValue = context.fieldValue ?? context.valorRecebido;
  const resolvedFile = context.fileName ?? context.arquivo;
  const resolvedMethod = context.methodName ?? context.metodo;
  const resolvedHttp = context.httpStatus ?? context.httpCode;
  const resolvedUserMessage = context.userMessage || (context.operation ? `Falha ao ${context.operation}.` : "");

  if (error instanceof Error) {
    const parts: string[] = [resolvedUserMessage || redactString(error.message) || "Falha inesperada."];
    if (resolvedField) parts.push(`Campo: ${resolvedField}`);
    if (resolvedValue !== undefined) parts.push(`Valor Recebido: ${String(sanitizeValue(resolvedValue, resolvedField || "field"))}`);
    if (resolvedFile) parts.push(`Arquivo: ${resolvedFile}`);
    if (context.lineNumber) parts.push(`Linha: ${context.lineNumber}`);
    if (resolvedMethod) parts.push(`Método: ${resolvedMethod}()`);
    if (context.endpoint) parts.push(`Endpoint: ${context.endpoint}`);
    if (resolvedHttp) parts.push(`Código HTTP: ${resolvedHttp}`);
    parts.push(`Exceção Original: [${error.name}] ${redactString(error.message)}`);
    return parts.join("\n");
  }

  return resolvedUserMessage || "Falha inesperada durante a operação.";
}

export function handleServiceError<T>(
  operation: () => Promise<T>,
  context: {
    serviceName: string;
    methodName: string;
    fileName: string;
    fallbackValue: T;
    userId?: string;
    parameters?: Record<string, unknown>;
    validation?: () => { ok: boolean; message: string; field?: string; value?: unknown };
  }
): Promise<T> {
  return (async () => {
    if (context.validation) {
      const validationResult = context.validation();
      if (!validationResult.ok) {
        const err = new DetailedError({
          userMessage: `Falha de validação ao ${context.methodName}. ${validationResult.message}`,
          fieldName: validationResult.field,
          fieldValue: validationResult.value,
          fileName: context.fileName,
          methodName: context.methodName,
          userId: context.userId,
          httpCode: 400,
        });
        logDetailed({
          level: "warn",
          message: `Validação falhou em ${context.serviceName}.${context.methodName}.`,
          userId: context.userId,
          methodName: context.methodName,
          fileName: context.fileName,
          parameters: context.parameters,
        });
        throw err;
      }
    }

    try {
      return await operation();
    } catch (error) {
      logDetailed({
        level: "error",
        message: `Erro em ${context.serviceName}.${context.methodName}.`,
        userId: context.userId,
        methodName: context.methodName,
        fileName: context.fileName,
        parameters: context.parameters,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
      });
      if (IS_DEV) {
        throw new DetailedError({ userMessage: `Falha ao executar ${context.methodName}.`, fileName: context.fileName, methodName: context.methodName }, error);
      }
      return context.fallbackValue;
    }
  })();
}

export function formatFirebaseAuthError(errorCode: string): { userMessage: string; fieldName?: string } {
  switch (errorCode) {
    case "auth/invalid-email": return { userMessage: "O e-mail informado tem formato inválido.", fieldName: "Email" };
    case "auth/user-disabled": return { userMessage: "Esta conta foi desativada.", fieldName: "Conta" };
    case "auth/user-not-found": return { userMessage: "Credenciais inválidas.", fieldName: "Autenticação" };
    case "auth/wrong-password": return { userMessage: "Credenciais inválidas.", fieldName: "Autenticação" };
    case "auth/email-already-in-use": return { userMessage: "Este e-mail já está cadastrado.", fieldName: "Email" };
    case "auth/operation-not-allowed": return { userMessage: "Este método de autenticação não está habilitado.", fieldName: "Autenticação" };
    case "auth/weak-password": return { userMessage: "A senha é muito fraca.", fieldName: "Senha" };
    case "auth/network-request-failed": return { userMessage: "Falha de conexão. Tente novamente.", fieldName: "Conexão" };
    case "auth/too-many-requests": return { userMessage: "Muitas tentativas. Aguarde e tente novamente.", fieldName: "Autenticação" };
    default: return { userMessage: "Não foi possível autenticar o usuário.", fieldName: "Autenticação" };
  }
}

export function formatFirebaseFirestoreError(code: string): { userMessage: string; fieldName?: string } {
  switch (code) {
    case "permission-denied": return { userMessage: "Permissão negada para esta operação.", fieldName: "Permissões" };
    case "unavailable": return { userMessage: "Banco de dados temporariamente indisponível.", fieldName: "Conexão" };
    case "deadline-exceeded": return { userMessage: "A operação excedeu o tempo limite.", fieldName: "Timeout" };
    case "not-found": return { userMessage: "Registro não encontrado.", fieldName: "Documento" };
    case "already-exists": return { userMessage: "O registro já existe.", fieldName: "Duplicidade" };
    case "resource-exhausted": return { userMessage: "Limite de serviço temporariamente atingido.", fieldName: "Cota" };
    case "invalid-argument": return { userMessage: "Dados inválidos enviados ao banco.", fieldName: "Validação" };
    default: return { userMessage: "Não foi possível concluir a operação no banco de dados.", fieldName: "Firestore" };
  }
}

export function tryExtractFirebaseErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) return String((error as Record<string, unknown>).code);
  return null;
}
