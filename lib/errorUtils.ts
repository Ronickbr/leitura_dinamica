const IS_DEV = process.env.NODE_ENV !== "production";

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
    const resolvedUserMessage =
      options.userMessage ||
      (options.operation ? `Falha ao ${options.operation}.` : "Falha inesperada.");
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
      if (originalError.stack && IS_DEV) {
        this.stack = originalError.stack;
      }
    }
  }

  public toDisplayString(includeStack = IS_DEV): string {
    const parts: string[] = [this.userMessage];

    if (this.fieldName) {
      parts.push(`Campo: ${this.fieldName}`);
      if (this.fieldValue !== undefined) {
        const safeValue = typeof this.fieldValue === "string" && this.fieldValue.length > 100
          ? `${this.fieldValue.substring(0, 100)}... (${this.fieldValue.length} caracteres)`
          : String(this.fieldValue);
        parts.push(`Valor Recebido: ${safeValue}`);
      }
    }

    if (this.fileName) {
      parts.push(`Arquivo: ${this.fileName}`);
    }

    if (this.lineNumber) {
      parts.push(`Linha: ${this.lineNumber}`);
    }

    if (this.methodName) {
      parts.push(`Método: ${this.methodName}()`);
    }

    if (this.endpoint) {
      parts.push(`Endpoint: ${this.endpoint}`);
    }

    if (this.httpCode) {
      parts.push(`Código HTTP: ${this.httpCode}`);
    }

    if (this.originalError) {
      parts.push(`Exceção Original: [${this.originalError.name}] ${this.originalError.message}`);
    }

    if (includeStack && this.stack) {
      parts.push(`Stack Trace:\n${this.stack}`);
    }

    return parts.join("\n");
  }
}

export function logDetailed(entry: Omit<DetailedLogEntry, "timestamp">): void {
  const fullEntry: DetailedLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  const timestamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;
  const contextParts: string[] = [];
  const httpCode = entry.httpStatusCode ?? entry.httpCode;

  if (entry.userId) contextParts.push(`User: ${entry.userId}`);
  if (entry.methodName) contextParts.push(`Method: ${entry.methodName}()`);
  if (entry.endpoint) contextParts.push(`Endpoint: ${entry.endpoint}${httpCode ? ` HTTP ${httpCode}` : ""}`);
  else if (httpCode) contextParts.push(`HTTP ${httpCode}`);
  if (entry.fileName) contextParts.push(`File: ${entry.fileName}${entry.lineNumber ? `:${entry.lineNumber}` : ""}`);

  const context = contextParts.length > 0 ? ` {${contextParts.join(" | ")}}` : "";

  const baseMessage = `${prefix}${context} ${entry.message}`;

  switch (entry.level) {
    case "debug":
      if (IS_DEV) console.debug(baseMessage, entry.parameters ?? entry.extraData ?? "");
      break;
    case "info":
      console.info(baseMessage, entry.parameters ?? entry.extraData ?? "");
      break;
    case "warn":
      console.warn(baseMessage, entry.parameters ?? entry.extraData ?? "");
      break;
    case "error":
    case "fatal":
      console.error(baseMessage);
      if (entry.parameters) console.error("  Parâmetros:", JSON.stringify(entry.parameters, null, 2));
      if (entry.extraData) console.error("  Dados Extras:", JSON.stringify(entry.extraData, null, 2));
      if (entry.errorName) console.error(`  Exceção: [${entry.errorName}] ${entry.errorMessage}`);
      if (IS_DEV && entry.stackTrace) console.error(`  Stack:\n${entry.stackTrace}`);
      break;
  }
}

export function formatErrorForUser(error: unknown, context: Partial<DetailedErrorOptions> = {}): string {
  if (error instanceof DetailedError) {
    return error.toDisplayString(false);
  }

  const resolvedField = context.fieldName ?? context.campo;
  const resolvedValue = context.fieldValue ?? context.valorRecebido;
  const resolvedFile = context.fileName ?? context.arquivo;
  const resolvedMethod = context.methodName ?? context.metodo;
  const resolvedHttp = context.httpStatus ?? context.httpCode;
  const resolvedUserMessage =
    context.userMessage ||
    (context.operation ? `Falha ao ${context.operation}.` : "");

  if (error instanceof Error) {
    const parts: string[] = [resolvedUserMessage || error.message || "Falha inesperada."];
    if (resolvedField) {
      parts.push(`Campo: ${resolvedField}`);
      if (resolvedValue !== undefined) {
        const safeValue =
          typeof resolvedValue === "string" && resolvedValue.length > 100
            ? `${resolvedValue.substring(0, 100)}... (${resolvedValue.length} caracteres)`
            : String(resolvedValue);
        parts.push(`Valor Recebido: ${safeValue}`);
      }
    }
    if (resolvedFile) parts.push(`Arquivo: ${resolvedFile}`);
    if (context.lineNumber) parts.push(`Linha: ${context.lineNumber}`);
    if (resolvedMethod) parts.push(`Método: ${resolvedMethod}()`);
    if (context.endpoint) parts.push(`Endpoint: ${context.endpoint}`);
    if (resolvedHttp) parts.push(`Código HTTP: ${resolvedHttp}`);
    parts.push(`Exceção Original: [${error.name}] ${error.message}`);
    return parts.join("\n");
  }

  return resolvedUserMessage || `Falha inesperada durante a operação. Erro bruto: ${String(error)}`;
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
        const detErr = new DetailedError(
          {
            userMessage: `Falha de validação ao ${context.methodName}.\nMotivo: ${validationResult.message}`,
            fieldName: validationResult.field,
            fieldValue: validationResult.value,
            fileName: context.fileName,
            methodName: context.methodName,
            userId: context.userId,
          },
          null
        );
        logDetailed({
          level: "warn",
          message: `Validação falhou em ${context.serviceName}.${context.methodName}: ${validationResult.message}`,
          userId: context.userId,
          methodName: context.methodName,
          fileName: context.fileName,
          parameters: context.parameters,
          extraData: { field: validationResult.field, value: validationResult.value },
        });
        throw detErr;
      }
    }

    try {
      return await operation();
    } catch (error: unknown) {
      const originalMessage = error instanceof Error ? error.message : String(error);
      const originalName = error instanceof Error ? error.name : "UnknownError";
      const originalStack = error instanceof Error ? error.stack : undefined;

      logDetailed({
        level: "error",
        message: `Erro em ${context.serviceName}.${context.methodName}: ${originalMessage}`,
        userId: context.userId,
        methodName: context.methodName,
        fileName: context.fileName,
        parameters: context.parameters,
        errorName: originalName,
        errorMessage: originalMessage,
        stackTrace: originalStack,
      });

      const detErr = new DetailedError(
        {
          userMessage: `Falha ao executar ${context.methodName}.\nMotivo: ${originalMessage}`,
          fileName: context.fileName,
          methodName: context.methodName,
          userId: context.userId,
        },
        error
      );

      if (IS_DEV) {
        throw detErr;
      }

      return context.fallbackValue;
    }
  })();
}

export function formatFirebaseAuthError(errorCode: string): { userMessage: string; fieldName?: string } {
  switch (errorCode) {
    case "auth/invalid-email":
      return { userMessage: "O e-mail informado tem um formato inválido. Verifique e tente novamente.", fieldName: "Email" };
    case "auth/user-disabled":
      return { userMessage: "Esta conta de usuário foi desativada. Entre em contato com o administrador.", fieldName: "Conta" };
    case "auth/user-not-found":
      return { userMessage: "Não existe usuário cadastrado com o e-mail informado.", fieldName: "Email" };
    case "auth/wrong-password":
      return { userMessage: "Senha incorreta. Verifique e tente novamente.", fieldName: "Senha" };
    case "auth/email-already-in-use":
      return { userMessage: "Este e-mail já está cadastrado no sistema.", fieldName: "Email" };
    case "auth/operation-not-allowed":
      return { userMessage: "Este método de autenticação não está habilitado.", fieldName: "Autenticação" };
    case "auth/weak-password":
      return { userMessage: "A senha é muito fraca. Use pelo menos 6 caracteres.", fieldName: "Senha" };
    case "auth/network-request-failed":
      return { userMessage: "Falha de conexão. Verifique sua internet e tente novamente.", fieldName: "Conexão" };
    case "auth/too-many-requests":
      return { userMessage: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.", fieldName: "Autenticação" };
    case "auth/popup-closed-by-user":
      return { userMessage: "Login cancelado. A janela de autenticação foi fechada.", fieldName: "Autenticação" };
    case "auth/cancelled-popup-request":
      return { userMessage: "Outra solicitação de login já está em andamento.", fieldName: "Autenticação" };
    default:
      return { userMessage: `Erro de autenticação: ${errorCode}`, fieldName: "Autenticação" };
  }
}

export function formatFirebaseFirestoreError(code: string): { userMessage: string; fieldName?: string } {
  switch (code) {
    case "permission-denied":
      return { userMessage: "Permissão negada ao acessar o banco de dados. Verifique suas credenciais e regras de segurança do Firestore.", fieldName: "Firestore / Permissões" };
    case "unavailable":
      return { userMessage: "Firestore temporariamente indisponível. Tente novamente em alguns instantes.", fieldName: "Conexão / Firestore" };
    case "deadline-exceeded":
      return { userMessage: "A operação no banco de dados expirou por tempo limite. Verifique sua conexão.", fieldName: "Timeout / Firestore" };
    case "not-found":
      return { userMessage: "O documento solicitado não foi encontrado no banco de dados.", fieldName: "Documento" };
    case "already-exists":
      return { userMessage: "O registro já existe no banco de dados.", fieldName: "Duplicidade" };
    case "resource-exhausted":
      return { userMessage: "Limite de cota do Firestore atingido. Tente novamente mais tarde.", fieldName: "Cota" };
    case "invalid-argument":
      return { userMessage: "Argumento inválido enviado ao Firestore. Verifique os dados informados.", fieldName: "Validação" };
    default:
      return { userMessage: `Erro no Firestore: [${code}]. Verifique as regras de segurança e permissões.`, fieldName: "Firestore" };
  }
}

export function tryExtractFirebaseErrorCode(error: unknown): string | null {
  if (error instanceof Error && "code" in (error as unknown as Record<string, unknown>)) {
    return String((error as unknown as Record<string, unknown>).code);
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as Record<string, unknown>).code);
  }
  return null;
}

export { IS_DEV };
