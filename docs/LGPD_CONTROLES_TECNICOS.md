# Controles técnicos de privacidade e LGPD — Leitura Digital

## Objetivo

Este documento registra os controles técnicos implementados para alinhar o software ao TCLE, TALE e à matriz de ciclo de vida dos dados da pesquisa.

## Requisitos obrigatórios antes da coleta em produção

1. Definir `NEXT_PUBLIC_RESEARCH_RETENTION_UNTIL` no formato `AAAA-MM-DD`, conforme o prazo aprovado no protocolo.
2. Garantir que `OPENAI_API_KEY` esteja configurada no ambiente de produção.
3. Não configurar `OPENROUTER_API_KEY` no ambiente utilizado para coleta científica. O suporte alternativo é destinado somente a desenvolvimento local.
4. Implantar `firestore.rules`, `firestore.indexes.json` e `storage.rules` no projeto Firebase correto.
5. Atribuir a custom claim `admin=true` somente à conta da pesquisadora/administrador responsável por exclusões e operações destrutivas.
6. Confirmar a região efetiva do Firestore, Vercel e serviços externos no protocolo e documentos éticos.
7. Revisar no painel da Vercel/Firebase os períodos de retenção de logs e limitar acesso administrativo.

## Controles implementados

### Processamento de áudio

- `/api/process-audio` exige Firebase ID Token válido antes de aceitar o processamento.
- O token é validado server-side por assinatura RS256 utilizando certificados públicos do Google, com validação de `aud`, `iss`, `exp`, `iat` e `sub`.
- O header `Authorization` nunca é gravado nos logs.
- O arquivo de áudio é armazenado somente em diretório temporário durante a requisição e removido no bloco `finally`.
- O nome original do arquivo não é utilizado no caminho temporário.
- O histórico enviado ao pipeline de IA é minimizado para até cinco registros com PCM, precisão, erros e data reduzida.
- `isForeigner` e `isGlassesUser` não são enviados ao fornecedor de IA no fluxo de produção.

### Logs

- Logs `debug` e `info` são suprimidos em produção.
- UIDs não são registrados em produção.
- Tokens, senhas, e-mails, nomes, transcrições, diagnósticos, histórico, prompts e campos similares são redigidos pelo logger central.
- Stack traces são apresentados somente em desenvolvimento.
- Respostas brutas da IA e previews de conteúdo são redigidos pelo logger central.

### Firestore

- `alunos`, `avaliacoes` e `import_history` são segregados pelo campo `professorId`.
- Consultas da aplicação incluem `professorId == currentUser.uid`.
- Alterações não podem transferir um registro para outro professor.
- Exclusão de alunos, avaliações, dados privados e histórico de importação exige `admin=true`.
- `diagnostico` e `observacoes` de novos registros são armazenados em `student_private`, separado do cadastro principal.
- Registros legados que ainda possuem `diagnostico` ou `observacoes` no documento principal são migrados de forma progressiva ao serem carregados.
- A coleção `data_subject_requests` registra pedidos de retirada, acesso e exclusão para revisão administrativa.

### Firebase Storage

- `storage.rules` está configurado como `deny-all`.
- O projeto não utiliza Storage para retenção permanente de áudio.
- Qualquer futura utilização exige revisão do protocolo e das regras antes da ativação.

### Retenção

- Novos registros de alunos, avaliações e importações recebem `retentionUntil` quando `NEXT_PUBLIC_RESEARCH_RETENTION_UNTIL` está configurada.
- Em produção, gravações novas são bloqueadas se a data de retenção não estiver definida.
- A exclusão física após o prazo deve ser executada por procedimento administrativo controlado e documentado.

### Exportações

Existem dois fluxos distintos:

**Excel operacional:** pode conter identificação e destina-se somente ao uso interno autorizado.

**JSON científico:**
- não usa ID do Firestore;
- atribui códigos locais `P001`, `P002`, etc.;
- remove nome e turma;
- remove transcrição e diagnósticos em texto livre;
- remove identificadores diretos;
- reduz datas para mês/ano;
- mantém somente métricas necessárias à análise.

A exportação científica deve passar por revisão humana de risco de reidentificação antes de compartilhamento externo.

### PWA e cache

- O Service Worker armazena apenas ativos públicos estáticos.
- Páginas de estudantes, histórico, avaliações e respostas de APIs não são colocadas em Cache Storage.
- APIs usam `Cache-Control: no-store`.

### CORS e headers

- O CORS global `Access-Control-Allow-Origin: *` foi removido.
- O fluxo de áudio é same-origin.
- Foram adicionados/reforçados HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP e CORP.

## Custom claim de administrador

As regras não utilizam mais e-mail hardcoded. Operações administrativas verificam a claim:

```text
admin = true
```

Essa claim deve ser atribuída fora do cliente, utilizando ambiente administrativo confiável do Firebase. Nunca disponibilize credenciais administrativas na aplicação web ou no repositório.

Após a alteração da claim, o usuário deve renovar o ID Token (novo login ou refresh forçado).

## Solicitação de retirada/exclusão

A aplicação possui `createPrivacyRequest()` em `lib/privacyRequestsService.ts` para registrar uma solicitação com status inicial `pending`.

Tipos previstos:

- `withdraw_consent`
- `delete_identifiable_data`
- `access_information`

A solicitação fica disponível para revisão administrativa. A exclusão efetiva de um aluno através do serviço exige `admin=true` e remove avaliações vinculadas, registro privado e cadastro principal.

## Dados legados

Antes da coleta oficial, recomenda-se abrir a lista de alunos com a conta proprietária para permitir a migração progressiva de `diagnostico` e `observacoes` existentes para `student_private` e verificar no Firestore se os campos antigos foram removidos.

## Checklist de implantação

- [ ] Data de retenção definida no protocolo e no ambiente.
- [ ] OpenAI configurada em produção.
- [ ] OpenRouter ausente no ambiente da pesquisa.
- [ ] Firestore Rules implantadas.
- [ ] Índices Firestore implantados.
- [ ] Storage Rules implantadas.
- [ ] Custom claim `admin=true` atribuída à conta administrativa.
- [ ] Dados legados privados migrados.
- [ ] Teste de professor A sem acesso aos alunos do professor B.
- [ ] Teste de chamada sem token em `/api/process-audio` retornando 401.
- [ ] Teste de áudio temporário confirmando remoção após sucesso e erro.
- [ ] Teste de JSON científico confirmando ausência de nome, ID do Firestore, turma, transcrição e data exata.
- [ ] Logs de produção revisados no provedor.
- [ ] TCLE/TALE atualizados com configurações efetivamente utilizadas.
