"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContentItem {
  content_id: string;
  content_title: string;
  content_url: string;
  platform: string;
  likes: number;
  bookmarks?: number;
  comments?: number;
}

interface ContentRankingProps {
  contents: ContentItem[];
}

const platformColors: Record<string, string> = {
  zenn: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  note: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  x: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

export function ContentRanking({ contents }: ContentRankingProps) {
  if (contents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">コンテンツランキング</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            まだデータがありません。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">コンテンツランキング</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contents.slice(0, 10).map((content, i) => (
            <div key={content.content_id} className="flex items-start gap-3">
              <span className="text-sm font-medium text-muted-foreground w-5 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={content.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline truncate block"
                >
                  {content.content_title}
                </a>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={`text-xs ${platformColors[content.platform] ?? ""}`}>
                    {content.platform}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ♥ {content.likes}
                  </span>
                  {content.bookmarks !== undefined && content.bookmarks > 0 && (
                    <span className="text-xs text-muted-foreground">
                      🔖 {content.bookmarks}
                    </span>
                  )}
                  {content.comments !== undefined && content.comments > 0 && (
                    <span className="text-xs text-muted-foreground">
                      💬 {content.comments}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
