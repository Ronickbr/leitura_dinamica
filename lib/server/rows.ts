export const studentRow = (r: any) => ({
  id: r.id, nome: r.nome, turma: r.turma, serie: r.serie, turno: r.turno,
  diagnostico: r.diagnostico ?? undefined, observacoes: r.observacoes ?? undefined,
  professorId: r.professor_id, anoLetivo: r.ano_letivo, metaPCM: r.meta_pcm,
  retentionUntil: r.retention_until,
});

export const evaluationRow = (r: any) => ({
  id: r.id, alunoId: r.aluno_id, professorId: r.professor_id, textoId: r.texto_id,
  precisao: r.precisao, transcricao: r.transcricao, transcricaoMarcada: r.transcricao_marcada,
  erros: r.erros, pcm: r.pcm, intervencaoIA: r.intervencao_ia, diagnosticoIA: r.diagnostico_ia,
  metricasQualitativas: r.metricas_qualitativas, perguntasCompreensao: r.perguntas_compreensao,
  words: r.words, fluencyMetrics: r.fluency_metrics, data: r.data, retentionUntil: r.retention_until,
});

export const textRow = (r: any) => ({
  id: r.id, titulo: r.titulo, conteudo: r.conteudo, serie: r.serie,
  numeroPalavras: r.numero_palavras, comDiagnostico: r.com_diagnostico,
});

export const importRow = (r: any) => ({
  id: r.id, fileName: r.file_name, successCount: r.success_count, errorCount: r.error_count,
  professorId: r.professor_id, importedAt: r.imported_at, retentionUntil: r.retention_until,
});
