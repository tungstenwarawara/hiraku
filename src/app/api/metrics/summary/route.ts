import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/metrics/summary
 * Returns funnel-structured summary metrics for the dashboard.
 * Awareness → Traffic → Engagement → Revenue
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 7);
  const previousStart = new Date(now);
  previousStart.setDate(previousStart.getDate() - 14);

  // ─── Fetch all data in parallel ─────────────────────────

  const [
    { data: currentMetrics },
    { data: previousMetrics },
    { data: contentCounts },
    { data: utmLinks },
    { data: profileMetrics },
    { data: previousProfileMetrics },
    { data: profile },
    { data: profileInfo },
  ] = await Promise.all([
    // Current period metrics (excluding __profile__)
    supabase
      .from("metrics")
      .select("platform, metric_type, metric_value, content_id")
      .eq("user_id", user.id)
      .neq("content_id", "__profile__")
      .gte("collected_date", currentStart.toISOString().split("T")[0]),

    // Previous period metrics (excluding __profile__)
    supabase
      .from("metrics")
      .select("platform, metric_type, metric_value, content_id")
      .eq("user_id", user.id)
      .neq("content_id", "__profile__")
      .gte("collected_date", previousStart.toISOString().split("T")[0])
      .lt("collected_date", currentStart.toISOString().split("T")[0]),

    // Content counts
    supabase.from("contents").select("platform").eq("user_id", user.id),

    // UTM links with details
    supabase
      .from("utm_links")
      .select("click_count, original_url, utm_source, short_code")
      .eq("user_id", user.id)
      .order("click_count", { ascending: false })
      .limit(5),

    // Latest profile metrics
    supabase
      .from("metrics")
      .select("platform, metric_type, metric_value, collected_date")
      .eq("user_id", user.id)
      .eq("content_id", "__profile__")
      .order("collected_date", { ascending: false }),

    // Previous profile metrics (7+ days ago)
    supabase
      .from("metrics")
      .select("platform, metric_type, metric_value")
      .eq("user_id", user.id)
      .eq("content_id", "__profile__")
      .lte("collected_date", currentStart.toISOString().split("T")[0])
      .order("collected_date", { ascending: false }),

    // Profile for last_collected_at
    supabase
      .from("profiles")
      .select("last_collected_at")
      .eq("id", user.id)
      .single(),

    // Profile info for completeness check
    supabase
      .from("profiles")
      .select("display_name, x_username, zenn_username, note_username")
      .eq("id", user.id)
      .single(),
  ]);

  // ─── Helper: aggregate engagement metrics ───────────────

  const aggregateEngagement = (
    metrics: typeof currentMetrics,
    platform: string
  ) => {
    const platformMetrics =
      metrics?.filter((m) => m.platform === platform) ?? [];
    const latestByContent = new Map<string, number>();

    for (const m of platformMetrics) {
      const key = `${m.content_id}:${m.metric_type}`;
      latestByContent.set(
        key,
        Math.max(latestByContent.get(key) ?? 0, m.metric_value)
      );
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

  // ─── Extract latest profile values ──────────────────────

  const getLatestProfileValue = (
    platform: string,
    metricType: string
  ): number => {
    const match = profileMetrics?.find(
      (m) => m.platform === platform && m.metric_type === metricType
    );
    return match?.metric_value ?? 0;
  };

  const getPreviousProfileValue = (
    platform: string,
    metricType: string
  ): number => {
    const match = previousProfileMetrics?.find(
      (m) => m.platform === platform && m.metric_type === metricType
    );
    return match?.metric_value ?? 0;
  };

  // ─── Compute funnel data ────────────────────────────────

  // Awareness
  const zennFollowers = getLatestProfileValue("zenn", "followers");
  const noteFollowers = getLatestProfileValue("note", "followers");
  const prevZennFollowers = getPreviousProfileValue("zenn", "followers");
  const prevNoteFollowers = getPreviousProfileValue("note", "followers");
  const zennArticles =
    contentCounts?.filter((c) => c.platform === "zenn").length ?? 0;
  const noteArticles =
    contentCounts?.filter((c) => c.platform === "note").length ?? 0;

  // Traffic
  const totalClicks =
    utmLinks?.reduce((sum, l) => sum + (l.click_count || 0), 0) ?? 0;

  // Engagement
  const zennCurrent = aggregateEngagement(currentMetrics, "zenn");
  const zennPrevious = aggregateEngagement(previousMetrics, "zenn");
  const noteCurrent = aggregateEngagement(currentMetrics, "note");
  const notePrevious = aggregateEngagement(previousMetrics, "note");

  const totalCurrentLikes = zennCurrent.likes + noteCurrent.likes;
  const totalPreviousLikes = zennPrevious.likes + notePrevious.likes;

  // ─── Analysis: profile completeness + engagement rates ──
  const profileFields = ["display_name", "x_username", "zenn_username", "note_username"] as const;
  const filledCount = profileFields.filter(
    (f) => profileInfo?.[f] && (profileInfo[f] as string).trim() !== ""
  ).length;
  const missingFields = profileFields.filter(
    (f) => !profileInfo?.[f] || (profileInfo[f] as string).trim() === ""
  );

  const calcEngagementRate = (platform: string) => {
    const pfMetrics = currentMetrics?.filter(
      (m) => m.platform === platform && m.metric_type === "likes"
    ) ?? [];
    const uniqueArticles = new Set(pfMetrics.map((m) => m.content_id)).size;
    const totalLikes = pfMetrics.reduce((sum, m) => sum + m.metric_value, 0);
    return uniqueArticles > 0 ? Math.round((totalLikes / uniqueArticles) * 10) / 10 : 0;
  };

  return NextResponse.json({
    // Funnel: Awareness
    awareness: {
      zennFollowers,
      noteFollowers,
      totalArticles: zennArticles + noteArticles,
      zennArticles,
      noteArticles,
      followerTrend:
        zennFollowers +
        noteFollowers -
        (prevZennFollowers + prevNoteFollowers),
    },

    // Funnel: Traffic
    traffic: {
      utmTotalClicks: totalClicks,
      utmTopLinks:
        utmLinks?.map((l) => ({
          url: l.original_url,
          source: l.utm_source,
          clicks: l.click_count,
          code: l.short_code,
        })) ?? [],
    },

    // Funnel: Engagement
    engagement: {
      zennLikes: zennCurrent.likes,
      zennBookmarks: zennCurrent.bookmarks ?? 0,
      zennComments: zennCurrent.comments,
      noteLikes: noteCurrent.likes,
      noteComments: noteCurrent.comments,
      engagementTrend: calcTrend(totalCurrentLikes, totalPreviousLikes),
    },

    // Funnel: Revenue (placeholder)
    revenue: {
      totalRevenue: 0,
      message: "Stripe 連携で収益を追跡",
    },

    // Analysis
    analysis: {
      profileCompleteness: {
        score: filledCount,
        total: profileFields.length,
        missing: missingFields as unknown as string[],
      },
      zenn: { engagementRate: calcEngagementRate("zenn") },
      note: { engagementRate: calcEngagementRate("note") },
    },

    // Meta
    lastCollectedAt: profile?.last_collected_at ?? null,
  });
}
