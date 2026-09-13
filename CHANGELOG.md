# Changelog metodológico — Leitura Digital

Este arquivo registra alterações do software com potencial de afetar o comportamento do instrumento de pesquisa, a reprodutibilidade dos resultados, o tratamento de dados ou a interpretação metodológica.

A finalidade não é apenas documentar evolução de produto. Cada entrada deve permitir responder: **o que mudou, por que mudou, se a mudança pode afetar dados/resultados e a partir de qual versão/commit ela passou a valer**.

## Regras de uso

Para cada alteração relevante, registrar:

- versão ou data;
- commit SHA ou release associada;
- componente afetado;
- descrição da mudança;
- impacto metodológico esperado;
- necessidade ou não de atualizar protocolo, TCLE/TALE, matriz de dados ou documentação técnica;
- compatibilidade com dados produzidos anteriormente.

Mudanças puramente visuais, sem impacto sobre coleta, processamento, armazenamento, segurança ou análise, podem ser resumidas.

---

## [Não lançado]

Use esta seção para alterações ainda não consolidadas em uma versão de pesquisa.

---

## [4.2.0] — 2026-09-13

### Governança, privacidade e segurança para uso acadêmico

**Escopo:** autenticação, Firestore, logs, áudio, exportação científica, retenção, cache, Storage, CI e documentação.

**Principais mudanças:**

- segregação de `alunos`, `avaliacoes` e `import_history` por `professorId`;
- exclusões sensíveis condicionadas a privilégio administrativo;
- separação de `diagnostico` e `observacoes` em `student_private` para novos registros;
- validação server-side do Firebase ID Token em `/api/process-audio`;
- remoção de token bruto, nome, transcrição, diagnóstico, prompts e outros dados sensíveis dos logs de produção;
- manutenção do áudio apenas em arquivo temporário durante o processamento, com exclusão ao final da requisição;
- minimização do histórico enviado ao pipeline de IA;
- remoção do envio de `isForeigner` e `isGlassesUser` no fluxo de produção;
- Firebase Storage configurado como `deny-all`;
- Service Worker limitado a ativos estáticos públicos;
- APIs configuradas com `Cache-Control: no-store`;
- remoção de CORS global permissivo;
- exportação científica JSON sem IDs do Firestore, nomes, turma, transcrição, diagnóstico livre ou data exata;
- introdução da configuração `NEXT_PUBLIC_RESEARCH_RETENTION_UNTIL`;
- registro de solicitações de retirada/acesso/exclusão em `data_subject_requests`;
- bloqueio do reset de banco em produção;
- criação de índices Firestore necessários às consultas por proprietário;
- criação de CI com `npm ci`, `npm run typecheck` e `npm run build`;
- inclusão de documentação LGPD e README orientado à pesquisa acadêmica.

**Impacto metodológico:** alto.

Essas mudanças alteram controles de acesso, governança, forma de exportação científica e condições técnicas de coleta. Estudos devem registrar o commit SHA efetivamente utilizado.

**Compatibilidade com dados anteriores:** parcial.

Dados históricos permanecem utilizáveis, mas registros antigos podem necessitar migração progressiva de campos privados. Exportações científicas antigas devem ser revisadas quanto ao risco de reidentificação.

**Documentação relacionada:**

- `README.md`
- `docs/LGPD_CONTROLES_TECNICOS.md`
- `CITATION.cff`
- `CONTRIBUTORS.md`

---

## [4.1.5]

### Limpeza de código e redução de artefatos de depuração

**Escopo:** manutenção e observabilidade.

**Mudança:** remoção de artefatos de teste e ajustes em logs de depuração.

**Impacto metodológico:** baixo, desde que o pipeline de processamento permaneça inalterado.

---

## [4.1.4]

### Refinamento de prompts e parâmetros de IA

**Escopo:** transcrição e análise pedagógica.

**Mudança:** refinamento das instruções fornecidas aos modelos, incluindo maior contextualização da série escolar e parâmetros mais determinísticos para transcrição.

**Impacto metodológico:** alto.

Alterações de prompt ou modelo podem modificar a saída produzida para o mesmo áudio. Estudos que utilizem esta versão devem registrar prompts, modelos e commit SHA.

**Compatibilidade com resultados anteriores:** não presumir equivalência automática.

---

## [4.1.3]

### Alteração no alinhamento e identificação do ponto de parada

**Escopo:** algoritmo de alinhamento e PCM.

**Mudança:** ajuste da lógica usada para determinar até onde a criança realizou a leitura, reduzindo a contabilização indevida de palavras não lidas após o encerramento da leitura.

**Impacto metodológico:** alto.

Pode alterar PCM, quantidade de omissões e métricas derivadas em relação a versões anteriores.

**Compatibilidade com resultados anteriores:** resultados calculados com versões diferentes devem ser comparados com cautela.

---

## [4.1.2]

### Ajuste na contagem de omissões

**Escopo:** métricas de leitura.

**Mudança:** palavras não alcançadas após interrupção temporal deixaram de ser classificadas automaticamente como erro em determinadas situações.

**Impacto metodológico:** alto.

Pode alterar diretamente a contagem de erros e medidas de precisão.

---

## [4.1.0]

### Revisão de fidelidade de transcrição e apresentação de substituições

**Escopo:** alinhamento, renderização e cálculo de fluência.

**Mudança:** melhorias na preservação do texto de referência, visualização de substituições e cálculo com duração efetiva do áudio.

**Impacto metodológico:** moderado a alto.

---

## [4.0.0]

### Reestruturação do fluxo de avaliação

**Escopo:** interface e processo operacional.

**Mudança:** migração para fluxo sequencial de leitura, revisão e confirmação, com possibilidade explícita de revisão humana antes do salvamento.

**Impacto metodológico:** moderado.

A alteração fortalece a supervisão humana e muda a sequência operacional da coleta.

---

## Como congelar uma versão para pesquisa

Antes do início de uma coleta oficial:

1. confirmar que o CI está aprovado;
2. registrar o commit SHA;
3. preferencialmente criar tag ou release;
4. registrar modelos e serviços externos utilizados;
5. registrar a data de retenção configurada;
6. registrar a versão das regras Firebase;
7. evitar mudanças no pipeline durante a coleta;
8. se uma mudança for inevitável, documentar neste changelog e avaliar o impacto sobre comparabilidade.

Exemplo de registro metodológico:

```text
Software: Leitura Digital
Versão: 4.2.0
Commit SHA: <commit>
Data do congelamento: AAAA-MM-DD
Fornecedor de IA em produção: OpenAI
Protocolo/CEP: <identificador, quando aplicável>
```
