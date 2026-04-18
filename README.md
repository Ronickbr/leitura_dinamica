# Leitura

Plataforma de avaliacao de fluencia leitora com frontend React/Vite, persistencia em Firebase e processamento de audio via IA. O projeto foi refatorado para ter deploy compativel com a Vercel usando build estatico do frontend e funcoes serverless em `api/`.

## Sumario

- [Visao Geral](#visao-geral)
- [Stack Atual](#stack-atual)
- [Banco de Dados Confirmado](#banco-de-dados-confirmado)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Scripts Disponiveis](#scripts-disponiveis)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Deploy na Vercel](#deploy-na-vercel)
- [Mudancas Realizadas](#mudancas-realizadas)
- [Validacao Executada](#validacao-executada)
- [Troubleshooting](#troubleshooting)

## Visao Geral

O sistema permite que professores:

- gravem leituras de alunos;
- enviem o audio para transcricao;
- calculem PCM e precisao automaticamente;
- gerem diagnostico pedagogico com IA;
- acompanhem historico e evolucao diretamente pelo painel;
- exportem relatórios completos em Excel filtrados;
- exportem relatórios pedagógicos detalhados com diagnósticos de IA;
- exportem datasets anonimizados para pesquisa academica e artigos cientificos.

## Stack Atual

- **Frontend**: React 19, TypeScript, Vite 8, React Router 7
- **Persistencia**: Firebase Auth, Firestore e Storage
- **Backend local**: Node.js + Express
- **Serverless para Vercel**: funcoes Node em `api/`
- **IA**: Groq Whisper Large V3 + OpenRouter GPT-4o Mini
- **Deploy**: Vercel com `vercel.json` na raiz

## Banco de Dados Confirmado

O banco usado pelo codigo atual foi verificado diretamente no projeto, sem depender de cache externo:

- `frontend/src/lib/firebase.ts` inicializa **Firebase App**, **Auth**, **Firestore** e **Storage**
- `frontend/src/services/studentsService.ts` grava e le a colecao `alunos`
- `frontend/src/services/textsService.ts` grava e le a colecao `textos`
- `frontend/src/services/evaluationsService.ts` grava e le a colecao `avaliacoes`

Conclusao: o projeto atual usa **Firestore** como banco principal. Nao ha integracao ativa com PostgreSQL, MySQL, Prisma, Supabase ou outro banco na trilha principal de deploy.

## Estrutura do Projeto

```text
leitura/
├── api/                      # Funcoes serverless usadas pela Vercel
│   ├── health.js
│   └── process-audio.js
├── backend/                  # Servidor local para desenvolvimento
│   ├── analysisService.js
│   ├── index.js
│   └── pcmUtils.js
├── frontend/                 # Aplicacao React/Vite
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── .env.example              # Mapa central de variaveis
├── .vercelignore             # Exclusoes do bundle de deploy
├── package.json              # Scripts e dependencias canonicas
├── package-lock.json         # Lockfile unificado
├── vercel.json               # Configuracao oficial da Vercel
└── README.md
```

## Variaveis de Ambiente

Copie `.env.example` para `.env` em ambiente local:

```bash
# Copia o arquivo de exemplo para o ambiente local
Copy-Item .env.example .env
```

### Frontend

| Variavel | Obrigatoria | Descricao |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Sim | Chave publica do projeto Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Sim | Dominio de autenticacao do Firebase |
| `VITE_FIREBASE_PROJECT_ID` | Sim | ID do projeto Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Sim | Bucket do Storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sim | Sender ID do Firebase |
| `VITE_FIREBASE_APP_ID` | Sim | App ID do Firebase |
| `VITE_API_BASE_URL` | Nao | Base da API; em producao use `/api` |

### Backend / Serverless

| Variavel | Obrigatoria | Descricao |
| --- | --- | --- |
| `GROQ_API_KEY` | Sim | Chave para transcricao de audio |
| `OPENROUTER_API_KEY` | Sim | Chave para analise pedagogica |
| `OPENROUTER_SITE_URL` | Nao | URL publica enviada no header da OpenRouter |
| `OPENROUTER_APP_NAME` | Nao | Nome da aplicacao enviado no header da OpenRouter |

## Anonimizacao para Pesquisa

O historico agora possui exportacao anonima em Excel para uso em pesquisas e publicacoes.

O dataset exportado:

- substitui IDs reais por codigos anonimizados deterministas;
- remove nome do aluno, observacoes e professor responsavel;
- remove transcricao bruta, diagnostico textual da IA e intervencao textual da IA;
- reduz datas para periodo de referencia no formato `YYYY-MM`;
- preserva apenas indicadores quantitativos e qualitativos uteis para analise academica.

Campos preservados no dataset anonimo:

- `participante_id`
- `avaliacao_id`
- `texto_id`
- `texto_serie`
- `turma_id`
- `serie`
- `periodo_referencia`
- `pcm`
- `precisao`
- `possui_diagnostico_informado`
- metricas qualitativas da leitura
- tamanho da transcricao em caracteres

### Observacoes para a Vercel

- Variaveis `VITE_*` precisam estar configuradas no projeto da Vercel antes do build.
- Variaveis sem prefixo `VITE_` ficam apenas no servidor.
- `VITE_API_BASE_URL` pode ficar vazia ou como `/api` em producao.
- O endpoint `/api/health` ajuda a validar se as chaves privadas foram carregadas.

## Scripts Disponiveis

Todos os scripts oficiais agora ficam na raiz:

| Comando | Descricao |
| --- | --- |
| `npm install` | Instala dependencias da raiz e do workspace `frontend` |
| `npm run dev` | Sobe backend local em `:8000` e frontend Vite em `:5173` |
| `npm run build` | Gera o build de producao do frontend |
| `npm run lint` | Executa ESLint no frontend |
| `npm run check` | Executa `lint` + `build` |
| `npm run preview` | Abre preview do build do frontend |
| `npm run start` | Inicia apenas a API local em Node/Express |
| `npm run deploy:preview` | Dispara deploy preview via Vercel CLI |
| `npm run deploy:prod` | Dispara deploy de producao via Vercel CLI |

## Desenvolvimento Local

### 1. Instalar dependencias

```bash
# Instala tudo a partir da raiz
npm install
```

### 2. Configurar ambiente

```bash
# Cria o arquivo local de variaveis
Copy-Item .env.example .env
```

Preencha o `.env` com:

- credenciais do Firebase;
- `GROQ_API_KEY`;
- `OPENROUTER_API_KEY`.

### 3. Rodar o projeto

```bash
# Sobe frontend e backend local juntos
npm run dev
```

Ambientes locais esperados:

- frontend: `http://localhost:5173`
- backend local: `http://localhost:8000`
- healthcheck: `http://localhost:8000/api/health`

### 4. Validar antes de subir

```bash
# Replica a checagem usada no fluxo de deploy
npm run check
```

## Deploy na Vercel

### Arquivos oficiais de deploy

- `package.json`
- `package-lock.json`
- `vercel.json`
- `.env.example`
- `.vercelignore`

### O que a Vercel vai fazer

1. executar `npm install` na raiz;
2. instalar o workspace `frontend`;
3. executar `npm run build`;
4. publicar `frontend/dist`;
5. disponibilizar as funcoes `api/health.js` e `api/process-audio.js`.

### Configuracao recomendada no painel

- **Framework Preset**: `Other`
- **Root Directory**: raiz do repositorio
- **Install Command**: `npm install`
- **Build Command**: `npm run build`
- **Output Directory**: `frontend/dist`

### Configurar variaveis na Vercel

Adicione no painel do projeto:

```env
# Frontend
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=/api

# Backend
GROQ_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_SITE_URL=https://SEU-DOMINIO
OPENROUTER_APP_NAME=Fluencia Leitora
```

### Deploy via CLI

```bash
# Faz login na Vercel
npx vercel login

# Cria ou atualiza um deploy preview
npm run deploy:preview

# Publica em producao
npm run deploy:prod
```

### Rewrites configurados

O `vercel.json` ja contem rewrite para SPA:

- rotas do frontend sem extensao fisica voltam para `index.html`;
- rotas `api/*` continuam indo para funcoes serverless;
- assets estaticos nao sao interceptados.

Isso permite usar `BrowserRouter` com URLs limpas em vez de `HashRouter`.

## Mudancas Realizadas

- unificacao da configuracao oficial de deploy na raiz;
- criacao de `package.json` raiz com workspaces e scripts canonicos;
- criacao de `vercel.json` com `buildCommand`, `outputDirectory`, `functions` e `rewrites`;
- criacao de `.env.example` centralizado;
- criacao de `.vercelignore` para excluir codigo fora da trilha de deploy;
- extracao da logica de analise para `backend/analysisService.js`;
- criacao das funcoes serverless `api/health.js` e `api/process-audio.js`;
- refatoracao do backend local para validacao de upload, CORS e limpeza de arquivos temporarios;
- migracao do frontend de `HashRouter` para `BrowserRouter`;
- remocao do acoplamento do frontend com `http://localhost:8000/api`;
- adicao de proxy local no `vite.config.ts`;
- remocao dos lockfiles fragmentados e geracao de `package-lock.json` unificado;
- correcao de erros de tipagem e lint que impediam o build de producao;
- correcao no processamento de audio usando `toFile` para garantir compatibilidade com Groq;
- implementacao da interface de Gerenciamento de Alunos (`StudentsManagementPage`);
- implementacao de graficos de evolucao de desempenho no Historico;
- implementacao da exportação de relatórios pedagógicos detalhados em Excel;
- restrição de acesso ao sistema para contas autorizadas.

## Validacao Executada

Validacoes feitas localmente apos a refatoracao:

```bash
# Instala dependencias e gera lockfile unificado
npm install

# Valida lint + build de producao
npm run check

# Verifica o endpoint de saude do servidor local
Invoke-RestMethod http://localhost:8000/api/health | ConvertTo-Json -Depth 4
```

Resultados:

- `npm install`: concluido com sucesso;
- `npm run check`: concluido com sucesso;
- `vite build`: concluido com sucesso;
- `GET /api/health`: respondendo corretamente no servidor local.

## Troubleshooting

### Build falha ou tela branca por variavel `VITE_*`

Verifique se todas as variaveis do Firebase estao cadastradas na Vercel e no `.env` local. Se a tela ficar azul/branca sem conteúdo, verifique o Console do Desenvolvedor (F12). O erro `auth/invalid-api-key` indica que as chaves do Firebase não foram propagadas corretamente para o ambiente de produção.

### `/api/process-audio` retorna erro 500

Confirme:

- `GROQ_API_KEY` configurada;
- `OPENROUTER_API_KEY` configurada;
- formato do audio suportado;
- tamanho do arquivo abaixo de 25 MB.

### Rotas do frontend quebram ao atualizar a pagina

Confirme se o deploy esta usando o `vercel.json` da raiz. O rewrite para `index.html` precisa estar ativo.

### O projeto sobe localmente, mas a API nao responde

Teste:

```bash
# Valida se o backend local subiu corretamente
Invoke-RestMethod http://localhost:8000/api/health | ConvertTo-Json -Depth 4
```

### Existe algum backend legado ainda no repositorio?

Nao. O codigo Python legado e os utilitarios antigos foram removidos para deixar o repositorio alinhado apenas ao fluxo atual em React, Node local e Vercel Functions.

## Manutencao Futura

- mantenha novos scripts e configuracoes sempre na raiz;
- use `npm run check` antes de cada deploy;
- nao reintroduza URLs fixas de `localhost` no frontend;
- preserve `api/` como camada serverless oficial;
- se houver troca de banco ou autenticacao, atualize primeiro `.env.example` e este README.
