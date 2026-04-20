---
name: "mobile-experience-optimizer"
description: "Optimizes mobile UX, responsiveness, touch navigation, and performance. Invoke when improving small-screen behavior, mobile loading, or mobile test coverage."
---

# Mobile Experience Optimizer

Use esta skill quando a aplicação precisar de uma camada de experiência mobile mais madura, especialmente em cenários com:

- telas pequenas e navegação touch;
- gargalos de performance em celular;
- páginas com tabelas, formulários ou cabeçalhos densos;
- necessidade de testes automatizados por resolução e perfil de dispositivo;
- monitoramento contínuo de métricas mobile.

## Objetivos

Esta skill deve orientar a implementação com foco em:

1. detectar automaticamente dispositivos móveis e tablets;
2. adaptar layout, componentes e áreas de toque;
3. reduzir custo visual e peso de recursos em redes lentas;
4. priorizar tempo de resposta e estabilidade visual;
5. validar comportamento com testes automatizados;
6. documentar a estratégia e as métricas operacionais.

## Checklist de execução

### 1. Detecção de contexto

Verifique:

- largura e altura da viewport;
- presença de touch e pointer coarse;
- user agent apenas como heurística complementar;
- `prefers-reduced-motion`;
- `navigator.connection.effectiveType`;
- `navigator.connection.saveData`.

### 2. Adaptação da interface

Aplique:

- navegação inferior ou menu simplificado para mobile;
- cabeçalhos com empilhamento vertical;
- botões e campos com alvo mínimo de 44px;
- tabelas com scroll horizontal seguro ou conversão para cards;
- modais e dropdowns com comportamento de bottom sheet quando necessário.

### 3. Otimização de recursos

Prefira:

- importação dinâmica de componentes mobile-only;
- redução de animações e blur em redes restritas;
- postergação de elementos não críticos;
- menor quantidade de recursos acima da dobra;
- observação das métricas de `resourceCount` e `longTaskCount`.

### 4. Testes obrigatórios

Cubra pelo menos:

- iPhone Safari;
- Android Chrome;
- breakpoints compactos e médios;
- presença e usabilidade do formulário principal;
- altura mínima de alvos touch;
- disponibilidade do endpoint de health;
- geração de métricas de performance no cliente.

### 5. Monitoramento

Registre e acompanhe:

- `ttfb`
- `fcp`
- `lcp`
- `cls`
- `domContentLoaded`
- `load`
- `longTaskCount`
- `resourceCount`

## Saída esperada

Ao finalizar, entregue:

- componentes ou hooks mobile;
- ajustes responsivos nos pontos críticos;
- testes automatizados;
- documentação técnica;
- metas de performance e plano de observabilidade.
