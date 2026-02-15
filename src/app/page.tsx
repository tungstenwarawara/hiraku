import Link from "next/link";
import { Button } from "@/components/ui/button";

function LinkIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.02a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.343 8.05" transform="translate(2,2) scale(0.85)" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  );
}

const features = [
  {
    icon: <LinkIcon />,
    title: "UTMリンク管理",
    description: "短縮URL発行とクリック計測で、どの投稿からアクセスが来たかを一目で把握",
    gradient: "from-violet-500 to-purple-600",
    bgGlow: "bg-violet-500/10",
  },
  {
    icon: <ChartIcon />,
    title: "収益ファネル",
    description: "認知→流入→信頼→購入の転換率を自動計算。ボトルネックを特定",
    gradient: "from-emerald-500 to-teal-600",
    bgGlow: "bg-emerald-500/10",
  },
  {
    icon: <PenIcon />,
    title: "記者エージェント",
    description: "AIインタビューであなたの知見を引き出し、Zenn・note・Xの3形式で記事を生成",
    gradient: "from-orange-500 to-rose-600",
    bgGlow: "bg-orange-500/10",
  },
];

const platforms = [
  { name: "X", description: "インプレッション・エンゲージメント" },
  { name: "Zenn", description: "PV・いいね・記事パフォーマンス" },
  { name: "note", description: "PV・スキ・売上トラッキング" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-muted/50 text-sm text-muted-foreground mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            個人クリエイターのための運用ツール
          </div>

          {/* Main heading */}
          <h1 className="text-6xl sm:text-7xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-clip-text mb-6">
            Content
            <span className="bg-gradient-to-r from-violet-600 via-emerald-500 to-orange-500 bg-clip-text text-transparent">
              Pilot
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
            X・Zenn・note の発信を一元管理。
            <br className="hidden sm:block" />
            数字で見える化して、収益につなげる。
          </p>

          <p className="text-sm text-muted-foreground/70 max-w-lg mx-auto mb-10">
            UTMリンクで流入を計測、収益ファネルでボトルネックを特定、AI記者エージェントで記事を量産。Claude Max プランで追加API費用ゼロ。
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="text-base px-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25">
              <Link href="/dashboard">ダッシュボードへ</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8">
              <Link href="/login">ログイン</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">3つの武器で発信を加速</h2>
          <p className="text-muted-foreground">クリエイターに必要な機能をワンストップで</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-border/60 bg-card p-8 transition-all duration-300 hover:border-border hover:shadow-xl hover:-translate-y-1"
            >
              {/* Glow effect */}
              <div className={`absolute inset-0 ${feature.bgGlow} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="relative">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} text-white mb-5`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Section */}
      <section className="border-t border-border/60">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">3プラットフォームを横断管理</h2>
            <p className="text-muted-foreground">バラバラだった数字を、ひとつのダッシュボードに</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="flex flex-col items-center p-8 rounded-2xl border border-border/60 bg-card text-center"
              >
                <span className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-emerald-500 bg-clip-text text-transparent mb-3">
                  {platform.name}
                </span>
                <p className="text-sm text-muted-foreground">{platform.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">使い方</h2>
            <p className="text-muted-foreground">Web UI と Claude Code の2つのインターフェース</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-border/60 bg-card p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 text-sm font-medium mb-4">
                Web UI
              </div>
              <h3 className="text-xl font-semibold mb-3">ブラウザで見る</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-violet-500 mt-1">&#9679;</span>
                  ダッシュボードでメトリクスをグラフ表示
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-500 mt-1">&#9679;</span>
                  UTMリンクの作成・一覧管理
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-500 mt-1">&#9679;</span>
                  収益ファネルの可視化
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-medium mb-4">
                Claude Code
              </div>
              <h3 className="text-xl font-semibold mb-3">AIと対話する</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">&#9679;</span>
                  「今週のZennのPVは？」→ 即座に分析
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">&#9679;</span>
                  「この記事のUTMリンク作って」→ 自動生成
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-1">&#9679;</span>
                  「記事にしたい」→ インタビュー→ 3形式で下書き
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/60">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">発信の効果を、数字で実感しよう</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Claude Max プランがあれば追加費用ゼロ。今すぐ始められます。
          </p>
          <Button asChild size="lg" className="text-base px-10 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25">
            <Link href="/dashboard">始める</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center text-sm text-muted-foreground">
          <span>ContentPilot</span>
          <span>Built with Next.js + Supabase + Claude</span>
        </div>
      </footer>
    </div>
  );
}
