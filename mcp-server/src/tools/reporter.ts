import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabase } from "../lib/supabase.js";

export function registerReporterTools(server: McpServer) {
  server.tool(
    "start_interview",
    "記者エージェントのインタビューセッションを開始する",
    {
      user_id: z.string().describe("ユーザーID"),
      theme: z.string().describe("インタビューのテーマ"),
    },
    async ({ user_id, theme }) => {
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from("interview_sessions")
        .insert({
          user_id,
          title: theme,
          status: "in_progress",
          messages: [],
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `インタビューセッションを開始しました。`,
              `セッションID: ${data.id}`,
              `テーマ: ${theme}`,
              ``,
              `このテーマについて深掘りしていきます。`,
              `以下の質問に自由に回答してください。回答はsave_interview_answerツールで保存できます。`,
            ].join("\n"),
          },
        ],
      };
    }
  );

  server.tool(
    "save_interview_answer",
    "インタビューの回答を保存する",
    {
      session_id: z.string().describe("セッションID"),
      answers: z.array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      ).describe("質問と回答のペア"),
    },
    async ({ session_id, answers }) => {
      const supabase = getSupabase();

      // Get current session
      const { data: session, error: fetchError } = await supabase
        .from("interview_sessions")
        .select("messages")
        .eq("id", session_id)
        .single();

      if (fetchError || !session) {
        return { content: [{ type: "text" as const, text: `Error: Session not found` }] };
      }

      const currentMessages = (session.messages as Array<Record<string, string>>) ?? [];
      const newMessages = [
        ...currentMessages,
        ...answers.map((a) => ({
          role: "qa",
          question: a.question,
          answer: a.answer,
          timestamp: new Date().toISOString(),
        })),
      ];

      const { error } = await supabase
        .from("interview_sessions")
        .update({
          messages: newMessages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session_id);

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `${answers.length}件の回答を保存しました（合計${newMessages.length}件）。`,
          },
        ],
      };
    }
  );

  server.tool(
    "generate_articles",
    "インタビューからマルチ形式の記事を生成する（生成結果を保存）",
    {
      session_id: z.string().describe("セッションID"),
      formats: z
        .array(z.enum(["zenn", "note", "x"]))
        .describe("生成する形式 (zenn, note, x)"),
      generated_contents: z
        .record(z.string(), z.string())
        .describe("Claudeが生成した各形式のコンテンツ"),
    },
    async ({ session_id, generated_contents }) => {
      const supabase = getSupabase();

      const { error } = await supabase
        .from("interview_sessions")
        .update({
          status: "completed",
          generated_contents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session_id);

      if (error) {
        return { content: [{ type: "text" as const, text: `Error: ${error.message}` }] };
      }

      const formatNames = Object.keys(generated_contents);
      return {
        content: [
          {
            type: "text" as const,
            text: `${formatNames.length}形式の記事を保存しました: ${formatNames.join(", ")}`,
          },
        ],
      };
    }
  );
}
