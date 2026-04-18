# Fluência Leitora PCM - Sistema de Avaliação com IA

Sistema digital inteligente para automação de diagnóstico de fluência leitora (Palavras Corretas por Minuto - PCM), utilizando Inteligência Artificial para transcrição e diagnóstico pedagógico avançado.

## 🌟 Novidades da Versão Atual
- **Histórico de Desempenho Renovado**: Listagem simplificada por aluno, focada na evolução individual.
- **Gráficos de Evolução Premium**: Sparklines dinâmicas com curvas suaves (Bezier), área em gradiente e feedback visual por cores.
- **Coloração por Nível de Fluência**: Identificação visual automática do nível do aluno (Fase Inicial a Fluente) diretamente no gráfico.
- **IA Estável e Resiliente**: Unificação de estrutura de dados da IA e tratamento de erros aprofundado para diagnósticos pedagógicos.
- **Fluxo de Login Prioritário**: O sistema inicia automaticamente na tela de login para garantir a segurança dos dados.
- **Dashboard (Painel de Controle)**: Visualização em tempo real do total de alunos cadastrados e contagem de alunos com dificuldades.
- **System Tray (Bandeja do Sistema)**: O aplicativo agora minimiza para a bandeja do sistema perto do relógio.
- **Integração IA Full-Stack**: Transcrição via Groq e análise pedagógica via OpenRouter.

## 🚀 Tecnologias
- **Frontend**: Vite, React, TypeScript, Firebase (Auth/Firestore)
- **Backend**: FastAPI (Python), Groq IA, OpenRouter
- **Estilização**: Glassmorphism UI com Vanilla CSS

## 🔑 Acessos de Teste (Pedagogos)
Foram pré-cadastrados 3 perfis de pedagogos para uso no sistema:

| Nome | E-mail | Senha |
| :--- | :--- | :--- |
| **Ana Silva** | `ana@escola.com` | `Professor123@` |
| **Bruno Souza** | `bruno@escola.com` | `Professor123@` |
| **Carla Oliveira** | `carla@escola.com` | `Professor123@` |

---

## 🛠️ Configuração do Ambiente

### 1. Backend
Navegue até a pasta `backend` e configure o `.env`:
```env
GROQ_API_KEY=sua_chave
OPENROUTER_API_KEY=sua_chave
FIREBASE_CREDENTIALS_JSON=arquivo_credenciais.json
```
Execute:
```bash
uv run python main.py
```

### 2. Frontend
Navegue até a pasta `frontend` e configure o `.env` com suas chaves do Firebase:
```bash
npm install
npm run dev
```

## 📦 Executável (Build)
Para gerar o executável autônomo do sistema:
1. Certifique-se de que o frontend está compilado (`npm run build`).
2. No diretório `backend`, execute:
   ```bash
   uv run python build_exe.py
   ```
O executável será gerado em `backend/dist/LeituraDigital/`.

## 🛠️ Estrutura do Sistema
1. **Login**: Primeira tela de interação para proteção de dados.
2. **Dashboard**: Resumo estatístico da turma e atalhos rápidos.
3. **Gerenciamento**: Cadastro de Alunos (com observações pedagógicas), Textos e Histórico.
4. **Avaliação**: Processo de gravação de 60 segundos com análise automática de PCM e diagnóstico pedagógico por IA.
5. **System Tray**: Menu de contexto (botão direito no ícone) com opções para abrir o sistema, verificar status ou sair.
