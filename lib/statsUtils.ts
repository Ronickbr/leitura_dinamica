interface Avaliacao {
    pcm: number;
    [key: string]: any;
}

/**
 * Calcula estatísticas acadêmicas baseadas em uma lista de avaliações.
 * Inclui média, desvio padrão e intervalo de confiança (95%).
 */
export function calculateStatistics(evaluations: Avaliacao[]) {
    const pcms = evaluations.map(e => e.pcm).filter(pcm => typeof pcm === 'number');
    const n = pcms.length;

    if (n === 0) return null;

    const mean = pcms.reduce((a, b) => a + b, 0) / n;
    const variance = pcms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const ci95 = n > 1 ? 1.96 * (stdDev / Math.sqrt(n)) : 0; // Intervalo de confiança 95%

    // Tendência baseada nos últimos registros (assumindo que a lista está ordenada por data)
    // Se pcms[0] for o mais antigo e pcms[n-1] o mais recente:
    const tendencia = n > 1 ? (pcms[n - 1] >= pcms[0] ? "positiva" : "negativa") : "estável";

    return {
        media: Math.round(mean),
        desvioPadrao: Math.round(stdDev * 100) / 100,
        ic95: Math.round(ci95 * 100) / 100,
        min: Math.min(...pcms),
        max: Math.max(...pcms),
        tendencia,
        totalAvaliacoes: n
    };
}
