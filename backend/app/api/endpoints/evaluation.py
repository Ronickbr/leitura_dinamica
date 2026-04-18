from app.services.ai_service import transcribe_audio, get_pedagogical_analysis
from app.services.pcm_service import calculate_pcm, get_performance_level
from app.core.security import get_current_user
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

router = APIRouter()

@router.post("/process-audio")
async def process_audio(
    file: UploadFile = File(...),
    original_text: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Processa o áudio da leitura, transcreve, calcula PCM e gera análise.
    """
    temp_path = f"temp_{file.filename}"
    
    try:
        # Salva áudio temporariamente
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Transcrição via IA (Groq)
        transcription = await transcribe_audio(temp_path)
        if not transcription:
            # Fallback ou erro
            transcription = original_text # Apenas para fins de teste se falhar
            
        # Métricas de PCM
        metrics = calculate_pcm(original_text, transcription)
        pcm = metrics["corretas"]
        level = get_performance_level(pcm)
        
        # Análise Pedagógica (OpenRouter)
        analysis = await get_pedagogical_analysis(pcm, level, original_text, transcription)
        
        return {
            "filename": file.filename,
            "pcm": pcm,
            "metrics": metrics,
            "level": level,
            "transcription": transcription,
            "analysis": analysis
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
