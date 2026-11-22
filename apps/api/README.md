# @slotlock/api

会議室予約システムのバックエンド (Fastify + Drizzle ORM + PostgreSQL + Better Auth)。

## セットアップ

```sh
pnpm install
cp .env.example ../.env # ルートの .env.example を apps/api/.env としてコピー
docker compose up -d    # PostgreSQL 17 を起動
pnpm db:migrate         # マイグレーション適用
pnpm db:seed            # 会議室のシードデータ投入
pnpm dev                # http://localhost:3000 で起動
```

実際には `apps/api/.env` を作成してください(`.env.example` をコピーし `BETTER_AUTH_SECRET` をランダムな値に変更)。

## API

| メソッド | パス | 概要 |
| --- | --- | --- |
| `ALL` | `/api/auth/*` | Better Auth (メール+パスワード認証) |
| `GET` | `/api/rooms` | 会議室一覧 |
| `GET` | `/api/reservations` | 予約一覧 (`?roomId=`, `?date=YYYY-MM-DD`) |
| `POST` | `/api/reservations` | 予約作成。`rooms` 行を `FOR UPDATE` でロックし、重複時は `409` |
| `PATCH` | `/api/reservations/:id/cancel` | 自分の予約をキャンセル |

## ダブルブッキング防止

`POST /api/reservations` は `db.transaction` 内で対象 `rooms` 行を
`SELECT ... FOR UPDATE` でロックしてから、同一部屋・`confirmed`・時間帯が重なり合う予約
(`existing.start_at < new.end_at AND existing.end_at > new.start_at`)の有無を検査します。
同じ部屋への同時予約は直列化され、2件目は `409 Conflict` を返します。

検証用に `RESERVATION_LOCK_SLEEP_MS` を設定すると、ロック保持中に
指定ミリ秒スリープし、直列化の挙動を観察できます。

## ディレクトリ構成

```text
src/
├── domain/          # エンティティ型・時間重複判定・DomainError
├── usecase/         # CreateReservationUseCase / CancelReservationUseCase
├── infrastructure/  # Drizzleスキーマ・DB接続・Repository・Better Auth
└── presentation/    # Fastifyルート・認証フック
```
