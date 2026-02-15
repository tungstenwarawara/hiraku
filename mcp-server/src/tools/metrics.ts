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
}
