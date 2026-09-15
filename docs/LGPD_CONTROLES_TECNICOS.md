# Controles técnicos de privacidade e LGPD

## Antes da coleta em produção

- Definir o prazo aprovado em `RESEARCH_RETENTION_UNTIL`.
- Configurar somente `OPENAI_API_KEY` como provedor de IA em produção.
- Registrar no protocolo as regiões efetivas de Neon, Vercel, Google OAuth e OpenAI.
- Limitar acessos administrativos e retenção de logs nos provedores.
- Validar TCLE, assentimento, autorização institucional e consentimento específico para voz.

## Identidade e autorização

- Auth.js valida o login Google e cria uma sessão protegida por cookie.
- O callback aceita somente o e-mail normalizado definido em `ADMIN_EMAIL`.
- As APIs consultam `app_users` e não confiam em permissões enviadas pelo frontend.
- Perfis não administrativos recebem filtro obrigatório por `professor_id`.
- Exclusão de alunos e textos exige perfil `administrador` no servidor.
- O reset total é sempre rejeitado em produção.

## Dados dos estudantes

- `alunos` contém dados operacionais necessários.
- `student_private` separa diagnóstico e observações, com acesso mais restrito.
- `avaliacoes` mantém métricas e resultados ligados ao aluno e professor.
- `data_subject_requests` registra retirada de consentimento, acesso ou exclusão.
- O backup de migração nunca deve entrar no repositório, frontend ou artifact público.

## Áudio e inteligência artificial

- `/api/process-audio` exige sessão válida antes de aceitar o arquivo.
- O áudio usa nome aleatório em diretório temporário.
- O bloco `finally` remove o arquivo após sucesso ou falha.
- O histórico enviado à IA é limitado e minimizado.
- Nacionalidade e dados de saúde não são enviados ao fornecedor por padrão.
- Em produção, a ausência da OpenAI bloqueia o processamento; OpenRouter só pode existir em desenvolvimento.

## Retenção e exclusão

- Novos alunos, avaliações e históricos recebem `retention_until`.
- Produção bloqueia gravações quando o prazo não está configurado.
- A exclusão física após o prazo deve ser controlada e documentada.
- A exclusão de aluno remove avaliações e dados privados em uma transação.

## Logs, cache e exportações

- Tokens, e-mails, nomes, transcrições e diagnósticos não devem aparecer em logs de produção.
- APIs privadas respondem com `Cache-Control: no-store`.
- O PWA armazena somente ativos públicos estáticos.
- O Excel operacional permanece em ambiente autorizado.
- O JSON científico exclui nomes, identificadores, turma, transcrições, diagnósticos livres e datas exatas.

## Checklist de homologação

- [ ] Google OAuth configurado para os domínios corretos.
- [ ] `ADMIN_EMAIL` e `AUTH_SECRET` configurados somente como secrets.
- [ ] Migration Neon aplicada e contagens do backup conferidas.
- [ ] Login de conta não autorizada recusado.
- [ ] Requisições sem sessão retornam `401`.
- [ ] Professor A não acessa dados do professor B.
- [ ] Exclusões administrativas são auditadas.
- [ ] Áudio temporário é removido após sucesso e erro.
- [ ] OpenRouter não está configurado em produção.
- [ ] Exportação científica não contém identificadores diretos.
- [ ] Retenção, backup e descarte estão alinhados ao protocolo e aos termos assinados.
