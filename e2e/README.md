# E2E テスト (Playwright)

Playwright **コマンド(CLI)** で実行します(MCPサーバーではありません)。

## 前提

1. `docker compose up -d` — PostgreSQL 17 (host port 5433)
2. `apps/api/.env` 作成(`.env.example` をコピーし `BETTER_AUTH_SECRET` を設定)
3. `cd apps/api && pnpm db:migrate && pnpm db:seed`

API (`:3000`) と web (`:5173`) は Playwright の `webServer` が自動起動します
(既に起動中なら再利用されます)。

## 実行

```sh
cd e2e
pnpm install
pnpm exec playwright install chromium   # 初回のみ(ブラウザバイナリ取得)
pnpm test                               # 全テスト(headless)
pnpm test:headed                        # ブラウザ表示あり
pnpm exec playwright test --ui          # UIモード
pnpm report                             # HTMLレポートを表示
```

## テスト内容 (`tests/reservation.spec.ts`)

| テスト | 確認 |
| --- | --- |
| signup → create → confirmed | 新規登録→予約作成→一覧に confirmed 表示 |
| 同時送信テスト | 2件並列で 201 + 409(行ロックによるダブルブッキング防止) |
| 過去時刻 | startAt が過去 → 予約失敗トースト |
| キャンセル | 自分の予約 → cancelled へ遷移 |

各テストは一意のメールアドレスでサインアップするため再実行可能です。
