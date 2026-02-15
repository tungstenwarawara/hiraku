"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { ContentRanking } from "@/components/dashboard/content-ranking";
import { CollectionStatus } from "@/components/dashboard/collection-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Types ─────────────────────────────────────────────────

interface FunnelSummary {
  awareness: {
    zennFollowers: number;
    noteFollowers: number;
    totalArticles: number;
    zennArticles: number;
    noteArticles: number;
    followerTrend: number;
  };
  traffic: {
    utmTotalClicks: number;
    utmTopLinks: Array<{
      url: string;
      source: string;
      clicks: number;
      code: string;
    }>;
  };
  engagement: {
    zennLikes: number;
    zennBookmarks: number;
    zennComments: number;
    noteLikes: number;
    noteComments: number;
    engagementTrend: number;
  };
  revenue: {
    totalRevenue: number;
    message: string;
  };
  lastCollectedAt: string | null;
}

interface MetricRow {
  platform: string;
  content_id: string;
  content_title: string;
  content_url: string;
  metric_type: string;
  metric_value: number;
  collected_date: string;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number | undefined;
}

interface ContentItem {
  content_id: string;
  content_title: string;
  content_url: string;
  platform: string;
  likes: number;
  bookmarks?: number;
  comments?: number;
}

// ─── Funnel Section Component ──────────────────────────────

function FunnelSection({
  label,
  description,
  color,
  children,
}: {
  label: string;
  description: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${color}`} />
        <div>
          <h3 className="text-lg font-semibold">{label}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// ─── Main Dashboard ────────────────────────────────────────

export default function DashboardPage() {
  const [summary, setSummary] = useState<FunnelSummary | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topContents, setTopContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, metricsRes] = await Promise.all([
        fetch("/api/metrics/summary"),
        fetch("/api/metrics?period=30d"),
      ]);

      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }

      if (metricsRes.ok) {
        const metrics: MetricRow[] = await metricsRes.json();
        processChartData(metrics);
        processContentRanking(metrics);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const processChartData = (metrics: MetricRow[]) => {
    const byDate = new Map<string, ChartDataPoint>();

    for (const m of metrics) {
      // Skip profile metrics from chart
      if (m.content_id === "__profile__") continue;

      const date = m.collected_date;
      if (!byDate.has(date)) {
        byDate.set(date, { date });
      }
      const point = byDate.get(date)!;
      const key = `${m.platform}_${m.metric_type}`;
      point[key] = ((point[key] as number) ?? 0) + m.metric_value;
    }

    const sorted = Array.from(byDate.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setChartData(sorted);
  };

  const processContentRanking = (metrics: MetricRow[]) => {
    const contentMap = new Map<string, ContentItem>();

    for (const m of metrics) {
      // Skip profile metrics from ranking
      if (m.content_id === "__profile__") continue;

      const key = `${m.platform}:${m.content_id}`;
      if (!contentMap.has(key)) {
        contentMap.set(key, {
          content_id: m.content_id,
          content_title: m.content_title || m.content_id,
          content_url: m.content_url || "",
          platform: m.platform,
          likes: 0,
          bookmarks: 0,
          comments: 0,
        });
      }
      const item = contentMap.get(key)!;
      if (m.metric_type === "likes")
        item.likes = Math.max(item.likes, m.metric_value);
      if (m.metric_type === "bookmarks")
        item.bookmarks = Math.max(item.bookmarks ?? 0, m.metric_value);
      if (m.metric_type === "comments")
        item.comments = Math.max(item.comments ?? 0, m.metric_value);
    }

    const sorted = Array.from(contentMap.values()).sort(
      (a, b) => b.likes - a.likes
    );
    setTopContents(sorted);
  };

  const handleCollect = async () => {
    const res = await fetch("/api/metrics/collect", { method: "POST" });
    if (!res.ok) {
      throw new Error("Collection failed");
    }
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const awareness = summary?.awareness;
  const traffic = summary?.traffic;
  const engagement = summary?.engagement;

  return (
    <>
      {/* Header + Collection Status */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">ダッシュボード</h2>
        <CollectionStatus
          lastCollectedAt={summary?.lastCollectedAt ?? null}
          onCollect={handleCollect}
        />
      </div>

      {/* ═══ Funnel: Awareness ═══ */}
      <FunnelSection
        label="認知 (Awareness)"
        description="あなたのコンテンツがどれだけ知られているか"
        color="from-violet-500 to-purple-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Zenn フォロワー"
            value={awareness?.zennFollowers ?? 0}
            trend={awareness?.followerTrend}
            trendLabel=" (7d)"
            subtitle="zenn.dev"
            gradient="from-violet-500 to-purple-600"
          />
          <MetricCard
            title="note フォロワー"
            value={awareness?.noteFollowers ?? 0}
            subtitle="note.com"
            gradient="from-emerald-500 to-teal-600"
          />
          <MetricCard
            title="公開記事数"
            value={awareness?.totalArticles ?? 0}
            subtitle={`Zenn ${awareness?.zennArticles ?? 0} / note ${awareness?.noteArticles ?? 0}`}
            gradient="from-blue-500 to-cyan-600"
          />
        </div>
      </FunnelSection>

      {/* Funnel arrow */}
      <div className="flex justify-center mb-4">
        <div className="text-muted-foreground text-xl">▼</div>
      </div>

      {/* ═══ Funnel: Traffic ═══ */}
      <FunnelSection
        label="流入 (Traffic)"
        description="プロフィールやコンテンツへのアクセス"
        color="from-orange-500 to-rose-600"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MetricCard
            title="UTM クリック合計"
            value={traffic?.utmTotalClicks ?? 0}
            subtitle={`${traffic?.utmTopLinks?.length ?? 0} リンク`}
            gradient="from-orange-500 to-rose-600"
          />
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  UTM リンク別クリック
                </CardTitle>
                <Link
                  href="/dashboard/utm"
                  className="text-xs text-violet-600 hover:underline"
                >
                  管理ページへ →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {traffic?.utmTopLinks && traffic.utmTopLinks.length > 0 ? (
                <div className="space-y-2">
                  {traffic.utmTopLinks.map((link) => (
                    <div
                      key={link.code}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {link.source}
                        </Badge>
                        <span className="truncate text-muted-foreground">
                          {link.url}
                        </span>
                      </div>
                      <span className="font-medium ml-2 shrink-0">
                        {link.clicks}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  UTM リンクを作成して流入を追跡しましょう
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </FunnelSection>

      {/* Funnel arrow */}
      <div className="flex justify-center mb-4">
        <div className="text-muted-foreground text-xl">▼</div>
      </div>

      {/* ═══ Funnel: Engagement ═══ */}
      <FunnelSection
        label="エンゲージメント (Engagement)"
        description="読者がどれだけ反応しているか"
        color="from-pink-500 to-rose-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <MetricCard
            title="いいね合計"
            value={
              (engagement?.zennLikes ?? 0) + (engagement?.noteLikes ?? 0)
            }
            trend={engagement?.engagementTrend}
            subtitle={`Zenn ${engagement?.zennLikes ?? 0} / note ${engagement?.noteLikes ?? 0}`}
            gradient="from-pink-500 to-rose-600"
          />
          <MetricCard
            title="ブックマーク"
            value={engagement?.zennBookmarks ?? 0}
            subtitle="Zenn"
            gradient="from-violet-400 to-indigo-500"
          />
          <MetricCard
            title="コメント合計"
            value={
              (engagement?.zennComments ?? 0) +
              (engagement?.noteComments ?? 0)
            }
            subtitle={`Zenn ${engagement?.zennComments ?? 0} / note ${engagement?.noteComments ?? 0}`}
            gradient="from-amber-500 to-orange-600"
          />
        </div>

        {/* Chart */}
        <div className="mb-6">
          <MetricsChart data={chartData} title="エンゲージメント推移（30日間）" />
        </div>

        {/* Content Ranking */}
        <ContentRanking contents={topContents} />
      </FunnelSection>

      {/* Funnel arrow */}
      <div className="flex justify-center mb-4">
        <div className="text-muted-foreground text-xl">▼</div>
      </div>

      {/* ═══ Funnel: Revenue ═══ */}
      <FunnelSection
        label="収益化 (Revenue)"
        description="コンテンツから生まれた収益"
        color="from-yellow-500 to-amber-600"
      >
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground/50">
                ¥0
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {summary?.revenue?.message ?? "Stripe 連携で収益を追跡"}
              </p>
            </div>
          </CardContent>
        </Card>
      </FunnelSection>
    </>
  );
}
