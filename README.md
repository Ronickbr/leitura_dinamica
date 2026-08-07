# 📖 Plataforma Leitura (v4.2.0)

Plataforma de avaliação de fluência leitora com Next.js (App Router), persistência em Firebase e processamento de áudio via IA. O projeto foi refatorado para um monorepo Next.js unificado com API routes serverless.

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Atual](#stack-atual)
- [Arquitetura de Tratamento de Erros](#arquitetura-de-tratamento-de-erros)
- [Banco de Dados](#banco-de-dados)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Deploy na Vercel](#deploy-na-vercel)
- [Experiência Mobile](#experiência-mobile)
- [Migração Realizada](#migração-realizada)
- [Troubleshooting](#troubleshooting)

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
- alternem entre Temas Claro e Escuro com persistência de preferência;
- operem a plataforma com experiência "app-like" em dispositivos móveis (Navegação Inferior);
- detectem automaticamente dispositivos móveis, conexão lenta e preferência por economia de dados;
- monitorem métricas mobile contínuas no cliente para diagnóstico de performance;
- acompanhe o diagnóstico clínico do aluno (TDA, TDH, TEA, etc.) com estilização visual no histórico;
- revisem métricas qualitativas justificadas por IA (Fluência, Silabação, etc.) antes de salvar;
- Validação robusta de uploads (Zod) e sanitização de inputs contra Prompt Injection;
- Cálculo automático de estatísticas acadêmicas (Desvio Padrão, IC 95%) e exportação de datasets JSON para pesquisa.
- Importação Lote de Histórico via Excel (permite migrar avaliações antigas);
- Análise de Evolução Comparativa via IA baseada em registros anteriores;
- Suporte a **Alunos Estrangeiros**: Identificação de padrões fonológicos específicos (ex: crianças sul-americanas) para diagnósticos mais precisos;
- Geração de **Perguntas de Compreensão**: A IA agora gera automaticamente 3 perguntas de interpretação baseadas no texto lido;
- Correção robusta na marcação de texto pedagógico (omissões/adições) usando classes CSS para evitar conflitos de estilo.

## Changelog

### v4.2.0 — **Arquitetura de Erros e Limpeza de Artefatos**
- **Arquitetura Centralizada de Exceções**: Implementado `lib/errorUtils.ts` com a classe `DetailedError`, função `logDetailed()` e `formatErrorForUser()` para tratamento uniforme em toda a aplicação.
- **Eliminação de Catch Genéricos**: Removidos 64 blocos `try/catch` genéricos em 22 arquivos (Firebase, OpenAI, PCM, UI). Toda exceção agora carrega metadados completos: Arquivo, Linha, Método, Endpoint, Código HTTP, Campo/Valor causador.
- **Logs Exaustivos**: Implementado registro obrigatório de Timestamp, Usuário, Método, Parâmetros, Exceção completa e Stack Trace em ambiente de desenvolvimento.
- **Segurança de Exposição**: Stack trace e detalhes técnicos só são expostos ao usuário em ambiente de desenvolvimento; em produção, retorna mensagem amigável com ID de correlação.
- **Validações Específicas**: Todo erro de validação informa o campo exato e o motivo detalhado, eliminando mensagens genéricas.
- **Remoção de Artefatos de Teste**: Excluídos scripts de calibração (`validate-reading-calibration.ts`, `test-aluno-teste5.ts`), configuração Playwright e dependência `@playwright/test`. Repositório agora contém apenas código de produção.
- **Novo Script `typecheck`**: Adicionado `npm run typecheck` para validação estática TypeScript sem emitir arquivos.
- **Convenção de Engenharia**: Avaliações com `transcricaoMarcada` (edição manual do professor) ignoram o recálculo automático de métricas PCM, preservando a intervenção pedagógica.

### v4.1.5 — **Limpeza de Código**
Remoção de logs de debug (console.log) e arquivos de testes obsoletos para um ambiente de produção mais limpo.

### v4.1.4 — **Refino dos Prompts de IA e Versionamento**
A transcrição agora recebe um guia contextual com série escolar, segmentação estrita e `temperature: 0`, enquanto o diagnóstico pedagógico passa a priorizar explicitamente a leitura literal e os dados estruturados do alinhamento.

### v4.1.3 — **Aprimoramento do Alinhamento de Omissões**
Refatoração da lógica de PCM usando *prefix matching* (programação dinâmica) para calcular com exatidão onde o aluno parou de ler no áudio de 1 minuto, impedindo que ruídos ou inserções no final da transcrição façam com que o restante do texto seja contabilizado incorretamente como erro.

### v4.1.2 — **Correção na Contagem de Omissões**
Ajustado o algoritmo de PCM para não classificar palavras não lidas no final do teste de leitura como erros em todos os casos (devido a uma interrupção por tempo esgotado), refletindo precisamente a fluência até o ponto de parada.

### v4.1.0 — **Fidelidade Visual e Precisão Pedagógica**
Melhoria no motor de alinhamento e renderização de transcrições.
- **Fidelidade de Transcrição**: Preservação total da pontuação e capitalização do texto original nas palavras acertadas.
- **Visualização de Substituições**: Novo formato `[original](lido)` com estilos CSS dedicados.
- **Prompt IA Otimizado**: Diagnóstico clínico aprimorado para padrões fonológicos e de estrangeiros.
- **PCM Real**: Garantia de uso da duração exata do áudio no cálculo de fluência.

### v4.0.0 — **Revolução na UX: De Modais para Páginas Dedicadas**
Refatoração completa do fluxo de avaliação e detalhes de alunos.
- **Nova Jornada de Avaliação**: Fluxo dividido em páginas sequenciais (Leitura → Revisão → Sucesso).
- **Página de Revisão**: Interface profissional para ajuste de métricas antes de salvar.
- **Página de Sucesso**: Feedback visual premium com resumo de desempenho.
- **Página de Detalhes do Aluno**: Página full-screen glassmorphism com visão 360°.
- **Limpeza de Projeto**: Remoção de artefatos legados (`frontend/`).

---

## Stack Atual

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, TypeScript
- **Persistência**: Firebase Auth, Firestore e Storage
- **API**: Next.js API Routes (serverless)
- **IA**: OpenAI Total (Whisper-1 + GPT-4o)
- **Deploy**: Vercel
- **Validação**: Zod 4
- **Tratamento de Erros**: `lib/errorUtils.ts` (DetailedError + logDetailed)

## Arquitetura de Tratamento de Erros

Toda a aplicação segue um contrato estrito de tratamento de exceções centralizado em [`lib/errorUtils.ts`](./lib/errorUtils.ts).

### Princípios Fundamentais

| Regra | Descrição |
| --- | --- |
| ❌ Proibido | Mensagens genéricas ("Algo deu errado", "Erro interno") |
| ❌ Proibido | Blocos `catch` genéricos sem metadados ou `try/catch` vazios |
| ✅ Obrigatório | Cada exceção informa: Nome, Arquivo, Linha, Método, Endpoint (se houver), Código HTTP, Mensagem original, Campo/Valor causador |
| ✅ Obrigatório | Logs contêm: Timestamp, Usuário, Método, Parâmetros, Exceção completa + Stack Trace |
| ✅ Segurança | Stack trace só é exposto em `NODE_ENV !== 'production'` |

### Uso Padrão

```typescript
import { DetailedError, logDetailed, formatErrorForUser } from "@/lib/errorUtils";

// 1. Capturar com contexto
try {
  await algumServico(parametros);
} catch (originalError) {
  const erro = new DetailedError(
    "Falha ao processar a avaliação do aluno",
    originalError,
    {
      arquivo: "app/evaluations/new/page.tsx",
      linha: 142,
      metodo: "handleSalvarAvaliacao",
      dados: { alunoId, textoId, audioDuracao },
    }
  );
  logDetailed(erro); // Loga tudo (console + metadados)
  toast.error(formatErrorForUser(erro)); // Mostra apenas mensagem segura ao usuário
}
```

### Fluxo de Erro

```
Exceção Bruta
     ↓
DetailedError (envelope com metadados)
     ↓
logDetailed() (registro exaustivo em DEV)
     ↓
formatErrorForUser() (mensagem segura / stacktrace em DEV)
```

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
│   ├── evaluations/          # Avaliações (fluxo multi-página)
│   ├── students/             # Gerenciamento de alunos
│   ├── texts/                # Biblioteca de textos
│   ├── history/              # Histórico de avaliações
│   ├── components/           # Componentes compartilhados
│   ├── styles/               # Design System modular (tokens, glass, layout)
│   ├── layout.tsx            # Layout principal
│   ├── page.tsx              # Dashboard
│   └── globals.css           # Estilos globais
├── lib/                      # Serviços e utilitários
│   ├── firebase.ts           # Configuração Firebase
│   ├── auth.ts               # Autenticação
│   ├── errorUtils.ts         # 🔐 Arquitetura centralizada de erros
│   ├── services.ts           # CRUD alunos
│   ├── textsService.ts       # CRUD textos
│   ├── evaluationsService.ts # Avaliações + processAudio
│   ├── analysisService.ts    # IA (OpenAI Total: Transcrição + Diagnóstico)
│   ├── pcmUtils.ts           # Utilitários PCM e alinhamento
│   ├── resetDatabaseService.ts # Reset seguro do BD (admin apenas)
│   ├── statsUtils.ts         # Estatísticas Acadêmicas
│   └── styleUtils.ts         # Tokens de estilo
├── docs/                     # Documentação técnica
├── public/                   # Assets estáveis e PWA
├── scripts/
│   └── generate-icons.js     # Geração de ícones PWA
├── .env.example              # Template de variáveis
├── next.config.ts            # Configuração Next.js
├── package.json              # Scripts e dependências
├── tsconfig.json             # Configuração TypeScript
├── firestore.rules           # Regras de segurança do Firestore
├── firebase.json             # Configuração Firebase Hosting
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
| `OPENAI_API_KEY` | Sim | Chave para transcrição e análise pedagógica |

## Scripts Disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento em `:3000` |
| `npm run build` | Gera o build de produção |
| `npm run start` | Inicia o servidor de produção |
| `npm run lint` | Executa ESLint em todo o projeto |
| `npm run typecheck` | Valida tipos TypeScript sem emitir arquivos |
| `npm run deploy:preview` | Dispara deploy preview via Vercel CLI |
| `npm run deploy:prod` | Dispara deploy de produção via Vercel CLI |
| `npm run generate:icons` | Gera ícones PWA em múltiplos tamanhos |

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
- `OPENAI_API_KEY`.

### 3. Rodar o projeto

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:3000`.

### 4. Validar antes de subir

```bash
# Valida tipos TypeScript
npm run typecheck

# Valida lint
npm run lint

# Gera build de produção
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
OPENAI_API_KEY=
```

### Deploy via CLI

```bash
# Cria ou atualiza um deploy preview
npm run deploy:preview

# Publica em produção
npm run deploy:prod
```

## Experiência Mobile

O projeto possui uma camada dedicada de experiência mobile com:

- detecção automática de viewport, touch, economia de dados e orientação;
- navegação inferior carregada sob demanda;
- cabeçalhos, formulários e listas adaptados para telas pequenas;
- conversão de tabelas para **Listas com Drop (Accordions)** profissionais, eliminando cards redundantes;
- monitoramento contínuo de `ttfb`, `fcp`, `lcp`, `cls`, `load`, `longTaskCount` e `resourceCount`.

Documentação detalhada:

- [docs/mobile-experience.md](./docs/mobile-experience.md)

## Migração Realizada

Esta versão consolidou a nova arquitetura de fluxo de avaliação:

- **v4.x**: Transição completa para fluxo de avaliação multi-página (`new` → `[id]` → `review` → `success`), garantindo foco e precisão em cada etapa.
- **Limpeza**: Remoção definitiva de pastas legadas (`frontend/`), artefatos temporários (`scratch/`), rotas de teste (`mobile-preview/`) e suítes de teste locais.
- **🎯 Funcionalidades Finais (Fase 1, 2 e Robustez Acadêmica)**:
    - **Painel do Aluno**: Dashboard individual com gráfico de progresso e histórico de intervenções pedagógicas da IA.
    - **Contexto SAEB/ANA**: Comparação automática com normas nacionais brasileiras de fluência leitora por série.
    - **Metas Personalizadas**: Definição de alvos específicos de PCM por estudante.
    - **Segurança de Infra**: Headers HTTP restritivos, Prevenção de XSS, Sanitização de inputs (Zod) e Auditoria de chamadas de IA.
    - **Relatório PDF**: Exportação visual profissional dos diagnósticos diretamente do navegador.
    - **Autenticação**: Fluxo seguro de E-mail e Senha.
    - **Arquitetura de Erros**: Tratamento centralizado sem catch genéricos, com metadados completos em cada exceção.

## Troubleshooting

### Build falha ou tela branca

Verifique se todas as variáveis do Firebase estão cadastradas na Vercel e no `.env` local. Rode `npm run typecheck` para validar tipos antes do build.

### `/api/process-audio` retorna erro 500

Confirme:
- `OPENAI_API_KEY` configurada;
- formato do áudio suportado;
- tamanho do arquivo abaixo de 25 MB.

Os logs completos com stack trace estarão no console do servidor em ambiente de desenvolvimento, incluindo arquivo, linha e método da falha.

### Tela de login em branco

Caso a tela de login não apareça, certifique-se de estar usando a versão mais recente com a correção do componente `Layout` que impede bloqueio de renderização do formulário.

### Auth/invalid-api-key no build

O Next.js tenta inicializar o Firebase durante o build estático. Use a verificação `typeof window !== 'undefined'` no `lib/firebase.ts` para evitar isso.
