import { expect, test } from "@playwright/test";

test.describe("Experiencia mobile", () => {
  test("aplica deteccao mobile e mantem a tela de login utilizavel", async ({
    page,
    browserName,
  }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /fluência leitora/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();

    const mobileState = await page.evaluate(() => ({
      dataset: {
        mobile: document.documentElement.dataset.mobile,
        touch: document.documentElement.dataset.touch,
      },
      viewportWidth: window.innerWidth,
      cardRightEdge:
        document.querySelector(".glass-card")?.getBoundingClientRect().right ?? 0,
      buttonHeight:
        document.querySelector('button[type="submit"]')?.getBoundingClientRect().height ?? 0,
      inputHeight:
        document.querySelector('input[type="email"]')?.getBoundingClientRect().height ?? 0,
    }));

    expect(mobileState.dataset.mobile).toBe("true");
    expect(mobileState.dataset.touch).toBe("true");
    expect(mobileState.viewportWidth).toBeLessThanOrEqual(768);
    expect(mobileState.cardRightEdge).toBeLessThanOrEqual(mobileState.viewportWidth + 1);
    expect(mobileState.buttonHeight).toBeGreaterThanOrEqual(44);
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

    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem("leitura-mobile-performance");
      return Boolean(raw);
    });

    const metrics = await page.evaluate(() => {
      const raw = window.localStorage.getItem("leitura-mobile-performance");
      return raw ? JSON.parse(raw) : null;
    });

    expect(metrics).not.toBeNull();
    expect(Array.isArray(metrics.metrics)).toBeTruthy();
    expect(metrics.metrics.length).toBeGreaterThan(0);
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
});
