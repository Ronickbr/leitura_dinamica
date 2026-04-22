# Guia de Regras de Segurança - Firebase Firestore

Para garantir que a plataforma "Leitura" seja segura em produção, é CRÍTICO configurar as regras de segurança no Console do Firebase. Abaixo está a configuração recomendada.

## Princípios de Segurança
1.  **Apenas Usuários Autenticados**: Ninguém pode ler ou escrever sem estar logado.
2.  **Propriedade dos Dados**: Cada professor só pode acessar os dados que ele mesmo criou (vinculados ao seu `professorId`).
3.  **Validação de Schema**: Bloquear campos não autorizados (opcional, mas recomendado).

## Regras Recomendadas (copy-paste)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função auxiliar para verificar se o usuário é dono do documento
    function isOwner(doc) {
      return request.auth != null && doc.data.professorId == request.auth.uid;
    }

    // Regras para Alunos
    match /alunos/{alunoId} {
      allow create: if request.auth != null;
      allow read, update, delete: if isOwner(resource);
    }

    // Regras para Avaliações
    match /avaliacoes/{avaliacaoId} {
      allow create: if request.auth != null;
      allow read, update, delete: if isOwner(resource);
    }

    // Regras para Textos (Podem ser lidos por todos, mas criados por admins)
    match /textos/{textoId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.email == "seu-email-admin@exemplo.com";
    }
    
    // Bloqueio padrão para qualquer outra coleção
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Como aplicar
1.  Acesse o [Firebase Console](https://console.firebase.google.com/).
2.  Vá em **Firestore Database** > **Rules** (Regras).
3.  Cole o código acima.
4.  Substitua `"seu-email-admin@exemplo.com"` pelo seu e-mail administrativo.
5.  Clique em **Publish** (Publicar).

> [!WARNING]
> Sem essas regras, sua base de dados está em "Modo Teste" ou aberta, o que permite o roubo ou deleção de dados por qualquer pessoa com a URL da API.
