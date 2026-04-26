const cleanText = (text: string) => {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

export interface AlignmentResult {
    corretas: number;
    total_original: number;
    total_lido: number;
    precisao: number;
    detalhes: {
        tipo: 'match' | 'substitution' | 'deletion' | 'insertion';
        original: string | null;
        lido: string | null;
    }[];
}

export const calculatePCM = (originalText: string, transcribedText: string): AlignmentResult => {
    const origWords = cleanText(originalText).split(" ").filter(Boolean);
    const tranWords = cleanText(transcribedText).split(" ").filter(Boolean);

    const n = origWords.length;
    const m = tranWords.length;

    // Tabela de programação dinâmica para distância de edição (nível de palavra)
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let j = 0; j <= m; j++) dp[0][j] = j;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (origWords[i - 1] === tranWords[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],    // Deletion
                    dp[i][j - 1],    // Insertion
                    dp[i - 1][j - 1] // Substitution
                );
            }
        }
    }

    // Backtracking para encontrar o alinhamento
    const detalhes: AlignmentResult['detalhes'] = [];
    let i = n, j = m;
    let correctCount = 0;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && origWords[i - 1] === tranWords[j - 1]) {
            detalhes.unshift({ tipo: 'match', original: origWords[i - 1], lido: tranWords[j - 1] });
            correctCount++;
            i--; j--;
        } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
            detalhes.unshift({ tipo: 'substitution', original: origWords[i - 1], lido: tranWords[j - 1] });
            i--; j--;
        } else if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
            detalhes.unshift({ tipo: 'deletion', original: origWords[i - 1], lido: null });
            i--;
        } else {
            detalhes.unshift({ tipo: 'insertion', original: null, lido: tranWords[j - 1] });
            j--;
        }
    }

    return {
        corretas: correctCount,
        total_original: n,
        total_lido: m,
        precisao: n > 0 ? Number(((correctCount / n) * 100).toFixed(2)) : 0,
        detalhes
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
    return 80; // Padrão médio
};