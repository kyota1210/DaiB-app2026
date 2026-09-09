#!/usr/bin/env bash
#
# 画像配信の検証。同じオブジェクトを 2 回取得して
#
#   - cf-cache-status が 2 回目に HIT になるか（エッジキャッシュが効いているか）
#   - Cache-Control が 1 年 immutable になっているか
#   - 転送サイズが想定どおりか（表示用 / サムネイル）
#
# を確認する。
#
# 使い方:
#   scripts/verify-image-cdn.sh <bucket> <objectKey>
#
# 例（CDN 経由）:
#   IMAGE_BASE=https://cdn.example.com \
#     scripts/verify-image-cdn.sh daib-prod-post-images "u1/42/1700000000000.jpg"
#
# 例（Supabase 直。CDN 導入前のベースライン取得用）:
#   IMAGE_BASE=https://giknxvsaovkahsonqyqd.supabase.co \
#     scripts/verify-image-cdn.sh daib-prod-post-images "u1/42/1700000000000.jpg"
#
set -uo pipefail

BUCKET="${1:-}"
KEY="${2:-}"
BASE="${IMAGE_BASE:-}"

if [ -z "$BASE" ] || [ -z "$BUCKET" ] || [ -z "$KEY" ]; then
    echo "使い方: IMAGE_BASE=https://cdn.example.com $0 <bucket> <objectKey>" >&2
    exit 2
fi

BASE="${BASE%/}"
main_url="$BASE/storage/v1/object/public/$BUCKET/$KEY"
thumb_url="$BASE/storage/v1/object/public/$BUCKET/${KEY%.*}_thumb.${KEY##*.}"

probe() {
    local label="$1" url="$2" pass="$3"
    local headers
    headers=$(curl -sS --compressed -o /dev/null -D - "$url" 2>&1)
    local status cache_status cache_control length
    status=$(printf '%s' "$headers" | awk 'toupper($1) ~ /^HTTP/ { code=$2 } END { print code }')
    cache_status=$(printf '%s' "$headers" | awk -F': ' 'tolower($1)=="cf-cache-status" { gsub(/\r/,"",$2); print $2 }' | tail -1)
    cache_control=$(printf '%s' "$headers" | awk -F': ' 'tolower($1)=="cache-control" { gsub(/\r/,"",$2); print $2 }' | tail -1)
    length=$(printf '%s' "$headers" | awk -F': ' 'tolower($1)=="content-length" { gsub(/\r/,"",$2); print $2 }' | tail -1)

    printf '%-22s %-4s pass=%s  cf-cache-status=%-8s size=%-10s cache-control=%s\n' \
        "$label" "${status:-???}" "$pass" "${cache_status:-none}" "${length:-?}" "${cache_control:-none}"
}

echo "配信元: $BASE"
echo ""
echo "--- 表示用（長辺 1440px を想定） ---"
probe "main" "$main_url" 1
probe "main" "$main_url" 2
echo ""
echo "--- サムネイル（長辺 480px を想定。404 ならバックフィル未実施） ---"
probe "thumb" "$thumb_url" 1
probe "thumb" "$thumb_url" 2
echo ""
cat <<'NOTE'
判定の目安:
  - cf-cache-status が 2 回目で HIT   -> エッジキャッシュが効いている（Supabase の egress を消費しない）
  - cf-cache-status が none / 毎回 MISS -> CDN を経由していない。EXPO_PUBLIC_IMAGE_CDN_URL と Worker のルートを確認
  - cache-control が max-age=31536000, immutable -> 端末側の 1 年キャッシュが有効（daib-image-proxy の想定）
  - cache-control が max-age=2592000 -> 旧プロキシ（30日）が動いている。cloudflare/image-cdn-worker を wrangler deploy して差し替える
  - cache-control が max-age=3600 -> Supabase のデフォルト。CDN を経由していないか Worker が上書きしていない
  - /rest/v1 などが通る -> 公開ストレージ専用の Worker ではない。デプロイ済みスクリプトを確認
  - main が 1MB を大きく超える -> バックフィル未実施の原画像
NOTE
