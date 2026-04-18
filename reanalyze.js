
const { OpenAI } = require("openai");
const { doc, getDoc, updateDoc, collection, query, orderBy, getDocs } = require("firebase/firestore");
const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");
require("dotenv").config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const openRouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

async function reanalyze() {
    try {
        console.log("Buscando a última avaliação para re-análise...");
        const q = query(collection(db, 'avaliacoes'), orderBy('data', 'desc'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("Nenhuma avaliação encontrada.");
            return;
        }

        const lastEvalDoc = querySnapshot.docs[0];
        const lastEval = lastEvalDoc.data();
        console.log("ID da Avaliação:", lastEvalDoc.id);

        const textoDoc = await getDoc(doc(db, 'textos', lastEval.textoId));
        const originalText = textoDoc.exists() ? textoDoc.data().conteudo : "Texto base não encontrado.";

        const prompt = `
  Aja como uma Psicopedagoga Clinica especialista em alfabetizacao e fluencia leitora.
  Analise o desempenho de um aluno do 3o ano com base nos criterios de avaliacao de fluencia.

  DADOS DA AVALIACAO:
  - PCM: ${lastEval.pcm}
  - Texto Base: "${originalText}"
  - Transcricao: "${lastEval.transcricao}"

  REGRAS DE RESPOSTA (JSON):
  Retorne APENAS um objeto JSON no seguinte formato:
  {
    "diagnostico": "Maximo 3 linhas. Foque no comportamento leitor observado.",
    "intervencao": "Maximo 2 linhas. Uma atividade pratica e especifica.",
    "metricas_qualitativas": {
      "leitura_precisa": boolean (true se a precisao for alta),
      "leitura_silabada": boolean (true se leu silaba por silaba),
      "boa_entonacao": boolean (true se houver expressividade),
      "interpretacao": boolean (true se sugerir compreensao),
      "pontuacao": boolean (true se respeitar virgulas e pontos)
    },
    "padrao_de_erro_detectado": "Breve descricao."
  }

  ATENCAO: Marque 'metricas_qualitativas' com extremo rigor acadêmico com base na transcrição.
  `;

        console.log("Processando nova análise via IA...");
        const response = await openRouter.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const newAnalysis = JSON.parse(response.choices[0].message.content);
        console.log("Nova análise gerada com sucesso.");

        console.log("Atualizando Firestore com as métricas qualitativas...");
        await updateDoc(doc(db, 'avaliacoes', lastEvalDoc.id), {
            diagnosticoIA: newAnalysis.diagnostico,
            intervencaoIA: newAnalysis.intervencao,
            metricasQualitativas: newAnalysis.metricas_qualitativas,
            padraoDeErro: newAnalysis.padrao_de_erro_detectado
        });

        console.log("Re-análise completa aplicada!");
    } catch (err) {
        console.error("Erro no processo de re-análise:", err);
    }
}

reanalyze();
