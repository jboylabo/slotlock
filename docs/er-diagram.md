# ER 図

`apps/api/src/infrastructure/db/schema.ts` と `apps/api/drizzle/` のマイグレーションに基づく DB 構造です。
スキーマを変更したらこの図も合わせて更新してください。

```mermaid
erDiagram
    user ||--o{ session : "has (cascade)"
    user ||--o{ account : "has (cascade)"
    user ||--o{ reservations : "books (cascade)"
    rooms ||--o{ reservations : "has"

    user {
        text id PK
        text name
        text email UK
        boolean email_verified "default false"
        text image "nullable"
        timestamp created_at "default now()"
        timestamp updated_at "default now()"
    }

    session {
        text id PK
        timestamptz expires_at
        text token UK
        text ip_address "nullable"
        text user_agent "nullable"
        text user_id FK
        timestamp created_at "default now()"
        timestamp updated_at "default now()"
    }

    account {
        text id PK
        text account_id
        text provider_id
        text user_id FK
        text access_token "nullable"
        text refresh_token "nullable"
        text id_token "nullable"
        timestamptz access_token_expires_at "nullable"
        timestamptz refresh_token_expires_at "nullable"
        text scope "nullable"
        text password "nullable"
        timestamp created_at "default now()"
        timestamp updated_at "default now()"
    }

    verification {
        text id PK
        text identifier
        text value
        timestamptz expires_at
        timestamp created_at "default now()"
        timestamp updated_at "default now()"
    }

    rooms {
        serial id PK
        text name
        integer capacity
        timestamp created_at "default now()"
    }

    reservations {
        serial id PK
        integer room_id FK
        text user_id FK
        text title
        integer attendees
        timestamptz start_at
        timestamptz end_at
        text status "confirmed | cancelled, default confirmed"
        timestamp created_at "default now()"
    }
```

- 注記のないカラムはすべて `NOT NULL`
- `timestamptz` は `timestamp with time zone`、`timestamp` はタイムゾーンなし
- `verification` は他テーブルへの FK を持たない（Better Auth のメール検証などで使用）

## 外部キー

| FK | 参照先 | ON DELETE |
| --- | --- | --- |
| `session.user_id` | `user.id` | `CASCADE` |
| `account.user_id` | `user.id` | `CASCADE` |
| `reservations.user_id` | `user.id` | `CASCADE` |
| `reservations.room_id` | `rooms.id` | `NO ACTION`（予約が残っている会議室は削除不可） |

## ユニーク制約・インデックス

| 名前 | テーブル | カラム |
| --- | --- | --- |
| `user_email_unique` | `user` | `email` |
| `session_token_unique` | `session` | `token` |
| `reservations_room_time_idx` | `reservations` | `room_id, start_at, end_at`（btree。重複チェック用） |
