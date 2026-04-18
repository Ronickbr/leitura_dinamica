require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { calculatePCM, getPerformanceLevel } = require('./pcmUtils');

const app = express();
const port = process.env.PORT || 8000;

// Configuração de Middleware
app.use(cors());
app.use(express.json());

// Configuração do Multer para upload de áudio
const upload = multer({ dest: 'uploads/' });

// Clientes de IA (Compatíveis com OpenAI SDK)
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

const openRouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Fluencia Leitora v1.2.0"
    }
});

// Endpoint de Saúde
app.get('/api/health', (req, res) => {
    res.json({ status: "ok", message: "API (Node.js) de Fluência Leitora ativa" });
});

// Módulo de Diagnóstico Pedagógico
async function getPedagogicalDiagnosis(pcm, level, original, transcription) {
    const prompt = `
    Aja como uma Psicopedagoga Clínica especialista em alfabetização e fluência leitora.
    Analise o desempenho de um aluno do 3º ano com base nos critérios de avaliação de fluência.
    
    DADOS DA AVALIAÇÃO:
    - PCM (Palavras Corretas por Minuto): ${pcm}
    - Classificação Atual: ${level} 
    (Referência: Até 60: Fase inicial | 61-75: Em desenvolvimento | 76-95: Em consolidação | 96+: Fluente)
    - Texto Base: "${original}"
    - Transcrição da Leitura: "${transcription}"
    
    SUA TAREFA:
    1. Compare o Texto Base com a Transcrição para identificar padrões de erro (substituições, omissões ou repetições).
    2. Avalie se o nível "${level}" condiz com o comportamento transcrito.
    3. Gere um diagnóstico que foque na causa da dificuldade (ex: decodificação lenta, falta de automaticidade ou desatenção à pontuação).
    4. Recomende uma intervenção prática que o professor possa aplicar em sala de aula.

    REGRAS DE RESPOSTA (JSON):
    Retorne APENAS um objeto JSON no seguinte formato (sem explicações extras):
    {
    "diagnostico": "Máximo 3 linhas. Foque no comportamento leitor observado.",
    "intervencao": "Máximo 2 linhas. Uma atividade prática e específica.",
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
                { role: "system", content: "Você é uma psicopedagoga que responde estritamente em JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error("Erro no OpenRouter:", error);
        return {
            diagnostico: "Não foi possível gerar a análise no momento.",
            intervencao: "Avaliar manualmente baseado no PCM obtido.",
            metricas_qualitativas: {
                leitura_precisa: false,
                leitura_silabada: false,
                boa_entonacao: false,
                interpretacao: false,
                pontuacao: false
            }
        };
    }
}

// Endpoint Principal: Processamento de Áudio
app.post('/api/process-audio', upload.single('file'), async (req, res) => {
    const tempPath = req.file.path;
    const originalText = req.body.original_text;

    try {
        // 1. Transcrição via Groq
        const transcriptionResponse = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: "whisper-large-v3",
            language: "pt",
            response_format: "json"
        });

        const transcription = transcriptionResponse.text;

        // 2. Cálculos Métricos
        const metrics = calculatePCM(originalText, transcription);
        const pcm = metrics.corretas;
        const level = getPerformanceLevel(pcm);

        // 3. IA Pedagógica
        const analysis = await getPedagogicalDiagnosis(pcm, level, originalText, transcription);

        // 4. Resposta
        res.json({
            filename: req.file.originalname,
            pcm: pcm,
            metrics: metrics,
            level: level,
            transcription: transcription,
            analysis: analysis
        });

    } catch (error) {
        console.error("Erro no processamento:", error);
        res.status(500).json({ detail: "Erro interno no processamento do áudio" });
    } finally {
        // Limpar arquivo temporário
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`\n🚀 Servidor Leitura Digital (Node.js) rodando em http://localhost:${port}`);
    console.log(`📂 Modo: ${process.env.NODE_ENV || 'development'}\n`);
});
