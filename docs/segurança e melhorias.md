# 🚀 Roadmap Completo: Segurança + Robustez Acadêmica

## PARTE 1: SEGURANÇA

### Fase 1 - Crítico (Semana 1)

| # | Ação | Arquivo | Prioridade |
|---|------|---------|------------|
| 1 | **Validar tipo e tamanho de arquivo** | `app/api/process-audio/route.ts` | 🔴 Alta |
| 2 | **Sanitizar inputs contra Prompt Injection** | `lib/analysisService.ts` | 🔴 Alta |
| 3 | **Firebase Admin SDK no server-side** | `app/api/process-audio/route.ts` | 🔴 Alta |
| 4 | **Rate Limiting na API** | `app/api/process-audio/route.ts` | 🔴 Alta |

### Fase 2 - Importante (Semana 2)

| # | Ação | Arquivo | Prioridade |
|---|------|---------|------------|
| 5 | **Regras Firestore restritivas** | Firebase Console | 🟡 Média |
| 6 | **CORS restritivo** | `next.config.ts` | 🟡 Média |
| 7 | **Logging de auditoria** | Todas APIs | 🟡 Média |
| 8 | **Tratamento de erros estruturado** | `lib/analysisService.ts` | 🟡 Média |

---

## PARTE 2: ROBUSTEZ ACADÊMICA

### Funcionalidades para Pesquisa

| # | Funcionalidade | Benefício |
|---|----------------|-----------|
| 1 | **Exportar dados anonimizados para CSV/JSON** | Artigos científicos (sem dados pessoais) |
| 2 | **Cálculo de desvios padrão e IC 95%** | Validação estatística das métricas |
| 3 | **Comparação com normas nacionais (SAEB/ANA)** | Contextualizar o PCM do aluno |
| 4 | **Histórico de intervenções** | Mostrar o que funcionou para cada aluno |

### Funcionalidades para Escolas

| # | Funcionalidade | Benefício |
|---|----------------|-----------|
| 1 | **Modo Offline (PWA)** | Gravar sem internet, sincronizar depois |
| 2 | **Perfil do Aluno (tela simples)** | Aluno vê sua evolução sem acessar dados sensíveis |
| 3 | **Relatório impresso (PDF)** | Entregar para pais/coordenação |
| 4 | **Turmas e anos letivos** | Organizar alunos por série |
| 5 | **Metas personalizadas** | Definir PCM alvo por aluno |

---

## PARTE 3: CÓDIGOS DE IMPLEMENTAÇÃO

### 1. Validação de Arquivo (Segurança)

```typescript
// app/api/process-audio/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = ["audio/webm", "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg"];

const uploadSchema = z.object({
  file: z.instanceof(File).refine(f => f.size <= MAX_FILE_SIZE, "Arquivo muito grande")
    .refine(f => ALLOWED_MIME.includes(f.type), "Tipo de arquivo inválido"),
  original_text: z.string().min(1).max(10000),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const originalText = formData.get("original_text") as string;

    // Validação com Zod
    const result = uploadSchema.safeParse({ file, original_text: originalText };
    if (!result.success) {
      return NextResponse.json({ detail: result.error.errors[0].message }, { status: 400 });
    }
    // ...continua
  } catch (e) {
    return NextResponse.json{ detail: "Erro de validação" }, { status: 400 };
  }
}
```

### 2. Sanitização de Prompt (Segurança)

```typescript
// lib/analysisService.ts - Adicionar função
function sanitizeInput(text: string): string {
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control chars
    .replace(/<script|javascript:|on\w+=/gi, "") // Remove XSS
    .slice(0, MAX_ORIGINAL_TEXT_LENGTH);
}

// Usar: const sanitizedOriginalText = sanitizeInput(originalText);
```

### 3. Estatísticas Acadêmicas

```typescript
// lib/statsUtils.ts - Novo arquivo
export function calculateStatistics(evaluations: Avaliacao[]) {
  const pcms = evaluations.map(e => e.pcm);
  const n = pcms.length;
  
  if (n === 0) return null;
  
  const mean = pcms.reduce((a, b) => a + b, 0) / n;
  const variance = pcms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const ci95 = 1.96 * (stdDev / Math.sqrt(n)); // Intervalo de confiança 95%
  
  return {
    media: Math.round(mean),
    desvioPadrao: Math.round(stdDev),
    ic95: Math.round(ci95),
    min: Math.min(...pcms),
    max: Math.max(...pcms),
    tendencia: pcms[0] > pcms[n-1] ? "positiva" : "negativa"
  };
}
```

---

## 📅 Cronograma Sugerido

| Semana | Foco |
|--------|------|
| **1** | Validação de segurança (Zod + sanitização) |
| **2** | Firebase Rules + Rate Limiting |
| **3** | Modo Offline (PWA) |
| **4** | Estatísticas acadêmicas + Relatório PDF |
| **5** | Perfil do aluno + Metas personalizadas |
