# Leitura v2.0.0

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
- [Migração Realizada](#migração-realizada)

## Visão Geral

O sistema permite que professores:

- gravem leituras de alunos;
- enviem o áudio para transcrição;
- calculem PCM e precisão automaticamente;
- gerem diagnóstico pedagógico com IA;
- acompanhem histórico e evolução diretamente pelo painel;
- exportem relatórios completos em Excel filtrados;
- exportem relatórios pedagógicos detalhados com diagnósticos de IA;
- exportem datasets anonimizados para pesquisa acadêmica e artigos científicos.

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
│   ├── (auth)/login/         # Página de login
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
│   ├── analysisService.ts    # IA (Groq + OpenRouter)
│   └── pcmUtils.ts           # Utilitários PCM
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

## Migração Realizada

Esta versão (v2.0.0) trouxe uma refatoração significativa:

- **Remoção**: pastas `frontend/` (Vite) e `backend/` (Express) separadas
- **Unificação**: tudo теперь está no Next.js App Router
- **API Routes**: `/api/health` e `/api/process-audio` agora são Next.js API routes
- **Serviços**: todos os serviços movidos para `lib/`
- **Layout**: navegação integrada no layout do Next.js
- **Firebase**: configuração modernizada para Next.js
- **Autenticação**: atualizada para fluxo de E-mail e Senha ao invés do login com o Google.

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