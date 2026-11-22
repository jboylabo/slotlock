# 仕様書

これまでの流れ（テキスト・数字・時間のみ、テーブル少なめ、行ロックの挙動が明確）とご指定の技術スタックを踏まえ、そのまま実装に入れるレベルの**基本設計・仕様書**をまとめました。

題材は、これまでの「チケット管理」「経費管理」と重ならず、時間（開始・終了）と行ロック（ダブルブッキング防止）の挙動が最も直感的にわかる「会議室・ワークスペースの時間枠予約システム」を採用しています。

---

# 会議室・ワークスペース予約システム 仕様書

## 1. プロジェクト概要

複数のユーザーが同時に同じ会議室の同じ時間帯を予約しようとした際、PostgreSQLの行ロック（`SELECT ... FOR UPDATE`）を用いて**ダブルブッキング（重複予約）を確実に防止する**Webアプリケーション。

### 技術スタック

| 領域 | 技術選定 | 備考 |
| --- | --- | --- |
| パッケージ管理 | **pnpm** | モノレポ構成（`apps/api`, `apps/web`）を推奨 |
| バックエンド | **Fastify** (TypeScript) | レイヤード（またはオニオン）アーキテクチャ構成 |
| データベース | **PostgreSQL v17** | Docker Compose等でローカル起動 |
| ORM | **Drizzle ORM** (`drizzle-kit`) | トランザクション内の `.for('update')` を使用 |
| 認証 | **Better Auth** | セッション認証（またはJWTプラグイン連携） |
| フロントエンド | **React** (Vite + TypeScript + Mantine) | 予約一覧・予約作成フォーム・検証用連打ボタン |

---

## 2. 機能要件

### 2.1 認証機能（Better Auth）

* メールアドレス＋パスワードによるサインアップ・ログイン・ログアウト。
* ログイン済みユーザーのみ、会議室の予約作成・自分の予約キャンセルが可能。

### 2.2 会議室・予約機能

1. **会議室一覧表示 (`GET /api/rooms`)**
* 登録済みの会議室一覧（ID、部屋名、定員、1時間あたりの利用ポイント/料金など）を取得する。


2. **予約一覧表示 (`GET /api/reservations`)**
* 指定日または全期間の予約一覧（部屋ID、予約者、タイトル、開始時刻、終了時刻、ステータス）を取得する。


3. **時間枠予約の作成 (`POST /api/reservations`) — 行ロックのコア機能**
* ユーザーは「部屋」「利用タイトル」「開始時刻」「終了時刻」を指定して予約する。
* **バリデーション：** `startAt < endAt` であること、過去の時刻でないこと。
* **排他制御（行ロック）：** 対象となる `rooms` テーブルの該当行を `FOR UPDATE` でロックした上で、同一部屋・重複時間帯の有効な予約が存在しないかチェックし、空きがあれば `reservations` に `INSERT` する。


4. **予約のキャンセル (`DELETE /api/reservations/:id` または `PATCH`)**
* 自分が作成した予約のみキャンセル（ステータスを `cancelled` に変更、または削除）できる。



---

## 3. データベース設計（テーブル定義）

Better Auth が自動生成する認証用テーブル（`user`, `session`, `account`, `verification`）に加え、アプリ固有のテーブルは**2つだけ**に絞ります。

### 3.1 `rooms`（会議室マスタ）

*親レコードとして行ロックの対象にするテーブル*

| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| `id` | `serial` / `uuid` | PK | 会議室ID |
| `name` | `text` | NOT NULL | 会議室名（例: "Room A", "Focus Booth 1"） |
| `capacity` | `integer` | NOT NULL | 収容人数（数字） |
| `created_at` | `timestamp` | NOT NULL, DEFAULT NOW() | 作成日時 |

### 3.2 `reservations`（予約履歴）

*テキスト・数字・時間のみで構成されるトランザクションデータ*

| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| `id` | `serial` / `uuid` | PK | 予約ID |
| `room_id` | `integer` / `uuid` | FK (`rooms.id`), NOT NULL | 対象会議室ID |
| `user_id` | `text` | FK (`user.id`), NOT NULL | 予約ユーザーID（Better Authの `user.id`） |
| `title` | `text` | NOT NULL | 予約用途・メモ（テキスト） |
| `attendees` | `integer` | NOT NULL | 利用人数（数字） |
| `start_at` | `timestamptz` | NOT NULL | 開始日時（時間） |
| `end_at` | `timestamptz` | NOT NULL | 終了日時（時間） |
| `status` | `text` | NOT NULL, DEFAULT `'confirmed'` | `'confirmed'` | `'cancelled'` |
| `created_at` | `timestamp` | NOT NULL, DEFAULT NOW() | 作成日時 |

---

## 4. コアロジック：行ロック（`FOR UPDATE`）の設計

新規予約の `INSERT` にはまだ行が存在しないため、**親である `rooms` の対象1行を `FOR UPDATE` でロックする**のがポイントです。これにより、同じ部屋に対する同時予約リクエストを直列化できます（別の部屋の予約はブロックしません）。

### 処理フロー（1トランザクション内）

1. `BEGIN`（Drizzleの `db.transaction(async (tx) => { ... })` を開始）
2. **対象部屋の行ロック取得：**
```sql
SELECT id, capacity FROM rooms WHERE id = $roomId FOR UPDATE;

```


※ Drizzleでは `tx.select().from(rooms).where(eq(rooms.id, roomId)).for('update')` のように記述。
3. **定員チェック：** `attendees <= room.capacity` を確認。
4. **時間帯の重複チェック：**
同一 `room_id` かつ `status = 'confirmed'` で、以下の条件を満たす既存予約が 0 件であることを確認する。

$$\text{existing.start\_at} < \text{new.end\_at} \quad \text{AND} \quad \text{existing.end\_at} > \text{new.start\_at}$$


5. **予約登録：**
重複がなければ `reservations` に `INSERT` する。重複があればエラー（HTTP `409 Conflict`）を投げてロールバック。
6. `COMMIT`（ここでロックが解放され、待機していた2番目のリクエストがステップ2から再開し、ステップ4の重複チェックで弾かれる）。

> **検証用の仕掛け（任意）：** ユースケース内に `await sleep(2000)`（2秒待機）を入れられるフラグや環境変数を用意すると、ロック中にもう一方のリクエストが待たされる挙動や、ロックを外したときにダブルブッキングが起きる様子を簡単に観察できます。

---

## 5. API エンドポイント仕様

| メソッド | パス | 認証 | 概要 | 主なレスポンス |
| --- | --- | --- | --- | --- |
| `ALL` | `/api/auth/*` | 不要 | Better Auth 標準エンドポイント（ログイン/登録等） | Better Auth準拠 |
| `GET` | `/api/rooms` | 必要 | 会議室一覧の取得 | `200 OK` (`Room[]`) |
| `GET` | `/api/reservations` | 必要 | 予約一覧の取得（クエリ: `?roomId=...`） | `200 OK` (`Reservation[]`) |
| `POST` | `/api/reservations` | 必要 | 時間枠予約の作成（行ロック実行） | `201 Created` / `409 Conflict`（重複時） |
| `PATCH` | `/api/reservations/:id/cancel` | 必要 | 自分の予約のキャンセル | `200 OK` / `403 Forbidden` |

---

## 6. アーキテクチャ・ディレクトリ構成案（pnpm モノレポ）

オニオン / レイヤードの境界を意識し、Fastify や Drizzle の型がドメイン・ユースケース層に漏れ出さない構成にします。

```text
room-booking/
├── pnpm-workspace.yaml
├── docker-compose.yml          # PostgreSQL 起動用
├── apps/
│   ├── api/                    # Fastify バックエンド
│   │   └── src/
│   │       ├── domain/         # エンティティ型定義・時間重複判定の純粋ロジック
│   │       ├── usecase/        # CreateReservationUseCase など（トランザクション境界）
│   │       ├── infrastructure/ # Drizzleスキーマ、DB接続、Repository実装、Better Auth設定
│   │       └── presentation/   # Fastifyルート、認証フック(onRequest)、リクエスト検証
│   └── web/                    # React (Vite) フロントエンド
│       └── src/
│           ├── components/     # 予約フォーム、予約タイムライン/一覧、ログイン画面
│           └── lib/            # Better Authクライアント、APIフェッチャー

```

---

## 7. 画面仕様（React UI）

最小限の1〜2画面で構成します。

1. **ログイン / 新規登録画面**
* メールアドレス・パスワード入力フォーム（Better Auth クライアント経由）。


2. **予約ダッシュボード画面**
* **会議室選択タブ / セレクトボックス**
* **予約作成フォーム：** タイトル（テキスト）、人数（数字）、開始時刻・終了時刻（時間）を入力して「予約する」ボタン。
* **予約一覧テーブル：** 現在の確定済み予約一覧と、自分の予約に対する「キャンセル」ボタン。
* **【検証用】同時リクエストテストボタン：** 「同じ時間帯で2件同時に予約APIを叩く」ボタンを1つ置いておくと、片方が `201 Created`、もう片方が `409 Conflict` になる挙動をブラウザ上からワンクリックでテストできます。



---

## 8. 開発の進め方（マイルストーン）

1. **Step 1（基盤・DB）：** `pnpm` ワークスペース作成、DockerでPostgreSQL起動、Drizzleで `rooms` / `reservations` マイグレーション＆シードデータ投入。
2. **Step 2（認証・API骨格）：** Fastify に Better Auth を組み込み、認証済みユーザーIDを取得できる状態にする。
3. **Step 3（行ロック実装・検証）：** `POST /api/reservations` の `FOR UPDATE` トランザクションを実装し、`Promise.all` で並列リクエストを投げて競合が防げることを確認。
4. **Step 4（React UI）：** Vite + React で画面を作成し、一連の予約・キャンセル・同時送信テストを操作できるようにする。

---

この仕様をベースに、「まずは Drizzle のスキーマと `FOR UPDATE` のリポジトリ実装コードから書く」「モノレポの初期セットアップ手順から始める」など、次に進めたい箇所があればそのままコードを作成します！