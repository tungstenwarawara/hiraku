"use client";

import { useEffect, useState, useCallback } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { ContentRanking } from "@/components/dashboard/content-ranking";
import { CollectionStatus } from "@/components/dashboard/collection-status";

interface Summary {
  zenn: { likes: number; bookmarks: number; comments: number; articles: number; trend: number };
  note: { articles: number; likes: number; comments: number; trend: number };
  x: { likes: number; comments: number; trend: number };
  utm: { totalClicks: number };
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
  zenn_likes?: number;
  zenn_bookmarks?: number;
  x_likes?: number;
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

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
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
      if (m.metric_type === "likes") item.likes = Math.max(item.likes, m.metric_value);
      if (m.metric_type === "bookmarks") item.bookmarks = Math.max(item.bookmarks ?? 0, m.metric_value);
      if (m.metric_type === "comments") item.comments = Math.max(item.comments ?? 0, m.metric_value);
    }

    const sorted = Array.from(contentMap.values()).sort((a, b) => b.likes - a.likes);
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

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">ダッシュボード</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Zenn いいね"
          value={summary?.zenn.likes ?? 0}
          trend={summary?.zenn.trend}
          subtitle={`${summary?.zenn.articles ?? 0} 記事`}
          gradient="from-violet-500 to-purple-600"
        />
        <MetricCard
          title="Zenn ブックマーク"
          value={summary?.zenn.bookmarks ?? 0}
          subtitle="直近7日間"
          gradient="from-violet-400 to-indigo-500"
        />
        <MetricCard
          title="note 記事数"
          value={summary?.note.articles ?? 0}
          subtitle="RSS から取得"
          gradient="from-emerald-500 to-teal-600"
        />
        <MetricCard
          title="UTM クリック"
          value={summary?.utm.totalClicks ?? 0}
          subtitle="全リンク合計"
          gradient="from-orange-500 to-rose-600"
        />
      </div>

      {/* Chart + Collection Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <MetricsChart data={chartData} title="メトリクス推移（30日間）" />
        </div>
        <CollectionStatus
          lastCollectedAt={summary?.lastCollectedAt ?? null}
          onCollect={handleCollect}
        />
      </div>

      {/* Content Ranking */}
      <ContentRanking contents={topContents} />
    </>
  );
}
