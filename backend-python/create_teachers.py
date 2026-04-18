import firebase_admin
from firebase_admin import credentials, auth
import os
from dotenv import load_dotenv

load_dotenv()

# Caminho para o JSON de credenciais
cred_path = os.getenv("FIREBASE_CREDENTIALS_JSON", "gen-lang-client-0249995909-firebase-adminsdk-fbsvc-52d1804851.json")

if not os.path.isabs(cred_path):
    cred_path = os.path.join(os.getcwd(), cred_path)

if not os.path.exists(cred_path):
    print(f"ERRO: Arquivo de credenciais não encontrado em {cred_path}")
    exit(1)

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

teachers = [
    {"email": "ana@escola.com", "display_name": "Ana Silva (Pedagoga)"},
    {"email": "bruno@escola.com", "display_name": "Bruno Souza (Pedagogo)"},
    {"email": "carla@escola.com", "display_name": "Carla Oliveira (Pedagoga)"},
]

default_password = "Professor123@"

for teacher in teachers:
    try:
        user = auth.create_user(
            email=teacher["email"],
            password=default_password,
            display_name=teacher["display_name"]
        )
        print(f"Sucesso: Usuário {user.email} criado com UID: {user.uid}")
    except Exception as e:
        if "EMAIL_EXISTS" in str(e):
             print(f"Aviso: Usuário {teacher['email']} já existe.")
        else:
            print(f"Erro ao criar {teacher['email']}: {e}")

print("\nCriação de usuários finalizada.")
