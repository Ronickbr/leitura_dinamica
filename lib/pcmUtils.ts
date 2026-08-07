import { DetailedError, logDetailed } from "./errorUtils";

const STOP_WORDS = new Set([
    "a", "as", "o", "os", "um", "uma", "uns", "umas",
    "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
    "e", "ou", "que", "se", "por", "pra", "para", "com", "sem",
    "ao", "aos", "à", "às", "eu", "tu", "ele", "ela"
]);

const MAX_LEVENSHTEIN_LENGTH = 3000;
const MAX_PCM_TOKENS = 5000;
const FILE_NAME = "pcmUtils.ts";

const cleanText = (text: unknown): string => {
    if (text === null || text === undefined) return "";
    if (typeof text !== "string") {
        logDetailed({
            level: "warn",
            message: "cleanText recebeu tipo não-string, convertendo para string vazia",
            fileName: FILE_NAME,
            methodName: "cleanText",
            lineNumber: 23,
            extraData: { tipoRecebido: typeof text, valorPreview: String(text).slice(0, 100) }
        });
        return "";
    }
    if (text.length === 0) return "";
    try {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, "")
            .trim();
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "error",
            message: "Falha ao normalizar texto em cleanText",
            fileName: FILE_NAME,
            methodName: "cleanText",
            lineNumber: 40,
            extraData: { inputLength: text.length, inputPreview: text.slice(0, 200) },
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        return "";
    }
};

const countTokens = (value?: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value !== "string") {
        logDetailed({
            level: "warn",
            message: "countTokens recebeu tipo não-string",
            fileName: FILE_NAME,
            methodName: "countTokens",
            lineNumber: 58,
            extraData: { tipoRecebido: typeof value }
        });
        return 0;
    }
    if (value.length === 0) return 0;
    try {
        return value.split(/\s+/).filter(Boolean).length;
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "error",
            message: "Falha ao contar tokens",
            fileName: FILE_NAME,
            methodName: "countTokens",
            lineNumber: 74,
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        return 0;
    }
};

const levenshteinDistance = (source: string, target: string): number => {
    if (typeof source !== "string") {
        throw new DetailedError({
            userMessage: "Falha ao calcular distância de Levenshtein: origem inválida.",
            fieldName: "source",
            fieldValue: typeof source,
            fileName: FILE_NAME,
            methodName: "levenshteinDistance",
            lineNumber: 90
        });
    }
    if (typeof target !== "string") {
        throw new DetailedError({
            userMessage: "Falha ao calcular distância de Levenshtein: destino inválido.",
            fieldName: "target",
            fieldValue: typeof target,
            fileName: FILE_NAME,
            methodName: "levenshteinDistance",
            lineNumber: 99
        });
    }
    if (source === target) return 0;
    if (!source) return target.length;
    if (!target) return source.length;

    if (source.length > MAX_LEVENSHTEIN_LENGTH || target.length > MAX_LEVENSHTEIN_LENGTH) {
        logDetailed({
            level: "warn",
            message: "Texto muito grande para Levenshtein completo, usando aproximação por prefixo.",
            fileName: FILE_NAME,
            methodName: "levenshteinDistance",
            lineNumber: 114,
            extraData: {
                sourceLength: source.length,
                targetLength: target.length,
                limite: MAX_LEVENSHTEIN_LENGTH
            }
        });
        const maxLen = MAX_LEVENSHTEIN_LENGTH;
        const srcShort = source.slice(0, maxLen);
        const tgtShort = target.slice(0, maxLen);
        const diffLen = Math.abs(source.length - target.length);
        return computeLevenshteinMatrix(srcShort, tgtShort) + diffLen;
    }

    return computeLevenshteinMatrix(source, target);
};

const computeLevenshteinMatrix = (source: string, target: string): number => {
    const rows = source.length + 1;
    const cols = target.length + 1;

    try {
        const matrix: number[][] = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = new Array(cols);
            matrix[i][0] = i;
        }
        for (let j = 0; j < cols; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i < rows; i++) {
            for (let j = 1; j < cols; j++) {
                const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + substitutionCost
                );
            }
        }

        return matrix[source.length][target.length];
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        const isMemory = erro.message.includes("memory") || erro.message.includes("allocation") || erro instanceof RangeError;
        logDetailed({
            level: "error",
            message: isMemory
                ? "Estouro de memória ao criar matriz de Levenshtein"
                : "Erro inesperado no cálculo de Levenshtein",
            fileName: FILE_NAME,
            methodName: "computeLevenshteinMatrix",
            lineNumber: 160,
            parameters: { rows, cols, sourceLength: source.length, targetLength: target.length },
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        if (isMemory) {
            return Math.abs(source.length - target.length) + Math.floor(Math.max(source.length, target.length) * 0.3);
        }
        throw new DetailedError({
            userMessage: "Falha no cálculo de distância de edição.",
            fileName: FILE_NAME,
            methodName: "computeLevenshteinMatrix",
            lineNumber: 173,
            extraData: { rows, cols }
        }, erro);
    }
};

const getSimilarity = (source: string, target: string): number => {
    if (typeof source !== "string" || typeof target !== "string") {
        logDetailed({
            level: "warn",
            message: "getSimilarity recebeu tipo não-string, retornando 0",
            fileName: FILE_NAME,
            methodName: "getSimilarity",
            lineNumber: 186,
            extraData: { tipoSource: typeof source, tipoTarget: typeof target }
        });
        return 0;
    }
    const maxLength = Math.max(source.length, target.length);
    if (maxLength === 0) return 1;
    try {
        return 1 - levenshteinDistance(source, target) / maxLength;
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "error",
            message: "Falha ao calcular similaridade",
            fileName: FILE_NAME,
            methodName: "getSimilarity",
            lineNumber: 203,
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        return 0;
    }
};

const getLoosePhoneticKey = (token: string): string => {
    if (typeof token !== "string") {
        logDetailed({
            level: "warn",
            message: "getLoosePhoneticKey recebeu tipo não-string",
            fileName: FILE_NAME,
            methodName: "getLoosePhoneticKey",
            lineNumber: 218,
            extraData: { tipoRecebido: typeof token }
        });
        return "";
    }
    try {
        return token
            .replace(/h/g, "")
            .replace(/qu/g, "k")
            .replace(/gu/g, "g")
            .replace(/ss/g, "s")
            .replace(/xc/g, "s")
            .replace(/sc/g, "s")
            .replace(/ch/g, "x")
            .replace(/[sz]/g, "s")
            .replace(/[cj]/g, "g");
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "error",
            message: "Falha ao gerar chave fonética",
            fileName: FILE_NAME,
            methodName: "getLoosePhoneticKey",
            lineNumber: 243,
            parameters: { tokenLength: token.length },
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        return token;
    }
};

const isAcceptableVariation = (original: string, transcribed: string): boolean => {
    if (typeof original !== "string" || typeof transcribed !== "string") return false;
    if (!original || !transcribed) return false;
    if (original === transcribed) return true;

    try {
        const maxLength = Math.max(original.length, transcribed.length);
        const minLength = Math.min(original.length, transcribed.length);
        const distance = levenshteinDistance(original, transcribed);
        const similarity = getSimilarity(original, transcribed);

        if (maxLength >= 7 && distance <= 2 && similarity >= 0.72) return true;
        if (maxLength >= 5 && distance <= 1 && similarity >= 0.8) return true;

        return (
            minLength >= 4 &&
            distance <= 1 &&
            getLoosePhoneticKey(original) === getLoosePhoneticKey(transcribed) &&
            similarity >= 0.75
        );
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "error",
            message: "Falha ao verificar variação aceitável",
            fileName: FILE_NAME,
            methodName: "isAcceptableVariation",
            lineNumber: 280,
            parameters: { originalLength: original?.length, transcribedLength: transcribed?.length },
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        return false;
    }
};

export interface DetalheAlinhamento {
    tipo: "match" | "acceptable" | "substitution" | "deletion" | "insertion" | "unread";
    original: string | null;
    originalTokens?: string | null;
    lido: string | null;
    lidoTokens?: string | null;
    observacao?: string;
}

export interface AlignmentResult {
    corretas: number;
    total_original: number;
    total_lido: number;
    erros: number;
    precisao: number;
    variacoes_aceitas: number;
    detalhes: DetalheAlinhamento[];
}

const isStrongMatch = (detail?: DetalheAlinhamento): boolean => {
    return detail?.tipo === "match" || detail?.tipo === "acceptable";
};

const isMinorFunctionalToken = (token: string): boolean => {
    return !!token && typeof token === "string" && (STOP_WORDS.has(token) || token.length <= 2);
};

const isRepeatedNeighborToken = (token: string, previous?: DetalheAlinhamento, next?: DetalheAlinhamento): boolean => {
    if (typeof token !== "string") return false;
    const previousToken = cleanText(
        previous?.lidoTokens ?? previous?.originalTokens ?? previous?.lido ?? previous?.original ?? ""
    );
    const nextToken = cleanText(
        next?.originalTokens ?? next?.lidoTokens ?? next?.original ?? next?.lido ?? ""
    );
    return token === previousToken || token === nextToken;
};

interface StepState {
    cost: number;
    prevI: number;
    prevJ: number;
    detail: DetalheAlinhamento | null;
}

const createInitialState = (): StepState => ({
    cost: Number.POSITIVE_INFINITY,
    prevI: -1,
    prevJ: -1,
    detail: null
});

const relaxState = (
    states: StepState[][],
    nextI: number,
    nextJ: number,
    candidate: StepState,
    context: { i: number; j: number; n: number; m: number }
): void => {
    if (!Array.isArray(states)) {
        throw new DetailedError({
            userMessage: "Falha no algoritmo de alinhamento: matriz de estados ausente.",
            fieldName: "states",
            fieldValue: typeof states,
            fileName: FILE_NAME,
            methodName: "relaxState",
            lineNumber: 354
        });
    }
    if (nextI < 0 || nextI >= states.length) {
        throw new DetailedError({
            userMessage: "Falha no algoritmo de alinhamento: índice de linha fora dos limites.",
            fieldName: "nextI",
            fieldValue: nextI,
            fileName: FILE_NAME,
            methodName: "relaxState",
            lineNumber: 364,
            extraData: { statesLength: states.length, contexto: context }
        });
    }
    if (!Array.isArray(states[nextI])) {
        throw new DetailedError({
            userMessage: "Falha no algoritmo de alinhamento: linha da matriz não inicializada.",
            fieldName: "nextI",
            fieldValue: nextI,
            fileName: FILE_NAME,
            methodName: "relaxState",
            lineNumber: 374,
            extraData: { contexto: context }
        });
    }
    if (nextJ < 0 || nextJ >= states[nextI].length) {
        throw new DetailedError({
            userMessage: "Falha no algoritmo de alinhamento: índice de coluna fora dos limites.",
            fieldName: "nextJ",
            fieldValue: nextJ,
            fileName: FILE_NAME,
            methodName: "relaxState",
            lineNumber: 385,
            extraData: { rowLength: states[nextI].length, contexto: context }
        });
    }
    const current = states[nextI][nextJ];
    if (!current || typeof current !== "object") {
        throw new DetailedError({
            userMessage: "Falha no algoritmo de alinhamento: célula da matriz corrompida.",
            fileName: FILE_NAME,
            methodName: "relaxState",
            lineNumber: 394,
            extraData: { nextI, nextJ, currentTipo: typeof current }
        });
    }
    if (
        candidate.cost < current.cost ||
        (candidate.cost === current.cost && (candidate.prevI > current.prevI || candidate.prevJ > current.prevJ))
    ) {
        states[nextI][nextJ] = candidate;
    }
};

const softenMinorAlignmentNoise = (details: DetalheAlinhamento[]): DetalheAlinhamento[] => {
    if (!Array.isArray(details)) {
        logDetailed({
            level: "warn",
            message: "softenMinorAlignmentNoise recebeu não-array, retornando array vazio",
            fileName: FILE_NAME,
            methodName: "softenMinorAlignmentNoise",
            lineNumber: 413,
            extraData: { tipoRecebido: typeof details }
        });
        return [];
    }
    try {
        return details.map((detail, index) => {
            if (!detail || typeof detail !== "object") {
                logDetailed({
                    level: "warn",
                    message: "Detalhe de alinhamento inválido encontrado em softenMinorAlignmentNoise",
                    fileName: FILE_NAME,
                    methodName: "softenMinorAlignmentNoise",
                    lineNumber: 424,
                    extraData: { index, tipoDetail: typeof detail }
                });
                return detail as DetalheAlinhamento;
            }
            const previous = details[index - 1];
            const next = details[index + 1];

            if (!isStrongMatch(previous) || !isStrongMatch(next)) {
                return detail;
            }

            if (detail.tipo === "deletion") {
                const original = cleanText(detail.originalTokens || detail.original || "");
                if (isMinorFunctionalToken(original)) {
                    return {
                        ...detail,
                        tipo: "acceptable" as const,
                        observacao: "Partícula funcional tratada como variação aceitável."
                    };
                }
            }

            if (detail.tipo === "insertion") {
                const lido = cleanText(detail.lidoTokens || detail.lido || "");
                const repeatedShortToken = isRepeatedNeighborToken(lido, previous, next) && typeof lido === "string" && lido.length <= 2;
                if (isMinorFunctionalToken(lido) || repeatedShortToken) {
                    return {
                        ...detail,
                        tipo: "acceptable" as const,
                        observacao: "Ruído curto de transcrição tratado como aceitável."
                    };
                }
            }

            if (detail.tipo === "substitution") {
                const original = cleanText(detail.originalTokens || detail.original || "");
                const lido = cleanText(detail.lidoTokens || detail.lido || "");
                if (
                    (isMinorFunctionalToken(original) || isMinorFunctionalToken(lido)) &&
                    getSimilarity(original, lido) >= 0.5
                ) {
                    return {
                        ...detail,
                        tipo: "acceptable" as const,
                        observacao: "Variação curta tratada como aceitável."
                    };
                }
            }

            return detail;
        });
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "error",
            message: "Falha ao suavizar ruídos de alinhamento, mantendo detalhes originais",
            fileName: FILE_NAME,
            methodName: "softenMinorAlignmentNoise",
            lineNumber: 489,
            parameters: { detailsCount: details.length },
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        return details;
    }
};

const getImpactedTokenCount = (detail: DetalheAlinhamento): number => {
    if (!detail || typeof detail !== "object") return 0;
    const originalCount = countTokens(detail.originalTokens ?? detail.original);
    if (originalCount > 0) return originalCount;
    return countTokens(detail.lidoTokens ?? detail.lido);
};

const getOriginalTokenCount = (detail: DetalheAlinhamento): number => {
    if (!detail || typeof detail !== "object") return 0;
    return countTokens(detail.originalTokens ?? detail.original);
};

export const calculatePCM = (originalText: unknown, transcribedText: unknown): AlignmentResult => {
    logDetailed({
        level: "info",
        message: "Iniciando cálculo de PCM",
        fileName: FILE_NAME,
        methodName: "calculatePCM",
        lineNumber: 517,
        parameters: {
            tipoOriginal: typeof originalText,
            tipoTranscrito: typeof transcribedText,
            tamanhoOriginal: typeof originalText === "string" ? originalText.length : null,
            tamanhoTranscrito: typeof transcribedText === "string" ? transcribedText.length : null
        }
    });

    if (typeof originalText !== "string") {
        throw new DetailedError({
            userMessage: "Falha ao calcular PCM: texto original deve ser uma string.",
            fieldName: "originalText",
            fieldValue: typeof originalText,
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 532
        });
    }
    if (typeof transcribedText !== "string") {
        throw new DetailedError({
            userMessage: "Falha ao calcular PCM: texto transcrito deve ser uma string.",
            fieldName: "transcribedText",
            fieldValue: typeof transcribedText,
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 542
        });
    }

    let normOriginal: string;
    let normTranscribed: string;
    try {
        normOriginal = originalText.replace(/\s+/g, " ").trim();
        normTranscribed = transcribedText.replace(/\s+/g, " ").trim();
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        throw new DetailedError({
            userMessage: "Falha ao normalizar textos de entrada para cálculo de PCM.",
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 555
        }, erro);
    }

    let origTokens: string[];
    let tranTokens: string[];
    try {
        origTokens = normOriginal.split(" ").filter(Boolean);
        tranTokens = normTranscribed.split(" ").filter(Boolean);
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        throw new DetailedError({
            userMessage: "Falha ao tokenizar textos de entrada.",
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 568
        }, erro);
    }

    if (origTokens.length > MAX_PCM_TOKENS || tranTokens.length > MAX_PCM_TOKENS) {
        logDetailed({
            level: "warn",
            message: "Texto com quantidade de tokens acima do limite, truncando para cálculo.",
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 578,
            parameters: {
                origTokensCount: origTokens.length,
                tranTokensCount: tranTokens.length,
                limite: MAX_PCM_TOKENS
            }
        });
        origTokens = origTokens.slice(0, MAX_PCM_TOKENS);
        tranTokens = tranTokens.slice(0, MAX_PCM_TOKENS);
    }

    const origWords = origTokens.map(cleanText);
    const tranWords = tranTokens.map(cleanText);

    const n = origWords.length;
    const m = tranWords.length;

    let states: StepState[][];
    try {
        states = Array.from({ length: n + 1 }, () =>
            Array.from({ length: m + 1 }, () => createInitialState())
        );
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        const isMemory = erro.message.includes("memory") || erro.message.includes("allocation") || erro instanceof RangeError;
        logDetailed({
            level: "fatal",
            message: isMemory
                ? "Estouro de memória ao alocar matriz de estados do PCM"
                : "Falha ao criar matriz de estados do PCM",
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 610,
            parameters: { n, m, celulas: (n + 1) * (m + 1) },
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        throw new DetailedError({
            userMessage: isMemory
                ? "Texto muito extenso: não foi possível alocar memória para o cálculo de PCM. Por favor, divida o texto em partes menores."
                : "Falha interna ao inicializar algoritmo de cálculo de PCM.",
            httpCode: isMemory ? 413 : 500,
            fieldName: isMemory ? "originalText" : undefined,
            fieldValue: isMemory ? `${n} tokens originais, ${m} tokens transcritos` : undefined,
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 627
        }, erro);
    }

    states[0][0] = { cost: 0, prevI: -1, prevJ: -1, detail: null };

    let lastProcessedI = 0;
    let lastProcessedJ = 0;
    try {
        for (let i = 0; i <= n; i++) {
            lastProcessedI = i;
            for (let j = 0; j <= m; j++) {
                lastProcessedJ = j;
                const current = states[i][j];
                if (!current || !Number.isFinite(current.cost)) continue;

                if (i < n && j < m) {
                    const original = origWords[i];
                    const transcribed = tranWords[j];

                    if (original === transcribed && original !== "") {
                        relaxState(states, i + 1, j + 1, {
                            cost: current.cost,
                            prevI: i,
                            prevJ: j,
                            detail: {
                                tipo: "match",
                                original,
                                originalTokens: origTokens[i],
                                lido: transcribed,
                                lidoTokens: tranTokens[j]
                            }
                        }, { i, j, n, m });
                    } else if (isAcceptableVariation(original, transcribed)) {
                        relaxState(states, i + 1, j + 1, {
                            cost: current.cost + 0.15,
                            prevI: i,
                            prevJ: j,
                            detail: {
                                tipo: "acceptable",
                                original,
                                originalTokens: origTokens[i],
                                lido: transcribed,
                                lidoTokens: tranTokens[j],
                                observacao: "Variação fonética/transcrição aceitável."
                            }
                        }, { i, j, n, m });
                    } else {
                        relaxState(states, i + 1, j + 1, {
                            cost: current.cost + 1,
                            prevI: i,
                            prevJ: j,
                            detail: {
                                tipo: "substitution",
                                original,
                                originalTokens: origTokens[i],
                                lido: transcribed,
                                lidoTokens: tranTokens[j]
                            }
                        }, { i, j, n, m });
                    }
                }

                if (i < n) {
                    relaxState(states, i + 1, j, {
                        cost: current.cost + 1,
                        prevI: i,
                        prevJ: j,
                        detail: {
                            tipo: "deletion",
                            original: origWords[i],
                            originalTokens: origTokens[i],
                            lido: null
                        }
                    }, { i, j, n, m });
                }

                if (j < m) {
                    relaxState(states, i, j + 1, {
                        cost: current.cost + 1,
                        prevI: i,
                        prevJ: j,
                        detail: {
                            tipo: "insertion",
                            original: null,
                            lido: tranWords[j],
                            lidoTokens: tranTokens[j]
                        }
                    }, { i, j, n, m });
                }

                if (i < n && j + 1 < m) {
                    const mergedTranscription = cleanText(`${tranTokens[j]} ${tranTokens[j + 1]}`);
                    if (mergedTranscription === origWords[i] && mergedTranscription !== "") {
                        relaxState(states, i + 1, j + 2, {
                            cost: current.cost + 0.1,
                            prevI: i,
                            prevJ: j,
                            detail: {
                                tipo: "acceptable",
                                original: origWords[i],
                                originalTokens: origTokens[i],
                                lido: mergedTranscription,
                                lidoTokens: `${tranTokens[j]} ${tranTokens[j + 1]}`,
                                observacao: "Quebra de palavra tratada como aceitável."
                            }
                        }, { i, j, n, m });
                    }
                }

                if (i + 1 < n && j < m) {
                    const mergedOriginal = cleanText(`${origTokens[i]} ${origTokens[i + 1]}`);
                    if (mergedOriginal === tranWords[j] && mergedOriginal !== "") {
                        relaxState(states, i + 2, j + 1, {
                            cost: current.cost + 0.1,
                            prevI: i,
                            prevJ: j,
                            detail: {
                                tipo: "acceptable",
                                original: mergedOriginal,
                                originalTokens: `${origTokens[i]} ${origTokens[i + 1]}`,
                                lido: tranWords[j],
                                lidoTokens: tranTokens[j],
                                observacao: "Junção de palavras tratada como aceitável."
                            }
                        }, { i, j, n, m });
                    }
                }
            }
        }
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        const isIndex = erro instanceof RangeError || erro.message.includes("index") || erro.message.includes("bounds") || erro.message.includes("undefined");
        logDetailed({
            level: "error",
            message: isIndex
                ? "Erro de índice fora dos limites no loop principal de alinhamento"
                : "Falha no loop principal de cálculo de PCM",
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 773,
            parameters: { n, m, ultimoI: lastProcessedI, ultimoJ: lastProcessedJ },
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        throw new DetailedError({
            userMessage: isIndex
                ? `Falha no algoritmo de alinhamento: índice fora dos limites (i=${lastProcessedI}, j=${lastProcessedJ} em matriz ${n}x${m}).`
                : "Falha interna durante cálculo de palavras corretas por minuto.",
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 786,
            extraData: { n, m, ultimoI: lastProcessedI, ultimoJ: lastProcessedJ }
        }, erro);
    }

    let bestI = n;
    let bestCost = Number.POSITIVE_INFINITY;
    try {
        for (let i = 0; i <= n; i++) {
            const state = states[i][m];
            if (
                state.cost < bestCost ||
                (state.cost === bestCost && i > bestI)
            ) {
                bestCost = state.cost;
                bestI = i;
            }
        }
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "error",
            message: "Falha ao buscar melhor estado final de PCM",
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 809,
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        bestI = n;
    }

    const details: DetalheAlinhamento[] = [];
    try {
        for (let k = n; k > bestI; k--) {
            if (k - 1 < 0 || k - 1 >= origWords.length) break;
            details.unshift({
                tipo: "unread",
                original: origWords[k - 1] ?? null,
                originalTokens: origTokens[k - 1] ?? null,
                lido: null
            });
        }
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "warn",
            message: "Falha ao registrar tokens não lidos no final do alinhamento",
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 833,
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
    }

    let i = bestI;
    let j = m;
    try {
        let safetyCounter = 0;
        const safetyLimit = (n + m) * 2 + 1000;
        while ((i > 0 || j > 0) && safetyCounter < safetyLimit) {
            safetyCounter++;
            if (!states[i] || !states[i][j]) break;
            const step = states[i][j];
            if (!step || !step.detail) break;
            details.unshift(step.detail);
            i = step.prevI;
            j = step.prevJ;
            if (i < -1 || j < -1) break;
        }
        if (safetyCounter >= safetyLimit) {
            logDetailed({
                level: "warn",
                message: "Limite de segurança atingido no backtrace de alinhamento de PCM",
                fileName: FILE_NAME,
                methodName: "calculatePCM",
                lineNumber: 861,
                extraData: { safetyLimit, n, m, finalI: i, finalJ: j }
            });
        }
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "error",
            message: "Falha ao reconstruir caminho de alinhamento de PCM",
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 871,
            parameters: { n, m, inicioI: bestI, inicioJ: m },
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
    }

    const normalizedDetails = softenMinorAlignmentNoise(details);
    let unreadCount = 0;
    let correctCount = 0;
    let acceptedVariationCount = 0;
    let hardErrorCount = 0;

    try {
        unreadCount = normalizedDetails
            .filter(detail => detail.tipo === "unread")
            .reduce((sum, detail) => sum + getImpactedTokenCount(detail), 0);

        correctCount = normalizedDetails
            .filter(detail => detail.tipo === "match" || detail.tipo === "acceptable")
            .reduce((sum, detail) => sum + getOriginalTokenCount(detail), 0);

        acceptedVariationCount = normalizedDetails
            .filter(detail => detail.tipo === "acceptable")
            .reduce((sum, detail) => sum + getImpactedTokenCount(detail), 0);

        hardErrorCount = normalizedDetails
            .filter(detail => detail.tipo === "substitution" || detail.tipo === "deletion" || detail.tipo === "insertion")
            .reduce((sum, detail) => sum + getImpactedTokenCount(detail), 0);
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "warn",
            message: "Falha ao computar contagens finais de PCM, usando valores parciais",
            fileName: FILE_NAME,
            methodName: "calculatePCM",
            lineNumber: 906,
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
    }

    const evaluatedOriginalWords = Math.max(n - unreadCount, 0);
    const precisao = evaluatedOriginalWords > 0
        ? Number(((correctCount / evaluatedOriginalWords) * 100).toFixed(2))
        : 0;

    const resultado: AlignmentResult = {
        corretas: correctCount,
        total_original: n,
        total_lido: m,
        erros: hardErrorCount,
        precisao,
        variacoes_aceitas: acceptedVariationCount,
        detalhes: normalizedDetails
    };

    logDetailed({
        level: "debug",
        message: "Cálculo de PCM concluído com sucesso",
        fileName: FILE_NAME,
        methodName: "calculatePCM",
        lineNumber: 933,
        extraData: {
            corretas: correctCount,
            totalOriginal: n,
            totalLido: m,
            erros: hardErrorCount,
            precisao,
            variacoesAceitas: acceptedVariationCount,
            tokensNaoLidos: unreadCount
        }
    });

    return resultado;
};

export const getPerformanceLevel = (pcm: unknown): string => {
    if (typeof pcm !== "number") {
        logDetailed({
            level: "warn",
            message: "getPerformanceLevel recebeu tipo não-numérico",
            fileName: FILE_NAME,
            methodName: "getPerformanceLevel",
            lineNumber: 952,
            extraData: { tipoRecebido: typeof pcm, valor: String(pcm) }
        });
        return "Classificação Indisponível";
    }
    if (!Number.isFinite(pcm)) {
        logDetailed({
            level: "warn",
            message: "getPerformanceLevel recebeu valor não finito",
            fileName: FILE_NAME,
            methodName: "getPerformanceLevel",
            lineNumber: 963,
            extraData: { valor: pcm }
        });
        return "Classificação Indisponível";
    }
    if (pcm <= 30) return "Fase Inicial I (Pré-silábico)";
    if (pcm <= 60) return "Fase Inicial II (Silábico/Alfabético)";
    if (pcm <= 75) return "Em Desenvolvimento";
    if (pcm <= 95) return "Em Consolidação";
    return "Fluente";
};

export const getNormaNacional = (serie: unknown): number => {
    if (typeof serie !== "string") {
        logDetailed({
            level: "warn",
            message: "getNormaNacional recebeu tipo não-string, usando padrão 80",
            fileName: FILE_NAME,
            methodName: "getNormaNacional",
            lineNumber: 983,
            extraData: { tipoRecebido: typeof serie, valor: String(serie) }
        });
        return 80;
    }
    try {
        const s = serie.toLowerCase();
        if (s.includes("1")) return 60;
        if (s.includes("2")) return 80;
        if (s.includes("3")) return 100;
        if (s.includes("4")) return 120;
        if (s.includes("5")) return 130;
        return 80;
    } catch (err) {
        const erro = err instanceof Error ? err : new Error(String(err));
        logDetailed({
            level: "warn",
            message: "Falha ao buscar norma nacional, usando padrão 80",
            fileName: FILE_NAME,
            methodName: "getNormaNacional",
            lineNumber: 1004,
            parameters: { serie },
            errorName: erro.name,
            errorMessage: erro.message,
            stackTrace: erro.stack
        });
        return 80;
    }
};
