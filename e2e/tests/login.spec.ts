import { expect, test, type Page } from "@playwright/test";

const password = "password1234";

function uniqueEmail() {
  return `login-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signUp(page: Page, email: string) {
  await page.goto("/");
  await page.getByRole("tab", { name: "新規登録" }).click();
  await page.getByLabel("名前").fill("Login E2E User");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "登録" }).click();
  await expect(page.getByRole("heading", { name: "予約ダッシュボード" })).toBeVisible();
}

async function logOut(page: Page) {
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page.getByRole("tab", { name: "ログイン" })).toBeVisible();
}

async function logIn(page: Page, email: string, loginPassword = password) {
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(loginPassword);
  await page.getByRole("button", { name: "ログイン" }).click();
}

test("registered user can log in with email and password", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await logOut(page);

  await logIn(page, email);

  await expect(page.getByRole("heading", { name: "予約ダッシュボード" })).toBeVisible();
  await expect(page.getByText("Login E2E User")).toBeVisible();
});

test("login fails with an incorrect password", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await logOut(page);

  await logIn(page, email, "wrong-password");

  await expect(page.getByText("認証エラー")).toBeVisible();
  await expect(page.getByRole("tab", { name: "ログイン" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "予約ダッシュボード" })).not.toBeVisible();
});

test("authenticated session survives a page reload", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);

  await page.reload();

  await expect(page.getByRole("heading", { name: "予約ダッシュボード" })).toBeVisible();
  await expect(page.getByText("Login E2E User")).toBeVisible();
});
