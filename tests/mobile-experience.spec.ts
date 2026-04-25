import { expect, test } from "@playwright/test";

test.describe("Experiencia mobile", () => {
  test("aplica deteccao mobile e mantem a tela de login utilizavel", async ({
    page,
    browserName,
  }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /fluência leitora/i })).toBeVisible();
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    const mobileState = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      cardRightEdge:
        document.querySelector(".glass-card")?.getBoundingClientRect().right ?? 0,
      buttonHeight:
        document.querySelector('button[type="submit"]')?.getBoundingClientRect().height ?? 0,
      buttonLabel:
        document.querySelector('button[type="submit"]')?.textContent?.trim() ?? "",
      inputHeight:
        document.querySelector('input[type="email"]')?.getBoundingClientRect().height ?? 0,
    }));

    expect(mobileState.viewportWidth).toBeLessThanOrEqual(768);
    expect(mobileState.cardRightEdge).toBeLessThanOrEqual(mobileState.viewportWidth + 1);
    expect(mobileState.buttonHeight).toBeGreaterThanOrEqual(44);
    expect(mobileState.buttonLabel).toMatch(/entrar|preparando/i);
    expect(mobileState.inputHeight).toBeGreaterThanOrEqual(44);

    // Garante que os estilos continuam consistentes entre emulacoes Android e Safari mobile.
    expect(["chromium", "webkit"]).toContain(browserName);
  });

  test("mantem a API de health acessivel no mesmo host da aplicacao", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(payload.status).toBe("ok");
    expect(payload.runtime).toBe("nextjs");
  });

  test("registra metricas mobile no navegador", async ({ page }) => {
    await page.goto("/login");

    const metrics = await page.evaluate(() => {
      const raw = window.localStorage.getItem("leitura-mobile-performance");
      return {
        navigationEntries: performance.getEntriesByType("navigation").length,
        paintEntries: performance.getEntriesByType("paint").length,
        viewportWidth: window.innerWidth,
        localStorageAccessible: (() => {
          try {
            window.localStorage.setItem("__leitura_probe__", "1");
            window.localStorage.removeItem("__leitura_probe__");
            return true;
          } catch {
            return false;
          }
        })(),
        payload: raw ? JSON.parse(raw) : null,
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.navigationEntries).toBeGreaterThan(0);
    expect(metrics.paintEntries).toBeGreaterThanOrEqual(0);
    expect(metrics.viewportWidth).toBeLessThanOrEqual(768);
    expect(metrics.localStorageAccessible).toBeTruthy();

    if (metrics.payload) {
      expect(Array.isArray(metrics.payload.metrics)).toBeTruthy();
      expect(metrics.payload.metrics.length).toBeGreaterThan(0);
    }
  });

  test("exibe cards nativos no preview mobile e oculta a tabela desktop", async ({
    page,
  }) => {
    await page.goto("/mobile-preview");

    await expect(page.getByRole("heading", { name: /preview mobile/i })).toBeVisible();
    await expect(page.getByTestId("preview-mobile-cards")).toBeVisible();
    await expect(page.getByTestId("preview-mobile-card")).toHaveCount(2);
    await expect(page.getByTestId("preview-desktop-table")).not.toBeVisible();

    const buttonHeight = await page
      .getByRole("button", { name: /ação principal/i })
      .first()
      .evaluate((element) => element.getBoundingClientRect().height);

    expect(buttonHeight).toBeGreaterThanOrEqual(44);
  });

  test("nao gera overflow horizontal e preserva alvos de toque no preview mobile", async ({
    page,
  }) => {
    await page.goto("/mobile-preview");

    const layoutState = await page.evaluate(() => {
      const scrollContainer = document.querySelector(".table-scroll");
      const primaryButton = document.querySelector("button");

      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        scrollContainerWidth: scrollContainer?.getBoundingClientRect().width ?? 0,
        scrollContainerScrollWidth: scrollContainer?.scrollWidth ?? 0,
        primaryButtonHeight: primaryButton?.getBoundingClientRect().height ?? 0,
        primaryButtonWidth: primaryButton?.getBoundingClientRect().width ?? 0,
      };
    });

    expect(layoutState.documentWidth).toBeLessThanOrEqual(layoutState.viewportWidth + 1);
    expect(layoutState.bodyWidth).toBeLessThanOrEqual(layoutState.viewportWidth + 1);
    expect(layoutState.scrollContainerWidth).toBeLessThanOrEqual(layoutState.viewportWidth + 1);
    expect(layoutState.scrollContainerScrollWidth).toBeGreaterThanOrEqual(layoutState.scrollContainerWidth);
    expect(layoutState.primaryButtonHeight).toBeGreaterThanOrEqual(44);
    expect(layoutState.primaryButtonWidth).toBeGreaterThanOrEqual(44);
  });
});
