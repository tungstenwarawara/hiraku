import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabase } from "../lib/supabase.js";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export function registerUtmTools(server: McpServer) {
  server.tool(
    "create_utm_link",
    "UTMリンクを生成しSupabaseに保存する",
    {
      user_id: z.string().describe("ユーザーID"),
      url: z.string().url().describe("リンク先URL"),
      source: z.string().describe("utm_source (x, zenn, note, other)"),
      medium: z.string().describe("utm_medium (social, article, profile)"),
      campaign: z.string().optional().describe("utm_campaign名"),
      content: z.string().optional().describe("utm_content"),
    },
    async ({ user_id, url, source, medium, campaign, content }) => {
      const supabase = getSupabase();
      const short_code = nanoid();

      const { data, error } = await supabase
        .from("utm_links")
        .insert({
          user_id,
          original_url: url,
          utm_source: source,
          utm_medium: medium,
          utm_campaign: campaign || null,
          utm_content: content || null,
          short_code,
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      const utmUrl = new URL(url);
      utmUrl.searchParams.set("utm_source", source);
      utmUrl.searchParams.set("utm_medium", medium);
      if (campaign) utmUrl.searchParams.set("utm_campaign", campaign);
      if (content) utmUrl.searchParams.set("utm_content", content);

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `UTMリンクを作成しました:`,
              `- 短縮コード: /r/${short_code}`,
              `- UTM付きURL: ${utmUrl.toString()}`,
              `- ID: ${data.id}`,
            ].join("\n"),
          },
        ],
      };
    }
  );

  server.tool(
    "list_utm_links",
    "UTMリンク一覧を取得する",
    {
      user_id: z.string().describe("ユーザーID"),
      limit: z.number().optional().default(20).describe("取得件数"),
      campaign: z.string().optional().describe("キャンペーン名でフィルタ"),
    },
    async ({ user_id, limit, campaign }) => {
      const supabase = getSupabase();

      let query = supabase
        .from("utm_links")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(limit ?? 20);

      if (campaign) {
        query = query.eq("utm_campaign", campaign);
      }

      const { data, error } = await query;

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      if (!data || data.length === 0) {
        return { content: [{ type: "text" as const, text: "UTMリンクはまだありません。" }] };
      }

      const lines = data.map(
        (link) =>
          `- /r/${link.short_code} → ${link.original_url} [${link.utm_source}/${link.utm_medium}] クリック: ${link.click_count}`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `UTMリンク一覧 (${data.length}件):\n${lines.join("\n")}`,
          },
        ],
      };
    }
  );
}
