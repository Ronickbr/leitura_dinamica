import fs from "fs";
import OpenAI from "openai";
import { APIError, APIConnectionError, AuthenticationError, BadRequestError, RateLimitError, NotFoundError, ConflictError, UnprocessableEntityError, InternalServerError } from "openai/error";
import { calculatePCM, getPerformanceLevel, getNormaNacional, type AlignmentResult, type DetalheAlinhamento } from "./pcmUtils";
import { logDetailed, DetailedError, IS_DEV } from "./errorUtils";

const FILE_NAME = "analysisService.ts";
const MAX_ORIGINAL_TEXT_LENGTH = 10000;
const MAX_AUDIO_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const OPENAI_TIMEOUT_MS = 120_000; // 2 minutos

const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 30_000;
const RETRY_JITTER_RATIO = 0.3;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractRetryAfterMs(error: unknown): number | null {
  const headers = (error as any)?.headers;
  if (!headers) return null;
  const retryAfterSec =
    headers["retry-after"] ??
    headers["Retry-After"];
  if (retryAfterSec !== undefined && retryAfterSec !== null) {
    const parsed = Number(retryAfterSec);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.min(parsed * 1000, RETRY_MAX_DELAY_MS);
    }
  }
  const rateLimitReset =
    headers["x-ratelimit-reset-requests"] ??
    headers["X-RateLimit-Reset-Requests"] ??
    headers["x-ratelimit-reset-tokens"] ??
    headers["X-RateLimit-Reset-Tokens"];
  if (rateLimitReset && typeof rateLimitReset === "string") {
    try {
      const match = rateLimitReset.match(/(\d+(?:\.\d+)?)\s*s/);
      if (match) {
        const secs = Number(match[1]);
        if (!Number.isNaN(secs) && secs > 0) {
          return Math.min(Math.ceil(secs * 1000), RETRY_MAX_DELAY_MS);
        }
      }
    } catch {}
  }
  return null;
}

function computeBackoffDelay(attempt: number, retryAfterMs: number | null): number {
  if (retryAfterMs !== null) {
    const jitter = retryAfterMs * RETRY_JITTER_RATIO * (Math.random() * 2 - 1);
    return Math.min(Math.max(retryAfterMs + jitter, RETRY_BASE_DELAY_MS), RETRY_MAX_DELAY_MS);
  }
  const exponential = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
  const jitter = exponential * RETRY_JITTER_RATIO * (Math.random() * 2 - 1);
  return Math.min(Math.max(exponential + jitter, RETRY_BASE_DELAY_MS), RETRY_MAX_DELAY_MS);
}

interface WithRetryContext {
  operationName: string;
  fileName: string;
  methodName: string;
  lineNumber: number;
  userId?: string;
  extraData?: Record<string, unknown>;
  maxAttempts?: number;
}

async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  context: WithRetryContext
): Promise<T> {
  const maxAttempts = context.maxAttempts ?? RETRY_MAX_ATTEMPTS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        logDetailed({
          level: "info",
          message: `[Retry ${attempt}/${maxAttempts}] Executando nova tentativa para: ${context.operationName}`,
          fileName: context.fileName,
          methodName: context.methodName,
          lineNumber: context.lineNumber,
          userId: context.userId,
          extraData: { ...context.extraData, attempt, maxAttempts }
        });
      }
      return await operation(attempt);
    } catch (error: unknown) {
      lastError = error;
      const classification = classifyOpenAIError(error);

      if (!classification.retryable || attempt >= maxAttempts) {
        throw error;
      }

      const retryAfterMs = extractRetryAfterMs(error);
      const delayMs = computeBackoffDelay(attempt, retryAfterMs);
      const originalName = error instanceof Error ? error.name : "UnknownError";
      const originalMessage = error instanceof Error ? error.message : String(error);
      const httpStatus = (error as any)?.status ?? (error as any)?.code ?? null;

      logDetailed({
        level: "warn",
        message: `[Retry ${attempt}/${maxAttempts}] Erro retryable detectado em ${context.operationName}. Aguardando ${Math.round(delayMs)}ms antes da próxima tentativa.`,
        fileName: context.fileName,
        methodName: context.methodName,
        lineNumber: context.lineNumber,
        userId: context.userId,
        errorName: originalName,
        errorMessage: originalMessage,
        extraData: {
          ...context.extraData,
          attempt,
          maxAttempts,
          categoria: classification.category,
          retryable: classification.retryable,
          httpStatus,
          delayMs: Math.round(delayMs),
          retryAfterHeaderMs: retryAfterMs,
          nextAttemptAt: new Date(Date.now() + delayMs).toISOString()
        }
      });

      await sleep(delayMs);
    }
  }

  throw lastError;
}

function sanitizeInput(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/<script|javascript:|on\w+=/gi, "")
    .slice(0, MAX_ORIGINAL_TEXT_LENGTH);
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    const err = new DetailedError({
      userMessage: `Falha de configuração do sistema. A variável de ambiente obrigatória ${name} não foi configurada no servidor.\nArquivo: analysisService.ts\nMétodo: getRequiredEnv()`,
      fileName: FILE_NAME,
      methodName: "getRequiredEnv",
      lineNumber: 28,
      httpCode: 500,
      extraData: {
        variavelFaltante: name,
        checkList: [
          `Adicione ${name}=<valor> no arquivo .env.local do servidor`,
          `Verifique se ${name} está definido nas variáveis de ambiente do Vercel`,
          `Redeploy após a correção`
        ]
      }
    });
    logDetailed({
      level: "fatal",
      message: `Variável de ambiente obrigatória ausente: ${name}`,
      fileName: FILE_NAME,
      methodName: "getRequiredEnv",
      lineNumber: 28,
      errorName: err.name,
      errorMessage: err.message,
      stackTrace: err.stack,
      extraData: { envName: name }
    });
    throw err;
  }
  return value;
}

function createAIClients() {
  const methodName = "createAIClients";
  const lineNumber = 55;
  const apiKey = getRequiredEnv("OPENAI_API_KEY");
  const maskedKey = apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "(chave muito curta)";
  logDetailed({
    level: "info",
    message: "Inicializando cliente OpenAI",
    fileName: FILE_NAME,
    methodName,
    lineNumber,
    extraData: { apiKeyMasked: maskedKey, keyLength: apiKey.length }
  });
  return {
    openai: new OpenAI({
      apiKey,
      timeout: OPENAI_TIMEOUT_MS
    }),
  };
}

function getFallbackAnalysis(reason: string, errorContext?: Record<string, unknown>) {
  logDetailed({
    level: "warn",
    message: `Usando análise de fallback. Motivo: ${reason}`,
    fileName: FILE_NAME,
    methodName: "getFallbackAnalysis",
    extraData: errorContext
  });
  return {
    diagnostico: `Análise IA indisponível. Motivo: ${reason}. Revise a gravação manualmente.`,
    intervencao: "Retornar à leitura guiada e repetir a avaliação quando o serviço de IA estiver disponível.",
    metricas_qualitativas: {
      leitura_precisa: false,
      leitura_precisa_justificativa: "Análise automática indisponível (fallback ativado).",
      leitura_silabada: false,
      leitura_silabada_justificativa: "Sem dados suficientes da IA.",
      boa_entonacao: false,
      boa_entonacao_justificativa: "Sem dados suficientes da IA.",
      interpretacao: false,
      interpretacao_justificativa: "Sem dados suficientes da IA.",
      pontuacao: false,
      pontuacao_justificativa: "Sem dados suficientes da IA.",
    },
    padrao_de_erro_detectado: `indisponivel (${reason})`,
    nivel_de_confianca: 0,
    perguntas_compreensao: [],
    _fallbackReason: reason,
    _fallbackContext: errorContext
  };
}

function parseAnalysisPayload(content: string) {
  const methodName = "parseAnalysisPayload";
  const lineNumber = 107;
  try {
    if (content === undefined || content === null) {
      throw new TypeError("Conteúdo JSON recebido é null ou undefined");
    }
    if (typeof content !== "string") {
      throw new TypeError(`Conteúdo recebido não é string. Tipo recebido: ${typeof content}`);
    }
    if (content.trim().length === 0) {
      throw new SyntaxError("Conteúdo JSON recebido é uma string vazia.");
    }
    return JSON.parse(content);
  } catch (parseError: unknown) {
    const originalName = parseError instanceof Error ? parseError.name : "UnknownError";
    const originalMessage = parseError instanceof Error ? parseError.message : String(parseError);
    const originalStack = parseError instanceof Error ? parseError.stack : undefined;
    const contentPreview = typeof content === "string" ? (content.length > 500 ? `${content.substring(0, 500)}... (${content.length} chars total)` : content) : String(content);

    logDetailed({
      level: "error",
      message: `Falha ao fazer parse do JSON de análise pedagógica: ${originalMessage}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: originalStack,
      extraData: {
        contentLength: typeof content === "string" ? content.length : -1,
        contentPreview,
        isSyntaxError: originalName === "SyntaxError"
      }
    });

    return getFallbackAnalysis(`falha no parse JSON (${originalName})`, {
      contentLength: typeof content === "string" ? content.length : -1,
      errorType: originalName
    });
  }
}

function generateMarkedTranscription(alignment: any[]): string {
  const methodName = "generateMarkedTranscription";
  if (!alignment || !Array.isArray(alignment)) {
    logDetailed({
      level: "warn",
      message: `Alignment inválido recebido em ${methodName} (tipo=${typeof alignment}, isArray=${Array.isArray(alignment)}). Retornando string vazia.`,
      fileName: FILE_NAME,
      methodName,
      extraData: { alignmentType: typeof alignment, isNull: alignment === null, isUndefined: alignment === undefined }
    });
    return "";
  }
  try {
    return alignment.map((d, idx) => {
      if (!d || typeof d !== "object") {
        logDetailed({ level: "warn", message: `Item inválido no alignment (índice ${idx})`, fileName: FILE_NAME, methodName, extraData: { index: idx, item: d } });
        return "";
      }
      const original = d.originalTokens || d.original || "";
      const lido = d.lidoTokens || d.lido || "";
      if (d.tipo === "match" || d.tipo === "acceptable") return original;
      if (d.tipo === "substitution") return `[${original}](${lido})`;
      if (d.tipo === "deletion") return `[${original}]`;
      if (d.tipo === "insertion") return `(${lido})`;
      if (d.tipo === "unread") return "";
      return "";
    }).join(" ").replace(/\s+/g, " ").trim();
  } catch (mapError: unknown) {
    const originalName = mapError instanceof Error ? mapError.name : "UnknownError";
    const originalMessage = mapError instanceof Error ? mapError.message : String(mapError);
    logDetailed({
      level: "error",
      message: `Erro ao gerar transcrição marcada: ${originalMessage}`,
      fileName: FILE_NAME,
      methodName,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: mapError instanceof Error ? mapError.stack : undefined,
      extraData: { alignmentLength: alignment.length }
    });
    return "";
  }
}

function isHardAlignmentError(detail: DetalheAlinhamento) {
  return detail?.tipo === "substitution" || detail?.tipo === "deletion" || detail?.tipo === "insertion";
}

function isRepeatedInsertion(detail: DetalheAlinhamento, previous?: DetalheAlinhamento, next?: DetalheAlinhamento) {
  if (!detail || detail.tipo !== "insertion") return false;
  const inserted = (detail.lidoTokens || detail.lido || "").trim().toLowerCase();
  const previousToken = (previous?.lidoTokens || previous?.originalTokens || previous?.lido || previous?.original || "").trim().toLowerCase();
  const nextToken = (next?.originalTokens || next?.lidoTokens || next?.original || next?.lido || "").trim().toLowerCase();
  return inserted !== "" && (inserted === previousToken || inserted === nextToken);
}

function buildRealErrorItems(details: DetalheAlinhamento[], maxItems = 3) {
  const methodName = "buildRealErrorItems";
  if (!details || !Array.isArray(details)) {
    logDetailed({ level: "warn", message: "details inválido passado para buildRealErrorItems", fileName: FILE_NAME, methodName, extraData: { type: typeof details } });
    return [];
  }
  const items: string[] = [];
  details.forEach((detail, index) => {
    if (!detail || !isHardAlignmentError(detail) || items.length >= maxItems) return;
    const original = detail.originalTokens || detail.original || "";
    const read = detail.lidoTokens || detail.lido || "";
    if (detail.tipo === "substitution" && original && read) {
      items.push(`troca de "${original}" por "${read}"`);
      return;
    }
    if (detail.tipo === "deletion" && original) {
      items.push(`omissão de "${original}"`);
      return;
    }
    if (detail.tipo === "insertion" && read) {
      const previous = details[index - 1];
      const next = details[index + 1];
      items.push(`${isRepeatedInsertion(detail, previous, next) ? "repetição" : "inserção"} de "${read}"`);
    }
  });
  return items;
}

function buildConciseDiagnostic(metrics: AlignmentResult) {
  const realErrorItems = buildRealErrorItems(metrics?.detalhes || []);
  if (realErrorItems.length === 0) return "Sem erros reais de leitura detectados.";
  const hardErrorDetails = (metrics?.detalhes || []).filter(isHardAlignmentError).length;
  const remaining = hardErrorDetails - realErrorItems.length;
  const suffix = remaining > 0 ? ` e mais ${remaining} ocorrência(s).` : ".";
  return `Erros reais detectados: ${realErrorItems.join("; ")}${suffix}`;
}

function buildConciseIntervention(metrics: AlignmentResult) {
  const realErrorItems = buildRealErrorItems(metrics?.detalhes || [], 2);
  if (realErrorItems.length === 0) return "Sem intervenção corretiva imediata.";
  return `Retomar a leitura guiada com foco em ${realErrorItems.join(" e ")}.`;
}

function applyDeterministicValidation(
  analysis: any,
  metrics: AlignmentResult
) {
  const hasRealErrors = (metrics?.erros || 0) > 0;
  const conciseDiagnostic = buildConciseDiagnostic(metrics);
  const conciseIntervention = buildConciseIntervention(metrics);
  const realErrorItems = buildRealErrorItems(metrics?.detalhes || [], 3);

  const metricasQualitativas = {
    leitura_precisa: !hasRealErrors,
    leitura_precisa_justificativa: hasRealErrors
      ? conciseDiagnostic
      : "A leitura não apresentou trocas, omissões ou repetições indevidas.",
    ...(analysis?.metricas_qualitativas || {})
  };

  return {
    diagnostico: conciseDiagnostic,
    intervencao: conciseIntervention,
    padrao_de_erro_detectado: hasRealErrors ? analysis?.padrao_de_erro_detectado || "lexical" : "nenhum",
    analise_evolucao: analysis?.analise_evolucao ? String(analysis.analise_evolucao).slice(0, 200) : undefined,
    nivel_de_confianca: hasRealErrors ? Math.max(Number(analysis?.nivel_de_confianca) || 0, 75) : Math.max(Number(analysis?.nivel_de_confianca) || 0, 90),
    perguntas_compreensao: Array.isArray(analysis?.perguntas_compreensao) ? analysis.perguntas_compreensao.slice(0, 3) : [],
    metricas_qualitativas: metricasQualitativas,
    resumo_erros_reais: realErrorItems,
    variacoes_aceitas: metrics?.variacoes_aceitas || 0
  };
}

function buildTranscriptionPrompt(originalText: string, studentGrade?: string): string {
  const normalizedGrade = studentGrade?.trim() || "3º ano";
  const gradeGuidance = normalizedGrade.includes("3")
    ? "3º Ano: foco em decodificação silábica. Espere pausas longas e transcrições mais fragmentadas."
    : "4º e 5º Ano: foco em entonação e ritmo. Mantenha rigor na separação de termos compostos e adjacências de vírgulas.";

  return [
    "Você é um especialista em transcrição fonética e análise de fluência leitora para crianças do Ensino Fundamental I (3º ao 5º ano).",
    "Sua tarefa é transcrever exatamente o que o aluno diz, sem corrigir erros gramaticais, sem preencher lacunas e mantendo a individualidade de cada palavra.",
    'Evite aglutinações. Exemplo: transcreva "lançavam bolas" e nunca "lançavambolas".',
    "",
    "Diretrizes de transcrição:",
    "- Fidelidade literal: transcreva exatamente as hesitações, pausas e repetições.",
    "- Se o aluno substituir uma palavra, registre a palavra dita, não a palavra correta.",
    "- Segmentação estrita: mantenha espaços claros entre as palavras.",
    "- Se houver dúvida entre uma palavra longa ou duas curtas, priorize a separação com base no texto original de referência.",
    "- Pontuação: use pontuação para marcar pausas respiratórias do aluno, mesmo que não coincidam com a pontuação gramatical do texto.",
    "",
    "Tratamento por nível:",
    `- ${gradeGuidance}`,
    "",
    "Informações de referência:",
    `- Série do aluno: ${normalizedGrade}`,
    `- Texto base para comparação: "${originalText}"`,
    "",
    "Inicie a transcrição agora.",
    "Não adicione comentários explicativos.",
    "Retorne somente a transcrição fiel ao áudio."
  ].join("\n");
}

function classifyOpenAIError(error: unknown): { category: string; userMessage: string; retryable: boolean; fieldName?: string; fieldValue?: unknown } {
  if (error instanceof AuthenticationError) {
    return {
      category: "AUTH",
      userMessage: `Chave de API da OpenAI inválida ou expirada (HTTP 401). Verifique a variável OPENAI_API_KEY no servidor.`,
      retryable: false,
      fieldName: "OPENAI_API_KEY"
    };
  }
  if (error instanceof RateLimitError) {
    return {
      category: "RATE_LIMIT",
      userMessage: `Limite de requisições/cota da OpenAI excedido (HTTP 429). Aguarde alguns minutos ou aumente a cota no painel da OpenAI.`,
      retryable: true
    };
  }
  if (error instanceof BadRequestError) {
    const msg = error.message || "Requisição inválida.";
    const isAudioTooLarge = msg.toLowerCase().includes("file") && msg.toLowerCase().includes("large");
    const isInvalidModel = msg.toLowerCase().includes("model") && msg.toLowerCase().includes("not found");
    return {
      category: "BAD_REQUEST",
      userMessage: isAudioTooLarge
        ? `Arquivo de áudio excede o limite da OpenAI (máx ~25MB). Reduza a duração ou tamanho do arquivo e tente novamente.`
        : isInvalidModel
          ? `Modelo GPT/Whisper solicitado não existe ou não está habilitado para sua conta. Verifique os modelos disponíveis no painel OpenAI.`
          : `Requisição inválida enviada à OpenAI (HTTP 400). Detalhe técnico: ${msg}`,
      retryable: false,
      fieldName: isAudioTooLarge ? "Arquivo de Áudio" : "Parâmetros da Requisição",
      fieldValue: isAudioTooLarge ? "tamanho excessivo" : undefined
    };
  }
  if (error instanceof NotFoundError) {
    return {
      category: "NOT_FOUND",
      userMessage: `Recurso da OpenAI não encontrado (HTTP 404). O modelo ou rota solicitada pode ter sido descontinuada.`,
      retryable: false
    };
  }
  if (error instanceof ConflictError) {
    return {
      category: "CONFLICT",
      userMessage: `Conflito na requisição OpenAI (HTTP 409). Tente novamente em alguns instantes.`,
      retryable: true
    };
  }
  if (error instanceof UnprocessableEntityError) {
    return {
      category: "UNPROCESSABLE",
      userMessage: `Conteúdo enviado à OpenAI não pôde ser processado (HTTP 422). Verifique o formato do arquivo e os parâmetros. Detalhe: ${error.message}`,
      retryable: false
    };
  }
  if (error instanceof InternalServerError) {
    return {
      category: "OPENAI_INTERNAL",
      userMessage: `Falha interna no servidor da OpenAI (HTTP 5xx). O serviço está temporariamente indisponível. Tente novamente em alguns minutos.`,
      retryable: true
    };
  }
  if (error instanceof APIConnectionError) {
    const msg = error.message || "";
    const isTimeout = msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("abort") || /ETIMEDOUT|ECONNRESET|ECONNREFUSED/.test(msg);
    return {
      category: "CONNECTION",
      userMessage: isTimeout
        ? `Tempo limite excedido ao conectar com a OpenAI (timeout). A requisição levou mais de ${Math.round(OPENAI_TIMEOUT_MS / 1000)}s. Tente com um áudio menor.`
        : `Falha de conexão com a API da OpenAI. Verifique a conexão de rede do servidor e tente novamente.`,
      retryable: true
    };
  }
  if (error instanceof APIError) {
    return {
      category: "API",
      userMessage: `Erro genérico da API OpenAI (HTTP ${(error as any).status ?? "?"}). Detalhe: ${error.message || "(sem mensagem)"}`,
      retryable: /^5/.test(String((error as any).status ?? ""))
    };
  }
  if (error instanceof TypeError && /fetch|network|socket/i.test(error.message || "")) {
    return {
      category: "NETWORK_TYPE",
      userMessage: `Falha de rede de baixo nível ao chamar OpenAI: ${error.message}`,
      retryable: true
    };
  }
  const msg = error instanceof Error ? error.message : String(error);
  return {
    category: "UNKNOWN",
    userMessage: `Erro inesperado ao chamar a OpenAI: ${msg}`,
    retryable: false
  };
}

async function getPedagogicalDiagnosis(
  openai: OpenAI,
  pcm: number,
  level: string,
  originalText: string,
  transcription: string,
  studentGrade?: string,
  targetPCM?: number,
  history?: any[],
  alignmentDetails?: any[],
  isForeigner?: boolean,
  isGlassesUser?: boolean
) {
  const methodName = "getPedagogicalDiagnosis";
  const lineNumber = 348;
  const startTime = Date.now();

  const gradeNorm = studentGrade ? getNormaNacional(studentGrade) : 80;
  const gradeContext = studentGrade ? `O aluno é do ${studentGrade}. A norma nacional esperada para esta série é de ${gradeNorm} PCM.` : "O aluno é do 3º ano (contexto padrão).";
  const targetContext = targetPCM ? `A meta individual definida para este aluno é de ${targetPCM} PCM.` : "";
  const foreignerContext = isForeigner ? "O aluno é estrangeiro (ex: falante de espanhol estudando no Brasil), considere que padrões fonológicos específicos podem ocorrer devido ao sotaque ou interferência da língua nativa." : "";
  const glassesContext = isGlassesUser ? "O aluno é usuário de óculos. Considere que dificuldades visuais (ex: pular linhas, trocar letras similares visualmente) podem estar relacionadas à acomodação visual ou necessidade de ajuste das lentes, além de fatores puramente fonológicos." : "";

  const historyContext = history && history.length > 0
    ? `HISTÓRICO DE EVOLUÇÃO (Últimas ${history.length} avaliações):
${history.map((h, i) => {
  try {
    const data = h.data?.seconds ? new Date(h.data.seconds * 1000).toLocaleDateString("pt-BR") : "(sem data)";
    return `  ${i + 1}. Data: ${data}, PCM: ${h.pcm ?? "?"}, Diagnóstico: ${(h.diagnosticoIA ?? "").substring(0, 120)}`;
  } catch {
    return `  ${i + 1}. (erro ao formatar item ${i})`;
  }
}).join("\n")}`
    : "Não há histórico de avaliações anteriores para este aluno.";

  const omissions = alignmentDetails?.filter(d => d?.tipo === "deletion").map((d: any) => d.original || d.originalTokens) || [];
  const substitutions = alignmentDetails?.filter(d => d?.tipo === "substitution").map((d: any) => `${d.original || d.originalTokens} -> ${d.lido || d.lidoTokens}`) || [];
  const insertions = alignmentDetails?.filter(d => d?.tipo === "insertion").map((d: any) => d.lido || d.lidoTokens) || [];
  const markedTranscription = generateMarkedTranscription(alignmentDetails || []);

  const alignmentContext = alignmentDetails
    ? `DETALHES DO ALINHAMENTO AUTOMÁTICO (ESTRUTURADO):
    - Palavras Omitidas (${omissions.length}): ${omissions.length > 0 ? omissions.slice(0, 50).join(", ") : "Nenhuma"}
    - Substituições Detectadas (${substitutions.length}): ${substitutions.length > 0 ? substitutions.slice(0, 50).join(", ") : "Nenhuma"}
    - Palavras Adicionadas/Extra (${insertions.length}): ${insertions.length > 0 ? insertions.slice(0, 50).join(", ") : "Nenhuma"}
    
    TRANSCRICÃO MARCADA (LEGENDA: [original](lido)=substituição, [original]=omissão, (lido)=inserção):
    "${markedTranscription.substring(0, 4000)}"`
    : "";

  const systemContent = "Você é uma psicopedagoga que responde estritamente em JSON, seguindo o formato solicitado.";
  const userContent = `
  Aja como uma psicopedagoga clínica especialista em alfabetização, neurociência da leitura e fluência leitora no Ensino Fundamental I.
  Sua missão é produzir uma análise diagnóstica precisa, objetiva e tecnicamente coerente com a leitura realizada pelo aluno.

  CONTEXTO GERAL:
  - Considere que a transcrição foi produzida com foco em fidelidade literal ao áudio, preservando hesitações, pausas, repetições e segmentação entre palavras.
  - Não normalize a leitura do aluno mentalmente. Analise o desempenho a partir do que foi efetivamente lido.
  - Quando houver divergência entre impressão geral e dados estruturados, priorize os dados estruturados.

  DADOS ESTRUTURADOS (PRIORIDADE MÁXIMA):
  Use estes dados como EVIDÊNCIA para suas conclusões. Se os dados mostram erros, você DEVE apontá-los.
  - PCM: ${pcm}
  - Classificação: ${level}
  - ${gradeContext}
  - ${targetContext}
  ${foreignerContext}
  ${glassesContext}

  DETALHES DO ALINHAMENTO (O que foi realmente lido vs original):
  ${alignmentContext}

  TEXTO ORIGINAL (primeiros 3000 chars): "${originalText.substring(0, 3000)}"
  TRANSCRICÃO BRUTA (Whisper - primeiros 3000 chars): "${transcription.substring(0, 3000)}"

  INSTRUÇÕES PARA O DIAGNÓSTICO:
  1. Acurácia: identifique apenas erros reais de leitura, como substituições, omissões ou repetições indevidas.
  2. Automaticidade: avalie se o PCM e a forma de leitura indicam fluidez, esforço de decodificação ou leitura silabada.
  3. Prosódia e Ritmo: use a transcrição e a pontuação registrada como indícios de pausas, entonação e cadência.
  4. Adequação à série: para 3º ano, observe com maior sensibilidade sinais de decodificação silábica; para 4º e 5º ano, seja mais rigorosa com fluidez, ritmo e precisão em palavras adjacentes.
  5. Comparação com histórico: ${historyContext.substring(0, 2500)}

  RESTRIÇÕES DE RIGOR CLÍNICO (MUITO IMPORTANTE):
  - Considere pausas breves, pequenas quebras de palavra e variações leves de transcrição como aceitáveis quando o alinhamento estrutural não indicar erro real.
  - Se houver palavras em [colchetes] na Transcrição Marcada, "leitura_precisa" DEVE ser false.
  - Se houver substituições [orig](lido), use exemplos concretos nas justificativas sempre que forem relevantes.
  - NÃO ignore os dados do alinhamento. Se o alinhamento mostra erro, o diagnóstico não pode descrever leitura perfeita.
  - Não invente capacidades que não possam ser inferidas dos dados fornecidos.
  - Seja empática com o aluno, mas tecnicamente rigorosa para apoiar a decisão pedagógica do professor.

  REQUISITOS DO FORMATO DE RESPOSTA (JSON):
  Você DEVE retornar EXATAMENTE este formato JSON:
  {
    "diagnostico": "Máximo de 2 frases curtas, focadas apenas em erros reais de leitura.",
    "intervencao": "Máximo de 1 frase curta e objetiva.",
    "metricas_qualitativas": {
      "leitura_precisa": true,
      "leitura_precisa_justificativa": "...",
      "leitura_silabada": true,
      "leitura_silabada_justificativa": "...",
      "boa_entonacao": true,
      "boa_entonacao_justificativa": "...",
      "interpretacao": true,
      "interpretacao_justificativa": "...",
      "pontuacao": true,
      "pontuacao_justificativa": "..."
    },
    "padrao_de_erro_detectado": "fonológico|visual|lexical|omissão|adivinhação|nenhum",
    "nivel_de_confianca": 85,
    "analise_evolucao": "1 linha curta comparando com histórico.",
    "perguntas_compreensao": [
      { "pergunta": "...", "resposta_esperada": "..." },
      { "pergunta": "...", "resposta_esperada": "..." },
      { "pergunta": "...", "resposta_esperada": "..." }
    ]
  }
  `;

  try {
    logDetailed({
      level: "info",
      message: "Solicitando diagnóstico pedagógico à OpenAI (gpt-4o, JSON mode)",
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      extraData: {
        pcm,
        level,
        studentGrade: studentGrade ?? "(padrão)",
        targetPCM: targetPCM ?? "(sem meta)",
        historyLength: history?.length ?? 0,
        alignmentDetailsLength: alignmentDetails?.length ?? 0,
        originalTextLength: originalText.length,
        transcriptionLength: transcription.length,
        promptTotalChars: systemContent.length + userContent.length
      }
    });

    const response = await withRetry(
      async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 1800,
        });
      },
      {
        operationName: "Diagnóstico Pedagógico (GPT-4o)",
        fileName: FILE_NAME,
        methodName,
        lineNumber: 664,
        userId: undefined,
        extraData: {
          pcm,
          studentGrade: studentGrade ?? "(padrão)",
          promptChars: userContent.length
        }
      }
    );

    const duracaoMs = Date.now() - startTime;
    const content = response?.choices?.[0]?.message?.content;
    const usage = response?.usage ? { prompt_tokens: response.usage.prompt_tokens, completion_tokens: response.usage.completion_tokens, total_tokens: response.usage.total_tokens } : undefined;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      logDetailed({
        level: "error",
        message: "OpenAI retornou conteúdo vazio no diagnóstico pedagógico.",
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        extraData: {
          duracaoMs,
          responseChoices: response?.choices?.length ?? 0,
          firstFinishReason: response?.choices?.[0]?.finish_reason ?? "(sem)",
          usage
        }
      });
      return getFallbackAnalysis("resposta vazia da OpenAI", { duracaoMs, finishReason: response?.choices?.[0]?.finish_reason });
    }

    logDetailed({
      level: "info",
      message: `Diagnóstico pedagógico recebido da OpenAI em ${duracaoMs}ms.`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      extraData: { duracaoMs, usage, contentLength: content.length }
    });

    return parseAnalysisPayload(content);
  } catch (error: unknown) {
    const duracaoMs = Date.now() - startTime;
    const classification = classifyOpenAIError(error);
    const originalName = error instanceof Error ? error.name : "UnknownError";
    const originalMessage = error instanceof Error ? error.message : String(error);
    const originalStack = error instanceof Error ? error.stack : undefined;
    const httpStatus = (error as any)?.status ?? (error as any)?.code ?? null;

    logDetailed({
      level: classification.retryable ? "warn" : "error",
      message: `Falha ao obter diagnóstico pedagógico da OpenAI [${classification.category}]${httpStatus ? ` (HTTP ${httpStatus})` : ""}: ${originalMessage}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: originalStack,
      extraData: {
        duracaoMs,
        categoriaErro: classification.category,
        retryable: classification.retryable,
        httpStatus,
        pcm,
        studentGrade: studentGrade ?? "(padrão)",
        promptChars: userContent.length
      }
    });

    return getFallbackAnalysis(`diagnóstico IA: ${classification.category.toLowerCase()}`, {
      categoria: classification.category,
      retryable: classification.retryable,
      duracaoMs,
      messageOriginal: originalMessage.substring(0, 300),
      statusHTTP: httpStatus
    });
  }
}

interface ProcessAudioParams {
  filePath: string;
  originalText: string;
  filename: string;
  studentGrade?: string;
  targetPCM?: number;
  history?: any[];
  duration?: number;
  isForeigner?: boolean;
  isGlassesUser?: boolean;
  userId?: string;
}

interface ProcessAudioResult {
  filename: string;
  pcm: number;
  duration: number;
  metrics: AlignmentResult;
  level: string;
  transcription: string;
  analysis: any;
}

export async function processReadingAudio(params: ProcessAudioParams): Promise<ProcessAudioResult> {
  const {
    filePath,
    originalText,
    filename,
    studentGrade,
    targetPCM,
    history,
    duration = 60,
    isForeigner,
    isGlassesUser,
    userId
  } = params;

  const methodName = "processReadingAudio";
  const lineNumber = 601;
  const sanitizedOriginalText = sanitizeInput(originalText);

  const parametersLog = {
    filename,
    filePath,
    originalTextLength: originalText?.length ?? 0,
    sanitizedTextLength: sanitizedOriginalText.length,
    studentGrade: studentGrade ?? "(padrão)",
    targetPCM: targetPCM ?? "(sem meta)",
    historyLength: history?.length ?? 0,
    durationSec: duration,
    isForeigner: !!isForeigner,
    isGlassesUser: !!isGlassesUser
  };

  logDetailed({
    level: "info",
    message: `Iniciando pipeline de processamento de leitura para arquivo "${filename}"`,
    fileName: FILE_NAME,
    methodName,
    lineNumber,
    userId: userId ?? undefined,
    parameters: parametersLog
  });

  if (!sanitizedOriginalText || sanitizedOriginalText.trim().length < 5) {
    const err = new DetailedError({
      userMessage: `Falha no processamento do áudio. Campo: Texto Original. Motivo: O texto original é obrigatório e está vazio, inválido ou muito curto (menos de 5 caracteres úteis após sanitização).\nValor recebido após sanitização: "${sanitizedOriginalText.substring(0, 100)}${sanitizedOriginalText.length > 100 ? "..." : ""}"\nTamanho recebido: ${originalText?.length ?? 0} caracteres.\nArquivo: analysisService.ts\nMétodo: processReadingAudio()`,
      fieldName: "Texto Original",
      fieldValue: originalText ? (originalText.length > 100 ? `${originalText.substring(0, 100)}...` : originalText) : "(vazio/nulo)",
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 400,
      userId
    });
    logDetailed({ level: "error", message: "Texto original inválido ou vazio em processReadingAudio", fileName: FILE_NAME, methodName, lineNumber, userId: userId ?? undefined, parameters: parametersLog, errorName: err.name, errorMessage: err.message });
    throw err;
  }

  if (!filePath || typeof filePath !== "string") {
    const err = new DetailedError({
      userMessage: `Falha no processamento do áudio. Campo: Caminho do Arquivo (filePath). Motivo: O caminho do arquivo temporário não foi informado ou tem tipo inválido.\nTipo recebido: ${typeof filePath}\nArquivo: analysisService.ts\nMétodo: processReadingAudio()`,
      fieldName: "Caminho do Arquivo",
      fieldValue: filePath ?? "(vazio/nulo)",
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 400,
      userId
    });
    logDetailed({ level: "error", message: "filePath inválido em processReadingAudio", fileName: FILE_NAME, methodName, lineNumber, userId: userId ?? undefined, parameters: parametersLog, errorName: err.name, errorMessage: err.message });
    throw err;
  }

  let fileStats: fs.Stats | null = null;
  try {
    fileStats = fs.statSync(filePath);
    if (!fileStats.isFile()) {
      throw new DetailedError({ userMessage: `O caminho informado não aponta para um arquivo regular (pode ser diretório ou outro tipo). Caminho: ${filePath}`, fieldName: "filePath", fieldValue: filePath, fileName: FILE_NAME, methodName, lineNumber, httpCode: 400 });
    }
    if (fileStats.size === 0) {
      throw new DetailedError({ userMessage: `Falha no processamento. Campo: Arquivo de Áudio. Motivo: O arquivo está com tamanho 0 bytes (vazio). Verifique se a gravação foi realizada corretamente.`, fieldName: "Arquivo de Áudio", fieldValue: `tamanho=0 bytes, arquivo=${filename}`, fileName: FILE_NAME, methodName, lineNumber, httpCode: 400, userId });
    }
    if (fileStats.size > MAX_AUDIO_FILE_SIZE_BYTES) {
      throw new DetailedError({
        userMessage: `Falha no processamento. Campo: Arquivo de Áudio. Motivo: O arquivo de áudio excede o limite máximo de ${Math.round(MAX_AUDIO_FILE_SIZE_BYTES / 1024 / 1024)}MB.\nTamanho recebido: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB.\nReduza a duração da gravação ou comprima o arquivo e tente novamente.`,
        fieldName: "Arquivo de Áudio",
        fieldValue: `${(fileStats.size / 1024 / 1024).toFixed(2)} MB`,
        fileName: FILE_NAME,
        methodName,
        lineNumber,
        httpCode: 413,
        userId
      });
    }
  } catch (statError: unknown) {
    if (statError instanceof DetailedError) {
      if (IS_DEV) throw statError;
      logDetailed({ level: "error", message: `Validação de arquivo falhou em processReadingAudio: ${statError.message}`, fileName: FILE_NAME, methodName, lineNumber, userId: userId ?? undefined, errorName: statError.name, errorMessage: statError.message });
      throw statError;
    }
    const originalName = statError instanceof Error ? statError.name : "UnknownError";
    const originalMessage = statError instanceof Error ? statError.message : String(statError);
    const isNotFound = /ENOENT|not found/i.test(originalMessage);
    const isPermission = /EACCES|permission/i.test(originalMessage);

    logDetailed({
      level: "error",
      message: `Falha ao acessar arquivo de áudio em disco (${isNotFound ? "NOT_FOUND" : isPermission ? "PERMISSION" : originalName}): ${originalMessage}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: userId ?? undefined,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: statError instanceof Error ? statError.stack : undefined,
      extraData: { filePath, isNotFound, isPermission }
    });

    throw new DetailedError({
      userMessage: isNotFound
        ? `Falha no processamento do áudio. Campo: Arquivo de Áudio. Motivo: O arquivo temporário não foi encontrado em disco (pode ter sido removido antes do processamento). Tente gravar novamente.`
        : isPermission
          ? `Falha no processamento do áudio. Campo: Arquivo de Áudio. Motivo: Permissão negada ao acessar o arquivo temporário no servidor. Contate o administrador.`
          : `Falha ao acessar o arquivo de áudio no servidor: ${originalMessage}.`,
      fieldName: "Arquivo de Áudio",
      fieldValue: filePath,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: isNotFound ? 404 : isPermission ? 403 : 500,
      userId,
      extraData: { erroOriginal: originalName }
    }, statError);
  }

  const { openai } = createAIClients();
  const transcriptionPrompt = buildTranscriptionPrompt(sanitizedOriginalText, studentGrade);

  let transcription: string;
  const whisperStart = Date.now();
  try {
    logDetailed({
      level: "info",
      message: `Enviando áudio para transcrição Whisper-1 (${(fileStats!.size / 1024).toFixed(1)} KB, duração alvo ~${duration}s)`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: userId ?? undefined,
      extraData: {
        fileSizeKB: Math.round(fileStats!.size / 1024),
        durationSec: duration,
        studentGrade: studentGrade ?? "(padrão)",
        promptLength: transcriptionPrompt.length,
        language: "pt"
      }
    });

    const transcriptionResponse = await withRetry(
      async () => {
        return await openai.audio.transcriptions.create({
          file: fs.createReadStream(filePath) as any,
          model: "whisper-1",
          language: "pt",
          prompt: transcriptionPrompt,
          temperature: 0,
          response_format: "json",
        });
      },
      {
        operationName: "Transcrição Whisper-1",
        fileName: FILE_NAME,
        methodName,
        lineNumber: 922,
        userId: userId ?? undefined,
        extraData: {
          fileSizeKB: Math.round(fileStats!.size / 1024),
          durationSec: duration,
          studentGrade: studentGrade ?? "(padrão)",
          promptLength: transcriptionPrompt.length
        }
      }
    );

    const whisperDuracaoMs = Date.now() - whisperStart;
    transcription = transcriptionResponse.text || "";

    logDetailed({
      level: "info",
      message: `Transcrição Whisper concluída em ${whisperDuracaoMs}ms. ${transcription.length} caracteres transcritos.`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: userId ?? undefined,
      extraData: {
        duracaoMs: whisperDuracaoMs,
        transcriptionLength: transcription.length,
        wordCountEstimate: transcription.trim().split(/\s+/).filter(Boolean).length
      }
    });
  } catch (whisperError: unknown) {
    const whisperDuracaoMs = Date.now() - whisperStart;
    const classification = classifyOpenAIError(whisperError);
    const originalName = whisperError instanceof Error ? whisperError.name : "UnknownError";
    const originalMessage = whisperError instanceof Error ? whisperError.message : String(whisperError);
    const httpStatus = (whisperError as any)?.status ?? null;

    logDetailed({
      level: classification.retryable ? "warn" : "error",
      message: `Falha na transcrição Whisper-1 [${classification.category}]${httpStatus ? ` (HTTP ${httpStatus})` : ""}: ${originalMessage}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: userId ?? undefined,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: whisperError instanceof Error ? whisperError.stack : undefined,
      extraData: {
        duracaoMs: whisperDuracaoMs,
        fileSizeBytes: fileStats!.size,
        categoria: classification.category,
        retryable: classification.retryable,
        statusHTTP: httpStatus
      }
    });

    throw new DetailedError({
      userMessage: `Falha na transcrição do áudio (Whisper API).\n${classification.userMessage}\nArquivo: analysisService.ts\nMétodo: processReadingAudio()\nDuração até a falha: ${whisperDuracaoMs}ms${httpStatus ? `\nCódigo HTTP: ${httpStatus}` : ""}`,
      fieldName: classification.fieldName,
      fieldValue: classification.fieldValue,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: httpStatus || 502,
      userId,
      extraData: { categoria: classification.category, duracaoMs: whisperDuracaoMs }
    }, whisperError);
  }

  let metrics: AlignmentResult;
  try {
    logDetailed({
      level: "debug",
      message: `Executando cálculo de PCM e alinhamento (original=${sanitizedOriginalText.length} chars, transcricao=${transcription.length} chars)`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: userId ?? undefined
    });
    metrics = calculatePCM(sanitizedOriginalText, transcription);
  } catch (alignError: unknown) {
    const originalName = alignError instanceof Error ? alignError.name : "UnknownError";
    const originalMessage = alignError instanceof Error ? alignError.message : String(alignError);
    const isRange = /range|out of bounds|index/i.test(originalMessage);
    const isMemory = /memory|heap|allocation/i.test(originalMessage);

    logDetailed({
      level: "error",
      message: `Falha no algoritmo de alinhamento/cálculo de PCM: ${originalMessage}`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: userId ?? undefined,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: alignError instanceof Error ? alignError.stack : undefined,
      extraData: {
        originalTokens: sanitizedOriginalText.trim().split(/\s+/).filter(Boolean).length,
        transcribedTokens: transcription.trim().split(/\s+/).filter(Boolean).length,
        isRangeError: isRange,
        isMemoryError: isMemory
      }
    });

    throw new DetailedError({
      userMessage: `Falha ao calcular métricas de leitura (PCM e alinhamento).\nMotivo: ${originalMessage}\nArquivo: analysisService.ts\nMétodo: calculatePCM() invocado por processReadingAudio()`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      httpCode: 500,
      userId,
      extraData: {
        categoria: isRange ? "INDEX_RANGE" : isMemory ? "MEMORY" : "ALGORITHM",
        tokensOriginal: sanitizedOriginalText.split(/\s+/).filter(Boolean).length,
        tokensTranscritos: transcription.split(/\s+/).filter(Boolean).length
      }
    }, alignError);
  }

  const effectiveDuration = Math.max(duration || 0, 1);
  const pcm = Math.round((metrics.corretas / effectiveDuration) * 60);
  const level = getPerformanceLevel(pcm);

  logDetailed({
    level: "info",
    message: `Métricas calculadas: PCM=${pcm}, Nível="${level}", Precisão=${metrics.precisao}%, Erros=${metrics.erros}, Variações aceitas=${metrics.variacoes_aceitas}, Alinhamentos=${metrics.detalhes.length}`,
    fileName: FILE_NAME,
    methodName,
    lineNumber,
    userId: userId ?? undefined,
    extraData: {
      pcm,
      level,
      precisao: metrics.precisao,
      erros: metrics.erros,
      corretas: metrics.corretas,
      totalOriginal: metrics.total_original,
      totalLido: metrics.total_lido,
      variacoesAceitas: metrics.variacoes_aceitas,
      duracaoEfetivaSec: effectiveDuration
    }
  });

  let analysis = await getPedagogicalDiagnosis(
    openai,
    pcm,
    level,
    sanitizedOriginalText,
    transcription,
    studentGrade,
    targetPCM,
    history,
    metrics.detalhes,
    isForeigner,
    isGlassesUser
  );

  const programmaticMarkedTranscription = generateMarkedTranscription(metrics.detalhes);
  const validatedAnalysis = applyDeterministicValidation(analysis, metrics);

  if (metrics.precisao < 20 && !isForeigner) {
    logDetailed({
      level: "warn",
      message: `Precisão muito baixa detectada (${metrics.precisao}%) sem indicação de aluno estrangeiro. Sobrescrevendo diagnóstico com aviso de qualidade.`,
      fileName: FILE_NAME,
      methodName,
      lineNumber,
      userId: userId ?? undefined,
      extraData: { precisao: metrics.precisao, isForeigner: !!isForeigner }
    });
    validatedAnalysis.diagnostico = "Alerta de qualidade: a transcrição ficou muito distante do texto de referência (precisão < 20%). Revise manualmente o áudio, o texto selecionado e a gravação (ruído, volume, microfone distante).";
  }

  return {
    filename: filename || "audio.webm",
    pcm,
    duration: effectiveDuration,
    metrics,
    level,
    transcription,
    analysis: {
      ...validatedAnalysis,
      transcricao_marcada: programmaticMarkedTranscription
    },
  };
}

export { MAX_ORIGINAL_TEXT_LENGTH, getFallbackAnalysis, classifyOpenAIError };
