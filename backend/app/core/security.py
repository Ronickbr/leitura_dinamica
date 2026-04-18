import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Request, HTTPException, Depends
from app.core.config import settings

# Inicializa Firebase Admin se ainda não foi inicializado
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_JSON)
        firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"AVISO: Falha ao inicializar Firebase Admin: {e}")

async def get_current_user(request: Request):
    """
    Middleware/Dependência para verificar o token do Firebase.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autorização ausente ou inválido")
    
    token = auth_header.split(" ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
