import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PlatformSummary {
  likes: number;
  bookmarks?: number;
  comments: number;
  articles: number;
  trend: number; // percentage change from previous period
}

/**
 * GET /api/metrics/summary
 * Returns aggregated summary metrics for the dashboard cards.
 * Compares current 7-day period with previous 7-day period for trend.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 7);
  const previousStart = new Date(now);
  previousStart.setDate(previousStart.getDate() - 14);

  // Fetch current period metrics
  const { data: currentMetrics } = await supabase
    .from("metrics")
    .select("platform, metric_type, metric_value, content_id")
    .eq("user_id", user.id)
    .gte("collected_date", currentStart.toISOString().split("T")[0]);

  // Fetch previous period metrics
  const { data: previousMetrics } = await supabase
    .from("metrics")
    .select("platform, metric_type, metric_value, content_id")
    .eq("user_id", user.id)
    .gte("collected_date", previousStart.toISOString().split("T")[0])
    .lt("collected_date", currentStart.toISOString().split("T")[0]);

  // Fetch content counts per platform
  const { data: contentCounts } = await supabase
    .from("contents")
    .select("platform")
    .eq("user_id", user.id);

  // Fetch UTM click total
  const { data: utmLinks } = await supabase
    .from("utm_links")
    .select("click_count")
    .eq("user_id", user.id);

  const totalClicks = utmLinks?.reduce((sum, l) => sum + (l.click_count || 0), 0) ?? 0;

  // Aggregate by platform
  const aggregate = (
    metrics: typeof currentMetrics,
    platform: string
  ): Omit<PlatformSummary, "trend" | "articles"> => {
    const platformMetrics = metrics?.filter((m) => m.platform === platform) ?? [];
    // Get latest value per content per metric_type (most recent snapshot)
    const latestByContent = new Map<string, number>();

    for (const m of platformMetrics) {
      const key = `${m.content_id}:${m.metric_type}`;
      // Take the max value (latest snapshot)
      latestByContent.set(key, Math.max(latestByContent.get(key) ?? 0, m.metric_value));
    }

    let likes = 0;
    let bookmarks = 0;
    let comments = 0;

    for (const [key, value] of latestByContent) {
      if (key.endsWith(":likes")) likes += value;
      if (key.endsWith(":bookmarks")) bookmarks += value;
      if (key.endsWith(":comments")) comments += value;
    }

    return { likes, bookmarks, comments };
  };

  const calcTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const zennCurrent = aggregate(currentMetrics, "zenn");
  const zennPrevious = aggregate(previousMetrics, "zenn");
  const zennArticles = contentCounts?.filter((c) => c.platform === "zenn").length ?? 0;

  const noteCurrent = aggregate(currentMetrics, "note");
  const noteArticles = contentCounts?.filter((c) => c.platform === "note").length ?? 0;

  const xCurrent = aggregate(currentMetrics, "x");
  const xPrevious = aggregate(previousMetrics, "x");

  // Get profile for last_collected_at
  const { data: profile } = await supabase
    .from("profiles")
    .select("last_collected_at")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    zenn: {
      likes: zennCurrent.likes,
      bookmarks: zennCurrent.bookmarks,
      comments: zennCurrent.comments,
      articles: zennArticles,
      trend: calcTrend(zennCurrent.likes, zennPrevious.likes),
    },
    note: {
      articles: noteArticles,
      likes: noteCurrent.likes,
      comments: noteCurrent.comments,
      trend: 0, // No metrics available via RSS
    },
    x: {
      likes: xCurrent.likes,
      comments: xCurrent.comments,
      trend: calcTrend(xCurrent.likes, xPrevious.likes),
    },
    utm: {
      totalClicks,
    },
    lastCollectedAt: profile?.last_collected_at ?? null,
  });
}
