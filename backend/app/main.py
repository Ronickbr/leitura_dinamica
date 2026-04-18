from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
import threading
from app.api.endpoints import evaluation
from app.core.config import settings
from app.core.tray import SystemTrayApp

app = FastAPI(title="Fluência Leitora API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas API
app.include_router(evaluation.router, prefix="/api", tags=["Evaluation"])

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}

# Servir Frontend Estático
frontend_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        return FileResponse(os.path.join(frontend_path, "index.html"))

def run_server():
    uvicorn.run(app, host="0.0.0.0", port=8000, log_config=None)

if __name__ == "__main__":
    tray = SystemTrayApp()
    
    # Servidor em thread separada
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Bandeja do sistema (bloqueia thread principal)
    tray.run_tray()
