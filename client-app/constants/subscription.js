// Plus プラン / フリープランの定数。
// useFeatureGate.js と supabaseData.js の両方から参照するため
// 循環依存を避けるために独立ファイルに切り出している。

/** フリープランの上限（表示・ゲートで共有） */
export const FREE_LIMITS = {
    monthlyPostCount: 10,
    storageBytes: 200 * 1024 * 1024, // 200MB（参考値、バックエンド側でも別途制限予定）
    /** フリープランで作成できるカスタムカテゴリー数（「すべて」相当の仮想カテゴリーは含まない） */
    maxCustomCategories: 3,
};
