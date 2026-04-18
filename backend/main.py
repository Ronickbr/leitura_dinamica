from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import httpx
import os
import sys
import webbrowser
from dotenv import load_dotenv
from pcm_utils import calculate_pcm, get_performance_level
import pystray
from pystray import MenuItem as item
from PIL import Image
import threading
import signal

def get_keys():
    # Tenta carregar o .env do diretório de execução (ao lado do .exe)
    # ou do diretório temporário do PyInstaller
    possible_env_paths = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.path.dirname(os.path.abspath(sys.executable if hasattr(sys, 'frozen') else __file__)), ".env"),
        resource_path(".env")
    ]
    
    for path in possible_env_paths:
        if os.path.exists(path):
            load_dotenv(path)
            # print(f"DEBUG: .env carregado de {path}")
            break
            
    return os.getenv("GROQ_API_KEY"), os.getenv("OPENROUTER_API_KEY")

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    import sys
    base_path = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_path, relative_path)

app = FastAPI(title="Fluência Leitora API")

# Configuração de CORS para o Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restringir ao domínio do frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "API de Fluência Leitora ativa"}

async def get_pedagogical_diagnosis(pcm: int, level: str, original: str, transcription: str) -> dict:
    """Chama o OpenRouter para gerar o diagnóstico pedagógico."""
    _, or_key = get_keys()
    if not or_key:
        print("ERRO: OPENROUTER_API_KEY não encontrada")
        return {
            "diagnostico": "O aluno demonstrou boa automaticidade na decodificação.",
            "intervencao": "Práticas de leitura compartilhada."
        }

    prompt = f"""
    Aja como uma Psicopedagoga Clínica especialista em alfabetização e fluência leitora.
    Analise o desempenho de um aluno do 3º ano com base nos critérios de avaliação de fluência.
    
    DADOS DA AVALIAÇÃO:
    - PCM (Palavras Corretas por Minuto): {pcm}
    - Classificação Atual: {level} 
    (Referência: Até 60: Fase inicial | 61-75: Em desenvolvimento | 76-95: Em consolidação | 96+: Fluente)
    - Texto Base: "{original}"
    - Transcrição da Leitura: "{transcription}"
    
    SUA TAREFA:
    1. Compare o Texto Base com a Transcrição para identificar padrões de erro (substituições, omissões ou repetições).
    2. Avalie se o nível "{level}" condiz com o comportamento transcrito.
    3. Gere um diagnóstico que foque na causa da dificuldade (ex: decodificação lenta, falta de automaticidade ou desatenção à pontuação).
    4. Recomende uma intervenção prática que o professor possa aplicar em sala de aula.

    REGRAS DE RESPOSTA (JSON):
    Retorne APENAS um objeto JSON no seguinte formato (sem explicações extras):
    {{
    "diagnostico": "Máximo 3 linhas. Foque no comportamento leitor observado.",
    "intervencao": "Máximo 2 linhas. Uma atividade prática e específica.",
    "metricas_qualitativas": {{
        "leitura_precisa": boolean,
        "leitura_silabada": boolean,
        "boa_entonacao": boolean,
        "interpretacao": boolean,
        "pontuacao": boolean
    }},
    "padrao_de_erro_detectado": "Descreva em poucas palavras o erro mais frequente."
    }}
    """

    try:
        async with httpx.AsyncClient() as client:
            print(f"Enviando para OpenRouter (Chave: {or_key[:8]}...)")
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {or_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "Fluencia Leitora"
                },
                json={
                    "model": "openai/gpt-4o-mini", 
                    "messages": [{"role": "system", "content": "Você é uma psicopedagoga que responde estritamente em JSON."}, {"role": "user", "content": prompt}]
                },
                timeout=45.0
            )
            
            if response.status_code == 200:
                res_content = response.json()["choices"][0]["message"]["content"]
                
                # Limpeza de JSON robusta
                import json
                import re
                
                # Remove blocos de código markdown se existirem
                res_content = re.sub(r"```json\s*|\s*```", "", res_content)
                
                # Procura pelo objeto JSON
                match = re.search(r"(\{.*\})", res_content, re.DOTALL)
                if match:
                    return json.loads(match.group(1))
                else:
                    # Tenta carregar o texto diretamente se não houver marcadores
                    return json.loads(res_content.strip())
            else:
                print(f"Erro OpenRouter Status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Erro no OpenRouter: {e}")
    
    return {
        "diagnostico": "Não foi possível gerar a análise no momento.",
        "intervencao": "Avaliar manualmente baseado no PCM obtido.",
        "metricas_qualitativas": {
            "leitura_precisa": False,
            "leitura_silabada": False,
            "boa_entonacao": False,
            "interpretacao": False,
            "pontuacao": False
        }
    }

@app.post("/api/process-audio")
async def process_audio(
    file: UploadFile = File(...),
    original_text: str = Form(...)
):
    # Salvar arquivo temporário para enviar ao Groq
    temp_filename = f"temp_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        buffer.write(await file.read())

    try:
        transcription = ""
        
        # Implementação Real Groq STT
        groq_key, _ = get_keys()
        if groq_key:
            async with httpx.AsyncClient() as client:
                with open(temp_filename, "rb") as audio_file:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {groq_key}"},
                        files={"file": audio_file},
                        data={
                            "model": "whisper-large-v3",
                            "language": "pt",
                            "response_format": "json"
                        }
                    )
                if response.status_code == 200:
                    transcription = response.json().get("text", "")
                else:
                    raise HTTPException(status_code=500, detail="Erro na transcrição via Groq")
        else:
            transcription = original_text # Mock
            print("AVISO: GROQ_API_KEY não definida. Usando mock.")

        # Cálculo do PCM
        metrics = calculate_pcm(original_text, transcription)
        pcm = metrics["corretas"]
        level = get_performance_level(pcm)
        
        # Diagnóstico Pedagógico via OpenRouter
        analysis = await get_pedagogical_diagnosis(pcm, level, original_text, transcription)

        return {
            "filename": file.filename,
            "pcm": pcm,
            "metrics": metrics,
            "level": level,
            "transcription": transcription,
            "analysis": analysis
        }
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

# Servir o Frontend Estático
# Verifica se a pasta dist existe antes de tentar servir
dist_path = resource_path("frontend_dist")
if not os.path.exists(dist_path):
    # Fallback para ambiente de desenvolvimento
    dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")

    # Rota catch-all para suportar o roteamento do React (SPA)
    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        return FileResponse(os.path.join(dist_path, "index.html"))


class SystemTrayApp:
    def __init__(self):
        self.icon = None
        self.stop_event = threading.Event()

    def open_browser(self):
        webbrowser.open("http://localhost:8000")

    def exit_app(self, icon, item):
        print("Finalizando aplicação...")
        self.stop_event.set()
        icon.stop()
        os._exit(0)

    def run_tray(self):
        icon_path = resource_path("icon.png")
        if not os.path.exists(icon_path):
            # Fallback icon se não encontrar
            image = Image.new('RGB', (64, 64), color=(99, 102, 241))
        else:
            image = Image.open(icon_path)

        menu = pystray.Menu(
            item('Abrir Sistema', self.open_browser, default=True),
            item('Verificar Status', lambda: webbrowser.open("http://localhost:8000/api/health")),
            pystray.Menu.SEPARATOR,
            item('Sair', self.exit_app)
        )

        self.icon = pystray.Icon("leitura_digital", image, "Leitura Digital", menu)
        self.icon.run()

def run_server():
    # log_config=None evita que o uvicorn tente configurar o terminal inexistente
    uvicorn.run(app, host="0.0.0.0", port=8000, log_config=None)

if __name__ == "__main__":
    # Inicializa o app de bandeja
    tray = SystemTrayApp()

    # Inicia o servidor uvicorn em uma thread separada
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # Abre o navegador automaticamente
    threading.Timer(1.5, tray.open_browser).start()

    # Inicia a bandeja do sistema (bloqueia a thread principal)
    tray.run_tray()
