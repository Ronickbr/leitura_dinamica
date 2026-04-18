# Documentação Científica e Acadêmica: Plataforma Leitura Digital (PCM Reader)

## 1. Resumo Executivo
O **Leitura Digital (PCM Reader)** é uma plataforma tecnológica de suporte ao diagnóstico psicopedagógico, focada na avaliação da fluência leitora de estudantes do Ensino Fundamental. O sistema utiliza Inteligência Artificial (IA) generativa e processamento de linguagem natural (NLP) para automatizar a coleta de métricas de PCM (Palavras Corretas por Minuto) e fornecer diagnósticos qualitativos baseados em padrões de erro fonológicos e sintáticos.

---

## 2. Fundamentação Teórica
A fluência leitora é definida pela literatura acadêmica (Hasbrouck & Tindal, 2006) através de três pilares:
1.  **Acurácia**: Leitura correta das palavras.
2.  **Automaticidade**: Velocidade de processamento sem esforço consciente.
3.  **Prosódia**: Uso correto de entonação, ritmo e pausa (pontuação).

O PCM é o indicador padrão-ouro utilizado internacionalmente para medir a automaticidade e prever a compreensão de texto. O sistema Leitura Digital automatiza esse cálculo, eliminando o viés humano de cronometragem manual.

---

## 3. Arquitetura Tecnológica e Metodologia

### 3.1. Pipeline de Processamento de Áudio
A captura de dados segue um fluxo de cinco etapas:
1.  **Captura (Frontend)**: O áudio é gravado via API `MediaRecorder` do navegador em formato `audio/webm;codecs=opus`.
2.  **Transcrição (STT)**: Utilização do modelo **Whisper-large-v3** (via Groq Cloud) para conversão de fala em texto com alta fidelidade ao sotaque regional (pt-BR).
3.  **Cálculo de PCM (Algoritmo Determinístico)**: 
    - Comparação entre o "Texto Base" e a "Transcrição".
    - Algoritmo de janela deslizante (sliding window) para identificação de palavras corretas, ignorando omissões e substituições para o cálculo quantitativo.
4.  **Análise Pedagógica (IA Generativa)**:
    - Uso do modelo **GPT-4o-mini** (via OpenRouter).
    - O modelo atua como uma psicopedagoga clínica, analisando discrepâncias entre o texto original e o lido.
5.  **Persistência e Relatório**: Dados estruturados no **Google Firestore**.

### 3.2. Critérios de Classificação
O sistema adota os seguintes benchmarks para o 3º ano do ensino fundamental:
- **0 - 60 PCM**: Fase Inicial (Necessita intervenção intensiva).
- **61 - 75 PCM**: Em Desenvolvimento.
- **76 - 95 PCM**: Em Consolidação.
- **96+ PCM**: Fluente (Automaticidade alcançada).

---

## 4. Análise Qualitativa e Métricas de Erro
Além do PCM, a IA avalia marcadores qualitativos essenciais:
- **Leitura Silabada**: Identifica se o estudante ainda está na fase de decodificação fonêmica lenta.
- **Atenção à Pontuação**: Verifica se as pausas transcrevem a estrutura sintática do texto.
- **Padrão de Erro Detectado**: Identifica se o erro é predominantemente por substituição (troca de letras), omissão ou invenção de palavras.

---

## 5. Ética e Anonimização para Pesquisa
A plataforma inclui um módulo de **Exportação para Dataset Científico**, que segue as diretrizes da LGPD (Lei Geral de Proteção de Dados):
- **Anonimização**: Remoção de nomes, IDs de professores, localizações e transcrições brutas.
- **Dados Preservados**: PCM, precisão, nível de escolaridade, diagnóstico qualitativo simplificado e métricas de desempenho ao longo do tempo.
- **Finalidade**: Permitir que pesquisadores analisem tendências de alfabetização em larga escala sem comprometer a identidade dos estudantes.

---

## 6. Resultados e Impacto Pedagógico
- **Redução de Tempo**: Professores reduzem de 15 minutos para menos de 2 minutos o tempo de avaliação por aluno.
- **Padronização**: Elimina a subjetividade na correção da leitura.
- **Foco na Intervenção**: O sistema não apenas "nota" o aluno, mas sugere estratégias práticas (ex: leitura coral, pareada, treinos de consciência fonológica).

---

## 7. Referências Técnicas
- **STT**: OpenAI Whisper Large v3.
- **LLM**: GPT-4o-mini (Psychopedagogical Custom Instruction).
- **Infra**: Node.js, React, Firebase Firestore.

---
*Este documento é destinado a conselhos de classe, apresentações acadêmicas e revisões científicas sobre o uso de IA na educação.*
