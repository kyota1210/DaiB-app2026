# CI / CD ガイド（GitHub Actions）

最終更新日: 2026-04-26

`.github/workflows/` 配下に 3 つのワークフロー。

| ワークフロー | トリガ | 内容 |
|---|---|---|
| `lint.yml` | PR / main push（client-app/**） | ESLint。MVP 期は warn を許容。 |
| `supabase-migrations.yml` | PR / main push / tag（supabase/**） | local supabase で migration 検証 → main で staging 反映 → tag で prod 反映（手動承認） |
| `eas-build.yml` | main push（client-app/**） / tag push (v*) / 手動 | EAS preview ビルド（main） / production ビルド + Submit（tag） |

---

## 1. 必要な GitHub Secrets

リポジトリの **Settings → Secrets and variables → Actions** に登録する。

### 1.1 Repository secrets

| 名前 | 用途 |
|---|---|
| `EXPO_TOKEN` | EAS CLI 認証用。Expo Web → Settings → Access Tokens で発行 |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI 認証用。Supabase Web → Settings → Access Tokens で発行 |

### 1.2 Environment: `supabase-staging`

| 名前 | 用途 |
|---|---|
| `SUPABASE_STAGING_PROJECT_REF` | `<project>.supabase.co` の `<project>` 部分 |
| `SUPABASE_STAGING_DB_PASSWORD` | staging DB のパスワード |

### 1.3 Environment: `supabase-prod`

> **Required reviewers** を 1 人以上設定し、prod 反映は必ず手動承認させる。

| 名前 | 用途 |
|---|---|
| `SUPABASE_PROD_PROJECT_REF` | 同上（prod） |
| `SUPABASE_PROD_DB_PASSWORD` | prod DB のパスワード |

---

## 2. リリースフロー

```
feature ブランチ
   ↓ PR (lint / supabase migrations dry-run)
main にマージ
   ↓ Auto: supabase staging に migration 反映
   ↓ Auto: EAS preview ビルド（TestFlight 配布は workflow_dispatch で）
動作確認 (TestFlight)
   ↓ git tag v1.0.0 && git push --tags
   ↓ Auto (要手動承認): supabase prod に migration 反映
   ↓ Auto: EAS production ビルド + App Store Connect 提出
App Store Review → 公開
```

### 手動 TestFlight 配信

```
gh workflow run eas-build.yml -f profile=preview -f submit=true
```

または GitHub Web の Actions タブ → "EAS Build & Submit" → "Run workflow"。

---

## 3. lint の段階的厳格化

`client-app/eslint.config.js` の rules を強化していき、`lint.yml` の `continue-on-error: true` を外す。
1. 未使用 import を排除
2. `no-unused-vars` を error に
3. JSX の key 警告を解消
4. アクセシビリティ（`accessibilityLabel`）を必須に
