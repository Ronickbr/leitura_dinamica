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

O projeto utiliza uma stack moderna e de alta performance para garantir rapidez e segurança:

### **Frontend**
- **React 19 & Vite**: Interface reativa de alta velocidade.
- **TypeScript**: Garantia de robustez e segurança de tipos no código.
- **Firebase (Auth & Firestore)**: Gestão de usuários e banco de dados real-time altamente escalável.
- **Framer Motion**: Animações fluidas para uma experiência de usuário premium.
- **Vanilla CSS (Glassmorphism)**: Estilização moderna com efeitos de transparência e desfoque.

### **Backend**
- **FastAPI (Python)**: Framework de alto desempenho para orquestração da IA e serviços de áudio.
- **Groq Cloud (Whisper-large-v3)**: LDI (Large Language Model) especializado em áudio para transcrição ultra-rápida (STT).
- **OpenRouter (GPT-4o-mini)**: Modelo de IA avançado para análise pedagógica detalhada.
- **PyInstaller & PyStray**: Ferramentas para gerar o executável (.exe) com integração à bandeja do sistema (System Tray).

---

## 📂 Estrutura do Projeto

```text
leitura_dinamica/
├── backend/                # Módulo Servidor (Python)
│   ├── app/                # Lógica central da aplicação
│   ├── main.py             # Ponto de entrada da API e System Tray
│   ├── pcm_utils.py        # Algoritmos de cálculo de PCM e níveis
│   ├── build_exe.py        # Script de empacotamento para Windows
│   └── .env                # Configurações sensíveis (API Keys)
├── frontend/               # Módulo Cliente (React)
│   ├── src/
│   │   ├── api/            # Comunicação com o backend local
│   │   ├── features/       # Módulos de negócio (Histórico, Avaliação, etc.)
│   │   ├── components/     # UI reusable components
│   │   └── services/       # Integração direta com Firebase
│   └── dist/               # Build compilado do frontend
├── unificar_build.py       # Script utilitário para unificação de módulos
└── README.md               # Documentação principal
```

---

## �️ Novidades da Versão 1.2.0

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
