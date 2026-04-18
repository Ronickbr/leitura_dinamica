import type { Avaliacao } from '../services/evaluationsService';

interface ExportRow {
    'Nº': number;
    'Aluno(a)': string;
    'Turma': string;
    'Série': string;
    'Data Avaliação': string;
    'PCM': number;
    'Precisão': string;
    'Leitura Precisa': string;
    'Leitura Silabada': string;
    'Boa Entonação': string;
    'Interpretação': string;
    'Pontuação': string;
    'Diagnóstico Sugerido': string;
}

export async function downloadFullReportAsExcel(avaliacoes: (Avaliacao & { alunoNome?: string, turma?: string, serie?: string })[]) {
    if (avaliacoes.length === 0) {
        return;
    }

    const XLSX = await import('xlsx');

    const data: ExportRow[] = avaliacoes.map((ev, index) => ({
        'Nº': index + 1,
        'Aluno(a)': ev.alunoNome || 'N/A',
        'Turma': ev.turma || 'N/A',
        'Série': ev.serie || 'N/A',
        'Data Avaliação': ev.data ? (
            'toDate' in ev.data && typeof ev.data.toDate === 'function'
                ? ev.data.toDate().toLocaleDateString('pt-BR')
                : 'seconds' in ev.data && typeof ev.data.seconds === 'number'
                    ? new Date(ev.data.seconds * 1000).toLocaleDateString('pt-BR')
                    : 'N/A'
        ) : 'N/A',
        'PCM': ev.pcm || 0,
        'Precisão': `${ev.precisao || 0}%`,
        'Leitura Precisa': ev.metricasQualitativas?.leitura_precisa ? 'Sim' : 'Não',
        'Leitura Silabada': ev.metricasQualitativas?.leitura_silabada ? 'Sim' : 'Não',
        'Boa Entonação': ev.metricasQualitativas?.boa_entonacao ? 'Sim' : 'Não',
        'Interpretação': ev.metricasQualitativas?.interpretacao ? 'Sim' : 'Não',
        'Pontuação': ev.metricasQualitativas?.pontuacao ? 'Sim' : 'Não',
        'Diagnóstico Sugerido': ev.diagnosticoIA || 'Processando...',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajustar largura das colunas para os nomes em português
    const wscols = [
        { wch: 5 },  // Nº
        { wch: 35 }, // Aluno(a)
        { wch: 10 }, // Turma
        { wch: 10 }, // Série
        { wch: 15 }, // Data Avaliação
        { wch: 8 },  // PCM
        { wch: 10 }, // Precisão
        { wch: 15 }, // Leitura Precisa
        { wch: 15 }, // Leitura Silabada
        { wch: 15 }, // Boa Entonação
        { wch: 15 }, // Interpretação
        { wch: 15 }, // Pontuação
        { wch: 50 }, // Diagnóstico
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório de Fluência');

    const fileName = `relatorio-leitura-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}
