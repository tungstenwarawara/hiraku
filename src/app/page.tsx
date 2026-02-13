export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <main className="flex flex-col items-center gap-8 px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          ContentPilot
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-md">
          X + Zenn + note を一元管理
          <br />
          収益ファネルの可視化とAI記者エージェント
        </p>

        <div className="flex gap-4 mt-4">
          <a
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-700 transition-colors dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            ダッシュボードへ
          </a>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              UTMリンク管理
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              クロスプラットフォーム計測
            </p>
          </div>
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              収益ファネル
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              認知→信頼→購入を可視化
            </p>
          </div>
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              記者エージェント
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              AIインタビューで記事生成
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
