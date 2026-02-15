"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileAnalysisProps {
  analysis: {
    profileCompleteness: {
      score: number;
      total: number;
      missing: string[];
    };
    zenn: { engagementRate: number };
    note: { engagementRate: number };
  };
}

const fieldLabels: Record<string, string> = {
  display_name: "表示名",
  x_username: "X (Twitter)",
  zenn_username: "Zenn",
  note_username: "note",
};

export default function ProfileAnalysis({ analysis }: ProfileAnalysisProps) {
  const { profileCompleteness, zenn, note } = analysis;
  const pct = Math.round((profileCompleteness.score / profileCompleteness.total) * 100);

  return (
    <Card className="border-dashed">
      <CardContent className="py-4 px-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          {/* Profile completeness */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                プロフィール完成度
              </span>
              <span className="text-xs font-bold">
                {profileCompleteness.score}/{profileCompleteness.total}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-violet-500 h-2 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            {profileCompleteness.missing.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                未設定:{" "}
                {profileCompleteness.missing
                  .map((f) => fieldLabels[f] || f)
                  .join(", ")}
                {" "}
                <Link
                  href="/dashboard/settings"
                  className="text-violet-600 hover:underline"
                >
                  設定へ
                </Link>
              </p>
            )}
          </div>

          {/* Engagement rates */}
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground">Zenn ER</p>
              <p className="text-lg font-bold">{zenn.engagementRate}</p>
              <p className="text-[10px] text-muted-foreground">いいね/記事</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground">note ER</p>
              <p className="text-lg font-bold">{note.engagementRate}</p>
              <p className="text-[10px] text-muted-foreground">いいね/記事</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-[11px] text-muted-foreground max-w-[180px]">
            <p>
              Claude Code で{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-[10px]">
                analyze_profile
              </code>{" "}
              を実行すると詳細分析と改善提案が受けられます
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
