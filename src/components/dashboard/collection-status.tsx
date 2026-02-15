"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CollectionStatusProps {
  lastCollectedAt: string | null;
  onCollect: () => Promise<void>;
}

export function CollectionStatus({
  lastCollectedAt,
  onCollect,
}: CollectionStatusProps) {
  const [collecting, setCollecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCollect = async () => {
    setCollecting(true);
    setMessage(null);
    try {
      await onCollect();
      setMessage("完了");
    } catch {
      setMessage("エラー");
    } finally {
      setCollecting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3">
      {lastCollectedAt && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          最終: {formatDate(lastCollectedAt)}
        </span>
      )}
      {message && (
        <span
          className={`text-xs ${message === "エラー" ? "text-red-500" : "text-emerald-600"}`}
        >
          {message}
        </span>
      )}
      <Button onClick={handleCollect} disabled={collecting} size="sm" variant="outline">
        {collecting ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            収集中
          </span>
        ) : (
          "データ収集"
        )}
      </Button>
    </div>
  );
}
