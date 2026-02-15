import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabase } from "../lib/supabase.js";

export function registerAnalyticsTools(server: McpServer) {
  server.tool(
    "analyze_profile",
    "各プラットフォームのプロフィールと活動データを分析し、改善ポイントを構造化して返す。Claudeがこのデータを解釈して具体的な改善提案を行う。",
    {
      user_id: z.string().describe("ユーザーID"),
      platform: z
        .enum(["all", "zenn", "note"])
        .optional()
        .default("all")
        .describe("分析対象プラットフォーム"),
    },
    async ({ user_id, platform }) => {
      const supabase = getSupabase();

      // ─── 1. Profile completeness ────────────────────────
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "display_name, x_username, zenn_username, note_username"
        )
        .eq("id", user_id)
        .single();

      if (!profile) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: プロフィールが見つかりません。設定ページでユーザー名を登録してください。",
            },
          ],
        };
      }

      const profileFields = [
        { name: "display_name", label: "表示名" },
        { name: "x_username", label: "X (Twitter)" },
        { name: "zenn_username", label: "Zenn" },
        { name: "note_username", label: "note" },
      ];
      const filled = profileFields.filter(
        (f) =>
          profile[f.name as keyof typeof profile] &&
          (profile[f.name as keyof typeof profile] as string).trim() !==
            ""
      );
      const missing = profileFields.filter(
        (f) =>
          !profile[f.name as keyof typeof profile] ||
          (profile[f.name as keyof typeof profile] as string).trim() ===
            ""
      );

      // ─── 2. Follower growth (30 days) ──────────────────
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: followerHistory } = await supabase
        .from("metrics")
        .select("platform, metric_value, collected_date")
        .eq("user_id", user_id)
        .eq("content_id", "__profile__")
        .eq("metric_type", "followers")
        .gte(
          "collected_date",
          thirtyDaysAgo.toISOString().split("T")[0]
        )
        .order("collected_date", { ascending: true });

      // ─── 3. Article-level engagement metrics ───────────
      const { data: articleMetrics } = await supabase
        .from("metrics")
        .select(
          "platform, content_id, content_title, metric_type, metric_value"
        )
        .eq("user_id", user_id)
        .neq("content_id", "__profile__")
        .order("metric_value", { ascending: false });

      // ─── 4. Content publishing frequency ───────────────
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: contents } = await supabase
        .from("contents")
        .select("platform, published_at")
        .eq("user_id", user_id)
        .gte(
          "published_at",
          ninetyDaysAgo.toISOString()
        )
        .order("published_at", { ascending: false });

      // ─── 5. Latest profile values ──────────────────────
      const { data: latestProfile } = await supabase
        .from("metrics")
        .select("platform, metric_type, metric_value")
        .eq("user_id", user_id)
        .eq("content_id", "__profile__")
        .order("collected_date", { ascending: false });

      // ─── Compute analytics ─────────────────────────────

      const lines: string[] = [];
      lines.push("=== プロフィール分析レポート ===");
      lines.push("");

      // Profile completeness
      lines.push(`[プロフィール完成度]`);
      lines.push(
        `  スコア: ${filled.length}/${profileFields.length} (${Math.round((filled.length / profileFields.length) * 100)}%)`
      );
      if (missing.length > 0) {
        lines.push(
          `  未設定: ${missing.map((m) => m.label).join(", ")}`
        );
      }
      lines.push("");

      // Per-platform analysis
      const platforms =
        platform === "all" ? ["zenn", "note"] : [platform];

      for (const pf of platforms) {
        lines.push(`[${pf === "zenn" ? "Zenn" : "note"}]`);

        // Latest followers
        const latestFollowers = latestProfile?.find(
          (m) =>
            m.platform === pf && m.metric_type === "followers"
        );
        const latestArticlesCount = latestProfile?.find(
          (m) =>
            m.platform === pf && m.metric_type === "articles_count"
        );

        const currentFollowers = latestFollowers?.metric_value ?? 0;
        lines.push(`  フォロワー: ${currentFollowers}`);

        // Growth velocity
        const pfHistory =
          followerHistory?.filter((h) => h.platform === pf) ?? [];
        if (pfHistory.length >= 2) {
          const oldest = pfHistory[0].metric_value;
          const newest = pfHistory[pfHistory.length - 1].metric_value;
          const daysDiff =
            (new Date(
              pfHistory[pfHistory.length - 1].collected_date
            ).getTime() -
              new Date(pfHistory[0].collected_date).getTime()) /
            (1000 * 60 * 60 * 24);
          const weeklyGrowth =
            daysDiff > 0
              ? ((newest - oldest) / daysDiff) * 7
              : 0;
          lines.push(
            `  成長速度: ${weeklyGrowth >= 0 ? "+" : ""}${weeklyGrowth.toFixed(1)}/週 (${Math.ceil(daysDiff)}日間)`
          );
          lines.push(`  フォロワー増減: ${newest - oldest} (${Math.ceil(daysDiff)}日間)`);
        } else {
          lines.push(
            `  成長速度: データ不足（2日以上の計測が必要）`
          );
        }

        // Article count
        const articleCount =
          latestArticlesCount?.metric_value ?? 0;
        lines.push(`  記事数: ${articleCount}`);

        // Engagement rate per article
        const pfArticleMetrics =
          articleMetrics?.filter((m) => m.platform === pf) ?? [];
        const likesMetrics = pfArticleMetrics.filter(
          (m) => m.metric_type === "likes"
        );
        const bookmarkMetrics = pfArticleMetrics.filter(
          (m) => m.metric_type === "bookmarks"
        );
        const commentMetrics = pfArticleMetrics.filter(
          (m) => m.metric_type === "comments"
        );

        const totalLikes = likesMetrics.reduce(
          (sum, m) => sum + Number(m.metric_value),
          0
        );
        const totalBookmarks = bookmarkMetrics.reduce(
          (sum, m) => sum + Number(m.metric_value),
          0
        );
        const totalComments = commentMetrics.reduce(
          (sum, m) => sum + Number(m.metric_value),
          0
        );

        const uniqueArticles = new Set(
          pfArticleMetrics.map((m) => m.content_id)
        ).size;

        if (uniqueArticles > 0) {
          lines.push(
            `  平均いいね/記事: ${(totalLikes / uniqueArticles).toFixed(1)}`
          );
          if (pf === "zenn") {
            lines.push(
              `  平均ブックマーク/記事: ${(totalBookmarks / uniqueArticles).toFixed(1)}`
            );
          }
          lines.push(
            `  平均コメント/記事: ${(totalComments / uniqueArticles).toFixed(1)}`
          );
          lines.push(
            `  合計エンゲージメント: いいね${totalLikes} / ブックマーク${totalBookmarks} / コメント${totalComments}`
          );
        }

        // Top/Bottom articles
        if (likesMetrics.length > 0) {
          const sorted = [...likesMetrics].sort(
            (a, b) => Number(b.metric_value) - Number(a.metric_value)
          );
          lines.push(`  --- トップ記事 ---`);
          for (const m of sorted.slice(0, 3)) {
            lines.push(
              `    "${m.content_title}" (${m.metric_value}いいね)`
            );
          }
          if (sorted.length > 1) {
            const worst = sorted.slice(-Math.min(2, sorted.length));
            lines.push(`  --- 低パフォーマンス記事 ---`);
            for (const m of worst) {
              lines.push(
                `    "${m.content_title}" (${m.metric_value}いいね)`
              );
            }
          }
        }

        // Publishing frequency
        const pfContents =
          contents?.filter((c) => c.platform === pf) ?? [];
        const thirtyDayContents = pfContents.filter(
          (c) =>
            new Date(c.published_at) >= thirtyDaysAgo
        );
        const ninetyDayContents = pfContents;

        if (ninetyDayContents.length > 0) {
          const freq30 = thirtyDayContents.length / (30 / 7);
          const freq90 = ninetyDayContents.length / (90 / 7);
          lines.push(
            `  投稿頻度: ${freq30.toFixed(1)}記事/週 (30日) / ${freq90.toFixed(1)}記事/週 (90日)`
          );
          lines.push(
            `  投稿数: 直近30日 ${thirtyDayContents.length}件 / 直近90日 ${ninetyDayContents.length}件`
          );
        }

        lines.push("");
      }

      // Cross-platform comparison
      if (platform === "all" && platforms.length === 2) {
        const zennLikes =
          articleMetrics
            ?.filter(
              (m) =>
                m.platform === "zenn" && m.metric_type === "likes"
            )
            .reduce((sum, m) => sum + Number(m.metric_value), 0) ?? 0;
        const noteLikes =
          articleMetrics
            ?.filter(
              (m) =>
                m.platform === "note" && m.metric_type === "likes"
            )
            .reduce((sum, m) => sum + Number(m.metric_value), 0) ?? 0;

        const zennUniqueArticles = new Set(
          articleMetrics
            ?.filter((m) => m.platform === "zenn")
            .map((m) => m.content_id) ?? []
        ).size;
        const noteUniqueArticles = new Set(
          articleMetrics
            ?.filter((m) => m.platform === "note")
            .map((m) => m.content_id) ?? []
        ).size;

        const zennRate =
          zennUniqueArticles > 0
            ? zennLikes / zennUniqueArticles
            : 0;
        const noteRate =
          noteUniqueArticles > 0
            ? noteLikes / noteUniqueArticles
            : 0;

        lines.push(`[クロスプラットフォーム比較]`);
        if (zennRate > 0 && noteRate > 0) {
          const ratio = zennRate / noteRate;
          if (ratio > 1.1) {
            lines.push(
              `  Zennのエンゲージメント率がnoteの${ratio.toFixed(1)}倍`
            );
          } else if (ratio < 0.9) {
            lines.push(
              `  noteのエンゲージメント率がZennの${(1 / ratio).toFixed(1)}倍`
            );
          } else {
            lines.push(
              `  両プラットフォームのエンゲージメント率はほぼ同等`
            );
          }
        }

        const zenn30 =
          contents?.filter(
            (c) =>
              c.platform === "zenn" &&
              new Date(c.published_at) >= thirtyDaysAgo
          ).length ?? 0;
        const note30 =
          contents?.filter(
            (c) =>
              c.platform === "note" &&
              new Date(c.published_at) >= thirtyDaysAgo
          ).length ?? 0;
        lines.push(
          `  直近30日投稿数: Zenn ${zenn30}件 / note ${note30}件`
        );

        const zennFollowers =
          latestProfile?.find(
            (m) =>
              m.platform === "zenn" && m.metric_type === "followers"
          )?.metric_value ?? 0;
        const noteFollowers =
          latestProfile?.find(
            (m) =>
              m.platform === "note" && m.metric_type === "followers"
          )?.metric_value ?? 0;
        lines.push(
          `  フォロワー: Zenn ${zennFollowers} / note ${noteFollowers}`
        );
        lines.push("");
      }

      lines.push(`[分析日時] ${new Date().toISOString()}`);
      lines.push("");
      lines.push(
        "※ このデータを元に、プロフィールの改善提案やコンテンツ戦略のアドバイスを行ってください。"
      );

      return {
        content: [
          {
            type: "text" as const,
            text: lines.join("\n"),
          },
        ],
      };
    }
  );
}
