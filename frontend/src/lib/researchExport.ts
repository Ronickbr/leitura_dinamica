import type { Avaliacao } from '../services/evaluationsService';
import type { Aluno } from '../services/studentsService';
import type { Texto } from '../services/textsService';

interface BuildDatasetParams {
    alunos: Aluno[];
    avaliacoes: Avaliacao[];
    textos: Texto[];
}

export interface AnonymizedResearchRow {
    participante_id: string;
    avaliacao_id: string;
    texto_id: string;
    texto_serie: string;
    turma_id: string;
    serie: string;
    periodo_referencia: string;
    pcm: number;
    precisao: number;
    possui_diagnostico_informado: boolean;
    leitura_precisa: boolean | null;
    leitura_silabada: boolean | null;
    boa_entonacao: boolean | null;
    interpretacao: boolean | null;
    pontuacao: boolean | null;
    transcricao_caracteres: number;
}

export interface AnonymizedResearchDataset {
    metadata: {
        geradoEm: string;
        totalAlunosAnonimizados: number;
        totalAvaliacoes: number;
        camposRemovidos: string[];
    };
    registros: AnonymizedResearchRow[];
}

function getStableHash(value: string): string {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }

    return Math.abs(hash).toString(36).toUpperCase().padStart(6, '0');
}

function buildAnonymizedCode(prefix: string, rawValue: string): string {
    return `${prefix}_${getStableHash(rawValue)}`;
}

function getTimestampDate(value: Avaliacao['data']): Date | null {
    if (!value) {
        return null;
    }

    if ('toDate' in value && typeof value.toDate === 'function') {
        return value.toDate();
    }

    if ('seconds' in value && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000);
    }

    return null;
}

function getReferencePeriod(value: Avaliacao['data']): string {
    const date = getTimestampDate(value);

    if (!date) {
        return 'NA';
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function hasSensitiveDiagnosis(diagnostico?: string): boolean {
    if (!diagnostico) {
        return false;
    }

    const normalizedDiagnosis = diagnostico.trim().toLowerCase();
    return normalizedDiagnosis !== '' && normalizedDiagnosis !== 'nenhum';
}

export function buildAnonymizedResearchDataset({
    alunos,
    avaliacoes,
    textos,
}: BuildDatasetParams): AnonymizedResearchDataset {
    const studentsById = new Map(alunos.map((aluno) => [aluno.id, aluno]));
    const textsById = new Map(textos.map((texto) => [texto.id, texto]));

    const registros = avaliacoes.map((avaliacao) => {
        const aluno = studentsById.get(avaliacao.alunoId);
        const texto = textsById.get(avaliacao.textoId);

        return {
            participante_id: buildAnonymizedCode('ALUNO', avaliacao.alunoId),
            avaliacao_id: buildAnonymizedCode('AVALIACAO', avaliacao.id || `${avaliacao.alunoId}-${avaliacao.textoId}`),
            texto_id: buildAnonymizedCode('TEXTO', avaliacao.textoId),
            texto_serie: texto?.serie || 'NA',
            turma_id: buildAnonymizedCode('TURMA', aluno?.turma || 'NA'),
            serie: aluno?.serie || 'NA',
            periodo_referencia: getReferencePeriod(avaliacao.data),
            pcm: avaliacao.pcm,
            precisao: avaliacao.precisao,
            possui_diagnostico_informado: hasSensitiveDiagnosis(aluno?.diagnostico),
            leitura_precisa: avaliacao.metricasQualitativas?.leitura_precisa ?? null,
            leitura_silabada: avaliacao.metricasQualitativas?.leitura_silabada ?? null,
            boa_entonacao: avaliacao.metricasQualitativas?.boa_entonacao ?? null,
            interpretacao: avaliacao.metricasQualitativas?.interpretacao ?? null,
            pontuacao: avaliacao.metricasQualitativas?.pontuacao ?? null,
            transcricao_caracteres: avaliacao.transcricao?.length || 0,
        };
    });

    const totalAlunosAnonimizados = new Set(registros.map((registro) => registro.participante_id)).size;

    return {
        metadata: {
            geradoEm: new Date().toISOString(),
            totalAlunosAnonimizados,
            totalAvaliacoes: registros.length,
            camposRemovidos: [
                'nome',
                'observacoes',
                'diagnostico detalhado',
                'professorId',
                'transcricao bruta',
                'diagnosticoIA',
                'intervencaoIA',
                'datas exatas',
                'identificadores reais de aluno, texto e avaliacao',
            ],
        },
        registros,
    };
}

export async function downloadAnonymizedDatasetAsExcel(dataset: AnonymizedResearchDataset) {
    if (dataset.registros.length === 0) {
        return;
    }

    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const metadataRows = [
        { campo: 'geradoEm', valor: dataset.metadata.geradoEm },
        { campo: 'totalAlunosAnonimizados', valor: dataset.metadata.totalAlunosAnonimizados },
        { campo: 'totalAvaliacoes', valor: dataset.metadata.totalAvaliacoes },
        { campo: 'camposRemovidos', valor: dataset.metadata.camposRemovidos.join(', ') },
    ];

    const metadataSheet = XLSX.utils.json_to_sheet(metadataRows);
    const registrosSheet = XLSX.utils.json_to_sheet(dataset.registros);

    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'metadata');
    XLSX.utils.book_append_sheet(workbook, registrosSheet, 'registros');

    XLSX.writeFile(workbook, `dados-anonimizados-${Date.now()}.xlsx`);
}
