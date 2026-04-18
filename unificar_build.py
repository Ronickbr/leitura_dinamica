import os
import subprocess
import shutil
import sys

def run_command(command, cwd=None):
    print(f"Executando: {command}")
    process = subprocess.Popen(command, shell=True, cwd=cwd)
    process.communicate()
    if process.returncode != 0:
        print(f"ERRO ao executar: {command}")
        sys.exit(1)

def build_system():
    root_dir = os.getcwd()
    frontend_dir = os.path.join(root_dir, "frontend")
    backend_dir = os.path.join(root_dir, "backend")

    print("--- 1. Limpando builds anteriores ---")
    dist_path = os.path.join(frontend_dir, "dist")
    if os.path.exists(dist_path):
        shutil.rmtree(dist_path)

    print("\n--- 2. Instalando dependências e compilando Frontend ---")
    run_command("npm install", cwd=frontend_dir)
    run_command("npm run build", cwd=frontend_dir)

    print("\n--- 3. Preparando Backend e Integrando Frontend ---")
    # O script build_exe.py já sabe pegar frontend/dist e jogar pra frontend_dist
    run_command("uv run python build_exe.py", cwd=backend_dir)

    print("\n\n" + "="*50)
    print("SISTEMA UNIFICADO CONSTRUIDO COM SUCESSO")
    print("Localização: " + os.path.join(backend_dir, "dist", "LeituraDigital"))
    print("="*50)

if __name__ == "__main__":
    build_system()
