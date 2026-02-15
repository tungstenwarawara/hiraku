"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InterviewSessionDetail {
  id: string;
  title: string;
  status: "in_progress" | "completed";
  messages: Array<{ role: string; question: string; answer: string; timestamp: string }>;
  generated_contents: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

const formatLabels: Record<string, string> = {
  zenn: "Zenn",
  note: "note",
  x: "X",
};

export default function InterviewDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<InterviewSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadSession = async () => {
      const res = await fetch(`/api/interviews/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
      setLoading(false);
    };

    loadSession();
  }, [id]);

  const handleCopy = (format: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  if (!session) {
    return (
      <div>
        <Link href="/dashboard/interviews" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; セッション一覧
        </Link>
        <p className="mt-4 text-muted-foreground">セッションが見つかりません。</p>
      </div>
    );
  }

  const messages = session.messages ?? [];
  const hasContents =
    session.generated_contents &&
    Object.keys(session.generated_contents).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/interviews" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; セッション一覧
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h2 className="text-2xl font-bold">{session.title}</h2>
          <Badge variant={session.status === "completed" ? "default" : "secondary"}>
            {session.status === "completed" ? "完了" : "進行中"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          作成: {new Date(session.created_at).toLocaleDateString("ja-JP")}
          {session.updated_at !== session.created_at && (
            <> / 更新: {new Date(session.updated_at).toLocaleDateString("ja-JP")}</>
          )}
        </p>
      </div>

      {/* Interview Q&A */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">インタビュー内容</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              まだインタビューが開始されていません。Claude Code から <code className="bg-muted px-1 py-0.5 rounded">save_interview_answer</code> で回答を保存してください。
            </p>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Q: {msg.question}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.answer}</p>
                  </div>
                  {i < messages.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Articles */}
      {hasContents && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">生成記事</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(session.generated_contents!)[0]}>
              <TabsList>
                {Object.keys(session.generated_contents!).map((fmt) => (
                  <TabsTrigger key={fmt} value={fmt}>
                    {formatLabels[fmt] || fmt}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(session.generated_contents!).map(([fmt, content]) => (
                <TabsContent key={fmt} value={fmt}>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(fmt, content)}
                    >
                      {copied === fmt ? "コピー済" : "コピー"}
                    </Button>
                    <pre className="bg-muted rounded-lg p-4 pr-24 text-sm whitespace-pre-wrap overflow-auto max-h-[600px]">
                      {content}
                    </pre>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
