import fs from "fs";
import OpenAI from "openai";
import { calculatePCM, getPerformanceLevel, getNormaNacional, type AlignmentResult } from "./pcmUtils";

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
    diagnostico: "Não foi possível gerar a análise no momento.",
    intervencao: "Avaliar manualmente com base no PCM e na leitura gravada.",
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
    if (d.tipo === 'match') return d.lido;
    if (d.tipo === 'substitution') return `**${d.lido}**`;
    if (d.tipo === 'deletion') return `[${d.original}]`;
    if (d.tipo === 'insertion') return `(${d.lido})`;
    return '';
  }).join(' ');
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
  isForeigner?: boolean
) {
  const gradeNorm = studentGrade ? getNormaNacional(studentGrade) : 80;
  const gradeContext = studentGrade ? `O aluno é do ${studentGrade}. A norma nacional esperada para esta série é de ${gradeNorm} PCM.` : "O aluno é do 3º ano (contexto padrão).";
  const targetContext = targetPCM ? `A meta individual definida para este aluno é de ${targetPCM} PCM.` : "";
  const foreignerContext = isForeigner ? "O aluno é estrangeiro (ex: falante de espanhol estudando no Brasil), considere que padrões fonológicos específicos podem ocorrer devido ao sotaque ou interferência da língua nativa." : "";


  const historyContext = history && history.length > 0
    ? `HISTÓRICO DE EVOLUÇÃO (Últimas ${history.length} avaliações):
${history.map((h, i) => `  ${i + 1}. Data: ${new Date(h.data?.seconds * 1000).toLocaleDateString()}, PCM: ${h.pcm}, Diagnóstico: ${h.diagnosticoIA}`).join("\n")}`
    : "Não há histórico de avaliações anteriores para este aluno.";

  const omissions = alignmentDetails?.filter(d => d.tipo === 'deletion').map(d => d.original) || [];
  const substitutions = alignmentDetails?.filter(d => d.tipo === 'substitution').map(d => `${d.original} -> ${d.lido}`) || [];

  const alignmentContext = alignmentDetails
    ? `DETALHES DO ALINHAMENTO AUTOMÁTICO:
    - Palavras Omitidas: ${omissions.length > 0 ? omissions.join(", ") : "Nenhuma"}
    - Substituições Detectadas: ${substitutions.length > 0 ? substitutions.join(", ") : "Nenhuma"}`
    : "";

  const prompt = `
  Aja como uma Psicopedagoga Clínica especialista em alfabetização, neurociência da leitura e fluência leitora.
  Analise o desempenho de um aluno com base nos critérios científicos de fluência (Acurácia, Automaticidade e Prosódia).

  CONTEXTO DO ALUNO:
  - ${gradeContext}
  - ${targetContext}
  ${foreignerContext}
  
  ${historyContext}
  
  DADOS DA AVALIAÇÃO ATUAL:
  - PCM (Palavras Corretas por Minuto): ${pcm}
  - Classificação: ${level}
  - Texto Base: "${originalText}"
  - Transcrição da Leitura: "${transcription}"

  ${alignmentContext}

  SUA TAREFA DE ANÁLISE DETALHADA:
  1. Comparação Fonológica e Lexical: Use os 'DETALHES DO ALINHAMENTO' e a 'Transcrição' para identificar:
     - Substituições Fonológicas: Troca por sons parecidos (ex: p/b, t/d, f/v). Indica dificuldade de processamento fonológico.
     - Diferenças Fonológicas (Estrangeiros): Identifique se as trocas sugerem que o aluno é estrangeiro (ex: crianças sul-americanas estudando no Brasil que trazem fonemas do espanhol para a leitura do português). Se detectar esse padrão, mencione explicitamente no diagnóstico.
     - Substituições Visuais/Gráficas: Troca por letras visualmente similares (ex: m/n, p/q). Indica dificuldade de processamento visual.
     - Substituições Lexicais/Semânticas: Troca por palavras de sentido similar (ex: "casa" por "lar"). Indica uso de contexto para compensar decodificação falha.
     - Omissões ou Invenções: Pular palavras ou inventar finais. Indica falta de monitoramento ou tentativa de adivinhação.
  
  2. Avaliação de Prosódia e Ritmo:
     - Analise a transcrição em busca de sinais de leitura silabada (excesso de pausas ou hesitações).
     - Verifique se a pontuação foi respeitada (pausas nos lugares certos).
  
  3. Diagnóstico, Evolução e Intervenção:
     - O diagnóstico deve ser técnico e preciso, focando na "Fase de Leitura" (Logográfica, Alfabética ou Ortográfica). 
     - No diagnóstico, considere a fonologia diferente se o aluno demonstrar padrões de estrangeiro.
     - Compare os dados atuais com o HISTÓRICO fornecido (se houver) para identificar se houve evolução, estagnação ou regressão.
     - A intervenção deve ser uma técnica baseada em evidências (ex: Leitura Repetida, Leitura Compartilhada, Treino de Consciência Fonológica).

  4. Interpretação e Compreensão:
     - Com base no Texto Base, crie 3 perguntas objetivas ou de resposta curta para definir se o aluno interpretou o que leu.
  
  REGRAS DE RESPOSTA (JSON):
  Retorne APENAS um objeto JSON no seguinte formato:
  {
    "diagnostico": "Máximo 3 linhas. Use termos técnicos. Mencione se houver padrões de fonologia estrangeira e cite a evolução em relação ao histórico se aplicável.",
    "intervencao": "Máximo 2 linhas. Atividade prática baseada em evidências.",
    "metricas_qualitativas": {
      "leitura_precisa": boolean,
      "leitura_precisa_justificativa": "Análise técnica das trocas (ex: 'Houve 3 trocas fonológicas de p por b').",
      "leitura_silabada": boolean,
      "leitura_silabada_justificativa": "Descrever se há falta de síntese fonêmica ou automatização.",
      "boa_entonacao": boolean,
      "boa_entonacao_justificativa": "Análise da melodia e expressividade.",
      "interpretacao": boolean,
      "interpretacao_justificativa": "Probabilidade de compreensão baseada na fluidez.",
      "pontuacao": boolean,
      "pontuacao_justificativa": "Indicar se as pausas transcrevem a estrutura sintática."
    },
    "padrao_de_erro_detectado": "Categoria principal: fonológico, estrangeiro, visual, lexical, omissão ou adivinhação.",
    "nivel_de_confianca": number (1 a 100, baseado na clareza da transcrição vs texto base),
    "analise_evolucao": "Breve comentário (1 linha) sobre o progresso do aluno comparado ao histórico.",
    "perguntas_compreensao": [
      { "pergunta": "string", "resposta_esperada": "string" },
      { "pergunta": "string", "resposta_esperada": "string" },
      { "pergunta": "string", "resposta_esperada": "string" }
    ]
  }

  ATENÇÃO: Requer-se ALTA PRECISÃO. Se o PCM estiver muito abaixo da norma, 'leitura_precisa' DEVE ser false. Se houver muitas vírgulas ignoradas na transcrição, 'pontuacao' DEVE ser false. Use as justificativas para mostrar que você analisou detalhadamente os erros fonéticos.
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
}: ProcessAudioParams): Promise<ProcessAudioResult> {
  const sanitizedOriginalText = sanitizeInput(originalText);

  if (!sanitizedOriginalText) {
    throw new Error("O texto original é obrigatório ou inválido.");
  }

  const { openai } = createAIClients();
  console.log(`Iniciando transcrição OpenAI para arquivo: ${filename}`);
  const transcriptionResponse = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath) as any,
    model: "whisper-1",
    language: "pt",
    response_format: "json",
  });

  const transcription = transcriptionResponse.text || "";
  console.log(`Transcrição concluída: "${transcription.substring(0, 50)}..."`);

  const metrics = calculatePCM(sanitizedOriginalText, transcription);

  // Cálculo preciso de PCM: (palavras_corretas / duracao_em_segundos) * 60
  // Usamos Math.max(duration, 5) para evitar divisão por zero ou tempos irreais
  const effectiveDuration = Math.max(duration, 1);
  const pcm = Math.round((metrics.corretas / effectiveDuration) * 60);

  const level = getPerformanceLevel(pcm);

  console.log(`Métricas: PCM=${pcm} (baseado em ${effectiveDuration.toFixed(1)}s), Nível=${level}`);
  console.log("Iniciando diagnóstico OpenAI...");

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
    isForeigner
  );

  console.log("Diagnóstico OpenAI finalizado");

  // Geramos a transcrição marcada programaticamente para garantir precisão técnica
  // e evitar alucinações da IA em casos de grandes discrepâncias.
  const programmaticMarkedTranscription = generateMarkedTranscription(metrics.detalhes);
  
  // Se a precisão for muito baixa, adicionamos um aviso no diagnóstico
  if (metrics.precisao < 20 && !isForeigner) {
    analysis.diagnostico = "⚠️ ALERTA DE QUALIDADE: A transcrição parece muito diferente do texto original. Verifique se o áudio está claro ou se o texto correto foi selecionado. " + analysis.diagnostico;
  }

  return {
    filename: filename || "audio.webm",
    pcm,
    duration: effectiveDuration,
    metrics,
    level,
    transcription,
    analysis: {
      ...analysis,
      transcricao_marcada: programmaticMarkedTranscription
    },
  };
}

export { MAX_ORIGINAL_TEXT_LENGTH, getFallbackAnalysis };