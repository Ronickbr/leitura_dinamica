const cleanText = (text) => {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^\w\s]/g, "") // Remove pontuação
        .replace(/\s+/g, " ") // Normaliza espaços
        .trim();
};

const calculatePCM = (originalText, transcribedText) => {
    const origClean = cleanText(originalText).split(" ");
    const tranClean = cleanText(transcribedText).split(" ");

    let totalCorrect = 0;
    let currentTranIdx = 0;

    // Algoritmo de busca sequencial para contar palavras corretas na ordem
    for (let i = 0; i < origClean.length; i++) {
        const targetWord = origClean[i];

        // Procura a palavra no que resta do texto transcrito
        // Limita a busca a uma janela razoável para evitar saltos irreais
        const searchRange = tranClean.slice(currentTranIdx, currentTranIdx + 5);
        const foundLocalIdx = searchRange.indexOf(targetWord);

        if (foundLocalIdx !== -1) {
            totalCorrect++;
            currentTranIdx += foundLocalIdx + 1;
        }
    }

    return {
        corretas: totalCorrect,
        total_original: origClean.length,
        total_lido: tranClean.length,
        precisao: origClean.length > 0 ? Number(((totalCorrect / origClean.length) * 100).toFixed(2)) : 0
    };
};

const getPerformanceLevel = (pcm) => {
    if (pcm <= 60) return "Fase Inicial";
    if (pcm <= 75) return "Em Desenvolvimento";
    if (pcm <= 95) return "Em Consolidação";
    return "Fluente";
};

module.exports = { calculatePCM, getPerformanceLevel };
