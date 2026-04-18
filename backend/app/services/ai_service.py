import httpx
import json
import re
from app.core.config import settings

async def transcribe_audio(file_path: str) -> str:
    """Transcreve áudio usando o Groq (Whisper-large-v3)."""
    if not settings.GROQ_API_KEY:
        return ""

    async with httpx.AsyncClient() as client:
        with open(file_path, "rb") as audio_file:
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files={"file": audio_file},
                data={
                    "model": "whisper-large-v3",
                    "language": "pt",
                    "response_format": "json"
                }
            )
        if response.status_code == 200:
            return response.json().get("text", "")
        return ""

async def get_pedagogical_analysis(pcm: int, level: str, original: str, transcription: str) -> dict:
    """Gera diagnóstico pedagógico via OpenRouter."""
    if not settings.OPENROUTER_API_KEY:
        return {"diagnostico": "Erro: API Key não configurada.", "intervencao": "Avaliação manual recomendada."}

    prompt = f"""
    Aja como uma Psicopedagoga especialista em fluência leitora.
    Analise o desempenho de um aluno:
    - PCM: {pcm}
    - Nível: {level}
    - Original: "{original}"
    - Lido: "{transcription}"
    
    Retorne um JSON com:
    - diagnostico (max 3 linhas)
    - intervencao (max 2 linhas)
    - metricas_qualitativas (booleans: leitura_precisa, leitura_silabada, boa_entonacao, interpretacao_provavel, respeito_pontuacao)
    - padrao_de_erro_detectado (string curta)
    """

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "X-Title": "Leitura Digital PRD"
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"]["content"]
                match = re.search(r"(\{.*\})", content, re.DOTALL)
                if match:
                    return json.loads(match.group(1))
    except Exception as e:
        print(f"Erro na análise IA: {e}")

    return {
        "diagnostico": "Não foi possível gerar análise automática.",
        "intervencao": "Análise manual necessária.",
        "metricas_qualitativas": {
            "leitura_precisa": False,
            "leitura_silabada": False,
            "boa_entonacao": False,
            "interpretacao_provavel": False,
            "respeito_pontuacao": False
          }
    }
