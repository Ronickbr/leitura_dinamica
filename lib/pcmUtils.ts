const STOP_WORDS = new Set([
    "a", "as", "o", "os", "um", "uma", "uns", "umas",
    "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
    "e", "ou", "que", "se", "por", "pra", "para", "com", "sem",
    "ao", "aos", "à", "às", "eu", "tu", "ele", "ela"
]);

const cleanText = (text: string) => {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, "")
        .trim();
};

const countTokens = (value?: string | null) => {
    if (!value) return 0;
    return value.split(/\s+/).filter(Boolean).length;
};

const levenshteinDistance = (source: string, target: string) => {
    if (source === target) return 0;
    if (!source) return target.length;
    if (!target) return source.length;

    const rows = source.length + 1;
    const cols = target.length + 1;
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let i = 0; i < rows; i++) matrix[i][0] = i;
    for (let j = 0; j < cols; j++) matrix[0][j] = j;

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
};

const getSimilarity = (source: string, target: string) => {
    const maxLength = Math.max(source.length, target.length);
    if (maxLength === 0) return 1;
    return 1 - levenshteinDistance(source, target) / maxLength;
};

const getLoosePhoneticKey = (token: string) => {
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
};

const isAcceptableVariation = (original: string, transcribed: string) => {
    if (!original || !transcribed) return false;
    if (original === transcribed) return true;

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
};

const isStrongMatch = (detail?: DetalheAlinhamento) => {
    return detail?.tipo === "match" || detail?.tipo === "acceptable";
};

const isMinorFunctionalToken = (token: string) => {
    return !!token && (STOP_WORDS.has(token) || token.length <= 2);
};

const isRepeatedNeighborToken = (token: string, previous?: DetalheAlinhamento, next?: DetalheAlinhamento) => {
    const previousToken = cleanText(previous?.lidoTokens || previous?.originalTokens || previous?.lido || previous?.original || "");
    const nextToken = cleanText(next?.originalTokens || next?.lidoTokens || next?.original || next?.lido || "");
    return token === previousToken || token === nextToken;
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
    candidate: StepState
) => {
    const current = states[nextI][nextJ];
    if (
        candidate.cost < current.cost ||
        (candidate.cost === current.cost && (candidate.prevI > current.prevI || candidate.prevJ > current.prevJ))
    ) {
        states[nextI][nextJ] = candidate;
    }
};

const softenMinorAlignmentNoise = (details: DetalheAlinhamento[]): DetalheAlinhamento[] => {
    return details.map((detail, index) => {
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
            const repeatedShortToken = isRepeatedNeighborToken(lido, previous, next) && lido.length <= 2;
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
};

const getImpactedTokenCount = (detail: DetalheAlinhamento) => {
    const originalCount = countTokens(detail.originalTokens || detail.original);
    if (originalCount > 0) return originalCount;
    return countTokens(detail.lidoTokens || detail.lido);
};

const getOriginalTokenCount = (detail: DetalheAlinhamento) => {
    return countTokens(detail.originalTokens || detail.original);
};

export const calculatePCM = (originalText: string, transcribedText: string): AlignmentResult => {
    const normOriginal = originalText.replace(/\s+/g, " ").trim();
    const normTranscribed = transcribedText.replace(/\s+/g, " ").trim();

    const origTokens = normOriginal.split(" ").filter(Boolean);
    const tranTokens = normTranscribed.split(" ").filter(Boolean);

    const origWords = origTokens.map(cleanText);
    const tranWords = tranTokens.map(cleanText);

    const n = origWords.length;
    const m = tranWords.length;
    const states = Array.from({ length: n + 1 }, () =>
        Array.from({ length: m + 1 }, () => createInitialState())
    );

    states[0][0] = { cost: 0, prevI: -1, prevJ: -1, detail: null };

    for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= m; j++) {
            const current = states[i][j];
            if (!Number.isFinite(current.cost)) continue;

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
                    });
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
                    });
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
                    });
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
                });
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
                });
            }

            // Permite que o ASR una duas palavras corretas em uma só ou quebre uma palavra em duas.
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
                    });
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
                    });
                }
            }
        }
    }

    let bestI = n;
    let bestCost = Number.POSITIVE_INFINITY;
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

    const details: DetalheAlinhamento[] = [];
    for (let k = n; k > bestI; k--) {
        details.unshift({
            tipo: "unread",
            original: origWords[k - 1],
            originalTokens: origTokens[k - 1],
            lido: null
        });
    }

    let i = bestI;
    let j = m;

    while (i > 0 || j > 0) {
        const step = states[i][j];
        if (!step.detail) break;
        details.unshift(step.detail);
        i = step.prevI;
        j = step.prevJ;
    }

    const normalizedDetails = softenMinorAlignmentNoise(details);
    const unreadCount = normalizedDetails
        .filter(detail => detail.tipo === "unread")
        .reduce((sum, detail) => sum + getImpactedTokenCount(detail), 0);

    const correctCount = normalizedDetails
        .filter(detail => detail.tipo === "match" || detail.tipo === "acceptable")
        .reduce((sum, detail) => sum + getOriginalTokenCount(detail), 0);

    const acceptedVariationCount = normalizedDetails
        .filter(detail => detail.tipo === "acceptable")
        .reduce((sum, detail) => sum + getImpactedTokenCount(detail), 0);

    const hardErrorCount = normalizedDetails
        .filter(detail => detail.tipo === "substitution" || detail.tipo === "deletion" || detail.tipo === "insertion")
        .reduce((sum, detail) => sum + getImpactedTokenCount(detail), 0);

    const evaluatedOriginalWords = Math.max(n - unreadCount, 0);

    return {
        corretas: correctCount,
        total_original: n,
        total_lido: m,
        erros: hardErrorCount,
        precisao: evaluatedOriginalWords > 0 ? Number(((correctCount / evaluatedOriginalWords) * 100).toFixed(2)) : 0,
        variacoes_aceitas: acceptedVariationCount,
        detalhes: normalizedDetails
    };
};

export const getPerformanceLevel = (pcm: number) => {
    if (pcm <= 30) return "Fase Inicial I (Pré-silábico)";
    if (pcm <= 60) return "Fase Inicial II (Silábico/Alfabético)";
    if (pcm <= 75) return "Em Desenvolvimento";
    if (pcm <= 95) return "Em Consolidação";
    return "Fluente";
};

export const getNormaNacional = (serie: string): number => {
    const s = serie.toLowerCase();
    if (s.includes("1")) return 60;
    if (s.includes("2")) return 80;
    if (s.includes("3")) return 100;
    if (s.includes("4")) return 120;
    if (s.includes("5")) return 130;
    return 80;
};
