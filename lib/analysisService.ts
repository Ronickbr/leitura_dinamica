import fs from "fs";
import OpenAI from "openai";
import { calculatePCM, getPerformanceLevel } from "./pcmUtils";

const MAX_ORIGINAL_TEXT_LENGTH = 10000;

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
  transcription: string
) {
  const prompt = `
  Aja como uma Psicopedagoga Clinica especialista em alfabetização e fluência leitora.
  Analise o desempenho de um aluno do 3o ano com base nos critérios de avaliação de fluência.

  DADOS DA AVALIAÇÃO:
  - PCM (Palavras Corretas por Minuto): ${pcm}
  - Classificação Atual: ${level}
  (Referência: Até 60: Fase inicial | 61-75: Em desenvolvimento | 76-95: Em consolidação | 96+: Fluente)
  - Texto Base: "${originalText}"
  - Transcrição da Leitura: "${transcription}"

  SUA TAREFA:
  1. Compare o Texto Base com a Transcrição para identificar padrões de erro (substituições, omissões ou repetições).
  2. Avalie se o nível "${level}" condiz com o comportamento transcrito.
  3. Gere um diagnóstico que foque na causa da dificuldade (ex: decodificação lenta, falta de automaticidade ou desatenção à pontuação).
  4. Recomende uma intervenção prática que o professor possa aplicar em sala de aula.

  REGRAS DE RESPOSTA (JSON):
  Retorne APENAS um objeto JSON no seguinte formato:
  {
    "diagnostico": "Máximo 3 linhas. Foque no comportamento leitor observado.",
    "intervencao": "Máximo 2 linhas. Uma atividade prática e específica.",
    "metricas_qualitativas": {
      "leitura_precisa": boolean (true se a precisão for alta e poucas palavras foram trocadas),
      "leitura_silabada": boolean (true se o aluno ler pausadamente silaba por silaba),
      "boa_entonacao": boolean (true se houver expressividade na leitura),
      "interpretacao": boolean (true se a leitura sugerir compreensão do texto),
      "pontuacao": boolean (true se respeitar vírgulas e pontos)
    },
    "padrao_de_erro_detectado": "Descreva em poucas palavras o erro mais frequente."
  }

  ATENÇÃO: Analise cuidadosamente a transcrição para preencher as 'métricas_qualitativas'. Por exemplo, se você observar falta de pontuação no diagnóstico, marque 'pontuacao' como false. Se citar silabação, marque 'leitura_silabada' como true.
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
      leitura_silabada: boolean;
      boa_entonacao: boolean;
      interpretacao: boolean;
      pontuacao: boolean;
    };
    padrao_de_erro_detectado: string;
  };
}

export async function processReadingAudio({
  filePath,
  originalText,
  filename,
}: ProcessAudioParams): Promise<ProcessAudioResult> {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("Arquivo de áudio inválido.");
  }

  const sanitizedOriginalText = String(originalText || "").trim();

  if (!sanitizedOriginalText) {
    throw new Error("O texto original é obrigatório.");
  }

  if (sanitizedOriginalText.length > MAX_ORIGINAL_TEXT_LENGTH) {
    throw new Error("O texto original excede o limite permitido.");
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
    transcription
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