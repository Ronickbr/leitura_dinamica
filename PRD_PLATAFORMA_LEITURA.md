# PRD — Plataforma de Avaliação de Fluência Leitora (PCM Reader)

**Versão Atual**: 4.1.5  
**Última Atualização**: 2026-08-07  
**Autor**: Projeto Leitura — Equipe Pedagógica & Tecnologia  
**Status**: Produção (Deploy Vercel)

---

## 1. Visão Geral e Objetivos

### 1.1. Propósito
O **PCM Reader** é uma plataforma tecnológica de suporte ao diagnóstico psicopedagógico, focada na automação da avaliação da fluência leitora de estudantes do Ensino Fundamental (1º ao 5º ano). A solução utiliza Inteligência Artificial generativa (Whisper-1 + GPT-4o) para:

- Eliminar a subjetividade e o esforço manual da avaliação de leitura oral;
- Calcular automaticamente **PCM (Palavras Corretas por Minuto)** e Precisão;
- Classificar erros de leitura por tipo (omissão, substituição, inserção);
- Gerar diagnósticos pedagógicos e sugestões de intervenção clínica;
- Monitorar a evolução temporal da turma e do estudante individual;
- Produzir relatórios, datasets acadêmicos anonimizados e laudos individualizados.

### 1.2. Objetivos Estratégicos
1. **Redução de Tempo**: Diminuir o tempo de avaliação por aluno de 15 minutos (manual) para menos de 2 minutos (automatizado).
2. **Precisão Pedagógica**: Eliminar o viés humano na contagem de palavras, com algoritmo de alinhamento por programação dinâmica (Levenshtein).
3. **Decisão Guiada por Dados**: Fornecer normas nacionais de referência (SAEB/ANA) e metas personalizadas.
4. **Escala e Pesquisa**: Permitir anonimização LGPD-compliant para geração de datasets científicos em larga escala.
5. **Inclusão**: Apoiar estudantes com diagnósticos clínicos (TEA, TDAH, TDA, DI) e alunos estrangeiros, com heurísticas fonológicas específicas.

### 1.3. Público-Alvo
| Perfil | Descrição |
|---|---|
| **Professor(a) de Alfabetização** | Usuário primário. Opera avaliações e acompanha turmas diariamente. |
| **Coordenador(a) Pedagógico(a)** | Visualiza relatórios agregados, define metas por série, valida intervenções. |
| **Psicopedagogo(a) Clínico(a)** | Analisa padrões de erro e detalhes de transcrição marcada. |
| **Pesquisador(a) Acadêmico(a)** | Utiliza datasets anonimizados (exportação JSON/Excel) para estudos. |
| **Gestor(a) de Secretaria de Educação** | Acompanha métricas de rede (módulo futuro). |

---

## 2. Contexto Pedagógico e Fundamentação

### 2.1. Dimensões da Fluência Leitora (Hasbrouck & Tindal, 2006)
A avaliação baseia-se em três pilares científicos:
1. **Acurácia / Precisão** — Percentual de palavras lidas corretamente;
2. **Automaticidade** — Velocidade de decodificação medida em PCM;
3. **Prosódia** — Entonação, ritmo, pausa e respeito à pontuação.

### 2.2. Norma Nacional SAEB/ANA por Série (Referência)
Valores benchmark de PCM para o **fim do ano letivo**:

| Série | Norma Nacional PCM |
|---|---|
| 1º Ano | 60 |
| 2º Ano | 80 |
| 3º Ano | 100 |
| 4º Ano | 120 |
| 5º Ano | 130 |

### 2.3. Níveis de Desempenho e Classificação
| Faixa PCM | Nível de Desempenho | Intervenção Recomendada |
|---|---|---|
| 0 – 30 | **Fase Inicial I (Pré-silábico)** | Intervenção intensiva diária |
| 31 – 60 | **Fase Inicial II (Silábico/Alfabético)** | Leitura guiada 3x/semana |
| 61 – 75 | **Em Desenvolvimento** | Leitura coral + pareada |
| 76 – 95 | **Em Consolidação** | Treino de prosódia e compreensão |
| 96+ | **Fluente** | Aprofundamento de compreensão e textos complexos |

### 2.4. Tipos de Erros Detectáveis
- **Substituição**: Palavra trocada por outra (ex.: "gato" → "cabo");
- **Omissão**: Palavra do texto não lida;
- **Inserção**: Palavra inventada pelo estudante;
- **Junção**: Duas palavras lidas como uma (ASR detecta 1 token);
- **Quebra**: Uma palavra lida como duas;
- **Variação Aceitável**: Variação fonética/fonológica menor não penalizada.

---

## 3. Escopo Funcional (Features Implementadas)

### 3.1. Módulo de Autenticação e Segurança
- **Login por E-mail/Senha** (Firebase Auth com validação de força de senha);
- **Login por Google** (OAuth);
- **Proteção de Rotas**: Todas as páginas internas exigem `onAuthStateChange` válido;
- **Segurança Firestore**: Regras de segurança em `firestore.rules` exigem `request.auth != null` para leitura/gravação em `alunos`, `avaliacoes`, `textos`, `import_history`. Apenas o admin `kmkz.clan@gmail.com` pode deletar registros.
- **Reset de Banco**: Serviço dedicado `resetDatabaseService.ts` disponível apenas para admin.

### 3.2. Módulo de Gestão de Estudantes (`alunos`)
Funcionalidades implementadas em `students/page.tsx` e `students/[id]/page.tsx`:
- Cadastro, edição e exclusão física de alunos;
- Paginação de lista para turmas grandes;
- Filtros dinâmicos por **Série**, **Turma** e **Turno** (componente `StudentFilterSelects.tsx`);
- Persistência de filtros em `localStorage` para fluxo de avaliação sequencial;
- Campos estruturados:
  - Nome completo, Turma, Série, Turno, Ano Letivo;
  - Diagnóstico Clínico (TEA, TDAH, TDA, DI, etc.) — com badge colorido;
  - Meta PCM Individual;
  - Observações pedagógicas;
  - Vinculação a `professorId`.
- **Dashboard Individual do Aluno** (`students/[id]/performance/page.tsx`):
  - Gráfico de evolução PCM ao longo do tempo;
  - Histórico sequencial de intervenções da IA;
  - Comparativo automático com Norma Nacional da série.

### 3.3. Módulo de Biblioteca de Textos (`textos`)
- Cadastro e edição de textos pedagógicos;
- Busca textual dinâmica;
- Badges de métrica (palavras, série recomendada, dificuldade estimada);
- Interface glassmorphism com animações staggered;
- Exportação de corpus de texto para dataset.

### 3.4. Módulo de Avaliação de Leitura (Pipeline Completo)
Fluxo multi-página implementado em `evaluations/*`:

#### Etapa 1 — Seleção (`evaluations/new/page.tsx`)
- Escolha do aluno (filtros persistentes);
- Escolha do texto da biblioteca;
- Resumo de contexto: série, meta PCM individual, norma nacional;
- Configuração de flags clínicas: **Aluno Estrangeiro** (padrões fonológicos) e **Usuário de Óculos** (heurística visual).

#### Etapa 2 — Gravação (`evaluations/[id]/page.tsx`)
- Uso da API `MediaRecorder` do navegador;
- Formato padrão `audio/webm;codecs=opus`;
- Cronômetro automático de 60 segundos com parada automática;
- Timer regressivo visível com indicadores de fase;
- Cancelamento e retomada sem perda de estado;
- Exibição sincronizada do texto original em tela grande.

#### Etapa 3 — Revisão (`evaluations/[id]/review/page.tsx`)
- Exibição do **PCM** calculado em tempo real;
- Exibição da **Precisão** e contagem de **Erros**;
- **Transcrição Marcada Pedagógica** com classes CSS:
  - **Erros/Substituições** em negrito com formato `[original](lido)`;
  - **Omissões** em [colchetes];
  - **Adições/Inserções** em (parênteses);
- Reprodução do áudio original para conferência;
- Edição manual das métricas e da transcrição (profissional prevalece sobre IA);
- Exibição de **Métricas Qualitativas** (booleans + justificativa):
  - Leitura Precisa;
  - Leitura Silabada;
  - Boa Entonação (Prosódia);
  - Interpretação;
  - Pontuação.
- Exibição de **3 Perguntas de Compreensão** geradas pela IA.

#### Etapa 4 — Sucesso (`evaluations/[id]/success/page.tsx`)
- Feedback visual premium;
- Resumo do desempenho vs norma vs meta;
- Diagnóstico IA + Intervenção IA;
- Atalhos rápidos (nova avaliação, detalhes do aluno, histórico).

### 3.5. Módulo de Processamento de Áudio (IA)
**Endpoint**: `POST /api/process-audio` em `app/api/process-audio/route.ts`.

#### Pipeline Interno (`analysisService.ts` → `processReadingAudio`)
1. **Validação Zod** do upload:
   - Máximo 10 MB;
   - Tipos permitidos: webm, mp3, wav, m4a, ogg;
   - Texto original: mínimo 1 / máximo 10000 caracteres.
2. **Sanitização contra Prompt Injection**: Remoção de caracteres de controle e tokens maliciosos.
3. **Transcrição STT**: OpenAI `Whisper-1` com contexto de série escolar e `temperature: 0`.
4. **Alinhamento de Palavras**: `calculatePCM()` em `pcmUtils.ts` usando:
   - Matriz N×M de Programação Dinâmica;
   - Distância de Levenshtein por token;
   - Similaridade cosseno/proporcional;
   - Chave fonética frouxa para variações;
   - Tratamento de STOP_WORDS;
   - Detecção de junção/quebra de palavras;
   - `softenMinorAlignmentNoise` para suavizar ruídos de partículas;
   - Prefix matching para detectar ponto de parada no minuto final.
5. **Cálculo de Métricas**:
   - `PCM = (corretas ÷ duração_segundos) × 60`;
   - `Precisão = (corretas ÷ (total − unread)) × 100%`;
   - `Erros = substituições + omissões + inserções`.
6. **Diagnóstico Pedagógico IA**: Prompt estruturado com GPT-4o contendo:
   - Dados estruturados do alinhamento (token-level);
   - Série, meta PCM, norma nacional;
   - Histórico de avaliações anteriores;
   - Flags clínicas (estrangeiro, óculos);
   - Saída JSON: `diagnostico`, `intervencao`, `metricas_qualitativas`, `padrao_de_erro_detectado`, `nivel_de_confianca`, `perguntas_compreensao`.
7. **Fallback Resiliente**: Qualquer falha na IA retorna análise de fallback com metadados explicitos, nunca silencia erro.

### 3.6. Módulo de Histórico e Relatórios (`history/*`)
- Listagem completa de todas as avaliações;
- Filtros reativos por Série, Turma, Aluno;
- **Cards de Estatísticas Reativos aos Filtros**:
  - Total Alunos;
  - Total Avaliações;
  - PCM Médio;
  - Alunos Abaixo da Norma.
- **Exportações**:
  - **Excel (XLSX)** — Relatório pedagógico filtrado;
  - **Excel (XLSX)** — Relatório detalhado com diagnósticos IA;
  - **JSON (Pesquisa)** — Dataset anonimizado LGPD-compliant com estatísticas acadêmicas (Desvio Padrão, IC 95%, Tamanho da Amostra);
  - **PDF / Impressão** — Relatório profissional em Preto e Branco, 1 página A4, campos para assinatura institucional.
- **Análise de Evolução Comparativa IA**: Compara registros cronológicos anteriores e gera texto de progresso.
- **Importação em Lote**: Upload de Excel com histórico antigo (colunas flexíveis).

### 3.7. Módulo de Configurações (`settings/page.tsx`)
- Alternância de **Tema Claro / Escuro** com persistência em `SettingsProvider`;
- Preferências de economia de dados (mobile);
- Gerenciamento de sessão e logout;
- Acesso a ferramentas administrativas.

### 3.8. Experiência Mobile & PWA
Implementado em `MobileExperienceProvider`, `MobileNav`, `MobilePerformanceMonitor`, `PWAProvider`:
- Detecção automática de **viewport, toque, economia de dados e orientação**;
- **Navegação Inferior (Bottom Bar)** com 5 atalhos em telas < 768px;
- Conversão de tabelas para **Listas com Drop (Accordions)** em telas pequenas;
- **Touch Target** padronizado em 48px (variável CSS);
- **Monitor Contínuo** de Web Vitals: TTFB, FCP, LCP, CLS, load, longTaskCount, resourceCount;
- **PWA**: Service Worker (`sw.js`), ícones 192/512, manifest, instalação nativa;
- **Playwright Mobile Tests**: Suíte de testes automatizados em perfis iPhone, Android Chrome, WebKit.

---

## 4. Arquitetura de Dados

### 4.1. Coleções Firestore

| Coleção | Documento-Chave | Descrição |
|---|---|---|
| `alunos` | `id` (auto) | Estudantes cadastrados. Campos: `nome, turma, serie, turno, diagnostico, observacoes, professorId, anoLetivo, metaPCM, createdAt` |
| `textos` | `id` (auto) | Biblioteca de leitura. Campos: `titulo, conteudo, serie, nivel, palavras, professorId` |
| `avaliacoes` | `id` (auto) | Registro de cada leitura. Campos completos em §4.2 |
| `import_history` | `id` (auto) | Auditoria de imports em lote. Campos: `fileName, successCount, errorCount, importedAt, professorId` |

### 4.2. Esquema Completo: Coleção `avaliacoes`
```typescript
interface Avaliacao {
  id?: string;
  alunoId: string;                   // FK → alunos.id
  textoId: string;                   // FK → textos.id
  pcm: number;                       // Palavras Corretas por Minuto
  precisao: number;                  // % 0-100
  erros?: number;                    // Total de erros
  transcricao: string;               // Whisper-1 output (raw)
  transcricaoMarcada?: string;       // Versão editada manualmente com markup
  diagnosticoIA: string;             // Texto livre estruturado de diagnóstico
  intervencaoIA: string;             // Sugestões de intervenção clínica
  metricasQualitativas?: {
    leitura_precisa: boolean;        leitura_precisa_justificativa?: string;
    leitura_silabada: boolean;       leitura_silabada_justificativa?: string;
    boa_entonacao: boolean;          boa_entonacao_justificativa?: string;
    interpretacao: boolean;          interpretacao_justificativa?: string;
    pontuacao: boolean;              pontuacao_justificativa?: string;
  };
  perguntasCompreensao?: Array<{     // 3 perguntas geradas por GPT-4o
    pergunta: string;
    resposta_esperada: string;
  }>;
  audioUrl?: string;                 // Storage path ou blob URL (opcional)
  data: Timestamp;                   // Data da avaliação
  professorId: string;               // FK → auth UID
  duration?: number;                 // Duração real do áudio em segundos
}
```

### 4.3. Diagrama de Relacionamentos
```
alunos (1) ────────── (N) avaliacoes (N) ────────── (1) textos
  │                        │
  │                        └── data, pcm, precisao, erros, transcricao
  │                        └── diagnosticoIA, intervencaoIA
  │                        └── metricasQualitativas
  │                        └── perguntasCompreensao
  │
  └── diagnostico clinico
  └── metaPCM personalizada
  └── serie, turma, turno, anoLetivo
```

---

## 5. Stack Tecnológico

### 5.1. Camada Frontend
| Tecnologia | Versão | Finalidade |
|---|---|---|
| **Next.js** | 16.x | App Router, RSC + Client Components, API Routes |
| **React** | 19.x | Hooks, Suspense, Context Providers |
| **TypeScript** | 6.x | Tipagem estrita, interfaces imutáveis |
| **CSS** | Modular (`app/styles/*.css`) | Design System com tokens HSL, Glassmorphism 2.0, Lexend + Outfit |
| **API MediaRecorder** | Nativa | Gravação de áudio client-side |
| **Playwright** | 1.56.x | Testes E2E mobile |

### 5.2. Camada Backend (Serverless)
| Tecnologia | Versão | Finalidade |
|---|---|---|
| **Next.js API Routes** | 16.x | `app/api/process-audio`, `app/api/health` |
| **Firebase Admin** | 13.8.x | Backend privilegiado (quando disponível) |
| **Zod** | 4.x | Validação de schemas em endpoints |
| **Sharp-like** | N/A | Não requerido; manipulação de áudio via Buffer |
| **Node.js** | ≥ 22 | Runtime target |

### 5.3. Camada IA
| Serviço | Modelo | Finalidade |
|---|---|---|
| **OpenAI Whisper-1** | whisper-1 | Speech-to-Text transcrição de áudio |
| **OpenAI GPT-4o** | gpt-4o | Diagnóstico pedagógico, intervenção, métricas qualitativas, perguntas de compreensão |
| `temperature` | 0 (todas as chamadas) | Determinístico, reprodutível |

### 5.4. Persistência e Autenticação
| Serviço | Uso |
|---|---|
| **Firebase Auth** | Login Email/Senha + Google OAuth. Controle de sessão. |
| **Firebase Firestore** | 4 coleções: `alunos`, `textos`, `avaliacoes`, `import_history`. |
| **Firebase Storage** | Hospedagem opcional de áudios (atualmente não persistidos por LGPD). |
| **Firebase Identity Toolkit REST** | Autenticação server-side direta sem SDK Admin. |

### 5.5. Deploy e Hospedagem
| Plataforma | Finalidade |
|---|---|
| **Vercel** | Deploy do Next.js (Edge Functions + Static Assets) |
| **GitHub / Git** | Controle de versão |
| **npm** | Gerenciador de dependências |

### 5.6. Provedores de Contexto (React Hierarchy)
Ordem de encapsulamento em `app/layout.tsx`:
```
PWAProvider
 └─ MobileExperienceProvider
     └─ MobilePerformanceMonitor
         └─ FirebaseProvider
             └─ SettingsProvider
                 └─ Layout (Header + Main + MobileNav)
```

---

## 6. Design System e UX

### 6.1. Identidade Visual
- **Paleta**: Deep Institutional Blue (`#1e3a8a` hsl base) com variações `--primary-soft`, `--primary-border`;
- **Tipografia**: **Lexend** para conteúdo pedagógico (foco); **Outfit** para UI auxiliar;
- **Acabamento**: Glassmorphism 2.0 com `backdrop-filter: blur(12px)`, bordas translúcidas e sombra `--shadow-md`;
- **Animações**: staggered entry, fade-in slide-up, micro-interações em hover-row;
- **Temas**: Claro + Escuro com tokens `--text-primary`, `--bg-*` separados.

### 6.2. Tokens CSS Principais (em `app/styles/tokens.css`)
```
--primary-h, --primary-s, --primary-l → hue saturation lightness
--primary, --primary-soft, --primary-border
--accent (laranja), --success (verde), --warning (amarelo), --danger (vermelho)
--text-primary / --text-secondary / --text-tertiary / --text-muted
--glass-bg, --glass-border
--space-scale (1.333) → --space-2, --space-4, --space-8, --space-16...
--header-height (responsivo: 64px mobile / 80px desktop)
--touch-target (48px)
```

### 6.3. Navegação Responsiva
| Breakpoint | Tipo | Estrutura |
|---|---|---|
| ≤ 768px | Mobile | Navegação inferior (5 ícones) + Header compacto |
| ≥ 769px | Desktop | Header fixo superior com links de navegação completos |

---

## 7. Segurança, LGPD e Governança

### 7.1. Princípios de Segurança Implementados
1. **Cadeia de Erros Não-Genérica** (`lib/errorUtils.ts`):
   - Nenhuma mensagem "erro interno". Todo erro capturado registra: `Arquivo + Linha + Método + Endpoint + HTTP Code + Campo/Valor + Stack + Timestamp + Usuário`.
   - Stack Trace e detalhes técnicos são suprimidos em produção (`IS_DEV === false`).
2. **Validação Zod em Uploads**: Tamanho, tipo MIME, comprimento de texto validados antes de qualquer processamento.
3. **Sanitização Contra Prompt Injection**: `sanitizeInput()` remove caracteres de controle, `<script>`, `javascript:`, `on*=`.
4. **Firestore Rules Escritas**: Apenas usuários autenticados. Apenas admin pode deletar.
5. **Audit Logs**: Toda chamada a `POST /api/process-audio` registra: filename, fileSize, textLength, user (anon), durationMs, pcm resultante.
6. **Headers HTTP**: CSP + CORS configurados em `next.config.ts`.

### 7.2. Conformidade LGPD
| Artigo LGPD | Implementação |
|---|---|
| Consentimento | Aceite no primeiro login (feature futura) |
| Anonimização | Exportação JSON de pesquisa remove `nome, professorId, transcricao`, retendo apenas PCM / precisão / série / métricas |
| Direito à Exclusão | Professor pode deletar aluno e todas as avaliações associadas |
| Não persistência de áudio | Áudio é gravado em `/tmp` do serverless, processado e imediatamente deletado em `finally {}` |
| Dados Sensíveis | Diagnósticos clínicos são campos opcionais e não são exportados em dataset anônimo |

---

## 8. Algoritmo Central: Cálculo de PCM

Detalhamento técnico de `calculatePCM()` em `lib/pcmUtils.ts`.

### 8.1. Pré-processamento
1. **Tokenização**: Split texto original e transcrição por espaços (`/\s+/`);
2. **Normalização** (`cleanText`): toLowerCase → NFD → remover acentos → remover pontuação → trim;
3. **Stop Words**: artigos, preposições, conjunções são tratadas como tokens minoritários e suavizados;
4. **Chave Fonética** (`phoneticKey`): `h → ∅, qu→k, gu→g, ss→s, xc→s, sc→s, ch→x, [sz]→s, [cj]→g` para detectar variações de sotaque.

### 8.2. Matriz de Estados (Programação Dinâmica)
```
states[N+1][M+1] = StepState { cost, prevI, prevJ, detail }
```
Transições possíveis por célula:
| Transição | Custo | Tipo de Detalhe |
|---|---|---|
| Token idêntico | 0 | `match` |
| Variação aceitável (Levenshtein + fonética) | +0.15 | `acceptable` |
| Substituição forçada | +1 | `substitution` |
| Omissão | +1 | `deletion` |
| Inserção | +1 | `insertion` |
| Quebra de palavra (2 tokens → 1) | +0.1 | `acceptable` |
| Junção de palavra (1 token → 2) | +0.1 | `acceptable` |

### 8.3. Pós-processamento
1. **Backtrace**: Reconstrução do caminho ótimo do estado `states[N][M]` até `(0,0)`;
2. **Prefix Matching**: Identificação do último ponto válido de leitura, evitando penalização por interrupção do minuto final;
3. **Palavras Não Lidas (`unread`)**: Marcadas como `unread` e excluídas do denominador de precisão;
4. **Soften Minor Noise**: Stop-words e ruídos ≤ 2 caracteres, vizinhos de `match`, são promovidos para `acceptable`.

### 8.4. Fórmulas Finais
```
corretas       = Σ matches + Σ acceptable
erros          = Σ substitutions + Σ deletions + Σ insertions
unread         = Σ tokens não lidos (final da transcrição)
evaluated      = max(total_original - unread, 0)
precisao       = (corretas / evaluated) × 100%
pcm            = (corretas / duration_segundos) × 60
```

---

## 9. Fluxos de Usuário Críticos

### 9.1. Fluxo: Nova Avaliação Completa (Tempo alvo: ≤ 3 min)
```
Login (Email/Google)
  │
  ▼
Dashboard ──► Clicar "Iniciar Avaliação"
  │
  ▼
/evaluations/new
  │ Selecionar Aluno + Texto + Flags Clínicas
  │ Clicar "Iniciar Gravação"
  ▼
/evaluations/[id]
  │ Gravação ~60 segundos + Parada automática
  │ Upload → POST /api/process-audio
  │   ├─ Whisper STT
  │   ├─ Alinhamento Levenshtein
  │   ├─ GPT-4o diagnóstico
  │   └─ Response (pcm, precisao, transcricaoMarcada, ia)
  ▼
/evaluations/[id]/review
  │ Professor confere / edita / reproduz áudio
  │ Clica em "Salvar Avaliação"
  ▼
Firestore saveAvaliacao()
  │
  ▼
/evaluations/[id]/success
  │ Resumo + Diagnóstico + Intervenção
  ▼
Fim (ou nova avaliação)
```

### 9.2. Fluxo: Relatório de Evolução do Aluno
```
Dashboard → /students → Filtro por turma → Abrir aluno
  │
  ├─► /students/[id]  (Ficha completa: dados + última avaliação)
  │
  └─► /students/[id]/performance
        │ Gráfico de linha: data × PCM
        │ Linhas de referência: Meta do aluno + Norma da Série
        │ Tabela cronológica: PCM / Precisão / Erros / Nível
        │ Análise IA da evolução comparativa
        │ Exportar PDF do laudo
        ▼
        Fim
```

### 9.3. Fluxo: Relatório de Turma + Exportação
```
/history (Histórico)
  │ Aplicar Filtros (Série, Turma, Período)
  │ Cards de estatísticas recalculam reativos
  │
  ├─► Opção A: Exportar Excel → Planilha com todos os campos
  ├─► Opção B: Exportar Excel Pedagógico → Diagnósticos + Intervenções
  ├─► Opção C: Exportar JSON Pesquisa → LGPD Anonimizado
  └─► Opção D: Imprimir → Relatório BW A4
```

---

## 10. API e Contratos

### 10.1. `POST /api/process-audio`
**Content-Type**: `multipart/form-data`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `file` | File | Sim | Áudio (≤ 10MB, webm/mp3/wav/m4a/ogg) |
| `original_text` | string | Sim | Texto base da leitura |
| `student_grade` | string | Não | Série (ex: "3º Ano") — para prompt contextual |
| `target_pcm` | number string | Não | Meta PCM do estudante |
| `history` | JSON string | Não | Array de avaliações anteriores |
| `duration` | number string | Não | Duração real do áudio em segundos |
| `is_foreigner` | "true"/"false" | Não | Ativa heurística de estrangeiro |
| `is_glasses_user` | "true"/"false" | Não | Ativa heurística de leitura visual |

**Resposta 200 Sucesso** (exemplo estrutural):
```json
{
  "pcm": 88,
  "precisao": 96.4,
  "erros": 3,
  "transcricao": "o gato preto dormiu no sofa...",
  "transcricaoMarcada": "o gato [preto]<span class='sub'>cinza</span>...",
  "nivel": "Em Consolidação",
  "diagnosticoIA": "3 erros totais: 2 substituições...",
  "intervencaoIA": "Focar leitura coral com dígrafos...",
  "metricasQualitativas": {
    "leitura_precisa": true, "leitura_precisa_justificativa": "...",
    "leitura_silabada": false, "boa_entonacao": true,
    "interpretacao": true, "pontuacao": true
  },
  "perguntasCompreensao": [
    {"pergunta": "Qual cor era o gato?", "resposta_esperada": "Preto"}
  ],
  "alinhamentoDetalhes": [...],
  "tempo_processamento_ms": 12480
}
```

**Erros Estruturados** (4xx/5xx):
```json
{
  "detail": "Mensagem amigável para o professor",
  "endpoint": "POST /api/process-audio",
  "arquivo": "route.ts",
  "metodo": "POST handler",
  "httpStatus": 400,
  "campo": "file",
  "valorRecebido": "[File audio.wav 12800000 bytes]",
  "devStackTrace": "...(apenas em DEV)...",
  "devOriginalMessage": "..."
}
```

### 10.2. `GET /api/health`
- Resposta 200 `{"ok": true, "timestamp": "..."}`.
- Verificação de sanidade do servidor Vercel.

---

## 11. Roteiro de Desenvolvimento Futuro (Backlog de Produto)

### Fase 5 — Robustez e Análise Preditiva
- **#F5.1** Modelo de recomendação de intervenção baseado em histórico de sucesso;
- **#F5.2** Acompanhamento de rede municipal: visão agregada por escola e turma;
- **#F5.3** Autenticação SSO com Google Workspace for Education;
- **#F5.4** Sistema de permissões RBAC: `admin / coordenador / professor / estagiário`.

### Fase 6 — Gamificação e Engajamento Estudantil
- **#F6.1** Modo Estudante Autoavaliação (professor habilita);
- **#F6.2** Conquistas e selos de fluência (distintivos);
- **#F6.3** Livros de leitura gamificados em progressão por nível;
- **#F6.4** Relatório de progresso para pais/responsáveis (anonimizado, via link).

### Fase 7 — Pesquisa Avançada
- **#F7.1** Dashboard acadêmico com análise estatística nativa (teste t, ANOVA, correlações);
- **#F7.2** Exportação CSV de série temporal completa para SPSS/R;
- **#F7.3** Fine-tuning de modelo de diagnóstico com dados validadas por professores.

---

## 12. Riscos e Mitigação

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| **Latência OpenAI** em horários de pico | Alto | Média | Timeout 120s, retry 2x, fallback explícito, cache por hash de áudio |
| **Custo API IA** escala com uso | Alto | Média | Limites diários por professor, transcrição de 60s apenas, compressão opus |
| **Erro de alinhamento** em sotaques regionais | Médio | Média | PhoneticKey, stop-words soften, edição manual habilitada |
| **Falha de gravação** microfone bloqueada | Médio | Alta | Mensagem de permissão explícita; fallback upload direto de arquivo |
| **Firestore indice não criado** em novas queries | Médio | Baixo | Remover `orderBy` quando não essencial; scripts de seed de índice |
| **LGPD — Vazamento de dados** | Crítico | Baixo | Nenhum áudio persistido, exportação de pesquisa anonimizada obrigatória, regras de segurança restritas |

---

## 13. Critérios de Sucesso (KPIs)

| KPI | Meta | Fonte de Dados |
|---|---|---|
| **Tempo médio de avaliação** | ≤ 3 min por aluno | Logs client-side `MobilePerformanceMonitor` |
| **Taxa de sucesso de processamento** | ≥ 98% | `AUDIT_LOG_AUDIO_PROCESS` em `logDetailed` |
| **Taxa de edição manual de métricas** | ≤ 15% | Compare `transcricaoMarcada` vs `transcricao` |
| **Tempo até diagnóstico** | ≤ 60 segundos após fim da gravação | Latência `process-audio` |
| **Conformidade LGPD** | 100% auditoria aprovada | Checklist interno + export anônimo validado |
| **NPS do professor** | ≥ 40 | Pesquisa de satisfação (futura) |
| **Cobertura de avaliações** | ≥ 95% dos alunos avaliados pelo menos 1x/semana | Contagem semanal no histórico |

---

## 14. Anexos e Arquitetura de Referência

### 14.1. Estrutura do Repositório
```
leitura/
├── app/
│   ├── (auth)/login/                ← Login público
│   ├── api/process-audio/           ← Endpoint serverless IA
│   ├── api/health/                  ← Healthcheck
│   ├── components/                  ← Providers + Layout + Mobile
│   ├── evaluations/                 ← Fluxo multi-página
│   ├── history/                     ← Histórico e exportações
│   ├── students/[id]/performance/   ← Painel individual
│   ├── texts/                       ← Biblioteca de leitura
│   ├── settings/                    ← Preferências de UI
│   ├── styles/                      ← Design System modular
│   ├── globals.css                  ← Entrada CSS unificada
│   ├── layout.tsx                   ← Providers aninhados
│   └── page.tsx                     ← Dashboard
├── lib/
│   ├── errorUtils.ts                ← Arquitetura de erros: DetailedError, logDetailed
│   ├── pcmUtils.ts                  ← Motor de cálculo PCM + Alinhamento
│   ├── analysisService.ts           ← Pipeline STT + IA (OpenAI)
│   ├── evaluationsService.ts        ← CRUD + saveAvaliacao
│   ├── services.ts                  ← CRUD alunos
│   ├── textsService.ts              ← CRUD textos
│   ├── statsUtils.ts                ← Desvio Padrão, IC 95%
│   ├── firebase.ts                  ← Init client-side Firebase
│   └── auth.ts                      ← Wrapper login/logout
├── docs/                            ← Documentação de apoio (científica, mobile, segurança)
├── scripts/                         ← Migração, calibração, testes de regressão PCM
├── public/sw.js                     ← Service Worker PWA
├── firestore.rules                  ← Regras de segurança RBAC
├── next.config.ts                   ← Headers de segurança, CSP
├── playwright.config.ts             ← Testes mobile E2E
└── package.json (scripts dev/build/test:mobile/deploy:prod)
```

### 14.2. Links de Referência Internos
| Documento | Localização |
|---|---|
| README Técnico | [README.md](file:///d:/Sites/Leitura/README.md) |
| Documentação Científica | [DOCUMENTACAO_CIENTIFICA.md](file:///d:/Sites/Leitura/docs/DOCUMENTACAO_CIENTIFICA.md) |
| Mobile Experience | [mobile-experience.md](file:///d:/Sites/Leitura/docs/mobile-experience.md) |
| Segurança & Melhorias | [segurança e melhorias.md](file:///d:/Sites/Leitura/docs/segurança%20e%20melhorias.md) |
| Regras Firebase | [regras-firebase.md](file:///d:/Sites/Leitura/docs/regras-firebase.md) / [firestore.rules](file:///d:/Sites/Leitura/firestore.rules) |
| Modelo Import Aluno | [student_import_model.md](file:///d:/Sites/Leitura/docs/student_import_model.md) |
| PRD Anterior (Rascunho) | [sistema_PRD.md](file:///d:/Sites/Leitura/docs/sistema_PRD.md) |

---

## 15. Histórico de Versões do PRD

| Versão | Data | Alterações |
|---|---|---|
| 4.1.5 | 2026-08-07 | Primeira consolidação canônica do PRD completo. Reflete estado atual do código, arquitetura de erros centralizada em DetailedError, pipeline OpenAI único (Whisper + GPT-4o), experiência mobile e exportação acadêmica. |

---

*Fim do PRD. Este documento deve ser atualizado em sincronia com releases de novas features.*
