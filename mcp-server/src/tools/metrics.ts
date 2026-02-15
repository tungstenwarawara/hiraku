import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabase } from "../lib/supabase.js";

export function registerMetricsTools(server: McpServer) {
  server.tool(
    "get_metrics",
    "プラットフォーム別のメトリクスを取得する",
    {
      user_id: z.string().describe("ユーザーID"),
      platform: z.string().optional().describe("プラットフォーム (x, zenn, note)"),
      period: z.string().optional().default("7d").describe("期間 (7d, 30d, 90d)"),
    },
    async ({ user_id, platform, period }) => {
      const supabase = getSupabase();

      const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
      const since = new Date();
      since.setDate(since.getDate() - days);

      let query = supabase
        .from("metrics")
        .select("*")
        .eq("user_id", user_id)
        .gte("collected_at", since.toISOString())
        .order("collected_at", { ascending: false });

      if (platform) {
        query = query.eq("platform", platform);
      }

      const { data, error } = await query;

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      if (!data || data.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `直近${days}日間のメトリクスデータはありません。${platform ? `(platform: ${platform})` : ""}`,
            },
          ],
        };
      }

      // Group by platform and metric_type
      const grouped: Record<string, Record<string, number>> = {};
      for (const m of data) {
        if (!grouped[m.platform]) grouped[m.platform] = {};
        if (!grouped[m.platform][m.metric_type]) grouped[m.platform][m.metric_type] = 0;
        grouped[m.platform][m.metric_type] += Number(m.metric_value);
      }

      const lines: string[] = [`メトリクス (直近${days}日間):`];
      for (const [plat, metrics] of Object.entries(grouped)) {
        lines.push(`\n[${plat}]`);
        for (const [type, value] of Object.entries(metrics)) {
          lines.push(`  ${type}: ${value.toLocaleString()}`);
        }
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }
  );

  server.tool(
    "get_funnel",
    "収益ファネルデータを取得する",
    {
      user_id: z.string().describe("ユーザーID"),
      period: z.string().optional().default("30d").describe("期間 (7d, 30d, 90d)"),
    },
    async ({ user_id, period }) => {
      const supabase = getSupabase();

      const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Get impressions (X metrics)
      const { data: impressions } = await supabase
        .from("metrics")
        .select("metric_value")
        .eq("user_id", user_id)
        .eq("metric_type", "impressions")
        .gte("collected_at", since.toISOString());

      // Get UTM clicks
      const { data: utmLinks } = await supabase
        .from("utm_links")
        .select("click_count")
        .eq("user_id", user_id);

      // Get content views (PV)
      const { data: views } = await supabase
        .from("metrics")
        .select("metric_value")
        .eq("user_id", user_id)
        .eq("metric_type", "views")
        .gte("collected_at", since.toISOString());

      // Get revenue
      const { data: revenue } = await supabase
        .from("revenue_events")
        .select("amount")
        .eq("user_id", user_id)
        .eq("event_type", "payment")
        .gte("occurred_at", since.toISOString());

      const totalImpressions = impressions?.reduce((s, m) => s + Number(m.metric_value), 0) ?? 0;
      const totalClicks = utmLinks?.reduce((s, l) => s + l.click_count, 0) ?? 0;
      const totalViews = views?.reduce((s, m) => s + Number(m.metric_value), 0) ?? 0;
      const totalRevenue = revenue?.reduce((s, r) => s + r.amount, 0) ?? 0;

      const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "N/A";
      const viewRate = totalClicks > 0 ? ((totalViews / totalClicks) * 100).toFixed(2) : "N/A";
      const cvr = totalViews > 0 ? ((revenue?.length ?? 0) / totalViews * 100).toFixed(2) : "N/A";

      const text = [
        `収益ファネル (直近${days}日間):`,
        ``,
        `認知 (インプレッション): ${totalImpressions.toLocaleString()}`,
        `  ↓ CTR: ${ctr}%`,
        `流入 (UTMクリック): ${totalClicks.toLocaleString()}`,
        `  ↓ 閲覧率: ${viewRate}%`,
        `信頼 (PV): ${totalViews.toLocaleString()}`,
        `  ↓ CVR: ${cvr}%`,
        `購入 (売上): ¥${totalRevenue.toLocaleString()} (${revenue?.length ?? 0}件)`,
      ].join("\n");

      return { content: [{ type: "text" as const, text }] };
    }
  );

  // import_metrics: Manual import for X or other platform data
  server.tool(
    "import_metrics",
    "メトリクスを手動でインポートする（X のデータなど、API で取得できないもの）",
    {
      user_id: z.string().describe("ユーザーID"),
      platform: z.string().describe("プラットフォーム (x, zenn, note)"),
      entries: z
        .array(
          z.object({
            content_id: z.string().describe("コンテンツID（ツイートIDや記事スラッグ）"),
            content_title: z.string().optional().describe("コンテンツのタイトル"),
            content_url: z.string().optional().describe("コンテンツのURL"),
            impressions: z.number().optional().describe("インプレッション数"),
            likes: z.number().optional().describe("いいね数"),
            retweets: z.number().optional().describe("リツイート数"),
            replies: z.number().optional().describe("リプライ数"),
            views: z.number().optional().describe("PV数"),
            bookmarks: z.number().optional().describe("ブックマーク数"),
            comments: z.number().optional().describe("コメント数"),
          })
        )
        .describe("インポートするメトリクスのリスト"),
    },
    async ({ user_id, platform, entries }) => {
      const supabase = getSupabase();
      const today = new Date().toISOString().split("T")[0];

      const metrics: Array<{
        user_id: string;
        platform: string;
        content_id: string;
        content_title: string;
        content_url: string;
        metric_type: string;
        metric_value: number;
        collected_date: string;
      }> = [];

      for (const entry of entries) {
        const metricTypes: Array<{ type: string; value: number | undefined }> = [
          { type: "impressions", value: entry.impressions },
          { type: "likes", value: entry.likes },
          { type: "retweets", value: entry.retweets },
          { type: "replies", value: entry.replies },
          { type: "views", value: entry.views },
          { type: "bookmarks", value: entry.bookmarks },
          { type: "comments", value: entry.comments },
        ];

        for (const m of metricTypes) {
          if (m.value !== undefined && m.value > 0) {
            metrics.push({
              user_id,
              platform,
              content_id: entry.content_id,
              content_title: entry.content_title ?? "",
              content_url: entry.content_url ?? "",
              metric_type: m.type,
              metric_value: m.value,
              collected_date: today,
            });
          }
        }
      }

      if (metrics.length === 0) {
        return {
          content: [{ type: "text" as const, text: "インポートするメトリクスがありません。" }],
        };
      }

      const { error } = await supabase
        .from("metrics")
        .upsert(metrics, {
          onConflict: "user_id,platform,content_id,metric_type,collected_date",
        });

      if (error) {
        return {
          content: [{ type: "text" as const, text: `インポートエラー: ${error.message}` }],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `${entries.length}件のコンテンツから${metrics.length}件のメトリクスをインポートしました。`,
          },
        ],
      };
    }
  );

  // collect_metrics: Trigger Zenn/note data collection
  server.tool(
    "collect_metrics",
    "Zenn・note からメトリクスを自動収集する（設定済みのユーザー名が必要）",
    {
      user_id: z.string().describe("ユーザーID"),
    },
    async ({ user_id }) => {
      const supabase = getSupabase();

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("zenn_username, note_username")
        .eq("id", user_id)
        .single();

      if (profileError || !profile) {
        return {
          content: [
            { type: "text" as const, text: "プロフィールが見つかりません。設定ページでユーザー名を登録してください。" },
          ],
        };
      }

      const results: string[] = ["メトリクス収集結果:"];

      // Collect Zenn
      if (profile.zenn_username?.trim()) {
        try {
          const zennUrl = `https://zenn.dev/api/articles?username=${encodeURIComponent(profile.zenn_username)}&order=latest`;
          const res = await fetch(zennUrl, { headers: { "User-Agent": "ContentPilot-MCP/0.1" } });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const articles = data.articles || [];

          const today = new Date().toISOString().split("T")[0];
          const metrics: Array<Record<string, string | number>> = [];

          for (const article of articles) {
            for (const [type, value] of [
              ["likes", article.liked_count],
              ["bookmarks", article.bookmarked_count],
              ["comments", article.comments_count],
            ] as [string, number][]) {
              metrics.push({
                user_id,
                platform: "zenn",
                content_id: article.slug,
                content_url: `https://zenn.dev${article.path}`,
                content_title: article.title,
                metric_type: type,
                metric_value: value,
                collected_date: today,
              });
            }
          }

          if (metrics.length > 0) {
            await supabase
              .from("metrics")
              .upsert(metrics, { onConflict: "user_id,platform,content_id,metric_type,collected_date" });
          }

          results.push(`  Zenn: ${articles.length}記事を収集`);

          // 2. Profile metrics (followers, total_likes)
          try {
            const profileRes = await fetch(
              `https://zenn.dev/api/users/${encodeURIComponent(profile.zenn_username)}`,
              { headers: { "User-Agent": "ContentPilot-MCP/0.1" } }
            );
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              const zp = profileData.user;
              const profileMetrics = [
                { type: "followers", value: zp.follower_count },
                { type: "total_likes", value: zp.total_liked_count },
                { type: "articles_count", value: zp.articles_count },
              ].map((m) => ({
                user_id,
                platform: "zenn",
                content_id: "__profile__",
                content_url: `https://zenn.dev/${zp.username}`,
                content_title: `${zp.username} profile`,
                metric_type: m.type,
                metric_value: m.value,
                collected_date: today,
              }));
              await supabase.from("metrics").upsert(profileMetrics, { onConflict: "user_id,platform,content_id,metric_type,collected_date" });
              results.push(`  Zenn profile: フォロワー ${zp.follower_count}`);
            }
          } catch {
            // Non-critical
          }
        } catch (e) {
          results.push(`  Zenn: エラー - ${e instanceof Error ? e.message : "不明"}`);
        }
      } else {
        results.push("  Zenn: ユーザー名未設定");
      }

      // Collect note (RSS primary + API supplementary)
      if (profile.note_username?.trim()) {
        try {
          const today = new Date().toISOString().split("T")[0];

          // 1. RSS: article list (primary, reliable)
          const rssUrl = `https://note.com/${encodeURIComponent(profile.note_username)}/rss`;
          const rssRes = await fetch(rssUrl, { headers: { "User-Agent": "ContentPilot-MCP/0.1" } });

          if (!rssRes.ok) throw new Error(`RSS HTTP ${rssRes.status}`);
          const xml = await rssRes.text();
          const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
          const rssContents: Array<Record<string, string>> = [];

          for (const item of items) {
            const title = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? "";
            const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
            const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";
            const idMatch = link.match(/\/n\/([a-zA-Z0-9]+)/);

            if (title && link) {
              rssContents.push({
                user_id,
                platform: "note",
                external_id: idMatch ? idMatch[1] : link,
                title,
                url: link,
                published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                status: "published",
              });
            }
          }

          if (rssContents.length > 0) {
            await supabase.from("contents").upsert(rssContents, { onConflict: "user_id,platform,external_id" });
          }
          results.push(`  note: ${rssContents.length}記事を収集（RSS）`);

          // 2. JSON API: article metrics (supplementary)
          try {
            const apiRes = await fetch(
              `https://note.com/api/v2/creators/${encodeURIComponent(profile.note_username)}/contents?kind=note&page=1`,
              { headers: { "User-Agent": "ContentPilot-MCP/0.1" } }
            );
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              const notes = apiData.data?.contents ?? [];
              const noteMetrics: Array<Record<string, string | number>> = [];
              for (const n of notes) {
                const key = n.key ?? String(n.id);
                const noteUrl = n.noteUrl ?? `https://note.com/${profile.note_username}/n/${key}`;
                for (const [type, value] of [["likes", n.likeCount ?? 0], ["comments", n.commentCount ?? 0]] as [string, number][]) {
                  noteMetrics.push({ user_id, platform: "note", content_id: key, content_url: noteUrl, content_title: n.name ?? "", metric_type: type, metric_value: value, collected_date: today });
                }
              }
              if (noteMetrics.length > 0) {
                await supabase.from("metrics").upsert(noteMetrics, { onConflict: "user_id,platform,content_id,metric_type,collected_date" });
              }
              results.push(`  note API: ${notes.length}記事のメトリクス収集`);
            }
          } catch {
            // Non-critical: RSS already saved
          }

          // 3. Profile metrics (supplementary)
          try {
            const noteProfileRes = await fetch(
              `https://note.com/api/v2/creators/${encodeURIComponent(profile.note_username)}`,
              { headers: { "User-Agent": "ContentPilot-MCP/0.1" } }
            );
            if (noteProfileRes.ok) {
              const noteProfileData = await noteProfileRes.json();
              const d = noteProfileData.data;
              const profileMetrics = [
                { type: "followers", value: d?.followerCount ?? 0 },
                { type: "articles_count", value: d?.noteCount ?? 0 },
              ].map((m) => ({ user_id, platform: "note", content_id: "__profile__", content_url: `https://note.com/${profile.note_username}`, content_title: `${profile.note_username} profile`, metric_type: m.type, metric_value: m.value, collected_date: today }));
              await supabase.from("metrics").upsert(profileMetrics, { onConflict: "user_id,platform,content_id,metric_type,collected_date" });
              results.push(`  note profile: フォロワー ${d?.followerCount ?? 0}`);
            }
          } catch {
            // Non-critical
          }
        } catch (e) {
          results.push(`  note: エラー - ${e instanceof Error ? e.message : "不明"}`);
        }
      } else {
        results.push("  note: ユーザー名未設定");
      }

      // Update last_collected_at
      await supabase
        .from("profiles")
        .update({ last_collected_at: new Date().toISOString() })
        .eq("id", user_id);

      return {
        content: [{ type: "text" as const, text: results.join("\n") }],
      };
    }
  );
}
