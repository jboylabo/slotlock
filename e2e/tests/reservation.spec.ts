import { expect, test } from "@playwright/test";

const uniqueEmail = () => `e2e-${Date.now()}@example.com`;

const tomorrow = (h: number) => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
};

async function signUp(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("tab", { name: "新規登録" }).click();
  await page.getByLabel("名前").fill("E2E User");
  await page.getByLabel("メールアドレス").fill(uniqueEmail());
  await page.getByLabel("パスワード").fill("password1234");
  await page.getByRole("button", { name: "登録" }).click();
  await expect(page.getByRole("heading", { name: "予約ダッシュボード" })).toBeVisible();
}

async function fillReservationForm(
  page: import("@playwright/test").Page,
  opts: { title: string; attendees: string; startAt: string; endAt: string },
) {
  await page.getByRole("textbox", { name: "会議室" }).click();
  await page.getByRole("option").first().click();
  await page.getByLabel("タイトル").fill(opts.title);
  await page.getByLabel("人数").fill(opts.attendees);
  await page.getByLabel("開始").fill(opts.startAt);
  await page.getByLabel("終了").fill(opts.endAt);
}

test("signup → create reservation → listed as confirmed", async ({ page }) => {
  await signUp(page);
  await fillReservationForm(page, {
    title: "E2E 予約",
    attendees: "3",
    startAt: tomorrow(10),
    endAt: tomorrow(11),
  });
  await page.getByRole("button", { name: "予約する" }).click();
  const row = page.getByRole("row", { name: /E2E 予約/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("confirmed")).toBeVisible();
});

test("concurrent test button shows 201 + 409", async ({ page }) => {
  await signUp(page);
  await fillReservationForm(page, {
    title: "競合テスト",
    attendees: "2",
    startAt: tomorrow(13),
    endAt: tomorrow(14),
  });
  await page.getByRole("button", { name: "同時送信テスト" }).click();
  const result = page.getByText("同時送信結果:");
  await expect(result).toBeVisible();
  await expect(result).toContainText("201");
  await expect(result).toContainText("409");
});

test("past start time is rejected", async ({ page }) => {
  await signUp(page);
  await fillReservationForm(page, {
    title: "過去予約",
    attendees: "1",
    startAt: "2020-01-01T10:00",
    endAt: "2020-01-01T11:00",
  });
  await page.getByRole("button", { name: "予約する" }).click();
  await expect(page.getByText(/予約失敗/)).toBeVisible();
});

test("own reservation can be cancelled", async ({ page }) => {
  await signUp(page);
  await fillReservationForm(page, {
    title: "キャンセル対象",
    attendees: "1",
    startAt: tomorrow(16),
    endAt: tomorrow(17),
  });
  await page.getByRole("button", { name: "予約する" }).click();
  const row = page.getByRole("row", { name: /キャンセル対象/ });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "キャンセル" }).click();
  await expect(row.getByText("cancelled")).toBeVisible();
});
