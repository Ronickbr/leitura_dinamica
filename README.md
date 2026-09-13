# Leitura Digital

Plataforma computacional de apoio à avaliação de fluência leitora em contexto educacional e de pesquisa acadêmica.

> **Status do projeto:** software de pesquisa em desenvolvimento e validação. O sistema não substitui avaliação pedagógica, clínica, fonoaudiológica ou decisão profissional. Resultados automatizados devem ser interpretados e revisados por profissional/pesquisador responsável.

## 1. Identificação do projeto

**Nome do sistema:** Leitura Digital  
**Versão atual do software:** 4.2.0  
**Repositório:** `Ronickbr/leitura_dinamica`  
**Área:** Educação, fluência leitora, tecnologia educacional e processamento computacional de leitura oral  
**Natureza:** software de apoio à pesquisa e à avaliação pedagógica  
**Linguagem principal:** TypeScript  
**Framework:** Next.js 16 / React 19

### Contexto acadêmico

Este repositório contém a implementação computacional utilizada no desenvolvimento e investigação do **Leitura Digital**, ferramenta destinada a apoiar a coleta, processamento, organização e análise de avaliações de leitura oral.

A plataforma foi estruturada para permitir que pesquisadores e profissionais autorizados registrem uma leitura, processem temporariamente o áudio, obtenham uma transcrição automatizada, calculem métricas de fluência e revisem informações produzidas pelo sistema antes de sua utilização pedagógica ou científica.

O software deve ser compreendido como **instrumento de apoio**, e não como mecanismo autônomo de classificação de crianças, diagnóstico clínico ou substituição do julgamento profissional.

---

## 2. Objetivo científico e funcional

O Leitura Digital foi concebido para apoiar estudos relacionados à leitura oral, especialmente em contextos nos quais seja necessário:

- registrar avaliações de leitura de forma padronizada;
- obter transcrição automática da leitura oral;
- comparar a leitura reconhecida com um texto de referência;
- identificar correspondências, substituições, omissões e inserções;
- calcular métricas quantitativas de fluência;
- acompanhar avaliações longitudinalmente;
- produzir informações estruturadas para revisão pedagógica;
- organizar dados para análise científica;
- exportar conjuntos de dados reduzidos e desidentificados para pesquisa.

O projeto não pressupõe que a Inteligência Artificial seja capaz de realizar avaliação pedagógica independente. As etapas automatizadas são componentes auxiliares de um fluxo que permanece sob supervisão humana.

---

## 3. Escopo metodológico

A plataforma foi construída para tornar operacional um processo de investigação no qual a leitura oral pode ser transformada em dados estruturados e revisáveis.

De forma geral, o sistema permite estudar relações entre:

- leitura oral registrada;
- transcrição reconhecida automaticamente;
- texto de referência;
- palavras corretas por minuto (PCM);
- precisão de leitura;
- padrões de ocorrência identificados no alinhamento;
- evolução do desempenho ao longo do tempo;
- análise pedagógica produzida a partir dos dados estruturados.

A pergunta científica específica, a população estudada, os critérios de inclusão e exclusão, o delineamento, os instrumentos e as hipóteses pertencem ao protocolo da pesquisa e devem ser descritos na dissertação, artigo ou projeto correspondente.

---

## 4. Delimitação de autoria e contribuições

Para fins de transparência científica, é importante distinguir diferentes níveis de contribuição no projeto.

### Concepção pedagógica e científica

A concepção pedagógica do Leitura Digital compreende, conforme o protocolo da pesquisa:

- definição do problema educacional investigado;
- especificação das necessidades do instrumento;
- definição do fluxo de avaliação;
- definição das informações relevantes para análise;
- critérios de interpretação pedagógica;
- revisão e validação do uso do sistema no contexto da pesquisa.

A identificação nominal da pesquisadora, orientador(a), colaboradores e instituições deverá ser registrada na dissertação e, quando aplicável, na documentação formal do projeto.

### Desenvolvimento computacional

A implementação computacional compreende:

- arquitetura da aplicação;
- desenvolvimento frontend e backend;
- modelagem e integração do banco de dados;
- integração dos serviços de autenticação;
- integração com serviços externos de Inteligência Artificial;
- implementação dos algoritmos de alinhamento e cálculo de métricas;
- controles de segurança e privacidade;
- mecanismos de exportação, histórico e auditoria técnica.

### Serviços de terceiros

O projeto utiliza tecnologias e serviços que **não foram desenvolvidos pela equipe de pesquisa**, incluindo, conforme a configuração efetivamente empregada:

- OpenAI;
- Firebase / Google Cloud;
- Vercel;
- Next.js;
- React;
- TypeScript;
- bibliotecas de código aberto declaradas em `package.json`.

O uso dessas tecnologias não implica autoria sobre os modelos, frameworks ou infraestruturas de terceiros.

---

## 5. Visão geral do funcionamento

O fluxo principal de uma avaliação é:

```text
Participante realiza a leitura
        ↓
Navegador registra o áudio
        ↓
POST /api/process-audio
        ↓
Validação do Firebase ID Token
        ↓
Criação de arquivo temporário
        ↓
Serviço externo de transcrição
        ↓
Transcrição
        ↓
Alinhamento com o texto de referência
        ↓
Cálculo de PCM, precisão e métricas
        ↓
Análise complementar por modelo de linguagem
        ↓
Revisão humana
        ↓
Persistência das informações autorizadas
        ↓
Exportação operacional ou científica, quando necessária
```

O arquivo de áudio utilizado pela aplicação é processado temporariamente e removido ao final da requisição. O áudio não é armazenado permanentemente pelo Leitura Digital no Firebase Storage.

---

## 6. Componentes desenvolvidos especificamente para o Leitura Digital

Entre os componentes específicos do projeto estão:

- fluxo de avaliação de leitura;
- gerenciamento de participantes/alunos;
- biblioteca de textos;
- registro de avaliações;
- comparação entre texto original e transcrição;
- cálculo de palavras corretas por minuto;
- cálculo de precisão;
- alinhamento de palavras;
- classificação de substituições, omissões e inserções;
- apresentação da transcrição marcada;
- histórico longitudinal;
- exportação operacional em Excel;
- exportação científica reduzida;
- controles de pseudonimização e ocultação visual;
- segregação de dados privados;
- política técnica de retenção;
- fluxo de solicitação de acesso, retirada ou exclusão;
- validação server-side do Firebase ID Token;
- logger com redação de dados pessoais em produção.

---

## 7. Arquitetura tecnológica

| Camada | Tecnologia / Serviço | Função |
|---|---|---|
| Aplicação web | Next.js 16 | Interface e API serverless |
| Frontend | React 19 + TypeScript | Interface do usuário |
| Autenticação | Firebase Auth | Identidade dos usuários autorizados |
| Banco de dados | Firestore | Persistência de registros autorizados |
| Storage | Firebase Storage | Bloqueado por regras no estado atual |
| Transcrição / IA | OpenAI | Processamento externo na configuração de produção da pesquisa |
| Hospedagem | Vercel | Execução e publicação da aplicação |
| Validação | Zod | Validação de payloads |
| Exportação | XLSX | Arquivos operacionais em Excel |
| CI | GitHub Actions | Typecheck e build automáticos |

### Ambiente de produção científica

Durante uma coleta científica, a configuração deve permanecer estável e documentada.

O ambiente de produção da pesquisa deve utilizar **OpenAI** como fornecedor de IA. O suporte alternativo a OpenRouter existe somente para desenvolvimento local e **não deve ser configurado no ambiente de coleta científica**.

---

## 8. Estrutura de dados

As principais coleções Firestore são:

| Coleção | Conteúdo | Acesso esperado |
|---|---|---|
| `alunos` | Dados operacionais mínimos do participante | Proprietário do registro / administrador |
| `student_private` | Diagnóstico e observações privadas, quando necessários | Proprietário / administrador |
| `avaliacoes` | Métricas e resultados de avaliações | Proprietário / administrador |
| `textos` | Textos utilizados na leitura | Usuários autenticados |
| `import_history` | Histórico técnico de importações | Proprietário / administrador |
| `data_subject_requests` | Solicitações de acesso, retirada ou exclusão | Criação pelo responsável; gestão administrativa |
| `research_identity_map` | Reserva para mapeamentos científicos controlados | Administrador |

As regras de acesso encontram-se em [`firestore.rules`](./firestore.rules).

Os índices necessários são versionados em [`firestore.indexes.json`](./firestore.indexes.json).

O Firebase Storage está bloqueado por padrão em [`storage.rules`](./storage.rules).

---

## 9. Proteção de dados, ética e LGPD

O Leitura Digital foi ajustado para que a proteção de dados seja tratada durante todo o ciclo de vida das informações, e não apenas na exportação científica.

Os controles técnicos detalhados estão documentados em:

[`docs/LGPD_CONTROLES_TECNICOS.md`](./docs/LGPD_CONTROLES_TECNICOS.md)

### Princípios aplicados

- minimização de dados;
- limitação de finalidade;
- segregação de acesso por `professorId`;
- autenticação obrigatória;
- validação server-side do token;
- menor privilégio;
- separação de dados privados;
- ausência de armazenamento permanente de áudio no sistema;
- supressão e redação de dados pessoais em logs de produção;
- retenção com prazo configurável;
- exportação científica distinta da exportação operacional;
- registro de pedidos de retirada/exclusão;
- revisão humana antes de utilização científica.

### Consentimento e assentimento

O software **não substitui** os instrumentos éticos da pesquisa.

Antes da utilização com participantes reais, o protocolo deve definir e documentar, conforme aplicável:

- consentimento livre e esclarecido dos responsáveis;
- assentimento das crianças;
- autorização institucional;
- autorização específica para gravação de voz;
- finalidade do tratamento;
- prazo de retenção;
- pessoas autorizadas a acessar dados identificáveis;
- serviços externos utilizados;
- localização e eventual transferência internacional de dados;
- política de retirada e exclusão;
- distinção entre dados escolares e dados de pesquisa;
- aprovação pelo sistema CEP/CONEP, quando exigível.

Nenhuma funcionalidade deste repositório deve ser interpretada como substituta da avaliação ética institucional.

---

## 10. Ciclo de vida dos dados

### Coleta

A coleta ocorre após autenticação de usuário autorizado e, no contexto de pesquisa, deve ocorrer somente após os requisitos éticos previstos no protocolo.

### Áudio

O áudio:

1. é capturado no navegador;
2. é enviado ao endpoint autenticado;
3. é escrito em arquivo temporário;
4. é encaminhado ao serviço externo utilizado para transcrição;
5. é removido localmente no bloco `finally` após o processamento.

### Persistência

O registro permanente pode incluir, conforme o protocolo:

- identificador interno;
- série/ano;
- turma, quando necessária operacionalmente;
- métricas quantitativas;
- transcrição;
- diagnóstico pedagógico produzido pelo sistema;
- intervenção sugerida;
- métricas qualitativas;
- data da avaliação;
- vínculo com o professor responsável.

A seleção das variáveis efetivamente utilizadas em pesquisa deve observar necessidade e finalidade.

### Retenção

A data final de retenção é definida pela variável:

```env
NEXT_PUBLIC_RESEARCH_RETENTION_UNTIL=AAAA-MM-DD
```

Em produção, o software bloqueia novas gravações de dados de pesquisa se essa configuração não estiver definida.

### Exclusão

Solicitações de retirada, acesso ou exclusão são registradas em `data_subject_requests` e devem ser processadas por responsável autorizado.

Operações destrutivas relevantes exigem a custom claim:

```text
admin = true
```

---

## 11. Exportação operacional e exportação científica

O sistema distingue dois usos.

### Excel operacional

Pode conter informações identificáveis e é destinado exclusivamente ao uso interno autorizado.

Não deve ser compartilhado como dataset científico público sem tratamento adicional.

### JSON científico

A exportação científica foi desenhada para reduzir o risco de reidentificação.

Ela:

- não exporta o ID real do Firestore;
- gera códigos locais `P001`, `P002`, etc.;
- remove nome;
- remove turma;
- remove transcrição;
- remove diagnóstico em texto livre;
- remove observações livres;
- reduz data para mês/ano;
- mantém apenas métricas selecionadas.

Mesmo assim, o arquivo exportado deve passar por **revisão humana do risco de reidentificação**, especialmente em amostras pequenas.

A expressão “anonimizado” não deve ser utilizada de maneira absoluta quando houver possibilidade razoável de reidentificação por combinação de variáveis.

---

## 12. Ocultação visual não é anonimização

A interface possui um modo de privacidade que esconde nomes e conteúdo textual para demonstrações de tela.

Esse recurso atua **somente na apresentação visual** e não altera o conteúdo armazenado no banco.

Portanto:

> ocultação visual ≠ pseudonimização ≠ anonimização

Esses conceitos devem ser tratados separadamente na metodologia da pesquisa.

---

## 13. Inteligência Artificial e processamento automatizado

O sistema utiliza IA como componente auxiliar.

Na configuração de produção da pesquisa, a OpenAI é utilizada para tarefas de transcrição e análise complementar.

O modelo externo:

- não foi desenvolvido pela equipe deste projeto;
- não constitui o Leitura Digital em sua totalidade;
- não substitui os algoritmos determinísticos locais;
- não substitui revisão humana;
- pode produzir erros;
- pode apresentar variação conforme versão, modelo e infraestrutura do fornecedor.

Para reprodutibilidade, a pesquisa deve registrar, na data da coleta:

- fornecedor;
- modelo utilizado;
- versão ou identificador disponível;
- parâmetros relevantes;
- período da coleta;
- alterações de prompt relevantes;
- versão/commit do software utilizado.

---

## 14. Algoritmos determinísticos

O sistema contém processamento que não depende do modelo generativo, incluindo:

- tokenização;
- normalização;
- alinhamento entre texto de referência e transcrição;
- cálculo de palavras corretas;
- cálculo de PCM;
- cálculo de precisão;
- identificação de substituições;
- identificação de omissões;
- identificação de inserções;
- métricas de fluência derivadas.

Esses componentes são importantes para distinguir o processamento algorítmico próprio do processamento realizado por serviços externos.

---

## 15. Limitações metodológicas

O uso do sistema envolve limitações que devem ser consideradas em qualquer publicação científica.

### Reconhecimento automático de fala

A transcrição pode variar em função de:

- qualidade do microfone;
- ruído ambiente;
- intensidade da voz;
- distância do dispositivo;
- velocidade de leitura;
- sotaque;
- idade do participante;
- pronúncia;
- características do modelo utilizado pelo fornecedor.

### Modelos generativos

As análises geradas por IA podem conter:

- inferências incorretas;
- generalizações;
- inconsistências;
- interpretações pedagógicas inadequadas;
- diferenças entre execuções ou versões de modelo.

### Métricas computacionais

PCM, precisão e alinhamento dependem da qualidade da transcrição e das regras implementadas no software.

### Validade externa

O funcionamento técnico da plataforma não demonstra, por si só, validade pedagógica, validade clínica ou eficácia educacional.

Essas propriedades precisam ser investigadas por desenho de pesquisa apropriado.

---

## 16. Reprodutibilidade científica

Para permitir reprodução ou auditoria metodológica, recomenda-se registrar em cada estudo:

- commit Git utilizado na coleta;
- versão do software;
- data de início e fim da coleta;
- configuração das variáveis relevantes;
- versão do Node.js;
- versão das dependências;
- regras Firestore implantadas;
- versão dos prompts;
- fornecedor/modelo de IA;
- configuração da infraestrutura;
- critérios de inclusão/exclusão;
- protocolo de coleta;
- política de retenção;
- procedimentos de revisão humana.

### Commit como identificador da versão experimental

Para estudos formais, não se recomenda descrever apenas “versão 4.2.0”.

Registre também o SHA exato, por exemplo:

```text
Software: Leitura Digital 4.2.0
Commit: <SHA utilizado durante a coleta>
Data do snapshot: <AAAA-MM-DD>
```

Quando o estudo for finalizado, recomenda-se criar uma tag/release imutável correspondente à versão analisada.

---

## 17. Integração contínua e controle de qualidade

O repositório possui GitHub Actions em:

```text
.github/workflows/ci.yml
```

Em pushes e pull requests direcionados ao `master`, o workflow executa:

```bash
npm ci
npm run typecheck
npm run build
```

Esse pipeline busca evitar que versões com erros de tipagem ou falhas de build sejam utilizadas inadvertidamente.

Para projetos de pesquisa em produção, recomenda-se configurar o GitHub para exigir o status check antes do merge.

---

## 18. Estrutura do repositório

```text
leitura_dinamica/
├── app/
│   ├── api/
│   │   └── process-audio/       # endpoint autenticado de processamento
│   ├── components/
│   ├── evaluations/
│   ├── history/
│   ├── settings/
│   ├── students/
│   └── texts/
├── lib/
│   ├── analysisService.ts       # integração e análise
│   ├── evaluationsService.ts    # avaliações
│   ├── firebaseTokenVerifier.ts # validação server-side do ID Token
│   ├── pcmUtils.ts              # métricas e alinhamento
│   ├── privacyRequestsService.ts# solicitações LGPD
│   ├── researchPolicy.ts        # política de retenção
│   ├── services.ts              # alunos e dados privados
│   └── errorUtils.ts            # logs e tratamento de erros
├── docs/
│   └── LGPD_CONTROLES_TECNICOS.md
├── public/
│   └── sw.js                    # cache restrito a assets públicos
├── .github/
│   └── workflows/
│       └── ci.yml
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
├── next.config.ts
├── package.json
├── package-lock.json
└── README.md
```

---

## 19. Requisitos de ambiente

- Node.js `>= 22`
- npm compatível com o lockfile
- projeto Firebase configurado
- conta OpenAI para ambiente de produção científica
- projeto Vercel ou ambiente equivalente para deploy

---

## 20. Variáveis de ambiente

Utilize `.env.example` como referência.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_RESEARCH_RETENTION_UNTIL=AAAA-MM-DD
OPENAI_API_KEY=
```

### Desenvolvimento local

Existe suporte opcional a:

```env
OPENROUTER_API_KEY=
```

Essa variável é destinada somente a desenvolvimento/testes e **não deve estar presente no ambiente utilizado durante a coleta científica**.

Nunca envie `.env`, chaves privadas, tokens administrativos ou credenciais para o repositório.

---

## 21. Instalação local

```bash
git clone https://github.com/Ronickbr/leitura_dinamica.git
cd leitura_dinamica
npm ci
```

Crie o ambiente local a partir de `.env.example`.

Depois:

```bash
npm run dev
```

Aplicação local:

```text
http://localhost:3000
```

---

## 22. Validação antes de uma versão de pesquisa

Execute:

```bash
npm run typecheck
npm run build
```

Antes de qualquer coleta oficial, valide também:

- regras Firestore;
- índices Firestore;
- regras Storage;
- autenticação;
- segregação entre professores;
- remoção do áudio temporário;
- configuração da retenção;
- ausência de OpenRouter em produção;
- logs de produção;
- exportação científica;
- migração de dados privados legados;
- TCLE e TALE correspondentes à configuração real.

Consulte o checklist completo em [`docs/LGPD_CONTROLES_TECNICOS.md`](./docs/LGPD_CONTROLES_TECNICOS.md).

---

## 23. Deploy

O projeto foi preparado para execução em Vercel, mas pode ser adaptado a infraestrutura compatível com Next.js.

No ambiente de produção da pesquisa:

1. configure as variáveis oficiais;
2. defina a data de retenção;
3. configure apenas a OpenAI como fornecedor de IA;
4. implante regras e índices Firebase;
5. atribua a claim `admin=true` apenas ao responsável autorizado;
6. valide o fluxo completo com dados fictícios;
7. registre o commit exato liberado para a coleta.

### Firebase

Exemplo de implantação:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

A execução deve ser feita somente por pessoa autorizada e no projeto Firebase correto.

---

## 24. Segurança

Entre os controles implementados estão:

- autenticação Firebase;
- validação server-side de Firebase ID Token;
- segregação por proprietário;
- operações administrativas por custom claim;
- `Cache-Control: no-store` para APIs;
- PWA sem cache de dados autenticados;
- Storage bloqueado por padrão;
- CORS global aberto removido;
- HSTS;
- `X-Frame-Options`;
- `X-Content-Type-Options`;
- `Referrer-Policy`;
- `Permissions-Policy`;
- redação de dados pessoais no logger;
- remoção de arquivo temporário de áudio;
- limitação de tamanho e tipo de upload.

Nenhum sistema conectado à internet possui risco zero. Esses controles reduzem exposição, mas não eliminam a necessidade de governança, auditoria e procedimentos institucionais de resposta a incidentes.

---

## 25. Distinção entre dados escolares e dados de pesquisa

A existência de um dado no ambiente escolar não autoriza sua utilização científica.

O protocolo deve distinguir:

**Dados escolares:** produzidos ou mantidos pela instituição para atividade educacional/administrativa.

**Dados de pesquisa:** selecionados ou gerados especificamente para responder aos objetivos científicos aprovados.

A incorporação de dados escolares à base de pesquisa deve possuir finalidade definida, necessidade metodológica e fundamento ético/jurídico apropriado.

---

## 26. Uso responsável

Não utilize o Leitura Digital para:

- produzir diagnóstico médico;
- emitir laudo clínico;
- classificar automaticamente uma criança sem revisão humana;
- aplicar sanções escolares automatizadas;
- tomar decisões exclusivamente algorítmicas que possam causar prejuízo;
- armazenar gravações indefinidamente;
- coletar dados sem consentimento/assentimento quando exigidos;
- reutilizar dados para finalidade incompatível com a pesquisa autorizada.

---

## 27. Versionamento e mudanças metodologicamente relevantes

Mudanças no código podem alterar o instrumento de pesquisa.

São consideradas potencialmente relevantes:

- alteração de prompt;
- troca de modelo de IA;
- troca de fornecedor;
- alteração do algoritmo de PCM;
- alteração das regras de alinhamento;
- alteração da lógica de precisão;
- mudança do tempo de gravação;
- mudança das variáveis persistidas;
- mudança na exportação científica;
- mudança nas regras de acesso;
- alteração na política de retenção.

Caso uma dessas mudanças seja introduzida durante a coleta, o pesquisador deve avaliar seu impacto metodológico e documentar a mudança.

---

## 28. Citação do software

Quando o Leitura Digital for utilizado em publicação, dissertação, relatório ou apresentação científica, recomenda-se citar pelo menos:

```text
LEITURA DIGITAL. Plataforma computacional de apoio à avaliação de fluência leitora.
Versão 4.2.0. Repositório: https://github.com/Ronickbr/leitura_dinamica.
Commit utilizado: <SHA>. Acesso em: <data>.
```

Para uma versão final de dissertação ou artigo, substitua essa forma genérica por uma referência compatível com a norma bibliográfica adotada pela instituição e inclua os autores/contribuidores de acordo com a participação efetivamente realizada.

---

## 29. Transparência e documentação complementar

A documentação técnica de privacidade e LGPD encontra-se em:

- [`docs/LGPD_CONTROLES_TECNICOS.md`](./docs/LGPD_CONTROLES_TECNICOS.md)

Os instrumentos éticos da pesquisa, como TCLE e TALE, devem permanecer alinhados ao funcionamento real da versão utilizada.

Quando houver mudança de fornecedor, retenção, fluxo de áudio ou categoria de dado, esses documentos devem ser revisados antes de nova coleta.

---

## 30. Licença e reutilização

Este repositório **não possui atualmente um arquivo `LICENSE` versionado**.

Até que uma licença seja definida explicitamente, a disponibilidade pública do código não deve ser interpretada como autorização irrestrita para reutilização, redistribuição ou incorporação em outros projetos.

Para reutilização científica ou técnica, entre em contato com os responsáveis pelo projeto e observe também as licenças das dependências externas utilizadas.

---

## 31. Aviso final

O Leitura Digital é um instrumento computacional de apoio à pesquisa e à prática pedagógica.

Sua utilização científica adequada depende da combinação de:

- protocolo de pesquisa bem definido;
- aprovação ética quando aplicável;
- consentimento e assentimento adequados;
- configuração técnica documentada;
- controle de acesso;
- proteção durante todo o ciclo de vida dos dados;
- revisão humana;
- registro da versão do software;
- análise das limitações metodológicas.

A reprodutibilidade de uma pesquisa que utiliza software não depende apenas do código-fonte, mas também da documentação da configuração, dos dados, dos procedimentos, dos modelos externos e das decisões metodológicas utilizadas durante a coleta.