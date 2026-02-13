export default function Dashboard() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            ContentPilot
          </h1>
          <nav className="flex gap-6 text-sm">
            <a href="/dashboard" className="text-neutral-900 dark:text-neutral-100 font-medium">
              ダッシュボード
            </a>
            <a href="/dashboard/utm" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
              UTMリンク
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
          ダッシュボード
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">X インプレッション</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">--</p>
          </div>
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Zenn PV</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">--</p>
          </div>
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">note PV</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">--</p>
          </div>
        </div>

        <p className="mt-8 text-sm text-neutral-400">
          データ連携を設定すると、ここにメトリクスが表示されます。
        </p>
      </main>
    </div>
  );
}
