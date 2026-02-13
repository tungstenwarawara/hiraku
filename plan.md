# ContentPilot 実装計画書

## 概要

個人クリエイター向けのSNS運用・マーケティング自動化ツール「ContentPilot」の実装計画。
X + Zenn + note を一元管理し、収益ファネルの可視化と記者AIによるコンテンツ品質担保を実現する。

---

## 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| Frontend | Next.js (App Router) | SSR/SSG対応、Vercelとの親和性 |
| UI | Tailwind CSS + shadcn/ui | 高速開発、ダッシュボード向きコンポーネント |
| Database | Supabase (PostgreSQL) | 無料枠、Auth/Storage/Edge Functions一体型 |
| Auth | Supabase Auth | GitHub/Google OAuth対応、Row Level Security |
| API | Next.js Route Handlers + Supabase Edge Functions | サーバーレス、定期実行にEdge Functions |
| AI | Claude API (Anthropic) | 記者エージェント、コンテンツ生成 |
| Deploy | Vercel | Next.jsとの最適な統合、日本リージョン |
| Cron | Supabase pg_cron / Vercel Cron | メトリクス定期収集 |

---

## ディレクトリ構成（予定）

```
hiraku/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 認証関連ページ
│   │   │   ├── login/
│   │   │   └── callback/
│   │   ├── (dashboard)/        # ダッシュボード（認証必須）
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # メインダッシュボード
│   │   │   ├── utm/            # UTMリンク管理
│   │   │   ├── metrics/        # メトリクス閲覧
│   │   │   ├── funnel/         # 収益ファネル
│   │   │   ├── reporter/       # 記者エージェント
│   │   │   └── settings/       # 設定
│   │   ├── api/                # Route Handlers
│   │   │   ├── utm/
│   │   │   ├── metrics/
│   │   │   ├── stripe/
│   │   │   └── reporter/
│   │   ├── layout.tsx
│   │   └── page.tsx            # LP
│   ├── components/
│   │   ├── ui/                 # shadcn/ui コンポーネント
│   │   ├── dashboard/          # ダッシュボード固有コンポーネント
│   │   ├── utm/                # UTM関連コンポーネント
│   │   ├── metrics/            # メトリクス関連コンポーネント
│   │   └── reporter/           # 記者エージェント関連
│   ├── lib/
│   │   ├── supabase/           # Supabaseクライアント設定
│   │   ├── integrations/       # 外部API連携
│   │   │   ├── x.ts            # X (Twitter) API
│   │   │   ├── zenn.ts         # Zenn データ取得
│   │   │   ├── note.ts         # note データ取得
│   │   │   └── stripe.ts       # Stripe連携
│   │   ├── utm.ts              # UTMリンク生成ロジック
│   │   └── reporter.ts         # 記者エージェントロジック
│   └── types/                  # TypeScript型定義
├── supabase/
│   ├── migrations/             # DBマイグレーション
│   └── functions/              # Edge Functions（定期実行）
│       └── collect-metrics/    # メトリクス収集
├── public/
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## Phase 0（P0）: 基盤構築

計測の土台となるUTMリンク管理とデータベース設計。全ての機能はここに依存する。

### P0-1: プロジェクト初期セットアップ

- Next.js プロジェクト作成（App Router, TypeScript, Tailwind CSS）
- shadcn/ui 導入
- Supabase プロジェクト接続設定
- ESLint / Prettier 設定
- 環境変数テンプレート（`.env.example`）作成

### P0-2: Supabase DB設計

全フェーズで使うテーブルを最初に設計し、マイグレーションファイルとして管理する。

```sql
-- ユーザー管理
create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  x_username text,
  zenn_username text,
  note_username text,
  stripe_account_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- UTMリンク管理
create table utm_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  original_url text not null,
  utm_source text not null,       -- x, zenn, note, other
  utm_medium text not null,       -- social, article, profile
  utm_campaign text,              -- キャンペーン名
  utm_content text,               -- 投稿ID等
  short_code text unique,         -- 短縮URL用コード
  click_count int default 0,
  created_at timestamptz default now()
);

-- UTMクリックログ
create table utm_clicks (
  id uuid primary key default gen_random_uuid(),
  utm_link_id uuid references utm_links(id) not null,
  referrer text,
  user_agent text,
  ip_hash text,                   -- プライバシー配慮のためハッシュ化
  clicked_at timestamptz default now()
);

-- メトリクス（X / Zenn / note 共通）
create table metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  platform text not null,         -- x, zenn, note
  content_id text not null,       -- 投稿/記事のID
  content_url text,
  content_title text,
  metric_type text not null,      -- impressions, likes, retweets, views, comments
  metric_value numeric not null,
  collected_at timestamptz default now()
);

-- プラットフォーム別コンテンツ管理
create table contents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  platform text not null,
  external_id text,               -- プラットフォーム上のID
  title text,
  url text,
  published_at timestamptz,
  status text default 'published', -- draft, published, archived
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 収益データ（Stripe連携）
create table revenue_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  stripe_payment_id text unique,
  amount integer not null,        -- 金額（円）
  currency text default 'jpy',
  source_content_id uuid references contents(id),
  source_utm_link_id uuid references utm_links(id),
  event_type text not null,       -- payment, refund, subscription
  occurred_at timestamptz default now()
);

-- 記者エージェント：インタビューセッション
create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  title text not null,
  status text default 'in_progress', -- in_progress, completed, archived
  messages jsonb default '[]',     -- インタビュー会話履歴
  generated_contents jsonb,        -- 生成されたコンテンツ群
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- インデックス
create index idx_utm_links_user on utm_links(user_id);
create index idx_utm_links_short_code on utm_links(short_code);
create index idx_metrics_user_platform on metrics(user_id, platform);
create index idx_metrics_collected on metrics(collected_at);
create index idx_contents_user_platform on contents(user_id, platform);
create index idx_revenue_user on revenue_events(user_id);
```

### P0-3: 認証基盤

- Supabase Auth 設定（GitHub OAuth / Google OAuth）
- ログイン / サインアップページ
- 認証ミドルウェア（ダッシュボード保護）
- プロフィール設定ページ（X/Zenn/note ユーザー名登録）

### P0-4: UTMリンク生成・管理

**機能:**
- UTMパラメータ付きリンクの生成フォーム
- プラットフォーム（source）、媒体（medium）、キャンペーン名を指定
- 短縮URL発行（`/r/[short_code]` → リダイレクト + クリック記録）
- UTMリンク一覧表示（クリック数付き）
- リンクごとのクリック推移グラフ

**実装:**
- `POST /api/utm` — リンク生成
- `GET /api/utm` — リンク一覧取得
- `GET /r/[code]` — リダイレクト（クリック記録）
- UTM管理ダッシュボード画面

---

## Phase 1（P1）: メトリクス収集 + 記者エージェントMVP

数字の可視化とコンテンツ品質向上の両輪を実装する。

### P1-1: X（Twitter）メトリクス連携

**収集データ:**
- ツイートのインプレッション、いいね、RT、リプライ数
- フォロワー数の推移
- プロフィールへのアクセス数

**実装:**
- X API v2 連携（Free tier: 読み取り中心）
- OAuth 2.0 でユーザートークン取得
- Supabase Edge Function で定期収集（1日1回）
- 設定画面でXアカウント連携

### P1-2: Zenn メトリクス連携

**収集データ:**
- 記事のPV、いいね数、ブックマーク数
- 記事一覧の取得

**実装:**
- Zenn の公開 API（`/api/articles?username=xxx`）でメトリクス取得
- GitHub連携による記事管理との連動（オプション）
- Supabase Edge Function で定期収集（1日1回）

### P1-3: note メトリクス連携

**収集データ:**
- 記事のPV、スキ数、コメント数
- マガジン購読者数（有料の場合）

**実装:**
- note の RSS フィード解析で記事一覧取得
- 非公式APIでメトリクス取得（`/api/v2/creators/xxx`）
- Supabase Edge Function で定期収集（1日1回）

### P1-4: 記者エージェント MVP

マーケットリサーチの「柱3: 記者エージェント」の最小実装。

**フロー:**
1. ユーザーが「体験テーマ」を入力（例：「Next.jsでブログを作った」）
2. AIが深掘りインタビュー質問を生成（5〜8問）
3. ユーザーが回答（音声入力 or テキスト）
4. AIが回答を構造化し、以下の3形式で下書き生成:
   - **Zenn記事（技術記事）**: 2,000〜4,000字の技術ブログ
   - **note記事（エッセイ）**: 1,000〜2,000字の体験共有
   - **X投稿（スレッド）**: 5〜10ツイートのスレッド

**実装:**
- `POST /api/reporter/start` — セッション開始、初期質問生成
- `POST /api/reporter/answer` — 回答受付、追加質問 or コンテンツ生成
- `POST /api/reporter/generate` — 3形式のコンテンツ一括生成
- Claude API（Anthropic SDK）統合
- インタビュー画面（チャットUI）
- 生成コンテンツのプレビュー・編集画面

---

## Phase 2（P2）: ダッシュボード + 収益追跡

データを可視化し、収益との紐付けを実現する。

### P2-1: メインダッシュボード

**表示内容:**
- 直近7日/30日のプラットフォーム別サマリー
  - X: インプレッション合計、エンゲージメント率
  - Zenn: PV合計、いいね合計
  - note: PV合計、スキ合計
- 全プラットフォーム横断のトレンドグラフ（折れ線）
- 最新コンテンツのパフォーマンスランキング
- UTMリンク経由のクリック数サマリー

**実装:**
- Recharts または Chart.js でグラフ描画
- サーバーコンポーネント + クライアントコンポーネントの適切な分離
- リアルタイムではなくデイリー更新（Supabaseのデータを参照）

### P2-2: Stripe 収益連携

**機能:**
- Stripe アカウント接続（OAuth）
- Webhook 受信で支払いイベントを自動記録
- 支払い → UTMリンク or コンテンツとの紐付け
  - Stripe Checkout の `client_reference_id` にUTMパラメータを埋め込む
  - または Stripe Metadata にコンテンツIDを付与

**実装:**
- `POST /api/stripe/webhook` — Webhook受信エンドポイント
- `GET /api/stripe/connect` — Stripe Connect OAuth開始
- `GET /api/stripe/callback` — OAuth コールバック
- 収益イベント一覧画面

### P2-3: 収益ファネル可視化

マーケットリサーチの「柱2: 収益ファネルの完全可視化」の実装。

**ファネルの流れ:**
```
認知（X インプレッション）
  ↓ クリック率
流入（UTM経由のクリック）
  ↓ 閲覧率
信頼（Zenn/note PV、スキ/いいね）
  ↓ コンバージョン率
購入（Stripe 売上）
```

**実装:**
- ファネルチャート（Sankey ダイアグラムまたはステップ型ファネル）
- 各ステップ間のコンバージョン率表示
- 期間フィルター（7日/30日/カスタム）
- コンテンツ別・キャンペーン別のファネル絞り込み

---

## Phase 3（P3）: 分析・最適化

データが蓄積された後に実装する高度な分析機能。

### P3-1: パフォーマンス分析エンジン

**機能:**
- コンテンツタイプ別の平均パフォーマンス比較
  - 技術記事 vs エッセイ vs ハウツー 等
- 投稿曜日・時間帯別のエンゲージメント分析
- ハッシュタグ / キーワードのパフォーマンス相関
- 高パフォーマンスコンテンツの共通パターン抽出（Claude API活用）

**実装:**
- 分析ダッシュボード画面
- Supabase SQL クエリでの集計
- Claude API で「なぜこの投稿が伸びたか」の自然言語分析

### P3-2: 投稿最適化エンジン

**機能:**
- 最適投稿時間の提案（曜日 × 時間帯のヒートマップ）
- 次回投稿の内容提案（過去のパフォーマンスデータ + トレンド分析）
- A/Bテスト機能（タイトルバリエーションの比較）
- 定期レポートの自動生成（週次/月次メール）

**実装:**
- ヒートマップコンポーネント
- Claude API で最適化提案の生成
- Supabase Edge Function で週次レポートをメール送信（Resend等）

---

## 各フェーズの成果物とマイルストーン

| フェーズ | 成果物 | 完了条件 |
|---------|--------|---------|
| **P0** | プロジェクト基盤、DB、認証、UTMリンク管理 | UTMリンクを生成してクリック計測ができる |
| **P1** | 3プラットフォームのメトリクス収集、記者AI MVP | 数値が自動収集され、インタビューから3形式の記事を生成できる |
| **P2** | ダッシュボード、Stripe連携、ファネル可視化 | 認知→信頼→購入のファネルが1画面で見える |
| **P3** | 分析エンジン、最適化エンジン | データに基づく改善提案が自動で届く |

---

## 外部ツールとの連携方針（ハイブリッド運用）

マーケットリサーチの方針通り、全てを自作せず既存ツールの強みを活かす。

| 領域 | 方針 | ツール |
|------|------|--------|
| X投稿スケジューリング | **既存ツール** | Buffer（無料プラン） |
| SNS画像作成 | **既存ツール** | Canva（無料プラン） |
| アイデア・下書き管理 | **既存ツール** | Notion |
| UTMリンク管理 | **自作** | ContentPilot |
| クロスプラットフォーム計測 | **自作** | ContentPilot |
| 収益ファネル可視化 | **自作** | ContentPilot |
| 記者エージェント | **自作** | ContentPilot (Claude API) |
| パフォーマンス分析 | **自作** | ContentPilot |

---

## 運用コスト見積もり

| サービス | プラン | 月額 |
|---------|--------|------|
| Supabase | Free | ¥0 |
| Vercel | Hobby | ¥0 |
| X API | Free tier | ¥0 |
| Claude API | 従量課金 | ¥500〜2,000（利用量による） |
| Stripe | 決済手数料のみ | 3.6% |
| ドメイン | 年額 | ¥1,500/年 |
| **合計** | | **¥500〜2,000/月** |

---

*作成日: 2025年2月13日*
*プロジェクト: ContentPilot (hiraku)*
