# Implantação da versão 4.3.0

## Ordem de implantação

1. Faça backup do Firestore e valide a recuperação em ambiente de homologação.
2. Revise alunos, avaliações e histórico de importação: cada documento deve ter um professorId válido. Textos são uma biblioteca compartilhada para leitura, com edição limitada ao autor ou administrador. Documentos legados sem dono só serão acessíveis ao administrador (exceto leitura dos textos).
3. Configure a custom claim admin: true no UID administrativo com Firebase Admin em ambiente confiável. O e-mail configurado anteriormente deixa de conceder privilégios. Preserve outras claims e peça novo login após a alteração.
4. Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY somente no servidor. A chave aceita quebras de linha escapadas. Em infraestrutura Google com identidade de serviço, Application Default Credentials também é suportada.
5. Publique firestore.indexes.json, aguarde os índices ficarem prontos e valide a versão em homologação.
6. Publique aplicação e regras em uma janela coordenada. Versões antigas consultam coleções inteiras e deixam de funcionar com o novo isolamento. Confirme login, gravação curta, revisão, salvamento, histórico e acesso administrativo.
7. A API usa Firebase Admin e ignora regras Firestore por definição; a autorização de aluno é validada explicitamente na rota. Não remova essa validação.

## Migração de propriedade

scripts/migrate-ownership.mjs gera uma conferência e aplica apenas um mapa explícito de coleção/ID/UID. O modo padrão não escreve no banco. Não adivinha proprietários nem transfere registros que já tenham dono.

Formato do arquivo de entrada (não versionar dados reais):

    [
      { "collection": "alunos", "id": "ID_DO_DOCUMENTO", "professorId": "UID_DO_PROFESSOR" }
    ]

Execute primeiro:

    node --env-file=.env.local scripts/migrate-ownership.mjs caminho-do-mapa.json

Depois de conferir o projeto e o mapa:

    node --env-file=.env.local scripts/migrate-ownership.mjs caminho-do-mapa.json --apply

Para documentos já atribuídos incorretamente, prepare uma migração específica após revisar a propriedade. As regras não permitem alteração de professorId pelo cliente.

## Limites operacionais

- Upload de até 4 MB; corpo multipart limitado durante leitura, mesmo sem Content-Length.
- Áudio entre 1 e 120 segundos, verificado pelo resultado de transcrição. O protocolo de gravação continua com alvo de 60 segundos. Gravações acima do limite são rejeitadas após a transcrição; o limite de bytes e as cotas protegem o custo anterior.
- 5 tentativas/minuto e 100/dia (dia UTC) por UID; tentativas inválidas também consomem cota. Administradores estão sujeitos à mesma cota.
- Contadores ficam em _audio_quotas, inacessível pelo cliente. É possível habilitar TTL em expiresAt; a expiração não é necessária à correção do contador.
- A função de áudio tem limite de 180 segundos; cada chamada ao provedor tem timeout de 30 segundos e até duas tentativas na aplicação, sem retries adicionais do SDK.
- A confiança da IA é um valor do modelo, não uma probabilidade calibrada. Exigir revisão docente.
- O histórico mostra 30 avaliações por página. Filtros e exportações consideram os registros carregados; use Carregar mais para ampliar o conjunto.
- As regras isolam por professor. Compartilhamento entre professores e organizações exige um modelo de membros que ainda não foi introduzido.
- Não armazena áudios no servidor após a análise. O rascunho fica no sessionStorage da aba por até 24 horas; fechar a aba pode perdê-lo.

## Verificação

    npm ci
    npm run lint
    npm run typecheck
    npm test
    npm run test:rules
    npm run build

Os testes de regras usam o projeto demo-leitura e Java 21. Não executam no banco real. O CI instala Node 22 e Java 21.

## Reversão

Se houver erro, reverta a aplicação e avalie regras compatíveis em conjunto. Não restaure permissões amplas automaticamente. Mantenha backup e mapa de propriedade. Uma reversão de código não desfaz mudanças de dados.

## Calibração pedagógica

As faixas históricas são mantidas para não inventar novas normas. Reúna gravações autorizadas corrigidas por professores, compare PCM e erros do algoritmo com a revisão humana e estratifique por série, sotaque, ruído e dispositivo. Versione novas faixas apenas após validação.
