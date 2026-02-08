# 画面一覧・遷移

## 画面構成概要

Otiumアプリは、認証状態に応じて2つのナビゲーションスタックに分かれます：

1. **AuthStack**: 未認証時の画面群（ログイン・サインアップ）
2. **MainStack**: 認証済み時の画面群（メイン機能）

認証済み時は、さらにタブナビゲーションとスタックナビゲーションが組み合わされています。

## 画面一覧

### 認証前の画面（AuthStack）

#### 1. LoginScreen（ログイン画面）
- **パス**: `/Login`
- **説明**: メールアドレスとパスワードでログインする画面
- **主要要素**:
  - メールアドレス入力フィールド
  - パスワード入力フィールド
  - ログインボタン
  - サインアップ画面へのリンク
- **遷移先**:
  - ログイン成功 → MainTabNavigator（Home）
  - サインアップリンク → SignupScreen

---

#### 2. SignupScreen（サインアップ画面）
- **パス**: `/Signup`
- **説明**: 新規ユーザー登録を行う画面
- **主要要素**:
  - メールアドレス入力フィールド
  - ユーザー名入力フィールド（任意）
  - パスワード入力フィールド
  - 登録ボタン
  - ログイン画面へのリンク
- **遷移先**:
  - 登録成功 → 自動ログイン → MainTabNavigator（Home）
  - ログインリンク → LoginScreen

---

### 認証後の画面（MainStack）

#### タブナビゲーション（MainTabNavigator）

認証済みユーザーは、下部に4つのタブが表示されます：

##### 3. RecordListScreen（ギャラリー画面）
- **タブ名**: Home
- **アイコン**: images / images-outline
- **パス**: `/Main/Home`
- **説明**: 記録をギャラリー形式で一覧表示する画面
- **主要要素**:
  - 記録のグリッド表示（3列）
  - 日付によるグループ化（例: "2024 October"）
  - カテゴリーフィルター
  - 記録作成ボタン（+）
  - 設定画面へのリンク
- **遷移先**:
  - 記録タップ → RecordDetailScreen
  - 作成ボタン → PhotoPickerScreen
  - 設定リンク → ProfileScreen

---

##### 4. PhotoPickerScreen（記録作成画面）
- **タブ名**: Create
- **アイコン**: add-circle / add-circle-outline
- **パス**: `/Main/Create`
- **説明**: 写真を選択して記録を作成する画面
- **主要要素**:
  - カメラロールから画像選択
  - タイトル入力フィールド（任意）
  - 説明入力フィールド（任意）
  - 日付選択（必須）
  - カテゴリー選択（任意）
  - 画像のズーム・位置調整
  - 作成ボタン
- **遷移先**:
  - 作成成功 → RecordListScreen（Home）

---

##### 5. ThreadScreen（スレッド画面）
- **タブ名**: Thread
- **アイコン**: chatbubbles / chatbubbles-outline
- **パス**: `/Main/Thread`
- **説明**: スレッド機能の画面（現状はプレースホルダー）
- **主要要素**:
  - スレッド機能の説明テキスト
- **遷移先**: なし（将来の拡張）

---

##### 6. ProfileScreen（設定画面）
- **タブ名**: MyPage
- **アイコン**: settings / settings-outline
- **パス**: `/Main/MyPage`
- **説明**: ユーザーの設定・プロフィール管理画面
- **主要要素**:
  - ユーザー情報表示（名前、メール、アバター）
  - プロフィール編集リンク
  - ログイン情報リンク
  - プレミアムプランリンク
  - カテゴリー管理リンク
  - テーマ設定リンク
  - 言語設定リンク
  - ログアウトボタン
- **遷移先**:
  - プロフィール編集 → ProfileEditScreen
  - ログイン情報 → LoginInfoScreen
  - プレミアムプラン → PremiumPlanScreen
  - カテゴリー管理 → CategoryManagementScreen
  - テーマ設定 → ThemeSettingScreen
  - 言語設定 → LanguageSettingScreen
  - ログアウト → LoginScreen

---

#### スタックナビゲーション（詳細画面）

##### 7. RecordDetailScreen（記録詳細画面）
- **パス**: `/RecordDetail`
- **説明**: 記録の詳細を表示・編集する画面
- **主要要素**:
  - 記録の写真（ズーム・位置調整可能）
  - タイトル表示・編集
  - 説明表示・編集
  - 日付表示・編集
  - カテゴリー表示・編集
  - 編集ボタン
  - 削除ボタン
  - 前後の記録へのスワイプナビゲーション
- **遷移先**:
  - 編集完了 → この画面に戻る
  - 削除完了 → RecordListScreen
  - 戻る → RecordListScreen

---

##### 8. ProfileEditScreen（プロフィール編集画面）
- **パス**: `/ProfileEdit`
- **説明**: ユーザーのプロフィール情報を編集する画面
- **主要要素**:
  - ユーザー名入力フィールド
  - アバター画像選択・表示
  - 保存ボタン
- **遷移先**:
  - 保存完了 → ProfileScreen
  - 戻る → ProfileScreen

---

##### 10. LoginInfoScreen（ログイン情報画面）
- **パス**: `/LoginInfo`
- **説明**: ログイン情報（メールアドレスなど）を表示する画面
- **主要要素**:
  - メールアドレス表示
  - その他のログイン情報
- **遷移先**:
  - 戻る → ProfileScreen

---

##### 11. PremiumPlanScreen（プレミアムプラン画面）
- **パス**: `/PremiumPlan`
- **説明**: プレミアムプランの情報を表示する画面（現状はプレースホルダー）
- **主要要素**:
  - プレミアムプランの説明
- **遷移先**:
  - 戻る → ProfileScreen

---

##### 12. CategoryManagementScreen（カテゴリー管理画面）
- **パス**: `/CategoryManagement`
- **説明**: カテゴリーの作成・編集・削除を行う画面
- **主要要素**:
  - カテゴリー一覧表示
  - カテゴリー作成ボタン
  - カテゴリー編集機能
  - カテゴリー削除機能
  - カテゴリー画像設定
- **遷移先**:
  - 戻る → ProfileScreen

---

##### 13. ThemeSettingScreen（テーマ設定画面）
- **パス**: `/ThemeSetting`
- **説明**: アプリのテーマ（ライト/ダーク）を設定する画面
- **主要要素**:
  - ライトモード選択
  - ダークモード選択
  - システム設定に従う（将来の拡張）
- **遷移先**:
  - 戻る → ProfileScreen

---

##### 14. LanguageSettingScreen（言語設定画面）
- **パス**: `/LanguageSetting`
- **説明**: アプリの表示言語を設定する画面
- **主要要素**:
  - 日本語選択
  - 英語選択
- **遷移先**:
  - 戻る → ProfileScreen

---

## 画面遷移図

```
┌─────────────────────────────────────────────────────────┐
│                   アプリ起動                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ AuthContext が
                     │ SecureStore から
                     │ トークンを確認
                     │
            ┌────────▼────────┐
            │ トークンあり？   │
            └────┬───────┬─────┘
                 │       │
            No   │       │  Yes
                 │       │
    ┌────────────▼──┐  ┌▼──────────────────────────────┐
    │   AuthStack   │  │      MainTabNavigator          │
    └───────┬───────┘  └┬───────────────────────────────┘
            │           │
            │           │
    ┌───────▼───────┐  ┌▼──────────────────────────────┐
    │ LoginScreen   │  │ RecordListScreen (Home)        │
    │               │  │                                │
    │ ┌───────────┐ │  │ ┌────────────────────────────┐ │
    │ │ Sign Up   │ │  │ │ [+] 作成                  │ │
    │ └─────┬─────┘ │  │ └────────┬─────────────────┘ │
    └───────┼───────┘  └───────────┼────────────────────┘
            │                      │
            │                      │
    ┌───────▼───────┐  ┌──────────▼──────────────────────┐
    │ SignupScreen  │  │ PhotoPickerScreen (Create)      │
    │               │  │                                │
    │ ┌───────────┐ │  │ ┌────────────────────────────┐ │
    │ │ Login     │ │  │ │ 作成                       │ │
    │ └─────┬─────┘ │  │ └────────┬─────────────────┘ │
    └───────┼───────┘  └───────────┼────────────────────┘
            │                      │
            │ サインアップ成功       │ 記録作成成功
            │ →自動ログイン          │
            │                      │
            └──────────────┬───────┘
                           │
                  ┌────────▼────────┐
                  │ RecordListScreen│
                  └────────┬────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        │ 記録タップ        │ 設定リンク        │
        │                  │                  │
┌───────▼────────┐  ┌───▼──────────────┐
│RecordDetail    │  │ ProfileScreen    │
│Screen          │  │ (MyPage)         │
│                │  │                  │
│ ┌───────────┐ │  │ ┌──────────────┐ │
│ │ 編集/削除  │ │  │ │ プロフィール  │ │
│ └─────┬─────┘ │  │ │ カテゴリー    │ │
└───────┼───────┘  │ │ テーマ        │ │
        │          │ │ 言語          │ │
        │ 戻る      │ │ ログアウト    │ │
        │          │ └──────┬───────┘ │
        └──────────┼────────┼─────────┘
                   │        │
    ┌──────────────┼────────┼────────────┐
    │              │        │            │
┌───▼────────┐  ┌──▼──────┐  ┌▼───────────┐
│ ProfileEdit │  │ Category│  │ Theme      │
│ Screen      │  │ Management│ │ Setting    │
└─────────────┘  └─────────┘  └────────────┘
```

## ナビゲーション構造

### 認証前（AuthStack）

```
NavigationContainer
└── Stack.Navigator
    └── Stack.Screen name="Auth"
        └── Stack.Navigator
            ├── Stack.Screen name="Login" → LoginScreen
            └── Stack.Screen name="Signup" → SignupScreen
```

### 認証後（MainStack）

```
NavigationContainer
└── Stack.Navigator
    └── Stack.Screen name="Main"
        └── Tab.Navigator (MainTabNavigator)
            ├── Tab.Screen name="Home" → RecordListScreen
            ├── Tab.Screen name="Create" → PhotoPickerScreen
            ├── Tab.Screen name="Thread" → ThreadScreen
            └── Tab.Screen name="MyPage" → ProfileScreen
    ├── Stack.Screen name="RecordDetail" → RecordDetailScreen
    ├── Stack.Screen name="ProfileEdit" → ProfileEditScreen
    ├── Stack.Screen name="LoginInfo" → LoginInfoScreen
    ├── Stack.Screen name="PremiumPlan" → PremiumPlanScreen
    ├── Stack.Screen name="CategoryManagement" → CategoryManagementScreen
    ├── Stack.Screen name="ThemeSetting" → ThemeSettingScreen
    ├── Stack.Screen name="LanguageSetting" → LanguageSettingScreen
    └── Stack.Screen name="PhotoPicker" → PhotoPickerScreen
```

## 画面遷移のルール

1. **認証状態による自動遷移**
   - トークンがある場合: MainTabNavigator を表示
   - トークンがない場合: AuthStack を表示

2. **タブナビゲーション**
   - 下部のタブで4つの主要画面を切り替え
   - タブ間の遷移は履歴を保持しない

3. **スタックナビゲーション**
   - 詳細画面はスタックで管理
   - 戻るボタンで前の画面に戻る

4. **モーダル表示**
   - 一部の画面は `presentation: 'card'` でモーダル表示
   - スワイプで閉じることができる

## 画面の状態管理

- **認証状態**: AuthContext で管理
- **テーマ**: ThemeContext で管理
- **言語**: LanguageContext で管理
- **記録データ**: 各画面で API から取得

## ローディング状態

- **認証チェック中**: ローディング画面を表示
- **データ取得中**: 各画面でローディングインジケーターを表示
