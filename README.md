# Fluência Leitora PCM - v1.2.0 - Sistema de Avaliação com IA

Sistema digital inteligente para automação de diagnóstico de fluência leitora (Palavras Corretas por Minuto - PCM), utilizando Inteligência Artificial para transcrição e diagnóstico pedagógico avançado de alta fidelidade.

---

## � Objetivo e Utilidade

O **Fluência Leitora PCM** foi desenvolvido para transformar o processo manual de avaliação de leitura em uma experiência automatizada, precisa e data-driven. O sistema permite que professores:
- **Reduzam o tempo de avaliação:** O cálculo do PCM e a análise de erros são instantâneos.
- **Obtenham diagnóstico especializado:** A IA atua como uma psicopedagoga assistente, identificando padrões de erro e sugerindo intervenções.
- **Acompanhem a evolução:** Gráficos dinâmicos mostram o progresso histórico de cada aluno, permitindo intervenções precoces em casos de dificuldade de aprendizagem.

---

## 🚀 Tecnologias Utilizadas

O projeto utiliza uma stack unificada em JavaScript/TypeScript para máxima performance e facilidade de deploy:

### **Frontend**
- **React 19 & Vite**: Interface reativa de alta velocidade.
- **TypeScript**: Segurança de tipos e robustez.
- **Firebase (Auth & Firestore)**: Autenticação e banco de dados real-time.
- **Vanilla CSS (Glassmorphism)**: Estética moderna e fluida.

### **Backend**
- **Node.js & Express**: API robusta e escalável para orquestração de IA.
- **Groq Cloud (Whisper-large-v3)**: Transcrição de áudio ultra-rápida (STT).
- **OpenRouter (GPT-4o-mini)**: Diagnóstico pedagógico e análise inteligente.

---

## 📂 Estrutura do Projeto

```text
leitura_dinamica/
├── backend/                # Módulo Servidor (Node.js)
│   ├── index.js            # Ponto de entrada da API
│   ├── pcmUtils.js         # Algoritmos de cálculo de PCM e níveis
│   └── .env                # Configurações sensíveis (API Keys)
├── frontend/               # Módulo Cliente (React)
│   ├── src/
│   │   ├── api/            # Comunicação com o backend local
│   │   ├── features/       # Módulos de negócio (Histórico, Avaliação, etc.)
│   │   ├── components/     # UI reusable components
│   │   └── services/       # Integração direta com Firebase
│   └── dist/               # Build compilado do frontend
├── unificar_build.py       # Script utilitário
└── README.md               # Documentação principal
```

---

## 🛠️ Configuração do Ambiente (Stack JS)

### 1. Backend (Node.js)
Navegue até a pasta `backend` e configure o `.env`:
```env
GROQ_API_KEY=sua_chave
OPENROUTER_API_KEY=sua_chave
PORT=8000
```
Instale e execute:
```bash
npm install
node index.js
```

### 2. Frontend (React)
Navegue até a pasta `frontend` e configure o `.env` com suas chaves do Firebase:
```bash
npm install
npm run dev
```

---

## ️ Novidades da Versão 1.2.0

- **Histórico Renovado**: Interface focada no aluno, facilitando a identificação de quem precisa de mais atenção.
- **Gráficos Premium**: Sparklines suaves com gradientes dinâmicos que mudam de cor conforme o nível de fluência (Fase Inicial -> Fluente).
- **Resiliência de IA**: Novo motor de tratamento de respostas da IA, garantindo que o diagnóstico seja salvo corretamente mesmo em casos de conexões instáveis.
- **Segurança de Dados**: Otimização do `.gitignore` e blindagem de arquivos de credenciais para repositórios públicos.

---

## 🔑 Acessos de Teste (Pedagogos)

| Nome | E-mail | Senha |
| :--- | :--- | :--- |
| **Ana Silva** | `ana@escola.com` | `Professor123@` |
| **Bruno Souza** | `bruno@escola.com` | `Professor123@` |
| **Carla Oliveira** | `carla@escola.com` | `Professor123@` |

---

## ⚙️ Configuração para Desenvolvedores

### 1. Requisitos
- Python 3.10+
- Node.js 18+
- Chaves de API (Groq e OpenRouter)

### 2. Instalação e Execução
Consulte as pastas `backend` e `frontend` para instruções específicas de cada módulo. Em modo de desenvolvimento, o backend roda na porta `8000` e o frontend na port `5173`. Para produção, o backend serve o frontend compilado.

---

Este projeto é uma ferramenta de apoio pedagógico e deve ser utilizado como complemento à observação profissional do educador.
