PRD: Agente de IA para Fluência Leitora (PCM)

Sistema de Avaliação Inteligente da Leitura em Contexto Escolar 

1. Visão Geral e Objetivos
Desenvolver uma ferramenta digital que utilize Inteligência Artificial para automatizar e otimizar o processo de avaliação da fluência leitora em estudantes.

Registrar a leitura oral dos alunos por 1 minuto.

Calcular automaticamente as Palavras Corretas por Minuto (PCM).

Identificar e classificar erros de leitura de forma automatizada.

Gerar análises pedagógicas e sugestões de intervenção com base nos resultados.

Monitorar a evolução temporal dos estudantes para apoiar decisões pedagógicas e pesquisas acadêmicas.

2. Contexto Pedagógico (Métricas)
O sistema baseia-se em dimensões específicas da fluência leitora:

Precisão: Leitura correta das palavras.

Automaticidade: Fluidez sem esforço excessivo de decodificação.

Prosódia: Entonação, ritmo e pausas adequadas.

Pontuação: Respeito à estrutura sintática do texto.

Interpretação: Nível de compreensão do conteúdo lido.

3. Arquitetura e Módulos do Sistema
O aplicativo será dividido em quatro módulos funcionais:

Interface do Professor: Seleção de aluno/texto, início da gravação e visualização de resultados.

Processamento de Áudio: Gravação da leitura e conversão de áudio para texto (Speech-to-Text).

Motor de Cálculo: Comparação entre o texto original e o lido, identificação de erros e cálculo do PCM.

IA Pedagógica: Geração automática de diagnóstico, pontos fortes, dificuldades e sugestões de intervenção.

4. Requisitos Funcionais e Telas
Fluxo de Telas 

Tela 1 (Login): Acesso seguro para o professor.

Tela 2 (Seleção): Listagem de turmas e alunos (com campos para observações como TEA, DI, TDAH).

Tela 3 (Leitura): Exibição do texto por série e botão "Iniciar Leitura (1 minuto)" com cronômetro automático.

Tela 4 (Resultado): Exibição instantânea do PCM, erros detectados, classificação e análise da IA.

Tela 5 (Relatórios): Painel com gráficos de evolução temporal (ex: Março a Maio), comparação entre alunos e frequência de erros.

Regras de Negócio para o Cálculo do PCM 

Fórmula: PCM = Palavras corretas lidas em 60 segundos.

Classificação de Nível:

Até 60: Fase inicial de leitura.

61–75: Em desenvolvimento.

76–95: Em consolidação.

96+: Fluente.

Tipos de Erro a serem detectados: Troca de letra, omissão, inversão, silabação excessiva, adivinhação e perda de linha .

5. Estrutura de Dados Sugerida
O banco de dados deve contemplar as seguintes tabelas principais:

Alunos: ID, nome, turma, diagnóstico (TEA, DI, etc.) e observações.

Textos: ID, título, conteúdo, número de palavras, série e nível de dificuldade.

Avaliações: ID, aluno_id, data, áudio_path, texto_transcrito, PCM, classificação e notas das rubricas (0 a 2 ou checklist).

6. Especificações Técnicas (Sugestão ao TI)

Backend: Python (FastAPI) ou Node.js.

Frontend: React.

Banco de Dados: firebase.

Transcrição de Áudio: Groq.

IA Pedagógica: openrouter(openai/gpt-5.4) utilizando prompt estruturado para retornar nível, diagnóstico e intervenção em formato JSON.

7. Segurança e Conformidade
Obrigatória a conformidade com a LGPD.

Controle de acesso por login e senha futuramente.

Possibilidade de anonimização de dados para uso em pesquisas acadêmicas e artigos científicos.