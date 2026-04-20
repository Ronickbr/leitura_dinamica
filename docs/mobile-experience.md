# Mobile Experience

## Objetivo

Esta implementação adiciona uma camada específica para experiência mobile na aplicação, com foco em:

- detecção automática de dispositivos móveis e touch;
- adaptação visual para telas pequenas;
- navegação touch-friendly;
- redução de custo visual em conexões lentas ou com economia de dados;
- monitoramento contínuo de métricas de performance;
- testes automatizados para múltiplos perfis móveis.

## Componentes principais

### `app/components/MobileExperienceProvider.tsx`

Responsável por detectar e expor:

- `isMobile`
- `isTablet`
- `isTouchDevice`
- `prefersReducedData`
- `prefersReducedMotion`
- `hasSlowConnection`
- dimensões e orientação da viewport

Além disso, sincroniza atributos no `document.documentElement`:

- `data-mobile`
- `data-tablet`
- `data-touch`
- `data-reduced-data`
- `data-orientation`

Esses atributos permitem que o CSS e ferramentas externas reajam automaticamente ao perfil do dispositivo.

### `app/components/MobilePerformanceMonitor.tsx`

Coleta métricas no cliente e armazena um snapshot em `localStorage` na chave:

```text
leitura-mobile-performance
```

Também dispara o evento customizado:

```text
leitura:mobile-metric
```

Isso facilita integração futura com observabilidade, analytics ou envio para uma rota própria de monitoramento.

## Métricas monitoradas

As métricas abaixo são capturadas de forma contínua:

- `ttfb`
- `domContentLoaded`
- `load`
- `fcp`
- `lcp`
- `cls`
- `longTaskCount`
- `resourceCount`

## Metas recomendadas

| Métrica | Boa | Alerta |
| --- | --- | --- |
| `ttfb` | até 800ms | acima de 1800ms |
| `domContentLoaded` | até 1800ms | acima de 3200ms |
| `load` | até 2500ms | acima de 4500ms |
| `fcp` | até 1800ms | acima de 3000ms |
| `lcp` | até 2500ms | acima de 4000ms |
| `cls` | até 0.10 | acima de 0.25 |
| `longTaskCount` | até 2 | acima de 6 |
| `resourceCount` | até 60 | acima de 120 |

## Ajustes de UX mobile aplicados

- cabeçalho responsivo com melhor distribuição em telas pequenas;
- navegação inferior carregada sob demanda;
- aumento da área mínima de toque para botões, inputs e links;
- overlay e dropdown do usuário adaptados para uso touch;
- conversão de listas críticas para cards nativos no mobile;
- manutenção de tabelas apenas no desktop, preservando densidade informacional;
- fallback com scroll horizontal seguro para tabelas desktop em larguras intermediárias;
- redução de blur e animações quando há economia de dados ou rede lenta;
- espaçamento inferior automático para evitar conflito com a navegação mobile e safe area.

## Segunda fase

Na segunda fase, as áreas de maior uso deixaram de depender da leitura de tabelas em celular e passaram a renderizar cards nativos:

- `app/students/page.tsx`
- `app/evaluations/new/page.tsx`
- `app/history/page.tsx`

Para QA sem autenticação, foi adicionada a rota:

```text
/mobile-preview
```

Essa rota permite validar visualmente a alternância entre:

- cards mobile;
- tabela desktop;
- tamanho de alvos touch;
- visibilidade responsiva controlada por CSS.

## Testes automatizados

Os testes estão em:

```text
tests/mobile-experience.spec.ts
```

Perfis cobertos:

- iPhone 13 com WebKit
- Pixel 7 com Chromium
- Galaxy S9+ com Chromium

### Execução

```bash
npm run test:mobile
```

### Execução contra ambiente já publicado

```bash
$env:PLAYWRIGHT_BASE_URL="https://seu-dominio.vercel.app"
npm run test:mobile
```

## Operação contínua

Para acompanhamento contínuo, recomenda-se:

1. rodar `npm run test:mobile` no CI a cada pull request;
2. inspecionar a chave `leitura-mobile-performance` em sessões reais de QA;
3. enviar o evento `leitura:mobile-metric` para um backend de observabilidade;
4. comparar tendências por dispositivo e conexão antes de novas releases.
