"use client";

import { useEffect, useState } from "react";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { ContentRanking } from "@/components/dashboard/content-ranking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Period = "7d" | "30d" | "90d";

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

export default function MetricsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [platform, setPlatform] = useState<string>("all");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topContents, setTopContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ period });
        if (platform !== "all") params.set("platform", platform);

        const res = await fetch(`/api/metrics?${params}`);
        if (res.ok) {
          const metrics: MetricRow[] = await res.json();

          // Process chart data
          const byDate = new Map<string, ChartDataPoint>();
          for (const m of metrics) {
            const date = m.collected_date;
            if (!byDate.has(date)) byDate.set(date, { date });
            const point = byDate.get(date)!;
            const key = `${m.platform}_${m.metric_type}`;
            point[key] = ((point[key] as number) ?? 0) + m.metric_value;
          }
          const sorted = Array.from(byDate.values()).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setChartData(sorted);

          // Process content ranking
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
          setTopContents(
            Array.from(contentMap.values()).sort((a, b) => b.likes - a.likes)
          );
        }
      } catch (e) {
        console.error("Failed to fetch metrics:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [period, platform]);

  const periodLabel = { "7d": "7日間", "30d": "30日間", "90d": "90日間" };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">メトリクス詳細</h2>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">期間:</span>
              <div className="flex gap-1">
                {(["7d", "30d", "90d"] as Period[]).map((p) => (
                  <Button
                    key={p}
                    variant={period === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPeriod(p)}
                  >
                    {periodLabel[p]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Platform selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">プラットフォーム:</span>
              <div className="flex gap-1">
                {[
                  { value: "all", label: "すべて" },
                  { value: "zenn", label: "Zenn" },
                  { value: "note", label: "note" },
                  { value: "x", label: "X" },
                ].map((p) => (
                  <Button
                    key={p.value}
                    variant={platform === p.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPlatform(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <MetricsChart
              data={chartData}
              title={`メトリクス推移（${periodLabel[period]}）`}
            />
          </div>
          <ContentRanking contents={topContents} />
        </>
      )}
    </>
  );
}
