/**
 * Retorna o estilo (cores de fundo, texto e borda) baseado no diagnóstico clínico do aluno.
 * Garante alto contraste e uma estética premium consistente em todo o sistema.
 */
export const getDiagnosisStyle = (diagnosis: string | undefined) => {
    if (!diagnosis || diagnosis.toLowerCase() === 'nenhum' || diagnosis.toLowerCase() === 'nenhum diagnóstico' || diagnosis === '') {
        return {
            bg: 'transparent',
            text: 'var(--text-muted)',
            border: 'transparent'
        };
    }

    const d = diagnosis.toUpperCase();

    // TEA / Autismo (Índigo/Roxo)
    if (d.includes('TEA') || d.includes('AUTISMO')) {
        return {
            bg: 'rgba(129, 140, 248, 0.12)',
            text: '#818cf8',
            border: 'rgba(129, 140, 248, 0.3)'
        };
    }

    // TDAH (Laranja)
    if (d.includes('TDA') && d.includes('TDH')) {
        return {
            bg: 'rgba(251, 146, 60, 0.12)',
            text: '#fb923c',
            border: 'rgba(251, 146, 60, 0.3)'
        };
    }

    // Apenas TDH (Rosa/Vermelho)
    if (d.includes('TDH')) {
        return {
            bg: 'rgba(251, 113, 133, 0.12)',
            text: '#fb7185',
            border: 'rgba(251, 113, 133, 0.3)'
        };
    }

    // Apenas TDA (Verde)
    if (d.includes('TDA')) {
        return {
            bg: 'rgba(52, 211, 153, 0.12)',
            text: '#34d399',
            border: 'rgba(52, 211, 153, 0.3)'
        };
    }

    // Dislexia (Azul Total)
    if (d.includes('DISLEXIA')) {
        return {
            bg: 'rgba(56, 189, 248, 0.12)',
            text: '#38bdf8',
            border: 'rgba(56, 189, 248, 0.3)'
        };
    }

    // Outros (Amarelo)
    return {
        bg: 'rgba(250, 204, 21, 0.1)',
        text: '#facc15',
        border: 'rgba(250, 204, 21, 0.25)'
    };
};
