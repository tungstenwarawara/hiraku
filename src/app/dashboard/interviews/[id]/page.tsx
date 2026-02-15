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

// ─── Progress Stepper ──────────────────────────────────────

function ProgressStepper({
  hasMessages,
  hasContents,
}: {
  hasMessages: boolean;
  hasContents: boolean;
}) {
  const steps = [
    { label: "作成済", done: true },
    { label: "インタビュー中", done: hasMessages, active: !hasMessages && !hasContents },
    { label: "記事生成済", done: hasContents, active: hasMessages && !hasContents },
    { label: "投稿", done: false },
  ];

  return (
    <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1">
          {i > 0 && (
            <div
              className={`w-6 h-px ${
                step.done ? "bg-violet-500" : "bg-muted-foreground/30"
              }`}
            />
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step.done
                  ? "bg-violet-500 text-white"
                  : step.active
                    ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step.done ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`${
                step.done
                  ? "text-foreground font-medium"
                  : step.active
                    ? "text-violet-700 font-medium"
                    : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Workflow Guide ────────────────────────────────────────

function WorkflowGuide({ session }: { session: InterviewSessionDetail }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyText = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const prompt = `「${session.title}」というテーマでインタビューしてください。セッションID: ${session.id}`;

  return (
    <div className="space-y-5">
      {/* Session ID */}
      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-xs font-medium mb-2 text-muted-foreground">
          セッションID
        </p>
        <div className="flex items-center gap-2">
          <code className="bg-background px-3 py-1.5 rounded text-xs font-mono flex-1 truncate">
            {session.id}
          </code>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => copyText("id", session.id)}
          >
            {copiedField === "id" ? "コピー済" : "コピー"}
          </Button>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm">次のステップ</h4>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="bg-violet-100 text-violet-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              1
            </span>
            <div>
              <p className="font-medium text-sm">Claude Code を開く</p>
              <p className="text-xs text-muted-foreground">
                Claude Code (CLI) または Claude.ai を開き、ContentPilot MCP
                が接続されていることを確認してください。
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-violet-100 text-violet-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              2
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                インタビューを依頼する
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                以下のプロンプトをコピーして Claude に送信してください:
              </p>
              <div className="bg-muted rounded-lg p-3 flex items-start gap-2">
                <code className="text-xs flex-1 break-all">{prompt}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs h-6 px-2"
                  onClick={() => copyText("prompt", prompt)}
                >
                  {copiedField === "prompt" ? "コピー済" : "コピー"}
                </Button>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-violet-100 text-violet-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              3
            </span>
            <div>
              <p className="font-medium text-sm">質問に回答する</p>
              <p className="text-xs text-muted-foreground">
                Claude が 5〜8 つの質問を生成します。自由に回答してください。
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-violet-100 text-violet-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              4
            </span>
            <div>
              <p className="font-medium text-sm">記事が自動生成される</p>
              <p className="text-xs text-muted-foreground">
                回答をもとに Zenn・note・X 向けの記事が自動生成されます。
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-violet-100 text-violet-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              5
            </span>
            <div>
              <p className="font-medium text-sm">
                ここに戻って記事を確認・コピー
              </p>
              <p className="text-xs text-muted-foreground">
                このページをリロードすると、生成された記事を確認・コピーできます。
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

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
        <Link
          href="/dashboard/interviews"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; セッション一覧
        </Link>
        <p className="mt-4 text-muted-foreground">
          セッションが見つかりません。
        </p>
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
        <Link
          href="/dashboard/interviews"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; セッション一覧
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h2 className="text-2xl font-bold">{session.title}</h2>
          <Badge
            variant={
              session.status === "completed" ? "default" : "secondary"
            }
          >
            {session.status === "completed" ? "完了" : "進行中"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          作成:{" "}
          {new Date(session.created_at).toLocaleDateString("ja-JP")}
          {session.updated_at !== session.created_at && (
            <>
              {" "}
              / 更新:{" "}
              {new Date(session.updated_at).toLocaleDateString("ja-JP")}
            </>
          )}
        </p>
      </div>

      {/* Progress Stepper */}
      <ProgressStepper
        hasMessages={messages.length > 0}
        hasContents={!!hasContents}
      />

      {/* Interview Q&A or Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {messages.length === 0
              ? "インタビューを開始しましょう"
              : "インタビュー内容"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <WorkflowGuide session={session} />
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className="space-y-2">
                    <p className="font-medium text-sm">
                      Q: {msg.question}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {msg.answer}
                    </p>
                  </div>
                  {i < messages.length - 1 && (
                    <Separator className="mt-4" />
                  )}
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
            <Tabs
              defaultValue={
                Object.keys(session.generated_contents!)[0]
              }
            >
              <TabsList>
                {Object.keys(session.generated_contents!).map(
                  (fmt) => (
                    <TabsTrigger key={fmt} value={fmt}>
                      {formatLabels[fmt] || fmt}
                    </TabsTrigger>
                  )
                )}
              </TabsList>
              {Object.entries(session.generated_contents!).map(
                ([fmt, content]) => (
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
                )
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
