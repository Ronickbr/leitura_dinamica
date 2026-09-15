# Leitura Digital — Fluência Leitora

Aplicação Next.js para avaliação de fluência leitora, com autenticação Google,
PostgreSQL no Neon e processamento de áudio pela OpenAI.

## Arquitetura

- **Frontend e API:** Next.js 16 / React 19
- **Autenticação:** Auth.js com Google OAuth
- **Banco:** Neon PostgreSQL acessado somente no servidor
- **IA em produção:** OpenAI
- **Hospedagem:** Vercel

O navegador nunca recebe `DATABASE_URL`, `AUTH_SECRET`, segredo OAuth ou chave da
OpenAI. Alunos, avaliações e históricos são consultados por APIs autenticadas e
respostas privadas usam `Cache-Control: no-store`.

## Configuração

Copie `.env.example` para `.env.local` e configure:

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
ADMIN_EMAIL=admin@example.com
RESEARCH_RETENTION_UNTIL=2099-12-31
NEXT_PUBLIC_RESEARCH_RETENTION_UNTIL=2099-12-31
OPENAI_API_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Gere `AUTH_SECRET` com:

```bash
npx auth secret
```

No Google Cloud, cadastre a URI de retorno:

```text
http://localhost:3000/api/auth/callback/google
https://SEU-DOMINIO/api/auth/callback/google
```

O acesso é limitado ao e-mail definido em `ADMIN_EMAIL`. Outros logins Google
são recusados antes da criação da sessão.

## Banco de dados

Execute a migration versionada:

```bash
npm install
npm run db:migrate
```

Para importar o backup JSON do Firestore sem adicioná-lo ao Git:

```bash
npm run db:import-firestore -- /caminho/backup_firestore.json
```

O importador:

- preserva IDs do Firestore;
- converte timestamps;
- separa diagnóstico e observações em `student_private`;
- usa transação e `UPSERT`;
- valida as contagens dos IDs importados;
- preserva `textoId` ausente sem descartar avaliações.

Também existe o workflow manual **Migrate Neon**, que usa os secrets
`DATABASE_URL` e `ADMIN_EMAIL`. O backup com dados pessoais não deve ser enviado
ao repositório ou armazenado como artifact público.

## Desenvolvimento

```bash
npm install
npm run dev
```

Validações:

```bash
npm run typecheck
npm run build
```

## Segurança e LGPD

- Login exclusivo por Google OAuth e allowlist de e-mail.
- Sessão em cookie protegido pelo Auth.js.
- Autorização repetida em todas as APIs de dados.
- Perfil administrativo conferido no servidor; o frontend não concede acesso.
- Segregação por `professor_id` para perfis não administrativos.
- Diagnóstico e observações ficam separados em `student_private`.
- Áudio é temporário e removido em `finally` após processamento ou erro.
- Produção exige `OPENAI_API_KEY`; OpenRouter não é aceito como fallback.
- Prazo de retenção obrigatório para novas gravações em produção.
- Exportação científica remove identificadores diretos e textos livres.
- Reset geral do banco é bloqueado em produção.

Consulte [`docs/LGPD_CONTROLES_TECNICOS.md`](docs/LGPD_CONTROLES_TECNICOS.md)
antes de qualquer coleta real.

## Implantação

1. Crie as credenciais OAuth no Google Cloud.
2. Configure os secrets no ambiente da Vercel.
3. Configure `DATABASE_URL` com conexão pooled do Neon e TLS obrigatório.
4. Execute `npm run db:migrate` ou o workflow manual.
5. Importe o backup a partir de uma máquina autorizada.
6. Valide login, segregação, exclusão, exportação anônima e limpeza de áudio.
7. Só então direcione o domínio de produção.

Nunca adicione `.env.local`, `backup_firestore.json`, credenciais de serviço ou
strings reais de conexão ao GitHub.
