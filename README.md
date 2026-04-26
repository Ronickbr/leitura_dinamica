# 📖 Plataforma Leitura (v3.8.6)

Plataforma de avaliação de fluência leitora com Next.js (App Router), persistência em Firebase e processamento de áudio via IA. O projeto foi refatorado para um monorepo Next.js unificado com API routes serverless.

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Atual](#stack-atual)
- [Banco de Dados](#banco-de-dados)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Deploy na Vercel](#deploy-na-vercel)
- [Experiência Mobile](#experiência-mobile)
- [Migração Realizada](#migração-realizada)

## Visão Geral

O sistema permite que professores:

- gravem leituras de alunos;
- enviem o áudio para transcrição;
- calculem PCM e precisão automaticamente;
- gerem diagnóstico pedagógico com IA;
- acompanhem o histórico geral e a evolução da fluência com gráficos de linha;
- visualizem detalhes completos de cada avaliação (transcrição gerada, PCM, métricas formativas e IA);
- exportem histórico agrupado e formatado em Excel (Relatório Excel de Histórico);
- exportem relatórios completos em Excel filtrados;
- exportem relatórios pedagógicos detalhados com diagnósticos de IA;
- exportem datasets anonimizados para pesquisa acadêmica e artigos científicos;
- **[NOVO]** alternem entre Temas Claro e Escuro com persistência de preferência;
- **[NOVO]** operem a plataforma com experiência "app-like" em dispositivos móveis (Navegação Inferior);
- **[NOVO]** detectem automaticamente dispositivos móveis, conexão lenta e preferência por economia de dados;
- **[NOVO]** monitorem métricas mobile contínuas no cliente para diagnóstico de performance;
- **[NOVO]** acompanhe o diagnóstico clínico do aluno (TDA, TDH, TEA, etc.) com estilização visual no histórico;
- **[NOVO]** revisem métricas qualitativas justificadas por IA (Fluência, Silabação, etc.) antes de salvar;
- **[NOVO-SEGURANÇA]** Validação robusta de uploads (Zod) e sanitização de inputs contra Prompt Injection;
- **[NOVO-ACADÊMICO]** Cálculo automático de estatísticas acadêmicas (Desvio Padrão, IC 95%) e exportação de datasets JSON para pesquisa.
- **[NOVO]** Importação Lote de Histórico via Excel (permite migrar avaliações antigas);
- **[NOVO]** Análise de Evolução Comparativa via IA baseada em registros anteriores;
- **[NOVO]** Diagnóstico de leitura dinâmico calibrado por série e meta de PCM;
- **[NOVO]** Fluxo de login unificado diretamente na página inicial com renderização condicional;
- **v3.8.6**: Modal de Resultado Pós-Avaliação. Implementação de um feedback visual imediato após o salvamento dos dados, exibindo um resumo quantitativo (PCM e Precisão) e o nível de desempenho, facilitando a navegação entre o relatório completo e novas avaliações.
- **v3.8.5**: Melhoria Global de Temas (Claro/Escuro). Padronização de tokens de texto para garantir alto contraste em ambos os modos, eliminação de cores hardcoded (#000000) e refinamento estético com novos tokens de borda glass e padrões de fundo dinâmicos para uma experiência premium Antigravity.
- **v3.8.4**: Melhorias de Usabilidade Mobile. Ajuste no padding superior da página para evitar sobreposição do conteúdo pelo cabeçalho fixo e remoção do efeito glassmorphism da barra de navegação inferior (agora com fundo sólido) para melhor clareza e performance em dispositivos antigos.
- **v3.8.3**: Ajustes de Contraste e Layout no Relatório. Conversão de todo o texto do relatório para preto puro (#000000) e alinhamento dos cards de métricas (PCM, Precisão, Objetivo) em uma única linha horizontal para melhor densidade de informação.
- **v3.8.2**: Otimização de Espaçamento no Relatório. Redução do tamanho das métricas de desempenho e ajustes de margens para garantir o encaixe de todo o conteúdo em uma única página A4.
- **v3.8.1**: Ajustes finos no Relatório PDF. Ocultação do cabeçalho global do sistema na impressão, remoção de emojis coloridos e normalização para 100% Preto e Branco (BW) com bordas sólidas.
- **v3.8.0**: **Relatório Minimalista e Profissional (1 Página)**. Refatoração completa da Engine de Impressão para gerar documentos institucionais em Preto e Branco, otimizados para economia de tinta e conformidade técnica. O novo layout garante que todos os dados essenciais (aluno, PCM, precisão, diagnósticos e transcrição) caibam em uma única folha A4, incluindo áreas formais para assinaturas.
- v3.7.0: **Redesign Institucional Premium e Listas Mobile Optimizadas**. Implementação da nova paleta "Deep Institutional Blue" e tipografia **Lexend** para foco pedagógico. Refatoração completa das tabelas mobile: substituímos os cards pesados por uma **Lista com Drop (Accordions)**, garantindo maior densidade de informação e um visual profissional de alto nível. Inclusão de animações staggered em todas as telas principais.
- v3.6.2: Refinamento de Layout e Acessibilidade. Padronização de `touch-target` para 48px via variáveis CSS; melhoria na estrutura de cabeçalhos responsivos; implementação de scroll horizontal via CSS em tabelas densas no desktop; e otimização do fluxo de carregamento no formulário de login para uma experiência mais fluida.
- v3.6.1: Implementação de **Cards Expansíveis (Collapsible)** em todas as listagens mobile.
- **v3.6.0**: Otimização profunda da responsividade mobile. Refatoração completa da `MobileNav` (Navegação Inferior) para eliminar falhas de layout e overflow; ajuste global de tokens de espaçamento para telas ultra-estreitas; melhoria nos alvos de toque (mínimo 44px) e legibilidade de fontes. Remoção de estilos inline residuais em páginas críticas.
- **v3.5.1**: Pequenas correções e melhorias. Introdução do componente `StudentFilterSelects` para filtragem refinada de alunos e suporte a geração automatizada de ícones PWA.
- **v3.5.0**: Reformulação do Sistema de Design. Introdução de escala de espaçamento padronizada (`--space-scale`), refatoração completa de paddings, margins e grids para garantir consistência visual em todos os dispositivos e eliminar erros de transbordamento de cards.
- **v3.4.1**: Ajustes de Respiro e Layout. Correção de espaçamentos entre blocos, frases e elementos de formulário para evitar visual "apertado" e sobreposições.
- **v3.4.0**: Upgrade Premium UI/UX. Refatoração completa do sistema de design, tokens HSL equilibrados, animações staggered, nova tipografia (Outfit) e acabamento premium com Glassmorphism 2.0.
- **v3.3.1**: Implementada Marcação Pedagógica na Transcrição. A IA agora identifica e destaca visualmente: **Erros/Substituições (Negrito)**, [Omissões (Colchetes)] e (Adições (Parênteses)), facilitando o diagnóstico visual rápido para o professor.
- **v3.3.0**: Conclusão da Modularização do CSS. Refatoração completa das páginas de Histórico, Detalhes de Avaliação, Seleção de Estudante e Biblioteca de Textos para o padrão de Design System modular (styles/*.css), eliminando estilos inline residuais e garantindo responsividade mobile 100% consistente. Correção de lints de propriedades CSS para compatibilidade padrão.
- **v3.2.1**: Implementada Arquitetura CSS Modular unificada (`globals.css` -> `styles/*.css`); Refatoração completa das páginas de Dashboard, Avaliação e Alunos para eliminar estilos inline; Restauração de layouts quebrados e melhoria na manutenção do sistema de design.
- **v3.2.0**: Upgrade "Premium" na interface da Biblioteca de Textos com design glassmorphism aprimorado, busca dinâmica, badges de métricas e animações de entrada; Adicionada funcionalidade de edição de textos.
- **v3.1.2**: Correção de redirecionamento para usuários autenticados na página de login e ocultação do cabeçalho do app em rotas públicas para evitar sobreposição visual.
- **v3.1.1**: Remoção da transparência do cabeçalho para melhor legibilidade; Adição de validação de texto original no serviço de avaliação para prevenir erros de processamento massivo; Atualização da lista de ignore do Git.
- **v3.1.0**: Implementação de renderização condicional do formulário de login na home page, eliminando redirecionamentos desnecessários.
- **v3.0.1**: Correção do layout do botão "Exportar JSON (Pesquisa)" na página de histórico, garantindo alinhamento e estilização correta no desktop e mobile.
- **v3.0.0**: Implementação de importação de histórico via Excel e análise de evolução comparativa automática.
- **v2.8.0**: Implementação de diagnósticos de leitura dinâmicos calibrados por série e meta de PCM, categorização de erros e indicador de confiança.
- **v2.7.6**: Ajuste de contraste nos filtros da página de seleção de estudante (correção da cor da fonte nos selects e inputs).
- **v2.7.5**: Adição de resumo de totais (total de alunos e total com diagnóstico) ao final da listagem de alunos (Desktop e Mobile).
- **v2.7.4**: Implementação das Regras de Segurança do Firestore (`firestore.rules`) incluindo a coleção de textos.
- **v2.7.3**: Correção na visibilidade de textos cadastrados e resiliência nas consultas Firestore (remoção de `orderBy` para evitar erros de índice); Sincronização robusta com inicialização do Firebase em todas as páginas de listagem.
- **v2.7.2**: Correção de visibilidade e contraste das cores de diagnósticos clínicos; Uniformização visual com novo utilitário de estilos.
- **v2.7.1**: Correção na Importação Lote (Cabeçalhos Flexíveis) e Sincronização de Dados (Firebase Wait).
- **v2.7.0**: Dashboard Individual do Aluno, Metas Personalizadas e Normas SAEB/ANA integrada.
- **v2.6.0**: Relatório PDF nativo, Organização por Ano Letivo, Segurança de Headers (CORS/CSP) e Audit Logging.

## Stack Atual

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, TypeScript
- **Persistência**: Firebase Auth, Firestore e Storage
- **API**: Next.js API Routes (serverless)
- **IA**: Groq Whisper Large V3 + OpenRouter GPT-4o Mini
- **Deploy**: Vercel

## Banco de Dados

O projeto utiliza **Firebase Firestore** como banco principal:

- `lib/firebase.ts` inicializa Firebase App, Auth, Firestore e Storage
- `lib/services.ts` gerencia a coleção `alunos`
- `lib/textsService.ts` gerencia a coleção `textos`
- `lib/evaluationsService.ts` gerencia a coleção `avaliacoes`

## Estrutura do Projeto

```text
leitura/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes (serverless)
│   │   ├── health/
│   │   └── process-audio/
│   ├── (auth)/               # Grupo de autenticação (Login opcional)
│   ├── evaluations/          # Avaliações
│   ├── students/             # Gerenciamento de alunos
│   ├── texts/                # Biblioteca de textos
│   ├── history/              # Histórico de avaliações
│   ├── components/           # Componentes compartilhados
│   ├── layout.tsx            # Layout principal
│   ├── page.tsx              # Dashboard
│   └── globals.css           # Estilos globais
├── lib/                      # Serviços e utilitários
│   ├── firebase.ts           # Configuração Firebase
│   ├── auth.ts               # Autenticação
│   ├── services.ts           # CRUD alunos
│   ├── textsService.ts       # CRUD textos
│   ├── evaluationsService.ts # Avaliações + processAudio
│   ├── analysisService.ts    # IA (Groq + OpenRouter) + Sanitização
│   ├── pcmUtils.ts           # Utilitários PCM
│   └── statsUtils.ts         # Estatísticas Acadêmicas (Média, Desvio Padrão, IC 95%)
├── docs/                     # Documentação
├── .env                      # Variáveis de ambiente
├── .env.example              # Template de variáveis
├── next.config.ts            # Configuração Next.js
├── package.json              # Scripts e dependências
├── tsconfig.json             # Configuração TypeScript
├── vercel.json               # Configuração Vercel
└── README.md
```

## Variáveis de Ambiente

Copie `.env.example` para `.env` em ambiente local:

```bash
Copy-Item .env.example .env
```

### Frontend (NEXT_PUBLIC_*)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Sim | Chave pública do projeto Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Sim | Domínio de autenticação do Firebase |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Sim | ID do projeto Firebase |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Sim | Bucket do Storage |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sim | Sender ID do Firebase |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Sim | App ID do Firebase |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Não | E-mail do administrador com permissão para Resetar BD |

### Backend / Serverless

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `GROQ_API_KEY` | Sim | Chave para transcrição de áudio |
| `OPENROUTER_API_KEY` | Sim | Chave para análise pedagógica |
| `OPENROUTER_SITE_URL` | Não | URL pública enviada no header da OpenRouter |
| `OPENROUTER_APP_NAME` | Não | Nome da aplicação enviado no header da OpenRouter |

## Scripts Disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento em `:3000` |
| `npm run build` | Gera o build de produção |
| `npm run start` | Inicia o servidor de produção |
| `npm run lint` | Executa ESLint |
| `npm run test:mobile` | Executa a suíte mobile em navegadores emulados |
| `npm run test:mobile:headed` | Executa a suíte mobile com interface gráfica |
| `npm run deploy:preview` | Dispara deploy preview via Vercel CLI |
| `npm run deploy:prod` | Dispara deploy de produção via Vercel CLI |

## Desenvolvimento Local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar ambiente

```bash
Copy-Item .env.example .env
```

Preencha o `.env` com:
- credenciais do Firebase (prefixo `NEXT_PUBLIC_*`);
- `GROQ_API_KEY`;
- `OPENROUTER_API_KEY`.

### 3. Rodar o projeto

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:3000`.

### 4. Validar antes de subir

```bash
npm run build
```

### 5. Validar a experiência mobile

```bash
npm run test:mobile
```

## Deploy na Vercel

### O que a Vercel vai fazer

1. executar `npm install` na raiz;
2. executar `npm run build`;
3. publicar `.next/`;
4. disponibilizar as API routes `app/api/health` e `app/api/process-audio`.

### Configuração no painel da Vercel

- **Framework Preset**: `Next.js`
- **Root Directory**: raiz do repositório
- **Install Command**: `npm install`
- **Build Command**: `npm run build`

### Variáveis na Vercel

Adicione no painel do projeto:

```env
# Frontend
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Backend
GROQ_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_SITE_URL=https://seu-dominio.vercel.app
OPENROUTER_APP_NAME=Fluência Leitora
```

### Deploy via CLI

```bash
# Cria ou atualiza um deploy preview
npm run deploy:preview

# Publica em produção
npm run deploy:prod
```

## Experiência Mobile

O projeto agora possui uma camada dedicada de experiência mobile com:

- detecção automática de viewport, touch, economia de dados e orientação;
- navegação inferior carregada sob demanda;
- cabeçalhos, formulários e listas adaptados para telas pequenas;
- conversão de tabelas para **Listas com Drop (Accordions)** profissionais, eliminando cards redundantes;
- monitoramento contínuo de `ttfb`, `fcp`, `lcp`, `cls`, `load`, `longTaskCount` e `resourceCount`;
- testes automatizados em perfis iPhone, Android Chrome e WebKit mobile.

Documentação detalhada:

- [docs/mobile-experience.md](./docs/mobile-experience.md)
- [skill mobile-experience-optimizer](./.trae/skills/mobile-experience-optimizer/SKILL.md)

## Migração Realizada

Esta versão (v2.0.0) trouxe uma refatoração significativa:

- **Remoção**: pastas `frontend/` (Vite)### 🎯 Funcionalidades Finais (Fase 1, 2 e Robustez Acadêmica)
- **Painel do Aluno**: Dashboard individual com gráfico de progresso e histórico de intervenções pedágógicas da IA.
- **Contexto SAEB/ANA**: Comparação automática com normas nacionais brasileiras de fluência leitora por série.
- **Metas Personalizadas**: Definição de alvos específicos de PCM por estudante.
- **Segurança de Infra**: Headers HTTP restritivos, Prevenção de XSS e Auditoria de chamadas de IA.
- **Relatório PDF**: Exportação visual profissional dos diagnósticos diretamente do navegador.
alizada para fluxo de E-mail e Senha ao invés do login com o Google.

## Troubleshooting

### Build falha ou tela branca

Verifique se todas as variáveis do Firebase estão cadastradas na Vercel e no `.env` local.

### `/api/process-audio` retorna erro 500

Confirme:
- `GROQ_API_KEY` configurada;
- `OPENROUTER_API_KEY` configurada;
- formato do áudio suportado;
- tamanho do arquivo abaixo de 25 MB.

### Tela de login em branco
Caso a tela de login não apareça, certifique-se de estar usando a versão mais recente com a correção do componente `Layout` que impede bloqueio de renderização do formulário.

### Auth/invalid-api-key no build

O Next.js tenta inicializar o Firebase durante o build estático. Use a verificação `typeof window !== 'undefined'` no `lib/firebase.ts` para evitar isso.
