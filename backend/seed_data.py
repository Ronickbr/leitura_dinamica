import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

load_dotenv()

cred_path = os.getenv("FIREBASE_CREDENTIALS_JSON", "gen-lang-client-0249995909-firebase-adminsdk-fbsvc-52d1804851.json")
if not os.path.isabs(cred_path):
    cred_path = os.path.join(os.getcwd(), cred_path)

if not os.path.exists(cred_path):
    print(f"ERRO: Arquivo de credenciais não encontrado.")
    exit(1)

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

def seed_texts():
    texts = [
        {
            "id": "texto_padrao",
            "titulo": "O Pequeno Príncipe (Trecho)",
            "conteudo": "As pessoas grandes aconselharam-me a deixar de lado os desenhos de jiboias abertas ou fechadas, e a dedicar-me de preferência à geografia, à história, ao cálculo e à gramática. Foi assim que abandonei, aos seis anos, uma carreira de pintor.",
            "serie": "3º Ano",
            "numeroPalavras": 42
        },
        {
            "id": "texto_nivel_1",
            "titulo": "A Casa Amarela",
            "conteudo": "A casa amarela fica no alto da rua. No jardim da casa tem uma árvore grande e muitas flores coloridas. O gato Mimi pula o muro todo dia para brincar no sol.",
            "serie": "2º Ano",
            "numeroPalavras": 35
        }
    ]
    
    for text in texts:
        doc_id = text.pop("id")
        db.collection("textos").document(doc_id).set(text)
        print(f"Texto '{text['titulo']}' semeado com sucesso.")

if __name__ == "__main__":
    seed_texts()
    print("\nBanco de dados semeado!")
