const fs = require("fs");
const { OpenAI, toFile } = require("openai");

const { calculatePCM, getPerformanceLevel } = require("./pcmUtils");

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

  return "http://localhost:8000";
}

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`A variavel de ambiente ${name} nao foi configurada.`);
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
        "X-Title": process.env.OPENROUTER_APP_NAME || "Fluencia Leitora",
      },
    }),
  };
}

function getFallbackAnalysis() {
  return {
    diagnostico: "Nao foi possivel gerar a analise no momento.",
    intervencao: "Avaliar manualmente com base no PCM e na leitura gravada.",
    metricas_qualitativas: {
      leitura_precisa: false,
      leitura_silabada: false,
      boa_entonacao: false,
      interpretacao: false,
      pontuacao: false,
    },
    padrao_de_erro_detectado: "Analise indisponivel",
  };
}

function parseAnalysisPayload(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    return getFallbackAnalysis();
  }
}

async function getPedagogicalDiagnosis(openRouter, pcm, level, originalText, transcription) {
  const prompt = `
  Aja como uma Psicopedagoga Clinica especialista em alfabetizacao e fluencia leitora.
  Analise o desempenho de um aluno do 3o ano com base nos criterios de avaliacao de fluencia.

  DADOS DA AVALIACAO:
  - PCM (Palavras Corretas por Minuto): ${pcm}
  - Classificacao Atual: ${level}
  (Referencia: Ate 60: Fase inicial | 61-75: Em desenvolvimento | 76-95: Em consolidacao | 96+: Fluente)
  - Texto Base: "${originalText}"
  - Transcricao da Leitura: "${transcription}"

  SUA TAREFA:
  1. Compare o Texto Base com a Transcricao para identificar padroes de erro (substituicoes, omissoes ou repeticoes).
  2. Avalie se o nivel "${level}" condiz com o comportamento transcrito.
  3. Gere um diagnostico que foque na causa da dificuldade (ex: decodificacao lenta, falta de automaticidade ou desatencao a pontuacao).
  4. Recomende uma intervencao pratica que o professor possa aplicar em sala de aula.

  REGRAS DE RESPOSTA (JSON):
  Retorne APENAS um objeto JSON no seguinte formato (sem explicacoes extras):
  {
    "diagnostico": "Maximo 3 linhas. Foque no comportamento leitor observado.",
    "intervencao": "Maximo 2 linhas. Uma atividade pratica e especifica.",
    "metricas_qualitativas": {
      "leitura_precisa": boolean,
      "leitura_silabada": boolean,
      "boa_entonacao": boolean,
      "interpretacao": boolean,
      "pontuacao": boolean
    },
    "padrao_de_erro_detectado": "Descreva em poucas palavras o erro mais frequente."
  }
  `;

  try {
    const response = await openRouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Voce e uma psicopedagoga que responde estritamente em JSON.",
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

async function processReadingAudio({ filePath, originalText, filename }) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("Arquivo de audio invalido.");
  }

  const sanitizedOriginalText = String(originalText || "").trim();

  if (!sanitizedOriginalText) {
    throw new Error("O texto original e obrigatorio.");
  }

  if (sanitizedOriginalText.length > MAX_ORIGINAL_TEXT_LENGTH) {
    throw new Error("O texto original excede o limite permitido.");
  }

  const { groq, openRouter } = createAIClients();

  const transcriptionResponse = await groq.audio.transcriptions.create({
    file: await toFile(fs.createReadStream(filePath), filename || "audio.webm"),
    model: "whisper-large-v3",
    language: "pt",
    response_format: "json",
  });

  const transcription = transcriptionResponse.text || "";
  const metrics = calculatePCM(sanitizedOriginalText, transcription);
  const pcm = metrics.corretas;
  const level = getPerformanceLevel(pcm);
  const analysis = await getPedagogicalDiagnosis(
    openRouter,
    pcm,
    level,
    sanitizedOriginalText,
    transcription,
  );

  return {
    filename: filename || "audio.webm",
    pcm,
    metrics,
    level,
    transcription,
    analysis,
  };
}

module.exports = {
  MAX_ORIGINAL_TEXT_LENGTH,
  getFallbackAnalysis,
  processReadingAudio,
};
