import PyInstaller.__main__
import os
import shutil

# Diretório base
base_dir = os.path.dirname(os.path.abspath(__file__))
dist_folder = os.path.join(base_dir, "..", "frontend", "dist")
firebase_json = "gen-lang-client-0249995909-firebase-adminsdk-fbsvc-52d1804851.json"

print(f"Iniciando build do executável...")

# Parâmetros do PyInstaller
params = [
    'main.py',                       # Script principal
    '--name=LeituraDigital',         # Nome do executável
    '--onedir',                      # Criar uma pasta (mais estável para FastAPI)
    '--noconsole',                   # Não abrir janela de terminal
    f'--add-data={dist_folder};frontend_dist', # Pasta dist para frontend_dist
    f'--add-data={firebase_json};.',           # Incluir credenciais Firebase
    '--add-data=icon.png;.',                   # Incluir ícone da bandeja
    '--icon=icon.png',                         # Ícone do executável
    '--noconfirm',                             # Não pedir confirmação para sobrescrever
    '--hidden-import=uvicorn.logging',
    '--hidden-import=uvicorn.loops',
    '--hidden-import=uvicorn.loops.auto',
    '--hidden-import=uvicorn.protocols',
    '--hidden-import=uvicorn.protocols.http',
    '--hidden-import=uvicorn.protocols.http.auto',
    '--hidden-import=uvicorn.protocols.websockets',
    '--hidden-import=uvicorn.protocols.websockets.auto',
    '--hidden-import=uvicorn.lifespan',
    '--hidden-import=uvicorn.lifespan.on',
    '--hidden-import=pcm_utils',
    '--hidden-import=pystray._win32',
    '--hidden-import=PIL._imagingtk',
    '--hidden-import=PIL._tkinter_finder',
    '--clean'
]

PyInstaller.__main__.run(params)

# Copiar .env para a pasta dist (ele deve ficar junto ao .exe)
env_src = os.path.join(base_dir, ".env")
env_dest = os.path.join(base_dir, "dist", "LeituraDigital", ".env")
if os.path.exists(env_src):
    shutil.copy(env_src, env_dest)
    print(f"Arquivo .env copiado para a pasta de distribuição.")

print("\n--- BUILD CONCLUÍDO ---")
print(f"O executável está em: {os.path.join(base_dir, 'dist', 'LeituraDigital')}")
