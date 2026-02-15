"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CollectionStatusProps {
  lastCollectedAt: string | null;
  onCollect: () => Promise<void>;
}

export function CollectionStatus({ lastCollectedAt, onCollect }: CollectionStatusProps) {
  const [collecting, setCollecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCollect = async () => {
    setCollecting(true);
    setMessage(null);
    try {
      await onCollect();
      setMessage("データ収集が完了しました");
    } catch {
      setMessage("収集中にエラーが発生しました");
    } finally {
      setCollecting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">データ収集</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          {lastCollectedAt ? (
            <span>最終収集: {formatDate(lastCollectedAt)}</span>
          ) : (
            <span>まだデータを収集していません</span>
          )}
        </div>
        <Button
          onClick={handleCollect}
          disabled={collecting}
          size="sm"
          className="w-full"
        >
          {collecting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              収集中...
            </span>
          ) : (
            "今すぐ収集"
          )}
        </Button>
        {message && (
          <p className={`text-xs ${message.includes("エラー") ? "text-red-500" : "text-emerald-600"}`}>
            {message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          設定ページでZenn・noteのユーザー名を登録してください。
        </p>
      </CardContent>
    </Card>
  );
}
