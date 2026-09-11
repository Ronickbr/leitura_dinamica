# Changelog

## 4.3.0 — 2026-09-10

- Permissões por professor, exclusões administrativas por custom claim e proteção das coleções internas (#2).
- API de áudio autenticada, autorização do aluno, texto/histórico carregados no servidor, limite de 4 MB e cotas transacionais de 5 tentativas/minuto e 100/dia por usuário (#3).
- Indisponibilidade da IA preservada, resposta estruturada validada e confiança sem aumento artificial (#4).
- PCM calculado pela duração retornada pela transcrição verbose; protocolo e classificação histórica versionados; liberação do microfone (#5).
- Rascunhos vinculados a professor e aluno, validade de 24 horas, revisão explícita e salvamento idempotente (#6).
- Histórico paginado, escopo das exportações explícito e consultas isoladas por proprietário (#7).
- ESLint, Vitest, testes no emulador do Firestore e CI (#8).
- Manifesto, página offline e cache limitado a recursos públicos (#9).
- Plano pedagógico com atividade, meta, reavaliação e situação (#10).

### Implantação
Requer configuração de Firebase Admin, custom claim de administrador e revisão dos registros legados antes de publicar regras. Consulte docs/implantacao-4.3.md. Não altera automaticamente o banco em produção.

### Limites
As faixas históricas de classificação permanecem inalteradas e identificadas. Calibração pedagógica com gravações reais não é substituída pelos testes de software. Uso offline oferece uma página de orientação; gravações e avaliações ainda precisam de conexão.
