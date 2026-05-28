import fs from "fs";
import OpenAI from "openai";
import { calculatePCM, getPerformanceLevel, getNormaNacional, type AlignmentResult, type DetalheAlinhamento } from "./pcmUtils";

const MAX_ORIGINAL_TEXT_LENGTH = 10000;

function sanitizeInput(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control chars
    .replace(/<script|javascript:|on\w+=/gi, "") // Remove XSS
    .slice(0, MAX_ORIGINAL_TEXT_LENGTH);
}


function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`A variável de ambiente ${name} não foi configurada.`);
  }

  return value;
}

function createAIClients() {
  return {
    openai: new OpenAI({
      apiKey: getRequiredEnv("OPENAI_API_KEY"),
    }),
  };
}

function getFallbackAnalysis() {
  return {
    diagnostico: "Análise indisponível.",
    intervencao: "Revisar a gravação manualmente.",
    metricas_qualitativas: {
      leitura_precisa: false,
      leitura_silabada: false,
      boa_entonacao: false,
      interpretacao: false,
      pontuacao: false,
    },
    padrao_de_erro_detectado: "Análise indisponível",
    nivel_de_confianca: 0,
    perguntas_compreensao: []
  };
}

function parseAnalysisPayload(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    return getFallbackAnalysis();
  }
}

function generateMarkedTranscription(alignment: any[]): string {
  if (!alignment) return "";
  
  return alignment.map(d => {
    const original = d.originalTokens || d.original || "";
    const lido = d.lidoTokens || d.lido || "";

    if (d.tipo === 'match' || d.tipo === 'acceptable') return original;
    if (d.tipo === 'substitution') return `[${original}](${lido})`;
    if (d.tipo === 'deletion') return `[${original}]`;
    if (d.tipo === 'insertion') return `(${lido})`;
    if (d.tipo === 'unread') return '';
    return '';
  }).join(' ').replace(/\s+/g, ' ').trim();
}

function isHardAlignmentError(detail: DetalheAlinhamento) {
  return detail.tipo === "substitution" || detail.tipo === "deletion" || detail.tipo === "insertion";
}

function isRepeatedInsertion(detail: DetalheAlinhamento, previous?: DetalheAlinhamento, next?: DetalheAlinhamento) {
  if (detail.tipo !== "insertion") return false;
  const inserted = (detail.lidoTokens || detail.lido || "").trim().toLowerCase();
  const previousToken = (previous?.originalTokens || previous?.lidoTokens || previous?.original || previous?.lido || "").trim().toLowerCase();
  const nextToken = (next?.originalTokens || next?.lidoTokens || next?.original || next?.lido || "").trim().toLowerCase();
  return inserted !== "" && (inserted === previousToken || inserted === nextToken);
}

function buildRealErrorItems(details: DetalheAlinhamento[], maxItems = 3) {
  const items: string[] = [];

  details.forEach((detail, index) => {
    if (!isHardAlignmentError(detail) || items.length >= maxItems) {
      return;
    }

    const original = detail.originalTokens || detail.original || "";
    const read = detail.lidoTokens || detail.lido || "";

    if (detail.tipo === "substitution" && original && read) {
      items.push(`troca de "${original}" por "${read}"`);
      return;
    }

    if (detail.tipo === "deletion" && original) {
      items.push(`omissão de "${original}"`);
      return;
    }

    if (detail.tipo === "insertion" && read) {
      const previous = details[index - 1];
      const next = details[index + 1];
      items.push(`${isRepeatedInsertion(detail, previous, next) ? "repetição" : "inserção"} de "${read}"`);
    }
  });

  return items;
}

function buildConciseDiagnostic(metrics: AlignmentResult) {
  const realErrorItems = buildRealErrorItems(metrics.detalhes);
  if (realErrorItems.length === 0) {
    return "Sem erros reais de leitura detectados.";
  }

  const hardErrorDetails = metrics.detalhes.filter(isHardAlignmentError).length;
  const remaining = hardErrorDetails - realErrorItems.length;
  const suffix = remaining > 0 ? ` e mais ${remaining} ocorrência(s).` : ".";
  return `Erros reais detectados: ${realErrorItems.join("; ")}${suffix}`;
}

function buildConciseIntervention(metrics: AlignmentResult) {
  const realErrorItems = buildRealErrorItems(metrics.detalhes, 2);
  if (realErrorItems.length === 0) {
    return "Sem intervenção corretiva imediata.";
  }

  return `Retomar a leitura guiada com foco em ${realErrorItems.join(" e ")}.`;
}

function applyDeterministicValidation(
  analysis: ProcessAudioResult["analysis"],
  metrics: AlignmentResult
): ProcessAudioResult["analysis"] {
  const hasRealErrors = metrics.erros > 0;
  const conciseDiagnostic = buildConciseDiagnostic(metrics);
  const conciseIntervention = buildConciseIntervention(metrics);
  const realErrorItems = buildRealErrorItems(metrics.detalhes, 3);

  const metricasQualitativas = {
    ...analysis.metricas_qualitativas,
    leitura_precisa: !hasRealErrors,
    leitura_precisa_justificativa: hasRealErrors
      ? conciseDiagnostic
      : "A leitura não apresentou trocas, omissões ou repetições indevidas.",
  };

  return {
    ...analysis,
    diagnostico: conciseDiagnostic,
    intervencao: conciseIntervention,
    padrao_de_erro_detectado: hasRealErrors ? analysis.padrao_de_erro_detectado || "lexical" : "nenhum",
    analise_evolucao: analysis.analise_evolucao ? analysis.analise_evolucao.slice(0, 120) : undefined,
    nivel_de_confianca: hasRealErrors ? Math.max(analysis.nivel_de_confianca || 0, 75) : Math.max(analysis.nivel_de_confianca || 0, 90),
    perguntas_compreensao: (analysis.perguntas_compreensao || []).slice(0, 3),
    metricas_qualitativas: metricasQualitativas,
    resumo_erros_reais: realErrorItems,
    variacoes_aceitas: metrics.variacoes_aceitas
  } as ProcessAudioResult["analysis"];
}

function buildTranscriptionPrompt(originalText: string, studentGrade?: string): string {
  const normalizedGrade = studentGrade?.trim() || "3º ano";
  const gradeGuidance = normalizedGrade.includes("3")
    ? "3º Ano: foco em decodificação silábica. Espere pausas longas e transcrições mais fragmentadas."
    : "4º e 5º Ano: foco em entonação e ritmo. Mantenha rigor na separação de termos compostos e adjacências de vírgulas.";

  return [
    "Você é um especialista em transcrição fonética e análise de fluência leitora para crianças do Ensino Fundamental I (3º ao 5º ano).",
    "Sua tarefa é transcrever exatamente o que o aluno diz, sem corrigir erros gramaticais, sem preencher lacunas e mantendo a individualidade de cada palavra.",
    'Evite aglutinações. Exemplo: transcreva "lançavam bolas" e nunca "lançavambolas".',
    "",
    "Diretrizes de transcrição:",
    "- Fidelidade literal: transcreva exatamente as hesitações, pausas e repetições.",
    "- Se o aluno substituir uma palavra, registre a palavra dita, não a palavra correta.",
    "- Segmentação estrita: mantenha espaços claros entre as palavras.",
    "- Se houver dúvida entre uma palavra longa ou duas curtas, priorize a separação com base no texto original de referência.",
    "- Pontuação: use pontuação para marcar pausas respiratórias do aluno, mesmo que não coincidam com a pontuação gramatical do texto.",
    "",
    "Tratamento por nível:",
    `- ${gradeGuidance}`,
    "",
    "Informações de referência:",
    `- Série do aluno: ${normalizedGrade}`,
    `- Texto base para comparação: "${originalText}"`,
    "",
    "Inicie a transcrição agora.",
    "Não adicione comentários explicativos.",
    "Retorne somente a transcrição fiel ao áudio."
  ].join("\n");
}

async function getPedagogicalDiagnosis(
  openai: OpenAI,
  pcm: number,
  level: string,
  originalText: string,
  transcription: string,
  studentGrade?: string,
  targetPCM?: number,
  history?: any[],
  alignmentDetails?: any[],
  isForeigner?: boolean,
  isGlassesUser?: boolean
) {
  const gradeNorm = studentGrade ? getNormaNacional(studentGrade) : 80;
  const gradeContext = studentGrade ? `O aluno é do ${studentGrade}. A norma nacional esperada para esta série é de ${gradeNorm} PCM.` : "O aluno é do 3º ano (contexto padrão).";
  const targetContext = targetPCM ? `A meta individual definida para este aluno é de ${targetPCM} PCM.` : "";
  const foreignerContext = isForeigner ? "O aluno é estrangeiro (ex: falante de espanhol estudando no Brasil), considere que padrões fonológicos específicos podem ocorrer devido ao sotaque ou interferência da língua nativa." : "";
  const glassesContext = isGlassesUser ? "O aluno é usuário de óculos. Considere que dificuldades visuais (ex: pular linhas, trocar letras similares visualmente) podem estar relacionadas à acomodação visual ou necessidade de ajuste das lentes, além de fatores puramente fonológicos." : "";

  const historyContext = history && history.length > 0
    ? `HISTÓRICO DE EVOLUÇÃO (Últimas ${history.length} avaliações):
${history.map((h, i) => `  ${i + 1}. Data: ${new Date(h.data?.seconds * 1000).toLocaleDateString()}, PCM: ${h.pcm}, Diagnóstico: ${h.diagnosticoIA}`).join("\n")}`
    : "Não há histórico de avaliações anteriores para este aluno.";

  const omissions = alignmentDetails?.filter(d => d.tipo === 'deletion').map(d => d.original) || [];
  const substitutions = alignmentDetails?.filter(d => d.tipo === 'substitution').map(d => `${d.original} -> ${d.lido}`) || [];
  const insertions = alignmentDetails?.filter(d => d.tipo === 'insertion').map(d => d.lido) || [];
  const markedTranscription = generateMarkedTranscription(alignmentDetails || []);

  const alignmentContext = alignmentDetails
    ? `DETALHES DO ALINHAMENTO AUTOMÁTICO (ESTRUTURADO):
    - Palavras Omitidas: ${omissions.length > 0 ? omissions.join(", ") : "Nenhuma"}
    - Substituições Detectadas: ${substitutions.length > 0 ? substitutions.join(", ") : "Nenhuma"}
    - Palavras Adicionadas (Extra): ${insertions.length > 0 ? insertions.join(", ") : "Nenhuma"}
    
    TRANSCRICÃO MARCADA (LEGENDA: [original](lido)=substituição, [original]=omissão, (lido)=inserção):
    "${markedTranscription}"`
    : "";

  const prompt = `
  Aja como uma psicopedagoga clínica especialista em alfabetização, neurociência da leitura e fluência leitora no Ensino Fundamental I.
  Sua missão é produzir uma análise diagnóstica precisa, objetiva e tecnicamente coerente com a leitura realizada pelo aluno.

  CONTEXTO GERAL:
  - Considere que a transcrição foi produzida com foco em fidelidade literal ao áudio, preservando hesitações, pausas, repetições e segmentação entre palavras.
  - Não normalize a leitura do aluno mentalmente. Analise o desempenho a partir do que foi efetivamente lido.
  - Quando houver divergência entre impressão geral e dados estruturados, priorize os dados estruturados.

  DADOS ESTRUTURADOS (PRIORIDADE MÁXIMA):
  Use estes dados como EVIDÊNCIA para suas conclusões. Se os dados mostram erros, você DEVE apontá-los.
  - PCM: ${pcm}
  - Classificação: ${level}
  - ${gradeContext}
  - ${targetContext}
  ${foreignerContext}
  ${glassesContext}

  DETALHES DO ALINHAMENTO (O que foi realmente lido vs original):
  ${alignmentContext}

  TEXTO ORIGINAL: "${originalText}"
  TRANSCRICÃO BRUTA (WHISPER): "${transcription}"

  INSTRUÇÕES PARA O DIAGNÓSTICO:
  1. Acurácia: identifique apenas erros reais de leitura, como substituições, omissões ou repetições indevidas.
  2. Automaticidade: avalie se o PCM e a forma de leitura indicam fluidez, esforço de decodificação ou leitura silabada.
  3. Prosódia e Ritmo: use a transcrição e a pontuação registrada como indícios de pausas, entonação e cadência.
  4. Adequação à série: para 3º ano, observe com maior sensibilidade sinais de decodificação silábica; para 4º e 5º ano, seja mais rigorosa com fluidez, ritmo e precisão em palavras adjacentes.
  5. Comparação com histórico: ${historyContext}

  RESTRIÇÕES DE RIGOR CLÍNICO (MUITO IMPORTANTE):
  - Considere pausas breves, pequenas quebras de palavra e variações leves de transcrição como aceitáveis quando o alinhamento estrutural não indicar erro real.
  - Se houver palavras em [colchetes] na Transcrição Marcada, "leitura_precisa" DEVE ser false.
  - Se houver substituições [orig](lido), use exemplos concretos nas justificativas sempre que forem relevantes.
  - NÃO ignore os dados do alinhamento. Se o alinhamento mostra erro, o diagnóstico não pode descrever leitura perfeita.
  - Não invente capacidades que não possam ser inferidas dos dados fornecidos.
  - Seja empática com o aluno, mas tecnicamente rigorosa para apoiar a decisão pedagógica do professor.

  REQUISITOS DO FORMATO DE RESPOSTA (JSON):
  Você DEVE retornar EXATAMENTE este formato JSON:
  {
    "diagnostico": "Máximo de 2 frases curtas, focadas apenas em erros reais de leitura.",
    "intervencao": "Máximo de 1 frase curta e objetiva.",
    "metricas_qualitativas": {
      "leitura_precisa": boolean,
      "leitura_precisa_justificativa": "Cite exemplos específicos de trocas ou omissões vistos na Transcrição Marcada.",
      "leitura_silabada": boolean,
      "leitura_silabada_justificativa": "Justifique com base na fluidez da transcrição.",
      "boa_entonacao": boolean,
      "boa_entonacao_justificativa": "Baseado na pontuação respeitada ou ignorada.",
      "interpretacao": boolean,
      "interpretacao_justificativa": "Probabilidade baseada na acurácia lexical.",
      "pontuacao": boolean,
      "pontuacao_justificativa": "Se parou nos pontos e vírgulas."
    },
    "padrao_de_erro_detectado": "fonológico, visual, lexical, omissão, adivinhação ou nenhum.",
    "nivel_de_confianca": number (1-100),
    "analise_evolucao": "1 linha curta comparando com histórico.",
    "perguntas_compreensao": [
      { "pergunta": "...", "resposta_esperada": "..." },
      { "pergunta": "...", "resposta_esperada": "..." },
      { "pergunta": "...", "resposta_esperada": "..." }
    ]
  }
  `;

  try {

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é uma psicopedagoga que responde estritamente em JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices?.[0]?.message?.content;


    if (!content) {
      return getFallbackAnalysis();
    }

    return parseAnalysisPayload(content);
  } catch (error) {
    console.error("Erro na OpenAI:", error);
    return getFallbackAnalysis();
  }
}

interface ProcessAudioParams {
  filePath: string;
  originalText: string;
  filename: string;
  studentGrade?: string;
  targetPCM?: number;
  history?: any[];
  duration?: number;
  isForeigner?: boolean;
  isGlassesUser?: boolean;
}

interface ProcessAudioResult {
  filename: string;
  pcm: number;
  duration: number;
  metrics: AlignmentResult;
  level: string;
  transcription: string;
  analysis: {
    diagnostico: string;
    intervencao: string;
    metricas_qualitativas: {
      leitura_precisa: boolean;
      leitura_precisa_justificativa: string;
      leitura_silabada: boolean;
      leitura_silabada_justificativa: string;
      boa_entonacao: boolean;
      boa_entonacao_justificativa: string;
      interpretacao: boolean;
      interpretacao_justificativa: string;
      pontuacao: boolean;
      pontuacao_justificativa: string;
    };
    padrao_de_erro_detectado: string;
    nivel_de_confianca: number;
    analise_evolucao?: string;
    transcricao_marcada?: string;
    resumo_erros_reais?: string[];
    variacoes_aceitas?: number;
    perguntas_compreensao: Array<{
      pergunta: string;
      resposta_esperada: string;
    }>;
  };
}

export async function processReadingAudio({
  filePath,
  originalText,
  filename,
  studentGrade,
  targetPCM,
  history,
  duration = 60,
  isForeigner,
  isGlassesUser,
}: ProcessAudioParams): Promise<ProcessAudioResult> {
  const sanitizedOriginalText = sanitizeInput(originalText);

  if (!sanitizedOriginalText) {
    throw new Error("O texto original é obrigatório ou inválido.");
  }

  const { openai } = createAIClients();
  const transcriptionPrompt = buildTranscriptionPrompt(sanitizedOriginalText, studentGrade);

  const transcriptionResponse = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath) as any,
    model: "whisper-1",
    language: "pt",
    prompt: transcriptionPrompt,
    temperature: 0,
    response_format: "json",
  });

  const transcription = transcriptionResponse.text || "";


  const metrics = calculatePCM(sanitizedOriginalText, transcription);

  // Cálculo preciso de PCM: (palavras_corretas / duracao_em_segundos) * 60
  // Usamos Math.max(duration, 5) para evitar divisão por zero ou tempos irreais
  const effectiveDuration = Math.max(duration, 1);
  const pcm = Math.round((metrics.corretas / effectiveDuration) * 60);

  const level = getPerformanceLevel(pcm);



  const analysis = await getPedagogicalDiagnosis(
    openai,
    pcm,
    level,
    sanitizedOriginalText,
    transcription,
    studentGrade,
    targetPCM,
    history,
    metrics.detalhes,
    isForeigner,
    isGlassesUser
  );



  // Geramos a transcrição marcada programaticamente para garantir precisão técnica
  // e evitar alucinações da IA em casos de grandes discrepâncias.
  const programmaticMarkedTranscription = generateMarkedTranscription(metrics.detalhes);
  const validatedAnalysis = applyDeterministicValidation(analysis, metrics);
  
  // Se a precisão for muito baixa, adicionamos um aviso no diagnóstico
  if (metrics.precisao < 20 && !isForeigner) {
    validatedAnalysis.diagnostico = "Alerta de qualidade: a transcrição ficou distante do texto de referência. Revise o áudio e o texto selecionado.";
  }

  return {
    filename: filename || "audio.webm",
    pcm,
    duration: effectiveDuration,
    metrics,
    level,
    transcription,
    analysis: {
      ...validatedAnalysis,
      transcricao_marcada: programmaticMarkedTranscription
    },
  };
}

export { MAX_ORIGINAL_TEXT_LENGTH, getFallbackAnalysis };
