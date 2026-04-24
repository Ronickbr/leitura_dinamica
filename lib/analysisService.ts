import fs from "fs";
import OpenAI from "openai";
import { calculatePCM, getPerformanceLevel, getNormaNacional } from "./pcmUtils";

const MAX_ORIGINAL_TEXT_LENGTH = 10000;

function sanitizeInput(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control chars
    .replace(/<script|javascript:|on\w+=/gi, "") // Remove XSS
    .slice(0, MAX_ORIGINAL_TEXT_LENGTH);
}

function getPublicAppUrl() {
  if (process.env.OPENROUTER_SITE_URL) {
    return process.env.OPENROUTER_SITE_URL;
  }

  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
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
    groq: new OpenAI({
      apiKey: getRequiredEnv("GROQ_API_KEY"),
      baseURL: "https://api.groq.com/openai/v1",
    }),
    openRouter: new OpenAI({
      apiKey: getRequiredEnv("OPENROUTER_API_KEY"),
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": getPublicAppUrl(),
        "X-Title": process.env.OPENROUTER_APP_NAME || "Fluência Leitora",
      },
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
    nivel_de_confianca: 0
  };
}

function parseAnalysisPayload(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    return getFallbackAnalysis();
  }
}

async function getPedagogicalDiagnosis(
  openRouter: OpenAI,
  pcm: number,
  level: string,
  originalText: string,
  transcription: string,
  studentGrade?: string,
  targetPCM?: number
) {
  const gradeNorm = studentGrade ? getNormaNacional(studentGrade) : 80;
  const gradeContext = studentGrade ? `O aluno é do ${studentGrade}. A norma nacional esperada para esta série é de ${gradeNorm} PCM.` : "O aluno é do 3º ano (contexto padrão).";
  const targetContext = targetPCM ? `A meta individual definida para este aluno é de ${targetPCM} PCM.` : "";

  const prompt = `
  Aja como uma Psicopedagoga Clínica especialista em alfabetização, neurociência da leitura e fluência leitora.
  Analise o desempenho de um aluno com base nos critérios científicos de fluência (Acurácia, Automaticidade e Prosódia).

  CONTEXTO DO ALUNO:
  - ${gradeContext}
  - ${targetContext}
  
  DADOS DA AVALIAÇÃO ATUAL:
  - PCM (Palavras Corretas por Minuto): ${pcm}
  - Classificação: ${level}
  - Texto Base: "${originalText}"
  - Transcrição da Leitura: "${transcription}"

  SUA TAREFA DE ANÁLISE DETALHADA:
  1. Comparação Fonológica e Lexical: Identifique se as discrepâncias entre o Texto Base e a Transcrição são:
     - Substituições Fonológicas: Troca por sons parecidos (ex: p/b, t/d, f/v). Indica dificuldade de processamento fonológico.
     - Substituições Visuais/Gráficas: Troca por letras visualmente similares (ex: m/n, p/q). Indica dificuldade de processamento visual.
     - Substituições Lexicais/Semânticas: Troca por palavras de sentido similar (ex: "casa" por "lar"). Indica uso de contexto para compensar decodificação falha.
     - Omissões ou Invenções: Pular palavras ou inventar finais. Indica falta de monitoramento ou tentativa de adivinhação.
  
  2. Avaliação de Prosódia e Ritmo:
     - Analise a transcrição em busca de sinais de leitura silabada (excesso de pausas ou hesitações).
     - Verifique se a pontuação foi respeitada (pausas nos lugares certos).
  
  3. Diagnóstico e Intervenção:
     - O diagnóstico deve ser técnico e preciso, focando na "Fase de Leitura" (Logográfica, Alfabética ou Ortográfica).
     - A intervenção deve ser uma técnica baseada em evidências (ex: Leitura Repetida, Leitura Compartilhada, Treino de Consciência Fonológica).

  REGRAS DE RESPOSTA (JSON):
  Retorne APENAS um objeto JSON no seguinte formato:
  {
    "diagnostico": "Máximo 3 linhas. Use termos técnicos como 'decodificação', 'automaticidade', 'prosódia'.",
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
    "padrao_de_erro_detectado": "Categoria principal: fonológico, visual, lexical, omissão ou adivinhação.",
    "nivel_de_confianca": number (1 a 100, baseado na clareza da transcrição vs texto base)
  }

  ATENÇÃO: Requer-se ALTA PRECISÃO. Se a precisão original estiver abaixo de 80%, 'leitura_precisa' DEVE ser false. Se houver muitas vírgulas ignoradas na transcrição, 'pontuacao' DEVE ser false. Use as justificativas para mostrar que você analisou detalhadamente a transcrição.
  `;

  try {
    const response = await openRouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
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
    console.error("Erro no OpenRouter:", error);
    return getFallbackAnalysis();
  }
}

interface ProcessAudioParams {
  filePath: string;
  originalText: string;
  filename: string;
  studentGrade?: string;
  targetPCM?: number;
}

interface ProcessAudioResult {
  filename: string;
  pcm: number;
  metrics: {
    corretas: number;
    total_original: number;
    total_lido: number;
    precisao: number;
  };
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
  };
}

export async function processReadingAudio({
  filePath,
  originalText,
  filename,
  studentGrade,
  targetPCM,
}: ProcessAudioParams): Promise<ProcessAudioResult> {
  const sanitizedOriginalText = sanitizeInput(originalText);

  if (!sanitizedOriginalText) {
    throw new Error("O texto original é obrigatório ou inválido.");
  }

  const { groq, openRouter } = createAIClients();
  console.log(`Iniciando transcrição Groq para arquivo: ${filename}`);
  const transcriptionResponse = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath) as unknown as File,
    model: "whisper-large-v3",
    language: "pt",
    response_format: "json",
  });

  const transcription = transcriptionResponse.text || "";
  console.log(`Transcrição concluída: "${transcription.substring(0, 50)}..."`);

  const metrics = calculatePCM(sanitizedOriginalText, transcription);
  const pcm = metrics.corretas;
  const level = getPerformanceLevel(pcm);

  console.log(`Métricas: PCM=${pcm}, Nível=${level}`);
  console.log("Iniciando diagnóstico OpenRouter...");

  const analysis = await getPedagogicalDiagnosis(
    openRouter,
    pcm,
    level,
    sanitizedOriginalText,
    transcription,
    studentGrade,
    targetPCM
  );

  console.log("Diagnóstico OpenRouter finalizado");

  return {
    filename: filename || "audio.webm",
    pcm,
    metrics,
    level,
    transcription,
    analysis,
  };
}

export { MAX_ORIGINAL_TEXT_LENGTH, getFallbackAnalysis };