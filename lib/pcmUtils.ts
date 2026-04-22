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

export const calculatePCM = (originalText: string, transcribedText: string) => {
    const origClean = cleanText(originalText).split(" ");
    const tranClean = cleanText(transcribedText).split(" ");

    let totalCorrect = 0;
    let currentTranIdx = 0;

    for (let i = 0; i < origClean.length; i++) {
        const targetWord = origClean[i];
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

export const getPerformanceLevel = (pcm: number) => {
    if (pcm <= 60) return "Fase Inicial";
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