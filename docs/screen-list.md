# 画面一覧・遷移

## 画面構成概要

DaiBアプリは、認証状態に応じて2つのナビゲーションスタックに分かれます：

1. **AuthStack**: 未認証時の画面群（ログイン・サインアップ）
2. **MainStack**: 認証済み時の画面群（メイン機能）

認証済み時は、タブナビゲーション（Home・Thread の2タブ）とスタックナビゲーションが組み合わされています。

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

認証済みユーザーは、下部に2つのタブが表示されます：

##### 3. RecordListScreen（ホーム・ギャラリー画面）
- **タブ名**: Home
- **アイコン**: home
- **パス**: `/Main/Home`
- **説明**: 記録を一覧表示するメイン画面。ユーザー情報ヘッダー、カテゴリータブ、記録グリッドを表示
- **主要要素**:
  - ユーザー情報ヘッダー（アバター、ユーザー名、自己紹介、作成ボタン）
  - 表示形式切替（グリッド/リスト/ブックリスト/タイル）
  - 並び順切替（記録日/作成日）
  - カテゴリータブ（横スワイプで切り替え）
  - 記録の一覧表示（表示形式に応じて変化）
  - 設定ボタン
- **遷移先**:
  - アバタータップ → ProfileEditScreen
  - 作成ボタン → PhotoPickerScreen
  - 設定ボタン → ProfileScreen（MyPage）
  - 記録タップ → RecordDetailScreen

---

##### 4. ThreadScreen（スレッド・タイムライン画面）
- **タブ名**: Thread
- **アイコン**: chatbubbles / chatbubbles-outline
- **パス**: `/Main/Thread`
- **説明**: フォロー中ユーザーの直近7日間の記録をタイムライン表示。ユーザー検索・フォロー管理・QRコード機能
- **主要要素**:
  - フォロー数・フォロワー数表示
  - タイムライン（フォロー中の記録一覧）
  - ユーザー検索ボタン
  - フォロー中/フォロワー一覧ボタン
  - QRコード表示・スキャン（非公開ユーザー検索用）
- **遷移先**:
  - 記録タップ → RecordDetailScreen
  - 投稿者タップ → UserProfileScreen
  - ユーザー検索 → UserSearchScreen
  - フォロー中/フォロワー → FollowListScreen

---

#### スタックナビゲーション（詳細画面）

##### 5. PhotoPickerScreen（記録作成・編集画面）
- **パス**: `/PhotoPicker`
- **説明**: 写真を選択して記録を作成、または既存記録を編集する画面
- **主要要素**:
  - カメラロールから画像選択
  - タイトル入力フィールド（任意）
  - 説明入力フィールド（任意）
  - 日付選択（必須）
  - カテゴリー選択（任意）
  - タイムライン表示設定（show_in_timeline）
  - 作成/更新ボタン
- **遷移先**:
  - 作成/更新成功 → RecordListScreen または RecordDetailScreen

---

##### 6. RecordDetailScreen（記録詳細画面）
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

##### 7. ProfileScreen（設定画面）
- **パス**: `/MyPage`
- **説明**: ユーザーの設定・各種管理画面への入口
- **主要要素**:
  - アカウント設定（ログイン情報、プレミアムプラン）
  - DaiB設定（カテゴリー管理、表示設定）
  - アプリ設定（通知設定（未実装）、言語設定）
  - その他（ヘルプ、このアプリについて、利用規約、プライバシー、お問い合わせ）
  - ログアウトボタン
- **遷移先**:
  - ログイン情報 → LoginInfoScreen
  - プレミアムプラン → PremiumPlanScreen
  - カテゴリー管理 → CategoryManagementScreen
  - 表示設定 → DisplaySettingsScreen
  - 言語設定 → LanguageSettingScreen
  - ヘルプ → HelpScreen
  - このアプリについて → AboutScreen
  - 利用規約 → TermsScreen
  - プライバシー → PrivacyScreen
  - お問い合わせ → ContactScreen
  - ログアウト → LoginScreen
- **備考**:
  - 通知設定はメニュー項目として表示されるが、遷移先は未実装
  - テーマ設定（ThemeSettingScreen）はファイルとして存在するが、現在のナビゲーションには登録されていない（ダークモード固定のため）

---

##### 8. ProfileEditScreen（プロフィール編集画面）
- **パス**: `/ProfileEdit`
- **説明**: ユーザーのプロフィール情報を編集する画面
- **主要要素**:
  - ユーザー名入力フィールド（25文字以内）
  - 自己紹介入力フィールド
  - 公開設定（public/private）
  - アバター画像選択・表示
  - 保存ボタン
- **遷移先**:
  - 保存完了 → RecordListScreen（ホーム）
  - 戻る → RecordListScreen

---

##### 9. LoginInfoScreen（ログイン情報画面）
- **パス**: `/LoginInfo`
- **説明**: ログイン情報（メールアドレスなど）を表示する画面
- **主要要素**:
  - メールアドレス表示
  - その他のログイン情報
- **遷移先**:
  - 戻る → ProfileScreen

---

##### 10. PremiumPlanScreen（プレミアムプラン画面）
- **パス**: `/PremiumPlan`
- **説明**: プレミアムプランの情報を表示する画面（現状はプレースホルダー）
- **主要要素**:
  - プレミアムプランの説明
- **遷移先**:
  - 戻る → ProfileScreen

---

##### 11. CategoryManagementScreen（カテゴリー管理画面）
- **パス**: `/CategoryManagement`
- **説明**: カテゴリーの作成・編集・削除を行う画面
- **主要要素**:
  - カテゴリー一覧表示（名前のみ）
  - カテゴリー作成ボタン
  - カテゴリー編集機能（長押しで編集モーダル）
  - カテゴリー削除機能
- **遷移先**:
  - 戻る → ProfileScreen

---

##### 12. DisplaySettingsScreen（表示設定画面）
- **パス**: `/DisplaySettings`
- **説明**: 記録一覧のデフォルト表示形式・並び順を設定する画面
- **主要要素**:
  - 表示形式選択（グリッド/リスト/ブックリスト/タイル）
  - 並び順選択（記録日/作成日）
  - 保存ボタン
- **遷移先**:
  - 保存完了 → ProfileScreen
  - 戻る → ProfileScreen

---

##### 13. LanguageSettingScreen（言語設定画面）
- **パス**: `/LanguageSetting`
- **説明**: アプリの表示言語を設定する画面
- **主要要素**:
  - 日本語選択
  - 英語選択
- **遷移先**:
  - 戻る → ProfileScreen

---

##### 14. UserSearchScreen（ユーザー検索画面）
- **パス**: `/UserSearch`
- **説明**: ユーザーを検索する画面（公開は部分一致、非公開は検索キー完全一致）
- **主要要素**:
  - 検索入力フィールド
  - 検索結果一覧
  - フォローボタン
- **遷移先**:
  - ユーザータップ → UserProfileScreen
  - 戻る → ThreadScreen

---

##### 15. FollowListScreen（フォロー一覧画面）
- **パス**: `/FollowingList` または `/FollowersList`
- **説明**: フォロー中またはフォロワー一覧を表示する画面
- **主要要素**:
  - ユーザー一覧（アバター、名前、フォロー状態）
- **遷移先**:
  - ユーザータップ → UserProfileScreen
  - 戻る → ThreadScreen

---

##### 16. UserProfileScreen（他ユーザープロフィール画面）
- **パス**: `/UserProfile`
- **説明**: 他ユーザーのプロフィールと投稿一覧を表示する画面
- **主要要素**:
  - ユーザー情報（アバター、名前、自己紹介）
  - フォロー/フォロー解除ボタン
  - 投稿一覧（タイル形式）
  - 設定ボタン（自分のプロフィールへ）
- **遷移先**:
  - 記録タップ → RecordDetailScreen
  - 設定ボタン → ProfileScreen（MyPage）
  - 戻る → 前の画面

---

##### 17. HelpScreen（ヘルプ画面）
- **パス**: `/Help`
- **説明**: アプリの使い方・ヘルプを表示する画面

---

##### 18. AboutScreen（このアプリについて画面）
- **パス**: `/About`
- **説明**: アプリのバージョン情報等を表示する画面

---

##### 19. TermsScreen（利用規約画面）
- **パス**: `/Terms`
- **説明**: 利用規約を表示する画面

---

##### 20. PrivacyScreen（プライバシーポリシー画面）
- **パス**: `/Privacy`
- **説明**: プライバシーポリシーを表示する画面

---

##### 21. ContactScreen（お問い合わせ画面）
- **パス**: `/Contact`
- **説明**: お問い合わせ方法を表示する画面

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
└───────┼───────┘  │ │ 表示設定      │ │
        │          │ │ 言語          │ │
        │ 戻る      │ │ ログアウト    │ │
        │          │ └──────┬───────┘ │
        └──────────┼────────┼─────────┘
                   │        │
    ┌──────────────┼────────┼────────────┐
    │              │        │            │
┌───▼────────┐  ┌──▼──────┐  ┌▼───────────┐
│ ProfileEdit │  │ Category│  │ Display    │
│ Screen      │  │ Management│ │ Settings   │
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
            └── Tab.Screen name="Thread" → ThreadScreen
    ├── Stack.Screen name="RecordDetail" → RecordDetailScreen
    ├── Stack.Screen name="MyPage" → ProfileScreen
    ├── Stack.Screen name="ProfileEdit" → ProfileEditScreen
    ├── Stack.Screen name="LoginInfo" → LoginInfoScreen
    ├── Stack.Screen name="PremiumPlan" → PremiumPlanScreen
    ├── Stack.Screen name="CategoryManagement" → CategoryManagementScreen
    ├── Stack.Screen name="DisplaySettings" → DisplaySettingsScreen
    ├── Stack.Screen name="LanguageSetting" → LanguageSettingScreen
    ├── Stack.Screen name="PhotoPicker" → PhotoPickerScreen
    ├── Stack.Screen name="Help" → HelpScreen
    ├── Stack.Screen name="About" → AboutScreen
    ├── Stack.Screen name="Terms" → TermsScreen
    ├── Stack.Screen name="Privacy" → PrivacyScreen
    ├── Stack.Screen name="Contact" → ContactScreen
    ├── Stack.Screen name="UserSearch" → UserSearchScreen
    ├── Stack.Screen name="FollowingList" → FollowListScreen
    ├── Stack.Screen name="FollowersList" → FollowListScreen
    └── Stack.Screen name="UserProfile" → UserProfileScreen
```

## 画面遷移のルール

1. **認証状態による自動遷移**
   - トークンがある場合: MainTabNavigator を表示
   - トークンがない場合: AuthStack を表示

2. **タブナビゲーション**
   - 下部のタブで2つの主要画面（Home・Thread）を切り替え
   - タブ間の遷移は履歴を保持しない

3. **スタックナビゲーション**
   - 詳細画面はスタックで管理
   - 戻るボタンで前の画面に戻る

4. **モーダル表示**
   - すべてのスタック画面はデフォルトの `presentation: 'card'` で遷移
   - スワイプで前の画面に戻ることができる

## 画面の状態管理

- **認証状態**: AuthContext で管理（`useMemo` でパフォーマンス最適化済み）
- **テーマ**: ThemeContext で管理（現在はダークモード固定、定数化済み）
- **言語**: LanguageContext で管理（翻訳データは `locales/` に分離済み）
- **記録・カテゴリーデータ**: RecordsAndCategoriesContext で一元管理（`useRef` キャッシュフラグで不要な再取得を抑制）

## ローディング状態

- **認証チェック中**: ローディング画面を表示
- **データ取得中**: 各画面でローディングインジケーターを表示
