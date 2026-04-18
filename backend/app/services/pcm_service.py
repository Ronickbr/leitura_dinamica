import re
import difflib

def calculate_pcm(original_text: str, transcription: str) -> dict:
    """
    Calcula o PCM comparando o texto original e a transcrição.
    Ignora pontuação e capitalização na comparação.
    """
    def clean_text(text):
        # Remove pontuação e converte para minúsculas
        text = re.sub(r'[^\w\s]', '', text)
        return text.lower().split()

    # Prepara as listas de palavras
    orig_words = clean_text(original_text)
    trans_words = clean_text(transcription)

    # Usa SequenceMatcher para encontrar correspondências
    matcher = difflib.SequenceMatcher(None, orig_words, trans_words)
    
    corretas = 0
    erros = []
    
    # Apenas comparamos até o tamanho da transcrição 
    # ou até acabar o texto original
    # PCM = Palavras lidas corretamente no tempo de gravação
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            corretas += (i2 - i1)
        elif tag in ('replace', 'delete'):
             # Palavras que deveriam estar lá mas foram trocadas ou omitidas
             for i in range(i1, i2):
                 erros.append(orig_words[i])

    return {
        "corretas": corretas,
        "erros": erros,
        "total_original": len(orig_words),
        "total_lido": len(trans_words)
    }

def get_performance_level(pcm: int) -> str:
    """Retorna o nível de fluência baseado no PCM."""
    if pcm <= 60:
        return "Fase Inicial"
    elif pcm <= 75:
        return "Em Desenvolvimento"
    elif pcm <= 95:
        return "Em Consolidação"
    else:
        return "Fluente"
