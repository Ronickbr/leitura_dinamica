import re
from difflib import SequenceMatcher

def clean_text(text: str) -> str:
    """Remove pontuação e converte para minúsculas."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return text

def calculate_pcm(original_text: str, transcribed_text: str) -> dict:
    """
    Calcula o PCM comparando o texto original com o transcrito.
    Assume que a gravação teve exatamente 60 segundos.
    """
    orig_clean = clean_text(original_text).split()
    tran_clean = clean_text(transcribed_text).split()

    matcher = SequenceMatcher(None, orig_clean, tran_clean)
    matches = matcher.get_matching_blocks()
    
    total_correct = sum(match.size for match in matches)
    
    # Identificação simples de erros (baseado no que sobrou)
    # Futuramente, a IA fará uma classificação mais profunda
    diffs = {
        "corretas": total_correct,
        "total_original": len(orig_clean),
        "total_lido": len(tran_clean),
        "precisao": round((total_correct / len(orig_clean)) * 100, 2) if orig_clean else 0
    }
    
    return diffs

def get_performance_level(pcm: int) -> str:
    """Classifica o nível com base no PCM conforme PRD."""
    if pcm <= 60:
        return "Fase Inicial"
    elif pcm <= 75:
        return "Em Desenvolvimento"
    elif pcm <= 95:
        return "Em Consolidação"
    else:
        return "Fluente"
