# ContentPilot 実装計画書

## 概要

個人クリエイター向けのSNS運用・マーケティング自動化ツール「ContentPilot」の実装計画。
X + Zenn + note を一元管理し、収益ファネルの可視化と記者AIによるコンテンツ品質担保を実現する。

### アーキテクチャ方針：Web UI + MCP Server ハイブリッド構成

本ツールは **2つのインターフェース** を持つ。

```
┌─────────────────────────────────────────────────────┐
│                    ContentPilot                      │
│                                                     │
│  ┌──────────────────┐    ┌───────────────────────┐  │
│  │   Web UI (Next.js)│    │  MCP Server (CLI)     │  │
│  │                  │    │                       │  │
│  │  • ダッシュボード  │    │  • 記者エージェント    │  │
│  │  • ファネル可視化  │    │  • メトリクス確認      │  │
│  │  • UTMリンク管理  │    │  • UTMリンク生成       │  │
│  │  • 設定          │    │  • パフォーマンス分析   │  │
│  └────────┬─────────┘    └──────────┬────────────┘  │
│           │                        │                │
│           └────────┬───────────────┘                │
│                    ▼                                │
│            ┌──────────────┐                         │
│            │   Supabase   │                         │
│            │  (共有DB)    │                         │
│            └──────────────┘                         │
└─────────────────────────────────────────────────────┘
```

| インターフェース | 用途 | LLM費用 |
|-----------------|------|---------|
| **Web UI** | グラフ・チャートなどビジュアル重視の機能 | なし（表示のみ） |
| **MCP Server** | AI対話が必要な機能、CLI操作 | ¥0（Claude Max内で動作） |

MCP Server は Claude Code / claude.ai から呼び出され、LLMの推論はClaude Maxプランに含まれる。
そのため **Claude API の従量課金が不要** になる。

---

## 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| Frontend | Next.js (App Router) | SSR/SSG対応、Vercelとの親和性 |
| UI | Tailwind CSS + shadcn/ui | 高速開発、ダッシュボード向きコンポーネント |
| Database | Supabase (PostgreSQL) | 無料枠、Auth/Storage/Edge Functions一体型 |
| Auth | Supabase Auth | GitHub/Google OAuth対応、Row Level Security |
| API | Next.js Route Handlers + Supabase Edge Functions | サーバーレス、定期実行にEdge Functions |
| MCP Server | TypeScript (MCP SDK) | Claude Code / claude.ai との連携 |
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
│   │   │   └── settings/       # 設定
│   │   ├── api/                # Route Handlers
│   │   │   ├── utm/
│   │   │   ├── metrics/
│   │   │   └── stripe/
│   │   ├── layout.tsx
│   │   └── page.tsx            # LP
│   ├── components/
│   │   ├── ui/                 # shadcn/ui コンポーネント
│   │   ├── dashboard/          # ダッシュボード固有コンポーネント
│   │   ├── utm/                # UTM関連コンポーネント
│   │   └── metrics/            # メトリクス関連コンポーネント
│   ├── lib/
│   │   ├── supabase/           # Supabaseクライアント設定
│   │   ├── integrations/       # 外部API連携
│   │   │   ├── x.ts            # X (Twitter) API
│   │   │   ├── zenn.ts         # Zenn データ取得
│   │   │   ├── note.ts         # note データ取得
│   │   │   └── stripe.ts       # Stripe連携
│   │   └── utm.ts              # UTMリンク生成ロジック
│   └── types/                  # TypeScript型定義
├── mcp-server/                 # MCP Server（Claude連携）
│   ├── src/
│   │   ├── index.ts            # MCPサーバーエントリポイント
│   │   ├── tools/              # MCPツール定義
│   │   │   ├── reporter.ts     # 記者エージェント
│   │   │   ├── metrics.ts      # メトリクス取得・表示
│   │   │   ├── utm.ts          # UTMリンク生成
│   │   │   ├── funnel.ts       # ファネルデータ取得
│   │   │   └── analytics.ts    # パフォーマンス分析
│   │   └── lib/
│   │       └── supabase.ts     # Supabase接続（共有）
│   ├── package.json
│   └── tsconfig.json
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

## MCP Server 設計

Claude Code / claude.ai から利用するMCPツールの一覧。

### ツール一覧

| ツール名 | 説明 | 入力パラメータ | 出力 |
|----------|------|---------------|------|
| `create_utm_link` | UTMリンクを生成しSupabaseに保存 | url, source, medium, campaign | 生成されたUTMリンクと短縮URL |
| `list_utm_links` | UTMリンク一覧を取得 | limit?, campaign? | リンク一覧（クリック数付き） |
| `get_metrics` | プラットフォーム別メトリクスを取得 | platform?, period?, content_id? | メトリクスの要約テーブル |
| `get_funnel` | 収益ファネルデータを取得 | period?, campaign? | ファネル各ステップの数値と転換率 |
| `start_interview` | 記者エージェントのインタビュー開始 | theme | インタビュー質問（5〜8問） |
| `save_interview_answer` | インタビュー回答を保存 | session_id, answers | 保存確認、追加質問があれば返す |
| `generate_articles` | インタビューからマルチ形式記事生成 | session_id, formats[] | Zenn/note/X 各形式の下書き |
| `analyze_performance` | コンテンツパフォーマンスを分析 | platform?, period? | 分析結果と改善提案 |
| `suggest_post_timing` | 最適投稿時間を提案 | platform | 曜日×時間帯のおすすめ |

### 利用イメージ

```
ユーザー（Claude Code上）:
  「今週のZennとXのパフォーマンスを比較して」

Claude（Max内LLM）:
  → get_metrics(platform: "zenn", period: "7d") を呼び出し
  → get_metrics(platform: "x", period: "7d") を呼び出し
  → 両方の結果を自然言語で比較分析して回答
  （LLM推論はMaxプラン内、MCPサーバーはDB読み取りのみ）
```

```
ユーザー（Claude Code上）:
  「Supabaseの認証機能を実装した体験を記事にしたい」

Claude（Max内LLM）:
  → start_interview(theme: "Supabaseの認証機能を実装した体験") を呼び出し
  → 深掘り質問を生成して表示
  （ユーザーが回答）
  → save_interview_answer(session_id, answers) で保存
  → generate_articles(session_id, formats: ["zenn", "note", "x"]) で3形式生成
  （記事の構造化・リライトはMaxプラン内LLMが実行）
```

### Claude Code への登録方法

`~/.claude/claude_desktop_config.json` または プロジェクト設定に追加:

```json
{
  "mcpServers": {
    "contentpilot": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "..."
      }
    }
  }
}
```

---

## Phase 0（P0）: 基盤構築

計測の土台となるUTMリンク管理とデータベース設計。全ての機能はここに依存する。

### P0-1: プロジェクト初期セットアップ

- Next.js プロジェクト作成（App Router, TypeScript, Tailwind CSS）
- shadcn/ui 導入
- Supabase プロジェクト接続設定
- MCP Server プロジェクト作成（`mcp-server/`）
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

Web UI と MCP Server の両方からアクセスできるようにする。

**機能:**
- UTMパラメータ付きリンクの生成フォーム
- プラットフォーム（source）、媒体（medium）、キャンペーン名を指定
- 短縮URL発行（`/r/[short_code]` → リダイレクト + クリック記録）
- UTMリンク一覧表示（クリック数付き）
- リンクごとのクリック推移グラフ

**Web UI 実装:**
- `POST /api/utm` — リンク生成
- `GET /api/utm` — リンク一覧取得
- `GET /r/[code]` — リダイレクト（クリック記録）
- UTM管理ダッシュボード画面

**MCP Server 実装:**
- `create_utm_link` ツール — CLI上から素早くリンク生成
- `list_utm_links` ツール — リンク一覧・クリック数確認

### P0-5: MCP Server 初期セットアップ

- MCP SDK（`@modelcontextprotocol/sdk`）でサーバー構築
- Supabase接続の共有ライブラリ
- `create_utm_link` / `list_utm_links` を最初のツールとして実装
- Claude Code への登録設定ファイル作成
- 動作確認テスト

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

### P1-4: メトリクス MCP ツール

MCPサーバーにメトリクス関連ツールを追加。

**実装:**
- `get_metrics` ツール — 「今週のZennのPVは？」等の質問にデータで回答
- 収集済みのSupabaseデータを整形して返す
- Claude（Maxプラン）が結果を自然言語で分析・比較

### P1-5: 記者エージェント MVP（MCP Server）

マーケットリサーチの「柱3: 記者エージェント」をMCP Serverとして実装。
**Claude Max のLLMが推論を担当するため、API従量課金なし。**

**フロー:**
1. ユーザーがClaude Code上で「体験テーマ」を伝える
2. Claude（Max LLM）が深掘りインタビュー質問を生成
3. MCPツールでセッション・回答をSupabaseに保存
4. Claude（Max LLM）が回答を構造化し、3形式で下書き生成:
   - **Zenn記事（技術記事）**: 2,000〜4,000字の技術ブログ
   - **note記事（エッセイ）**: 1,000〜2,000字の体験共有
   - **X投稿（スレッド）**: 5〜10ツイートのスレッド
5. MCPツールで生成コンテンツをSupabaseに保存

**MCPツール実装:**
- `start_interview` — セッション作成、テーマ保存
- `save_interview_answer` — ユーザー回答の保存
- `generate_articles` — 生成結果をSupabaseに保存
  - ※ 記事の構造化・リライト自体はClaude Max LLMが実行
  - MCPサーバーはデータの保存・取得のみを担当

**従来のAPI方式との比較:**
```
従来: ユーザー → Web UI → Claude API呼び出し(有料) → 記事生成 → DB保存
今回: ユーザー → Claude Code(Max) → MCP Server → DB保存
                     ↑
            LLMの推論はMaxに含まれる（追加費用¥0）
```

---

## Phase 2（P2）: ダッシュボード + 収益追跡

データを可視化し、収益との紐付けを実現する。
ダッシュボードはビジュアル重視のためWeb UIで実装する。

### P2-1: メインダッシュボード（Web UI）

**表示内容:**
- 直近7日/30日のプラットフォーム別サマリー
  - X: インプレッション合計、エンゲージメント率
  - Zenn: PV合計、いいね合計
  - note: PV合計、スキ合計
- 全プラットフォーム横断のトレンドグラフ（折れ線）
- 最新コンテンツのパフォーマンスランキング
- UTMリンク経由のクリック数サマリー

**実装:**
- Recharts でグラフ描画
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

### P2-3: 収益ファネル可視化（Web UI + MCP Server）

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

**Web UI 実装:**
- ファネルチャート（Sankey ダイアグラムまたはステップ型ファネル）
- 各ステップ間のコンバージョン率表示
- 期間フィルター（7日/30日/カスタム）
- コンテンツ別・キャンペーン別のファネル絞り込み

**MCP Server 実装:**
- `get_funnel` ツール — 「今月のファネル転換率は？」にデータで回答
- Claude（Max）が数値を自然言語で解釈し、改善点を提案

---

## Phase 3（P3）: 分析・最適化

データが蓄積された後に実装する高度な分析機能。
分析のLLM推論はMCP Server経由でClaude Maxが担当。

### P3-1: パフォーマンス分析エンジン（MCP Server）

**機能:**
- コンテンツタイプ別の平均パフォーマンス比較
  - 技術記事 vs エッセイ vs ハウツー 等
- 投稿曜日・時間帯別のエンゲージメント分析
- ハッシュタグ / キーワードのパフォーマンス相関
- 高パフォーマンスコンテンツの共通パターン抽出

**MCPツール実装:**
- `analyze_performance` — Supabaseから集計データを取得
- Claude（Max）が「なぜこの投稿が伸びたか」を自然言語分析
- 改善アクションの具体的な提案を生成

### P3-2: 投稿最適化エンジン（MCP Server + Web UI）

**機能:**
- 最適投稿時間の提案（曜日 × 時間帯のヒートマップ）
- 次回投稿の内容提案（過去のパフォーマンスデータ + トレンド分析）
- A/Bテスト機能（タイトルバリエーションの比較）

**MCPツール実装:**
- `suggest_post_timing` — 最適投稿タイミングをデータから算出
- Claude（Max）が過去データと合わせて投稿戦略を提案

**Web UI 実装:**
- ヒートマップコンポーネント（投稿時間帯の可視化）

---

## 機能の担当分け：Web UI vs MCP Server

| 機能 | Web UI | MCP Server | 理由 |
|------|--------|------------|------|
| ダッシュボード | ◎ | — | グラフ・チャートはビジュアル必須 |
| ファネル可視化 | ◎ | ○ | 図はWeb、分析はMCP |
| UTMリンク管理 | ◎ | ○ | Web UIで一覧管理、MCPで素早く生成 |
| メトリクス閲覧 | ○ | ◎ | Webで全体俯瞰、MCPで深掘り質問 |
| 記者エージェント | — | ◎ | 対話型 → Claude Maxが最適 |
| パフォーマンス分析 | — | ◎ | LLM推論が中心 → Max内で完結 |
| 投稿最適化 | ○ | ◎ | ヒートマップはWeb、提案はMCP |
| 設定・認証 | ◎ | — | OAuthフローはWebが必要 |
| Stripe連携 | ◎ | — | WebhookはWebサーバーが受信 |

---

## 各フェーズの成果物とマイルストーン

| フェーズ | 成果物 | 完了条件 |
|---------|--------|---------|
| **P0** | プロジェクト基盤、DB、認証、UTMリンク管理、MCP Server初期版 | UTMリンクをWeb UI・Claude Code両方から生成でき、クリック計測ができる |
| **P1** | 3プラットフォームのメトリクス収集、記者AI MVP | 数値が自動収集され、Claude Code上でインタビュー→3形式の記事を生成できる |
| **P2** | ダッシュボード、Stripe連携、ファネル可視化 | 認知→信頼→購入のファネルがWebで見え、MCPで深掘り分析できる |
| **P3** | 分析エンジン、最適化エンジン | Claude Code上でデータに基づく改善提案を受け取れる |

---

## 外部ツールとの連携方針（ハイブリッド運用）

マーケットリサーチの方針通り、全てを自作せず既存ツールの強みを活かす。

| 領域 | 方針 | ツール |
|------|------|--------|
| X投稿スケジューリング | **既存ツール** | Buffer（無料プラン） |
| SNS画像作成 | **既存ツール** | Canva（無料プラン） |
| アイデア・下書き管理 | **既存ツール** | Notion |
| UTMリンク管理 | **自作** | ContentPilot（Web UI + MCP） |
| クロスプラットフォーム計測 | **自作** | ContentPilot（Web UI + MCP） |
| 収益ファネル可視化 | **自作** | ContentPilot（Web UI + MCP） |
| 記者エージェント | **自作** | ContentPilot（MCP Server → Claude Max） |
| パフォーマンス分析 | **自作** | ContentPilot（MCP Server → Claude Max） |

---

## 運用コスト見積もり

| サービス | プラン | 月額 |
|---------|--------|------|
| Supabase | Free | ¥0 |
| Vercel | Hobby | ¥0 |
| X API | Free tier | ¥0 |
| Claude Max | 契約済み | ¥0（追加費用なし） |
| Stripe | 決済手数料のみ | 3.6% |
| ドメイン | 年額 | ¥1,500/年 |
| **合計** | | **¥0/月**（ドメイン除く） |

※ Claude APIの従量課金が不要になったため、月額の追加コストは実質ゼロ。

---

*作成日: 2026年2月13日*
*更新日: 2026年2月13日*
*プロジェクト: ContentPilot (hiraku)*
