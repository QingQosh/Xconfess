import { expect, test } from "@playwright/test";

test.describe("RTL layout and component playground", () => {
  test("Arabic locale sets RTL and preserves login keyboard order", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("xconfess-locale", "ar");
    });
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ code: "INVALID_SESSION", message: "Not signed in" }),
      });
    });

    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const email = page.getByLabel("البريد الإلكتروني");
    const password = page.getByLabel("كلمة المرور");
    const forgotPassword = page.getByRole("link", {
      name: "هل نسيت كلمة المرور؟",
    });
    const submit = page.getByRole("button", { name: "تسجيل الدخول" });

    await email.focus();
    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(forgotPassword).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(submit).toBeFocused();
  });

  test("the isolated catalog exposes loading, empty, error, disabled, and bidi states", async ({
    page,
  }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ code: "INVALID_SESSION", message: "Not signed in" }),
      });
    });
    await page.goto("/dev/components");

    await expect(
      page.getByRole("heading", { name: "Component playground" }),
    ).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading preview" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Empty preview" })).toContainText(
      "No confessions yet",
    );
    await expect(page.getByRole("alert")).toContainText("intentionally offline");
    await expect(page.getByLabel("Email address")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await expect(page.locator("bdi[dir=auto]")).toHaveText("مرحبا — hello @world");

    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText("Local retry count: 1")).toBeVisible();
  });
});
